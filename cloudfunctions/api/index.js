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

// 递归将响应数据中的 cloud:// 文件 ID 批量转为临时 HTTPS 链接。
// 云函数有管理员权限，不受存储安全规则限制。
async function resolveFileUrlsInData(data) {
  if (!data) return;

  const urls = new Set();
  (function collect(obj) {
    if (!obj) return;
    // 数组元素可能是原始字符串，不能靠 typeof obj !== "object" 跳过
    if (typeof obj === "string") {
      if (obj.startsWith("cloud://")) urls.add(obj);
      return;
    }
    if (typeof obj !== "object") return;
    if (Array.isArray(obj)) { obj.forEach(collect); return; }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string" && val.startsWith("cloud://")) urls.add(val);
      else if (val && typeof val === "object") collect(val);
    }
  })(data);

  if (!urls.size) return;

  const fileIDs = [...urls];
  const batches = [];
  for (let i = 0; i < fileIDs.length; i += 50) batches.push(fileIDs.slice(i, i + 50));

  const results = await Promise.all(batches.map(b => cloud.getTempFileURL({ fileList: b })));
  const map = {};
  for (const r of results) {
    for (const f of (r.fileList || [])) {
      if (f.tempFileURL) map[f.fileID] = f.tempFileURL;
    }
  }

  (function replace(obj) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === "string" && map[obj[i]]) obj[i] = map[obj[i]];
        else if (obj[i] && typeof obj[i] === "object") replace(obj[i]);
      }
      return;
    }
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string" && map[val]) obj[key] = map[val];
      else if (val && typeof val === "object") replace(val);
    }
  })(data);
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

  // 先收集所有候选帖子的作者 ID，批量查询"我是否点赞过他们"
  const candidatePosts = postsResult.data.filter(post => {
    if (post.authorId === openid) return false;
    if (excludedIds.includes(post._id)) return false;
    if (!canSeePost(post, user, friendIds)) return false;
    if (!applyScope(post, user, scope, friendIds)) return false;
    if (payload.topicOnly && !post.dailyTopicId) return false;
    return true;
  });
  const authorIds = [...new Set(candidatePosts.map(p => p.authorId))];

  // 批量查：我点赞过哪些作者（likedByMe）
  const myLikes = authorIds.length > 0
    ? (await db.collection(C.likes).where({
        fromUserId: openid,
        toUserId: _.in(authorIds)
      }).limit(200).get()).data
    : [];
  const likedAuthorIds = new Set(myLikes.map(l => l.toUserId));

  // 批量查：哪些作者点赞过我（likedMe）
  const likesToMe = authorIds.length > 0
    ? (await db.collection(C.likes).where({
        fromUserId: _.in(authorIds),
        toUserId: openid
      }).limit(200).get()).data
    : [];
  const likedMeAuthorIds = new Set(likesToMe.map(l => l.fromUserId));

  // 批量查：所有候选帖子的评论（每个帖子最多取 3 条）
  const postIds = candidatePosts.map(p => p._id);
  const commentsResult = postIds.length > 0
    ? (await db.collection(C.comments).where({
        postId: _.in(postIds)
      }).orderBy("createdAt", "desc").limit(200).get()).data
    : [];
  const commentsByPost = {};
  for (const c of commentsResult) {
    if (!commentsByPost[c.postId]) commentsByPost[c.postId] = [];
    if (commentsByPost[c.postId].length < 3) {
      commentsByPost[c.postId].push(c);
    }
  }

  const enriched = [];
  for (const post of candidatePosts) {
    const author = await getUserByOpenId(post.authorId);
    const isFriend = friendIds.includes(post.authorId);
    const likedMe = likedMeAuthorIds.has(post.authorId);
    const likedByMe = likedAuthorIds.has(post.authorId);
    const postComments = (commentsByPost[post._id] || []).slice(0, 3);

    // 评论者信息脱敏：仅好友（已配对）可见真实信息
    const visibleComments = [];
    for (const c of postComments) {
      const commenterIsMe = c.fromUserId === openid;
      const commenterIsFriend = friendIds.includes(c.fromUserId);
      const shouldReveal = commenterIsMe || commenterIsFriend || c.fromUserId === post.authorId;
      const commenter = shouldReveal ? await getUserByOpenId(c.fromUserId) : null;
      visibleComments.push({
        _id: c._id,
        content: c.content,
        createdAt: c.createdAt,
        isAuthor: c.fromUserId === post.authorId,
        fromUser: shouldReveal && commenter ? {
          nickName: commenter.nickName,
          avatarUrl: commenter.avatarUrl
        } : null
      });
    }

    enriched.push({
      ...post,
      author: isFriend && author ? {
        nickName: author.nickName,
        avatarUrl: author.avatarUrl,
        isFriend: true
      } : { isFriend: false },
      mutualFriendCount: isFriend ? 1 : 0,
      likedMe,
      likedByMe,
      matched: isFriend,
      comments: visibleComments,
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
  const sliced = enriched.slice(0, 30);
  await resolveFileUrlsInData(sliced);
  return ok({
    posts: sliced,
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
  if (post.status !== "visible") return fail("帖子已失效", "NOT_FOUND");

  // 检查是否已点赞该帖子（幂等保护）
  const duplicate = await db.collection(C.likes).where({ postId, fromUserId: openid }).limit(1).get();
  if (duplicate.data.length) {
    // 虽是重复请求，但仍检查是否已有配对，返回正确状态给前端
    const existingMatch = await activeMatch(openid, post.authorId);
    if (existingMatch) {
      const conv = await db.collection(C.conversations).where({ matchId: existingMatch._id }).limit(1).get();
      return ok({ matched: true, duplicate: true, matchId: existingMatch._id, conversationId: conv.data[0] ? conv.data[0]._id : null });
    }
    return ok({ matched: false, duplicate: true });
  }

  // 1. 写入点赞记录
  await db.collection(C.likes).add({
    data: {
      postId,
      fromUserId: openid,
      toUserId: post.authorId,
      createdAt: now()
    }
  });

  // 2. 更新帖子与用户计数（允许部分失败，不影响核心流程）
  try {
    await db.collection(C.posts).doc(postId).update({ data: { likeCount: _.inc(1) } });
    await db.collection(C.users).where({ openid: post.authorId }).update({ data: { "stats.likeCount": _.inc(1) } });
  } catch (e) {
    console.warn("更新计数失败（非关键）", e);
  }

  // 3. 通知帖子作者
  try {
    await createNotification({
      recipientId: post.authorId,
      type: "like",
      actorId: openid,
      postId,
      title: "收到一个点亮",
      description: `有人点亮了你的帖子「${(post.body || "无内容").slice(0, 20)}」。`
    });
  } catch (e) {
    console.warn("创建点赞通知失败（非关键）", e);
  }

  // 4. 检查是否互亮（对方是否已点亮过我）
  const reciprocal = await db.collection(C.likes).where({
    fromUserId: post.authorId,
    toUserId: openid
  }).limit(1).get();

  if (!reciprocal.data.length) {
    return ok({ matched: false });
  }

  // 5. 互亮 → 创建或恢复配对
  const match = await createOrGetMatch(openid, post.authorId);

  // 6. 查找对应的会话 ID
  const convResult = await db.collection(C.conversations).where({ matchId: match._id }).limit(1).get();
  const conversationId = convResult.data[0] ? convResult.data[0]._id : null;

  // 7. 通知双方配对成功
  try {
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
  } catch (e) {
    console.warn("创建配对通知失败（非关键）", e);
  }

  return ok({ matched: true, matchId: match._id, conversationId });
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
  await resolveFileUrlsInData(notifications);
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

  const result = {
    user: {
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      universityName: user.universityName,
      stats: user.stats
    },
    posts: postsResult.data
  };
  await resolveFileUrlsInData(result);
  return ok(result);
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
  await resolveFileUrlsInData(conversations);
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
    .where({ authorId: openid, status: "visible" })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  const posts = result.data;
  await resolveFileUrlsInData(posts);
  return ok({ posts });
}

async function getPostDetail(openid, payload) {
  const post = (await db.collection(C.posts).doc(payload.postId).get()).data;
  if (!post) return fail("帖子不存在", "NOT_FOUND");

  // 自己的帖子：直接返回
  if (post.authorId === openid) {
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
    await resolveFileUrlsInData(post);
    await resolveFileUrlsInData(enrichedComments);
    return ok({ post, comments: enrichedComments });
  }

  // 别人的帖子：需配对才能查看
  const match = await activeMatch(openid, post.authorId);
  if (!match) return fail("无权查看评论明细", "FORBIDDEN");

  // 补齐匹配状态，保证 post-card 组件渲染与发现页一致
  const author = await getUserByOpenId(post.authorId);
  const likedMe = await db.collection(C.likes).where({
    fromUserId: post.authorId,
    toUserId: openid
  }).limit(1).get();
  const likedByMe = await db.collection(C.likes).where({
    fromUserId: openid,
    toUserId: post.authorId
  }).limit(1).get();

  // 查询评论
  const comments = await db.collection(C.comments)
    .where({ postId: payload.postId })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  // 收集所有评论者 ID
  const commenterIds = [...new Set(comments.data.map(c => c.fromUserId))];
  const friendIdSet = new Set(await getFriendIds(openid));

  // 格式化评论（与 getDiscoverFeed 一致）
  const visibleComments = [];
  for (const c of comments.data) {
    const commenterIsMe = c.fromUserId === openid;
    const commenterIsFriend = friendIdSet.has(c.fromUserId) || c.fromUserId === post.authorId;
    const shouldReveal = commenterIsMe || commenterIsFriend;
    const commenter = shouldReveal ? await getUserByOpenId(c.fromUserId) : null;
    visibleComments.push({
      _id: c._id,
      content: c.content,
      createdAt: c.createdAt,
      isAuthor: c.fromUserId === post.authorId,
      fromUser: shouldReveal && commenter ? {
        nickName: commenter.nickName,
        avatarUrl: commenter.avatarUrl
      } : null
    });
  }

  const enrichedPost = {
    ...post,
    author: {
      nickName: author ? author.nickName : "好友",
      avatarUrl: author ? author.avatarUrl : "",
      isFriend: true
    },
    mutualFriendCount: 1,
    likedMe: Boolean(likedMe.data.length),
    likedByMe: Boolean(likedByMe.data.length),
    matched: true,
    comments: visibleComments
  };

  await resolveFileUrlsInData(enrichedPost);
  return ok({ post: enrichedPost, comments: visibleComments });
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
        _id: like.fromUserId,
        nickName: isFriend && user ? (user.nickName || "") : "",
        avatarUrl: isFriend && user ? (user.avatarUrl || "") : "",
        isFriend: isFriend
      },
      createdAt: like.createdAt
    });
  }
  await resolveFileUrlsInData(likers);
  return ok({ likers });
}

