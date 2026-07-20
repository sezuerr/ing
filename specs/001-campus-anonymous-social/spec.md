# Feature Specification: Campus Anonymous Social (校园匿名社交)

**Feature Branch**: `001-campus-anonymous-social`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "创建一个微信小程序，面向大学生的同城社交软件，用户可以浏览匿名帖子，当双方互赞时配对成功，可以聊天"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Anonymous Feed & Like Posts (Priority: P1)

A college student opens the mini program and sees a feed of anonymous posts from peers in the same city. They scroll through posts expressing campus life moments, thoughts, and questions. When a post resonates, they tap the "点亮" (light-up/like) button to express interest. The button immediately shows a lit state with an animation, providing instant feedback. The post author is shown only by an anonymous alias (e.g., "同学#1234").

**Why this priority**: This is the core entry experience — without an engaging feed and the ability to express interest, the matching and chat features have no foundation. This story alone delivers a browsable, interactive content experience.

**Independent Test**: Deploy with seed posts, open the Discover page, scroll through the feed, tap "点亮" on several posts. Verify: feed loads with anonymous posts, each post shows an anonymous alias + content + tags, "点亮" toggles with visual feedback, and the author's real identity is never revealed.

**Acceptance Scenarios**:

1. **Given** a new user opens the app, **When** the Discover page loads, **Then** they see a paginated feed of anonymous posts (20 per page), each displaying an anonymous alias, post content (≤500 chars), and 1–3 tags.
2. **Given** the user is scrolling the feed, **When** they reach near the bottom, **Then** the next page of posts loads automatically before they reach the end.
3. **Given** a post with no likes, **When** the user taps "点亮", **Then** the button immediately shows a lit/active state with animation and the like count increments by 1.
4. **Given** a post the user has already "点亮"ed, **When** the post re-appears in the feed, **Then** the "点亮" button shows as already active and cannot be toggled off (likes are irrevocable).
5. **Given** the feed is empty (no posts in the city), **When** the user opens the Discover page, **Then** they see an empty-state illustration with a friendly prompt ("还没有帖子，成为第一个发声的人吧") and a CTA to create a post.
6. **Given** a network error occurs, **When** the feed fails to load, **Then** the user sees a friendly error message with a "重试" (retry) button.

---

### User Story 2 - Create Anonymous Post (Priority: P1)

A student wants to share a thought, question, or campus-life moment anonymously. They compose a post with text content and optional tags (1–3 tags from a predefined list like "学习", "生活", "情感", "吐槽", "求助"), then publish it. The post appears in the city-wide anonymous feed without any link to their real identity.

**Why this priority**: User-generated content fuels the feed. Without post creation, the feed would be static seed data. This story enables the content engine of the entire app.

**Independent Test**: Tap "发布" (publish) button, compose a post with text and tags, submit. Verify: post appears in the Discover feed with an anonymous alias, the post content matches what was entered, tags are displayed, and the author's identity is not discoverable from the post.

**Acceptance Scenarios**:

1. **Given** the user taps the "发布" button, **When** the compose screen opens, **Then** they see a text input (max 500 chars with character counter), a tag selector (1–3 selectable tags from a preset list), and a submit button.
2. **Given** the user has entered valid content (≥1 character text, 1–3 tags), **When** they tap "发布", **Then** the post is created and appears in the feed, the user sees a success confirmation, and their anonymous alias is shown as the author.
3. **Given** the user tries to submit with empty text, **When** they tap "发布", **Then** they see a validation prompt asking them to enter content.
4. **Given** the user tries to submit with more than 3 tags or no tags, **When** they tap "发布", **Then** they see a validation prompt about tag limits.
5. **Given** the user is composing a post, **When** they attempt to exceed 500 characters, **Then** further input is blocked and the counter turns red.

---

### User Story 3 - Mutual Match on Mutual Like (Priority: P2)

