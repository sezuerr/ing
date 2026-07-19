const api = require("../../utils/cloud");

const CAMPUS_STATUSES = [
  { emoji: "📚", label: "内卷中",     landmark: "求是楼",   body: "在求是楼三楼自习，今天效率好高！" },
  { emoji: "🏄", label: "冲浪中",     landmark: "明德楼",   body: "明德楼网速真快，摸鱼快乐。" },
  { emoji: "🚶", label: "想去散步",   landmark: "一勺池",   body: "一勺池旁边的鸽子好肥，想喂。" },
  { emoji: "🍔", label: "好饿好饿",   landmark: "东区食堂", body: "东区二楼的麻辣香锅排队好长。" },
  { emoji: "😶", label: "发呆中",     landmark: "百家廊",   body: "坐在百家廊看人来人往，放空 ing。" },
  { emoji: "🐟", label: "摸鱼中",     landmark: "图书馆",   body: "图书馆负一楼暖气太足，睡着了。" },
  { emoji: "💻", label: "假装努力中", landmark: "明德楼",   body: "明德楼自习室，电脑开着但人在刷手机。" },
  { emoji: "🧊", label: "需要一杯冰美式", landmark: "知行楼", body: "知行楼的咖啡机又坏了，需要冰美式续命。" },
  { emoji: "😴", label: "犯困中",     landmark: "品园宿舍", body: "品园六楼，周末早上真的不想起。" },
  { emoji: "🍜", label: "嗦粉去",     landmark: "食宝街",   body: "食宝街新开的螺蛳粉店，下课冲！" },
  { emoji: "🚇", label: "挤地铁",     landmark: "人民大学站", body: "四号线早高峰，人山人海。" },
  { emoji: "☕", label: "瑞一杯",     landmark: "校外瑞幸", body: "校外瑞幸9.9，比知行楼咖啡机靠谱多了。" },
  { emoji: "🍢", label: "深夜撸串",   landmark: "北门烧烤", body: "北门外烧烤摊，要了一打羊肉串。" },
  { emoji: "🏀", label: "打球吗",     landmark: "世纪馆",   body: "世纪馆下午有空的，一起打球。" },
  { emoji: "🎮", label: "开黑中",     landmark: "品园宿舍", body: "品园宿舍开黑，缺一个辅助！" },
  { emoji: "🛍️", label: "逛街中",     landmark: "新中关",   body: "新中关B1层，发现一家宝藏店。" },
  { emoji: "📸", label: "拍银杏",     landmark: "银杏路",   body: "银杏路叶子黄了，拍照的快来。" },
  { emoji: "😋", label: "在吃瓜",     landmark: "教二草坪", body: "教二草坪坐着吃瓜，今天天气真好。" }
];

const MOCK_NAMES = ["小黄灯", "清风的歌", "干饭人", "摸鱼王者", "自习战神", "鸽王", "咖啡续命中", "早八起不来", "图书馆常住"];

const EXTERNAL_CENTERS = [
  { name: "北京大学", lat: 39.986, lng: 116.305, landmarks: ["未名湖", "博雅塔", "燕南园", "农园食堂", "图书馆"] },
  { name: "清华大学", lat: 40.000, lng: 116.326, landmarks: ["荷塘", "二校门", "紫荆操场", "清芬园", "李文正馆"] },
  { name: "北京航空航天大学", lat: 39.980, lng: 116.347, landmarks: ["新主楼", "绿园", "体育馆", "合一楼", "沙河校区"] }
];

const RUC_CENTER_LAT = 39.9705;
const RUC_CENTER_LNG = 116.3130;

