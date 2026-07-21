const api = require("../../utils/cloud");
const { coarseGeoHash } = require("../../utils/geo");
const { TOPIC_ICONS, VISIBILITY_OPTIONS } = require("../../utils/constants");
const mock = require("../../utils/mock");

Page({
  data: {
    locationText: "使用学校和模糊位置",
    location: null,
    showLocation: false,
    submitting: false,
    bodyLength: 0,
    topicIcons: TOPIC_ICONS,
    visibilityOpen: false,
    visibilityOptions: VISIBILITY_OPTIONS,
    visibilityLabel: "所有人可见",
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
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  onEmojiSelect(event) {
    this.setData({ "form.icon": event.currentTarget.dataset.icon });
  },

  onBodyInput(event) {
    const value = event.detail.value;
    this.setData({
      "form.body": value,
      bodyLength: value.length
    });
  },

  openVisibility() {
    this.setData({ visibilityOpen: true });
  },

  closeVisibility() {
    this.setData({ visibilityOpen: false });
  },

  selectVisibility(e) {
    var val = e.currentTarget.dataset.value;
    var opt = this.data.visibilityOptions.find(function(o) { return o.value === val; });
    this.setData({
      "form.visibility": val,
      visibilityLabel: opt ? opt.label : val,
      visibilityOpen: false
    });
  },

  noop() {},

  chooseImages() {
    const remaining = 9 - this.data.form.imageUrls.length;
    if (remaining <= 0) return;

    wx.chooseMedia({
      count: remaining,
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
        this.setData({
          "form.imageUrls": this.data.form.imageUrls.concat(urls).slice(0, 9)
        });
      }
    });
  },

  removeImage(event) {
    const index = event.currentTarget.dataset.index;
    const imageUrls = [...this.data.form.imageUrls];
    imageUrls.splice(index, 1);
    this.setData({ "form.imageUrls": imageUrls });
  },

  toggleShowLocation() {
    var next = !this.data.showLocation;
    this.setData({ showLocation: next });
    if (next) {
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

      if (this.data.showLocation && this.data.location) {
        payload.latitude = this.data.location.latitude;
        payload.longitude = this.data.location.longitude;
      }

      const created = await api.createPost(payload);

      if (created && typeof created._id === "string" && created._id.startsWith("local_")) {
        console.warn("[publish] 发布走了本地兜底，未真正写入数据库", created);
      }

      this.setData({
        bodyLength: 0,
        form: {
          icon: "💡",
          title: "",
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
