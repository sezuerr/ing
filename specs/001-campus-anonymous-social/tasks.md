# Tasks: Campus Anonymous Social (校园匿名社交)

**Input**: Design documents from `/specs/001-campus-anonymous-social/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api-contracts.md ✅, quickstart.md ✅

**Tests**: Tests are MANDATORY per Constitution Principle II (Test-First Development). Contract tests for cloud function routes and integration tests for user journeys MUST be included and written BEFORE implementation.

**Existing Codebase**: The full walking skeleton (Slices 1–6) is already built. Tasks focus on: (1) filling 7 spec-alignment gaps identified in plan.md, (2) writing mandatory contract + integration tests, (3) UX state audits, (4) performance and privacy validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Cloud functions**: `cloudfunctions/api/`
- **Client pages**: `pages/<page-name>/`
- **Client utils**: `utils/`
- **Components**: `components/`
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/unit/`
- **Data/seed**: `data/`

---

## Phase 1: Setup (Test Infrastructure)

**Purpose**: Scaffold the test infrastructure required by Constitution Principle II before any user story work begins.

- [ ] T001 Scaffold Jest test runner for cloud functions in `cloudfunctions/api/package.json` — add jest dependency, test script, and `tests/` directory structure
- [ ] T002 [P] Configure miniprogram-automator for end-to-end testing in project root — add `miniprogram-automator` devDependency, create `tests/integration/.automatorrc`
- [ ] T003 [P] Create mock database layer for cloud function tests in `tests/contract/helpers/db-mock.js` — wraps in-memory objects with the same query API as `wx-server-sdk` database (`.where()`, `.orderBy()`, `.limit()`, `.get()`, `.add()`, `.update()`, `.doc()`, `_.inc`, `_.all`, `_.in`)
- [ ] T004 Create test fixture/seeder utility in `tests/helpers/seed.js` — provides `seedUsers()`, `seedPosts()`, `seedLikes()` functions returning predictable test data
- [ ] T005 [P] Add test configuration for cloud function environment in `tests/contract/helpers/wx-context-mock.js` — mock `cloud.getWXContext()` to return a configurable `OPENID` per test

**Checkpoint**: Test infrastructure ready — `npm test` runs Jest, contract tests can mock cloud DB, integration tests can launch mini program.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core changes that affect all user stories. MUST complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement anonymous alias generation in `cloudfunctions/api/index.js` — in `ensureUser()`, generate "同学#NNNN" format alias (4 random digits, unique check against `users` collection), store in `users.alias` field on first creation; existing users get alias on next `ensureUser()` call if missing
- [ ] T007 Update `utils/mock.js` to include `alias` field on mock users in `utils/mock.js` — add `alias: "同学#1234"` to `mock.currentUser` and all mock user objects
- [ ] T008 [P] Audit and sync mock layer with cloud DB schema in `utils/mock.js` — verify all mock data structures match the collections defined in data-model.md (users, posts, likes, matches, conversations, messages, notifications)
- [ ] T009 [P] Update `utils/constants.js` with spec-aligned tag list in `utils/constants.js` — ensure TOPIC_TAGS includes: "学习", "生活", "情感", "吐槽", "求助", "活动", "二手", "交友" and add profanity keyword blocklist as `PROFANITY_KEYWORDS`
- [ ] T010 Reduce post body limit from 800 to 500 characters in `cloudfunctions/api/index.js` `createPost()` handler — change `.slice(0, 800)` → `.slice(0, 500)` and update validation error message
- [ ] T011 Update Discover feed page size from 30 to 20 in `cloudfunctions/api/index.js` `getDiscoverFeed()` handler — change `.slice(0, 30)` → `.slice(0, 20)` and add cursor-based pagination support with `nextCursor` in response

**Checkpoint**: Foundation ready — anonymous aliases work, pagination aligned with spec, mock layer verified. User story implementation can now begin.

---

## Phase 3: User Story 1 — Browse Anonymous Feed & Like Posts (Priority: P1) 🎯 MVP

