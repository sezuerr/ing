const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

Page({
  data: {
    user: {},
    posts: [],
    currentUserId: "",
    avatarText: "同"
  },

  async onLoad(options) {
    const userId = options.id;
    const app = getApp();
    const cu = app && app.globalData && app.globalData.currentUser;
    if (!cu || !(cu.openid || cu._id)) {
      cu = mock.currentUser;
    }
    const currentUserId = (cu && cu.openid) || (cu && cu._id) || "";

    const result = await api.getUserProfile({ userId });
    const user = result.user || {};
    const posts = (result.posts || []).map(function(p) {
      // 帖子列表不展示统计数字，但保留原始数据供详情页使用
      return p;
    });

    wx.setNavigationBarTitle({ title: "" });

    this.setData({
      user,
      posts,
      currentUserId,
      avatarText: (user.nickName || "同学").slice(0, 1).toUpperCase()
    });
  },

  onBackTap() {
    wx.navigateBack();
  },

  openPost(event) {
    const post = event.detail.post;
    // 将帖子 ID 传给详情页
    wx.navigateTo({ url: "/pages/post-detail/index?id=" + post._id });
  }
});
