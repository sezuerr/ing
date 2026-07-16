# Planning Rules

These rules govern how the `build-plan` skill reasons, decides, and writes. They exist to prevent common planning failures and ensure the master plan is honest, minimal, and useful.

---

## Rule 1: Never Hard-Code Pathways

The skill must never embed specific technology choices into its instructions. Technology selection must happen at invocation time, using only the pathways explicitly supplied by the user.

**Correct:**
> "Select one from the supplied pathways: [React + Firebase, Next.js + Supabase]"

**Incorrect:**
> "Use React + Firebase."

If no pathway list is supplied, the skill must ask before proceeding to architecture selection.

---

## Rule 2: Prefer the Smallest Architecture

Always recommend the simplest architecture that demonstrates the core user flow end-to-end. Do not add layers or services because they might be needed later.

**Ask before adding any component:**
> "Does the walking skeleton require this, or is it speculative?"

If the answer is speculative, exclude it and note it as a potential future need.

---

## Rule 3: Do Not Invent Features

The master plan must only address features and flows explicitly described in the Concept-to-Build Brief. If a feature seems implied but is not stated, label it as a **Recommendation** and flag it for team confirmation.

Never add features because they seem natural, professional, or expected for the domain.

---

## Rule 4: Default to Mock

For any component that is not strictly required for the walking skeleton, default to mocking it. This applies especially to:

- External APIs
- Authentication and user accounts
- Live AI / LLM calls
- Notifications and messaging
- Analytics and logging
- Payment systems
- Backend services

A mock must be clearly described: what it replaces, what it returns, and how it would be replaced in a later phase.

---

## Rule 5: No Uninvited Infrastructure

The following must NOT be introduced unless the brief explicitly demonstrates the dependency:

| Component | Condition for inclusion |
|-----------|------------------------|
| User login / authentication | Brief requires user-specific persistent data |
| Backend / server | Brief requires shared data, auth, or server-side logic |
| Shared storage / database | Brief requires data to persist across sessions or users |
| Live AI / LLM | Brief identifies AI as a core feature with a specific, non-mockable role |
| Analytics | Brief states tracking as a requirement |
| Push notifications | Brief describes a time-sensitive or background alert feature |
| Multi-platform support | Brief explicitly targets more than one platform |
| Payment | Brief describes a transaction flow |

If a reviewer adds one of these without the dependency being present in the brief, that is a planning error.

---

## Rule 6: Separate Evidence from Recommendation

Every statement in the master plan must be clearly attributed to one of four sources:

| Label | Meaning |
|-------|---------|
| **Evidence** | Stated in the brief as validated or observed |
| **Team decision** | Explicitly decided by the team in the brief |
| **Assumption** | Accepted working assumption, not yet validated |
| **Recommendation** | Suggested by this skill, not in the brief |

Recommendations must be clearly marked and require team confirmation before being treated as decisions.

---

## Rule 7: One Pathway, One Architecture Pattern

The skill selects exactly one approved pathway and exactly one architecture pattern. It does not present multiple options and ask the user to choose—it makes a recommendation and explains why.

The recommendation must include:
- Which pathway was selected
- Why it fits the brief better than the alternatives
- What trade-offs are accepted by choosing it

---

## Rule 8: Clarify Only When It Matters

The skill may ask clarifying questions, but only when the answer would materially change one or more of:

- The scope of the walking skeleton
- The architecture pattern
- The data model or storage approach
- Whether authentication is needed
- Whether AI is a core or optional feature
- The core user flow

Do not ask about visual style, copy text, naming, branding, or implementation details.

---

## Rule 9: Walking Skeleton is the Anchor

Every milestone and architectural decision should be justified by whether it contributes to delivering the walking skeleton. If a decision does not contribute to the skeleton, it must either be deferred or explicitly justified as enabling a required later slice.

The walking skeleton definition in the plan must be:
- Specific (describes exact screens or states)
- Minimal (not a feature list)
- End-to-end (touches every layer the final product will touch)
- Demonstrable (can be shown to a user in a session)

---

## Rule 10: Master Plan is Not an SDD

The master plan must not contain:

- Acceptance criteria or test cases
- Detailed user stories or functional requirements
- API endpoint definitions
- File or module structure designs
- Implementation tasks or developer assignments
- Database schema SQL or code

These belong to the Specification-Driven Development (SDD) phase. The master plan hands off to SDD via the Handoff section.

---

## Rule 11: Self-Check Before Finalising

Before writing the final master-plan.md, the skill must check:

1. **Invented features** — Is every feature in the plan traceable to the brief?
2. **Unnecessary infrastructure** — Has each architectural component passed Rule 5?
3. **Mock clarity** — Is every mock described with what it replaces and what it returns?
4. **AI scope** — If AI is included, is it bounded and mockable?
5. **Walking skeleton focus** — Does the plan stay focused on the skeleton, not the full product?

If any check fails, revise before outputting.

---

## Rule 12: Milestones Are Slices, Not Phases

Milestones in the master plan should be development slices—each one adds a vertical strip of functionality to the running application. They are not horizontal phases (e.g., "backend", "frontend", "testing").

Each slice should:
- Be independently deployable (or demonstrable)
- Build on the previous slice
- Be small enough to complete in 1–3 days
- Not exceed 5–6 slices total for a prototype plan