**Goal**: User opens the app, sees a paginated feed of anonymous posts from peers in the same city, scrolls smoothly, and taps "点亮" on posts that resonate. The like button provides immediate optimistic UI feedback.

**Independent Test**: Deploy with seed posts, open Discover page, scroll feed, tap "点亮" on posts. Verify: 20 posts load with anonymous alias ("同学#XXXX"), tags, like count; "点亮" shows lit animation within 200ms; already-liked posts show active state; empty feed shows CTA; error shows retry.

### Tests for User Story 1 (MANDATORY — Write First, Ensure They FAIL) ⚠️

- [ ] T012 [P] [US1] Contract test for `getDiscoverFeed` route in `tests/contract/getDiscoverFeed.test.js` — cover: valid request returns ≤20 posts with alias (not nickName/openId), city scope filtering, university scope filtering, empty feed returns `{ posts: [], dailyTopic: null }`, cursor pagination, topicOnly filter, own posts excluded, swiped posts excluded
- [ ] T013 [P] [US1] Contract test for `likePost` route (basic + idempotency) in `tests/contract/likePost.test.js` — cover: valid like returns `matched: false`, duplicate like returns `duplicate: true` with no count change, self-like returns error, non-existent post returns error, like increments post `likeCount` and author `stats.likeCount`
- [ ] T014 [US1] Integration test for browse-and-like flow in `tests/integration/browse-like.test.js` — test: open Discover → feed renders 20 posts with aliases → tap "点亮" → button animates to active → like count increments → scroll to bottom → next 20 posts load → tap already-liked post → remains active (no unlike)

### Implementation for User Story 1

- [ ] T015 [US1] Replace `nickName` with `alias` in Discover feed response in `cloudfunctions/api/index.js` `getDiscoverFeed()` — change author object to use `alias` field; only reveal `nickName` + `avatarUrl` when `isFriend: true` (mutual match exists)
- [ ] T016 [US1] Update post-card component to display anonymous alias in `components/post-card/` — render `author.alias` instead of `author.nickName`; only show avatar when `author.isFriend === true`
- [ ] T017 [US1] UX audit — verify five UI states on Discover page in `pages/discover/` — loaded (posts visible with aliases), loading (skeleton cards), empty ("还没有帖子，成为第一个发声的人吧" + "去发布" CTA), error (friendly message + "重试" button), edge ("— 已经看完了 —" divider at end of feed)
- [ ] T018 [US1] Verify optimistic like UI and irrevocable like enforcement in `pages/discover/` — confirm "点亮" button immediately shows lit state on tap (no network wait), confirm liked posts show active state and cannot be toggled off

**Checkpoint**: User Story 1 independently functional — feed loads with anonymous aliases, likes work with optimistic UI, all five UI states covered.

---

## Phase 4: User Story 2 — Create Anonymous Post (Priority: P1) 🎯 MVP

**Goal**: User composes an anonymous post with text (≤500 chars) and 1–3 topic tags, publishes it, and sees it appear in the feed under their anonymous alias. Content passes profanity filter.

**Independent Test**: Tap "发布", compose a post with text and tags, submit. Verify: post appears in Discover feed under anonymous alias, content matches, tags displayed, empty text/tags fail validation, 500-char limit enforced.

### Tests for User Story 2 (MANDATORY — Write First, Ensure They FAIL) ⚠️

- [ ] T019 [P] [US2] Contract test for `createPost` route in `tests/contract/createPost.test.js` — cover: valid post creation returns post with server fields, empty title/body returns `BAD_REQUEST`, body >500 chars rejected, invalid icon returns error, profanity in body returns `BAD_REQUEST`, post appears in `getMyPosts` and `getDiscoverFeed`

### Implementation for User Story 2

