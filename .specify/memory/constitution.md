<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (greenfield)
  Added sections:
    - Core Principles (I–V)
    - Security & Privacy Constraints
    - Development Workflow & Quality Gates
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md    ✅ updated (Constitution Check aligned, project structure updated)
    - .specify/templates/spec-template.md    ✅ reviewed (no changes needed — template is technology-agnostic)
    - .specify/templates/tasks-template.md   ✅ updated (tests made mandatory, Constitution compliance tasks added)
    - .specify/templates/checklist-template.md ✅ reviewed (no changes needed — generic checklist format)
  Follow-up TODOs: None — all placeholders filled.
-->

# ING Constitution

## Core Principles

### I. Code Quality & Maintainability

All code in this project MUST adhere to the following non-negotiable standards:

- **Single responsibility per module.** Each page, component, and cloud function MUST have one clear purpose. Pages handle UI and local state; cloud functions handle data access and business logic — never mix the two.
- **Consistent patterns.** All data access MUST route through the unified `api` cloud function via `utils/cloud.js`. No direct `wx.cloud.database()` calls in page or component code. No ad-hoc cloud function invocations outside the established `callFunction(name, data)` wrapper.
- **No hardcoded values.** Environment IDs, collection names, rate-limit thresholds, and tag lists MUST be defined in a single configuration surface (`utils/constants.js` or equivalent). Magic strings in cloud function routes or page logic are forbidden.
- **Naming clarity.** Variables, functions, cloud function routes, and collection names MUST use descriptive, self-documenting names. Avoid abbreviations unless they are universally understood in the WeChat ecosystem (e.g., `openId` is acceptable; `usrId` is not).
- **Error handling is mandatory.** Every cloud function route MUST return a structured `{ code, data, message }` response. Every page MUST handle the loading, empty, error, and success states for every async operation. No silent failures.

**Rationale:** The existing codebase already follows the unified `api` cloud function pattern. Deviations from this pattern create split-brain data access, inconsistent error handling, and maintenance burden. Enforcing consistency keeps the 6-slice walking skeleton buildable on schedule.

### II. Test-First Development (NON-NEGOTIABLE)

Tests are not optional. The following discipline MUST be followed for every feature:

- **Write tests before implementation.** For every cloud function route, write a contract test first that validates the expected input schema, output schema, and error conditions. For every user-facing flow, write an integration test that exercises the full journey end-to-end.
- **Red-Green-Refactor cycle.** Tests MUST fail before the implementation exists (Red) → implement the minimum code to pass (Green) → clean up without changing behavior (Refactor).
- **Contract tests for cloud functions.** Each route in the `api` cloud function (`posts.list`, `posts.create`, `likes.toggle`, `messages.send`, `messages.list`, match detection logic) MUST have a contract test covering: valid input → expected output, missing required fields → error response, invalid data → error response.
- **Integration tests for user journeys.** The core demo flow (browse → post → like → match → chat) MUST have an integration test that executes the full sequence and verifies each state transition.
- **Mock boundary is explicit.** Cloud database calls in tests MUST use a documented mock layer. The mock MUST simulate the same document structure, query operators, and watch/polling behavior as the real 云开发 database. Tests that pass against mocks but fail against the real cloud environment are treated as test bugs, not implementation bugs.

**Rationale:** The master plan defines a walking skeleton with specific success criteria: the full flow must complete without crashes, mutual-like detection must fire correctly (never on single-sided like), and the anonymous boundary must be preserved. Contract tests on cloud function routes and integration tests on user journeys are the only way to guarantee these invariants hold after every change.

### III. User-Experience Consistency

Every screen MUST deliver a coherent, predictable experience that matches the design language defined in the master plan (§3):

