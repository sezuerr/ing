const { UNIVERSITIES } = require("../../utils/constants");
const api = require("../../utils/cloud");

Page({
  data: {
    genderOptions: ["男", "女", "非二元"],
    genderIndex: 2,
    universities: UNIVERSITIES,
    universityIndex: 0,
    selectedUniversity: UNIVERSITIES[0],
    avatarText: "ing",
    bioCount: 0,
    saving: false,
    profile: {
      avatarUrl: "",
      nickName: "",
      gender: "非二元",
      bio: "",
      universityId: UNIVERSITIES[0].id,
      cityCode: UNIVERSITIES[0].cityCode
    }
  },

  async onShow() {
    this.setTab();
    const user = await api.loginAndSyncProfile();
    const universityIndex = Math.max(0, UNIVERSITIES.findIndex((item) => item.id === user.universityId));
    const selectedUniversity = UNIVERSITIES[universityIndex] || UNIVERSITIES[0];
    const profile = {
      ...this.data.profile,
      ...user,
      universityId: selectedUniversity.id,
      cityCode: selectedUniversity.cityCode
    };
    getApp().globalData.currentUser = profile;
    this.setData({
      profile,
      genderIndex: Math.max(0, this.data.genderOptions.indexOf(profile.gender)),
      universityIndex,
      selectedUniversity,
      bioCount: (profile.bio || "").length,
      avatarText: (profile.nickName || "ing").slice(0, 2)
    });
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onChooseAvatar(event) {
    this.setData({ "profile.avatarUrl": event.detail.avatarUrl });
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
    const selectedUniversity = UNIVERSITIES[universityIndex];
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
      universityName: selectedUniversity.name,
      geoHash: selectedUniversity.geoHash
    });
    getApp().globalData.currentUser = saved;
    this.setData({ saving: false });
    wx.showToast({ title: "已保存", icon: "success" });
  }
});
