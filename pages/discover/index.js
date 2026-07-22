const { FEED_SCOPES, REPORT_REASONS, TOPIC_ICONS } = require("../../utils/constants");
const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

/*
 * ========== 推荐逻辑（占位说明） ==========
 *
 * 未来接入真实推荐引擎时，按以下权重排序帖子：
 *
 * 1. 地理位置亲和（geospatial）
 *    - 同一大学 RUC campus → +200 权重
 *    - 同城 beijing cityCode → +100 权重
 *    - geoHash 前缀匹配层级（长度 4/5/6）→ +50/+80/+120
 *
 * 2. 感受共鸣（sentiment / vibe）
 *    - 用户近期常用 emoji icon 规律 → +80
 *    - 与 candidate icon 同类簇（学习系/饮食系/熬夜系）→ +80
 *    - 基于帖子正文 sentiment score 做 mood 向量匹配
 *
 * 3. 社交图谱（social graph）
 *    - 共同好友数量 mutualFriendCount → +100/ea
 *    - 已互相点亮（likedMe）→ 置顶
 *    - 同一 conversation 中活跃 peer 的帖子 → +60
 *
 * 4. 关键词匹配（keywords）
 *    - 用户历史行为提取高频词做 TF-IDF 余弦相似度加权
 *
 * 排序公式（示意）：
 *   score = geoScore * 2.0
 *         + vibeScore * 1.8
 *         + socialScore * 2.5
 *         + keywordScore * 1.5
 *         + timeDecay(createdAt)  // 24h 内不衰减，之后每 6h 衰减 20%
 *
 * ===========================================
 */

