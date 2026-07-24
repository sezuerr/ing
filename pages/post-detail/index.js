const { REPORT_REASONS } = require("../../utils/constants");
const api = require("../../utils/cloud");
const mock = require("../../utils/mock");

function buildCommentTree(comments) {
  if (!comments || !comments.length) return [];
  var map = {};
  var roots = [];
  var sorted = comments.slice().sort(function(a, b) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  for (var i = 0; i < sorted.length; i++) {
    var c = sorted[i];
    map[c._id] = { comment: c, children: [], depth: 0 };
  }
  for (var j = 0; j < sorted.length; j++) {
    var c = sorted[j];
    var node = map[c._id];
    if (c.parentCommentId && map[c.parentCommentId]) {
      node.depth = map[c.parentCommentId].depth + 1;
      map[c.parentCommentId].children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortChildren(node) {
    if (!node.children || !node.children.length) return;
    if (node.children.length > 1) {
      node.children.sort(function(a, b) {
        return new Date(a.comment.createdAt).getTime() - new Date(b.comment.createdAt).getTime();
      });
    }
    for (var k = 0; k < node.children.length; k++) {
      sortChildren(node.children[k]);
    }
  }
  for (var r = 0; r < roots.length; r++) {
    sortChildren(roots[r]);
  }
  return roots;
}

function flattenTree(roots) {
  var result = [];
  function walk(nodes) {
    if (!nodes || !nodes.length) return;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      result.push(n);
      if (n.children && n.children.length) walk(n.children);
    }
  }
  walk(roots);
  return result;
}

Page({
  data: {
    post: null,
    comments: [],
    commentTree: [],
    commentList: [],
    likers: [],
    reportVisible: false,
    reportReasons: REPORT_REASONS,
    reportPost: null,
    isMine: false,
    authorName: "",
    authorAvatar: "",
    avatarText: "",
    timeText: "",
    tabActive: "replies",
    draft: "",
    replyingTo: "",
    replyToName: "",
    inputFocus: false
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

    var commentTree = [];
    var commentList = [];
    if (isMine && Array.isArray(comments) && comments.length) {
      commentTree = buildCommentTree(comments);
      commentList = flattenTree(commentTree);
    }

    this.setData({
      post, comments, commentTree, commentList, currentUserId, likers,
      isMine, authorName, authorAvatar, avatarText, timeText,
      myNickName: cu.nickName || "",
      myAvatarUrl: cu.avatarUrl || ""
    });

    this.resolveDetailImages(post, comments, likers);
  },

  async resolveDetailImages(post, comments, likers) {
    var allUrls = [];
    if (post.author && post.author.avatarUrl) allUrls.push(post.author.avatarUrl);
    if (post.imageUrls && post.imageUrls.length) allUrls = allUrls.concat(post.imageUrls);
    if (comments) {
      comments.forEach(function(c) {
        if (c.fromUser && c.fromUser.avatarUrl) allUrls.push(c.fromUser.avatarUrl);
      });
    }
    if (likers) {
      likers.forEach(function(l) {
        if (l.fromUser && l.fromUser.avatarUrl) allUrls.push(l.fromUser.avatarUrl);
      });
    }
    if (!allUrls.length) return;
    allUrls = allUrls.filter(function(u, i) { return u && allUrls.indexOf(u) === i; });
    var resolved = await api.resolveImageUrls(allUrls);
    var map = {};
    allUrls.forEach(function(u, i) { map[u] = resolved[i]; });
    if (post.author && post.author.avatarUrl && map[post.author.avatarUrl]) post.author.avatarUrl = map[post.author.avatarUrl];
    if (post.imageUrls && post.imageUrls.length) post.imageUrls = post.imageUrls.map(function(u) { return map[u] || u; });
    if (comments) {
      comments.forEach(function(c) {
        if (c.fromUser && c.fromUser.avatarUrl && map[c.fromUser.avatarUrl]) c.fromUser.avatarUrl = map[c.fromUser.avatarUrl];
      });
    }
    if (likers) {
      likers.forEach(function(l) {
        if (l.fromUser && l.fromUser.avatarUrl && map[l.fromUser.avatarUrl]) l.fromUser.avatarUrl = map[l.fromUser.avatarUrl];
      });
    }
    var tree = buildCommentTree(comments);
    this.setData({ post: post, comments: comments, likers: likers, commentTree: tree, commentList: flattenTree(tree) });
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
  async onLike(event) {
    var post = event.detail.post;
    try {
      var result = await api.likePost(post._id);
      var matched = result && result.matched;
      post.likedByMe = true;
      post.canReply = true;
      if (matched) {
        post.matched = true;
      }
      this.setData({ post: post });
      wx.showToast({ title: matched ? "配对成功，可以聊天了" : "已点亮", icon: "none" });
    } catch (e) {
      console.error("点亮失败", e);
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
    }
  },

  onReply(event) {
    var post = event.detail.post;
    var content = event.detail.content;
    var payload = { postId: post._id, content: content };
    if (event.detail.parentCommentId) payload.parentCommentId = event.detail.parentCommentId;
    api.sendPrivateReply(payload).then(function() {
      wx.showToast({ title: "已发送", icon: "success" });
    });
  },

  onGoChat(event) {
    var post = event.detail.post;
    wx.navigateTo({ url: "/pages/chat/index?peerId=" + post.authorId + "&name=" + encodeURIComponent((post.author && post.author.nickName) || "同学") + "&avatar=" + encodeURIComponent((post.author && post.author.avatarUrl) || "") });
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

  onDeletePost() {
    var that = this;
    var post = this.data.post;
    if (!post || !post._id) return;

    console.log("=== 删除帖子调试 ===");
    console.log("post._id:", post._id);
    console.log("post.authorId:", post.authorId);
    console.log("currentUserId:", this.data.currentUserId);
    console.log("isMine:", this.data.isMine);

    wx.showModal({
      title: "确认删除",
      content: "删除后无法恢复，确定要删除这条帖子吗？",
      confirmText: "删除",
      confirmColor: "#c94b4b",
      success: function(res) {
        if (!res.confirm) return;

        wx.showLoading({ title: "删除中..." });

        api.deletePost(post._id).then(function(result) {
          wx.hideLoading();
          console.log("deletePost 返回:", JSON.stringify(result));

          // 立即回查帖子，确认云端状态是否真的变了
          console.log("=== 回查验证 ===");
          api.getPostDetail(post._id).then(function(verifyResult) {
            var p = verifyResult && verifyResult.post;
            console.log("回查帖子 status:", p ? p.status : "未找到");
            console.log("回查帖子 _id:", p ? p._id : "N/A");
          }).catch(function(e) {
            console.error("回查失败:", e);
          });

          // 同步更新上一页（用户主页）的帖子列表
          var pages = getCurrentPages();
          console.log("当前页面栈深度:", pages.length);
          var prevPage = pages[pages.length - 2];
          if (prevPage) {
            console.log("上一页 route:", prevPage.route);
            if (prevPage.data && prevPage.data.posts) {
              var filtered = prevPage.data.posts.filter(function(p) { return p._id !== post._id; });
              console.log("更新前帖子数:", prevPage.data.posts.length, "更新后:", filtered.length);
              prevPage.setData({ posts: filtered });
            } else {
              console.log("上一页没有 posts 数据");
            }
          }

          wx.showToast({ title: "已删除", icon: "success" });
          setTimeout(function() {
            wx.navigateBack();
          }, 1200);
        }).catch(function(err) {
          wx.hideLoading();
          console.error("删除帖子失败 - 完整错误:", JSON.stringify(err));
          console.error("错误信息:", err.message || err);
          console.error("错误码:", err.code);

          var msg = "删除失败";
          if (err.code === "CLOUD_UNAVAILABLE") {
            msg = "云端不可用，请检查网络";
          } else if (err.code === "FORBIDDEN") {
            msg = "无权删除此帖子";
          } else if (err.code === "NOT_FOUND") {
            msg = "帖子不存在或已被删除";
          } else if (err.isBusinessError) {
            msg = err.message || "删除失败，请重试";
          }

          wx.showModal({
            title: "删除失败",
            content: msg + "\n错误码: " + (err.code || "未知"),
            showCancel: false
          });
        });
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onOwnDraftInput(e) {
    this.setData({ draft: e.detail.value });
  },

  onReplyOwnComment(e) {
    var cid = e.currentTarget.dataset.cid;
    var name = e.currentTarget.dataset.name || "";
    if (!cid) return;
    this.setData({ replyingTo: cid, replyToName: name, draft: "", inputFocus: true });
    var that = this;
    setTimeout(function() {
      that.setData({ inputFocus: true });
    }, 100);
  },

  cancelOwnReply() {
    this.setData({ replyingTo: "", replyToName: "", draft: "", inputFocus: false });
  },

  onReplyBlur() {
    this.setData({ inputFocus: false });
  },

  sendOwnReply() {
    var content = this.data.draft.trim();
    if (!content) return;
    var payload = { postId: this.data.post._id, content: content };
    if (this.data.replyingTo) payload.parentCommentId = this.data.replyingTo;
    var that = this;
    that.setData({ draft: "", replyingTo: "", replyToName: "", inputFocus: false });
    api.sendPrivateReply(payload).then(function() {
      wx.showToast({ title: "已发送", icon: "success" });
    }).catch(function(err) {
      console.error("回复失败", err);
      wx.showToast({ title: "发送失败", icon: "none" });
    });
    var comments = this.data.comments.slice();
    comments.push({
      _id: "temp_" + Date.now(),
      fromUserId: this.data.currentUserId,
      content: content,
      parentCommentId: payload.parentCommentId,
      createdAt: new Date().toISOString(),
      fromUser: { nickName: this.data.authorName || "我", avatarUrl: this.data.authorAvatar || "" },
      isAuthor: true,
      _optimistic: true
    });
    var tree = buildCommentTree(comments);
    this.setData({ comments: comments, commentTree: tree, commentList: flattenTree(tree) });
  },

  onLongPressOwnComment(e) {
    var cid = e.currentTarget.dataset.cid;
    if (!cid || cid.indexOf("temp_") === 0) return;
    var that = this;
    wx.showModal({
      title: "确认删除",
      content: "确定要删除这条回复吗？",
      confirmText: "删除",
      confirmColor: "#c94b4b",
      success: function(res) {
        if (res.confirm) {
          var comments = that.data.comments.filter(function(c) { return c._id !== cid; });
          var tree = buildCommentTree(comments);
          that.setData({ comments: comments, commentTree: tree, commentList: flattenTree(tree) });
          api.deleteComment(cid).catch(function(err) {
            console.error("删除失败", err);
            wx.showToast({ title: "删除失败", icon: "none" });
          });
        }
      }
    });
  }
});
