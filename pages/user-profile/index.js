const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

Page({
  data: {
    user: {},
    posts: [],
    avatarText: "同",
    currentUserId: ""
  },

  async onLoad(options) {
    var app = getApp();
    var cu = app && app.globalData && app.globalData.currentUser;
    if (!cu || !cu._id) {
      cu = mock.currentUser;
    }
    this.setData({ currentUserId: cu._id });
    this._userId = options.id;
    await this.load();
  },

  onShow() {
    if (this._userId) {
      this.load();
    }
  },

  async load() {
    var userId = this._userId;
    if (!userId) return;
    var result = await api.getUserProfile({ userId });
    var user = result.user || {};
    var rawPosts = result.posts || [];

    var posts = rawPosts.map(function(post) {
      if (!post.author) {
        post.author = {};
      }
      post.author.isFriend = true;
      post.isFriend = true;
      post.likedByMe = post.likedByMe || false;
      post.matched = post.matched || false;
      post.comments = [];
      return post;
    });

    this.setData({
      user,
      posts: posts,
      avatarText: (user.nickName || "同学").slice(0, 1).toUpperCase()
    });
    wx.setNavigationBarTitle({ title: user.nickName || "主页" });
  },

  _findPost(postId) {
    var posts = this.data.posts;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i]._id === postId) {
        return { idx: i, post: posts[i] };
      }
    }
    return null;
  },

  onLike(event) {
    var postId = event.detail.post && event.detail.post._id;
    if (!postId) return;
    var found = this._findPost(postId);
    if (!found) return;

    var updatedPost = {};
    for (var k in this.data.posts[found.idx]) {
      updatedPost[k] = this.data.posts[found.idx][k];
    }
    updatedPost.likedByMe = true;
    if (typeof updatedPost.likeCount === "number") {
      updatedPost.likeCount += 1;
    }

    var newPosts = this.data.posts.slice();
    newPosts[found.idx] = updatedPost;
    this.setData({ posts: newPosts });
  },

  onMatch(event) {
    var postId = event.detail.post && event.detail.post._id;
    if (!postId) return;
    var found = this._findPost(postId);
    if (!found) return;

    var updatedPost = {};
    for (var k in this.data.posts[found.idx]) {
      updatedPost[k] = this.data.posts[found.idx][k];
    }
    updatedPost.matched = true;
    updatedPost.likedByMe = true;
    if (!updatedPost.author) {
      updatedPost.author = {};
    }
    updatedPost.author.isFriend = true;

    var newPosts = this.data.posts.slice();
    newPosts[found.idx] = updatedPost;
    this.setData({ posts: newPosts });
  },

  async onReply(event) {
    var data = event.detail;
    if (!data.content) return;
    wx.showLoading({ title: "发送中" });
    try {
      var result = await api.sendPrivateReply({ postId: data.post._id, content: data.content });
      if (result.__fromFallback) {
        wx.showToast({ title: "网络异常，请重试", icon: "none" });
        return;
      }
      wx.showToast({ title: "已发送", icon: "success" });

      var found = this._findPost(data.post._id);
      if (!found) return;

      var newComment = {
        _id: "local_" + Date.now(),
        fromUser: { nickName: "", avatarUrl: "" },
        content: data.content,
        createdAt: Date.now()
      };

      var updatedPost = {};
      for (var k in this.data.posts[found.idx]) {
        updatedPost[k] = this.data.posts[found.idx][k];
      }
      var existing = updatedPost.comments || [];
      updatedPost.comments = [newComment].concat(existing);

      var newPosts = this.data.posts.slice();
      newPosts[found.idx] = updatedPost;
      this.setData({ posts: newPosts });
    } catch (e) {
      wx.showToast({ title: "发送失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  }
});
