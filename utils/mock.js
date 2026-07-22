const { UNIVERSITIES } = require("./constants");

const now = Date.now();

const myPosts = [
  {
    _id: "post_mine_1",
    authorId: "demo_openid",
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
    commentCount: 2
  },
  {
    _id: "post_mine_2",
    authorId: "demo_openid",
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
    commentCount: 2
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
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 12,
    distanceText: "距你1公里内",
    mutualFriendCount: 3,
    likedMe: true,
    matched: true,
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
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 18,
    distanceText: "距你0.8公里内",
    mutualFriendCount: 2,
    likedMe: false,
    likedByMe: true,
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
    cityCode: "beijing",
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
    cityCode: "beijing",
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
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 72,
    distanceText: "距你1公里内",
    mutualFriendCount: 4,
    likedMe: false,
    matched: true,
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
    cityCode: "beijing",
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
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 120,
    distanceText: "距你0.9公里内",
    mutualFriendCount: 2,
    likedMe: true,
    matched: true,
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
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 150,
    distanceText: "距你0.4公里内",
    mutualFriendCount: 0,
    likedMe: false,
    matched: true,
    likeCount: 18,
    commentCount: 8
  },
  {
    _id: "post_city_1",
    authorId: "user_k",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "清华园今天的晚霞绝了",
    body: "从清华学堂出来正好看到一片粉紫色的晚霞，停下来看了十分钟。",
    icon: "🌇",
    imageUrls: [],
    visibility: "public",
    universityId: "tsinghua",
    universityName: "清华大学",
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 22,
    distanceText: "距你3公里内",
    mutualFriendCount: 0,
    likedMe: false,
    likeCount: 14,
    commentCount: 3
  },
  {
    _id: "post_city_2",
    authorId: "user_l",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "未名湖畔看书",
    body: "今天阳光真好，在未名湖边找了个长椅看了一下午书。",
    icon: "👩‍🎓",
    imageUrls: [],
    visibility: "public",
    universityId: "pku",
    universityName: "北京大学",
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 45,
    distanceText: "距你4公里内",
    mutualFriendCount: 0,
    likedMe: false,
    likeCount: 10,
    commentCount: 2
  },
  {
    _id: "post_city_3",
    authorId: "user_m",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "北航南门新开的烤肉店",
    body: "学院路新开了一家韩式烤肉，有没有人想一起组队去试试？",
    icon: "🍖",
    imageUrls: [],
    visibility: "public",
    universityId: "buaa",
    universityName: "北京航空航天大学",
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 16,
    distanceText: "距你5公里内",
    mutualFriendCount: 0,
    likedMe: false,
    likeCount: 5,
    commentCount: 1
  },
  {
    _id: "post_city_4",
    authorId: "user_n",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "五道口堵车堵到怀疑人生",
    body: "从清华骑车去五道口十分钟的路堵了半小时，五道口永远堵。",
    icon: "🚗",
    imageUrls: [],
    visibility: "public",
    universityId: "tsinghua",
    universityName: "清华大学",
    cityCode: "beijing",
    createdAt: now - 1000 * 60 * 8,
    distanceText: "距你3.5公里内",
    mutualFriendCount: 0,
    likedMe: false,
    likeCount: 3,
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
  },
  {
    _id: "conv_2",
    peerId: "user_x",
    peer: { nickName: "匿名用户#a3f8", avatarUrl: "" },
    lastMessage: { text: "明德楼的灯真好看，一起走走吗？", createdAt: now - 1000 * 60 * 30 },
    unreadCount: 1,
    status: "active",
    postId: "post_mine_1"
  },
  {
    _id: "conv_3",
    peerId: "user_y",
    peer: { nickName: "匿名用户#b7c2", avatarUrl: "" },
    lastMessage: { text: "我也喜欢在一勺池发呆，下次可以一起", createdAt: now - 1000 * 60 * 60 * 2 },
    unreadCount: 0,
    status: "active",
    postId: "post_mine_2"
  }
];

