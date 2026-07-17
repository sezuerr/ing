const api = require("../../utils/cloud");

var CAMPUS_STATUSES = [
  { emoji: "📚", label: "内卷中",     landmark: "求是楼",   body: "在求是楼三楼自习，今天效率好高！" },
  { emoji: "🏄", label: "冲浪中",     landmark: "明德楼",   body: "明德楼网速真快，摸鱼快乐。" },
  { emoji: "🚶", label: "想去散步",   landmark: "一勺池",   body: "一勺池旁边的鸽子好肥，想喂。" },
  { emoji: "🍔", label: "好饿好饿",   landmark: "东区食堂", body: "东区二楼的麻辣香锅排队好长。" },
  { emoji: "😶", label: "发呆中",     landmark: "百家廊",   body: "坐在百家廊看人来人往，放空 ing。" },
  { emoji: "🐟", label: "摸鱼中",     landmark: "图书馆",   body: "图书馆负一楼暖气太足，睡着了。" },
  { emoji: "💻", label: "假装努力中", landmark: "明德楼",   body: "明德楼自习室，电脑开着但人在刷手机。" },
  { emoji: "🧊", label: "需要一杯冰美式", landmark: "知行楼", body: "知行楼的咖啡机又坏了，需要冰美式续命。" },
  { emoji: "😴", label: "犯困中",     landmark: "品园宿舍", body: "品园六楼，周末早上真的不想起。" }
];

var MOCK_NAMES = ["小黄灯", "清风的歌", "干饭人", "摸鱼王者", "自习战神", "鸽王", "咖啡续命中", "早八起不来", "图书馆常住"];

