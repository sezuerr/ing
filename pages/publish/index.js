const api = require("../../utils/cloud");
const { coarseGeoHash } = require("../../utils/geo");
const mock = require("../../utils/mock");

Page({
  data: {
    locationText: "使用学校和模糊位置",
    location: null,
    showLocation: true,
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
    this.refreshLocation();
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
    var max = 9 - this.data.form.imageUrls.length;
    if (max <= 0) return;

    var app = getApp();
    if (!wx.cloud || !app.globalData.cloudReady) {
      wx.showToast({ title: "云服务暂不可用，请稍后重试", icon: "none" });
      return;
    }

    wx.chooseMedia({
      count: max,
      mediaType: ["image"],
      success: async (res) => {
        var tempFiles = res.tempFiles || [];
        var urls = [];
        var failCount = 0;

        wx.showLoading({ title: "上传中" });
        for (var i = 0; i < tempFiles.length; i++) {
          var file = tempFiles[i];
          try {
            var ext = (file.tempFilePath.split(".").pop() || "jpg").toLowerCase();
            var uploaded = await wx.cloud.uploadFile({
              cloudPath: "posts/" + Date.now() + "_" + Math.random().toString(36).slice(2) + "." + ext,
              filePath: file.tempFilePath
            });
            urls.push(uploaded.fileID.trim());
          } catch (error) {
            failCount++;
            console.warn("[publish] 图片上传失败", error);
          }
        }
        wx.hideLoading();

        if (failCount > 0) {
          wx.showToast({ title: failCount + " 张图片上传失败，已自动移除", icon: "none" });
        }
        if (urls.length > 0) {
          this.setData({ "form.imageUrls": this.data.form.imageUrls.concat(urls).slice(0, 9) });
        }
      }
    });
  },

  toggleShowLocation() {
    var next = !this.data.showLocation;
    this.setData({ showLocation: next });
    if (next) {
      // 开启时自动获取定位
      this.refreshLocation();
    } else {
      this.setData({ location: null, locationText: "使用学校和模糊位置" });
    }
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

    const app = getApp();
    const user = (await app.ensureLogin()) || app.globalData.currentUser || mock.currentUser;
    this.setData({ submitting: true });

    try {
      var payload = {
        ...form,
        universityId: user.universityId,
        universityName: user.universityName,
        cityCode: user.cityCode
      };

      // 仅当用户允许显示位置时提交经纬度
      if (this.data.showLocation && this.data.location) {
        payload.latitude = this.data.location.latitude;
        payload.longitude = this.data.location.longitude;
      }

      const created = await api.createPost(payload);

      // 只有真正走通云函数才会拿到服务端 _id；本地兜底会是 local_ 前缀。
      if (created && typeof created._id === "string" && created._id.startsWith("local_")) {
        console.warn("[publish] 发布走了本地兜底，未真正写入数据库", created);
      }

      this.setData({
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
    } catch (error) {
      console.error("[publish] 发布失败", error);
      wx.showToast({ title: error.message || "发布失败，请重试", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
