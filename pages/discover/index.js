const { FEED_SCOPES, REPORT_REASONS, TOPIC_ICONS } = require("../../utils/constants");
const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

function isWithin24h(ts) {
  return (Date.now() - ts) < 24 * 60 * 60 * 1000;
}

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
      this.setData({ currentUserId: cu.openid || cu._id });
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
    this.setData({ scopeMode: mode });
    this.loadFeed();
  },

  async loadFeed() {
    var result = await api.getDiscoverFeed({
      scope: this.data.scope,
      topicOnly: this.data.topicOnly,
      topicIcon: this.data.topicIconValue
    });
    var posts = result.posts || [];
    // 暂时注释掉 24h 时间过滤，排查数据问题
    // var posts = (result.posts || []).filter(function(p) {
    //   return isWithin24h(new Date(p.createdAt).getTime());
    // });

    // 去掉客户端硬编码的 universityId 过滤，云函数已通过 applyScope 做 scope 过滤
    // if (this.data.scopeMode === "university") {
    //   posts = posts.filter(function(p) {
    //     return p.universityId === "ruc";
    //   });
    // }

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
    var nextIndex = this.data.currentIndex + 1;
    var posts = this.data.posts;
    if (!posts.length) return;
    // 循环：翻完回到第一张
    var wrappedIndex = nextIndex % posts.length;
    var nextWrappedIndex = (nextIndex + 1) % posts.length;
    this.setData({
      currentIndex: wrappedIndex,
      currentPost: posts[wrappedIndex] || null,
      nextPost: posts[nextWrappedIndex] || null
    });
  },

  async likePost(event) {
    var post = event.detail.post;
    var result = await api.likePost(post._id);
    var matched = result && result.matched;
    if (matched) {
      post.matched = true;
      this.setData({ currentPost: post });
    }
    wx.showToast({ title: matched ? "配对成功！解锁聊天" : "已点亮 · 等待回应", icon: "none" });
  },

  goChat(event) {
    var post = event.detail.post;
    wx.navigateTo({ url: "/pages/chat/index?id=" + (post.conversationId || "conv_mock") + "&name=" + encodeURIComponent(post.author.nickName || "同学") });
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
