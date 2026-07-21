const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const C = {
  users: "users",
  universities: "universities",
  topics: "daily_topics",
  posts: "posts",
  likes: "likes",
  comments: "comments",
  matches: "matches",
  notifications: "notifications",
  conversations: "conversations",
  messages: "messages",
  reports: "reports",
  actions: "post_actions"
};

function ok(data = {}) {
  return { ok: true, data };
}

function fail(message, code = "BAD_REQUEST") {
  return { ok: false, code, message };
}

function now() {
  return db.serverDate();
}

function sortPair(a, b) {
  return [a, b].sort().join("_");
}

async function getUserByOpenId(openid) {
  const result = await db.collection(C.users).where({ openid }).limit(1).get();
  return result.data[0] || null;
}

async function ensureUser(openid, profile = {}) {
  const existing = await getUserByOpenId(openid);
  if (existing) return existing;

  const doc = {
    openid,
    avatarUrl: profile.avatarUrl || "",
    nickName: profile.nickName || "小黄灯",
    gender: profile.gender || "非二元",
    bio: profile.bio || "",
    universityId: profile.universityId || "",
    universityName: profile.universityName || "",
    cityCode: profile.cityCode || "",
    geoHash: profile.geoHash || "",
    privacy: { showToFriendsOnly: false },
    stats: { likeCount: 0, commentCount: 0 },
    createdAt: now(),
    updatedAt: now()
  };
  const created = await db.collection(C.users).add({ data: doc });
  return { _id: created._id, ...doc };
}

async function activeMatch(openid, peerId) {
  const pairKey = sortPair(openid, peerId);
  const result = await db.collection(C.matches).where({ pairKey, status: "active" }).limit(1).get();
  return result.data[0] || null;
}

async function loginAndSyncProfile(openid, payload) {
  const user = await ensureUser(openid, payload || {});
  return ok(user);
}

async function updateProfile(openid, payload) {
  const user = await ensureUser(openid);
  const allowed = {
    avatarUrl: payload.avatarUrl || "",
    nickName: String(payload.nickName || "").slice(0, 20),
    gender: payload.gender || "非二元",
    bio: String(payload.bio || "").slice(0, 50),
    universityId: payload.universityId || "",
    universityName: payload.universityName || "",
    cityCode: payload.cityCode || "",
    geoHash: payload.geoHash || "",
    updatedAt: now()
  };

  await db.collection(C.users).doc(user._id).update({ data: allowed });
  return ok({ ...user, ...allowed });
}

function canSeePost(post, user, friendIds) {
  if (post.authorId === user.openid) return true;
  if (post.visibility === "public") return true;
  if (post.visibility === "university") return post.universityId && post.universityId === user.universityId;
  if (post.visibility === "friends") return friendIds.includes(post.authorId);
  return false;
}

function applyScope(post, user, scope, friendIds) {
  if (scope === "university") return post.universityId && post.universityId === user.universityId;
  if (scope === "friends") return friendIds.includes(post.authorId);
  return post.cityCode && post.cityCode === user.cityCode;
}

async function getFriendIds(openid) {
  const matches = await db.collection(C.matches).where({
    members: _.all([openid]),
    status: "active"
  }).limit(100).get();
  return matches.data.map((match) => match.members.find((id) => id !== openid)).filter(Boolean);
}

async function getExcludedPostIds(openid) {
  const actions = await db.collection(C.actions).where({
    userId: openid,
    action: _.in(["swiped", "not_interested", "reported"])
  }).limit(200).get();
  return actions.data.map((item) => item.postId);
}

async function getDiscoverFeed(openid, payload) {
  const user = await ensureUser(openid);
  const scope = payload.scope || "city";
  const friendIds = await getFriendIds(openid);
  const excludedIds = await getExcludedPostIds(openid);
  const postsResult = await db.collection(C.posts).where({
    status: "visible"
  }).orderBy("createdAt", "desc").limit(100).get();

  const enriched = [];
  for (const post of postsResult.data) {
    if (post.authorId === openid) continue;
    if (excludedIds.includes(post._id)) continue;
    if (!canSeePost(post, user, friendIds)) continue;
    if (!applyScope(post, user, scope, friendIds)) continue;
    if (payload.topicOnly && !post.dailyTopicId) continue;

    const author = await getUserByOpenId(post.authorId);
    const isFriend = friendIds.includes(post.authorId);
    const authorLikesMe = await db.collection(C.likes).where({
      fromUserId: post.authorId,
      toUserId: openid
    }).limit(1).get();

    enriched.push({
      ...post,
      author: isFriend && author ? {
        nickName: author.nickName,
        avatarUrl: author.avatarUrl,
        isFriend: true
      } : { isFriend: false },
      mutualFriendCount: isFriend ? 1 : 0,
      likedMe: Boolean(authorLikesMe.data.length),
      distanceText: post.distanceText || "距你10公里内"
    });
  }

  enriched.sort((a, b) => {
    const aAffinity = (a.authorLikeCount || 0) * 1000 + (a.mutualFriendCount || 0) * 100;
    const bAffinity = (b.authorLikeCount || 0) * 1000 + (b.mutualFriendCount || 0) * 100;
    if (bAffinity !== aAffinity) return bAffinity - aAffinity;
    const aTime = new Date(a.createdAt).getTime() || 0;
    const bTime = new Date(b.createdAt).getTime() || 0;
    return bTime - aTime;
  });

  const topicResult = await db.collection(C.topics).where({ status: "active" }).orderBy("date", "desc").limit(1).get();
  return ok({
    posts: enriched.slice(0, 30),
    dailyTopic: topicResult.data[0] || null
  });
}

