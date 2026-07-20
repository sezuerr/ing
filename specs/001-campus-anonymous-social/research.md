# Research: Campus Anonymous Social (校园匿名社交)

**Created**: 2026-07-20 | **Plan**: [plan.md](./plan.md)

## Research Questions

### RQ1: WeChat Cloud Development (云开发) — Best Practices for Anonymous Social App

**Decision**: Use WeChat Cloud Development (微信云开发) as the sole backend infrastructure.

**Rationale**:
- Native integration with WeChat Mini Program — no separate authentication, seamless `wx.cloud.callFunction` for serverless logic
- Cloud Database provides JSON-document storage with built-in permissions and real-time watchers
- `wx.login()` provides `openId` server-side via `cloud.getWXContext()`, enabling anonymous identity tracking without user registration
- No external server or domain required — all traffic stays within WeChat's ecosystem, simplifying deployment and review

**Alternatives Considered**:
- **Self-hosted backend (Node.js/Express + MongoDB)**: More control but requires separate deployment, HTTPS domain, and authentication bridge. Rejected for prototype velocity.
- **Firebase + WeChat**: Works but adds cross-platform complexity, and Firebase is blocked in mainland China. Rejected for reliability.
- **Supabase**: Good developer experience but not tailored for WeChat ecosystem. Rejected for integration friction.

**Implementation Notes**:
- Cloud function cold starts average 200-800ms on 云开发 free tier — acceptable within the 3s read budget
- Database queries in cloud functions use admin privileges — collection permissions are kept at restrictive defaults ("仅创建者可读写") as an additional security layer
- Cloud Database supports `db.command` operators (`_.inc`, `_.all`, `_.in`) used extensively in the existing `api/index.js`

---

### RQ2: Chat Real-Time Delivery — Polling vs Database Watchers

**Decision**: Use 30-second polling for chat message delivery in the walking skeleton, with incremental fetch.

**Rationale**:
- 云开发 database watchers (`db.collection().watch()`) provide real-time updates but have reliability issues on the free tier (connection drops, high latency on cold start)
- 30-second polling with incremental fetch (`only messages newer than last-known createdAt`) keeps bandwidth low while providing acceptable "near real-time" feel
- The existing `getMessages` route already fetches all messages for a conversation — the incremental polling optimization (`since` parameter) is a small modification

