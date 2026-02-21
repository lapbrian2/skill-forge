# Project Research Summary

**Project:** Skill Forge -- AI-Powered Engineering Specification Generator
**Domain:** AI-native developer tool (LLM-powered guided workflow producing engineering documents)
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

Skill Forge is an AI-powered tool that transforms vague app ideas into build-ready engineering specifications through guided discovery. The product already has a working skeleton -- Next.js 16, React 19, Anthropic SDK, localStorage persistence, a 5-phase workflow, basic Q&A discovery, and single-pass spec generation. However, the existing implementation suffers from three fundamental problems: the AI asks questions instead of proposing answers (making the UX feel like a form), all LLM calls block with spinners for 5-30 seconds (feeling broken by 2026 standards), and JSON output parsing is fragile with no retry logic or schema validation. The current product is a demo, not a tool.

The recommended approach is to rebuild the LLM infrastructure layer first (streaming, Zod-validated structured outputs, retry engine, composable prompts), then rebuild the discovery UX around a "suggest-then-confirm" pattern where the AI does 80% of the thinking and the user confirms or corrects. The stack needs only 4 new packages (zod, react-markdown, remark-gfm, rehype-highlight) -- everything else is already installed or built into the Anthropic SDK v0.78.0. The architecture should shift from synchronous request-response to an event-driven streaming pipeline with domain-specific React hooks replacing the current monolithic page component.

The top risk is the "Generic Output Trap" -- specs that sound professional but contain no buildable specifics. This is the product-killing failure mode and must be addressed through concrete noun extraction during discovery, few-shot examples in generation prompts, section-by-section spec generation, and weasel word banning at generation time (not just post-hoc validation). The second-highest risk is user abandonment during discovery if the Q&A feels like work rather than a conversation with a senior architect. Every architectural and feature decision should be evaluated against these two failure modes.

## Key Findings

### Recommended Stack

The existing stack is modern and well-chosen. Next.js 16.1.6, React 19.2.3, Tailwind CSS 4.2.0, shadcn/ui, and the Anthropic SDK v0.78.0 form a solid foundation. The SDK already supports streaming (`messages.stream()`), structured outputs (`zodOutputFormat()`), extended thinking, prompt caching, and output effort control -- none of which are currently used by the codebase.

**New packages to add (4 total):**
- **Zod** (^3.25.0 or ^4.0.0): Schema validation for all LLM structured outputs -- replaces fragile `JSON.parse()` casting. Already a peer dependency of the Anthropic SDK. HIGH confidence.
- **react-markdown** (^10): Render generated specs as rich markdown with headings, code blocks, and tables. Currently specs display as monospace `<pre>` tags. MEDIUM confidence on exact version.
- **remark-gfm** (^4): GitHub Flavored Markdown support for tables, task lists, strikethrough in specs.
- **rehype-highlight** (^7): Syntax highlighting for code blocks in generated specs.

**Key stack changes (no new packages needed):**
- Replace `llmCallJSON()` with SDK-native `messages.parse()` + `zodOutputFormat()` for type-safe structured outputs
- Add streaming via `messages.stream()` for spec generation and discovery questions
- Implement per-task model selection: Haiku for classification/validation, Sonnet for discovery/generation
- Enable prompt caching on static system prompts (90% input cost reduction)
- Use extended thinking for spec generation (deep reasoning for comprehensive output)

**What NOT to use:** Vercel AI SDK (redundant with Anthropic SDK), LangChain (over-engineered), Prisma/Drizzle (no database yet), Redux/Zustand (React 19 state is sufficient), Socket.io (SSE covers streaming needs).

### Expected Features

**Must have (table stakes -- users expect these in 2026):**
- TS-1: Real-time streaming responses -- every AI tool streams; spinners feel broken
- TS-2: Conversation-style discovery -- chat bubbles, not stacked form cards
- TS-3: Suggest-then-confirm pattern -- AI proposes answers, user confirms/tweaks
- TS-4: Progressive disclosure -- adapt question depth to project complexity
- TS-5: Markdown spec preview with syntax highlighting and table of contents
- TS-6: Keyboard-first interaction -- Cmd+Enter, arrow key navigation, command palette
- TS-7: Error recovery and graceful degradation -- retry buttons, timeouts, fallbacks
- TS-8: Mobile-responsive layout -- discovery conversation must work on phones

