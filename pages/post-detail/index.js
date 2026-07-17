const api = require("../../utils/cloud");
const { fromNow } = require("../../utils/time");
const { REPORT_REASONS } = require("../../utils/constants");

Page({
  data: {
    post: null,
    comments: [],
    canComment: false,
    timeText: "",
    liked: false
  },

  async onLoad(options) {
    var id = options.id;
    var result = await api.getPostDetail(id);
    var post = result.post || {};
    var comments = result.comments || [];
    var user = getApp().globalData.currentUser || {};
    var isMine = post.authorId === (user._id || user.openid);
    var isFriend = post.author && post.author.isFriend;

    this.setData({
      post: post,
      comments: comments,
      canComment: isFriend || isMine,
      timeText: fromNow(post.createdAt),
      liked: post.likedMe || false
    });
  },

  async likePost() {
    var post = this.data.post;
    if (this.data.liked) return;
    var result = await api.likePost(post._id);
    this.setData({ liked: true });
    wx.showToast({ title: result && result.matched ? "配对成功" : "已点亮", icon: "none" });
  },

  replyPost() {
    if (!this.data.canComment) {
      wx.showToast({ title: "互亮后才能回复", icon: "none" });
      return;
    }
    var self = this;
    wx.showModal({
      title: "私密回复",
      editable: true,
      placeholderText: "只会发给帖主",
      success: async function(res) {
        if (!res.confirm || !res.content) return;
        await api.sendPrivateReply({ postId: self.data.post._id, content: res.content });
        wx.showToast({ title: "已发送", icon: "success" });
      }
    });
  },

  reportPost() {
    var self = this;
    wx.showActionSheet({
      itemList: REPORT_REASONS.map(function(item) { return item.label; }),
      success: async function(res) {
        var reason = REPORT_REASONS[res.tapIndex];
        await api.reportPost({ postId: self.data.post._id, reason: reason.value });
        wx.showToast({ title: reason.value === "not_interested" ? "已减少类似内容" : "已提交", icon: "none" });
      }
    });
  }
});
