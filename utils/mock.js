const { UNIVERSITIES } = require("./constants");

const now = Date.now();

const myPosts = [
  {
    _id: "post_mine_1",
    authorId: "user_demo",
    author: { nickName: "小黄灯", avatarUrl: "", isFriend: true },
    title: "深夜的教学楼还亮着灯",
    body: "路过发现三楼还有人在赶作业，突然觉得没那么孤单了。",
    icon: "🌙",
    imageUrls: [],
    visibility: "public",
    universityId: "fudan",
    universityName: "复旦大学",
    createdAt: now - 1000 * 60 * 60 * 20,
    distanceText: "距你1公里内",
    likeCount: 6,
    commentCount: 1
  },
  {
    _id: "post_mine_2",
    authorId: "user_demo",
    author: { nickName: "小黄灯", avatarUrl: "", isFriend: true },
    title: "求推荐一家人少的咖啡馆",
    body: "想找个安静的地方看书，学校附近的咖啡馆有没有推荐？",
    icon: "☕",
    imageUrls: [],
    visibility: "university",
    universityId: "fudan",
    universityName: "复旦大学",
    createdAt: now - 1000 * 60 * 60 * 24 * 3,
    distanceText: "距你2公里内",
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
  bio: "正在找附近同频的人",
  universityId: "fudan",
  universityName: "复旦大学",
  cityCode: "shanghai",
  stats: myPosts.reduce(
    (acc, post) => ({
      likeCount: acc.likeCount + (post.likeCount || 0),
      commentCount: acc.commentCount + (post.commentCount || 0)
    }),
    { likeCount: 0, commentCount: 0 }
  )
};

const posts = [
  {
    _id: "post_1",
    authorId: "user_a",
    author: { nickName: "Echo", avatarUrl: "", isFriend: true },
    title: "今晚想找人散步",
    body: "刚写完小组作业，想沿着学校附近走一圈。可以只聊天，也可以安静走路。",
    icon: "💡",
    imageUrls: [],
    visibility: "public",
    universityId: "fudan",
    universityName: "复旦大学",
    createdAt: now - 1000 * 60 * 12,
    distanceText: "距你3公里内",
    mutualFriendCount: 3,
    likedMe: true,
    likeCount: 8,
    commentCount: 2
  },
  {
    _id: "post_2",
    authorId: "user_b",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "图书馆哪个角落最适合赶 ddl？",
    body: "最好是有插座、不会太吵、附近能买咖啡的地方。今天的随机话题也太真实了。",
    icon: "📚",
    imageUrls: [],
    visibility: "university",
    universityId: "fudan",
    universityName: "复旦大学",
    createdAt: now - 1000 * 60 * 44,
    distanceText: "距你1公里内",
    mutualFriendCount: 1,
    likedMe: false,
    likeCount: 5,
    commentCount: 0
  },
  {
    _id: "post_3",
    authorId: "user_c",
    author: { nickName: "", avatarUrl: "", isFriend: false },
    title: "想听一首你最近循环的歌",
    body: "今天从宿舍到教学楼一直在听同一首歌，突然好奇附近的人都在听什么。",
    icon: "🎧",
    imageUrls: [],
    visibility: "public",
    universityId: "sjtu",
    universityName: "上海交通大学",
    createdAt: now - 1000 * 60 * 90,
    distanceText: "距你10公里内",
    mutualFriendCount: 0,
    likedMe: true,
    likeCount: 13,
    commentCount: 5
  }
];

const notifications = [
  {
    _id: "notice_1",
    type: "match",
    title: "配对成功",
    description: "你和 Echo 互相点亮了，可以开始聊天。",
    actor: { nickName: "Echo", avatarUrl: "" },
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
    description: "今晚 9 点教学楼门口见？",
    actor: { nickName: "Echo", avatarUrl: "" },
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
    peer: { nickName: "Echo", avatarUrl: "" },
    lastMessage: { text: "今晚 9 点教学楼门口？", createdAt: now - 1000 * 60 * 7 },
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
  dailyTopic: { title: "今天你想和附近的人聊什么？", icon: "💡" }
};
