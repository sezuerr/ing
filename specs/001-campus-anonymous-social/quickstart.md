# Quickstart: Campus Anonymous Social Validation Guide

**Created**: 2026-07-20 | **Plan**: [plan.md](./plan.md)

This guide describes how to validate the full feature end-to-end. It assumes you have the WeChat Developer Tools (微信开发者工具) installed and the project cloned.

## Prerequisites

1. **WeChat Developer Tools** (稳定版, latest stable)
2. **WeChat Cloud Development environment** with:
   - Environment ID configured in `project.config.json` and `app.js`
   - Cloud function `api` deployed (right-click `cloudfunctions/api` → "上传并部署：云端安装依赖")
   - Database collections created: `users`, `posts`, `likes`, `matches`, `conversations`, `messages`, `notifications`, `comments`, `reports`, `post_actions`, `universities`, `daily_topics`
3. **Seed data imported** (optional, for demo with pre-populated content):
   - Import `data/universities.import.json` into `universities` collection
   - Import `data/posts.import.json` into `posts` collection
   - Import `data/users.import.json` into `users` collection
   - Import `data/daily_topics.import.json` into `daily_topics` collection
4. **WeChat Mini Program AppID** registered and configured

## Local Development (Mock Mode)

The app works without cloud deployment using the local mock data layer:
- Open project in WeChat Developer Tools
- Ensure `utils/mock.js` has seed data
- The app automatically falls back to mock data when cloud functions are unreachable
- All UI screens are functional against mock data

## Validation Scenarios

### Scenario 1: Full Core Flow (P1+P2) — The Demo Test

**Goal**: Validate the complete browse → like → match → chat loop end-to-end.

**Setup**: Two test WeChat accounts (or two simulator instances in Developer Tools with different openIds). At least one seed post in the database.

**Steps**:

1. **User A opens the app**
   - [ ] Discover page loads, showing feed of anonymous posts
   - [ ] Each post shows: anonymous alias ("同学#XXXX"), title, body, icon, tags, like count, distance
   - [ ] Feed scrolls smoothly, "加载更多" triggers at bottom
   - [ ] Empty state shown if no posts exist

2. **User A creates a post**
   - [ ] Tap "发布" → compose screen opens
   - [ ] Enter title ("找健身搭子"), body ("周二周四晚上学校健身房，有人一起吗"), select icon (💪), set visibility
   - [ ] Tap "发布" → success feedback, post appears in feed
   - [ ] Character counter stops at 500 chars
   - [ ] Empty title/body shows validation error

3. **User B opens the app and likes User A's post**
   - [ ] User B sees User A's post in Discover feed
   - [ ] User B taps "点亮" → button animates to lit state immediately (optimistic)
   - [ ] Like count increments by 1
   - [ ] User B cannot un-like the post

4. **User A likes User B's post → Match!**
   - [ ] User A navigates to Discover, finds a post by User B, taps "点亮"
   - [ ] System detects reciprocal like → match created
   - [ ] User A sees match notification within 30 seconds
   - [ ] User B sees match notification within 30 seconds
   - [ ] Both users see the other's alias (not real identity) in match notification

5. **Chat between matched users**
   - [ ] User A taps "开始聊天" from match notification
   - [ ] Chat interface shows: system welcome message ("你们互相点亮了对方，开始聊天吧 👋"), fixed bottom input bar
   - [ ] User A sends a message → appears immediately with "发送中" → resolves to "已发送"
   - [ ] User B receives the message within 30 seconds (on conversation list or in-chat)
   - [ ] User B replies → User A sees the reply
   - [ ] Sender identity shows as alias only

**Expected Outcome**: Full flow completes without crashes, blank screens, or identity leaks. Total time < 3 minutes.

---

### Scenario 2: Edge Case — Single-Sided Like (No Match)

**Goal**: Verify that only mutual likes trigger matches.

**Steps**:
1. User A likes User B's post
2. User B never likes any of User A's posts
3. [ ] User A sees no match notification
4. [ ] User B sees a "like" notification but no match notification
5. [ ] No conversation is created between them

---

### Scenario 3: Edge Case — Self-Like Prevention

**Goal**: Verify users cannot like their own posts.

**Steps**:
1. User A creates a post
2. User A navigates to their own post (via My Posts)
3. [ ] "点亮" button is not shown or is disabled for own posts
4. [ ] Attempting to call `likePost` API on own post returns error

---

### Scenario 4: Edge Case — Idempotent Like

**Goal**: Verify double-tap doesn't create duplicate likes.

**Steps**:
1. User A taps "点亮" on a post
2. User A rapidly taps "点亮" again on the same post
3. [ ] Server returns `duplicate: true` on second attempt
4. [ ] Like count increments only once
5. [ ] No duplicate match notification is sent

---

### Scenario 5: UI State Coverage Audit

**Goal**: Verify all five UI states on every data-driven screen.

**Pages to check**:

| Screen | Loaded | Loading | Empty | Error | Edge |
|--------|--------|---------|-------|-------|------|
| Discover Feed | Posts visible | Skeleton cards | "还没有帖子" + CTA | Error + retry | "已经看完了" divider |
| My Posts | Posts visible | Skeleton cards | "还没有帖子" + CTA | Error + retry | End of list |
| Conversation List | Conversations visible | Skeleton cards | "还没有匹配" + CTA | Error + retry | End of list |
| Chat | Messages visible | Loading indicator | System welcome message | Error + retry | "加载更多" trigger |
| Create Post | Form visible | Submit loading | N/A | Validation errors | Char limit warning |
| Match Notification | Match card visible | N/A | N/A | N/A | Duplicate match handled |

---

### Scenario 6: Privacy Audit

**Goal**: Verify anonymous boundary is never broken.

**Steps**:
1. Open Discover feed — [ ] every post author shows as "同学#XXXX"
2. Like a post — [ ] notification to author shows actor as anonymous (no alias unless matched)
3. Before matching — [ ] no API response contains the post author's openId or real identity
4. After matching in chat — [ ] messages show sender as alias only
5. [ ] Audit all `console.log` and error messages for accidental openId leaks

---

### Scenario 7: Performance Benchmarks

**Goal**: Verify performance targets are met.

| Metric | Target | How to Test |
|--------|--------|-------------|
| Feed first-page load | <2s on 4G | DevTools Network throttle: "Slow 3G", measure time to first render |
| Like UI feedback | <200ms | Tap "点亮", measure time to visual state change |
| Like server confirmation | <3s | Check console for cloud function response time |
| Chat message delivery | <30s | Send message from User B, time until it appears on User A's screen |
| Match detection | <5s | Like post, time until match notification appears on the other user's instance |
| Scrolling | 60fps | DevTools Performance panel, scroll through 50+ post feed |

## Test Commands

Once the test infrastructure is set up:

```bash
# Cloud function contract tests
cd cloudfunctions/api
npm test

# Integration tests (miniprogram-automator)
npm run test:e2e

# Run specific test suite
npm run test:e2e -- --suite core-flow
```

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "云函数调用失败" | Cloud function not deployed | Upload api cloud function in DevTools |
| "缺少微信登录态" | Not running in WeChat env | Run in DevTools simulator, not browser |
| Feed shows no posts | No seed data, no posts created | Import seed data or create a post |
| Chat messages don't appear | Polling interval not triggered | Verify `onShow` lifecycle triggers message refresh |
| Match not detected | Reciprocal like check failed | Verify both likes exist in `likes` collection |
| Anonymous identity broken | `nickName` leaked in response | Check cloud function response for `alias` vs `nickName` |
