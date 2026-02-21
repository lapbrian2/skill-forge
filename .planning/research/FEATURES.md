# Feature Landscape

**Domain:** AI-powered engineering specification generator
**Researched:** 2026-02-20
**Focus:** UX/interaction patterns for AI-native tools in 2026

## Context

This research analyzes what world-class AI tools (Cursor, Claude Code, v0, Notion AI, Linear, Figma AI, ChatGPT, Lovable, Bolt) do in 2026 and maps those patterns onto Skill Forge's domain: turning vague app ideas into build-ready engineering specs through AI-guided discovery.

Skill Forge already has: project CRUD, localStorage persistence, client-side complexity classification, Anthropic SDK integration, 5-phase linear workflow skeleton, basic Q&A discovery loop, spec generation (single LLM call), validation scoring (Tollgates 4-5), copy/download spec output. All LLM calls are currently non-streaming completion-based.

The gap between "exists" and "world-class" is the focus of this document.

---

## Table Stakes

Features users expect in 2026. Missing any of these and the product feels broken or dated.

### TS-1: Real-Time Streaming Responses

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Every AI tool in 2026 streams. Users seeing a spinner for 10-30 seconds feel like 2023. Claude Code, ChatGPT, Cursor, v0 all stream token-by-token. A static "Generating..." spinner is immediately perceived as broken. |
| **What It Means for Skill Forge** | Stream discovery questions as they generate. Stream the full spec generation (the biggest win — users watch their 15-page spec materialize section by section). Stream validation results. |
| **Complexity** | Medium — Anthropic SDK supports streaming via `messages.stream()`. Next.js API routes support `ReadableStream` responses. Frontend needs `EventSource` or `fetch` with stream reader. |
| **Current State** | Not implemented. All calls use `llmCall()` which awaits full completion. Users wait 5-30s staring at a spinner. |
| **Implementation Notes** | Use Anthropic SDK's streaming API. Return `new Response(readableStream)` from API routes. Parse SSE on client. Show typing indicator during question generation, render spec markdown progressively during generation. |

### TS-2: Conversation-Style Discovery (Not Form-Fill)

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | ChatGPT, Claude, Cursor Chat trained users to expect natural conversation with AI. Skill Forge's current Q&A loop asks one question at a time but the UX feels like a form wizard, not a conversation. The distinction matters: conversations feel collaborative, forms feel like work. |
| **What It Means for Skill Forge** | Discovery should look and feel like a chat interface. AI messages appear as chat bubbles. User responses appear as their messages. The conversation history scrolls naturally. AI can reference previous answers inline ("You mentioned freelancers earlier — do they typically..."). |
| **Complexity** | Medium — Mostly UI restructuring. The data model (QAEntry array) already supports this. Need chat-style layout, auto-scroll, message grouping. |
| **Current State** | Q&A is displayed as stacked cards. Previous answers show as flat list. No visual distinction between AI questions and user answers. No conversational flow. |
| **Implementation Notes** | Chat bubble UI with AI on left, user on right. Typing indicator when AI is "thinking." Auto-scroll to latest message. Group phase transitions with visual dividers. Keep the textarea input anchored at bottom. |

### TS-3: Suggest-Then-Confirm Pattern

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | This is the defining pattern of AI-native tools in 2026. GitHub Copilot suggests, you tab to accept. Cursor suggests edits, you approve. v0 generates, you iterate. Claude Code proposes file changes, you confirm. The user provides direction, AI does the work, user confirms or adjusts. |
| **What It Means for Skill Forge** | When the AI detects a gap (e.g., no auth strategy specified), it should PROPOSE an answer ("Based on your SaaS app targeting small teams, I'd recommend email/password auth with Google OAuth. This covers 90% of small team signups.") and let the user confirm, modify, or override. The AI should never ask a naked question when it can make an informed suggestion. |
| **Complexity** | Medium — Requires prompt engineering changes (instruct LLM to always propose + ask) and UI changes (accept/modify/reject buttons on AI suggestions). |
| **Current State** | The prompt system asks questions. The `options` field in question responses offers choices. But the AI doesn't propose its own best-guess answer. It asks, doesn't suggest. |
| **Implementation Notes** | Restructure discovery prompt to always include a `suggested_answer` field. UI shows the suggestion as a pre-filled editable response. "Looks good" button to accept as-is. Textarea to modify. This is the #1 UX improvement — reduces user effort by 60-80%. |