When User A "点亮"s User B's post, and later User B "点亮"s any of User A's posts, the system detects the mutual like and creates a match. Both users receive a notification (in-app and a visual cue) that they have matched. The match screen reveals the matched user's anonymous alias and provides an entry point to start chatting.

**Why this priority**: The match mechanic is the product's defining value proposition — transforming anonymous browsing into real human connection. It sits between feed interaction (P1) and chat (P2) as the bridge.

**Independent Test**: As User A, like User B's post. As User B, like User A's post. Verify: both users see a match notification, both can see the matched anonymous alias, and a chat entry point is provided.

**Acceptance Scenarios**:

1. **Given** User A has "点亮"ed User B's post, **When** User B "点亮"s any post by User A, **Then** a mutual match is detected, both users see a match notification within 30 seconds, and a conversation is created for them.
2. **Given** User A "点亮"s their own post, **When** the like is processed, **Then** no match is created (self-likes do not trigger matching).
3. **Given** User A and User B are already matched, **When** either user "点亮"s another post by the other, **Then** no duplicate match or conversation is created.
4. **Given** a match is created, **When** either user views the match, **Then** only the matched user's anonymous alias is shown — no openId, real name, or other identifying information is revealed.
5. **Given** a single-sided like (only one user has liked), **When** the other user never reciprocates, **Then** no match is ever created and no notification is sent.

---

### User Story 4 - Anonymous Chat Between Matched Users (Priority: P2)

After matching, both users can enter a chat conversation. The chat interface mirrors familiar messaging UX (fixed bottom input bar, message bubbles, timestamps). Messages are sent and received in near real-time. Both users remain anonymous to each other — only their aliases are displayed.

**Why this priority**: Chat is the payoff of the matching mechanic — the actual human connection. Without chat, matches are a dead end. This completes the core value loop: browse → like → match → chat.

**Independent Test**: After a match is created, open the chat from the match notification or conversation list. Send messages from both matched users. Verify: messages appear in real-time (within 30s polling interval), each message shows the sender's alias, and no real identity is leaked.

**Acceptance Scenarios**:

1. **Given** two users are matched, **When** either user taps "开始聊天" from the match screen, **Then** they enter a chat interface showing message history (if any) and a fixed-bottom input bar.
2. **Given** a user sends a message, **When** they tap send, **Then** the message appears immediately in the chat (optimistic UI) with a "发送中" indicator, and confirms to "已发送" within 3 seconds.
3. **Given** the chat is open, **When** the other user sends a new message, **Then** the new message appears within 30 seconds without manual refresh.
4. **Given** it's the first message between matched users, **When** either user opens the chat, **Then** they see a friendly system message: "你们互相点亮了对方，开始聊天吧 👋".
5. **Given** the chat has more than 50 messages, **When** the user scrolls to the top, **Then** older messages load in pages of 50 with a "加载更多" trigger.
6. **Given** the user is not in the chat screen, **When** a new message arrives, **Then** a badge/unread indicator appears on the conversation list entry.

---

### User Story 5 - View My Posts (Priority: P3)

A user can view all the anonymous posts they have created in a "我的帖子" (My Posts) section. This allows them to see which of their posts are getting likes and track their activity.

**Why this priority**: This gives users a sense of ownership and lets them track engagement on their posts. It's important for retention but the core loop (browse → like → match → chat) works without it.

**Independent Test**: Create several posts, navigate to "我的帖子", verify all created posts appear with their like counts and status.

**Acceptance Scenarios**:

1. **Given** the user has created posts, **When** they navigate to "我的帖子", **Then** they see a list of their posts ordered by creation time (newest first), each showing content, tags, like count, and creation time.
2. **Given** the user has no posts, **When** they navigate to "我的帖子", **Then** they see an empty state with a prompt to create their first post.

---

### User Story 6 - Conversation List (Priority: P3)

A user can view all their matched conversations in a list, ordered by most recent activity. Each entry shows the matched user's alias, the last message preview, and an unread badge if applicable.

