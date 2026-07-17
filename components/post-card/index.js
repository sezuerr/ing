const { fromNow } = require("../../utils/time");

Component({
  properties: {
    post: {
      type: Object,
      value: null
    }
  },

  observers: {
    post(post) {
      if (!post) return;
      const isFriend = Boolean(post.author && post.author.isFriend);
      const name = isFriend
        ? post.author.nickName || "好友"
        : post.likedMe
          ? "点亮过你的同学"
          : `${post.mutualFriendCount || 0} 个共同好友`;
      this.setData({
        canComment: isFriend,
        matched: post.matched || false,
        displayName: name,
        avatarText: isFriend ? (name || "友").slice(0, 1).toUpperCase() : "匿",
        timeText: fromNow(post.createdAt),
        liked: false,
        draft: ""
      });
    }
  },

  data: {
    canComment: false,
    matched: false,
    displayName: "",
    avatarText: "匿",
    timeText: "",
    liked: false,
    draft: ""
  },

  methods: {
    like() {
      if (this.data.liked || this.data.matched) return;
      this.setData({ liked: true });
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
    }
  }
});
