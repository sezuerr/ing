Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/discover/index", text: "看看", iconLine: "/icons/eye-line.svg", iconFill: "/icons/eye-fill.svg" },
      { pagePath: "/pages/map/index", text: "地图", iconLine: "/icons/map-line.svg", iconFill: "/icons/map-fill.svg" },
      { pagePath: "/pages/publish/index", text: "发布", center: true },
      { pagePath: "/pages/messages/index", text: "消息", iconLine: "/icons/chat-1-line.svg", iconFill: "/icons/chat-1-fill.svg" },
      { pagePath: "/pages/profile/index", text: "我的", iconLine: "/icons/user-line.svg", iconFill: "/icons/user-fill.svg" }
    ]
  },

  methods: {
    switchTab(event) {
      var index = Number(event.currentTarget.dataset.index);
      var item = this.data.list[index];
      if (!item) return;
      wx.switchTab({ url: item.pagePath });
    }
  }
});
