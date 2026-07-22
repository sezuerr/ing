const api = require("../../utils/cloud");

Page({
  data: {
    genderOptions: ["男", "女", "非二元"],
    genderIndex: 2,
    universities: [],
    universityIndex: 0,
    selectedUniversity: null,
    avatarText: "ing",
    bioCount: 0,
    saving: false,
    profile: {
      avatarUrl: "",
      nickName: "",
      gender: "非二元",
      bio: "",
      universityId: "",
      cityCode: ""
    }
  },

  async onShow() {
    this.setTab();

    // 从云端拉取学校列表，失败则 fallback 到本地常量
    const universities = await api.getUniversities();
    const defaultUni = universities[0] || { id: "", name: "", cityCode: "", geoHash: "" };

    const user = await api.loginAndSyncProfile();
    const universityIndex = Math.max(0, universities.findIndex((item) => item.id === user.universityId));
    const selectedUniversity = universities[universityIndex] || defaultUni;
    const profile = {
      ...this.data.profile,
      ...user,
      universityId: selectedUniversity.id,
      cityCode: selectedUniversity.cityCode
    };
    getApp().globalData.currentUser = profile;
    this.setData({
      profile,
      universities,
      universityIndex,
      selectedUniversity,
      genderIndex: Math.max(0, this.data.genderOptions.indexOf(profile.gender)),
      bioCount: (profile.bio || "").length,
      avatarText: (profile.nickName || "ing").slice(0, 2)
    });
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  async onChooseAvatar(event) {
    const tempPath = event.detail.avatarUrl;
    if (!tempPath) return;

    // 上传头像到云存储，避免临时路径过期
    const app = getApp();
    let avatarUrl = tempPath;
    if (wx.cloud && app.globalData.cloudReady) {
      try {
        const uploaded = await wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
          filePath: tempPath
        });
        avatarUrl = uploaded.fileID;
      } catch (err) {
        console.warn("头像上传云存储失败，使用临时路径", err);
      }
    }
    this.setData({ "profile.avatarUrl": avatarUrl });
  },

  onNickNameInput(event) {
    const nickName = event.detail.value;
    this.setData({
      "profile.nickName": nickName,
      avatarText: (nickName || "ing").slice(0, 2)
    });
  },

  onBioInput(event) {
    const bio = event.detail.value;
    this.setData({ "profile.bio": bio, bioCount: bio.length });
  },

  onGenderChange(event) {
    const genderIndex = Number(event.detail.value);
    this.setData({
      genderIndex,
      "profile.gender": this.data.genderOptions[genderIndex]
    });
  },

  onUniversityChange(event) {
    const universityIndex = Number(event.detail.value);
    const selectedUniversity = this.data.universities[universityIndex];
    if (!selectedUniversity) return;
    this.setData({
      universityIndex,
      selectedUniversity,
      "profile.universityId": selectedUniversity.id,
      "profile.cityCode": selectedUniversity.cityCode
    });
  },

  async saveProfile() {
    const { profile, selectedUniversity } = this.data;
    if (!profile.nickName.trim()) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }

    this.setData({ saving: true });
    const saved = await api.updateProfile({
      ...profile,
      universityName: selectedUniversity ? selectedUniversity.name : "",
      geoHash: selectedUniversity ? selectedUniversity.geoHash : ""
    });
    getApp().globalData.currentUser = saved;
    this.setData({ saving: false });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出登录吗？",
      success(res) {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.reLaunch({ url: "/pages/login/index" });
        }
      }
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
