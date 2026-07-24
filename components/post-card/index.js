const { fromNow } = require("../../utils/time");

function shortTime(ts) {
  var diff = Date.now() - new Date(ts).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return mins + "分钟前";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "小时前";
  var days = Math.floor(hours / 24);
  if (days < 30) return days + "天前";
  return Math.floor(days / 30) + "个月前";
}

function getImageLayout(count) {
  if (count === 1) return "one";
  if (count === 2) return "two";
  if (count === 4) return "four";
  return "grid";
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

function buildCommentTree(comments) {
  if (!comments || !comments.length) return [];
  var map = {};
  var roots = [];
  var sorted = comments.slice().sort(function(a, b) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  for (var i = 0; i < sorted.length; i++) {
    var c = sorted[i];
    map[c._id] = { comment: c, children: [], depth: 0, timeText: shortTime(c.createdAt) };
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

Component({
  properties: {
    post: { type: Object, value: null },
    currentUserId: { type: String, value: "" },
    myNickName: { type: String, value: "" },
    myAvatarUrl: { type: String, value: "" },
    comments: { type: Array, value: [] }
  },

  observers: {
    'post': function(post) {
      if (!post) return;
      var currentUserId = this.data.currentUserId;
      var isMine = currentUserId && post.authorId === currentUserId;
      var isFriend = Boolean(post.author && post.author.isFriend);
      var likedMe = Boolean(post.likedMe);
      var likedByMe = Boolean(post.likedByMe);
      var name;
      if (isMine) {
        name = post.author && post.author.nickName ? post.author.nickName : "我";
      } else if (isFriend) {
        name = post.author.nickName || "好友";
      } else if (likedMe) {
        name = "点亮过你的同学";
      } else {
        name = (post.mutualFriendCount || 0) + " 个共同好友";
      }
      var alreadyLiked = likedByMe;
      var canComment = Boolean(post.canReply) || isMine;
      var imgCount = (post.imageUrls && post.imageUrls.length) || 0;
      var oldOpt = (this.data._allComments || []).filter(function(c) { return c._optimistic && !c._deleted; });
      var _allComments = (post.comments || []).concat(oldOpt);
      var tree = buildCommentTree(_allComments);
      this.setData({
        isMine: isMine,
        isFriend: isFriend,
        canComment: canComment,
        matched: post.matched || false,
        likedMe: likedMe,
        likedByMe: likedByMe,
        displayName: name,
        avatarText: isMine ? (name || "我").slice(0, 1).toUpperCase() : (isFriend ? (name || "友").slice(0, 1).toUpperCase() : "匿"),
        authorAvatarUrl: (post.author && post.author.avatarUrl) || "",
        timeText: fromNow(post.createdAt),
        liked: alreadyLiked,
        bulbLit: alreadyLiked,
        imageLayout: getImageLayout(imgCount),
        _allComments: _allComments,
        _commentList: flattenTree(tree)
      });
    }
  },

  data: {
    isMine: false,
    isFriend: false,
    canComment: false,
    matched: false,
    likedMe: false,
    displayName: "",
    avatarText: "匿",
    authorAvatarUrl: "",
    timeText: "",
    likedByMe: false,
    liked: false,
    bulbLit: false,
    imageLayout: "grid",
    draft: "",
    _allComments: [],
    _commentList: [],
    replyingTo: "",
    replyToName: "",
    inputFocus: false
  },

  methods: {
    like() {
      if (this.data.liked) return;
      this.setData({ liked: true, bulbLit: true, canComment: true, likedByMe: true });
      this.triggerEvent("like", { post: this.data.post });
    },

    goChat() {
      if (!this.data.matched) return;
      this.triggerEvent("gochat", { post: this.data.post });
    },

    onDraftInput(event) {
      this.setData({ draft: event.detail.value });
    },

    send() {
      if (!this.data.canComment) return;
      var content = this.data.draft.trim();
      if (!content) return;
      var parentCommentId = this.data.replyingTo || undefined;
      this.setData({ draft: "", replyingTo: "", replyToName: "", inputFocus: false });
      var post = this.data.post;
      var isAuthorComment = this.data.isMine;
      var nick = isAuthorComment ? (post.author && post.author.nickName || '我') : (this.data.myNickName || '我');
      var avatar = isAuthorComment ? this.data.authorAvatarUrl : (this.data.myAvatarUrl || '');
      var newComment = {
        _id: 'temp_' + Date.now(),
        fromUserId: this.data.currentUserId,
        content: content,
        createdAt: new Date().toISOString(),
        isAuthor: isAuthorComment,
        fromUser: { nickName: nick, avatarUrl: avatar },
        _optimistic: true
      };
      if (parentCommentId) newComment.parentCommentId = parentCommentId;
      var allComments = this.data._allComments.concat([newComment]);
      var tree = buildCommentTree(allComments);
      this.setData({ _allComments: allComments, _commentList: flattenTree(tree) });
      this.triggerEvent("reply", { post: post, content: content, parentCommentId: parentCommentId });
    },

    onReplyComment(e) {
      if (!this.data.canComment) return;
      var cid = e.currentTarget.dataset.cid;
      var name = e.currentTarget.dataset.name || "";
      if (!cid || cid.indexOf('temp_') === 0) return;
      this.setData({ replyingTo: cid, replyToName: name, draft: "", inputFocus: true });
      var that = this;
      setTimeout(function() {
        that.setData({ inputFocus: true });
      }, 100);
    },

    cancelReply() {
      this.setData({ replyingTo: "", replyToName: "", draft: "", inputFocus: false });
    },

    onReplyBlur() {
      this.setData({ inputFocus: false });
    },

    _findComment(cid) {
      var comments = this.data._allComments || [];
      for (var i = 0; i < comments.length; i++) {
        if (comments[i]._id === cid && !comments[i]._deleted) return comments[i];
      }
      return null;
    },

    onLongPressComment(e) {
      var isMineC = e.currentTarget.dataset.mine;
      if (!isMineC) return;
      var commentId = e.currentTarget.dataset.cid;
      if (!commentId || commentId.indexOf('temp_') === 0) return;
      var that = this;
      wx.showModal({
        title: "确认删除",
        content: "确定要删除这条回复吗？",
        confirmText: "删除",
        confirmColor: "#c94b4b",
        success: function(res) {
          if (res.confirm) that._doDeleteComment(commentId);
        }
      });
    },

    _doDeleteComment(commentId) {
      var api = require("../../utils/cloud");
      var prevAll = this.data._allComments;
      var found = false;
      var allComments = prevAll.filter(function(c) {
        if (c._id === commentId) { found = true; return false; }
        return true;
      });
      if (!found) {
        allComments = prevAll.concat([{ _id: commentId, _deleted: true }]);
      }
      var tree = buildCommentTree(allComments);
      this.setData({ _allComments: allComments, _commentList: flattenTree(tree) });
      api.deleteComment(commentId).catch(function(err) {
        console.error("删除失败", err);
        wx.showToast({ title: "删除失败", icon: "none" });
        var fallbackTree = buildCommentTree(prevAll);
        this.setData({ _allComments: prevAll, _commentList: flattenTree(fallbackTree) });
      }.bind(this));
    },

    previewImage(event) {
      var urls = event.currentTarget.dataset.urls;
      var index = event.currentTarget.dataset.index;
      if (urls && urls.length) {
        wx.previewImage({ current: urls[index] || urls[0], urls: urls });
      }
    },

    commentTime(ts) { return shortTime(ts); },

    openReport() { this.triggerEvent("report", { post: this.data.post }); },

    noop() {}
  }
});
