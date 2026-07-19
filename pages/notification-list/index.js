const api = require("../../utils/cloud");

const TITLES = {
  like: "新增点亮",
  comment: "新增回复",
  match: "新增配对"
};

Page({
  data: {
    type: "like",
    pageTitle: "新增点亮",
    notifications: []
  },

  async onLoad(options) {
    const type = options.type || "like";
    const pageTitle = TITLES[type] || "消息";
    this.setData({ type, pageTitle });
    wx.setNavigationBarTitle({ title: TITLES[type] || "消息" });
    await this.load();
    api.markNotificationsRead({ type });
  },

  async load() {
    const result = await api.getNotifications({ type: this.data.type });
    this.setData({ notifications: result.notifications || [] });
  },

  openNotification(event) {
    const item = event.detail.item;
    if (item.postId) {
      wx.navigateTo({ url: `/pages/post-detail/index?id=${item.postId}` });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  openActor(event) {
    const item = event.detail.item;
    if (item.actorId) {
      wx.navigateTo({ url: `/pages/user-profile/index?id=${item.actorId}` });
    }
  }
});
