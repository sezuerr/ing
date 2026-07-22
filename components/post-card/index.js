const { fromNow } = require("../../utils/time");

// 评论时间简短显示
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

// 根据图片数量决定布局类型
function getImageLayout(count) {
  if (count === 1) return "one";
  if (count === 2) return "two";
  if (count === 4) return "four";
  return "grid"; // 3, 5, 6, 7, 8, 9 → 3列网格
}

Component({
  properties: {
    post: {
      type: Object,
      value: null
    },
    currentUserId: {
      type: String,
      value: ""
    },
    myNickName: {
      type: String,
      value: ""
    },
    myAvatarUrl: {
      type: String,
      value: ""
    },
    comments: {
      type: Array,
      value: []
    }
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
      var alreadyLiked = likedByMe || post.matched || false;
      var imgCount = (post.imageUrls && post.imageUrls.length) || 0;
      this.setData({
        isMine: isMine,
        isFriend: isFriend,
        canComment: isFriend || likedMe || isMine,
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
        draft: ""
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
    draft: ""
  },

  methods: {
    like() {
      if (this.data.liked || this.data.matched) return;
      this.setData({ liked: true, bulbLit: true });
      this.triggerEvent("like", { post: this.data.post });
      if (this.data.likedMe) {
        this.setData({ matched: true, canComment: true });
      }
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
      const content = this.data.draft.trim();
      if (!content) return;
      this.setData({ draft: "" });

      // 修复: 乐观更新后触发 reply 事件，传递包含新评论的 post，确保页面能同步到最新状态
      var oldPost = this.data.post;
      var isAuthorComment = this.data.isMine;
      var nick = isAuthorComment ? (oldPost.author && oldPost.author.nickName || '我') : (this.data.myNickName || '我');
      var avatar = isAuthorComment ? this.data.authorAvatarUrl : (this.data.myAvatarUrl || '');
      var newComment = {
        _id: 'temp_' + Date.now(),
        content: content,
        createdAt: new Date().toISOString(),
        isAuthor: isAuthorComment,
        fromUser: {
          nickName: nick,
          avatarUrl: avatar
        },
        _optimistic: true
      };
      var newPost = {};
      for (var k in oldPost) { newPost[k] = oldPost[k]; }
      newPost.comments = [newComment].concat(oldPost.comments || []);
      this.setData({ post: newPost });
      // 修复: 使用乐观更新后的 newPost 触发事件，让页面拿到含最新评论的完整 post 对象
      this.triggerEvent("reply", { post: newPost, content });
    },

    previewImage(event) {
      var urls = event.currentTarget.dataset.urls;
      var index = event.currentTarget.dataset.index;
      if (urls && urls.length) {
        wx.previewImage({
          current: urls[index] || urls[0],
          urls: urls
        });
      }
    },

    commentTime(ts) {
      return shortTime(ts);
    },

    openReport() {
      this.triggerEvent("report", { post: this.data.post });
    },

    noop() {}
  }
});
