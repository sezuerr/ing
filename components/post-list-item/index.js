const { fromNow } = require("../../utils/time");

Component({
  properties: {
    post: {
      type: Object,
      value: {}
    },
    showStats: {
      type: Boolean,
      value: true
    },
    currentUserId: {
      type: String,
      value: ""
    }
  },

  observers: {
    post(post) {
      var currentUserId = this.properties.currentUserId || "";
      this.setData({
        needsExpand: Boolean(post && post.body && post.body.length > 96),
        timeText: post && post.createdAt ? fromNow(post.createdAt) : "",
        isMine: Boolean(post && post.authorId && currentUserId && post.authorId === currentUserId)
      });
    },
    currentUserId(currentUserId) {
      var post = this.properties.post || {};
      this.setData({
        isMine: Boolean(post.authorId && currentUserId && post.authorId === currentUserId)
      });
    }
  },

  data: {
    expanded: false,
    needsExpand: false,
    timeText: "",
    isMine: false
  },

  methods: {
    toggle() {
      this.setData({ expanded: !this.data.expanded });
    },

    open() {
      this.triggerEvent("open", { post: this.data.post });
    },

    onDelete() {
      this.triggerEvent("delete", { post: this.data.post });
    },

    previewImage(event) {
      var urls = event.currentTarget.dataset.urls;
      var index = event.currentTarget.dataset.index;
      if (urls && urls.length) {
        wx.previewImage({ current: urls[index] || urls[0], urls: urls });
      }
    }
  }
});
