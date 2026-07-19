const { REPORT_REASONS } = require("../../utils/constants");
const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

Page({
  data: {
    post: null,
    comments: [],
    reportVisible: false,
    reportReasons: REPORT_REASONS,
    reportPost: null
  },

  async onLoad(options) {
    var id = options.id;
    var app = getApp();
    var cu = app && app.globalData && app.globalData.currentUser;
    if (!cu || !cu._id) {
      cu = mock.currentUser;
    }
    var currentUserId = cu && cu._id ? cu._id : "";
    var result = await api.getPostDetail(id);
    var post = result.post || {};
    var comments = result.comments || [];
    if (!post.matched) post.matched = post.matched || false;
    this.setData({ post, comments, currentUserId: currentUserId });
  },

  // post-card 组件事件转发
  onLike(event) {
    var post = event.detail.post;
    // 已在组件内处理 toast
  },

  onMatch(event) {
    var post = event.detail.post;
    wx.showToast({ title: "配对成功，可以聊天了", icon: "none" });
  },

  onReply(event) {
    var post = event.detail.post;
    var content = event.detail.content;
    api.sendPrivateReply({ postId: post._id, content: content }).then(function() {
      wx.showToast({ title: "已发送", icon: "success" });
    });
  },

  onGoChat(event) {
    var post = event.detail.post;
    wx.navigateTo({ url: "/pages/chat/index?peerId=" + post.authorId });
  },

  onReport(event) {
    var post = event.detail ? (event.detail.post || this.data.post) : this.data.post;
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
  },

  noop() {},
  goBack() {
    wx.navigateBack();
  }
});
