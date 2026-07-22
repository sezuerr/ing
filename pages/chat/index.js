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
    // 跳转参数里的头像可能是未解析的 cloud:// 文件 ID（如从地图/详情页进来）。
    // 不能依赖 <image> 原生解析 cloud://（冷启动会退化成本地路径 500），这里主动转成 https。
    this.resolvePeerAvatar(peerAvatar);
    this.loadMessages();
    this.startPolling();
  },

  async resolvePeerAvatar(avatar) {
    if (!avatar || avatar.indexOf("cloud://") !== 0) return;
    try {
      const resolved = await api.resolveImageUrls([avatar]);
      if (resolved && resolved[0] && resolved[0] !== avatar) {
        this.setData({ peerAvatar: resolved[0] });
      }
    } catch (error) {
      // 解析失败就走首字占位，不留裂图
      this.setData({ peerAvatar: "" });
    }
  },

  // 图片加载失败（链接过期/无权限）时清空，回退到首字占位
  onAvatarError() {
    this.setData({ peerAvatar: "" });
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
    const messages = buildTimeline(this.data.messages.concat(message));
    this.setData({
      draft: "",
      canSend: false,
      messages,
      scrollIntoView: `msg-${messages.length - 1}`
    });
    await api.sendMessage({
      conversationId: this.data.conversationId,
      content
    });
    if (wx.cloud && getApp().globalData.cloudReady) this.loadMessages();
  },

  goBack() {
    wx.navigateBack();
  },

  openProfile() {
    if (!this.data.peerId) return;
    wx.navigateTo({ url: `/pages/user-profile/index?id=${this.data.peerId}` });
  }
});