function hashToSeed(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function isWithin3h(ts) {
  return (Date.now() - ts) <= 3 * 60 * 60 * 1000;
}

function buildCallout(emoji, label, suffix, overridePadding) {
  var content = emoji + " " + (label || "").slice(0, 4);
  if (suffix) content += " " + suffix;
  return {
    content: content,
    display: "ALWAYS",
    padding: overridePadding != null ? overridePadding : 6,
    borderRadius: 8,
    bgColor: "#FFF9C4",
    color: "#333333"
  };
}

function randomOffset(seed, offset, spreadDeg) {
  var factor = spreadDeg / 50;
  return {
    lat: ((seed % 100) - 50) * factor,
    lng: (((seed + offset) * 7 % 100) - 50) * factor
  };
}

Page({
  data: {
    mapLongitude: 116.3130,
    mapLatitude: 39.9705,
    activeTab: "university",
    feedList: [],
    displayFeedList: [],
    markers: [],
    showPopover: false,
    popoverData: null,
    popoverDraft: "",
    mapScale: 16
  },

  goHome() {
    wx.switchTab({ url: "/pages/discover/index" });
  },

  _markerIdCounter: 0,
  _markerDataMap: {},
  _clusterInited: false,
  _mapCtx: null,

  onLoad() {
    this.seedMockMarkers();
  },

  onReady() {
    var mapCtx = wx.createMapContext("campusMap", this);
    this._mapCtx = mapCtx;
    var self = this;
    mapCtx.getScale({
      success: function(res) {
        if (res.scale !== self.data.mapScale) {
          self.setData({ mapScale: res.scale });
          self.generateMapMarkers();
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

  _computeDisplayFeed() {
    var tab = this.data.activeTab;
    var list = this.data.feedList.filter(function(item) {
      if (tab === "university") return item.scope === "university";
      return item.scope === "city";
    });
    this.setData({ displayFeedList: list });
  },

  onTabChange(e) {
    var selectedTab = e.currentTarget.dataset.tab;
    var filteredData = this.data.feedList.filter(function(item) {
      return item.scope === selectedTab;
    });
    this.setData({
      activeTab: selectedTab,
      displayFeedList: filteredData
    });
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
    this._computeDisplayFeed();
    this.generateMapMarkers();
  },

  generateMapMarkers() {
    var burnedIds = this._getBurnedIds();
    var feedList = this.data.feedList;
    var markers = [];
    this._markerDataMap = {};
    this._markerIdCounter = 0;
    var scale = this.data.mapScale || 16;

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
          content: scale >= 17 ? (item.emoji + " " + item.label) : "",
          bgColor: "#FFF9C4",
          color: "#333333",
          padding: scale >= 17 ? 8 : 0,
          borderRadius: 8,
          display: scale >= 17 ? "ALWAYS" : "BYCLICK"
        }
      });
    }

    if (scale < 17) {
      var groups = {};
      var gridSize = scale < 14 ? 0.015 : 0.005;
      for (var j = 0; j < markers.length; j++) {
        var m = markers[j];
        var gridLat = Math.round(m.latitude / gridSize) * gridSize;
        var gridLng = Math.round(m.longitude / gridSize) * gridSize;
        var key = gridLat.toFixed(4) + "," + gridLng.toFixed(4);
        if (!groups[key]) groups[key] = { count: 0, lat: 0, lng: 0 };
        groups[key].count++;
        groups[key].lat += m.latitude;
        groups[key].lng += m.longitude;
      }
      for (var key in groups) {
        var g = groups[key];
        var cid = 10000 + (++this._markerIdCounter);
        this._markerDataMap[cid] = { _cluster: true, count: g.count, lat: g.lat / g.count, lng: g.lng / g.count };
        markers.push({
          id: cid,
          latitude: g.lat / g.count,
          longitude: g.lng / g.count,
          width: 1,
          height: 1,
          callout: {
            content: String(g.count),
            color: "#333333",
            bgColor: "#FFCA28",
            padding: 6,
            borderRadius: 50,
            fontSize: 14,
            display: "ALWAYS",
            textAlign: "center"
          }
        });
      }
    }

    this.setData({ markers: markers });
  },

  async loadFeed() {
    var burnedIds = this._getBurnedIds();
    var existingIds = {};
    var feedList = this.data.feedList;
    for (var k = 0; k < feedList.length; k++) {
      existingIds[feedList[k].id] = true;
    }

    var result = await api.getDiscoverFeed({
      scope: "university",
      topicOnly: false
    });
    var posts = (result.posts || []).filter(function(p) {
      return p.universityId === "ruc";
    });
    posts = posts.filter(function(p) {
      return burnedIds.indexOf(p._id) === -1;
    });

    var newItems = [];
    for (var j = 0; j < posts.length; j++) {
      var p = posts[j];
      if (existingIds[p._id]) continue;
      existingIds[p._id] = true;

      var minAgo = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 60000);
      var authorName = (p.author && p.author.nickName) || "同学";

      newItems.push({
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

    if (newItems.length > 0) {
      this.setData({ feedList: feedList.concat(newItems) });
    }

    this._computeDisplayFeed();
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

    if (data._cluster) {
      var self = this;
      this.setData({
        mapLatitude: data.lat,
        mapLongitude: data.lng,
        mapScale: 17
      });
      setTimeout(function() {
        self.generateMapMarkers();
      }, 500);
      return;
    }

    var postId = data.postId || data.id;
    this._burnItem(postId);

    var feedList = this.data.feedList.filter(function(item) {
      return item.id !== postId;
    });
    this.setData({ feedList: feedList });
    this._computeDisplayFeed();
    this.generateMapMarkers();

    wx.navigateTo({ url: "/pages/post-detail/index?id=" + postId });
  },

  onRegionChange(e) {
    if (e.type !== "end") return;
    var mapCtx = this._mapCtx || wx.createMapContext("campusMap", this);
    if (!mapCtx || !mapCtx.getScale) return;
    var self = this;
    mapCtx.getScale({
      success: function(res) {
        if (res.scale === self.data.mapScale) return;
        var prevBelowThreshold = self.data.mapScale < 17;
        var currBelowThreshold = res.scale < 17;
        self.setData({ mapScale: res.scale });
        if (prevBelowThreshold !== currBelowThreshold) {
          self.generateMapMarkers();
        }
      }
    });
  },

});