async function createPost(openid, payload) {
  const user = await ensureUser(openid);
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();
  if (!body) return fail("正文不能为空");

  const doc = {
    authorId: openid,
    title: title.slice(0, 40),
    body: body.slice(0, 800),
    icon: payload.icon || "💡",
    imageUrls: Array.isArray(payload.imageUrls) ? payload.imageUrls.slice(0, 9) : [],
    visibility: payload.visibility || "public",
    cityCode: payload.cityCode || user.cityCode,
    universityId: payload.universityId || user.universityId,
    universityName: payload.universityName || user.universityName,
    geoHash: payload.geoHash || user.geoHash || "",
    latitude: payload.latitude != null ? payload.latitude : null,
    longitude: payload.longitude != null ? payload.longitude : null,
    distanceText: "距你10公里内",
    status: "visible",
    reviewStatus: "pending",
    likeCount: 0,
    commentCount: 0,
    createdAt: now(),
    updatedAt: now()
  };
  const result = await db.collection(C.posts).add({ data: doc });
  return ok({ _id: result._id, ...doc });
}

async function createNotification(data) {
  return db.collection(C.notifications).add({
    data: {
      ...data,
      read: false,
      createdAt: now()
    }
  });
}

async function createOrGetMatch(openid, peerId) {
  const pairKey = sortPair(openid, peerId);
  const existing = await db.collection(C.matches).where({ pairKey }).limit(1).get();
  if (existing.data[0]) {
    if (existing.data[0].status !== "active") {
      await db.collection(C.matches).doc(existing.data[0]._id).update({
        data: { status: "active", unmatchedAt: null, updatedAt: now() }
      });
    }
    return existing.data[0];
  }

  const matchDoc = {
    pairKey,
    members: [openid, peerId],
    userA: openid,
    userB: peerId,
    status: "active",
    createdAt: now(),
    updatedAt: now()
  };
  const created = await db.collection(C.matches).add({ data: matchDoc });
  await db.collection(C.conversations).add({
    data: {
      members: [openid, peerId],
      matchId: created._id,
      lastMessage: { text: "你们互相点亮了", createdAt: now() },
      unreadMap: { [openid]: 0, [peerId]: 1 },
      status: "active",
      createdAt: now(),
      updatedAt: now()
    }
  });
  return { _id: created._id, ...matchDoc };
}

async function likePost(openid, payload) {
  const postId = payload.postId;
  const postResult = await db.collection(C.posts).doc(postId).get();
  const post = postResult.data;
  if (!post || post.authorId === openid) return fail("不能点亮自己的帖子");

  const duplicate = await db.collection(C.likes).where({ postId, fromUserId: openid }).limit(1).get();
  if (duplicate.data.length) return ok({ matched: false, duplicate: true });

  await db.collection(C.likes).add({
    data: {
      postId,
      fromUserId: openid,
      toUserId: post.authorId,
      createdAt: now()
    }
  });
  await db.collection(C.posts).doc(postId).update({ data: { likeCount: _.inc(1) } });
  await db.collection(C.users).where({ openid: post.authorId }).update({ data: { "stats.likeCount": _.inc(1) } });
  await createNotification({
    recipientId: post.authorId,
    type: "like",
    actorId: openid,
    postId,
    title: "收到一个点亮",
    description: `有人点亮了你的帖子「${post.title}」。`
  });

  const reciprocal = await db.collection(C.likes).where({
    fromUserId: post.authorId,
    toUserId: openid
  }).limit(1).get();
  if (!reciprocal.data.length) return ok({ matched: false });

  await createOrGetMatch(openid, post.authorId);
  await createNotification({
    recipientId: post.authorId,
    type: "match",
    actorId: openid,
    postId,
    title: "配对成功",
    description: "你们互相点亮了，可以开始聊天。"
  });
  await createNotification({
    recipientId: openid,
    type: "match",
    actorId: post.authorId,
    postId,
    title: "配对成功",
    description: "你们互相点亮了，可以开始聊天。"
  });
  return ok({ matched: true });
}