- [ ] T020 [US2] Implement profanity keyword filter in `cloudfunctions/api/index.js` `createPost()` handler — check title + body against `PROFANITY_KEYWORDS` from constants; reject with `"内容包含不当词汇"` if matched; do this server-side (authoritative)
- [ ] T021 [US2] Add client-side character counter (500 max) and validation in `pages/publish/` — update maxLength to 500, show red counter at 500, validate 1–3 tags selected, show inline validation errors for empty title/body/tags
- [ ] T022 [US2] UX audit — verify create post states in `pages/publish/` — form loaded with character counter and tag selector, submit loading indicator, validation errors for invalid input, success feedback on publish
- [ ] T023 [US2] Verify new post appears under anonymous alias in `pages/publish/` → `pages/discover/` — after publishing, navigate to Discover and confirm the post shows with "同学#XXXX" alias (not nickName), correct tags, and content

**Checkpoint**: User Story 2 independently functional — post creation with validation and profanity filter, posts appear anonymously in feed.

---

## Phase 5: User Story 3 — Mutual Match on Mutual Like (Priority: P2)

**Goal**: When two users mutually like each other's posts, the system detects it and creates a match. Both users receive a match notification showing the other's anonymous alias, with a CTA to start chatting.

**Independent Test**: User A likes User B's post → User B likes User A's post → both users see match notification within 5 seconds → both see anonymous alias → "开始聊天" CTA appears.

### Tests for User Story 3 (MANDATORY — Write First, Ensure They FAIL) ⚠️

- [ ] T024 [P] [US3] Contract test for match detection in `tests/contract/likePost-match.test.js` — extend `likePost` tests to cover: reciprocal like triggers match creation, match notification created for both users, self-like does not trigger match, already-matched pair does not create duplicate match/conversation, match `pairKey` is deterministic (sorted openIds), conversation is created alongside match
- [ ] T025 [US3] Integration test for two-user mutual match flow in `tests/integration/mutual-match.test.js` — test: seed User A and User B with posts → User A likes User B's post (no match) → User B likes User A's post → both receive match notification → both can see match screen with alias → "开始聊天" CTA available

### Implementation for User Story 3

- [ ] T026 [US3] Verify match notification reveals only anonymous alias in `cloudfunctions/api/index.js` `createOrGetMatch()` and `getNotifications()` — confirm match notifications use `alias` for actor identity when no prior match existed; full nickName/avatar only revealed post-match
- [ ] T027 [US3] Verify duplicate match prevention in `cloudfunctions/api/index.js` `likePost()` — confirm already-matched pair does not create second conversation; confirm `createOrGetMatch()` reactivates unmatched matches rather than creating duplicates
- [ ] T028 [US3] UX audit — match notification screen in `pages/notification-list/` — match notification shows peer alias, match type notification has "开始聊天" CTA, notification list shows all types (like, match, comment)

**Checkpoint**: User Story 3 independently functional — mutual likes trigger matches, notifications work, anonymous boundary preserved.

---

## Phase 6: User Story 4 — Anonymous Chat Between Matched Users (Priority: P2)

**Goal**: Matched users can exchange text messages in a chat interface. Messages appear with optimistic UI, delivered within 30 seconds. Both users remain anonymous (alias only).

**Independent Test**: After match created, open chat, send messages from both sides. Verify: sent messages appear immediately with pending→sent indicator, received messages appear within 30 seconds, sender aliases shown (not real identity), system welcome message on first open.

### Tests for User Story 4 (MANDATORY — Write First, Ensure They FAIL) ⚠️

- [ ] T029 [P] [US4] Contract test for `sendMessage` route in `tests/contract/sendMessage.test.js` — cover: valid send returns `{ sent: true }`, empty content rejected, non-member rejected (`FORBIDDEN`), unmatched conversation rejected, peer unread count incremented, conversation `lastMessage` + `updatedAt` updated
- [ ] T030 [P] [US4] Contract test for `getMessages` route in `tests/contract/getMessages.test.js` — cover: returns messages for valid member, returns ≤50 messages oldest-first, `mine: true` for sender's own messages, `since` parameter filters to newer only, non-member returns `FORBIDDEN`, unread count cleared after fetch, empty conversation returns `{ messages: [] }`
- [ ] T031 [P] [US4] Contract test for `getConversations` route in `tests/contract/getConversations.test.js` — cover: returns conversations ordered by `updatedAt` desc, peer identity shows alias only, `unreadCount` reflects unread messages, empty list for no matches, only conversations where user is member returned
- [ ] T032 [US4] Integration test for full chat flow in `tests/integration/chat-flow.test.js` — test: create match between two users → User A opens chat → sees welcome message "你们互相点亮了对方，开始聊天吧 👋" → User A sends message → appears immediately with "发送中" → User B sees message within 30s → User B replies → User A sees reply → both see aliases (not real identity)

