# API Contracts: Unified `api` Cloud Function

**Created**: 2026-07-20 | **Plan**: [../plan.md](../plan.md)

All client-server communication routes through a single cloud function `api`, invoked via `wx.cloud.callFunction({ name: "api", data: { action, payload } })`. The dispatcher in `cloudfunctions/api/index.js` routes `action` to the corresponding handler.

## Common Contract

### Request Envelope

```json
{
  "action": "<route-name>",
  "payload": { ... }
}
```

The `openId` is extracted server-side from `cloud.getWXContext().OPENID` — the client never sends it.

### Response Envelope

**Success** (`ok: true`):
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error** (`ok: false`):
```json
{
  "ok": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message (Chinese)"
}
```

**Error Codes**:

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing WeChat login context |
| `BAD_REQUEST` | Invalid or missing required fields |
| `NOT_FOUND` | Requested resource doesn't exist |
| `FORBIDDEN` | User lacks permission (not matched, not post author, etc.) |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Routes

### `loginAndSyncProfile`

First call on app launch. Creates user if new, returns profile.

**Payload**: `{ avatarUrl?, nickName?, gender?, universityId?, universityName?, cityCode?, geoHash? }`

**Success Response**:
```json
{
  "ok": true,
  "data": {
    "_id": "doc_id",
    "openid": "xxx",
    "alias": "同学#4821",
    "nickName": "小黄灯",
    "avatarUrl": "",
    "universityName": "中国人民大学",
    "cityCode": "beijing",
    "stats": { "likeCount": 0, "commentCount": 0 },
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

**Contract Test Cases**:
- [ ] New user (first login) → creates user doc, returns profile with auto-generated alias
- [ ] Returning user → returns existing profile
- [ ] Missing WeChat context → `UNAUTHORIZED`

---

### `getDiscoverFeed`

Fetches paginated anonymous posts for the Discover feed.

**Payload**: `{ scope?: "city" | "university" | "friends", topicOnly?: boolean, cursor?: ISO-date-string }`

**Success Response**:
```json
{
  "ok": true,
  "data": {
    "posts": [
      {
        "_id": "post_id",
        "title": "...",
        "body": "...",
        "icon": "💡",
        "tags": ["学习", "求助"],
        "likeCount": 3,
        "commentCount": 1,
        "author": {
          "alias": "同学#1234",
          "isFriend": false
        },
        "likedMe": false,
        "distanceText": "距你10公里内",
        "createdAt": "date"
      }
    ],
    "dailyTopic": { "title": "...", "description": "...", "icon": "📚" } | null,
    "hasMore": true,
    "nextCursor": "ISO-date-string"
  }
}
```

**Privacy Enforcements**:
- `author` object MUST NOT contain `openid`, real `nickName`, or `avatarUrl` unless `isFriend: true` (mutual match exists)
- `author.isFriend` is `true` ONLY when a mutual match exists between the viewer and the post author
- Feed excludes: own posts, already-swiped posts, reported posts, not-interested posts

**Contract Test Cases**:
- [ ] Feed returns ≤20 posts ordered by affinity + recency
- [ ] City scope filters by `cityCode`
- [ ] University scope filters by `universityId`
- [ ] Author identity is anonymous (`alias` only) for non-friends
- [ ] Author identity is revealed (`nickName`, `avatarUrl`) for matched friends
- [ ] Posts the user has swiped/reported are excluded
- [ ] Empty feed returns `{ posts: [], dailyTopic: null }`
- [ ] `cursor` parameter returns next page from that point
- [ ] `topicOnly: true` filters to daily-topic posts only

---

### `createPost`

Creates a new anonymous post.

**Payload**: `{ title: string, body: string, icon: string, visibility: string, universityId?: string, cityCode?: string }`

**Success Response**:
```json
{
  "ok": true,
  "data": {
    "_id": "post_id",
    "title": "...",
    "body": "...",
    "icon": "💡",
    "visibility": "public",
    "likeCount": 0,
    "commentCount": 0,
    "status": "visible",
    "reviewStatus": "pending",
    "createdAt": "date"
  }
}
```

**Validation**:
- `title`: required, 1-40 chars
- `body`: required, 1-500 chars [GAP: currently 800]
- `icon`: must be from allowed set
- `visibility`: must be one of "public" | "university" | "friends" | "self"
- Content passes profanity keyword filter

**Error Responses**:
- `BAD_REQUEST`: "标题和正文不能为空", "内容包含不当词汇" (profanity filter)

**Contract Test Cases**:
- [ ] Valid post → created, returns post with server-assigned fields
- [ ] Empty title → `BAD_REQUEST`
- [ ] Empty body → `BAD_REQUEST`
- [ ] Body > 500 chars → `BAD_REQUEST` or truncated
- [ ] Profanity in body → `BAD_REQUEST` with profanity message [GAP: not yet implemented]
- [ ] Self-only visibility → post created, only visible to author
- [ ] Post appears in author's `getMyPosts`, `getDiscoverFeed` for other users

---

### `likePost`

Toggles a "点亮" (like) on a post. Irrevocable. Triggers match detection if reciprocal.

**Payload**: `{ postId: string }`

**Success Response (no match)**:
```json
{
  "ok": true,
  "data": { "matched": false, "duplicate": false }
}
```

**Success Response (duplicate like)**:
```json
{
  "ok": true,
  "data": { "matched": false, "duplicate": true }
}
```

**Success Response (match!)**:
```json
{
  "ok": true,
  "data": { "matched": true }
}
```

**Side Effects**:
1. Inserts `likes` document
2. Increments `posts.likeCount`
3. Increments `users[author].stats.likeCount`
4. Creates `notifications` document for post author (type: "like")
5. Checks for reciprocal like → if found: creates match, creates conversation, sends match notifications to both users

**Error Responses**:
- `BAD_REQUEST`: "不能点亮自己的帖子" (self-like)

**Contract Test Cases**:
- [ ] First like on a post → `matched: false`, like count +1
- [ ] Duplicate like on same post → `duplicate: true`, no change to counts
- [ ] Self-like → `BAD_REQUEST`
- [ ] Like triggers reciprocal match → `matched: true`, match + conversation created, both users notified
- [ ] Match creation is idempotent → second reciprocal like doesn't create duplicate match/conversation
- [ ] Like on non-existent post → `NOT_FOUND`
- [ ] Like count is atomically incremented (concurrent likes don't lose counts)

---

### `getMyPosts`

Returns all posts created by the current user.

**Payload**: `{}` (no params needed — user identified by openId)

**Success Response**:
```json
{
  "ok": true,
  "data": {
    "posts": [
      {
        "_id": "post_id",
        "title": "...",
        "body": "...",
        "icon": "💡",
        "visibility": "public",
        "likeCount": 3,
        "commentCount": 1,
        "status": "visible",
        "createdAt": "date"
      }
    ]
  }
}
```

**Contract Test Cases**:
- [ ] Returns posts authored by current user, newest first
- [ ] Empty list for new user → `{ posts: [] }`
- [ ] Only returns the user's own posts (not other users')

---

### `getConversations`

Returns all active conversations for the current user.

**Payload**: `{}`

**Success Response**:
```json
{
  "ok": true,
  "data": {
    "conversations": [
      {
        "_id": "conv_id",
        "matchId": "match_id",
        "peerId": "peer_openid",
        "peer": {
          "alias": "同学#5678",
          "avatarUrl": ""
        },
        "lastMessage": { "text": "你好", "createdAt": "date" },
        "unreadCount": 2,
        "updatedAt": "date"
      }
    ]
  }
}
```

**Privacy Enforcements**:
- `peer` object MUST only contain `alias` (not `nickName`) for non-friend users
- `peerId` is the other user's `openid` — safe to expose since it's just an opaque string the client uses for routing

**Contract Test Cases**:
- [ ] Returns conversations ordered by `updatedAt` desc
- [ ] Empty list for user with no matches → `{ conversations: [] }`
- [ ] Peer identity shows alias
- [ ] `unreadCount` reflects messages not yet read by current user
- [ ] Only returns conversations where current user is a member

---

### `getMessages`

Fetches messages for a conversation. Supports incremental polling.

**Payload**: `{ conversationId: string, since?: ISO-date-string }`

**Success Response**:
```json
{
  "ok": true,
  "data": {
    "messages": [
      {
        "_id": "msg_id",
        "senderId": "openid",
        "content": "你好！",
        "mine": true,
        "createdAt": "date"
      }
    ],
    "hasMore": true
  }
}
```

**Side Effects**:
- Resets `conversations.unreadMap[currentUser]` to 0

**Contract Test Cases**:
- [ ] Returns ≤50 messages, oldest first
- [ ] `mine: true` for messages sent by current user
- [ ] `since` parameter returns only newer messages
- [ ] Unread count is cleared after fetch
- [ ] Non-member access → `FORBIDDEN`
- [ ] Pagination: cursor-based for older messages
- [ ] Empty conversation → `{ messages: [] }`

---

### `sendMessage`

Sends a message in a matched conversation.

**Payload**: `{ conversationId: string, content: string }`

**Success Response**:
```json
{
  "ok": true,
  "data": { "sent": true }
}
```

**Side Effects**:
1. Inserts `messages` document
2. Updates `conversations.lastMessage`
3. Increments `conversations.unreadMap[peerId]`

**Validation**:
- `content`: 1-1000 chars, trimmed
- Sender must be a conversation member
- Conversation must be `status: "active"`

**Error Responses**:
- `FORBIDDEN`: "无权发送消息" (not a member or conversation unmatched)
- `BAD_REQUEST`: "消息不能为空"

**Contract Test Cases**:
- [ ] Valid message → sent, appears in `getMessages` for both users
- [ ] Empty content → `BAD_REQUEST`
- [ ] Non-member → `FORBIDDEN`
- [ ] Unmatched conversation → `FORBIDDEN`
- [ ] Peer's unread count incremented
- [ ] Sender's unread count unchanged

---

### `getNotifications`

Fetches notifications for the current user.

**Payload**: `{ type?: "like" | "match" | "comment" }`

**Success Response**:
```json
{
  "ok": true,
  "data": {
    "notifications": [
      {
        "_id": "notif_id",
        "type": "match",
        "actor": { "alias": "同学#1234" } | null,
        "title": "配对成功",
        "description": "你们互相点亮了，可以开始聊天。",
        "read": false,
        "createdAt": "date"
      }
    ]
  }
}
```

**Privacy Enforcements**:
- `actor` is `null` unless an active match exists between recipient and actor (identity revealed only post-match)
- When `actor` is non-null, it contains `alias` (and optionally `avatarUrl` for matched users)

**Contract Test Cases**:
- [ ] Returns notifications for current user, newest first
- [ ] Actor identity hidden when no match exists
- [ ] Actor identity revealed when match is active
- [ ] `type` filter returns only matching types
- [ ] `markNotificationsRead` sets `read: true` on unread notifications

---

### `unmatchUser`

Ends a match and archives the conversation (Slice 5+).

**Payload**: `{ conversationId: string }`

**Success Response**: `{ "ok": true, "data": { "unmatched": true } }`

**Contract Test Cases**:
- [ ] Valid unmatch → conversation and match set to `status: "unmatched"`
- [ ] Non-member → `FORBIDDEN`
- [ ] Already unmatched → graceful (no-op or re-affirm)

---

### `markPostAction`

Records a user action on a post (swipe, not-interested, report).

**Payload**: `{ postId: string, action: "swiped" | "not_interested" | "reported" }`

**Success Response**: `{ "ok": true, "data": { "marked": true } }`

**Contract Test Cases**:
- [ ] Action recorded → post excluded from future feed
- [ ] Duplicate action → `duplicate: true`, no duplicate row

---

## Client-Side Wrapper (`utils/cloud.js`)

All client code calls through these wrapper functions, never directly invoking `wx.cloud.callFunction`:

| Wrapper Function | Cloud Action | Fallback Behavior |
|-----------------|-------------|-------------------|
| `loginAndSyncProfile(profile)` | `loginAndSyncProfile` | Returns `mock.currentUser` |
| `getDiscoverFeed(params)` | `getDiscoverFeed` | Returns `{ posts: mock.posts }` |
| `createPost(post)` | `createPost` | Returns local doc with `_id: local_${Date.now()}` |
| `likePost(postId)` | `likePost` | Returns `{ matched: false }` |
| `getMyPosts()` | `getMyPosts` | Returns `mock.myPosts` |
| `getConversations()` | `getConversations` | Returns `mock.conversations` |
| `getMessages(params)` | `getMessages` | Filters `mock.messages` by conversationId |
| `sendMessage(params)` | `sendMessage` | Returns `{ sent: true }` |
| `getNotifications(params)` | `getNotifications` | Returns filtered `mock.notifications` |
| `unmatchUser(params)` | `unmatchUser` | Returns `{ unmatched: true }` |
| `reportPost(params)` | `reportPost` | Returns `{ reported: true }` |
| `markPostAction(params)` | `markPostAction` | Returns `{ marked: true }` |
| `getUserProfile(params)` | `getUserProfile` | Returns mock user + posts |
| `getPostDetail(postId)` | `getPostDetail` | Returns mock post + comments |
| `getUniversities()` | `getUniversities` | Returns `constants.UNIVERSITIES` |

**Fallback Strategy**: When cloud is unreachable (network error, cloud function not deployed, environment ID mismatch), wrappers return mock data silently. Business errors (`ok: false`) are thrown so pages can display error states. This dual-mode allows development against mock data without deploying cloud functions.