**Alternatives Considered**:
- **WebSocket (wss://)**: Best real-time experience but requires separate infrastructure outside 云开发. Rejected for prototype scope per master plan R4.
- **Database watchers**: Ideal when reliable — can be enabled as a progressive enhancement without changing the client API. Deferred to post-MVP.
- **Short-interval polling (3-5s)**: Too aggressive — burns cloud function quota and drains battery. Rejected for resource budget.
- **Long-interval polling (60s+)**: Too slow — messages feel delayed. Rejected for UX quality.

**Implementation Notes**:
- Client stores `lastMessageTime` per conversation and sends it as `since` parameter to `getMessages`
- Server returns only messages with `createdAt > since`, plus marks messages as read
- The poll timer resets on screen visibility (`onShow`/`onHide`) to avoid background polling

---

### RQ3: Anonymous Alias Generation

**Decision**: Generate anonymous aliases in the format "同学#XXXX" where XXXX is a 4-digit random number, assigned once per user at profile creation and stored in the `users` collection.

**Rationale**:
- Consistent anonymous identity across posts by the same author without revealing real identity
- The 4-digit suffix provides distinguishability (10,000 combinations) without being guessable
- Alias is stored server-side and returned in post/chat payloads — client never computes it

**Alternatives Considered**:
- **Random emoji + adjective (e.g., "开心的🐱")**: More personable but risks collisions and inconsistency. Rejected for predictability.
- **Sequential numbering**: Predictable and exposes user count. Rejected for privacy.
- **No alias — fully anonymous posts**: Makes it impossible to recognize posts by the same author, reducing feed coherence. Rejected for UX quality.

**Implementation Notes**:
- Alias is generated once in `ensureUser()` and never changes
- The existing codebase uses `nickName` ("小黄灯") — this needs migration to the "同学#XXXX" format
- For already-matched users, revealing the matched user's alias is sufficient — no additional identity disclosure needed

---

### RQ4: Location — City-Level Coarse Location

**Decision**: Use WeChat's `wx.getLocation()` to obtain lat/lng, convert to city-level geoHash (precision 4-5 chars), discard precise coordinates.

**Rationale**:
- City-level precision (~20km radius) is sufficient for "同城" (same-city) filtering
- Discarding precise coordinates after geohash computation satisfies privacy constraints
- WeChat's location API requires user consent with scope explanation — aligns with spec requirement

**Alternatives Considered**:
- **IP-based city detection**: No permission needed but inaccurate on mobile networks (shows provincial capital, not actual city). Rejected for accuracy.
- **Manual city selection**: Privacy-friendly but adds friction to onboarding. Used as fallback when location permission is denied — already supported in the spec.
- **Campus-based scoping via university list**: More targeted but requires university data and manual selection. The existing codebase already supports this via `universities` collection — good supplementary filter.

**Implementation Notes**:
- `utils/geo.js` already handles geohash computation
- `cityCode` field in `users` collection stores the coarse location
- Feed filtering uses `cityCode` matching (same-city) or `universityId` matching (same-campus)

---

### RQ5: Content Profanity Filter (MVP)

**Decision**: Implement a basic keyword-blocklist filter in the `createPost` cloud function route for MVP. Full 微信内容安全 API integration is a prerequisite for public distribution.

**Rationale**:
- Simple keyword matching is fast (<1ms) and requires no external API call — no cold start impact
- The keyword list can be maintained in a cloud database collection or configuration file
- 微信内容安全 API (`security.msgSecCheck`) requires an additional cloud function call and may add 200-500ms latency — acceptable but deferred to post-MVP

**Alternatives Considered**:
- **No filter in MVP**: Risky — offensive content in a demo undermines the product's value. Rejected.
- **Full 微信内容安全 API now**: Adds complexity and latency. The spec explicitly notes this as pre-public-distribution, not MVP. Deferred.
- **AI-based moderation**: Overkill for prototype. Rejected for scope.

**Implementation Notes**:
- Keyword list stored in `utils/constants.js` (client-visible for immediate UI validation) and duplicated/verified server-side in `api/index.js`
- Server-side validation is authoritative — client-side filtering is UX-only
- Flagged posts set `reviewStatus = 'flagged'` but remain `status = 'visible'` in MVP (admin review is out-of-band)

---

### RQ6: Pagination Strategy

**Decision**: Cursor-based pagination using `createdAt` timestamps for feed and chat, with fixed page sizes (20 for feed, 50 for chat).

**Rationale**:
- Cursor-based pagination avoids offset drift when new items are inserted (critical for real-time feeds)
- Aligns with 云开发 query capabilities (`.orderBy('createdAt', 'desc').limit(N).where({ createdAt: _.lt(cursor) })`)
- Fixed page sizes match spec requirements (FR-001: 20 posts, FR-011: 50 messages)

**Implementation Notes**:
- The existing feed fetches 30 posts without cursor — change to 20 with cursor-based pagination
- The existing chat fetches 100 messages — change to 50 with `since` parameter for incremental polling

---

## Technology Stack Summary

| Layer | Choice | Status |
|-------|--------|--------|
| Client Runtime | WeChat Mini Program (WXML + WXSS + JS) | ✅ Existing |
| Backend | 微信云开发 Cloud Functions (Node.js) | ✅ Existing |
| Database | 微信云开发 Cloud Database (JSON documents) | ✅ Existing |
| Auth | WeChat Login (`wx.login` → `openId`) | ✅ Existing |
| Real-Time Chat | 30s polling with incremental fetch | ✅ Existing (minor tuning) |
| Location | `wx.getLocation` → geohash → city filtering | ✅ Existing |
| Content Filter | Keyword blocklist (MVP), 微信内容安全 API (post-MVP) | ⚠️ Needs implementation |
| Testing | miniprogram-automator + Jest | ⚠️ Not yet set up |

---

## Resolved Clarifications

No unresolved clarifications. All design decisions are documented above with rationale and implementation notes.