### Implementation for User Story 4

- [ ] T033 [US4] Reduce chat message page size from 100 to 50 in `cloudfunctions/api/index.js` `getMessages()` handler — change `.limit(100)` → `.limit(50)`; add cursor-based pagination for older messages
- [ ] T034 [US4] Add `since` parameter support for incremental polling in `cloudfunctions/api/index.js` `getMessages()` — accept optional `since` (ISO date string), filter `where({ createdAt: _.gt(since) })` for incremental fetch; maintain backward compatibility when `since` omitted
- [ ] T035 [US4] Update chat polling to use incremental fetch in `pages/chat/` — store `lastMessageTime` in page data, send as `since` parameter on each poll tick; only append new messages rather than replacing entire list
- [ ] T036 [US4] Replace `nickName` with `alias` in chat message display in `pages/chat/` and `components/chat-item/` — render sender alias ("同学#XXXX") instead of nickName; system messages styled distinctly (gray, centered)
- [ ] T037 [US4] UX audit — verify all chat states in `pages/chat/` — loaded (messages with aliases, fixed bottom input bar), loading (pending indicator on send), empty (system welcome message for first message), error (send failure with retry), edge ("加载更多" trigger at top when >50 messages)

**Checkpoint**: User Story 4 independently functional — chat works with 50-message pages, incremental polling, alias-only display, all UI states covered.

---

## Phase 7: User Story 5 — View My Posts (Priority: P3)

**Goal**: User can view all their created posts in a "我的帖子" section, ordered newest-first with like counts and status.

**Independent Test**: Create several posts, navigate to "我的帖子", verify all created posts appear with content, tags, like counts, and creation times.

### Tests for User Story 5 (MANDATORY — Write First, Ensure They FAIL) ⚠️

- [ ] T038 [P] [US5] Contract test for `getMyPosts` route in `tests/contract/getMyPosts.test.js` — cover: returns posts authored by current user newest-first, empty list for new user, does not return other users' posts, includes likeCount and commentCount
- [ ] T039 [US5] Integration test for my-posts flow in `tests/integration/my-posts.test.js` — test: create 3 posts → navigate to My Posts → all 3 visible with correct content/tags/likeCounts → create 4th post → appears at top → delete confirmation works

### Implementation for User Story 5

- [ ] T040 [US5] UX audit — verify My Posts states in `pages/profile/` (or dedicated my-posts view) — loaded (posts with like counts), loading (skeleton), empty ("还没有帖子" + CTA), error (retry), edge (end of list)
- [ ] T041 [US5] Add anonymous alias display to own posts in `pages/profile/` — show user's own alias ("同学#XXXX") on their posts so they see what others see

**Checkpoint**: User Story 5 independently functional — My Posts shows all user posts with correct ordering and anonymous alias.

---

## Phase 8: User Story 6 — Conversation List (Priority: P3)

**Goal**: User can view all matched conversations ordered by recent activity, with last message preview and unread badges.

**Independent Test**: Create multiple matches, send messages in each. Verify: conversation list shows all matches ordered by recent activity, correct last-message previews, unread badges.

### Tests for User Story 6 (MANDATORY — Write First, Ensure They FAIL) ⚠️

- [ ] T042 [US6] Integration test for conversation list flow in `tests/integration/conversation-list.test.js` — test: create 3 matches with different peers → send messages in conversations 1 and 3 → verify list ordered by recent activity → unread badge shows correct count on conversation with unread messages → tap conversation → enters chat → unread badge cleared

