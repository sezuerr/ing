const api = require("../../utils/cloud");
const { formatChatTime } = require("../../utils/time");

Page({
  data: {
    conversations: [],
    unreadCounts: { like: 0, comment: 0, match: 0 },
    pollingTimer: null
  },

  goHome() {
    wx.switchTab({ url: "/pages/discover/index" });
  },

  onShow() {
    this.setTab();
    this.load();
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  async load() {
    const [noticeResult, chatResult] = await Promise.all([
      api.getNotifications(),
      api.getConversations()
    ]);

    const unreadCounts = { like: 0, comment: 0, match: 0 };
    (noticeResult.notifications || []).forEach((item) => {
      if (!item.read && unreadCounts[item.type] !== undefined) {
        unreadCounts[item.type] += 1;
      }
    });

    const conversations = (chatResult.conversations || []).map((item) => ({
      ...item,
      timeText: formatChatTime((item.lastMessage && item.lastMessage.createdAt) || item.updatedAt)
    }));

    this.setData({ unreadCounts, conversations });
  },

  startPolling() {
    this.stopPolling();
    const pollingTimer = setInterval(() => this.load(), 12000);
    this.setData({ pollingTimer });
  },

  stopPolling() {
    if (this.data.pollingTimer) clearInterval(this.data.pollingTimer);
    this.setData({ pollingTimer: null });
  },

  openLikes() {
    wx.navigateTo({ url: "/pages/notification-list/index?type=like" });
  },

  openReplies() {
    wx.navigateTo({ url: "/pages/notification-list/index?type=comment" });
  },

  openMatches() {
    wx.navigateTo({ url: "/pages/notification-list/index?type=match" });
  },

  openChat(event) {
    const item = event.detail.item;
    const peer = item.peer || {};
    const query = [
      `id=${item._id}`,
      `peerId=${item.peerId || ""}`,
      `name=${encodeURIComponent(peer.nickName || "同学")}`,
      `avatar=${encodeURIComponent(peer.avatarUrl || "")}`
    ].join("&");
    wx.navigateTo({ url: `/pages/chat/index?${query}` });
  },

  unmatch(event) {
    const item = event.detail.item;
    wx.showModal({
      title: "解除配对",
      content: "解除后将关闭这个聊天入口。",
      success: async (res) => {
        if (!res.confirm) return;
        await api.unmatchUser({ conversationId: item._id });
        wx.showToast({ title: "已解除", icon: "none" });
        this.load();
      }
    });
  }
});
