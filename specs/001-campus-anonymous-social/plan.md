# Implementation Plan: Campus Anonymous Social (校园匿名社交)

**Branch**: `001-campus-anonymous-social` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-campus-anonymous-social/spec.md`

**Note**: This plan documents the existing implementation (already built per the master plan walking skeleton) and identifies gaps and changes needed to align with the completed spec.

## Summary

A WeChat Mini Program for college students to discover like-minded peers through anonymous posts. Core loop: browse anonymous feed → like posts → mutual like triggers match → anonymous chat. Built on WeChat Cloud Development (云开发) with a thin-client architecture where all data access routes through the unified `api` cloud function.

The existing codebase implements the full walking skeleton (Slices 1–6): Discover Feed, Post Creation, Like/Match detection, Chat, My Posts, and Conversation List. The implementation plan below documents the current state, identifies spec-alignment gaps, and defines the contracts and data model.

## Technical Context

**Language/Version**: WeChat Mini Program (JavaScript, ES2015+) with Node.js cloud functions

**Primary Dependencies**: 微信云开发 (wx.cloud SDK), wx-server-sdk (cloud functions)

**Storage**: 微信云开发 Cloud Database (JSON-document store)
- Collections: `users`, `posts`, `likes`, `matches`, `conversations`, `messages`, `notifications`, `comments`, `reports`, `post_actions`, `universities`, `daily_topics`

**Testing**: WeChat Mini Program automated testing (miniprogram-automator) + Jest for cloud function unit tests

**Target Platform**: WeChat Mini Program (iOS + Android, WeChat 8.0+)

**Project Type**: Mobile (Mini Program thin client) + Serverless backend (云开发 cloud functions)

**Performance Goals**: Sub-200ms UI acknowledgement, 60fps scrolling, <3s cloud function reads (cold start), <5s writes

**Constraints**: Main package <2MB, chat polling at 30s intervals, paginated lists, no direct client DB access

**Scale/Scope**: 6 core screens + 6 supporting screens, single-campus prototype, ~11 cloud function routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with each Core Principle from `.specify/memory/constitution.md`:

- [x] **I. Code Quality** — All data access through unified `api` cloud function via `utils/cloud.js`. Constants centralized in `utils/constants.js`. Structured `{ ok, code, data, message }` error responses on every route. ✅ **PASS**
- [x] **II. Test-First** — Mock layer exists (`utils/mock.js`) matching cloud DB schema. Contract and integration tests needed — see gaps below. ⚠️ **PARTIAL** (tests not yet written, mock layer exists)
- [x] **III. UX Consistency** — Five UI states defined across all screens via skeleton-card and empty-state components. Design tokens established in master plan §3.2. ⚠️ **AUDIT NEEDED** — verify all screens implement all five states, verify anonymous boundary in every response payload
- [x] **IV. Performance** — Optimistic UI for like, post, send. Pagination on feed (30 items) and chat (100 messages). Polling uses conversation-level polling. ⚠️ **PARTIAL** — chat pagination should be 50 per spec, feed pagination should be 20 per spec; scroll batching not yet verified
- [x] **V. Privacy & Security** — openId never surfaced in client responses; input validation on all write routes; no secrets in client code; collection permissions at restrictive defaults. ✅ **PASS** (verified by code review of `api/index.js`)

**Constitution Alignment Gaps (tracked for resolution):**

| Gap | Principle | Current State | Target State |
|-----|-----------|---------------|--------------|
| Anonymous alias format | III, V | Users display as `nickName` ("小黄灯") | Per spec: random anonymous alias "同学#1234" |
| Friend identity reveal | V | Matched users see each other's nickName + avatarUrl | Per spec: only anonymous alias visible until match; post-match identity reveal acceptable |
| Chat message page size | IV | 100 messages per fetch | 50 messages per page per spec (FR-011) |
| Feed page size | IV | 30 posts per fetch | 20 posts per page per spec (FR-001) |
| Contract tests | II | No tests exist | Mandatory per constitution |
| Integration test | II | No tests exist | Mandatory per constitution |
| Content profanity filter | V | Not implemented | Basic keyword filter per spec (FR-006) |

### Post-Design Re-Evaluation (Phase 1 Complete)

After completing data-model.md, contracts/api-contracts.md, and quickstart.md:

- [x] **I. Code Quality** — Data model documents all 11 collections with field types, validation rules, and state transitions. API contracts specify exact request/response schemas with error codes. ✅ **CONFIRMED**
- [x] **II. Test-First** — Contract test cases defined for every cloud function route in contracts/api-contracts.md. Integration test scenarios defined in quickstart.md. Test infrastructure not yet scaffolded — this becomes the first task in `/speckit-tasks`. ✅ **PLAN READY**
- [x] **III. UX Consistency** — All six spec user stories mapped to existing pages. Five-state audit checklist included in quickstart.md (Scenario 5). Anonymous boundary verified in all API response contracts (no openId in client payloads, alias-only for non-matched users). ✅ **CONFIRMED**
- [x] **IV. Performance** — Pagination targets documented (20 feed, 50 chat) with gap from current values (30 feed, 100 chat). Optimistic UI pattern confirmed in existing codebase. Polling strategy documented in research.md (RQ2). ✅ **CONFIRMED**
- [x] **V. Privacy & Security** — Anonymous alias generation documented (RQ3). Location privacy preserved (geohash only, coordinates discarded). All write routes validated in contracts. Profanity filter gap tracked. ✅ **CONFIRMED**

**Post-Design Verdict**: All five principles are satisfied or have actionable gaps. No new violations introduced by the data model or API contract design. The seven gap items in the table above become implementation tasks for `/speckit-tasks`.

## Project Structure

### Documentation (this feature)

```text
specs/001-campus-anonymous-social/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
# WeChat Mini Program + 云开发 (existing)
pages/
├── discover/            # Discover Feed (P1) ✅ built
├── publish/             # Create Post (P1) ✅ built
├── chat/                # 1-on-1 Chat (P2) ✅ built
├── messages/            # Conversation List (P3) ✅ built
├── profile/             # My Posts via profile ✅ built
├── post-detail/         # Post detail + comments ✅ built
├── notification-list/   # Notifications ✅ built
├── map/                 # Map view (bonus feature) ✅ built
├── user-profile/        # Other user profile ✅ built
└── settings/            # Settings ✅ built