### TS-4: Progressive Disclosure of Complexity

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Linear, Notion, Figma AI all layer complexity. Simple things are simple. Advanced options exist but don't overwhelm. Users should never see a 20-question wall. They should see the next relevant thing. |
| **What It Means for Skill Forge** | Simple projects get 3-5 questions with heavy AI inference. Complex projects get deeper discovery but still progressively. Show progress ("3 of ~5 questions for this phase"). Collapse completed phases. Let users skip ahead if they know what they want. |
| **Complexity** | Low-Medium — Mostly prompt engineering (AI decides when enough is enough) and UI (collapsible phases, progress indicators). |
| **Current State** | Fixed phase progression exists. Phase completion is LLM-determined (`phase_complete` boolean). But no progress indication, no skip option, no adaptive depth. |
| **Implementation Notes** | Show estimated question count per phase (from COMPLEXITY_CONFIG ranges). Collapse completed phases into summary cards. "Skip to spec" option for users who just want to dump requirements. Progress bar within each phase. |

### TS-5: Markdown Spec Preview with Syntax Highlighting

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Spec output is the product's deliverable. Showing it as monospace pre-formatted text in a scrollable div is unacceptable in 2026. Users expect rendered markdown with proper headings, code blocks, tables, and a table of contents. |
| **What It Means for Skill Forge** | Render the generated spec as rich markdown. Collapsible sections. Table of contents sidebar. Code blocks with syntax highlighting. Tables rendered properly. Toggle between rendered view and raw markdown. |
| **Complexity** | Low-Medium — Libraries like `react-markdown` with `remark-gfm` handle this. CodeMirror is already in the project for raw editing. Need dual-view (preview + edit). |
| **Current State** | Spec displays as `<pre>` tag with monospace font. No markdown rendering. CodeMirror packages are installed but not used for spec display (only listed in dependencies). |
| **Implementation Notes** | Use `react-markdown` + `remark-gfm` + `rehype-highlight` for rendered view. Toggle button for raw/rendered. Sticky table of contents sidebar extracted from headings. Section-level copy buttons. |

### TS-6: Keyboard-First Interaction

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | Power users (developers, the target audience) expect keyboard shortcuts. Cursor, VS Code, Claude Code, Linear are all keyboard-centric. The command palette already exists (Cmd+K) but is underutilized. |
| **What It Means for Skill Forge** | Ctrl+Enter to submit answer (exists). Cmd+K for command palette (exists). Keyboard navigation between phases. Keyboard shortcut to copy spec. Keyboard shortcut to accept AI suggestion. Arrow keys or tab to select from options. |
| **Complexity** | Low — Command palette exists. Add keybindings to existing actions. |
| **Current State** | Ctrl+Enter to submit exists. Command palette exists. No other keyboard shortcuts. |
| **Implementation Notes** | Add: Cmd+Shift+C (copy spec), Cmd+Enter (accept suggestion), Tab/arrow (navigate options), Escape (dismiss), Cmd+S (save/export). Register in command palette. |

