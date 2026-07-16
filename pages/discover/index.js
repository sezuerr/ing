const { FEED_SCOPES, REPORT_REASONS } = require("../../utils/constants");
const api = require("../../utils/cloud");

Page({
  data: {
    scopes: FEED_SCOPES,
    scope: "city",
    topicOnly: false,
    filterVisible: false,
    posts: [],
    currentIndex: 0,
    currentPost: null,
    nextPost: null,
    windowWidth: 375
  },

  onLoad() {
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({ windowWidth: info.windowWidth || 375 });
  },

  onShow() {
    this.setTab();
    this.loadFeed();
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  async loadFeed() {
    const result = await api.getDiscoverFeed({
      scope: this.data.scope,
      topicOnly: this.data.topicOnly
    });
    const posts = result.posts || [];
    this.setData({
      posts,
      currentIndex: 0,
      currentPost: posts[0] || null,
      nextPost: posts[1] || null
    });
  },

  openFilter() {
    this.setData({ filterVisible: true });
  },

  closeFilter() {
    this.setData({ filterVisible: false });
  },

  noop() {},

  changeScope(event) {
    const scope = event.currentTarget.dataset.value;
    if (scope === this.data.scope) return;
    this.setData({ scope });
    this.loadFeed();
  },

  toggleTopicOnly() {
    this.setData({ topicOnly: !this.data.topicOnly });
    this.loadFeed();
  },

  // WXS 判定为“飞出”后调用；等飞出动画结束再切换数据
  onSwipedAway() {
    const post = this.data.currentPost;
    if (post) api.markPostAction({ postId: post._id, action: "swiped" });
    setTimeout(() => this.nextPost(), 300);
  },

  nextPost() {
    const nextIndex = this.data.currentIndex + 1;
    this.setData({
      currentIndex: nextIndex,
      currentPost: this.data.posts[nextIndex] || null,
      nextPost: this.data.posts[nextIndex + 1] || null
    });
  },

  async likePost(event) {
    const post = event.detail.post;
    const result = await api.likePost(post._id);
    wx.showToast({ title: result && result.matched ? "配对成功" : "已点亮", icon: "none" });
  },

  async replyPost(event) {
    const { post, content } = event.detail;
    if (!content) return;
    await api.sendPrivateReply({ postId: post._id, content });
    wx.showToast({ title: "已发送", icon: "success" });
  },

  reportPost(event) {
    const post = event.detail.post;
    wx.showActionSheet({
      itemList: REPORT_REASONS.map((item) => item.label),
      success: async (res) => {
        const reason = REPORT_REASONS[res.tapIndex];
        await api.reportPost({ postId: post._id, reason: reason.value });
        wx.showToast({ title: reason.value === "not_interested" ? "已减少类似内容" : "已提交", icon: "none" });
        this.nextPost();
      }
    });
  }
});