// 点亮记录
const postLikers = [
  // post_mine_1 的点亮者
  { _id: "like_m1_1", postId: "post_mine_1", fromUser: { nickName: "清风的歌", avatarUrl: "", isFriend: true, _id: "user_a" }, createdAt: Date.now() - 1000 * 60 * 60 * 3 },
  { _id: "like_m1_2", postId: "post_mine_1", fromUser: { nickName: "干饭人", avatarUrl: "", isFriend: false, _id: "user_b" }, createdAt: Date.now() - 1000 * 60 * 60 * 5 },
  { _id: "like_m1_3", postId: "post_mine_1", fromUser: { nickName: "自习战神", avatarUrl: "", isFriend: true, _id: "user_e" }, createdAt: Date.now() - 1000 * 60 * 60 * 8 },
  { _id: "like_m1_4", postId: "post_mine_1", fromUser: { nickName: "摸鱼王者", avatarUrl: "", isFriend: true, _id: "user_g" }, createdAt: Date.now() - 1000 * 60 * 60 * 12 },
  { _id: "like_m1_5", postId: "post_mine_1", fromUser: { nickName: "", avatarUrl: "", isFriend: false, _id: "user_c" }, createdAt: Date.now() - 1000 * 60 * 60 * 20 },
  { _id: "like_m1_6", postId: "post_mine_1", fromUser: { nickName: "", avatarUrl: "", isFriend: false, _id: "user_d" }, createdAt: Date.now() - 1000 * 60 * 60 * 24 },
  // post_mine_2 的点亮者
  { _id: "like_m2_1", postId: "post_mine_2", fromUser: { nickName: "鸽王", avatarUrl: "", isFriend: false, _id: "user_j" }, createdAt: Date.now() - 1000 * 60 * 60 * 2 },
  { _id: "like_m2_2", postId: "post_mine_2", fromUser: { nickName: "早八起不来", avatarUrl: "", isFriend: false, _id: "user_h" }, createdAt: Date.now() - 1000 * 60 * 60 * 6 },
  { _id: "like_m2_3", postId: "post_mine_2", fromUser: { nickName: "清风的歌", avatarUrl: "", isFriend: true, _id: "user_a" }, createdAt: Date.now() - 1000 * 60 * 60 * 10 },
  { _id: "like_m2_4", postId: "post_mine_2", fromUser: { nickName: "", avatarUrl: "", isFriend: false, _id: "user_f" }, createdAt: Date.now() - 1000 * 60 * 60 * 18 }
];

// 当前用户的帖子收到的评论/私密回复
const comments = [
  {
    _id: "comment_m1_1",
    postId: "post_mine_1",
    fromUser: { nickName: "匿名同学", avatarUrl: "" },
    content: "明德楼的灯真好看，一起走走吗？",
    createdAt: now - 1000 * 60 * 30
  },
  {
    _id: "comment_m1_2",
    postId: "post_mine_1",
    fromUser: { nickName: "匿名同学", avatarUrl: "" },
    content: "你在几楼呀？",
    createdAt: now - 1000 * 60 * 25
  },
  {
    _id: "comment_m2_1",
    postId: "post_mine_2",
    fromUser: { nickName: "匿名同学", avatarUrl: "" },
    content: "我也喜欢在一勺池发呆，下次可以一起",
    createdAt: now - 1000 * 60 * 60 * 2
  },
  {
    _id: "comment_m2_2",
    postId: "post_mine_2",
    fromUser: { nickName: "匿名同学", avatarUrl: "" },
    content: "鸽子真的好胖哈哈",
    createdAt: now - 1000 * 60 * 60 * 1
  }
];

// 聊天消息
const messages = [
  // conv_2：晚风 (post_mine_1)
  { _id: "msg_2_1", conversationId: "conv_2", fromPeer: true, content: "明德楼的灯真好看，一起走走吗？", createdAt: now - 1000 * 60 * 30 },
  { _id: "msg_2_2", conversationId: "conv_2", fromPeer: true, content: "你在几楼呀？", createdAt: now - 1000 * 60 * 25 },
  { _id: "msg_2_3", conversationId: "conv_2", fromPeer: false, content: "三楼靠窗的位置", createdAt: now - 1000 * 60 * 20 },
  { _id: "msg_2_4", conversationId: "conv_2", fromPeer: true, content: "好的我过来看看 😊", createdAt: now - 1000 * 60 * 18 },
  // conv_3：月光 (post_mine_2)
  { _id: "msg_3_1", conversationId: "conv_3", fromPeer: true, content: "我也喜欢在一勺池发呆，下次可以一起", createdAt: now - 1000 * 60 * 60 * 2 },
  { _id: "msg_3_2", conversationId: "conv_3", fromPeer: false, content: "哈哈好啊，你经常去吗", createdAt: now - 1000 * 60 * 60 * 1.8 },
  { _id: "msg_3_3", conversationId: "conv_3", fromPeer: true, content: "每周日下午会去坐一会儿", createdAt: now - 1000 * 60 * 60 * 1.5 },
  { _id: "msg_3_4", conversationId: "conv_3", fromPeer: true, content: "鸽子真的好胖哈哈", createdAt: now - 1000 * 60 * 60 * 1 },
  { _id: "msg_3_5", conversationId: "conv_3", fromPeer: false, content: "确实，被喂得太好了", createdAt: now - 1000 * 60 * 60 * 0.8 }
];

module.exports = {
  currentUser,
  posts,
  myPosts,
  postLikers,
  comments,
  messages,
  notifications,
  conversations,
  universities: UNIVERSITIES,
  dailyTopic: { title: "今天海淀有什么新鲜事？", icon: "💡" }
};
