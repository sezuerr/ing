Component({
  data: {
    selected: 1,
    list: [
      { pagePath: "/pages/settings/index", text: "设置", iconLine: "/icons/settings-4-line.svg", iconFill: "/icons/settings-4-fill.svg" },
      { pagePath: "/pages/discover/index", text: "发现", iconLine: "/icons/eye-line.svg", iconFill: "/icons/eye-fill.svg" },
      { pagePath: "/pages/publish/index", text: "发布", center: true },
      { pagePath: "/pages/messages/index", text: "信息", iconLine: "/icons/chat-1-line.svg", iconFill: "/icons/chat-1-fill.svg" },
      { pagePath: "/pages/profile/index", text: "我的", iconLine: "/icons/user-line.svg", iconFill: "/icons/user-fill.svg" }
    ]
  },

  methods: {
    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      const item = this.data.list[index];
      if (!item) return;
      wx.switchTab({ url: item.pagePath });
    }
  }
});
