const api = require("../../utils/cloud");

Page({
  data: {
    user: {},
    posts: [],
    avatarText: "同"
  },

  async onLoad(options) {
    const userId = options.id;
    const result = await api.getUserProfile({ userId });
    const user = result.user || {};
    this.setData({
      user,
      posts: result.posts || [],
      avatarText: (user.nickName || "同学").slice(0, 1).toUpperCase()
    });
    wx.setNavigationBarTitle({ title: user.nickName || "主页" });
  },

  openPost(event) {
    wx.navigateTo({ url: `/pages/post-detail/index?id=${event.detail.post._id}` });
  }
});
