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

function buildCommentTree(comments) {
  if (!comments || !comments.length) return [];
  var map = {};
  var roots = [];
  var reversed = comments.slice().reverse();
  for (var i = 0; i < reversed.length; i++) {
    var c = reversed[i];
    map[c._id] = { comment: c, children: [], depth: 0 };
  }
  for (var j = 0; j < reversed.length; j++) {
    var c = reversed[j];
    var node = map[c._id];
    if (c.parentCommentId && map[c.parentCommentId]) {
      node.depth = map[c.parentCommentId].depth + 1;
      map[c.parentCommentId].children.push(node);
    } else {
      roots.push(node);
    }
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
    post(post) {
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
      var tree = buildCommentTree(post.comments || []);
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
        draft: "",
        commentTree: tree
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
    commentTree: [],
    showReplyModal: false,
    replyTarget: null,
    replyModalDraft: ""
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
      this.setData({ draft: "" });
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
      var newPost = {};
      for (var k in post) { newPost[k] = post[k]; }
      newPost.comments = post.comments ? [newComment].concat(post.comments) : [newComment];
      this.setData({ post: newPost });
      this.triggerEvent("reply", { post: post, content: content });
    },

    openReplyModal(e) {
      if (!this.data.canComment) return;
      var cid = e.currentTarget.dataset.cid;
      var name = e.currentTarget.dataset.name || "";
      if (!cid || cid.indexOf('temp_') === 0) return;
      var cmt = this._findComment(cid);
      this.setData({ showReplyModal: true, replyTarget: cmt, replyModalDraft: "" });
    },

    closeReplyModal() {
      this.setData({ showReplyModal: false, replyTarget: null, replyModalDraft: "" });
    },

    onModalInput(e) {
      this.setData({ replyModalDraft: e.detail.value });
    },

    sendModalReply() {
      var content = this.data.replyModalDraft.trim();
      if (!content) return;
      var target = this.data.replyTarget;
      if (!target) return;
      var parentCommentId = target._id;
      var post = this.data.post;
      var nick = this.data.myNickName || '我';
      var avatar = this.data.myAvatarUrl || '';
      var tempId = 'temp_' + Date.now();
      var newComment = {
        _id: tempId,
        fromUserId: this.data.currentUserId,
        content: content,
        parentCommentId: parentCommentId,
        createdAt: new Date().toISOString(),
        isAuthor: post.authorId === this.data.currentUserId,
        fromUser: { nickName: nick, avatarUrl: avatar },
        _optimistic: true
      };
      this.closeReplyModal();
      var newPost = {};
      for (var k in post) { newPost[k] = post[k]; }
      newPost.comments = post.comments ? [newComment].concat(post.comments) : [newComment];
      this.setData({ post: newPost });

      var that = this;
      this.triggerEvent("reply", { post: post, content: content, parentCommentId: parentCommentId });
      // Note: reply event triggers API call in parent; on failure parent shows toast.
      // Optimistic comment stays; next feed reload will get real data.
    },

    _findComment(cid) {
      var comments = this.data.post.comments || [];
      for (var i = 0; i < comments.length; i++) {
        if (comments[i]._id === cid) return comments[i];
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
      var post = this.data.post;
      var api = require("../../utils/cloud");
      var oldComments = post.comments || [];
      var newComments = oldComments.filter(function(c) { return c._id !== commentId; });
      var newPost = {};
      for (var k in post) { newPost[k] = post[k]; }
      newPost.comments = newComments;
      this.setData({ post: newPost });
      api.deleteComment(commentId).catch(function(err) {
        console.error("删除失败", err);
        wx.showToast({ title: "删除失败", icon: "none" });
        this.setData({ post: post });
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
