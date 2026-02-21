# Roadmap: Skill Forge

## Overview

Skill Forge transforms vague app ideas into build-ready engineering specs through AI-powered guided discovery. The existing Next.js codebase has a working skeleton but broken LLM infrastructure and a form-like UX that causes abandonment. This roadmap rebuilds from the foundation up: reliable streaming LLM layer, then the conversational discovery experience (the product's core), then spec generation with rich output, then validation/polish/dashboard to complete v1. Each phase delivers a complete, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: LLM Infrastructure** - Production-grade streaming LLM client with structured outputs, retry logic, model selection, and token tracking
- [x] **Phase 2: Discovery Experience** - Chat-style conversational discovery where AI proposes answers and user confirms, with adaptive depth and session persistence
- [ ] **Phase 3: Spec Generation and Output** - Streaming spec generation producing specific, buildable engineering documents with rich markdown rendering and export
- [ ] **Phase 4: Validation, Dashboard, and Polish** - Quality validation with AI-powered remediation, project dashboard, keyboard shortcuts, error handling, and mobile support

## Phase Details

### Phase 1: LLM Infrastructure
**Goal**: Every LLM interaction in the app streams reliably, validates outputs with schemas, retries on failure, and tracks cost
**Depends on**: Nothing (first phase)
**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04, LLM-05, LLM-06
**Success Criteria** (what must be TRUE):
  1. User sees AI responses appear token-by-token in real time (no loading spinners blocking for seconds)
  2. Malformed LLM responses are caught and retried automatically -- user never sees a JSON parse error
  3. Token usage for a project is visible to the user (cost awareness)
  4. Different AI tasks visibly use appropriate models (fast responses for simple tasks, thorough responses for complex ones)
**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Core LLM client: Zod schemas, per-task model config, streaming/retry/caching client refactor
- [ ] 01-02-PLAN.md -- Token tracking: Project type update with token_usage, tracking utilities
- [ ] 01-03-PLAN.md -- API routes and hook: Refactor all routes to use new infrastructure, create frontend stream consumer

### Phase 2: Discovery Experience
**Goal**: Users have a conversation with a senior architect who does 80% of the thinking -- not a form to fill out
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08
**Success Criteria** (what must be TRUE):
  1. Discovery displays as a chat conversation where AI messages appear on the left and user messages on the right, with responses streaming in real time
  2. AI proposes specific answers with best practices for every question -- user confirms, tweaks, or overrides rather than writing from scratch
  3. Discovery asks fewer questions for simple projects and more for complex ones (adaptive depth is observable)
  4. User can close the browser, reopen, and resume discovery exactly where they left off
  5. User can skip remaining discovery at any point and jump straight to spec generation
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Spec Generation and Output
**Goal**: Users get a complete, specific engineering specification document they can copy and paste into Claude Code to build their app
**Depends on**: Phase 2
**Requirements**: SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, OUT-01, OUT-02, OUT-03, OUT-04, OUT-05
**Success Criteria** (what must be TRUE):
  1. Spec generates with visible streaming -- user watches sections materialize one by one (not a blank screen then a wall of text)
  2. Generated spec contains concrete data models, API contracts, and user flows using the user's own terminology -- not generic boilerplate
  3. Spec renders as rich formatted markdown with headings, code blocks, tables, syntax highlighting, and a navigable table of contents
  4. User can copy the entire spec to clipboard with one click or download it as a .md file
  5. User can regenerate a single section without regenerating the entire spec
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Validation, Dashboard, and Polish
**Goal**: Users can trust spec quality through validation scores, manage multiple projects from a dashboard, and use the app with professional-grade UX
**Depends on**: Phase 3
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, UX-01, UX-02, UX-03, UX-04, UX-05, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Spec receives a completeness score (0-100 with letter grade) and vague language is flagged with specific locations highlighted
  2. Each validation issue has an actionable remediation with a "Fix with AI" button that resolves the issue in-place
  3. Dashboard lists all projects showing phase progress, complexity badge, validation grade, and word count
  4. User can resume any project from the dashboard and pick up exactly where they left off
  5. Keyboard shortcuts work (Cmd+Enter to submit, Cmd+Shift+C to copy spec), errors show graceful recovery, and the app works on mobile
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. LLM Infrastructure | 3/3 | Complete | 2026-02-20 |
| 2. Discovery Experience | 2/2 | Complete | 2026-02-20 |
| 3. Spec Generation and Output | 0/? | Not started | - |
| 4. Validation, Dashboard, and Polish | 0/? | Not started | - |

---
*Roadmap created: 2026-02-20*
*Last updated: 2026-02-20 after Phase 2 execution*
