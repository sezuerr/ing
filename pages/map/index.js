const api = require("../../utils/cloud");

function isWithin3h(ts) {
  return (Date.now() - ts) <= 3 * 60 * 60 * 1000;
}

Page({
  data: {
    mapLongitude: 116.3130,
    mapLatitude: 39.9705,
    feedList: [],
    markers: [],
    showPopover: false,
    popoverData: null,
    currentUserId: ""
  },

  goHome() {
    wx.switchTab({ url: "/pages/discover/index" });
  },

  _markerIdCounter: 0,
  _markerDataMap: {},
  _located: false,

  onLoad() {
    var app = getApp();
    var cu = app && app.globalData && app.globalData.currentUser;
    if (cu && cu._id) {
      this.setData({ currentUserId: cu._id });
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
    this.loadFeed();
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

  seedMockMarkers() {
    var now = Date.now();
    var feedList = [
      { id: "mock_uni_1",  postId: "mock_uni_1",  emoji: "🍔", label: "食堂上新", body: "东区食堂今天上了麻辣小龙虾！", landmark: "中国人民大学", universityName: "中国人民大学", displayName: "干饭人",  avatarText: "干", timeText: "5分钟前",  likeCount: 12, createdAt: now - 5 * 60000,     latitude: 39.9703, longitude: 116.3150, scope: "university", isLit: false },
      { id: "mock_uni_2",  postId: "mock_uni_2",  emoji: "📚", label: "卷王争霸", body: "求是楼通宵自习室还有位置吗？", landmark: "求是楼", universityName: "中国人民大学", displayName: "自习战神", avatarText: "自", timeText: "12分钟前", likeCount: 5,  createdAt: now - 12 * 60000,    latitude: 39.9710, longitude: 116.3142, scope: "university", isLit: false },
      { id: "mock_uni_3",  postId: "mock_uni_3",  emoji: "🏀", label: "打球吗", body: "世纪馆下午三点缺两个队友", landmark: "世纪馆", universityName: "中国人民大学", displayName: "灌篮高手", avatarText: "灌", timeText: "22分钟前", likeCount: 3,  createdAt: now - 22 * 60000,    latitude: 39.9698, longitude: 116.3168, scope: "university", isLit: false },
      { id: "mock_uni_4",  postId: "mock_uni_4",  emoji: "🐟", label: "摸鱼中", body: "图书馆负一楼暖气太足了，睡着了。", landmark: "图书馆", universityName: "中国人民大学", displayName: "摸鱼王者", avatarText: "摸", timeText: "8分钟前",  likeCount: 7,  createdAt: now - 8 * 60000,     latitude: 39.9718, longitude: 116.3120, scope: "university", isLit: false },
      { id: "mock_uni_5",  postId: "mock_uni_5",  emoji: "☕", label: "求续命", body: "知行楼咖啡机又坏了，求好心人带一杯！", landmark: "知行楼", universityName: "中国人民大学", displayName: "咖啡续命中", avatarText: "咖", timeText: "3分钟前",  likeCount: 2,  createdAt: now - 3 * 60000,     latitude: 39.9695, longitude: 116.3175, scope: "university", isLit: false },
      { id: "mock_city_2", postId: "mock_city_2", emoji: "🌇", label: "看晚霞", body: "今天清华园的晚霞绝了！", landmark: "清华大学", universityName: "清华大学", displayName: "清华小太阳", avatarText: "清", timeText: "18分钟前", likeCount: 8,  createdAt: now - 18 * 60000,    latitude: 40.001, longitude: 116.325, scope: "city", isLit: false },
      { id: "mock_city_3", postId: "mock_city_3", emoji: "🍖", label: "约烤肉", body: "北航南门新开的烤肉店求组队", landmark: "北京航空航天大学", universityName: "北京航空航天大学", displayName: "北航吃货", avatarText: "北", timeText: "6分钟前",  likeCount: 3,  createdAt: now - 6 * 60000,     latitude: 39.979, longitude: 116.348, scope: "city", isLit: false },
      { id: "mock_city_4", postId: "mock_city_4", emoji: "🚗", label: "堵死了", body: "五道口堵车堵到怀疑人生", landmark: "五道口", universityName: "清华大学", displayName: "堵在路上的", avatarText: "堵", timeText: "3分钟前",  likeCount: 1,  createdAt: now - 3 * 60000,     latitude: 39.994, longitude: 116.337, scope: "city", isLit: false },
      { id: "mock_city_5", postId: "mock_city_5", emoji: "👩‍🎓", label: "未名湖", body: "未名湖畔看书，今天阳光真好", landmark: "北京大学", universityName: "北京大学", displayName: "燕园学子", avatarText: "燕", timeText: "10分钟前", likeCount: 6,  createdAt: now - 10 * 60000,    latitude: 39.988, longitude: 116.304, scope: "city", isLit: false },
      { id: "mock_city_6", postId: "mock_city_6", emoji: "🛍️", label: "逛街中", body: "新中关B1层发现一家宝藏店！", landmark: "新中关", universityName: "北京大学", displayName: "购物狂人", avatarText: "购", timeText: "15分钟前", likeCount: 4,  createdAt: now - 15 * 60000,    latitude: 39.984, longitude: 116.308, scope: "city", isLit: false },
      { id: "mock_city_n5", postId: "mock_city_n5", emoji: "🎓", label: "毕业照", body: "穿学士服在二校门拍照", landmark: "清华大学二校门", universityName: "清华大学", displayName: "毕业快乐", avatarText: "毕", timeText: "25分钟前", likeCount: 9,  createdAt: now - 25 * 60000,    latitude: null, longitude: null, scope: "city", isLit: false },
      { id: "mock_city_n6", postId: "mock_city_n6", emoji: "✈️", label: "赶飞机", body: "北航沙河校区的风真大，快被吹走了", landmark: "北京航空航天大学", universityName: "北京航空航天大学", displayName: "沙河学子", avatarText: "沙", timeText: "40分钟前", likeCount: 2,  createdAt: now - 40 * 60000,    latitude: null, longitude: null, scope: "city", isLit: false }
    ];

    this.setData({ feedList: feedList });
    this.generateMapMarkers();
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
      if (!isWithin3h(item.createdAt)) continue;
      if (burnedIds.indexOf(item.id) !== -1) continue;

      var markerId = ++this._markerIdCounter;
      this._markerDataMap[markerId] = item;

      markers.push({
        id: markerId,
        latitude: item.latitude,
        longitude: item.longitude,
        width: 1,
        height: 1,
        alpha: 0,
        callout: {
          content: item.emoji + " " + item.label,
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
        scope: "university",
        topicOnly: false
      });
      var posts = result.posts || [];

      for (var j = 0; j < posts.length; j++) {
        var p = posts[j];
        var minAgo = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 60000);
        var authorName = (p.author && p.author.nickName) || "同学";

        feedList.push({
          id: p._id,
          postId: p._id,
          emoji: p.icon || "💡",
          label: p.title ? p.title.slice(0, 6) : "动态",
          landmark: p.landmark || p.universityName || "",
          body: p.body || "",
          displayName: authorName,
          avatarText: authorName.slice(0, 1),
          timeText: minAgo + "分钟前",
          universityName: p.universityName || "",
          likeCount: p.likeCount || 0,
          createdAt: new Date(p.createdAt).getTime(),
          latitude: p.latitude,
          longitude: p.longitude,
          scope: "university",
          isLit: false
        });
      }
    } catch (err) {
      console.error("[map] 云端加载失败，使用 mock 兜底", err);
    }

    // 云端无数据时 fallback 到 mock markers
    if (feedList.length === 0) {
      self.seedMockMarkers();
      return;
    }

    this.setData({ feedList: feedList });
    this.generateMapMarkers();
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

    var postId = data.postId || data.id;
    this._burnItem(postId);

    var feedList = this.data.feedList.filter(function(item) {
      return item.id !== postId;
    });
    this.setData({ feedList: feedList });
    this.generateMapMarkers();

    var post = {
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

    this.setData({
      showPopover: true,
      popoverData: { post: post }
    });
  },

  closePopover() {
    this.setData({ showPopover: false, popoverData: null });
  },

  noop() {},

  onPopoverLike(e) {
    var post = e.detail.post;
    if (post && post._id) {
      api.likePost(post._id);
    }
  },

  onRegionChange(e) {
  }
});
