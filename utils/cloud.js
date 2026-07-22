const mock = require("./mock");

function canUseCloud() {
  // 注意：onLaunch 执行期间 App 实例尚未注册完成，getApp() 会返回 undefined。
  // 此时 wx.cloud.init 已在 onLaunch 里先行执行，故 app 缺失时以 wx.cloud 是否可用兜底。
  const app = getApp();
  if (!app || !app.globalData) return Boolean(wx.cloud);
  return Boolean(wx.cloud && app.globalData.cloudReady);
}

function normalizeResult(result, fallback) {
  if (!result || !result.result) return fallback;
  if (result.result.ok === false) {
    const err = new Error(result.result.message || "云函数调用失败");
    err.code = result.result.code;
    err.isBusinessError = true;
    throw err;
  }
  return result.result.data === undefined ? result.result : result.result.data;
}

async function callApi(action, data = {}, fallback) {
  if (!canUseCloud()) {
    console.warn(`[cloud:${action}] 云能力不可用，使用本地兜底数据`);
    return fallback;
  }

  let result;
  try {
    result = await wx.cloud.callFunction({
      name: "api",
      data: { action, payload: data }
    });
  } catch (error) {
    // 调用本身失败：环境 ID 错误、云函数未部署、网络异常等。降级到 mock。
    console.error(`[cloud:${action}] 云函数调用失败，已降级到本地数据。请检查：环境 ID 是否正确、api 云函数是否已上传部署。`, error);
    return fallback;
  }

  // 调用成功但返回业务错误（如未登录、权限不足）：抛出，让页面感知，不静默吞掉。
  return normalizeResult(result, fallback);
}

// 写操作专用：网络错误时不降级，直接抛出，让页面提示用户重试
async function callApiWrite(action, data = {}) {
  if (!canUseCloud()) {
    const err = new Error("云能力不可用");
    err.code = "CLOUD_UNAVAILABLE";
    throw err;
  }

  const result = await wx.cloud.callFunction({
    name: "api",
    data: { action, payload: data }
  });
  return normalizeResult(result, null);
}

function loginAndSyncProfile(profile = {}) {
  return callApi("loginAndSyncProfile", profile, mock.currentUser);
}

function updateProfile(profile) {
  return callApi("updateProfile", profile, { ...mock.currentUser, ...profile });
}

function getDiscoverFeed(params) {
  const fallbackPosts = function() {
    var posts = mock.posts.concat([]);
    var scope = params.scope || "university";
    var user = mock.currentUser;

    if (scope === "university") {
      posts = posts.filter(function(p) { return p.universityId && p.universityId === user.universityId; });
    } else if (scope === "city") {
      posts = posts.filter(function(p) { return p.cityCode && p.cityCode === user.cityCode && p.universityId !== user.universityId; });
    }

    if (params.topicIcon) {
      var selectedIcons = params.topicIcon.split(",");
      posts = posts.filter(function(p) { return selectedIcons.indexOf(p.icon) !== -1; });
    }

    return { posts: posts, dailyTopic: mock.dailyTopic };
  };

  return callApi("getDiscoverFeed", params, fallbackPosts());
}

// --- 新增：内容安全审核 START ---
function checkContentSafety(payload) {
  return callApiWrite("checkContentSafety", payload);
}
// --- 新增：内容安全审核 END ---

function createPost(post) {
  return callApi("createPost", post, { _id: `local_${Date.now()}`, ...post });
}

function likePost(postId) {
  return callApiWrite("likePost", { postId });
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
  // 不使用 mock 帖子兜底：避免删帖后云端异常时返回旧数据，给用户造成困惑
  return callApi("getUserProfile", payload, { user: null, posts: [] });
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
  return callApi("getMyPosts", {}, { posts: [] });
}

function getPostDetail(postId) {
  const allPosts = mock.posts.concat(mock.myPosts);
  const post = allPosts.find((item) => item._id === postId) || allPosts[0];
  const comments = mock.comments ? mock.comments.filter((c) => c.postId === postId) : [];
  return callApi("getPostDetail", { postId }, { post, comments });
}

function getPostLikers(postId) {
  const likers = (mock.postLikers || []).filter((item) => item.postId === postId);
  return callApi("getPostLikers", { postId }, { likers });
}

function deletePost(postId) {
  console.log("[deletePost] 开始删除帖子:", postId);
  return callApiWrite("deletePost", { postId }).then(function(result) {
    console.log("[deletePost] 云端返回:", JSON.stringify(result));
    return result;
  }).catch(function(err) {
    console.error("[deletePost] 删除失败:", err);
    throw err;
  });
}

function getUniversities() {
  const { UNIVERSITIES } = require("./constants");
  return callApi("getUniversities", {}, UNIVERSITIES);
}

async function resolveImageUrls(urls) {
  if (!urls || !urls.length) return urls || [];
  if (!wx.cloud) return urls;
  const fileIDs = urls.filter(function(u) { return u && typeof u === "string" && u.startsWith("cloud://"); });
  if (!fileIDs.length) return urls;
  try {
    const result = await wx.cloud.getTempFileURL({ fileList: fileIDs });
    var map = {};
    (result.fileList || []).forEach(function(f) {
      if (f.tempFileURL) map[f.fileID] = f.tempFileURL;
    });
    return urls.map(function(u) { return map[u] || u; });
  } catch (e) {
    console.warn("转换云存储图片链接失败", e);
    return urls;
  }
}

module.exports = {
  loginAndSyncProfile,
  updateProfile,
  getDiscoverFeed,
  checkContentSafety,
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
  getPostLikers,
  deletePost,
  getUniversities,
  resolveImageUrls
};