**Should have (differentiators):**
- D-1: Smart defaults with best practices -- AI proposes 80% of decisions, user confirms
- D-4: Spec quality score with actionable, clickable remediation and "Fix with AI" buttons
- D-8: Discovery session resume with warm restart context
- D-9: Thinking/reasoning transparency -- show AI's reasoning in collapsible sections

**Defer to v2+:**
- D-2: Live spec assembly (watch spec build during discovery) -- high complexity, needs incremental generation infrastructure
- D-3: Domain-aware question branching -- valuable but needs testing across many domains
- D-5: Spec diff and iteration -- requires version tracking infrastructure
- D-6: Consumer-optimized export formats -- current copy/download is functional
- D-7: Contextual help and explanation layer -- nice-to-have, can layer in anytime
- D-10: One-click "Build with Claude Code" integration -- end-game feature

### Architecture Approach

The target architecture is an event-driven LLM pipeline with streaming UI, organized into five layers: Presentation (React components), State Management (domain-specific hooks), API (Next.js Route Handlers), LLM Orchestration (PromptBuilder, LLMClient, ResponseParser, RetryEngine), and Persistence (localStorage now, Supabase later). The current monolithic page component (530 lines) must be decomposed into custom hooks (`useProject`, `useDiscovery`, `useSpec`, `useTollgate`) that each own one domain concern.

**Major components:**
1. **LLMClient** -- Anthropic SDK wrapper with streaming + batch modes, token tracking, model selection per task
2. **PromptBuilder** -- Composable prompt construction with priority-based context truncation to prevent token overflow
3. **ResponseParser + RetryEngine** -- Zod schema validation with exponential backoff retry for network errors and parse-failure retry with prompt correction
4. **Domain Hooks** (useProject, useDiscovery, useSpec, useTollgate) -- Encapsulate state, API calls, and business logic; make the page component a thin orchestrator
5. **Conversation Panel** -- Chat-style UI consuming streaming discovery responses with suggest-then-confirm interaction
6. **Spec Viewer** -- Progressive markdown rendering with section navigation, validation annotations, and section-level regeneration

### Critical Pitfalls

1. **Generic Output Trap** -- Specs that could be about any app. Prevent with: concrete noun extraction during discovery, few-shot examples of BAD vs GOOD specificity, section-by-section generation, and echoing the user's own terminology. This is the #1 product-killing risk.

2. **Form Interrogation Anti-Pattern** -- UX that feels like filling out a survey instead of talking to an expert. Prevent with: suggest-then-confirm on every question, progressive spec preview during discovery, AI that acknowledges/connects answers, and smart defaults with opt-out.

3. **Stateless Conversation** -- Each LLM call re-parses the entire Q&A transcript without structured understanding. Prevent with: maintain a structured "understanding" JSON object updated after each answer, periodic synthesis checkpoints every 3-5 questions, and entity tracking from question one.

4. **JSON Fragility Bomb** -- Structured output parsing fails silently ~5-15% of the time. Prevent with: Zod schema validation on every response, retry with repair on parse failure, logging raw LLM responses for debugging, and using the SDK's native structured output features.

5. **Demo-to-Production Cliff** -- Works great for "build me a todo app," falls apart for real projects. Prevent with: complexity-adaptive discovery depth, honest uncertainty signals from the AI, and testing every prompt change against 3+ complex non-standard app ideas.

## Implications for Roadmap

Based on combined research findings, the roadmap should follow a strict dependency order. The LLM infrastructure must be solid before any features are built on top, the discovery UX must be rebuilt before spec generation improves, and quality/validation must be enhanced last.

### Phase 1: LLM Infrastructure Foundation

