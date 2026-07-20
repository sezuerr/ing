const api = require("../../utils/cloud");
const { formatFullDate, formatClockLabel } = require("../../utils/time");

const TIME_GAP = 5 * 60 * 1000;

function toTimestamp(value) {
  return typeof value === "number" ? value : new Date(value || Date.now()).getTime();
}

function buildTimeline(messages) {
  let lastDay = "";
  let lastTime = 0;
  return messages.map((message, index) => {
    const ts = toTimestamp(message.createdAt);
    const day = formatFullDate(ts);
    const isNewDay = day !== lastDay;
    const isGap = ts - lastTime > TIME_GAP;
    let dividerType = "";
    let dividerText = "";
    if (isNewDay) {
      dividerType = "date";
      dividerText = day;
    } else if (isGap) {
      dividerType = "time";
      dividerText = formatClockLabel(ts);
    }
    lastDay = day;
    lastTime = ts;
    return {
      ...message,
      dividerType,
      dividerText,
      isLast: index === messages.length - 1
    };
  });
}

Page({
  data: {
    conversationId: "",
    peerId: "",
    peerName: "",
    peerAvatar: "",
    peerAvatarText: "同",
    statusBarHeight: 20,
    navBarHeight: 44,
    navRightGap: 96,
    draft: "",
    canSend: false,
    messages: [],
    scrollIntoView: "",
    pollingTimer: null
  },

  onLoad(options) {
    const peerName = decodeURIComponent(options.name || "聊天");
    const peerAvatar = decodeURIComponent(options.avatar || "");
    this.setData({
      conversationId: options.id || "",
      peerId: options.peerId || "",
      peerName,
      peerAvatar,
      peerAvatarText: (peerName || "同").slice(0, 1).toUpperCase(),
      ...this.getNavMetrics()
    });
    this.loadMessages();
    this.startPolling();
  },

  onUnload() {
    this.stopPolling();
  },

  getNavMetrics() {
    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const statusBarHeight = windowInfo.statusBarHeight || 20;
      const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
      const navRightGap = windowInfo.windowWidth - menuButton.left + 12;
      return { statusBarHeight, navBarHeight, navRightGap };
    } catch (error) {
      return { statusBarHeight: 20, navBarHeight: 44, navRightGap: 96 };
    }
  },

  async loadMessages() {
    if (!this.data.conversationId) return;
    const result = await api.getMessages({ conversationId: this.data.conversationId });
    const messages = buildTimeline(result.messages || []);
    this.setData({
      messages,
      scrollIntoView: messages.length ? `msg-${messages.length - 1}` : ""
    });
  },

  startPolling() {
    this.stopPolling();
    const pollingTimer = setInterval(() => this.loadMessages(), 5000);
    this.setData({ pollingTimer });
  },

  stopPolling() {
    if (this.data.pollingTimer) clearInterval(this.data.pollingTimer);
    this.setData({ pollingTimer: null });
  },

  onDraftInput(event) {
    const draft = event.detail.value;
    this.setData({ draft, canSend: Boolean(draft.trim()) });
  },

  async send() {
    const content = this.data.draft.trim();
    if (!content) return;
    const message = {
      _id: `local_${Date.now()}`,
      content,
      mine: true,
      createdAt: Date.now()
    };
    const prevMessages = this.data.messages;
    const messages = buildTimeline(prevMessages.concat(message));
    this.setData({
      draft: "",
      canSend: false,
      messages,
      scrollIntoView: `msg-${messages.length - 1}`
    });
    try {
      await api.sendMessage({
        conversationId: this.data.conversationId,
        content
      });
      if (wx.cloud && getApp().globalData.cloudReady) this.loadMessages();
    } catch (error) {
      this.setData({ messages: prevMessages, draft: content, canSend: true });
      wx.showToast({ title: "发送失败，请重试", icon: "none" });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  openProfile() {
    if (!this.data.peerId) return;
    wx.navigateTo({ url: `/pages/user-profile/index?id=${this.data.peerId}` });
  }
});