- **State coverage is mandatory.** Every screen MUST implement all defined states: default/loaded, loading (skeleton cards, not spinners), empty (illustration + prompt + CTA), error (friendly message + retry action), and edge cases (end-of-list divider, validation states, sending/pending indicators). Refer to master plan §3.6 for the canonical state list per screen.
- **Design token adherence.** Colors, spacing, typography, border radii, and iconography MUST match the master plan spec (§3.2): system font at 14–16px body size, warm accent color on neutral background, soft rounded corners, generous whitespace, simple line icons with consistent stroke weight.
- **Interaction patterns are uniform.** All async operations show a brief loading indicator. All destructive actions require confirmation. All pull-to-refresh and pull-to-load-more behaviors work identically across screens. The chat input bar is fixed at the bottom — mirroring WeChat's native chat UX per master plan §3.3.
- **Anonymous-first at every touchpoint.** No screen, component, or data payload MAY expose a user's openId, real identity, or post authorship before a mutual match. The anonymous alias (e.g., "同学#1234") is the only user-facing identifier. Violating this is a blocking defect.
- **Copy and tone.** All user-facing text MUST use the warm, casual, peer-to-peer tone specified in master plan §3.1. No dating-app language, no corporate jargon, no cold or robotic system messages.

**Rationale:** The prototype's core value proposition — "anonymity lowers the barrier to connection" — is undermined if any screen breaks the anonymous boundary or feels inconsistent. A user who encounters a blank screen, a raw error message, or an unmasked identity will abandon the product. Consistency across the 6-screen inventory (§3.4) is what makes the prototype feel like a real product, not a tech demo.

### IV. Performance-First Architecture

Performance is a feature, not an afterthought. The following constraints apply:

- **Sub-second UI feedback.** Taps on like buttons, post creation, and message send MUST acknowledge the user's action within 200ms (optimistic UI update + background sync). The user MUST never wait for a network round-trip before seeing their own action reflected.
- **Cloud function cold-start budget.** Cloud function invocations (including cold starts) MUST complete within 3 seconds for read operations and 5 seconds for write operations. If a route exceeds this budget, it MUST be profiled and optimized before the slice is considered done.
- **Pagination is mandatory.** No endpoint may return unbounded result sets. The Discover Feed, My Posts, Conversation List, and Chat message history MUST all paginate (20 items per page for feeds, 50 for chat messages). The "load more" trigger MUST appear before the user reaches the end of the loaded set.
- **Chat polling efficiency.** If 云开发 database watchers are unavailable or unreliable, polling MUST use a 30-second interval with incremental fetch (only messages newer than the last-known `created_at`). Never re-fetch the entire conversation on every poll tick.
- **Bundle size awareness.** The mini program's total package size MUST stay under 2MB (WeChat's upload limit for sub-packages is 2MB each; the main package limit is 2MB). No dependency may be added without justifying its size cost. Unused code paths (debug logs in production, dead UI components) MUST be tree-shaken or conditionally compiled out.
- **60fps scrolling.** The Discover Feed, Conversation List, and Chat message list MUST maintain smooth scrolling without jank. `setData` calls in scroll handlers MUST be throttled or batched. Large lists MUST use virtual scrolling or WeChat's `recycle-view` if performance degrades beyond 100 items.

**Rationale:** WeChat Mini Programs run on constrained mobile devices with cold-start cloud functions. Users abandon apps that feel sluggish. The master plan's success criteria include "a user unfamiliar with the product can complete the core demo flow in under 3 minutes" (§2.7) — performance friction directly eats into this time budget.

### V. Privacy & Security by Default

The anonymous-first product principle MUST be enforced by technical constraints:

- **Cloud function gate for all data access.** The client MUST never read from or write to cloud database collections directly. All data access goes through the `api` cloud function, which runs with admin privileges. Collection-level permissions MUST remain at their restrictive defaults ("仅创建者可读写").
- **openId is never surfaced.** The WeChat openId is used internally for like tracking, match detection, and message routing. It MUST never appear in a client-facing API response, a post object, a chat message payload, or any UI component. The anonymous alias is the only public identifier.
- **Input validation on every write.** Before any cloud function writes to the database, it MUST validate: text length (≤500 chars for posts), tag count (1–3), required fields present, and content safety (basic profanity filter from Slice 5). Invalid input MUST be rejected with a structured error response — never silently truncated or accepted.
- **No secrets in client code.** Cloud environment IDs, API keys, and sensitive configuration MUST be defined server-side or in `project.config.json` (which is not committed). The client reads the environment ID from `app.js` globalData only — and that value MUST be overridable per environment without code changes.

