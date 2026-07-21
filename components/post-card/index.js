const { fromNow } = require("../../utils/time");

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
        liked: false,
        bulbLit: false,
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
    draft: ""
  },

  methods: {
    like() {
      if (this.data.liked || this.data.matched) return;
      this.setData({ liked: true, bulbLit: true });
      wx.showToast({ title: "已点亮 💡", icon: "none", duration: 1500 });

      if (this.data.likedMe) {
        this.setData({ matched: true, canComment: true });
        this.triggerEvent("match", { post: this.data.post });
        return;
      }

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
      const content = this.data.draft.trim();
      if (!content) return;
      this.triggerEvent("reply", { post: this.data.post, content });
      this.setData({ draft: "" });
    },

    openReport() {
      this.triggerEvent("report", { post: this.data.post });
    },

    noop() {}
  }
});
