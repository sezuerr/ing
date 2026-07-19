# Concept-to-Build Brief Schema

This document defines the expected structure of a Concept-to-Build Brief passed to the `build-plan` skill. The brief does not need to follow this exact format, but all fields should be addressed somewhere in the document.

---

## Required Fields

### 1. Problem

**What it captures:** The core problem the product is solving and who experiences it.

- Describe the pain point or unmet need
- Identify the context in which the problem occurs
- State why existing solutions are inadequate (if relevant)

**Example:**
> Students struggle to find reliable peer notes before exams because there is no trusted campus-specific sharing platform.

---

### 2. User

**What it captures:** The primary user of the product.

- One primary user persona (name, role, context)
- Key characteristics relevant to the product
- Secondary users or stakeholders if they affect scope

**Example:**
> Primary: Undergraduate student (Year 1–3) at a mid-size university, mobile-first, shares notes casually via group chats today.

---

### 3. Evidence

**What it captures:** What is validated vs. assumed.

- User research findings (interviews, surveys, observations)
- Market or usage data
- Prototype test results
- Explicit distinction between validated evidence and working assumptions

**Example:**
> Validated: 8/10 students interviewed said they search for notes the night before an exam.
> Assumed: Students are willing to upload their own notes publicly.

---

### 4. Core Journey

**What it captures:** The single most important user flow that demonstrates value.

- One primary scenario from start to success
- Should be demonstrable in a prototype
- No branching paths—just the happy path

**Example:**
> Student opens app → searches for a course → finds a recent note → reads it → saves it to their collection.

---

### 5. Priorities

**What it captures:** What the team has decided matters most for this phase.

- Ordered list of priorities (what must work, what is nice-to-have)
- Any hard constraints (time, team size, technology)
- Explicit trade-offs accepted by the team

**Example:**
> 1. Core search and view flow must work
> 2. Upload is secondary
> 3. Constraint: 3-week build, 2 developers

---

### 6. Walking Skeleton

**What it captures:** The minimal end-to-end slice that proves the concept works.

- The smallest feature set that touches every layer
- Not a full MVP—just enough to show the core flow
- What "done" looks like for the skeleton

**Example:**
> A user can search by course code and see a list of note cards fetched from a local JSON file. Tapping a card shows note detail.

---

### 7. Data

**What it captures:** What data the product creates, reads, updates, or deletes.

- Key entities and their relationships
- Where data comes from (user input, external API, seeded mock, etc.)
- Data that must persist vs. data that can be ephemeral
- Any sensitive or personal data involved

**Example:**
> Entities: Note (title, course, content, author_id, timestamp), Course (code, name).
> Source: Seeded mock JSON for prototype. No persistence required.
> Sensitive: None for prototype phase.

---

### 8. AI Role

**What it captures:** Whether and how AI/ML is used in the product.

- Is AI a core feature or an enhancement?
- What AI capability is needed (text generation, classification, summarisation, etc.)?
- What happens if AI is unavailable or wrong?
- Is live AI required or can it be mocked?

**Example:**
> AI generates a 3-sentence summary of each note. For the prototype, this will be a static mock string. Live AI is deferred.

*If AI is not part of the product, state: "No AI role."*

---

### 9. Constraints

**What it captures:** Hard boundaries that shape the architecture.

- Platform constraints (mobile only, web only, mini-program, etc.)
- Technology constraints (must use approved pathways)
- Privacy or compliance constraints
- Time and team constraints
- Anything that is explicitly out of scope for this phase

**Example:**
> Platform: WeChat Mini Program only.
> No backend for prototype.
> No real user accounts.
> 3-week timeline.

---

### 10. Unresolved Assumptions

**What it captures:** Open questions the team has not yet answered.

- Business or product assumptions not yet validated
- Technical unknowns
- Dependencies that are unclear

**Example:**
> - Will users trust anonymous note contributors?
> - Do universities restrict sharing of lecture materials?
> - Will note quality vary enough to need a rating system?

---

## Optional Fields

These fields are helpful but not required for the skill to operate:

| Field | Description |
|-------|-------------|
| Competitive landscape | Similar products and how this differs |
| Success metrics | How the team will know the product works |
| Design references | Existing visual references or inspiration |
| Previous iterations | What was tried and discarded |

---

## Notes for the Skill

- If the brief is missing a required field, flag it as an unresolved assumption rather than blocking progress.
- Do not ask clarifying questions for every gap—only ask when the answer would materially change scope, architecture, or the core flow.
- Accept briefs in any format: document, bullet list, slide transcript, or conversation.
