const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

Page({
  data: {
    user: {},
    posts: [],
    currentUserId: "",
    profileUserId: "",
    avatarText: "同"
  },

  async onLoad(options) {
    const userId = options.id;
    const app = getApp();
    let cu = app && app.globalData && app.globalData.currentUser;
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
      profileUserId: userId,
      avatarText: (user.nickName || "同学").slice(0, 1).toUpperCase()
    });

    // 兜底：云函数本应返回 https，但若线上部署较旧或解析失败会漏出 cloud://，
    // 这里客户端再解析一次，避免依赖 <image> 原生 cloud:// 解析（冷启动会 500）。
    if (user.avatarUrl && user.avatarUrl.indexOf("cloud://") === 0) {
      const that = this;
      api.resolveImageUrls([user.avatarUrl]).then(function(r) {
        if (r && r[0] && r[0] !== user.avatarUrl) {
          that.setData({ "user.avatarUrl": r[0] });
        }
      }).catch(function() {});
    }
  },

  // 头像加载失败时回退到首字占位
  onAvatarError() {
    this.setData({ "user.avatarUrl": "" });
  },

  onBackTap() {
    wx.navigateBack();
  },

  openPost(event) {
    const post = event.detail.post;
    // 将帖子 ID 传给详情页
    wx.navigateTo({ url: "/pages/post-detail/index?id=" + post._id });
  },

  onDeletePost(event) {
    const post = event.detail.post;
    const that = this;
    wx.showModal({
      title: "确认删除",
      content: "删除后无法恢复，确定要删除这条帖子吗？",
      confirmText: "删除",
      confirmColor: "#c94b4b",
      success(res) {
        if (!res.confirm) return;
        api.deletePost(post._id).then(function() {
          const posts = that.data.posts.filter(function(p) { return p._id !== post._id; });
          that.setData({ posts: posts });
          wx.showToast({ title: "已删除", icon: "success" });
        }).catch(function(err) {
          console.error("删除帖子失败", err);
          wx.showToast({ title: "删除失败，请重试", icon: "none" });
        });
      }
    });
  }
});
