const { fromNow } = require("../../utils/time");

Component({
  properties: {
    post: {
      type: Object,
      value: {}
    }
  },

  observers: {
    post(post) {
      this.setData({
        needsExpand: Boolean(post && post.body && post.body.length > 80),
        timeText: post && post.createdAt ? fromNow(post.createdAt) : ""
      });
    }
  },

  data: {
    expanded: false,
    needsExpand: false,
    timeText: ""
  },

  methods: {
    toggle() {
      this.setData({ expanded: !this.data.expanded });
    },

    open() {
      this.triggerEvent("open", { post: this.data.post });
    }
  }
});
