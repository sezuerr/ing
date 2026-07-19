App({
  globalData: {
    currentUser: null,
    cloudReady: false,
    envId: "cloud1-d3g3i3b996dd7dad5"
  },

  onLaunch() {
    if (!wx.cloud) {
      console.warn("wx.cloud is unavailable. The app will use local fallback data.");
      return;
    }

    wx.cloud.init({
      env: this.globalData.envId,
      traceUser: true
    });
    this.globalData.cloudReady = true;

    // 启动即登录，把真实用户写回 globalData，供各页面使用。
    this.loginPromise = this.login();
  },

  // 登录并同步资料。返回 Promise，页面可 await getApp().ensureLogin()。
  async login(profile = {}) {
    const api = require("./utils/cloud");
    try {
      const user = await api.loginAndSyncProfile(profile);
      this.globalData.currentUser = user;
      return user;
    } catch (error) {
      console.error("[app] 登录失败", error);
      return null;
    }
  },

  // 页面用它拿当前用户：已登录直接返回，未完成则等待启动时的登录。
  async ensureLogin() {
    if (this.globalData.currentUser) return this.globalData.currentUser;
    if (this.loginPromise) return this.loginPromise;
    return this.login();
  }
});
