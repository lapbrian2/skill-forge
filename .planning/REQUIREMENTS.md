# Requirements: Skill Forge

**Defined:** 2026-02-20
**Core Value:** User describes an idea in one paragraph and gets back a complete engineering spec they can paste into Claude Code and have it build — no ambiguity, no guessing.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### LLM Infrastructure

- [ ] **LLM-01**: All LLM calls stream responses token-by-token to the client (no spinners)
- [ ] **LLM-02**: All structured LLM outputs are validated with Zod schemas (no fragile JSON.parse)
- [ ] **LLM-03**: Failed LLM calls retry with exponential backoff (3 attempts max)
- [ ] **LLM-04**: System prompts use Anthropic prompt caching for cost reduction
- [ ] **LLM-05**: Per-task model selection (Haiku for classification, Sonnet for discovery/generation)
- [ ] **LLM-06**: Token usage tracked and displayed per project

### Discovery Experience

- [ ] **DISC-01**: Discovery displays as chat-style conversation (AI bubbles left, user right)
- [ ] **DISC-02**: AI proposes answers with best practices — user confirms, modifies, or overrides (suggest-then-confirm)
- [ ] **DISC-03**: AI suggestions include confidence level and reasoning (collapsible)
- [ ] **DISC-04**: Discovery adapts question depth to project complexity (3-5 simple, 8-12 moderate, 15-20 complex)
- [ ] **DISC-05**: AI maintains structured "understanding" object updated after each answer (not stateless)
- [ ] **DISC-06**: Completed phases collapse into summary cards with key decisions
- [ ] **DISC-07**: User can skip to spec generation at any point ("I've said enough, generate it")
- [ ] **DISC-08**: Discovery session can be resumed after page reload (auto-save every answer)

### Spec Generation

- [ ] **SPEC-01**: Spec generates with streaming — user watches it materialize section by section
- [ ] **SPEC-02**: Generated specs use concrete nouns, specific data models, API contracts — never vague
- [ ] **SPEC-03**: System prompt is deeply engineered and baked into the code (the product's secret sauce)
- [ ] **SPEC-04**: Spec echoes user's own terminology and domain language
- [ ] **SPEC-05**: Spec sections are generated with few-shot examples of good vs bad specificity
- [ ] **SPEC-06**: User can regenerate individual sections without regenerating the full spec

### Spec Output

- [ ] **OUT-01**: Spec renders as rich markdown with proper headings, code blocks, tables, TOC
- [ ] **OUT-02**: Toggle between rendered preview and raw markdown
- [ ] **OUT-03**: One-click copy entire spec to clipboard
- [ ] **OUT-04**: Download spec as .md file
- [ ] **OUT-05**: Table of contents sidebar with section navigation

### Validation

- [ ] **VAL-01**: Tollgate validation scores spec on completeness (0-100) with letter grade
- [ ] **VAL-02**: Weasel word detection flags vague language in generated specs
- [ ] **VAL-03**: Validation produces actionable remediations — specific, not generic
- [ ] **VAL-04**: "Fix with AI" button on each remediation (AI fixes the specific issue)

### UX Polish

- [ ] **UX-01**: Keyboard shortcuts: Cmd+Enter (submit/accept), Cmd+Shift+C (copy spec), Escape (dismiss)
- [ ] **UX-02**: Error boundaries prevent full-page crashes — graceful recovery
- [ ] **UX-03**: Missing API key shows setup instructions (not generic error)
- [ ] **UX-04**: Loading states show streaming progress, not static spinners
- [ ] **UX-05**: Mobile-responsive layout for discovery conversation

### Dashboard

- [ ] **DASH-01**: Dashboard lists all projects with phase progress indicator
- [ ] **DASH-02**: Project cards show complexity badge, agentic badge, validation grade, word count
- [ ] **DASH-03**: Resume project from where user left off
- [ ] **DASH-04**: Delete project with confirmation

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Live spec assembly — watch spec sections build during discovery
- **ADV-02**: Domain-aware question branching (e-commerce vs SaaS vs mobile vs CLI)
- **ADV-03**: Spec diff and iteration — compare versions, track changes
- **ADV-04**: Consumer-optimized exports (Claude Code format, PDF, Jira stories)
- **ADV-05**: One-click "Build with Claude Code" clipboard integration
- **ADV-06**: Contextual help and explanation layer
- **ADV-07**: Extended thinking transparency (show AI reasoning in collapsible sections)
- **ADV-08**: Prompt registry with versioning
- **ADV-09**: Database persistence (Supabase migration)
- **ADV-10**: User accounts and project sharing

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User authentication | Single-user tool, localStorage sufficient for v1 |
| Database backend | Ship fast, localStorage works, migrate v2 |
| MCP server mode | Defer to v2, focus on web UI first |
| Collaborative editing | Single-user tool |
| Payment/billing | Free tool for now |
| Code generation | Skill Forge generates specs, not code. Claude Code builds from specs. |
| Template marketplace | v2+ feature, need user base first |
| AI model selection UI | Hardcode best models per task, don't expose to user |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LLM-01 | Phase 1 | Pending |
| LLM-02 | Phase 1 | Pending |
| LLM-03 | Phase 1 | Pending |
| LLM-04 | Phase 1 | Pending |
| LLM-05 | Phase 1 | Pending |
| LLM-06 | Phase 1 | Pending |
| DISC-01 | Phase 2 | Pending |
| DISC-02 | Phase 2 | Pending |
| DISC-03 | Phase 2 | Pending |
| DISC-04 | Phase 2 | Pending |
| DISC-05 | Phase 2 | Pending |
| DISC-06 | Phase 2 | Pending |
| DISC-07 | Phase 2 | Pending |
| DISC-08 | Phase 2 | Pending |
| SPEC-01 | Phase 3 | Pending |
| SPEC-02 | Phase 3 | Pending |
| SPEC-03 | Phase 3 | Pending |
| SPEC-04 | Phase 3 | Pending |
| SPEC-05 | Phase 3 | Pending |
| SPEC-06 | Phase 3 | Pending |
| OUT-01 | Phase 3 | Pending |
| OUT-02 | Phase 3 | Pending |
| OUT-03 | Phase 3 | Pending |
| OUT-04 | Phase 3 | Pending |
| OUT-05 | Phase 3 | Pending |
| VAL-01 | Phase 4 | Pending |
| VAL-02 | Phase 4 | Pending |
| VAL-03 | Phase 4 | Pending |
| VAL-04 | Phase 4 | Pending |
| UX-01 | Phase 4 | Pending |
| UX-02 | Phase 4 | Pending |
| UX-03 | Phase 4 | Pending |
| UX-04 | Phase 4 | Pending |
| UX-05 | Phase 4 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after initial definition*