**Rationale:** The master plan §4.7 defines specific privacy and security constraints. The anonymous boundary is the product's defining feature — a data leak that exposes an openId or post authorship before a mutual match is an existential defect, not a minor bug.

## Security & Privacy Constraints

These constraints derive from master plan §4.7 and the README's "重要约定":

- No real user data (names, phone numbers, emails, student IDs) is collected or stored.
- No precise geolocation is persisted — the frontend uploads only coarse `geoHash`; precise lat/lng is discarded after geohash computation.
- Sensitive write operations (post creation, like toggling, match creation, message sending) are executed exclusively through cloud functions.
- Posts default to `status=visible`, `reviewStatus=pending` for MVP demonstrations. Before public distribution, content safety review MUST be integrated (微信内容安全 API).
- Likes are irrevocable ("点亮不可撤销") — the `likes.toggle` route MUST enforce this constraint server-side, not rely on client UI to prevent double-toggling.
- Matches are permanent in the walking skeleton (no unmatch in Slices 1–4). The unmatch flow is introduced in Slice 5 and MUST archive the conversation rather than delete data, preserving an audit trail.

## Development Workflow & Quality Gates

- **Slice-level gates.** Each master plan slice (§5) MUST pass its "Done when" criteria before the next slice begins. No carry-over of incomplete work. The Slice 6 "Polish + Demo Readiness" criteria — full flow without crashes, blank screens, or unclear error states — apply retroactively to all prior slices at integration time.
- **Constitution check on every plan.** Every implementation plan (generated by `/speckit-plan`) MUST include a Constitution Check section that verifies each of the five Core Principles. Violations require explicit justification in the Complexity Tracking table, including why a simpler conforming alternative was rejected.
- **Code review requirements.** Every cloud function route change MUST be reviewed for: (a) structured `{ code, data, message }` response format, (b) input validation completeness, (c) openId not leaked in response, (d) pagination support for list endpoints. Every page/component change MUST be reviewed for: (a) all five UI states covered, (b) design token adherence, (c) optimistic UI updates for mutative actions.
- **Mock fidelity.** The local mock data layer (`data/` and mock mode in `api` cloud function) MUST stay in sync with the cloud database schema. When a collection schema changes, the corresponding mock seed data MUST be updated in the same commit. The mock mode is the primary development environment — it MUST faithfully simulate the cloud behavior.
- **Commit discipline.** Commits MUST be atomic and well-described. Each commit message MUST reference the slice or task it belongs to. No commits that mix unrelated changes (e.g., a "fix typo" commit that also refactors a cloud function route).

## Governance

This Constitution supersedes all other development practices, conventions, and ad-hoc rules in this project. Where a practice in CLAUDE.md, README.md, or any other project file conflicts with this Constitution, the Constitution takes precedence.

**Amendment procedure:**
1. Propose the amendment with rationale in a document referenced from the change.
2. Update this Constitution file with the new or modified principle.
3. Increment the version number per semantic versioning rules (MAJOR: principle removal or redefinition; MINOR: new principle or section added; PATCH: clarification or wording improvement).
4. Update the Sync Impact Report at the top of this file.
5. Propagate changes to dependent templates (plan, spec, tasks, checklist) in `.specify/templates/`.
6. Verify no downstream artifacts (existing specs, plans, task lists) are invalidated by the change.

**Compliance review:** Every feature completion (when a master plan slice is marked done) MUST include a review against this Constitution. Non-compliance discovered during review MUST be resolved before the slice is considered complete. Complexity that violates a principle MUST be explicitly justified in the implementation plan's Complexity Tracking table.

**Version:** 1.0.0 | **Ratified:** 2026-07-20 | **Last Amended:** 2026-07-20
