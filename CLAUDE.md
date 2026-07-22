# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ing** is a WeChat Mini Program (微信小程序) for LBS-based semi-anonymous campus social networking. Users discover posts nearby, "light up" (like) posts they're interested in, and when two users mutually like each other, they match and can chat.

- **AppID**: `wx142330d0be83a460`
- **Cloud Env ID**: `cloud1-d3g3i3b996dd7dad5` (defined in `app.js`)
- **Mini Program base library**: `3.16.2`

## Development

Open the project root in **WeChat DevTools** (微信开发者工具). There is no build step, no package.json, and no bundler — this is a pure native mini program.

- **Cloud functions**:
  - `cloudfunctions/api/` — The unified API function. After editing, right-click in WeChat DevTools → "Upload and Deploy" (上传并部署). Depends on `wx-server-sdk` (install via right-click → "Install Dependencies" or `npm install` inside the function directory).
  - `cloudfunctions/initDB/` — One-shot database initialization: seeds universities, daily topics, and creates indexes. Run once on first deploy.
- **Cloud database** collections must be created manually in the cloud console. See `docs/database.md` for the full schema and recommended indexes.
- **Seed data**: `data/universities.seed.json` and `data/daily_topics.seed.json` can be imported into their respective collections.
- **Offline development**: When cloud is unavailable (wrong env ID, function not deployed, network issues), the frontend falls back to mock data from `utils/mock.js` for read operations. Write operations throw without fallback so users get clear error feedback.

## Architecture

### Backend: Unified Cloud Function

All backend logic is in a **single cloud function** `cloudfunctions/api/index.js`. It uses an `action`-based dispatcher pattern:

```
wx.cloud.callFunction({ name: "api", data: { action: "getDiscoverFeed", payload: {...} } })
```

The `handlers` object in `index.js` maps action names to async functions `(openid, payload) => result`. Each handler receives the authenticated `openid` from `cloud.getWXContext()`.

**Response convention**: `{ ok: true, data: {...} }` for success, `{ ok: false, code: "ERROR_CODE", message: "..." }` for failure.

**`cloud://` image URLs**: The cloud function recursively resolves `cloud://` file IDs to temporary HTTPS URLs before returning data (via `resolveFileUrlsInData`). On the client side, `utils/cloud.js` also has `resolveImageUrls()` as a fallback for when cloud function resolution doesn't cover a case.

### Frontend: API Layer with Mock Fallback

`utils/cloud.js` is the single frontend API module. Every page imports it as `const api = require("../../utils/cloud")`.

Two call patterns:
- **`callApi(action, data, fallback)`** — for reads: silently falls back to mock data if cloud is unavailable or the call fails
- **`callApiWrite(action, data)`** — for writes: throws on failure, no silent fallback

When adding a new API action:
1. Add the handler function in `cloudfunctions/api/index.js`
2. Add it to the `handlers` object
3. Add a wrapper function in `utils/cloud.js` (with mock fallback data if it's a read)
4. Export the wrapper from `utils/cloud.js`

### Authentication Flow

`app.js` calls `wx.cloud.init()` on launch, then `loginAndSyncProfile()` which creates or updates the user in the `users` collection based on their WeChat openid. Pages that need the current user call `getApp().ensureLogin()`.

### Privacy Model (Semi-Anonymous)

- Posts are visible to all in the discover feed (filtered by scope: city/university/friends)
- **Author identity is hidden** unless the viewer has mutually matched with the author
- **Liking a post** (`likePost`) is the core interaction — it's irreversible, and if the post author has also liked you back, a **match** is created
- Matching creates entries in both `matches` and `conversations` collections and sends notifications to both users
- Commenters' identities are hidden too, except for: yourself, the post author, and your matched friends

### Database Collections

10 collections: `users`, `universities`, `daily_topics`, `posts`, `likes`, `matches`, `conversations`, `messages`, `comments`, `notifications`, `reports`, `post_actions`. Full schema with field descriptions and index recommendations is in `docs/database.md`.

### Page Structure

Each page follows the standard WeChat mini program pattern: `index.js` (logic), `index.wxml` (template), `index.wxss` (styles), `index.json` (config).

10 pages registered in `app.json`:
| Page | Path | Purpose |
|------|------|---------|
| 看看 (Discover) | `pages/discover/index` | Card-swipe feed with scope filtering |
| 地图 (Map) | `pages/map/index` | Map view of nearby posts |
| 发布 (Publish) | `pages/publish/index` | Create new post |
| 消息 (Messages) | `pages/messages/index` | Conversation list + notifications |
| 我的 (Profile) | `pages/profile/index` | Current user's profile and posts |
| Settings | `pages/settings/index` | App settings |
| Post Detail | `pages/post-detail/index` | Single post with comments |
| Chat | `pages/chat/index` | 1-on-1 chat with a matched user |
| Notifications | `pages/notification-list/index` | Notification stream |
| User Profile | `pages/user-profile/index` | Other user's profile (only visible after match) |

### Reusable Components

- `post-card` — Card-style post display used in discover/map feeds
- `post-list-item` — List-style post display used in profile/my-posts
- `chat-item` — Single chat message bubble
- `notification-item` — Single notification row
- `topic-icon-picker` — Icon picker for post creation
- `visibility-selector` — Visibility selector for post creation

### Custom Tab Bar

The app uses a custom tab bar (`custom-tab-bar/`) with 5 tabs. The middle "发布" (Publish) tab is a center-emphasized button. Tab switching is done via `wx.switchTab()`.

### Key Utilities

- `utils/geo.js` — Haversine distance calculation, coarse geohash generation (rounded to 0.05° precision for privacy)
- `utils/time.js` — Relative time formatting (`fromNow`), chat time formatting
- `utils/constants.js` — University list, topic icons, visibility options, feed scopes, report reasons
- `utils/mock.js` — Comprehensive mock data for offline/local development

### UI Patterns

- **Design tokens** are CSS custom properties defined in `app.wxss` (surface, card, text, accent `#FFC107`, danger, border colors) plus reusable utility classes (`.page`, `.panel`, `.primary-btn`, `.ghost-btn`, `.chip`, `.input`, `.textarea`, `.hairline`, `.muted`).
- **Polling**: Chat page polls `getMessages` every 5 seconds while visible. Messages page polls conversations/notifications every 12 seconds. Both stop polling on `onHide()`/`onUnload()`.
- **Optimistic UI**: Like button, chat send, and comment send all update the UI immediately before server confirmation. Use local `_id` fields (e.g., `local_${Date.now()}`) for optimistic inserts.

### Spec & Planning Docs

The `specs/001-campus-anonymous-social/` directory contains the full feature specification, implementation plan, data model, API contracts, and a 54-task breakdown across 9 phases. These are the source of truth for requirements. There are currently no automated tests — the spec tasks plan for Jest (cloud function contract tests) and miniprogram-automator (integration tests) but these have not been implemented yet.

### Privacy Constraints

- Precise GPS coordinates are never stored long-term. The frontend uploads only a coarse `geoHash` (rounded to 0.05° grid).
- Sensitive write operations always go through the cloud function — the frontend never writes directly to core collections.
- Likes are irreversible (no unlike).
- Posts default to `status=visible`, `reviewStatus=pending` for MVP demo; content safety review should be added before production launch.