**Why this priority**: As users accumulate matches, they need a way to navigate between conversations. This is essential for multi-match engagement but the single-conversation chat works without it.

**Independent Test**: Create multiple matches with different users, send messages in each. Verify: conversation list shows all matches ordered by recent activity, with correct message previews and unread indicators.

**Acceptance Scenarios**:

1. **Given** the user has one or more matches, **When** they view the conversation list, **Then** matches are ordered by most recent message time, showing alias, last message preview (truncated to one line), and unread badge count.
2. **Given** the user has no matches, **When** they view the conversation list, **Then** they see an empty state: "还没有匹配，去发现页点亮喜欢的帖子吧".
3. **Given** the user taps a conversation, **When** entering the chat, **Then** the unread badge for that conversation is cleared.

---

### Edge Cases

- What happens when a user with no location permission opens the app? → The app requests location access with an explanation ("需要获取你的城市信息以展示同城帖子"). If denied, the feed defaults to showing all-city posts or prompts the user to manually select a city.
- What happens when the feed has been exhausted (all posts seen)? → A friendly end-of-list divider appears: "— 已经看完了 —".
- What happens when a post author deletes a post that another user has liked? → The like is soft-deleted but the match (if one was created) survives — the conversation is not affected by post deletion.
- How does the system handle rapid double-tap on "点亮"? → The server enforces idempotency — a second like from the same user on the same post is rejected with a "已点亮" response.
- What happens when two users match while one is offline? → The match is persisted server-side. The offline user sees the match notification and conversation on their next app open or feed refresh.
- What happens when a user attempts to send a message in an unmatched conversation? → This is technically impossible — chat is only accessible via match, and the server validates the match relationship on every message send.
- How are offensive posts handled? → MVP uses a basic profanity filter on post creation. Before public distribution, full content safety review via 微信内容安全 API must be integrated.
- What if two users match multiple times (like each other's posts multiple times)? → Only one conversation is created. Subsequent mutual likes are registered but do not create duplicate conversations or notifications.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to browse an anonymous post feed filtered by same-city location, paginated at 20 posts per page.
- **FR-002**: System MUST display each post with an anonymous author alias (e.g., "同学#1234"), post content (max 500 chars), 1–3 topic tags, like count, and relative timestamp — never revealing the author's real identity or openId.
- **FR-003**: System MUST allow users to "点亮" (like) any post that is not their own, with the like being irrevocable (cannot be undone).
- **FR-004**: System MUST enforce idempotency on likes — a second like attempt on the same post by the same user MUST be rejected server-side.
- **FR-005**: System MUST allow users to create anonymous posts with text content (1–500 characters) and 1–3 topic tags from a predefined tag list.
- **FR-006**: System MUST validate post input: text cannot be empty or exceed 500 characters, tags must be 1–3 from the allowed list, and content MUST pass a basic profanity filter.
- **FR-007**: System MUST detect when two users have mutually liked each other's posts and automatically create a match between them, generating an in-app notification for both users.
- **FR-008**: System MUST ensure self-likes do not trigger match creation and already-matched user pairs do not generate duplicate matches.
- **FR-009**: System MUST provide a chat interface for matched users, supporting text message exchange with real-time delivery (within 30 seconds via polling or database watchers).
- **FR-010**: System MUST display messages with optimistic UI updates — a sent message appears immediately with a pending indicator before confirming delivery.
- **FR-011**: System MUST paginate chat message history at 50 messages per page, with a "load more" trigger at the top of the chat.
- **FR-012**: System MUST maintain the anonymous boundary in all chat interactions — only anonymous aliases are shown, never openId or real identity.
- **FR-013**: System MUST provide a "我的帖子" (My Posts) section where users can view all posts they have created, ordered newest-first, with like counts.
- **FR-014**: System MUST provide a conversation list showing all matched conversations ordered by most recent activity, with last message preview and unread badge count.
- **FR-015**: System MUST implement all five UI states for every data-driven screen: loaded, loading (skeleton cards), empty (illustration + prompt + CTA), error (friendly message + retry), and edge cases (end-of-list divider).
- **FR-016**: System MUST collect only coarse location (city-level) for feed filtering — precise geolocation coordinates MUST be discarded after geohash computation and never persisted.
- **FR-017**: System MUST route all data access through cloud functions — direct client-to-database access is prohibited.
- **FR-018**: System MUST tag all new posts with `status=visible` and `reviewStatus=pending` for MVP — with the requirement that 微信内容安全 API integration be implemented before public distribution.

### Key Entities

- **User**: Represents a WeChat user of the mini program. Key attributes: anonymous alias (auto-generated, e.g., "同学#1234"), openId (server-side only, never exposed to clients), city (coarse location for feed filtering). A user can create posts, like posts, be matched, and send messages.
- **Post**: An anonymous content entry. Key attributes: content (text, ≤500 chars), tags (1–3 from preset list), author (reference to User, anonymous to readers), like count, status (visible/hidden), review status (pending/approved/rejected), city (for feed filtering), creation timestamp. Posts are the primary content unit and the basis for matching.
- **Like**: A record of a user "点亮"ing a post. Key attributes: post reference, liker reference (the user who liked), timestamp. Likes are irrevocable and idempotent per user-post pair. Mutual likes across two users' posts trigger match creation.
- **Match**: A mutual connection between two users. Key attributes: user A reference, user B reference, creation timestamp (when the second mutual like occurred), status (active). A match grants both users access to a shared conversation.
- **Message**: A chat message within a matched conversation. Key attributes: conversation/match reference, sender reference, text content, creation timestamp, delivery status. Only matched users can send and receive messages in a conversation.
- **Conversation**: A chat thread between two matched users. Key attributes: match reference, participants (two users), last message preview, last activity timestamp, unread counts per user. One conversation per match.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete the full core flow (open app → browse feed → like a post → create a post → receive a match → start chatting) in under 3 minutes during a demo.
- **SC-002**: The Discover feed loads its first page of 20 posts in under 2 seconds on a 4G connection.
- **SC-003**: Users see their "点亮" action reflected in the UI within 200ms (optimistic update), with server confirmation within 3 seconds.
- **SC-004**: Messages sent in a chat appear on the recipient's screen within 30 seconds without manual refresh.
- **SC-005**: Mutual match detection triggers within 5 seconds of the second user's like action.
- **SC-006**: 100% of data-driven screens handle all five UI states (loaded, loading, empty, error, edge cases) with no blank screens or raw error messages.
- **SC-007**: At no point in any user flow is a user's real identity, openId, or post authorship revealed before a mutual match — verified by manual audit of all API responses and UI components.
- **SC-008**: The full demo flow completes without crashes, freezes, or unclear error states.

## Assumptions

- Users authenticate via WeChat login (wx.login), which provides the openId used server-side for identity tracking — no additional registration or email/password is required.
- The app targets a single city (or campus area) per deployment. Multi-city expansion is out of scope for v1.
- The predefined tag list covers common campus-life topics: "学习", "生活", "情感", "吐槽", "求助", "活动", "二手", "交友". This list can be configured without code changes.
- Seed data is populated before the first user launch to ensure the feed is never empty for demo purposes.
- Chat uses a 30-second polling interval for message delivery. If 云开发 database watchers become available and reliable, they may replace polling in a future iteration.
- The profanity filter in MVP is a basic keyword-based filter. Full content safety review via 微信内容安全 API is a prerequisite for public distribution.
- Location permission denial is handled gracefully — users who deny location can manually select a city from a list.
- The app's total package size is under 2MB to comply with WeChat Mini Program limits.
- Content moderation (reviewing/removing offensive posts) by administrators is handled out-of-band for MVP — flagged posts are hidden by status toggle rather than via an admin dashboard.
- Unmatch functionality is out of scope for the walking skeleton (Slices 1–4). It will be introduced in a later slice with conversation archiving rather than data deletion.
