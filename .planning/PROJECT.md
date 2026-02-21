# Skill Forge

## What This Is

Skill Forge is an AI-powered engineering specification generator. Users describe a vague app idea, and Skill Forge walks them through a smart guided discovery — not a form, but a conversation with a senior architect — then outputs a complete, build-ready engineering specification document they can paste directly into Claude Code to build the app with zero ambiguity.

The AI fills gaps using best practices, proposes decisions for user confirmation, and produces specs that are specific enough to build from without interpretation. The system prompt powering the AI is deeply engineered into the code so every output is consistently world-class.

## Core Value

A user describes an idea in one paragraph and gets back a complete engineering spec they can paste into Claude Code and have it build — no back-and-forth, no ambiguity, no guessing.

## Requirements

### Validated

- ✓ Next.js app with dark theme UI — existing
- ✓ Project CRUD with localStorage persistence — existing
- ✓ Client-side complexity classification (simple/moderate/complex) — existing
- ✓ Agentic system detection — existing
- ✓ Anthropic SDK integration with API routes — existing (broken — needs API key)
- ✓ Data model: Project, DiscoveryData, Feature, GeneratedSpec, ValidationReport — existing
- ✓ Weasel word detection and quality scoring — existing

### Active

- [ ] AI-powered discovery that asks smart contextual questions and fills gaps with best practices
- [ ] AI proposes answers for gaps — user confirms or overrides (suggest-then-confirm pattern)
- [ ] Deeply engineered system prompt baked into the code driving all LLM outputs
- [ ] 5-phase guided workflow that actually works end-to-end (Discover → Define → Architect → Specify → Deliver)
- [ ] Tollgate validation at each phase gate (quality gates before advancing)
- [ ] Full spec generation producing 2-25 page engineering documents
- [ ] Spec output that Claude Code can build from with zero ambiguity
- [ ] World-class 2026 UX/UI — feels like talking to a senior architect, not filling out forms
- [ ] Copy/download spec output in markdown format
- [ ] Dashboard showing all projects with progress and scores

### Out of Scope

- User authentication / accounts — single-user tool, localStorage is fine for v1
- Database backend (Supabase, Postgres) — defer to v2, localStorage works
- MCP server mode — defer to v2
- Collaborative editing — single user for now
- Spec version history / diffing — v2 feature
- Payment / billing — free tool for now

## Context

- **Existing codebase:** Next.js 16 app deployed to Vercel at skill-forge-app-zeta.vercel.app
- **Current state:** Foundation rebuilt but discovery flow is broken — API routes fail without ANTHROPIC_API_KEY configured in Vercel
- **Previous iteration pain:** First version was a "skill config generator" (wrong product). Second iteration had forms that felt like work. User feedback: "I just want to answer a few questions" and "it must be a systems thinker"
- **User's workflow:** Describe idea → Skill Forge does the hard thinking → Copy spec → Paste into Claude Code → App gets built
- **Key insight:** The AI should do 80% of the work. The user provides direction, the AI fills in best practices, standards, and engineering decisions. User confirms, not creates.
- **System prompt philosophy:** The quality of the output is entirely driven by the system prompt engineering baked into the code. This is not a user-configurable prompt — it's the product's secret sauce.
- **Target quality bar:** Specs produced should be better than what a senior engineer would write manually. Specific data models, API contracts, user flows, error handling — not vague descriptions.

## Constraints

- **Tech stack**: Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, Anthropic SDK — already established, no migration
- **Deployment**: Vercel — already configured, keep it
- **LLM**: Claude (Anthropic) — the engine powering spec generation
- **Persistence**: localStorage for v1 — simple, no backend needed
- **API Key**: ANTHROPIC_API_KEY must be set in Vercel env vars for production
- **UX standard**: 2026 world-class — research best practices, not 2023 patterns

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI suggest-then-confirm for gaps | User stays in control but doesn't do the hard work | — Pending |
| System prompt hardcoded in code | Consistent quality, not user-configurable | — Pending |
| localStorage for v1 persistence | Ship fast, migrate to DB later | ✓ Good |
| 5-phase linear workflow | Structured enough to ensure completeness, linear enough to be simple | — Pending |
| Spec output as markdown | Universal format, paste-ready for Claude Code | ✓ Good |

---
*Last updated: 2026-02-20 after initialization*
