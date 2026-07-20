const { fromNow } = require("../../utils/time");
const api = require("../../utils/cloud");

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
    timeText: "",
    likedByMe: false,
    liked: false,
    bulbLit: false,
    draft: ""
  },

  methods: {
    like() {
      if (this.data._liking) return;
      if (this.data.likedByMe || this.data.matched) return;

      var previousState = {
        liked: this.data.liked,
        bulbLit: this.data.bulbLit,
        matched: this.data.matched,
        likedByMe: this.data.likedByMe,
        canComment: this.data.canComment
      };

      this.data._liking = true;
      this.setData({ liked: true, bulbLit: true });

      var self = this;
      wx.showLoading({ title: "处理中" });
      api.likePost(this.data.post._id).then(function(result) {
        if (result.__fromFallback) {
          self.setData(previousState);
          wx.showToast({ title: "网络异常，请重试", icon: "none" });
          return;
        }
        if (result.matched) {
          self.setData({ matched: true, canComment: true });
          self.triggerEvent("match", { post: self.data.post });
          wx.showToast({ title: "配对成功！解锁聊天", icon: "none" });
        } else {
          self.setData({ likedByMe: true });
          wx.showToast({ title: "已点亮", icon: "none" });
        }
      }).catch(function() {
        self.setData(previousState);
        wx.showToast({ title: "操作失败，请重试", icon: "none" });
      }).finally(function() {
        self.data._liking = false;
        wx.hideLoading();
      });
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
