# Data Model: Campus Anonymous Social (校园匿名社交)

**Created**: 2026-07-20 | **Plan**: [plan.md](./plan.md)

All collections live in 微信云开发 Cloud Database. Field types follow cloud database conventions: `string`, `number`, `boolean`, `object`, `array`, `Date` (stored as server date via `db.serverDate()`).

---

## Entity Relationship Diagram

```
User ──<creates>──> Post
User ──<likes>──> Like ──> Post
User ──<member of>──> Match
Match ──<has>──> Conversation
Conversation ──<contains>──> Message
User ──<receives>──> Notification
User ──<reports>──> Report ──> Post
User ──<acts on>──> PostAction ──> Post
```

---

## Collection: `users`

Represents a WeChat user of the mini program. Created automatically on first login via `ensureUser()`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `openid` | string | yes | WeChat openId (server-side, never exposed to client) |
| `alias` | string | yes | **Anonymous alias**, e.g. "同学#4821". Generated once at creation. [GAP: currently `nickName`] |
| `nickName` | string | no | Display name (currently "小黄灯"). [GAP: to be replaced by `alias`] |
| `avatarUrl` | string | no | Avatar URL (currently empty/default) |
| `gender` | string | no | Gender ("男"/"女"/"非二元") |
| `bio` | string | no | Short bio, max 50 chars |
| `universityId` | string | no | FK to `universities` collection |
| `universityName` | string | no | Denormalized university name |
| `cityCode` | string | no | City code from geohash (e.g., "beijing") |
| `geoHash` | string | no | Coarse geohash (4-5 chars precision) |
| `stats.likeCount` | number | yes | Total likes received across all posts |
| `stats.commentCount` | number | yes | Total comments received |
| `createdAt` | Date | yes | Account creation timestamp |
| `updatedAt` | Date | yes | Last profile update timestamp |

**Validation Rules**:
- `openid`: auto-assigned by WeChat, immutable
- `alias`: format "同学#NNNN" where N = digit; unique per collection
- `bio`: max 50 characters
- All string fields sanitized (trimmed, no HTML)

**State Transitions**: Users have no state machine — they are always "active" once created.

---

## Collection: `posts`

Anonymous content entry. Created via `createPost`, surfaced in Discover Feed via `getDiscoverFeed`, shown in My Posts via `getMyPosts`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `authorId` | string | yes | FK to `users.openid` (server-side, filtered from client) |
| `title` | string | yes | Post title, max 40 chars |
| `body` | string | yes | Post body content, max 800 chars [GAP: spec says 500] |
| `icon` | string | yes | Topic emoji icon |
| `imageUrls` | array[string] | no | Image URLs (max 9). Exists in codebase; spec says text-only MVP. Keep but gate on review. |
| `visibility` | string | yes | One of: "public", "university", "friends", "self" |
| `cityCode` | string | no | City code for feed filtering |
| `universityId` | string | no | FK to `universities` (campus-scoped filtering) |
| `universityName` | string | no | Denormalized university name |
| `geoHash` | string | no | Coarse geohash |
| `distanceText` | string | no | Display text like "距你10公里内" |
| `status` | string | yes | "visible" (default) or "hidden" |
| `reviewStatus` | string | yes | "pending" (default), "approved", "rejected", "flagged" |
| `likeCount` | number | yes | Cached like count (incremented atomically via `_.inc`) |
| `commentCount` | number | yes | Cached comment count |
| `dailyTopicId` | string | no | FK to `daily_topics` if post is a topic response |
| `createdAt` | Date | yes | Post creation timestamp |
| `updatedAt` | Date | yes | Last modification timestamp |

**Validation Rules**:
- `title`: 1-40 chars, trimmed
- `body`: 1-500 chars per spec [GAP: currently 800]
- `icon`: must be from `TOPIC_ICONS` set
- `visibility`: must be one of the allowed values
- `status`: one of "visible" or "hidden"
- `reviewStatus`: one of "pending", "approved", "rejected", "flagged"

**State Transitions**:
```
[created] → status=visible, reviewStatus=pending
  → reviewStatus can change to: approved | rejected | flagged
  → status can change to: hidden (soft delete)
```

---

## Collection: `likes`

Records a user "点亮"ing a post. Immutable once created (likes are irrevocable).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `postId` | string | yes | FK to `posts._id` |
| `fromUserId` | string | yes | FK to `users.openid` (the liker) |
| `toUserId` | string | yes | FK to `users.openid` (the post author) |
| `createdAt` | Date | yes | Like timestamp |

**Validation Rules**:
- `fromUserId != toUserId`: cannot like own post (enforced server-side)
- Unique constraint on `(postId, fromUserId)`: idempotent (enforced by duplicate check in `likePost`)
- Likes are irrevocable — no delete/unlike

