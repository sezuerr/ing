const { fromNow } = require("../../utils/time");

Component({
  properties: {
    item: {
      type: Object,
      value: {}
    }
  },

  observers: {
    item(item) {
      const name = item && item.actor && item.actor.nickName;
      this.setData({
        avatarText: (name || "匿").slice(0, 1).toUpperCase(),
        avatarUrl: (item && item.actor && item.actor.avatarUrl) || "",
        revealed: Boolean(name),
        timeText: item && item.createdAt ? fromNow(item.createdAt) : ""
      });
    }
  },

  data: {
    avatarText: "匿",
    avatarUrl: "",
    revealed: false,
    timeText: ""
  },

  methods: {
    open() {
      this.triggerEvent("open", { item: this.data.item });
    },

    openAvatar() {
      if (!this.data.revealed) {
        this.open();
        return;
      }
      this.triggerEvent("avatar", { item: this.data.item });
    }
  }
});
