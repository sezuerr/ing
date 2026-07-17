const { UNIVERSITIES } = require("./constants");

const now = Date.now();

const myPosts = [
  {
    _id: "post_mine_1",
    authorId: "user_demo",
    author: { nickName: "小黄灯", avatarUrl: "", isFriend: true },
    title: "明德楼的灯还亮着",
    body: "路过发现三楼还有人在赶作业，突然觉得没那么孤单了。",
    icon: "🌙",
    imageUrls: [],
    visibility: "public",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 60 * 3,
    distanceText: "距你1公里内",
    likeCount: 6,
    commentCount: 1
  },
  {
    _id: "post_mine_2",
    authorId: "user_demo",
    author: { nickName: "小黄灯", avatarUrl: "", isFriend: true },
    title: "一勺池旁边有人喂鸽子",
    body: "下午坐在一勺池旁边发呆，看到有人在喂鸽子，好治愈。",
    icon: "☕",
    imageUrls: [],
    visibility: "university",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 60 * 5,
    distanceText: "距你0.5公里内",
    likeCount: 4,
    commentCount: 3
  }
];

const currentUser = {
  _id: "user_demo",
  openid: "demo_openid",
  avatarUrl: "",
  nickName: "小黄灯",
  gender: "非二元",
  bio: "人大在读 · 正在找附近同频的人",
  universityId: "ruc",
  universityName: "中国人民大学",
  cityCode: "beijing",
  stats: myPosts.reduce(
    function(acc, post) {
      return {
        likeCount: acc.likeCount + (post.likeCount || 0),
        commentCount: acc.commentCount + (post.commentCount || 0)
      };
    },
    { likeCount: 0, commentCount: 0 }
  )
};

