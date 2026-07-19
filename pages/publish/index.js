const api = require("../../utils/cloud");
const { coarseGeoHash } = require("../../utils/geo");
const mock = require("../../utils/mock");

Page({
  data: {
    locationText: "使用学校和模糊位置",
    location: null,
    submitting: false,
    form: {
      icon: "💡",
      title: "",
      body: "",
      imageUrls: [],
      visibility: "public",
      geoHash: ""
    }
  },

  onShow() {
    this.setTab();
    this.loadDailyTopic();
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  loadDailyTopic() {
    if (!this.data.form.title) {
      this.setData({
        "form.title": mock.dailyTopic.title,
        "form.icon": mock.dailyTopic.icon
      });
    }
  },

  onIconChange(event) {
    this.setData({ "form.icon": event.detail.value });
  },

  onTitleInput(event) {
    this.setData({ "form.title": event.detail.value });
  },

  onBodyInput(event) {
    this.setData({ "form.body": event.detail.value });
  },

  onVisibilityChange(event) {
    this.setData({ "form.visibility": event.detail.value });
  },

  chooseImages() {
    wx.chooseMedia({
      count: 9 - this.data.form.imageUrls.length,
      mediaType: ["image"],
      success: async (res) => {
        const tempFiles = res.tempFiles || [];
        const app = getApp();
        const urls = [];
        for (const file of tempFiles) {
          if (wx.cloud && app.globalData.cloudReady) {
            try {
              const ext = (file.tempFilePath.split(".").pop() || "jpg").toLowerCase();
              const uploaded = await wx.cloud.uploadFile({
                cloudPath: `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`,
                filePath: file.tempFilePath
              });
              urls.push(uploaded.fileID);
            } catch (error) {
              console.warn("upload image fallback", error);
              urls.push(file.tempFilePath);
            }
          } else {
            urls.push(file.tempFilePath);
          }
        }
        this.setData({ "form.imageUrls": this.data.form.imageUrls.concat(urls).slice(0, 9) });
      }
    });
  },

  refreshLocation() {
    wx.getLocation({
      type: "gcj02",
      success: (location) => {
        this.setData({
          location,
          locationText: "已更新模糊位置",
          "form.geoHash": coarseGeoHash(location)
        });
      },
      fail: () => {
        this.setData({ locationText: "未授权定位，将使用学校范围" });
      }
    });
  },

  async submit() {
    const { form } = this.data;
    if (!form.title.trim()) {
      wx.showToast({ title: "请填写标题", icon: "none" });
      return;
    }
    if (!form.body.trim()) {
      wx.showToast({ title: "请填写正文", icon: "none" });
      return;
    }

    const user = getApp().globalData.currentUser || mock.currentUser;
    this.setData({ submitting: true });
    await api.createPost({
      ...form,
      universityId: user.universityId,
      universityName: user.universityName,
      cityCode: user.cityCode
    });
    this.setData({
      submitting: false,
      form: {
        icon: "💡",
        title: mock.dailyTopic.title,
        body: "",
        imageUrls: [],
        visibility: "public",
        geoHash: ""
      }
    });
    wx.showToast({ title: "已发布", icon: "success" });
    wx.switchTab({ url: "/pages/discover/index" });
  }
});
