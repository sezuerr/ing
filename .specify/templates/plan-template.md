# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: WeChat Mini Program (JavaScript, ES2015+)

**Primary Dependencies**: 微信云开发 (wx.cloud SDK), 微信云开发 Cloud Functions (Node.js)

**Storage**: 微信云开发 Cloud Database (JSON-document store, collections: posts, likes, matches, conversations, messages, users)

**Testing**: WeChat Mini Program automated testing framework (miniprogram-automator) + Jest for cloud function unit tests

**Target Platform**: WeChat Mini Program (iOS + Android, WeChat 8.0+)

**Project Type**: Mobile (Mini Program thin client) + Serverless backend (云开发 cloud functions)

**Performance Goals**: Sub-200ms UI acknowledgement for user actions, 60fps scrolling, <3s cloud function response (cold start included for reads), <5s for writes

**Constraints**: Main package <2MB, chat polling at 30s intervals, paginated lists (20 items/feed page, 50 messages/page), no direct client DB access

**Scale/Scope**: 6 screens (Discover Feed, Create Post, My Posts, Match Notification, Chat, Conversation List), single-campus scope for prototype

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with each Core Principle from `.specify/memory/constitution.md`:

- [ ] **I. Code Quality** — All data access through unified `api` cloud function via `utils/cloud.js`? No hardcoded values? Structured `{ code, data, message }` error responses on every route?
- [ ] **II. Test-First** — Contract tests written for each cloud function route before implementation? Integration test covering the full demo flow (browse → post → like → match → chat)? Mock layer matches cloud DB schema?
- [ ] **III. UX Consistency** — All five UI states (default, loading, empty, error, edge) defined for every screen? Design tokens match master plan §3.2? Anonymous boundary preserved in every response payload?
- [ ] **IV. Performance** — Optimistic UI updates for mutative actions (like, post, send)? Pagination on all list endpoints? Polling uses incremental fetch? `setData` calls batched in scroll handlers?
- [ ] **V. Privacy & Security** — No openId in client-facing responses? Input validation on every cloud function write route? No secrets in client code? Collection permissions at restrictive defaults?

*Any violation MUST be recorded in the Complexity Tracking table below with explicit justification.*

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# WeChat Mini Program + 云开发 (project root)
pages/                  # Mini Program page screens
├── discover/           # Discover Feed
├── create-post/        # Create Post
├── my-posts/           # My Posts
├── chat/               # 1-on-1 Chat
├── conversations/      # Conversation List
└── match/              # Match Notification

components/             # Reusable UI components
├── post-card/          # Post card (feed item)
├── tag-chip/           # Interest tag selector
├── skeleton-card/      # Loading skeleton placeholder
└── empty-state/        # Empty state with illustration + CTA

cloudfunctions/         # Cloud function (serverless backend)
└── api/                # Unified API cloud function
    ├── index.js        # Route dispatcher
    ├── routes/         # Route handlers (posts, likes, matches, messages)
    └── package.json

utils/                  # Shared client utilities
├── cloud.js            # wx.cloud.callFunction wrapper
├── constants.js        # Config values (env IDs, collection names)
└── mock.js             # Local mock data layer

data/                   # Seed/mock data
├── universities.seed.json
├── daily_topics.seed.json
└── posts.seed.json

tests/                  # Test suites
├── contract/           # Cloud function contract tests
├── integration/        # End-to-end user journey tests
└── unit/               # Utility and component unit tests

docs/                   # Project documentation
├── database.md         # Collection schema reference
└── quickstart.md       # Setup and run guide
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