### Implementation for User Story 6

- [ ] T043 [US6] Replace `nickName` with `alias` in conversation list in `cloudfunctions/api/index.js` `getConversations()` — change peer object to use `alias` field; update response in `utils/cloud.js` wrapper
- [ ] T044 [US6] UX audit — verify conversation list states in `pages/messages/` — loaded (conversations with aliases, previews, unread badges), loading (skeleton), empty ("还没有匹配，去发现页点亮喜欢的帖子吧" + CTA), error (retry), edge (end of list)
- [ ] T045 [US6] Verify unread badge behavior in `pages/messages/` — badge shows correct count, cleared on entering chat, increments when new messages arrive while not in that conversation

**Checkpoint**: User Story 6 independently functional — conversation list with aliases, correct ordering, unread badges.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Full-system integration, performance validation, security audit, and Constitution compliance verification.

- [ ] T046 [P] Full-flow integration test in `tests/integration/full-core-flow.test.js` — complete sequence: User A opens app → browses feed → creates post → User B opens app → likes User A's post → User A likes User B's post → match detected → both notified → chat messages exchanged → verify no identity leaks at any step. Target: <3 minutes end-to-end.
- [ ] T047 [P] Performance benchmark validation — verify: Discover feed first page <2s (4G throttled), like UI feedback <200ms, cloud function reads <3s, writes <5s, chat message delivery <30s, match detection <5s. Document results in `specs/001-campus-anonymous-social/performance-benchmark.md`.
- [ ] T048 [P] Anonymous boundary privacy audit — manually inspect every API response and UI component: (a) no openId in any client-facing response, (b) post author identity never revealed before mutual match, (c) chat messages show alias only, (d) notification actors are null/anonymous unless matched, (e) location stored as geohash only, precise coordinates discarded. Document findings.
- [ ] T049 [P] UX state coverage audit on all six screens — verify each screen implements loaded, loading (skeleton cards), empty (illustration + prompt + CTA), error (friendly message + retry), and edge (end-of-list, validation) states. Reference quickstart.md Scenario 5 checklist. Fix any gaps found.
- [ ] T050 [P] Scroll performance optimization — verify 60fps scrolling on Discover feed, Conversation List, and Chat with >100 items. Batch `setData` calls in scroll handlers. Add virtual scrolling or WeChat `recycle-view` if needed for lists >200 items.
- [ ] T051 [P] Add remaining unit tests for utilities in `tests/unit/` — test: `utils/cloud.js` (callFunction wrapper, fallback behavior, error normalization), `utils/geo.js` (geohash computation, coordinate discard), `utils/time.js` (relative time formatting)
- [ ] T052 Constitution compliance review — verify all five Core Principles from `.specify/memory/constitution.md`:
  - I: All data through `api` cloud function via `utils/cloud.js` ✅, no hardcoded values ✅, structured errors ✅
  - II: All contract tests written and passing ✅, integration tests for full flow ✅
  - III: All five UI states on every screen ✅, anonymous boundary preserved ✅
  - IV: Optimistic UI everywhere ✅, pagination aligned ✅, incremental polling ✅
  - V: No openId leaks ✅, input validation on all writes ✅, no secrets in client ✅
  - Document any found violations
- [ ] T053 Run quickstart.md validation — execute all 7 scenarios from `specs/001-campus-anonymous-social/quickstart.md` and confirm they pass. Document any failures.
- [ ] T054 [P] Update project documentation in `docs/` — update `docs/database.md` with any schema changes (alias field, body limit change), add test run instructions to README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001–T005) — BLOCKS all user stories
- **User Stories (Phases 3–8)**: All depend on Foundational phase completion
  - US1 (Phase 3) and US2 (Phase 4) are both P1 — can proceed in parallel
  - US3 (Phase 5) depends on US2 (post creation needed to test mutual like)
  - US4 (Phase 6) depends on US3 (match needed to test chat)
  - US5 (Phase 7) and US6 (Phase 8) are P3 — can proceed in parallel after P1/P2
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
    ├── Phase 3: US1 (Browse Feed & Like) ← P1, no deps on other stories
    ├── Phase 4: US2 (Create Post) ← P1, no deps on other stories (can parallel with US1)
    │     ↓
    └── Phase 5: US3 (Mutual Match) ← P2, needs US1 + US2 (both like and create)
          ↓
          Phase 6: US4 (Chat) ← P2, needs US3 (match required)
    ├── Phase 7: US5 (My Posts) ← P3, needs US2 (post creation)
    └── Phase 8: US6 (Conversation List) ← P3, needs US3 (matches required)
                                                        ↓
                                          Phase 9: Polish
