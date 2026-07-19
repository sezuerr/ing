const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

Page({
  data: {
    user: mock.currentUser,
    posts: [],
    avatarText: "ing"
  },

  goHome() {
    wx.switchTab({ url: "/pages/discover/index" });
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
    const user = getApp().globalData.currentUser || await api.loginAndSyncProfile();
    const result = await api.getMyPosts();
    this.setData({
      user,
      posts: result.posts || [],
      avatarText: (user.nickName || "ing").slice(0, 2)
    });
  },

  openPost(event) {
    wx.navigateTo({ url: `/pages/post-detail/index?id=${event.detail.post._id}` });
  },

  openSettings() {
    wx.navigateTo({ url: "/pages/settings/index" });
  }
});
