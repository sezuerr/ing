const { REPORT_REASONS } = require("../../utils/constants");
const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

Page({
  data: {
    post: null,
    comments: [],
    likers: [],
    reportVisible: false,
    reportReasons: REPORT_REASONS,
    reportPost: null,
    isMine: false,
    authorName: "",
    authorAvatar: "",
    avatarText: "",
    timeText: "",
    tabActive: "likes"
  },

  async onLoad(options) {
    var id = options.id;
    var app = getApp();
    var cu = app && app.globalData && app.globalData.currentUser;
    if (!cu || !(cu.openid || cu._id)) {
      cu = mock.currentUser;
    }
    var currentUserId = (cu && cu.openid) || (cu && cu._id) || "";
    var result = await api.getPostDetail(id);
    var post = result.post || {};
    var comments = result.comments || [];
    if (!post.matched) post.matched = post.matched || false;
    var isMine = currentUserId && post.authorId === currentUserId;
    var authorName = (post.author && post.author.nickName) || (cu && cu.nickName) || "我";
    var authorAvatar = (post.author && post.author.avatarUrl) || (cu && cu.avatarUrl) || "";
    var avatarText = authorName.slice(0, 1).toUpperCase();
    var timeText = post.createdAt ? this.fromNow(post.createdAt) : "";

    var likers = [];
    if (isMine && post._id) {
      try {
        var likersResult = await api.getPostLikers(post._id);
        likers = (likersResult && likersResult.likers) || [];
      } catch (e) {
        console.warn("获取点亮列表失败", e);
      }
    }

    this.setData({
      post, comments, currentUserId, likers,
      isMine, authorName, authorAvatar, avatarText, timeText
    });
  },

  switchTab(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ tabActive: tab });
  },

  openLikerProfile(e) {
    var liker = e.currentTarget.dataset.liker;
    if (!liker || !liker.isFriend) return;
    var userId = liker._id || "";
    if (!userId) return;
    wx.navigateTo({ url: "/pages/user-profile/index?id=" + userId });
  },

  getLikerDisplay(liker) {
    if (!liker) return { name: "匿名", avatar: "", isFriend: false };
    var fromUser = liker.fromUser || {};
    if (fromUser.isFriend && fromUser.nickName) {
      return { name: fromUser.nickName, avatar: fromUser.avatarUrl || "", isFriend: true };
    }
    return { name: "匿名同学", avatar: "", isFriend: false };
  },

  fromNow(ts) {
    var diff = Date.now() - new Date(ts).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return mins + " 分钟前";
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + " 小时前";
    var days = Math.floor(hours / 24);
    if (days < 30) return days + " 天前";
    return Math.floor(days / 30) + " 个月前";
  },

  // post-card 组件事件转发
  onLike(event) {
    var post = event.detail.post;
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
