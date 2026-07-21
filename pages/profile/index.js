const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

Page({
  data: {
    user: mock.currentUser,
    posts: [],
    avatarText: "ing",
    stats: {
      postCount: 0,
      likeCount: 0,
      commentCount: 0
    }
  },

  goPublish() {
    wx.switchTab({ url: "/pages/publish/index" });
  },

  onShow() {
    this.setTab();
    this.load();
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
  },

  async load() {
    const app = getApp();
    const user = (await app.ensureLogin()) || mock.currentUser;
    const result = await api.getMyPosts();
    const posts = result.posts || [];

    // 从帖子数据里汇总统计
    const likeCount = posts.reduce((sum, p) => sum + (p.likeCount || 0), 0);
    const commentCount = posts.reduce((sum, p) => sum + (p.commentCount || 0), 0);

    this.setData({
      user,
      posts,
      avatarText: (user.nickName || "ing").slice(0, 2),
      stats: {
        postCount: posts.length,
        likeCount: user.stats ? (user.stats.likeCount || likeCount) : likeCount,
        commentCount: user.stats ? (user.stats.commentCount || commentCount) : commentCount
      }
    });
  },

  openPost(event) {
    wx.navigateTo({ url: `/pages/post-detail/index?id=${event.detail.post._id}` });
  },

  openSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  }
});