**Rationale:** Every feature depends on reliable, streaming LLM calls. The current `llmCall`/`llmCallJSON` functions are fragile, synchronous, and untyped. Building features on a broken foundation means rework later. Both STACK.md and ARCHITECTURE.md independently identify this as the critical first step. PITFALLS.md confirms that JSON fragility (#5) and streaming absence (#10) must be solved before anything else.

**Delivers:** Production-grade LLM client with streaming, structured outputs via Zod, retry with backoff, composable prompt builder, per-task model selection, prompt caching, and token tracking.

**Addresses features:** TS-1 (Streaming), TS-7 (Error Recovery -- infrastructure layer)

**Avoids pitfalls:** #5 (JSON Fragility), #10 (Streaming Absence), #9 (Token Budget Blindness)

**Stack elements:** Zod installation, Anthropic SDK streaming/structured output APIs, RetryEngine, ResponseParser, PromptBuilder, LLMClient refactor

### Phase 2: Discovery Experience Rebuild

**Rationale:** The discovery flow IS the product -- users spend 80% of their time here. The current form-like Q&A causes abandonment. This phase transforms discovery from "fill out this survey" to "have a conversation with a senior architect who does 80% of the thinking for you." FEATURES.md, PITFALLS.md, and ARCHITECTURE.md all converge on this as the highest-value work after infrastructure.

**Delivers:** Chat-style conversation UI, suggest-then-confirm interaction model, progressive disclosure, structured understanding object for conversation memory, session resume, domain-specific React hooks (useProject, useDiscovery).

**Addresses features:** TS-2 (Chat UI), TS-3 (Suggest-Then-Confirm), TS-4 (Progressive Disclosure), D-1 (Smart Defaults), D-8 (Session Resume)

**Avoids pitfalls:** #2 (Form Interrogation), #3 (Stateless Conversation), #7 (Premature Architecture), #4 (Demo-to-Production Cliff), #13 (Context Window Overflow)

### Phase 3: Spec Generation and Output Quality

**Rationale:** With reliable infrastructure and a good discovery flow, the spec output can be dramatically improved. This phase addresses the core deliverable -- the engineering specification document. Section-by-section generation, streaming markdown rendering, and weasel word prevention transform output from "generic textbook" to "buildable blueprint." Depends on Phase 1 (streaming, structured outputs) and Phase 2 (rich discovery data).

**Delivers:** Streaming spec generation with progressive markdown rendering, section-by-section generation architecture, rich spec viewer with table of contents and syntax highlighting, section-level regeneration, few-shot prompted generation prompts.

**Addresses features:** TS-5 (Markdown Preview), D-9 (Reasoning Transparency), partial D-4 (section-level quality indicators)

**Avoids pitfalls:** #1 (Generic Output Trap), #8 (Weasel Words), #6 (Black Box Generation), #10 (Streaming Absence for generation)

**Stack elements:** react-markdown, remark-gfm, rehype-highlight, extended thinking API, section-by-section prompt architecture

### Phase 4: Validation, Remediation, and Polish

**Rationale:** Once specs are generated well, validation must ensure they're actually buildable. This phase upgrades from surface-level validation (section counting, weasel word detection) to deep semantic validation ("can a developer implement this section right now?"). Also includes UX polish: keyboard shortcuts, mobile responsive, error boundaries.

**Delivers:** LLM-powered deep validation, section-level scoring, actionable remediation with "Fix with AI" buttons, consistency pass across spec sections, keyboard shortcuts, mobile responsive layout, error boundaries.

**Addresses features:** D-4 (Actionable Remediation -- full), TS-6 (Keyboard Shortcuts), TS-8 (Mobile Responsive), TS-7 (Error Recovery -- UI layer)

**Avoids pitfalls:** #12 (Phase Gate Theater), #11 (Copy-Paste Gap)

### Phase 5: Export, Integration, and Advanced Features

**Rationale:** With a polished core product that generates high-quality specs, this phase extends value through better output formats and advanced features. This is where deferred differentiators land.

**Delivers:** Consumer-optimized exports (Claude Code format, PDF, Jira stories), spec diffing and iteration, domain-aware question branching, prompt registry with versioning.

**Addresses features:** D-6 (Export Formats), D-5 (Spec Diff/Iteration), D-3 (Domain-Aware Questions), D-10 (Build Integration -- phase 1: clipboard optimization)

### Phase Ordering Rationale

- **Infrastructure before features:** STACK.md, ARCHITECTURE.md, and PITFALLS.md all independently identify LLM infrastructure as the foundation. Building features on the current fragile `llmCallJSON` means rework.
- **Discovery before generation:** The quality of generated specs is bounded by the quality of discovery data. Rich, structured discovery data (with concrete nouns, user terminology, and AI-proposed decisions) directly enables specific spec output.
- **Generation before validation:** Validation improvements have limited value if the generation itself is weak. Fix generation first, then validate the improved output.
- **Polish after core:** Keyboard shortcuts, mobile responsive, and advanced exports are high-value but don't affect the core quality loop (discover -> generate -> validate).
- **Feature dependencies are respected:** TS-1 (Streaming) blocks D-2 (Live Assembly). TS-2+TS-3 (Chat + Suggest) block D-1 (Smart Defaults). TS-5 (Markdown Preview) blocks D-4 (Remediation) and D-5 (Diff).

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Discovery Experience):** The suggest-then-confirm prompt engineering is the product's core differentiator. Needs careful prompt design research and iteration -- the prompts ARE the product. May need `/gsd:research-phase` to prototype prompt patterns.
- **Phase 3 (Spec Generation):** Section-by-section generation is architecturally significant. Need to research optimal section boundaries, inter-section consistency strategies, and how to maintain coherence across multiple LLM calls.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (LLM Infrastructure):** Streaming, Zod validation, retry logic, and prompt composition are all well-documented patterns. The STACK.md research verified exact API surfaces against installed SDK type definitions. Implementation is straightforward.
- **Phase 4 (Validation/Polish):** Keyboard shortcuts, mobile responsive, and error boundaries are standard React/Next.js patterns. LLM-powered validation is a focused prompt engineering task, not an architectural challenge.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core stack verified against installed node_modules type definitions. Anthropic SDK streaming/structured output APIs verified from `.d.ts` files. react-markdown version needs verification at install time. |
| Features | HIGH | Table stakes are observable across all major AI tools in 2026. Feature dependency graph is well-reasoned. Anti-features are well-justified by product positioning. |
| Architecture | MEDIUM | Patterns are sound and well-established (streaming, Zod, hooks, retry). Specific Anthropic SDK streaming event API should be verified against v0.78.0 docs before implementation. Token estimates in PromptBuilder need validation. |
| Pitfalls | HIGH | Grounded in direct analysis of the actual codebase's failure modes. Root causes traced to specific files and functions. Prevention strategies are concrete and actionable. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Anthropic SDK streaming API verification:** The `.stream()` and event-based API (`on('text')`, `on('thinking')`) were verified from type definitions but not tested end-to-end. Verify exact behavior with SDK v0.78.0 during Phase 1 implementation.
- **react-markdown version and compatibility:** Version ^10 is estimated from training data. Verify latest version and React 19 compatibility at `npm install` time. Unlikely to be a problem but worth confirming.
- **Section-by-section generation coherence:** No research was done on how to maintain terminology and structural consistency across independently generated spec sections. This is an open design question for Phase 3.
- **Suggest-then-confirm prompt patterns:** The prompt engineering for making the AI propose answers with confidence ratings has not been prototyped. This is the product's core UX innovation and needs dedicated prompt iteration in Phase 2.
- **Token costs at scale:** Cost estimates (from ARCHITECTURE.md scalability table) are rough. Actual cost per project depends on discovery depth and spec length. Need monitoring from Phase 1 onward.
- **Extended thinking interaction with streaming:** Using `thinking: { type: 'enabled' }` with streaming is supported per SDK types but interaction patterns (showing thinking to user vs hiding it) need UX design decisions.