```

### Within Each User Story

- **Tests MUST be written FIRST** and verified FAILING before implementation (Red)
- Then implement the minimum to pass (Green)
- Then UX audit and cleanup (Refactor)
- Tests are marked [P] within a phase — all contract tests for a story can be written in parallel
- Implementation tasks within a story are ordered: cloud function changes → client utility changes → page/component changes → UX audit

### Parallel Opportunities

- All Setup tasks (T001–T005) marked [P] can run in parallel
- All Foundational tasks marked [P] (T008, T009) can run in parallel alongside T006, T007, T010, T011
- US1 and US2 (both P1) can run in parallel after Foundational completes
- All contract tests within a story phase are [P] — write them all at once
- US5 and US6 (both P3) can run in parallel after their dependencies are met
- All Polish tasks (T046–T054) marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Step 1: Write all US1 tests together (they should FAIL):
Task: T012 "Contract test for getDiscoverFeed in tests/contract/getDiscoverFeed.test.js"
Task: T013 "Contract test for likePost in tests/contract/likePost.test.js"

# Step 2: Implement cloud function changes:
Task: T015 "Replace nickName with alias in getDiscoverFeed()"

# Step 3: Implement client changes in parallel:
Task: T016 "Update post-card component to display alias"
Task: T018 "Verify optimistic like UI"

# Step 4: Integration + UX audit:
Task: T014 "Integration test for browse-and-like flow"
Task: T017 "UX audit Discover page five states"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 + US1 + US2)

1. Complete Phase 1: Setup (test infrastructure)
2. Complete Phase 2: Foundational (alias generation, pagination alignment)
3. Complete Phase 3: User Story 1 (browse feed, like posts with aliases)
4. Complete Phase 4: User Story 2 (create posts with profanity filter)
5. **STOP and VALIDATE**: Test US1 + US2 independently — feed loads with aliases, posts created anonymously, likes work
6. Demo if ready — this is a viable MVP (browse + create + like)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test independently → Demo (MVP: browse + post + like)
3. Add US3 → Test independently → Demo (MVP + matches)
4. Add US4 → Test independently → Demo (MVP + matches + chat — full core loop!)
5. Add US5 + US6 → Test independently → Demo (full feature set)
6. Polish phase → Final validation → Release candidate

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (browse feed + like)
   - **Developer B**: User Story 2 (create post)
3. Once US1 + US2 done:
   - **Developer A**: User Story 3 (mutual match)
   - **Developer B**: User Story 5 (my posts) — can start since US2 done
4. Once US3 done:
   - **Developer A**: User Story 4 (chat)
   - **Developer B**: User Story 6 (conversation list)
5. Both developers: Polish phase tasks in parallel

---

## Notes

- **Tests are MANDATORY per Constitution Principle II** — every cloud function route MUST have contract tests, every user journey MUST have integration tests
- **Red-Green-Refactor**: Tests MUST fail before implementation exists (Red) → implement minimum to pass (Green) → UX audit and cleanup (Refactor)
- [P] tasks = different files, no dependencies — can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The existing codebase already implements the walking skeleton — most tasks are about aligning with spec, adding tests, and auditing quality
- **Gap reference**: The seven gaps from plan.md are addressed by: T006 (alias), T010 (body 500), T011 (feed 20), T033 (chat 50), T020 (profanity), T012–T042 (all tests), T046 (integration test)