### TS-7: Error Recovery and Graceful Degradation

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | LLM calls fail. API keys expire. Rate limits hit. Network drops. Every mature AI tool handles this gracefully. Users should never see a broken state they can't recover from. |
| **What It Means for Skill Forge** | Retry buttons on failed LLM calls. Timeout handling (30s max, then offer retry). Fallback question bank for offline/demo mode. Auto-save every answer immediately. Recovery from mid-generation failures (resume, don't restart). Graceful API key missing message with setup instructions. |
| **Complexity** | Medium — Retry logic, timeout handling, fallback question bank, auto-save verification. |
| **Current State** | Basic try/catch with toast errors. No retry. No timeout. No fallback questions. No recovery from mid-generation failure. Missing API key shows generic error. |
| **Implementation Notes** | Wrap LLM calls with retry (exponential backoff, 3 attempts). Add AbortController with 30s timeout. Create static fallback question bank for each phase/complexity. Show inline retry button on failed operations. Store partial generation results. |

### TS-8: Mobile-Responsive Layout

| Attribute | Detail |
|-----------|--------|
| **Why Expected** | In 2026, responsive is not optional. Users ideate on mobile, on the couch, in meetings. The discovery conversation especially should work on a phone. The spec output can be desktop-focused but input must work everywhere. |
| **What It Means for Skill Forge** | Chat-style discovery works on mobile. Phase stepper collapses or becomes horizontal scrollable on small screens. Spec view has mobile-friendly navigation. Touch-friendly buttons and inputs. |
| **Complexity** | Low-Medium — Tailwind responsive utilities. Mostly layout adjustments. |
| **Current State** | Phase stepper labels hide on small screens (`hidden sm:inline`). Otherwise, not explicitly mobile-optimized. |
| **Implementation Notes** | Test and optimize chat layout, input areas, and spec navigation for mobile viewports. Bottom-anchored input on mobile. Swipeable phase navigation. Collapsible sections in spec view. |

---

## Differentiators

Features that set Skill Forge apart. Not expected, but valued. These create competitive moat.

### D-1: AI Fills Gaps with Best Practices (Smart Defaults)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | This is Skill Forge's core insight and biggest differentiator. Most tools ask questions. Skill Forge should ANSWER its own questions with industry best practices, then ask the user to confirm. "For a SaaS app targeting small teams, I'd recommend: PostgreSQL for data, Stripe for billing, email+OAuth for auth, Next.js for the frontend. Sound right?" The AI does 80% of the work. |
| **Why Differentiating** | No competitor does this well. ChatGPT asks you questions. Notion AI generates from what you provide. Skill Forge should be the only tool that proposes a complete architecture from a one-paragraph description and lets you adjust. It's the difference between "fill out this form" and "here's what I'd build — want to change anything?" |
| **Complexity** | Medium-High — Heavy prompt engineering. The system prompt must encode deep knowledge about tech stack selection, architecture patterns, data modeling conventions, common SaaS patterns. Each suggestion must be contextual (not generic). |
| **Current State** | Prompt system asks questions with optional multiple-choice options. Does not propose answers. The `SYSTEM_DISCOVERY` prompt tells the AI to "ask" not "suggest." |
| **Implementation Notes** | Restructure all discovery prompts to output `{ suggested_answer, confidence, reasoning, question_if_user_disagrees }`. The AI proposes, user confirms. When confidence is high (>0.8), present as "I'd recommend X because Y — sound right?" When medium, present as "I'm thinking X but you might prefer Y — which works?" |

### D-2: Live Spec Assembly (Watch Your Spec Build in Real-Time)

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Instead of answering all questions, waiting, then getting a spec dump — users see their spec BUILDING as they answer questions. Each answer immediately populates the relevant spec section. The spec is a living document that grows with each interaction. |
| **Why Differentiating** | This inverts the typical "interview then output" pattern. It gives users immediate feedback on how their answers translate to engineering requirements. They can see gaps, catch misunderstandings early, and feel the progress. Like watching a building go up floor by floor instead of seeing it appear all at once. |
| **Complexity** | High — Requires incremental spec generation. Each answer triggers partial spec update. Need a spec assembly engine that can merge incremental sections. Version tracking for each section's state. |
| **Current State** | Spec generation is a single monolithic LLM call after all discovery completes. No intermediate spec visibility. |
| **Implementation Notes** | After each phase, generate that phase's spec sections incrementally. Phase 1 answers -> Product Overview, Users & Personas. Phase 2 answers -> Feature Specification, User Flows. Phase 3 answers -> Data Model, API Spec, Architecture. Final "generation" step assembles and refines the full document for consistency. Show a live "spec preview" sidebar or tab during discovery. |

### D-3: Smart Question Branching Based on Domain Detection

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | The AI detects the app domain (SaaS, marketplace, mobile game, CLI tool, MCP server, e-commerce, social platform) and tailors its entire question strategy. A SaaS app gets billing/subscription questions. A marketplace gets two-sided questions. A game gets mechanics/progression questions. A CLI tool skips UI questions entirely. |
| **Why Differentiating** | Generic question flows feel robotic. Domain-aware flows feel like talking to an expert who's built this type of app before. "I see you're building a marketplace — let's talk about the buyer experience first, then the seller side." |
| **Complexity** | Medium — Domain detection from initial description (already partially exists with agentic detection). Expand to more domains. Create domain-specific question strategies in prompts. |
| **Current State** | Agentic detection exists (`is_agentic` flag). No other domain-specific routing. All projects get the same question strategy. |
| **Implementation Notes** | Expand classification to detect: `domain: "saas" | "marketplace" | "social" | "tool" | "game" | "ecommerce" | "api" | "agent" | "other"`. Each domain maps to priority questions and spec sections. Include domain-specific best practices in generation prompts. |

### D-4: Spec Quality Score with Actionable Remediation

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Not just a grade, but specific, actionable fixes. "Your spec scores 72/100. Here's exactly what's missing: (1) No error handling for the payment flow — add what happens when Stripe returns a 402. (2) Data model is missing indexes on the `user_id` foreign key. (3) The search feature has no pagination strategy." Click a remediation to jump to that section. |
| **Why Differentiating** | Existing validation gives a score and generic remediations. World-class validation pinpoints exact gaps with exact fixes and lets users auto-remediate with AI assistance. |
| **Complexity** | Medium — Validation logic exists. Need: section-level scoring (not just overall), clickable deep links to spec sections, AI-powered "fix this" button per remediation. |
| **Current State** | Tollgate 4+5 validation exists with overall score, grade, and remediation messages. Remediations are text-only, not actionable. No section-level scoring. No "fix this" capability. |
| **Implementation Notes** | Score each spec section independently. Map remediations to specific line ranges or sections. Add "Fix with AI" button per remediation that calls LLM to regenerate just that section. Show before/after diff for AI fixes. |

### D-5: Spec Diff and Iteration

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Users regenerate or edit their spec. They need to see what changed. Show diffs between versions. Allow selective regeneration ("Regenerate just the Data Model section with these changes"). Track iteration history. |
| **Why Differentiating** | Most AI generators are one-shot. Edit means regenerate everything. Surgical editing with diff tracking is what makes a tool feel professional. Like Cursor's diff view for code changes — but for spec sections. |
| **Complexity** | Medium-High — Requires version tracking per spec, diff rendering (can use a library), section-level regeneration API. |
| **Current State** | Single spec version. Full regeneration only. No diff. No section-level regeneration. |
| **Implementation Notes** | Store spec versions array (not just latest). Use `diff` library for visual diffs. Add "Regenerate Section" button per heading. Allow user to provide additional context for regeneration ("Actually, use MongoDB instead of PostgreSQL"). Show changes as green/red diff before accepting. |

### D-6: Export Formats Optimized for Downstream Consumers

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Different consumers need different formats. Claude Code needs a single markdown file with a specific structure. A project manager needs a summary doc. A designer needs the user flows and IA. A stakeholder needs the executive summary. Export should be consumer-aware. |
| **Why Differentiating** | Current export is "copy markdown." World-class export is: "Export for Claude Code" (optimized prompt structure), "Export for team review" (Google Docs-friendly), "Export for Jira" (user stories as importable CSV), "Export as PDF" (stakeholder-ready). |
| **Complexity** | Medium — Multiple export templates. Markdown is the base. Transform to other formats. |
| **Current State** | Copy to clipboard and download as .md. Single format. No consumer optimization. |
| **Implementation Notes** | "Export for Claude Code" — wrap spec in optimal prompt structure with build instructions. "Export for review" — strip technical details, add executive summary. "Export stories" — extract user stories and acceptance criteria into structured format. Use `jspdf` or server-side rendering for PDF. ZIP export with multiple files (already have jszip). |

### D-7: Contextual Help and Explanation Layer

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Not everyone knows what "data model indexes" or "API rate limiting" means. When the AI asks a question or proposes a decision, users can tap "Why?" or "Explain this" to get a plain-English explanation. Educational without being condescending. Like Figma AI explaining design decisions. |
| **Why Differentiating** | Makes the tool accessible to non-technical founders and junior developers while still producing senior-level specs. Expands the addressable market significantly. |
| **Complexity** | Low-Medium — The `why` field already exists in question responses. Expand to spec sections. Add expandable explanations. |
| **Current State** | Questions include a `why` field shown as small text. No explanation for spec sections or technical terms. |
| **Implementation Notes** | Add "What does this mean?" expandable on technical spec sections. AI-generated plain-English summaries for each section. Glossary tooltips on technical terms. Progressive detail: summary -> details -> full technical spec per section. |

### D-8: Discovery Session Resume and Context Window

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | Users close the browser and come back. The AI should seamlessly resume: "Welcome back! Last time we were discussing the authentication strategy for your marketplace. You mentioned preferring passwordless login. Let's continue from there." Full context preservation and warm restart. |
| **Why Differentiating** | Most AI chat tools lose context or restart conversations. Skill Forge persists to localStorage (good), but the AI needs to demonstrate it remembers. The warm restart builds trust and reduces repetition. |
| **Complexity** | Low — Data already persisted in localStorage. Need prompt engineering to include "session resume" context and UI to show "Resuming from where you left off" state. |
| **Current State** | Project loads from localStorage. Questions auto-fetch. But no explicit resume UX — feels like starting fresh each time. No AI acknowledgment of previous session. |
| **Implementation Notes** | When loading a project mid-discovery, first LLM call includes instruction to summarize progress and signal continuation. Show "Resuming your conversation..." message. Display a compact summary of previous answers before continuing. |

### D-9: Thinking/Reasoning Transparency

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | When the AI proposes a suggestion or makes an architectural decision, show its reasoning. Not hidden in a prompt — visible to the user. "I'm recommending PostgreSQL over MongoDB because your data model has strong relational patterns (users have many projects, projects have many tasks). Here's my reasoning..." Collapsible, not in-your-face. |
| **Why Differentiating** | Claude's extended thinking, ChatGPT's chain-of-thought, Cursor's reasoning — users in 2026 expect to see WHY the AI decided something, not just WHAT it decided. Transparency builds trust and catches bad reasoning early. |
| **Complexity** | Medium — Use Anthropic's extended thinking API or extract reasoning from structured responses. UI for collapsible reasoning sections. |
| **Current State** | AI responses are opaque. No reasoning visible. The `why` field on questions is the only transparency. |
| **Implementation Notes** | Add `reasoning` field to AI suggestions. Show as collapsible "See my thinking" section. For spec generation, include brief rationale for major decisions inline. Use Anthropic extended thinking for complex decisions. |

### D-10: One-Click "Build This" Integration

| Attribute | Detail |
|-----------|--------|
| **Value Proposition** | The ultimate destination: user finishes spec, clicks "Build with Claude Code" and the spec is formatted as an optimal prompt, ready to paste. Or better: deep-link into Claude Code with the spec pre-loaded. Or generate a project scaffold (directory structure, package.json, basic files) alongside the spec. |
| **Why Differentiating** | Closes the loop from "idea" to "building." Most spec tools end at the document. Skill Forge can bridge to implementation. |
| **Complexity** | Low (clipboard optimization) to High (scaffold generation) |
| **Current State** | Copy to clipboard exists. No prompt optimization for Claude Code. No scaffold generation. |
| **Implementation Notes** | Phase 1: "Copy for Claude Code" button that wraps spec in optimal prompt format with build instructions. Phase 2: Generate project scaffold (package.json, directory structure, config files) as downloadable ZIP. Phase 3: If/when Claude Code has an API, integrate directly. |

---

## Anti-Features

Features to explicitly NOT build. Each would feel obvious but would hurt the product.

### AF-1: User-Editable System Prompts

| Anti-Feature | User-Editable System Prompts |
|--------------|------------------------------|
| **Why Avoid** | The system prompt IS the product. It encodes the methodology, quality standards, and domain expertise that make specs world-class. Letting users edit it would be like letting restaurant customers edit the chef's recipe. They'd make it worse. |
| **What to Do Instead** | Hardcode excellent prompts. Allow user preference settings (verbosity, tech stack preferences, spec detail level) that INJECT into the prompt — but never expose the prompt itself. |

### AF-2: Multi-User Collaboration (v1)

| Anti-Feature | Real-time Collaboration |
|--------------|------------------------|
| **Why Avoid** | Spec generation is a focused, single-user activity. Adding collaboration means auth, permissions, conflict resolution, presence indicators — massive complexity for minimal value. The spec output can be shared via export. |
| **What to Do Instead** | Excel at single-user experience. Make export so good that collaboration happens outside the tool (Google Docs, Notion, GitHub). Add collaboration in v2 only if users actually request it. |

### AF-3: Template Marketplace or Community Prompts

| Anti-Feature | Template Marketplace |
|--------------|---------------------|
| **Why Avoid** | Skill Forge's value is that you DON'T need templates. You describe your idea, and the AI handles the rest. A template marketplace implies the AI can't figure it out, undermining the core value proposition. Starter templates on the create page are fine (they exist already), but a marketplace is scope creep. |
| **What to Do Instead** | Make the AI so good at inferring from descriptions that templates are unnecessary. The starter templates on the create page are sufficient for inspiration. |

### AF-4: General-Purpose Chat or "Ask Anything" Mode

| Anti-Feature | Freeform AI Chat |
|--------------|------------------|
| **Why Avoid** | Skill Forge is a guided discovery tool, not a chatbot. Adding "ask me anything" mode would dilute the structured methodology that ensures spec completeness. Users can use Claude directly for freeform questions. Skill Forge's value is the STRUCTURE. |
| **What to Do Instead** | Keep discovery structured but conversational. Allow users to ask clarifying questions WITHIN the discovery flow ("What do you mean by indexes?") but don't add a general-purpose chat interface. |

### AF-5: Spec Hosting or Publishing Platform

| Anti-Feature | Built-in Spec Hosting |
|--------------|----------------------|
| **Why Avoid** | Specs are transient artifacts. They exist to be consumed by Claude Code or developers, then they're done. Building a hosting platform (with URLs, access control, versioning, comments) is an entirely different product. |
| **What to Do Instead** | Export to markdown, PDF, or clipboard. Let users host specs wherever they want (GitHub, Notion, Google Docs). Focus on generation quality, not distribution. |

### AF-6: Drag-and-Drop Spec Builder or Visual Editor

| Anti-Feature | Visual/WYSIWYG Spec Editor |
|--------------|----------------------------|
| **Why Avoid** | This inverts the core value. Skill Forge's point is that the AI GENERATES the spec. A visual builder means the USER builds it, with the AI as an assistant. That's a different product (and a worse one for this use case). |
| **What to Do Instead** | Allow inline editing of the generated markdown. Support section-level regeneration. But the AI is the author, the user is the editor — never the reverse. |

### AF-7: Per-Question Token/Cost Display

| Anti-Feature | Showing API Cost Per Interaction |
|--------------|----------------------------------|
| **Why Avoid** | Showing "$0.003 for this question" makes users anxious about clicking buttons. It turns a creative flow into a cost-optimization exercise. The tool should feel abundant, not metered. |
| **What to Do Instead** | Track costs server-side for the operator's visibility. Show session-level token usage in a settings/debug panel for power users. Never show cost inline during discovery. Implement rate limiting silently to prevent abuse. |

---

## Feature Dependencies

```
TS-2 (Chat UI) ──────────────┐
                              ├─> D-1 (Smart Defaults / Suggest-Then-Confirm)
TS-3 (Suggest-Then-Confirm) ──┘

TS-1 (Streaming) ─────────────> D-2 (Live Spec Assembly)

TS-5 (Markdown Preview) ──────> D-4 (Actionable Remediation)
                                 │
                                 └─> D-5 (Spec Diff and Iteration)

D-1 (Smart Defaults) ─────────> D-3 (Domain-Aware Questions)

TS-7 (Error Recovery) ────────> D-8 (Session Resume)

D-4 (Actionable Remediation) ──> D-10 (Build Integration)
D-5 (Spec Iteration) ──────────> D-10 (Build Integration)

TS-4 (Progressive Disclosure) ─> D-7 (Contextual Help)

D-9 (Reasoning Transparency) ── Independent (can be added anytime)
D-6 (Export Formats) ────────── Independent (can be added anytime)
TS-6 (Keyboard Shortcuts) ───── Independent (can be added anytime)
TS-8 (Mobile Responsive) ────── Independent (should be done with TS-2)
```

### Dependency Summary

1. **Streaming (TS-1)** is foundational — blocks live spec assembly and makes everything feel faster
2. **Chat UI (TS-2)** + **Suggest-Then-Confirm (TS-3)** together create the core discovery experience
3. **Markdown Preview (TS-5)** is required before section-level features (remediation, diff, iteration)
4. **Smart Defaults (D-1)** is the product's differentiator and should be built WITH the chat UI
5. **Error Recovery (TS-7)** should ship with everything (it's infrastructure)

---

## MVP Recommendation (Next Milestone)

Build these in order. Each builds on the previous.

### Priority 1: The Core Experience Upgrade
1. **TS-1: Streaming** — Transform the "waiting for LLM" experience from broken to delightful. Foundation for everything.
2. **TS-2: Chat-Style Discovery** — The discovery flow IS the product. It must feel like a conversation, not a form.
3. **TS-3: Suggest-Then-Confirm** — The AI should do 80% of the work. This is the behavioral change that makes Skill Forge magical.
4. **D-1: Smart Defaults** — Combined with suggest-then-confirm, this is what makes the AI feel like a senior architect.

### Priority 2: Output Quality
5. **TS-5: Markdown Preview** — The spec output must look professional and be navigable.
6. **TS-4: Progressive Disclosure** — Adapt discovery depth to project complexity. Don't over-question simple projects.
7. **D-4: Actionable Remediation** — Score the spec, pinpoint gaps, offer AI-powered fixes.

### Priority 3: Polish and Resilience
8. **TS-7: Error Recovery** — Retry, timeout, fallbacks. The app must never feel broken.
9. **TS-6: Keyboard Shortcuts** — Power user delight. Low effort, high impact.
10. **D-8: Session Resume** — "Welcome back" context awareness.

### Defer to Later Milestones
- **D-2: Live Spec Assembly** — High complexity, needs streaming + incremental generation infrastructure first
- **D-3: Domain-Aware Questions** — Valuable but requires testing across many domains
- **D-5: Spec Diff and Iteration** — Requires version tracking infrastructure
- **D-6: Export Formats** — Current copy/download is functional. Optimize later
- **D-7: Contextual Help** — Nice-to-have, can be layered in anytime
- **D-9: Reasoning Transparency** — Can be added incrementally to any AI response
- **D-10: Build Integration** — End-game feature, save for when generation quality is proven

---

## UX Patterns Reference: What World-Class AI Tools Do in 2026

### Pattern: Streaming with Progressive Rendering (Claude Code, ChatGPT, Cursor)
- Tokens appear one-by-one or in small chunks
- Markdown renders progressively (headings appear, then content fills in)
- Code blocks syntax-highlight as they stream
- User can read the beginning while the end is still generating
- "Stop generating" button available during stream

### Pattern: Suggest-Then-Confirm (Cursor, GitHub Copilot, v0)
- AI proposes a complete solution
- User sees the proposal with a clear accept/reject/modify interface
- Accept is a single click or keyboard shortcut
- Modify opens an edit mode with the proposal pre-filled
- Reject triggers a new generation or falls back to manual input

### Pattern: Inline Actions on AI Output (Notion AI, Claude)
- Hover over any AI-generated section to see actions
- "Regenerate," "Expand," "Simplify," "Continue" buttons appear contextually
- Section-level operations, not just whole-document operations
- Changes are non-destructive (can undo/revert)

### Pattern: Contextual Follow-Up (ChatGPT, Claude, Cursor Chat)
- AI references previous conversation naturally
- "Building on what you said about authentication..."
- Context window is managed transparently
- User can @-reference specific previous messages or decisions

### Pattern: Phase Transitions as Celebrations (Linear, Figma)
- Completing a phase shows a micro-animation
- Progress feels earned and visible
- Summary card appears showing what was accomplished
- Clear preview of what's next

### Pattern: Command Palette as Power User Hub (Linear, Notion, VS Code)
- Cmd+K opens everything
- Search actions, not just navigation
- Fuzzy matching on commands
- Recently used actions float to top
- Context-aware suggestions (different commands in discovery vs delivery)

### Pattern: Skeleton Loading States (Vercel, Linear)
- Instead of spinners, show content skeletons that match the expected layout
- Gives users spatial awareness of what's loading
- Feels faster than blank + spinner
- Transitions smoothly to real content

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table Stakes | HIGH | These patterns are universal across all major AI tools. Observable in public products. |
| Differentiators | MEDIUM-HIGH | Based on domain analysis and gap identification. D-2 (Live Assembly) is most uncertain in complexity. |
| Anti-Features | HIGH | Based on clear product positioning as "AI does the work, user confirms." |
| UX Patterns | HIGH | Directly observable in Cursor, Claude Code, v0, ChatGPT, Notion AI, Linear, Figma AI. |
| Complexity Estimates | MEDIUM | Implementation complexity depends on existing code quality and refactoring scope. Streaming complexity depends on Anthropic SDK streaming support in current version. |

## Sources

- Direct observation of: Cursor, Claude Code, v0 by Vercel, ChatGPT, Notion AI, Linear, Figma AI, GitHub Copilot, Lovable, Bolt
- Anthropic SDK documentation (streaming API support)
- Next.js App Router documentation (streaming responses, ReadableStream)
- Existing Skill Forge codebase analysis (src/lib/llm/, src/app/api/, src/app/project/)
- Note: WebSearch was unavailable during this research. All findings based on direct product observation (training data) and codebase analysis. Streaming API specifics for Anthropic SDK v0.78.0 should be verified against current documentation before implementation.
