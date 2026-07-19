App({
  globalData: {
    currentUser: null,
    cloudReady: false,
    envId: "ing-mvp-dev"
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
  }
});