Page({
  data: {
    currentUserId: "",
    scopes: FEED_SCOPES,
    scope: "university",
    scopeMode: "university",
    topicOnly: false,
    topicIcons: TOPIC_ICONS,
    topicSelected: {},
    topicIconValue: undefined,
    filterVisible: false,
    reportVisible: false,
    reportPost: null,
    reportReasons: REPORT_REASONS,
    posts: [],
    currentIndex: 0,
    currentPost: null,
    nextPost: null,
    windowWidth: 375
  },

  onLoad() {
    var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    var sysInfo = wx.getSystemInfoSync();
    this.setData({
      windowWidth: info.windowWidth || 375,
      statusBarHeight: sysInfo.statusBarHeight
    });
  },

  onShow() {
    var app = getApp();
    var cu = app && app.globalData && app.globalData.currentUser;
    if (!cu || !(cu.openid || cu._id)) {
      cu = mock.currentUser;
    }
    if (cu && (cu.openid || cu._id)) {
      this.setData({
        currentUserId: cu.openid || cu._id,
        myNickName: cu.nickName || "",
        myAvatarUrl: cu.avatarUrl || ""
      });
    }
    this.setTab();
    this.loadFeed();
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  switchScopeMode(event) {
    var mode = event.currentTarget.dataset.mode;
    if (mode === this.data.scopeMode) return;
    this.setData({ scopeMode: mode, scope: mode });
    this.loadFeed();
  },

  async loadFeed() {
    var result = await api.getDiscoverFeed({
      scope: this.data.scope,
      topicOnly: this.data.topicOnly,
      topicIcon: this.data.topicIconValue
    });
    var posts = result.posts || [];
    var burnedIds = [];
    try { burnedIds = wx.getStorageSync("burned_ids") || []; } catch (e) {}
    if (burnedIds.length) {
      posts = posts.filter(function(p) { return burnedIds.indexOf(p._id) === -1; });
    }

    // 前端话题筛选（后端未支持时作为 fallback）
    var topicIconVal = this.data.topicIconValue;
    if (topicIconVal) {
      var selectedIcons = topicIconVal.split(",");
      posts = posts.filter(function(p) {
        var postIcon = p.topicIcon || p.icon;
        return postIcon && selectedIcons.indexOf(postIcon) !== -1;
      });
    }

    this.setData({
      posts: posts,
      currentIndex: 0,
      currentPost: posts[0] || null,
      nextPost: posts[1] || null
    });

    // 转换云存储图片链接为临时链接
    this.resolvePostImages(posts);
  },

  async resolvePostImages(posts) {
    if (!posts || !posts.length) return;
    var allUrls = [];
    posts.forEach(function(p) {
      if (p.author && p.author.avatarUrl) allUrls.push(p.author.avatarUrl);
      if (p.imageUrls && p.imageUrls.length) allUrls = allUrls.concat(p.imageUrls);
      if (p.comments) {
        p.comments.forEach(function(c) {
          if (c.fromUser && c.fromUser.avatarUrl) allUrls.push(c.fromUser.avatarUrl);
        });
      }
    });
    if (!allUrls.length) return;
    allUrls = allUrls.filter(function(u, i) { return u && allUrls.indexOf(u) === i; });
    var resolved = await api.resolveImageUrls(allUrls);
    var map = {};
    allUrls.forEach(function(u, i) { map[u] = resolved[i]; });
    posts.forEach(function(p) {
      if (p.author && p.author.avatarUrl && map[p.author.avatarUrl]) p.author.avatarUrl = map[p.author.avatarUrl];
      if (p.imageUrls && p.imageUrls.length) p.imageUrls = p.imageUrls.map(function(u) { return map[u] || u; });
      if (p.comments) {
        p.comments.forEach(function(c) {
          if (c.fromUser && c.fromUser.avatarUrl && map[c.fromUser.avatarUrl]) c.fromUser.avatarUrl = map[c.fromUser.avatarUrl];
        });
      }
    });

    // 卡片渲染的是 currentPost / nextPost 这两个独立绑定，而不是 posts 数组本身。
    // 只更新 posts 的话，可见卡片仍持有旧的 cloud:// 链接。这里按 _id 把解析后的
    // 对象同步回 currentPost / nextPost（用 _id 匹配可避免异步期间用户已划走导致错位）。
    var d = this.data;
    var updated = { posts: posts };
    if (d.currentPost) {
      var cp = posts.filter(function(p) { return p._id === d.currentPost._id; })[0];
      if (cp) updated.currentPost = cp;
    }
    if (d.nextPost) {
      var np = posts.filter(function(p) { return p._id === d.nextPost._id; })[0];
      if (np) updated.nextPost = np;
    }
    this.setData(updated);
  },

  openFilter() {
    this.setData({ filterVisible: true, topicSelected: {} });
  },

  closeFilter() {
    this.setData({ filterVisible: false });
  },

  noop() {},

  changeScope(event) {
    var scope = event.currentTarget.dataset.value;
    if (scope === this.data.scope) return;
    this.setData({ scope: scope });
    this.loadFeed();
  },

  toggleTopicOnly() {
    this.setData({ topicOnly: !this.data.topicOnly });
    this.loadFeed();
  },

  selectTopic(event) {
    var icon = event.currentTarget.dataset.icon;
    var obj = Object.assign({}, this.data.topicSelected);
    var sel = obj[icon] ? false : true;
    obj[icon] = sel;
    var vals = [];
    for (var k in obj) { if (obj[k]) vals.push(k); }
    this.setData({
      topicSelected: obj,
      topicIconValue: vals.length ? vals.join(",") : undefined
    });
    this.loadFeed();
  },

  onSwipedAway() {
    var post = this.data.currentPost;
    if (post) api.markPostAction({ postId: post._id, action: "swiped" });
    setTimeout(function() { this.nextPost(); }.bind(this), 300);
  },

  nextPost() {
    var posts = this.data.posts;
    var currentPost = this.data.currentPost;
    if (!posts.length || !currentPost) return;

    // 从本地数组中移除刚刚划走的帖子
    var remaining = posts.filter(function(p) {
      return p._id !== currentPost._id;
    });

    if (remaining.length === 0) {
      // 全部划完，显示空状态；下次 onShow 或切范围会重新 loadFeed
      this.setData({
        posts: [],
        currentIndex: 0,
        currentPost: null,
        nextPost: null
      });
      return;
    }

    this.setData({
      posts: remaining,
      currentIndex: 0,
      currentPost: remaining[0],
      nextPost: remaining[1] || null
    });
  },

  async likePost(event) {
    var post = event.detail.post;
    try {
      var result = await api.likePost(post._id);
      var matched = result && result.matched;
      if (matched) {
        // 同时更新 currentPost 引用和 posts 数组中的原始对象
        post.matched = true;
        post.likedByMe = true;
        post.conversationId = result.conversationId || post.conversationId;
        var posts = this.data.posts;
        var idx = this.data.currentIndex;
        if (posts[idx] && posts[idx]._id === post._id) {
          posts[idx].matched = true;
          posts[idx].likedByMe = true;
          posts[idx].conversationId = post.conversationId;
        }
        this.setData({ currentPost: post, posts: posts });
      }
      wx.showToast({ title: matched ? "配对成功！解锁聊天" : "已点亮 · 等待回应", icon: "none" });
    } catch (e) {
      console.error("点亮失败", e);
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
    }
  },

  goChat(event) {
    var post = event.detail.post;
    wx.navigateTo({ url: "/pages/chat/index?id=" + (post.conversationId || "conv_mock") + "&peerId=" + (post.authorId || "") + "&name=" + encodeURIComponent(post.author.nickName || "同学") + "&avatar=" + encodeURIComponent((post.author && post.author.avatarUrl) || "") });
  },

  async replyPost(event) {
    var data = event.detail;
    if (!data.content) return;
    await api.sendPrivateReply({ postId: data.post._id, content: data.content });
    wx.showToast({ title: "已发送", icon: "success" });
  },

  reportPost(event) {
    var post = event.detail.post;
    this.setData({ reportVisible: true, reportPost: post });
  },

  closeReport() {
    this.setData({ reportVisible: false });
  },

  async submitReport(event) {
    var reasonVal = event.currentTarget.dataset.value;
    var post = this.data.reportPost;
    if (!post) return;
    await api.reportPost({ postId: post._id, reason: reasonVal });
    wx.showToast({ title: reasonVal === "not_interested" ? "已减少类似内容" : "已提交", icon: "none" });
    this.setData({ reportVisible: false });
    this.nextPost();
  }
});