const posts = [
  {
    _id: "post_1",
    authorId: "user_a",
    author: { nickName: "清风的歌", avatarUrl: "", isFriend: true },
    title: "求是楼门口等你",
    body: "刚写完小组作业，想沿着学校附近走一圈。可以只聊天，也可以安静走路。",
    icon: "💡",
    landmark: "求是楼",
    imageUrls: [],
    visibility: "public",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 12,
    distanceText: "距你1公里内",
    mutualFriendCount: 3,
    likedMe: true,
    likeCount: 8,
    commentCount: 2
  },
  {
    _id: "post_2",
    authorId: "user_b",
    author: { nickName: "干饭人", avatarUrl: "", isFriend: false },
    title: "东区食堂的麻辣香锅排疯了",
    body: "东区二楼的麻辣香锅队伍从窗口排到电梯口了，谁来救救我。",
    icon: "🍔",
    landmark: "东区食堂",
    imageUrls: [],
    visibility: "university",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 18,
    distanceText: "距你0.8公里内",
    mutualFriendCount: 2,
    likedMe: false,
    likeCount: 11,
    commentCount: 4
  },
  {
    _id: "post_3",
    authorId: "user_c",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "图书馆负一楼暖气太足了",
    body: "本来只是想来查个资料，暖气一吹直接睡了半小时。有人也一样吗？",
    icon: "🐟",
    landmark: "图书馆",
    imageUrls: [],
    visibility: "university",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 35,
    distanceText: "距你0.5公里内",
    mutualFriendCount: 0,
    likedMe: false,
    likeCount: 7,
    commentCount: 2
  },
  {
    _id: "post_4",
    authorId: "user_d",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "坐在百家廊看来来往往",
    body: "下午的阳光刚好照到长廊上，看路人匆匆走过去，我在放空。",
    icon: "😶",
    landmark: "百家廊",
    imageUrls: [],
    visibility: "public",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 55,
    distanceText: "距你0.6公里内",
    mutualFriendCount: 0,
    likedMe: true,
    likeCount: 15,
    commentCount: 6
  },
  {
    _id: "post_5",
    authorId: "user_e",
    author: { nickName: "自习战神", avatarUrl: "", isFriend: true },
    title: "求是楼三楼今天效率很高",
    body: "在求是楼三楼占到了靠窗的位置，今天效率好高！可以互相监督打卡。",
    icon: "📚",
    landmark: "求是楼",
    imageUrls: [],
    visibility: "university",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 72,
    distanceText: "距你1公里内",
    mutualFriendCount: 4,
    likedMe: false,
    likeCount: 9,
    commentCount: 1
  },
  {
    _id: "post_6",
    authorId: "user_f",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "知行楼的咖啡机又坏了",
    body: "早八课需要冰美式续命，结果咖啡机又一个红灯。这是这个月第三次了。",
    icon: "🧊",
    landmark: "知行楼",
    imageUrls: [],
    visibility: "public",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 100,
    distanceText: "距你1.2公里内",
    mutualFriendCount: 1,
    likedMe: false,
    likeCount: 6,
    commentCount: 3
  },
  {
    _id: "post_7",
    authorId: "user_g",
    author: { nickName: "摸鱼王者", avatarUrl: "", isFriend: true },
    title: "明德楼网速真快摸鱼一流",
    body: "明德楼自习室，电脑开着论文但人在刷手机。有人来一起摸吗？",
    icon: "🏄",
    landmark: "明德楼",
    imageUrls: [],
    visibility: "university",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 120,
    distanceText: "距你0.9公里内",
    mutualFriendCount: 2,
    likedMe: true,
    likeCount: 12,
    commentCount: 5
  },
  {
    _id: "post_8",
    authorId: "user_h",
    author: { nickName: "早八起不来", avatarUrl: "", isFriend: false },
    title: "品园六楼的周末早上",
    body: "品园六楼，周末早上真的不想起。有人在品园吗，中午约个饭？",
    icon: "😴",
    landmark: "品园宿舍",
    imageUrls: [],
    visibility: "public",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 150,
    distanceText: "距你0.4公里内",
    mutualFriendCount: 0,
    likedMe: false,
    likeCount: 18,
    commentCount: 8
  },
  {
    _id: "post_9",
    authorId: "user_i",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "一勺池的鸽子又胖了",
    body: "下午路过一勺池看到有人在喂鸽子，那些鸽子肉眼可见地胖了一圈。",
    icon: "☕",
    landmark: "一勺池",
    imageUrls: [],
    visibility: "university",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 200,
    distanceText: "距你0.7公里内",
    mutualFriendCount: 0,
    likedMe: true,
    likeCount: 14,
    commentCount: 4
  },
  {
    _id: "post_10",
    authorId: "user_j",
    author: { nickName: "鸽王", avatarUrl: "", isFriend: false },
    title: "有人想一起去海淀公园跑步吗",
    body: "今天天气太好了，不想待在室内。约个6公里慢跑，速度随意。",
    icon: "🚶",
    imageUrls: [],
    visibility: "public",
    universityId: "ruc",
    universityName: "中国人民大学",
    createdAt: now - 1000 * 60 * 8,
    distanceText: "距你1.5公里内",
    mutualFriendCount: 1,
    likedMe: false,
    likeCount: 4,
    commentCount: 1
  }
];

const notifications = [
  {
    _id: "notice_1",
    type: "match",
    title: "配对成功",
    description: "你和 清风的歌 互相点亮了，可以开始聊天。",
    actor: { nickName: "清风的歌", avatarUrl: "" },
    actorId: "user_a",
    postId: "post_1",
    createdAt: now - 1000 * 60 * 6,
    read: false
  },
  {
    _id: "notice_2",
    type: "like",
    title: "收到一个点亮",
    description: "有人点亮了你的帖子「想听一首你最近循环的歌」。",
    actor: null,
    actorId: "user_c",
    postId: "post_3",
    createdAt: now - 1000 * 60 * 32,
    read: false
  },
  {
    _id: "notice_3",
    type: "comment",
    title: "收到一条私密回复",
    description: "求是楼门口 9 点见？",
    actor: { nickName: "清风的歌", avatarUrl: "" },
    actorId: "user_a",
    postId: "post_1",
    createdAt: now - 1000 * 60 * 60 * 5,
    read: true
  }
];

const conversations = [
  {
    _id: "conv_1",
    peerId: "user_a",
    peer: { nickName: "清风的歌", avatarUrl: "" },
    lastMessage: { text: "求是楼门口 9 点见？", createdAt: now - 1000 * 60 * 7 },
    unreadCount: 2,
    status: "active"
  }
];

module.exports = {
  currentUser,
  posts,
  myPosts,
  notifications,
  conversations,
  universities: UNIVERSITIES,
  dailyTopic: { title: "今天海淀有什么新鲜事？", icon: "💡" }
};