**Match Detection Logic** (in `likePost` handler):
1. Insert like record
2. Increment post `likeCount` and author `stats.likeCount`
3. Check for reciprocal like: `likes.where({ fromUserId: post.authorId, toUserId: likerOpenId })`
4. If reciprocal exists → `createOrGetMatch(likerOpenId, post.authorId)` → create conversation → send match notifications to both users

---

## Collection: `matches`

A mutual connection between two users. Created automatically when reciprocal likes are detected.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `pairKey` | string | yes | Sorted pair of openIds joined by `_`, e.g. "openIdA_openIdB" (deterministic, unique) |
| `members` | array[string] | yes | `[openIdA, openIdB]` |
| `userA` | string | yes | First openId (for reference) |
| `userB` | string | yes | Second openId (for reference) |
| `status` | string | yes | "active" or "unmatched" |
| `unmatchedAt` | Date | no | When unmatch occurred |
| `createdAt` | Date | yes | Match creation timestamp |
| `updatedAt` | Date | yes | Last update timestamp |

**Validation Rules**:
- `pairKey` is unique and deterministically formed from the sorted pair
- `members` always contains exactly 2 openIds
- Self-match impossible (enforced by `likePost`)

**State Transitions**:
```
[created] → status=active
  → status can change to: unmatched (via unmatchUser, Slice 5)
  → if re-matched after unmatch: status=active, unmatchedAt=null
```

---

## Collection: `conversations`

A chat thread between two matched users. Created alongside the match.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `matchId` | string | yes | FK to `matches._id` |
| `members` | array[string] | yes | `[openIdA, openIdB]` |
| `lastMessage.text` | string | no | Last message preview text |
| `lastMessage.createdAt` | Date | no | Last message timestamp |
| `unreadMap` | object | yes | `{ [openId]: unreadCount }` — per-user unread counters |
| `status` | string | yes | "active" or "unmatched" |
| `createdAt` | Date | yes | Conversation creation timestamp |
| `updatedAt` | Date | yes | Last activity timestamp |

**Validation Rules**:
- One conversation per match (1:1 relationship)
- Only matched users can access (enforced by membership check in `sendMessage`, `getMessages`)

**State Transitions**:
```
[created] → status=active
  → status can change to: unmatched (mirrors match status)
```

---

## Collection: `messages`

A chat message within a conversation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `conversationId` | string | yes | FK to `conversations._id` |
| `senderId` | string | yes | FK to `users.openid` |
| `content` | string | yes | Message text, max 1000 chars |
| `readBy` | array[string] | yes | List of openIds who have read this message |
| `createdAt` | Date | yes | Message timestamp |

**Validation Rules**:
- `content`: 1-1000 chars, trimmed
- `senderId` must be in `conversation.members` (enforced server-side)

---

## Collection: `notifications`

In-app notification for likes, matches, comments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `recipientId` | string | yes | FK to `users.openid` (who receives this) |
| `type` | string | yes | "like", "match", "comment" |
| `actorId` | string | yes | FK to `users.openid` (who triggered this) |
| `postId` | string | no | FK to `posts._id` (context post) |
| `title` | string | yes | Notification title |
| `description` | string | no | Notification body |
| `read` | boolean | yes | Whether recipient has read it (default: false) |
| `createdAt` | Date | yes | Notification timestamp |

**Validation Rules**:
- `type`: one of "like", "match", "comment"
- Actor identity only revealed if `activeMatch(recipientId, actorId)` exists (enforced in `getNotifications`)

---

## Collection: `comments`

Private reply on a post (only visible to matched users).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (auto) | yes | Cloud DB document ID |
| `postId` | string | yes | FK to `posts._id` |
| `fromUserId` | string | yes | FK to `users.openid` |
| `toUserId` | string | yes | FK to `users.openid` (post author) |
| `content` | string | yes | Comment text, max 500 chars |
| `createdAt` | Date | yes | Comment timestamp |

---

## Supporting Collections

### `universities`
Pre-populated campus data: `{ id, name, cityCode, campus, geoHash }`

### `daily_topics`
Daily discussion topics: `{ title, description, icon, date, status }`

### `reports`
Post reports: `{ postId, reporterId, reason, status, createdAt }`

### `post_actions`
User actions on posts (swipe, not-interested, report): `{ userId, postId, action, createdAt }`

---

## Gap Analysis: Current Schema vs Spec

| Gap | Current State | Spec Requirement | Action |
|-----|---------------|------------------|--------|
| Anonymous alias | `nickName` field ("小黄灯") | `alias` field ("同学#XXXX") | Add `alias` field to `users`, generate on creation, use in all client responses |
| Post body limit | 800 chars | 500 chars | Reduce to 500 |
| Message page size | 100 per fetch | 50 per page | Change `limit(100)` → `limit(50)` in `getMessages` |
| Feed page size | 30 posts | 20 posts | Change limit in `getDiscoverFeed` |
| Profanity filter | Not implemented | Basic keyword filter | Add to `createPost` handler |
| Content images | Supported (up to 9 URLs) | Text-only MVP | Keep for flexibility; gate on review status |