function hashToSeed(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function isWithin24h(ts) {
  return (Date.now() - ts) < 24 * 60 * 60 * 1000;
}

function modeLabel(arr) {
  var map = {};
  var best = arr[0];
  for (var i = 0; i < arr.length; i++) {
    var k = arr[i];
    map[k] = (map[k] || 0) + 1;
    if (map[k] > map[best]) best = k;
  }
  return best;
}

Page({
  data: {
    allMarkers: [],
    clusteredMarkers: [],
    currentScale: 1,
    showPopover: false,
    popoverData: null,
    popoverDraft: "",
    statusBarHeight: 0
  },

  _scaleTimer: null,

  onLoad() {
    var sysInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sysInfo.statusBarHeight });
    this.seedMockMarkers();
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

  async loadFeed() {
    var result = await api.getDiscoverFeed({
      scope: "university",
      topicOnly: false
    });
    var posts = (result.posts || []).filter(function(p) {
      return isWithin24h(new Date(p.createdAt).getTime());
    });
    posts = posts.filter(function(p) {
      return p.universityId === "ruc";
    });
    this.generateMapMarkers(posts);
  },

  seedMockMarkers() {
    var markers = [];
    for (var i = 0; i < CAMPUS_STATUSES.length; i++) {
      var s = CAMPUS_STATUSES[i];
      var seed = hashToSeed(s.label + i);
      var nameIdx = (seed * 3 + i) % MOCK_NAMES.length;
      var minAgo = 2 + (seed % 280);
      markers.push({
        id: "mock_" + i,
        x: 40 + (seed % 620),
        y: 60 + (seed % 1000),
        emoji: s.emoji,
        label: s.label,
        landmark: s.landmark,
        body: s.body,
        displayName: MOCK_NAMES[nameIdx],
        avatarText: MOCK_NAMES[nameIdx].slice(0, 1),
        timeText: minAgo + "分钟前",
        universityName: "中国人民大学",
        likeCount: (seed % 15) + 1,
        createdAt: Date.now(),
        postId: "mock_" + i
      });
    }
    this.setData({ allMarkers: markers });
    this.computeClustered(1);
  },

  generateMapMarkers(posts) {
    var markers = this.data.allMarkers.filter(function(m) {
      return String(m.id).indexOf("mock_") === 0;
    });

    for (var j = 0; j < posts.length; j++) {
      var p = posts[j];
      var seed = hashToSeed(p._id);
      var minAgo = Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 60000);
      var authorName = (p.author && p.author.nickName) || "同学";
      markers.push({
        id: p._id,
        x: 50 + (seed % 640),
        y: 80 + ((seed * 7) % 1050),
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
        postId: p._id
      });
    }

    this.setData({ allMarkers: markers });
    this.computeClustered(this.data.currentScale);
  },

  onScaleChange(e) {
    var self = this;
    if (this._scaleTimer) clearTimeout(this._scaleTimer);
    this._scaleTimer = setTimeout(function() {
      var s = e.detail.scale;
      self.setData({ currentScale: s });
      self.computeClustered(s);
    }, 180);
  },

  computeClustered(scale) {
    if (scale >= 1.6) {
      var singles = [];
      for (var i = 0; i < this.data.allMarkers.length; i++) {
        var m = this.data.allMarkers[i];
        m._size = "single";
        singles.push(m);
      }
      this.setData({ clusteredMarkers: singles });
      return;
    }

    var cellSize = Math.floor(220 / scale);
    var grid = {};

    for (var i = 0; i < this.data.allMarkers.length; i++) {
      var mk = this.data.allMarkers[i];
      var cx = Math.floor(mk.x / cellSize);
      var cy = Math.floor(mk.y / cellSize);
      var key = cx + "_" + cy;
      if (!grid[key]) grid[key] = { x: cx, y: cy, children: [] };
      grid[key].children.push(mk);
    }

    var result = [];
    var keys = Object.keys(grid);
    for (var k = 0; k < keys.length; k++) {
      var cell = grid[keys[k]];
      if (cell.children.length === 1) {
        var s = cell.children[0];
        s._size = "single";
        result.push(s);
      } else {
        var emojis = [];
        var labels = [];
        for (var c = 0; c < cell.children.length; c++) {
          emojis.push(cell.children[c].emoji);
          labels.push(cell.children[c].label);
        }
        result.push({
          id: "cluster_" + keys[k].replace("_", "x"),
          x: (cell.x + 0.5) * cellSize,
          y: (cell.y + 0.5) * cellSize,
          emoji: modeLabel(emojis),
          label: modeLabel(labels),
          count: cell.children.length,
          _size: "cluster"
        });
      }
    }

    this.setData({ clusteredMarkers: result });
  },

  onMarkerTap(e) {
    var id = e.currentTarget.dataset.id;
    var size = e.currentTarget.dataset.size;
    if (size === "cluster") {
      this.setData({ currentScale: 1.8 });
      this.computeClustered(1.8);
      return;
    }
    var marker = null;
    for (var i = 0; i < this.data.allMarkers.length; i++) {
      if (this.data.allMarkers[i].id === id) {
        marker = this.data.allMarkers[i];
        break;
      }
    }
    if (!marker) return;
    this.setData({
      showPopover: true,
      popoverData: marker,
      popoverDraft: ""
    });
  },

  closePopover() {
    this.setData({ showPopover: false });
    var self = this;
    setTimeout(function() {
      self.setData({ popoverData: null });
    }, 350);
  },

  onPopoverDraft(e) {
    this.setData({ popoverDraft: e.detail.value });
  },

  likeFromPopover() {
    var data = this.data.popoverData;
    if (!data) return;
    var postId = data.postId || data.id;
    api.likePost(postId).then(function(r) {
      wx.showToast({ title: r && r.matched ? "配对成功" : "已点亮", icon: "none" });
    });
  },

  replyFromPopover() {
    var data = this.data.popoverData;
    var draft = this.data.popoverDraft.trim();
    if (!draft || !data) return;
    var postId = data.postId || data.id;
    api.sendPrivateReply({ postId: postId, content: draft }).then(function() {
      wx.showToast({ title: "已发送", icon: "success" });
      this.setData({ popoverDraft: "" });
      this.closePopover();
    }.bind(this));
  },

  noop() {}
});