## Sources

### Primary (HIGH confidence)
- Anthropic SDK v0.78.0 type definitions: `helpers/zod.d.ts`, `lib/MessageStream.d.ts`, `lib/parser.d.ts`, `resources/messages/messages.d.ts`, `core/error.d.ts`
- Existing codebase analysis: `src/lib/llm/client.ts`, `src/lib/llm/prompts.ts`, `src/app/api/*/route.ts`, `src/app/project/[id]/page.tsx`
- Existing planning docs: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/INTEGRATIONS.md`, `.planning/PROJECT.md`
- Installed package.json versions: Next.js 16.1.6, React 19.2.3, Tailwind 4.2.0, shadcn 3.8.5

### Secondary (MEDIUM confidence)
- AI tool UX patterns: Direct observation of Cursor, Claude Code, v0, ChatGPT, Notion AI, Linear, Figma AI, GitHub Copilot, Lovable, Bolt (training data, not live verification)
- LLM application architecture patterns: Streaming, structured outputs, prompt composition, retry strategies (training data expertise)
- react-markdown, remark-gfm, rehype-highlight version recommendations (training data, verify at install time)

### Tertiary (LOW confidence)
- Token cost projections at scale (rough estimates, need real usage data)
- Section-by-section generation coherence strategies (theoretical, needs prototyping)

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
