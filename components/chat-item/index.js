let REVEAL_WIDTH = 80; // 约等于 160rpx，组件 attached 时根据屏幕宽度精确计算

Component({
  properties: {
    item: {
      type: Object,
      value: {}
    }
  },

  lifetimes: {
    attached() {
      var info = wx.getSystemInfoSync();
      REVEAL_WIDTH = Math.round(160 * info.windowWidth / 750);
    }
  },

  observers: {
    item(item) {
      const name = item && item.peer && item.peer.nickName;
      this.setData({ avatarText: (name || "同").slice(0, 1).toUpperCase() });
    }
  },

  data: {
    avatarText: "同",
    offset: 0
  },

  methods: {
    touchStart(event) {
      this._startX = event.touches[0].clientX;
      this._startOffset = this.data.offset;
      this._dragging = true;
    },

    touchMove(event) {
      if (!this._dragging) return;
      const dx = event.touches[0].clientX - this._startX;
      const next = Math.min(0, Math.max(this._startOffset + dx, -REVEAL_WIDTH));
      this.setData({ offset: next });
    },

    touchEnd() {
      if (!this._dragging) return;
      this._dragging = false;
      this.setData({ offset: this.data.offset < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0 });
    },

    open() {
      if (this.data.offset !== 0) {
        this.setData({ offset: 0 });
        return;
      }
      this.triggerEvent("open", { item: this.data.item });
    },

    unmatch() {
      this.setData({ offset: 0 });
      this.triggerEvent("unmatch", { item: this.data.item });
    }
  }
});