components/
├── post-card/           # Post card (feed item) ✅ built
├── post-list-item/      # Post list variant ✅ built
├── chat-item/           # Chat message bubble ✅ built
├── notification-item/   # Notification row ✅ built
├── topic-icon-picker/   # Tag/icon picker ✅ built
└── visibility-selector/ # Post visibility control ✅ built

cloudfunctions/
└── api/                 # Unified API cloud function ✅ built
    ├── index.js         # Route dispatcher + all handlers
    └── package.json

utils/
├── cloud.js             # callFunction wrapper ✅ built
├── constants.js         # Config (env IDs, universities, tags) ✅ built
├── mock.js              # Local mock data ✅ built
├── geo.js               # Geolocation utility ✅ built
└── time.js              # Time formatting ✅ built

data/                    # Seed/mock data ✅ built
├── universities.import.json
├── daily_topics.import.json
├── posts.import.json
└── users.import.json

custom-tab-bar/          # Custom tab bar ✅ built
icons/                   # SVG icons ✅ built
docs/
└── database.md          # Collection schema reference ✅ built
```

**Structure Decision**: The existing project follows the constitution-mandated pattern perfectly — pages for UI, `cloudfunctions/api` for all back-end logic, `utils/cloud.js` as the single client-to-cloud bridge. No structural changes are needed. The plan adds `tests/` directory for contract/integration/unit tests (not yet present) and the `specs/` documentation tree.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations requiring justification. All constitution principles are either satisfied or tracked as actionable gaps above (missing tests, alignment tweaks to pagination sizes and alias format).
