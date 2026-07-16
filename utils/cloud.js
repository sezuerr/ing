const mock = require("./mock");

function canUseCloud() {
  const app = getApp();
  return Boolean(wx.cloud && app.globalData.cloudReady);
}

function normalizeResult(result, fallback) {
  if (!result || !result.result) return fallback;
  if (result.result.ok === false) {
    throw new Error(result.result.message || "云函数调用失败");
  }
  return result.result.data === undefined ? result.result : result.result.data;
}

async function callApi(action, data = {}, fallback) {
  if (!canUseCloud()) return fallback;

  try {
    const result = await wx.cloud.callFunction({
      name: "api",
      data: { action, payload: data }
    });
    return normalizeResult(result, fallback);
  } catch (error) {
    console.warn(`[cloud:${action}] fallback`, error);
    return fallback;
  }
}

function loginAndSyncProfile(profile = {}) {
  return callApi("loginAndSyncProfile", profile, mock.currentUser);
}

function updateProfile(profile) {
  return callApi("updateProfile", profile, { ...mock.currentUser, ...profile });
}

function getDiscoverFeed(params) {
  return callApi("getDiscoverFeed", params, { posts: mock.posts, dailyTopic: mock.dailyTopic });
}

function createPost(post) {
  return callApi("createPost", post, { _id: `local_${Date.now()}`, ...post });
}

function likePost(postId) {
  return callApi("likePost", { postId }, { matched: false });
}

function sendPrivateReply(payload) {
  return callApi("sendPrivateReply", payload, { sent: true });
}

function reportPost(payload) {
  return callApi("reportPost", payload, { reported: true });
}

function markPostAction(payload) {
  return callApi("markPostAction", payload, { marked: true });
}

function getNotifications(payload = {}) {
  const list = payload.type
    ? mock.notifications.filter((item) => item.type === payload.type)
    : mock.notifications;
  return callApi("getNotifications", payload, { notifications: list });
}

function markNotificationsRead(payload) {
  return callApi("markNotificationsRead", payload, { updated: 0 });
}

function getUserProfile(payload) {
  const posts = mock.posts.concat(mock.myPosts).filter((item) => item.authorId === payload.userId);
  const fallbackUser = payload.userId === mock.currentUser.openid
    ? mock.currentUser
    : { nickName: "同学", avatarUrl: "", bio: "", universityName: "", stats: { likeCount: 0, commentCount: 0 } };
  return callApi("getUserProfile", payload, { user: fallbackUser, posts });
}

function getConversations() {
  return callApi("getConversations", {}, { conversations: mock.conversations });
}

function sendMessage(payload) {
  return callApi("sendMessage", payload, { sent: true });
}

function getMessages(payload) {
  return callApi("getMessages", payload, { messages: [] });
}

function unmatchUser(payload) {
  return callApi("unmatchUser", payload, { unmatched: true });
}

function getMyPosts() {
  return callApi("getMyPosts", {}, { posts: mock.myPosts });
}

function getPostDetail(postId) {
  const allPosts = mock.posts.concat(mock.myPosts);
  const post = allPosts.find((item) => item._id === postId) || allPosts[0];
  return callApi("getPostDetail", { postId }, { post, comments: [] });
}

module.exports = {
  loginAndSyncProfile,
  updateProfile,
  getDiscoverFeed,
  createPost,
  likePost,
  sendPrivateReply,
  reportPost,
  markPostAction,
  getNotifications,
  markNotificationsRead,
  getUserProfile,
  getConversations,
  getMessages,
  sendMessage,
  unmatchUser,
  getMyPosts,
  getPostDetail
};
