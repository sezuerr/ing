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
    wx.showLoading({ title: "加载中" });
    try {
      var result = await api.getPostDetail(id);
      var post = result.post || {};
      var comments = result.comments || [];
      if (!post.matched) post.matched = post.matched || false;
      this.setData({ post, comments, currentUserId: currentUserId });
    } catch (e) {
      wx.showToast({ title: "加载失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  onLike(event) {
    var post = event.detail.post;
    if (!post || !post._id) return;

    var updatedPost = {};
    for (var k in this.data.post) {
      updatedPost[k] = this.data.post[k];
    }
    updatedPost.likedByMe = true;
    if (typeof updatedPost.likeCount === "number") {
      updatedPost.likeCount += 1;
    }
    this.setData({ post: updatedPost });
  },

  onMatch(event) {
    var post = event.detail.post;
    if (!post) return;
    post.matched = true;
    post.likedByMe = true;
    this.setData({ post: post });
  },

  onReply(event) {
    var post = event.detail.post;
    var content = event.detail.content;
    if (!content) return;
    wx.showLoading({ title: "发送中" });
    api.sendPrivateReply({ postId: post._id, content: content }).then(function() {
      wx.showToast({ title: "已发送", icon: "success" });
    }).catch(function() {
      wx.showToast({ title: "发送失败，请重试", icon: "none" });
    }).finally(function() {
      wx.hideLoading();
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
    wx.showLoading({ title: "提交中" });
    try {
      await api.reportPost({ postId: post._id, reason: reasonVal });
      wx.showToast({ title: reasonVal === "not_interested" ? "已减少类似内容" : "已提交", icon: "none" });
      this.setData({ reportVisible: false });
    } catch (e) {
      wx.showToast({ title: "提交失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  noop() {},
  goBack() {
    wx.navigateBack();
  }
});
