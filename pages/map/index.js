const api = require("../../utils/cloud");

function isWithin24h(ts) {
  return (Date.now() - ts) <= 24 * 60 * 60 * 1000;
}

// 数据清洗: 接口返回的 icon 字段可能夹带中文文字（如 "🎧 动态"），
// 此函数剔除中文字符和空格，只保留纯 Emoji/图标
function extractIconOnly(raw) {
  if (!raw) return "💡";
  return raw.replace(/[\u4e00-\u9fa5]/g, "").replace(/\s+/g, "").trim() || "💡";
}

Page({
  data: {
    mapLongitude: 116.3130,
    mapLatitude: 39.9705,
    feedList: [],
    markers: [],
    showPopover: false,
    popoverData: null,
    currentUserId: "",
    myNickName: "",
    myAvatarUrl: ""
  },

  _markerIdCounter: 0,
  _markerDataMap: {},
  _located: false,
  _popoverSettled: false,

  onLoad() {
    var app = getApp();
    var cu = app && app.globalData && app.globalData.currentUser;
    if (cu && (cu.openid || cu._id)) {
      this.setData({
        currentUserId: cu.openid || cu._id,
        myNickName: cu.nickName || "",
        myAvatarUrl: cu.avatarUrl || ""
      });
    }
    this._locateUser();
  },

  _locateUser() {
    var self = this;
    wx.getLocation({
      type: "gcj02",
      success: function(res) {
        if (!self._located) {
          self._located = true;
          self.setData({
            mapLatitude: res.latitude,
            mapLongitude: res.longitude
          });
        }
      },
      fail: function() {
        if (!self._located) {
          self._located = true;
          self.setData({
            mapLatitude: 39.9705,
            mapLongitude: 116.3130
          });
        }
      }
    });
  },

  onShow() {
    this.setTab();
    // 修复: 仅在非 popover 展示状态下刷新列表，防止正在查看回复时被覆盖
    if (!this.data.showPopover) {
      this.loadFeed();
    }
  },

  setTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  _getBurnedIds() {
    try {
      return wx.getStorageSync("burned_ids") || [];
    } catch (e) {
      return [];
    }
  },

  _burnItem(postId) {
    try {
      var burnedIds = wx.getStorageSync("burned_ids") || [];
      if (burnedIds.indexOf(postId) === -1) {
        burnedIds.push(postId);
        wx.setStorageSync("burned_ids", burnedIds);
      }
    } catch (e) {}
  },

  generateMapMarkers() {
    var burnedIds = this._getBurnedIds();
    var feedList = this.data.feedList;
    var markers = [];
    this._markerDataMap = {};
    this._markerIdCounter = 0;

    for (var i = 0; i < feedList.length; i++) {
      var item = feedList[i];
      if (!item.latitude || !item.longitude) continue;
      if (!isWithin24h(item.createdAt)) continue;
      if (burnedIds.indexOf(item.id) !== -1) continue;

      var markerId = ++this._markerIdCounter;
      this._markerDataMap[markerId] = item;

      // 数据清洗: 切除 item.emoji 中夹带的中文文字，只保留纯 Emoji
      var cleanIcon = extractIconOnly(item.emoji);

      markers.push({
        id: markerId,
        latitude: item.latitude,
        longitude: item.longitude,
        // 核心修改：把底图缩小并设置为全透明（隐身术）
        width: 1, 
        height: 1,
        alpha: 0, 
        iconPath: "/icons/ing_logo.png", // 留着路径防止系统报错，反正已经透明看不见了
        
        // 这样就只剩下纯净的黄色气泡在地图上了
        callout: {
          content: cleanIcon,
          bgColor: "#FFF9C4",
          color: "#333333",
          padding: 8,
          borderRadius: 8,
          display: "ALWAYS"
        }
      });
    }

    this.setData({ markers: markers });
  },

  async loadFeed() {
    var self = this;
    var feedList = [];

    try {
      var result = await api.getDiscoverFeed({
        topicOnly: false
      });
      var posts = result.posts || [];

      for (var j = 0; j < posts.length; j++) {
        var p = posts[j];

        feedList.push({
          id: p._id,
          _post: p,
          emoji: p.icon || "💡",
          label: p.title ? p.title.slice(0, 6) : "动态",
          landmark: p.landmark || p.universityName || "",
          latitude: p.latitude,
          longitude: p.longitude,
          createdAt: new Date(p.createdAt).getTime()
        });
      }
    } catch (err) {
      console.error("[map] 云端加载失败，使用 mock 兜底", err);
    }

    if (!this.data.showPopover) {
      this.setData({ feedList: feedList });
      this.generateMapMarkers();
    }
  },

  onMarkerTap(e) {
    var tappedMarkerId = e.detail && e.detail.markerId;
    if (tappedMarkerId == null) return;
    this._openPopoverForMarker(tappedMarkerId);
  },

  onCalloutTap(e) {
    var tappedMarkerId = e.detail && e.detail.markerId;
    if (tappedMarkerId == null) return;
    this._openPopoverForMarker(tappedMarkerId);
  },

  _openPopoverForMarker(markerId) {
    var data = this._markerDataMap[markerId];
    if (!data) return;

    var postId = data.id;
    this._burnItem(postId);
    api.markPostAction({ postId: postId, action: "swiped" });

    var feedList = this.data.feedList.filter(function(item) {
      return item.id !== postId;
    });
    this.setData({ feedList: feedList });
    this.generateMapMarkers();

    // 优先使用完整帖子对象，mock 数据则构造简化版
    var post;
    if (data._post) {
      post = data._post;
      // 转换图片链接
      this.resolvePopoverImages(post);
    } else {
      post = {
        _id: data.postId || data.id,
        icon: data.emoji || "💡",
        title: data.label || "",
        body: data.body || "",
        likeCount: data.likeCount || 0,
        commentCount: 0,
        createdAt: data.createdAt || Date.now(),
        universityName: data.universityName || "",
        landmark: data.landmark || "",
        author: {
          nickName: data.displayName || "同学",
          avatarUrl: ""
        },
        authorId: data.authorId || "",
        likedMe: data.likedMe || false,
        likedByMe: data.isLit || false,
        matched: data.matched || false,
        distanceText: data.timeText || ""
      };
    }

    this._popoverSettled = false;
    this.setData({
      showPopover: true,
      popoverData: { post: post }
    });
  },

  async resolvePopoverImages(post) {
    if (!post) return;
    var allUrls = [];
    if (post.author && post.author.avatarUrl) allUrls.push(post.author.avatarUrl);
    if (post.imageUrls && post.imageUrls.length) allUrls = allUrls.concat(post.imageUrls);
    if (!allUrls.length) return;
    var resolved = await api.resolveImageUrls(allUrls);
    var map = {};
    allUrls.forEach(function(u, i) { map[u] = resolved[i]; });
    if (post.author && post.author.avatarUrl && map[post.author.avatarUrl]) post.author.avatarUrl = map[post.author.avatarUrl];
    if (post.imageUrls && post.imageUrls.length) post.imageUrls = post.imageUrls.map(function(u) { return map[u] || u; });
    this.setData({ popoverData: { post: post } });
  },

  closePopover() {
    this._popoverSettled = false;
    this.setData({ showPopover: false, popoverData: null });
    // 修复: 关闭弹窗后重新显示地图并刷新 markers
    this.generateMapMarkers();
  },

  noop() {},

  async onPopoverLike(e) {
    var post = e.detail.post;
    if (!post || !post._id) return;
    try {
      var result = await api.likePost(post._id);
      if (result && result.matched) {
        post.matched = true;
        post.likedByMe = true;
        this.setData({ popoverData: { post: post } });
        wx.showToast({ title: "配对成功，可以聊天了", icon: "none" });
      } else {
        wx.showToast({ title: "已点亮 · 等待回应", icon: "none" });
      }
    } catch (err) {
      wx.showToast({ title: "网络异常，请重试", icon: "none" });
    }
  },

  onPopoverReply(e) {
    var post = e.detail.post;
    var content = e.detail.content;
    api.sendPrivateReply({ postId: post._id, content: content });
  },

  onPopoverGoChat(e) {
    var post = e.detail.post;
    wx.navigateTo({ url: "/pages/chat/index?peerId=" + post.authorId + "&name=" + encodeURIComponent((post.author && post.author.nickName) || "同学") + "&avatar=" + encodeURIComponent((post.author && post.author.avatarUrl) || "") });
  },

  onPopoverReport(e) {
    var post = e.detail.post;
    api.reportPost({ postId: post._id, reason: "other" });
    wx.showToast({ title: "已举报", icon: "none" });
  },

  onRegionChange(e) {
  }
});