async function deletePost(openid, payload) {
  const postId = payload.postId;
  console.log("[deletePost] 收到删除请求 openid:", openid, "postId:", postId);
  if (!postId) return fail("缺少帖子 ID");

  const postResult = await db.collection(C.posts).doc(postId).get();
  const post = postResult.data;
  console.log("[deletePost] 查到的帖子:", post ? { _id: post._id, authorId: post.authorId, status: post.status } : null);
  if (!post) return fail("帖子不存在", "NOT_FOUND");
  if (post.authorId !== openid) return fail("无权删除", "FORBIDDEN");

  // 尝试两种方式确保删除生效
  try {
    // 方式 1：软删除 — 标记 status 为 deleted
    const updateResult = await db.collection(C.posts).doc(postId).update({
      data: { status: "deleted", updatedAt: now() }
    });
    console.log("[deletePost] update 结果:", JSON.stringify(updateResult));

    // 立即回查确认状态已改
    const verify = await db.collection(C.posts).doc(postId).get();
    console.log("[deletePost] 回查状态:", verify.data ? verify.data.status : "未找到");
  } catch (e) {
    console.error("[deletePost] 删除异常:", e);
    return fail("删除失败: " + (e.message || "未知错误"), "INTERNAL_ERROR");
  }

  return ok({ deleted: true });
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
  deletePost,
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
