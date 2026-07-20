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
    windowWidth: 375,
    // 核心圈
    circleVisible: false,
    myPasscode: "",
    friendPasscode: "",
    passcodeResult: ""
  },

  onLoad() {
    var info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    var sysInfo = wx.getSystemInfoSync();
    this.setData({
      windowWidth: info.windowWidth || 375,
      statusBarHeight: sysInfo.statusBarHeight
    });
    this.generateMyPasscode();
  },

  onShow() {
    var app = getApp();
    var cu = app && app.globalData && app.globalData.currentUser;
    if (!cu || !cu._id) {
      cu = mock.currentUser;
    }
    if (cu && cu._id) {
      this.setData({ currentUserId: cu._id });
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
    wx.showLoading({ title: "加载中" });
    try {
      var result = await api.getDiscoverFeed({
        scope: this.data.scope,
        topicOnly: this.data.topicOnly,
        topicIcon: this.data.topicIconValue
      });
      var posts = result.posts || [];

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
    } catch (e) {
      console.error("[discover] loadFeed 异常", e);
    } finally {
      wx.hideLoading();
    }
  },

  openFilter() {
    this.setData({ filterVisible: true, topicSelected: {} });
  },

  closeFilter() {
    this.setData({ filterVisible: false });
  },

  noop() {},

  /* ===== 核心圈 ===== */
  generateMyPasscode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var code = "";
    for (var i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.setData({ myPasscode: code });
  },

  openCircle() {
    this.setData({ circleVisible: true, passcodeResult: "" });
  },

  closeCircle() {
    this.setData({ circleVisible: false, friendPasscode: "", passcodeResult: "" });
  },

  onPasscodeInput(e) {
    this.setData({ friendPasscode: e.detail.value.toUpperCase(), passcodeResult: "" });
  },

  verifyPasscode() {
    var code = this.data.friendPasscode.trim();
    if (!code) {
      this.setData({ passcodeResult: "请输入口令" });
      return;
    }
    if (code === this.data.myPasscode) {
      this.setData({ passcodeResult: "不能添加自己哦" });
      return;
    }
    // 模拟验证：任何 6 位字符串视为有效
    if (code.length >= 4) {
      this.setData({ passcodeResult: "已添加为核心好友！" });
      var self = this;
      setTimeout(function() {
        self.closeCircle();
        wx.showToast({ title: "核心圈已解锁", icon: "success" });
      }, 1000);
    } else {
      this.setData({ passcodeResult: "口令无效，请检查" });
    }
  },

  copyPasscode() {
    wx.setClipboardData({
      data: this.data.myPasscode,
      success: function() {
        wx.showToast({ title: "口令已复制", icon: "success" });
      }
    });
  },

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

  likePost(event) {
    var post = event.detail.post;
    if (!post || !post._id) return;
  },

  onMatch(event) {
    var post = event.detail.post;
    if (!post) return;
    var posts = this.data.posts;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i]._id === post._id) {
        posts[i].matched = true;
        posts[i].likedByMe = true;
        break;
      }
    }
    this.setData({ posts: posts, currentPost: post });
  },

  goChat(event) {
    var post = event.detail.post;
    wx.navigateTo({ url: "/pages/chat/index?id=" + (post.conversationId || "conv_mock") + "&name=" + encodeURIComponent(post.author.nickName || "同学") });
  },

  async replyPost(event) {
    var data = event.detail;
    if (!data.content) return;
    wx.showLoading({ title: "发送中" });
    try {
      var result = await api.sendPrivateReply({ postId: data.post._id, content: data.content });
      if (result.__fromFallback) {
        wx.showToast({ title: "网络异常，请重试", icon: "none" });
        return;
      }
      wx.showToast({ title: "已发送", icon: "success" });
    } catch (e) {
      wx.showToast({ title: "发送失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
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
    wx.showLoading({ title: "提交中" });
    try {
      var result = await api.reportPost({ postId: post._id, reason: reasonVal });
      if (result.__fromFallback) {
        wx.showToast({ title: "网络异常，请重试", icon: "none" });
        return;
      }
      wx.showToast({ title: reasonVal === "not_interested" ? "已减少类似内容" : "已提交", icon: "none" });
      this.setData({ reportVisible: false });
      this.nextPost();
    } catch (e) {
      wx.showToast({ title: "提交失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  }
});