async function sendPrivateReply(openid, payload) {
  const post = (await db.collection(C.posts).doc(payload.postId).get()).data;
  if (!post) return fail("帖子不存在", "NOT_FOUND");
  const match = await activeMatch(openid, post.authorId);
  if (!match) return fail("互亮后才能私密回复", "FORBIDDEN");

  const content = String(payload.content || "").trim().slice(0, 500);
  if (!content) return fail("回复内容不能为空");
  await db.collection(C.comments).add({
    data: {
      postId: payload.postId,
      fromUserId: openid,
      toUserId: post.authorId,
      content,
      createdAt: now()
    }
  });
  await db.collection(C.posts).doc(payload.postId).update({ data: { commentCount: _.inc(1) } });
  await db.collection(C.users).where({ openid: post.authorId }).update({ data: { "stats.commentCount": _.inc(1) } });
  await createNotification({
    recipientId: post.authorId,
    type: "comment",
    actorId: openid,
    postId: payload.postId,
    title: "收到一条私密回复",
    description: content
  });
  return ok({ sent: true });
}

async function getNotifications(openid, payload = {}) {
  const where = payload.type
    ? { recipientId: openid, type: payload.type }
    : { recipientId: openid };
  const result = await db.collection(C.notifications)
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const notifications = [];
  for (const item of result.data) {
    const revealed = Boolean(await activeMatch(openid, item.actorId));
    const actor = revealed ? await getUserByOpenId(item.actorId) : null;
    notifications.push({
      ...item,
      actor: actor ? { nickName: actor.nickName, avatarUrl: actor.avatarUrl } : null
    });
  }
  return ok({ notifications });
}

async function markNotificationsRead(openid, payload = {}) {
  const where = payload.type
    ? { recipientId: openid, type: payload.type, read: false }
    : { recipientId: openid, read: false };
  const result = await db.collection(C.notifications).where(where).limit(100).get();
  await Promise.all(result.data.map((item) => (
    db.collection(C.notifications).doc(item._id).update({ data: { read: true } })
  )));
  return ok({ updated: result.data.length });
}

async function getUserProfile(openid, payload = {}) {
  const userId = payload.userId;
  if (!userId) return fail("缺少用户 ID");
  if (userId !== openid) {
    const match = await activeMatch(openid, userId);
    if (!match) return fail("暂时无法查看该主页", "FORBIDDEN");
  }
  const user = await getUserByOpenId(userId);
  if (!user) return fail("用户不存在", "NOT_FOUND");

  const postsResult = await db.collection(C.posts)
    .where({ authorId: userId, status: "visible" })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return ok({
    user: {
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      universityName: user.universityName,
      stats: user.stats
    },
    posts: postsResult.data
  });
}

async function getConversations(openid) {
  const result = await db.collection(C.conversations)
    .where({ members: _.all([openid]), status: "active" })
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();
  const conversations = [];
  for (const item of result.data) {
    const peerId = item.members.find((id) => id !== openid);
    const peer = await getUserByOpenId(peerId);
    conversations.push({
      ...item,
      peerId,
      peer: peer ? { nickName: peer.nickName, avatarUrl: peer.avatarUrl } : { nickName: "同学", avatarUrl: "" },
      unreadCount: item.unreadMap && item.unreadMap[openid] ? item.unreadMap[openid] : 0
    });
  }
  return ok({ conversations });
}

async function sendMessage(openid, payload) {
  const conversation = (await db.collection(C.conversations).doc(payload.conversationId).get()).data;
  if (!conversation || conversation.status !== "active" || !conversation.members.includes(openid)) {
    return fail("无权发送消息", "FORBIDDEN");
  }

  const content = String(payload.content || "").trim().slice(0, 1000);
  if (!content) return fail("消息不能为空");
  const peerId = conversation.members.find((id) => id !== openid);
  await db.collection(C.messages).add({
    data: {
      conversationId: payload.conversationId,
      senderId: openid,
      content,
      readBy: [openid],
      createdAt: now()
    }
  });
  await db.collection(C.conversations).doc(payload.conversationId).update({
    data: {
      lastMessage: { text: content, createdAt: now() },
      [`unreadMap.${peerId}`]: _.inc(1),
      updatedAt: now()
    }
  });
  return ok({ sent: true });
}

async function getMessages(openid, payload) {
  const conversation = (await db.collection(C.conversations).doc(payload.conversationId).get()).data;
  if (!conversation || !conversation.members.includes(openid)) return fail("无权读取消息", "FORBIDDEN");

  const result = await db.collection(C.messages)
    .where({ conversationId: payload.conversationId })
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  const messages = result.data.map((message) => ({
    ...message,
    mine: message.senderId === openid
  }));
  await db.collection(C.conversations).doc(payload.conversationId).update({
    data: { [`unreadMap.${openid}`]: 0 }
  });
  return ok({ messages });
}

