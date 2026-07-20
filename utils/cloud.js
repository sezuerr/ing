const mock = require("./mock");

function canUseCloud() {
  // 注意：onLaunch 执行期间 App 实例尚未注册完成，getApp() 会返回 undefined。
  // 此时 wx.cloud.init 已在 onLaunch 里先行执行，故 app 缺失时以 wx.cloud 是否可用兜底。
  const app = getApp();
  if (!app || !app.globalData) return Boolean(wx.cloud);
  return Boolean(wx.cloud && app.globalData.cloudReady);
}

function markFallback(data) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    data.__fromFallback = true;
  }
  return data;
}

function normalizeResult(result, fallback) {
  if (!result || !result.result) return markFallback(fallback);
  if (result.result.ok === false) {
    const err = new Error(result.result.message || "云函数调用失败");
    err.code = result.result.code;
    err.isBusinessError = true;
    throw err;
  }
  return result.result.data === undefined ? result.result : result.result.data;
}

let firstCloudFailLogged = {};
async function callApi(action, data = {}, fallback) {
  if (!canUseCloud()) {
    console.warn(`[cloud:${action}] 云能力不可用，使用本地兜底数据`);
    return markFallback(fallback);
  }

  let result;
  try {
    result = await wx.cloud.callFunction({
      name: "api",
      data: { action, payload: data }
    });
  } catch (error) {
    if (!firstCloudFailLogged[action]) {
      firstCloudFailLogged[action] = true;
      console.error(`[cloud:${action}] 云函数调用失败，已降级到本地数据。请检查：环境 ID 是否正确、api 云函数是否已上传部署。`, error);
    }
    return markFallback(fallback);
  }

  return normalizeResult(result, fallback);
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
  return callApi("likePost", { postId }, { matched: false, likedByMe: true });
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
  var msgs = (mock.messages || []).filter(function(m) { return m.conversationId === payload.conversationId; });
  return callApi("getMessages", payload, { messages: msgs });
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
  const comments = mock.comments ? mock.comments.filter((c) => c.postId === postId) : [];
  return callApi("getPostDetail", { postId }, { post, comments });
}

function getUniversities() {
  const { UNIVERSITIES } = require("./constants");
  return callApi("getUniversities", {}, UNIVERSITIES);
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
  getPostDetail,
  getUniversities
};