async function unmatchUser(openid, payload) {
  const conversation = (await db.collection(C.conversations).doc(payload.conversationId).get()).data;
  if (!conversation || !conversation.members.includes(openid)) return fail("无权解除配对", "FORBIDDEN");
  await db.collection(C.conversations).doc(payload.conversationId).update({
    data: { status: "unmatched", updatedAt: now() }
  });
  if (conversation.matchId) {
    await db.collection(C.matches).doc(conversation.matchId).update({
      data: { status: "unmatched", unmatchedAt: now(), updatedAt: now() }
    });
  }
  return ok({ unmatched: true });
}

async function reportPost(openid, payload) {
  const reason = payload.reason || "not_interested";
  await db.collection(C.reports).add({
    data: {
      postId: payload.postId,
      reporterId: openid,
      reason,
      status: "pending",
      createdAt: now()
    }
  });
  await db.collection(C.actions).add({
    data: {
      userId: openid,
      postId: payload.postId,
      action: reason === "not_interested" ? "not_interested" : "reported",
      createdAt: now()
    }
  });
  return ok({ reported: true });
}

async function markPostAction(openid, payload) {
  const action = payload.action || "swiped";
  if (!payload.postId) return fail("缺少帖子 ID");

  const duplicate = await db.collection(C.actions).where({
    userId: openid,
    postId: payload.postId,
    action
  }).limit(1).get();
  if (duplicate.data.length) return ok({ marked: true, duplicate: true });

  await db.collection(C.actions).add({
    data: {
      userId: openid,
      postId: payload.postId,
      action,
      createdAt: now()
    }
  });
  return ok({ marked: true });
}

async function getMyPosts(openid) {
  const result = await db.collection(C.posts)
    .where({ authorId: openid })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return ok({ posts: result.data });
}

async function getPostDetail(openid, payload) {
  const post = (await db.collection(C.posts).doc(payload.postId).get()).data;
  if (!post) return fail("帖子不存在", "NOT_FOUND");
  if (post.authorId !== openid) {
    const match = await activeMatch(openid, post.authorId);
    if (!match) return fail("无权查看评论明细", "FORBIDDEN");
  }
  const comments = await db.collection(C.comments)
    .where({ postId: payload.postId })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const enrichedComments = [];
  for (const comment of comments.data) {
    const fromUser = await getUserByOpenId(comment.fromUserId);
    enrichedComments.push({
      ...comment,
      fromUser: fromUser ? {
        nickName: fromUser.nickName,
        avatarUrl: fromUser.avatarUrl
      } : { nickName: "好友", avatarUrl: "" }
    });
  }
  return ok({ post, comments: enrichedComments });
}

async function getPostLikers(openid, payload) {
  const post = (await db.collection(C.posts).doc(payload.postId).get()).data;
  if (!post) return fail("帖子不存在", "NOT_FOUND");
  if (post.authorId !== openid) return fail("无权查看", "FORBIDDEN");

  const likesResult = await db.collection(C.likes)
    .where({ postId: payload.postId })
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const likers = [];
  for (const like of likesResult.data) {
    const user = await getUserByOpenId(like.fromUserId);
    const friendIds = await getFriendIds(openid);
    const isFriend = friendIds.includes(like.fromUserId);
    likers.push({
      _id: like._id,
      postId: like.postId,
      fromUser: {
        _id: user ? user._id : "",
        nickName: isFriend && user ? (user.nickName || "") : "",
        avatarUrl: isFriend && user ? (user.avatarUrl || "") : "",
        isFriend: isFriend
      },
      createdAt: like.createdAt
    });
  }
  return ok({ likers });
}

async function getUniversities() {
  const result = await db.collection(C.universities).limit(200).get();
  return ok(result.data);
}

const handlers = {
  loginAndSyncProfile,
  updateProfile,
  getDiscoverFeed,
  createPost,
  likePost,
  sendPrivateReply,
  getNotifications,
  markNotificationsRead,
  getUserProfile,
  getConversations,
  sendMessage,
  getMessages,
  unmatchUser,
  reportPost,
  markPostAction,
  getMyPosts,
  getPostDetail,
  getPostLikers,
  getUniversities
};

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};
  if (!OPENID) return fail("缺少微信登录态", "UNAUTHORIZED");
  if (!handlers[action]) return fail(`未知接口: ${action}`, "NOT_FOUND");

  try {
    return await handlers[action](OPENID, payload);
  } catch (error) {
    console.error(action, error);
    return fail(error.message || "服务异常", "INTERNAL_ERROR");
  }
};
