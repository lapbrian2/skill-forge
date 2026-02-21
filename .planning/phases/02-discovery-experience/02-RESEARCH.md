# Phase 2: Discovery Experience - Research

**Researched:** 2026-02-20
**Domain:** Chat UI architecture, suggest-then-confirm UX patterns, adaptive discovery state machine, auto-save/resume with localStorage, streaming LLM integration
**Confidence:** HIGH

## Summary

This phase transforms the existing form-style Q&A discovery (a monolithic 528-line `ProjectPage` component that shows one question at a time in a box) into a conversational chat interface where the AI acts as a senior architect proposing specific answers for the user to confirm, modify, or override. The current implementation is functional but has three critical UX problems: (1) it asks bare questions without proposing answers, forcing users to write from scratch, (2) it shows Q&A as flat cards with no conversational flow, and (3) it has no concept of adaptive depth -- the LLM decides `phase_complete` on its own with no structured depth control.

The existing LLM infrastructure from Phase 1 is complete: `llmParse()` for structured output with Zod validation, `llmStream()` for token-by-token streaming, per-task model config, prompt caching, retry with backoff, and token tracking. The `/api/discover` route already handles actions `classify`, `question`, `brief`, `features`, and `architecture` using `llmParse()`. The `DiscoveryQuestionSchema` returns `{ question, why, options, field, phase_complete }`. This schema needs extending to include the AI's proposed answer, confidence level, and reasoning.

The architecture change is primarily frontend: decompose the monolithic ProjectPage into focused components (ChatContainer, ChatBubble, SuggestConfirmCard, PhaseSummaryCard, SkipButton), introduce a chat message state model that persists to localStorage on every interaction, add a new API action `suggest` that returns a proposed answer with confidence, and implement adaptive depth logic that determines phase completion based on complexity-driven question counts from `COMPLEXITY_CONFIG`.

**Primary recommendation:** Build a chat message model (`ChatMessage[]`) that replaces the flat `QAEntry[]` for UI rendering, extend the `/api/discover` route with a `suggest` action that returns proposed answers with confidence levels, decompose the ProjectPage into small composable components, and use `useRef` with `scrollIntoView` for auto-scroll behavior.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.3 | Component architecture, hooks, refs | Already installed; useRef for scroll, useState for chat state |
| next | 16.1.6 | App Router pages, API routes | Already installed; project/[id] page is the target |
| framer-motion | 12.34.3 | Chat bubble animations, collapse/expand | Already installed; AnimatePresence already used in ProjectPage |
| zod | (installed) | Schema validation for new suggest action | Already installed; extend DiscoveryQuestionSchema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.575.0 | Icons for chat UI (Check, Edit, SkipForward, etc.) | Already installed |
| sonner | 2.0.7 | Toast notifications for save/skip/error | Already installed |
| tailwind-merge + clsx | (installed) | Conditional styling via cn() | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom chat scroll management | react-virtualized/react-window | Over-engineering; discovery has at most 20 messages, not thousands |
| Custom collapsible component | shadcn Collapsible / Accordion | Could add shadcn collapsible, but a simple div with framer-motion height animation is lighter and already in the pattern |
| useReducer for chat state | useState with spread updates | useReducer is cleaner for complex state transitions; recommend it for chat state machine |
| Separate chat page | Inline in ProjectPage | Keep within /project/[id] since the phase stepper and header context are needed |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
# May want to add shadcn collapsible for phase summary cards:
npx shadcn@latest add collapsible
# But this is optional -- framer-motion AnimatePresence works fine
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    project/[id]/
      page.tsx                    # REFACTORED: Slim orchestrator, delegates to components
  components/
    discovery/
      chat-container.tsx          # NEW: Scrollable chat area with auto-scroll
      chat-bubble.tsx             # NEW: Single AI or user message bubble
      suggest-confirm-card.tsx    # NEW: AI suggestion with accept/edit/override
      phase-summary-card.tsx      # NEW: Collapsed summary of completed phase
      skip-button.tsx             # NEW: "Skip to spec" button
      discovery-input.tsx         # NEW: User input area (textarea + submit)
      thinking-indicator.tsx      # NEW: Animated dots while AI is generating
    ui/
      collapsible.tsx             # NEW (optional): shadcn collapsible primitive
  lib/
    types.ts                      # MODIFIED: Add ChatMessage type, extend DiscoveryData
    llm/
      schemas.ts                  # MODIFIED: Add SuggestAnswerSchema
      prompts.ts                  # MODIFIED: Add suggest-then-confirm prompt
    discovery/
      state-machine.ts            # NEW: Chat state management (useReducer)
      adaptive-depth.ts           # NEW: Complexity-based question count logic
  app/
    api/
      discover/route.ts           # MODIFIED: Add "suggest" action
```

### Pattern 1: Chat Message Model
**What:** A `ChatMessage` type that represents every entry in the chat, with different message types for AI questions, AI suggestions, user confirmations, and phase summaries.
**When to use:** All discovery UI rendering.
**Example:**
```typescript
// In src/lib/types.ts
export type ChatMessageRole = "ai" | "user" | "system";
export type ChatMessageType =
  | "question"          // AI asks a question
  | "suggestion"        // AI proposes an answer (with confidence)
  | "user_response"     // User confirms, edits, or overrides
  | "phase_summary"     // Collapsed phase recap
  | "thinking";         // Transient: AI is generating

export interface AISuggestion {
  proposed_answer: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  best_practice_note: string | null;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  content: string;               // The display text
  phase: Phase;                  // Which discovery phase
  field: string;                 // Which discovery field this populates
  suggestion?: AISuggestion;     // Only for type: "suggestion"
  user_action?: "accept" | "edit" | "override"; // Only for type: "user_response"
  timestamp: string;
}
```

### Pattern 2: Chat State Machine (useReducer)
**What:** A `useReducer` hook managing the chat conversation state with explicit transitions: idle -> ai_thinking -> ai_message_received -> awaiting_user -> user_responded -> saving -> next_question.
**When to use:** The DiscoveryChat component or the ProjectPage orchestrator.
**Example:**
```typescript
// In src/lib/discovery/state-machine.ts

type DiscoveryStatus =
  | "idle"
  | "ai_thinking"
  | "ai_suggested"      // AI proposed an answer, waiting for user
  | "user_responding"    // User is editing/typing
  | "saving"             // Persisting to localStorage
  | "phase_complete"     // Phase done, show summary
  | "all_complete";      // All 3 phases done

interface DiscoveryState {
  status: DiscoveryStatus;
  messages: ChatMessage[];
  currentPhase: Phase;
  questionsAskedInPhase: number;
  understanding: Record<string, unknown>; // DISC-05: structured understanding
  error: string | null;
}

type DiscoveryAction =
  | { type: "START_THINKING" }
  | { type: "AI_QUESTION"; payload: { question: string; why: string; field: string } }
  | { type: "AI_SUGGEST"; payload: AISuggestion }
  | { type: "USER_ACCEPT"; payload: { answer: string } }
  | { type: "USER_EDIT"; payload: { answer: string } }
  | { type: "USER_OVERRIDE"; payload: { answer: string } }
  | { type: "SAVE_COMPLETE" }
  | { type: "PHASE_COMPLETE"; payload: { summary: string } }
  | { type: "ADVANCE_PHASE"; payload: { nextPhase: Phase } }
  | { type: "SKIP_TO_SPEC" }
  | { type: "RESTORE_SESSION"; payload: DiscoveryState }
  | { type: "ERROR"; payload: string };

function discoveryReducer(state: DiscoveryState, action: DiscoveryAction): DiscoveryState {
  switch (action.type) {
    case "START_THINKING":
      return { ...state, status: "ai_thinking" };
    case "AI_SUGGEST":
      // Append AI suggestion message, transition to ai_suggested
      return {
        ...state,
        status: "ai_suggested",
        messages: [...state.messages, {
          id: crypto.randomUUID(),
          role: "ai",
          type: "suggestion",
          content: state.messages[state.messages.length - 1]?.content || "",
          phase: state.currentPhase,
          field: "...",
          suggestion: action.payload,
          timestamp: new Date().toISOString(),
        }],
      };
    // ... other cases
  }
}
```

### Pattern 3: Suggest-Then-Confirm UX Flow
**What:** The AI proposes a specific answer (not just asks a question), and the user has three explicit actions: Accept (use as-is), Edit (modify the suggestion), Override (write their own).
**When to use:** Every discovery question (DISC-02).
**UX Flow:**
1. AI sends question bubble (left-aligned, streaming)
2. Immediately after question, AI sends suggestion card with:
   - Proposed answer text (editable textarea, pre-filled)
   - Confidence badge (high/medium/low with color)
   - Reasoning (collapsible, DISC-03)
   - Best practice note (if relevant)
3. User sees three buttons:
   - "Accept" (green check) -- uses proposed answer verbatim
   - "Edit & Confirm" (pencil) -- user modifies the textarea, then confirms
   - "Write My Own" (override) -- clears textarea, user writes from scratch
4. After user action, their response appears as a right-aligned chat bubble
5. AI updates its understanding object (DISC-05) and generates next question

**Example component structure:**
```tsx
// SuggestConfirmCard layout
<div className="ml-10 rounded-xl border border-white/8 bg-[#111] p-4 space-y-3">
  {/* Confidence badge */}
  <div className="flex items-center gap-2">
    <Badge variant="outline" className={confidenceColor}>
      {suggestion.confidence} confidence
    </Badge>
  </div>

  {/* Proposed answer (editable) */}
  <Textarea
    value={editedAnswer}
    onChange={e => setEditedAnswer(e.target.value)}
    className="bg-[#0A0A0A] border-white/8 text-[13px]"
    rows={3}
  />

  {/* Reasoning (collapsible) */}
  <button onClick={() => setShowReasoning(!showReasoning)}>
    <ChevronDown /> Why this answer?
  </button>
  {showReasoning && (
    <p className="text-[12px] text-white/40">{suggestion.reasoning}</p>
  )}

  {/* Action buttons */}
  <div className="flex gap-2">
    <Button onClick={handleAccept} className="bg-emerald-600">
      <Check /> Accept
    </Button>
    <Button onClick={handleEdit} variant="outline">
      <Pencil /> Edit & Confirm
    </Button>
    <Button onClick={handleOverride} variant="ghost">
      Write My Own
    </Button>
  </div>
</div>
```

### Pattern 4: Auto-Scroll Chat Container
**What:** A scrollable container that automatically scrolls to the bottom when new messages arrive, but respects user scroll position if they've scrolled up.
**When to use:** The ChatContainer wrapping all chat bubbles.
**Example:**
```typescript
// In ChatContainer component
const scrollRef = useRef<HTMLDivElement>(null);
const isNearBottom = useRef(true);

// Track if user has scrolled up
const handleScroll = () => {
  if (!scrollRef.current) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
  isNearBottom.current = scrollHeight - scrollTop - clientHeight < 100;
};

// Auto-scroll on new messages
useEffect(() => {
  if (isNearBottom.current && scrollRef.current) {
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }
}, [messages.length]);

return (
  <div
    ref={scrollRef}
    onScroll={handleScroll}
    className="flex-1 overflow-y-auto space-y-4 px-2 py-4"
    style={{ maxHeight: "calc(100vh - 280px)" }}
  >
    {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
  </div>
);
```

### Pattern 5: Phase Summary Cards (Collapsed)
**What:** When a discovery phase completes, all its messages collapse into a summary card showing key decisions.
**When to use:** After tollgate passes for discover, define, or architect phases (DISC-06).
**Example:**
```tsx
// PhaseSummaryCard
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: "auto" }}
  className="rounded-xl border border-white/6 bg-white/[0.02] p-4"
>
  <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full">
    <div className="flex items-center gap-2">
      <CheckCircle className="h-4 w-4 text-emerald-400" />
      <span className="text-[14px] font-medium">Phase {phaseNumber}: {phaseLabel}</span>
      <Badge variant="outline" className="text-[10px] text-emerald-400">
        {answersCount} decisions
      </Badge>
    </div>
    <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
  </button>

  <AnimatePresence>
    {expanded && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="mt-3 space-y-2"
      >
        {keyDecisions.map(d => (
          <div key={d.field} className="text-[12px]">
            <span className="text-white/30">{d.field}:</span>
            <span className="text-white/60 ml-2">{d.value}</span>
          </div>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

### Pattern 6: Auto-Save and Session Resume (DISC-08)
**What:** Save chat state to localStorage after every user interaction. On page load, restore the full chat history and resume from the last position.
**When to use:** Every state transition that changes messages or phase.
**Implementation strategy:**
```typescript
// Auto-save: debounced save after every reducer dispatch
useEffect(() => {
  if (!project) return;
  const updated: Project = {
    ...project,
    discovery: {
      ...project.discovery,
      // Store chat messages in a new field
      chat_messages: state.messages,
      answers: deriveQAEntries(state.messages), // Keep backward compat
    },
  };
  saveProject(updated);
}, [state.messages, state.currentPhase]);

// Resume: on mount, check for existing chat_messages
useEffect(() => {
  const p = getProject(projectId);
  if (p?.discovery?.chat_messages?.length > 0) {
    dispatch({
      type: "RESTORE_SESSION",
      payload: rebuildStateFromMessages(p.discovery.chat_messages, p.current_phase),
    });
  } else if (p?.discovery?.answers?.length > 0) {
    // Migrate old Q&A format to chat messages
    dispatch({
      type: "RESTORE_SESSION",
      payload: migrateQAToChat(p.discovery.answers, p.current_phase),
    });
  }
}, [projectId]);
```

### Anti-Patterns to Avoid
- **Monolithic ProjectPage:** The current 528-line component handles all phases, questions, answers, spec generation, and spec display. Split into focused components. The ProjectPage should be a thin orchestrator that delegates to DiscoveryChat, SpecGeneration, and SpecDelivery.
- **Stateless LLM conversation:** The current implementation sends all previous Q&A pairs in every request but doesn't maintain a structured understanding. Add an `understanding` object (DISC-05) that the LLM updates after each answer.
- **Hardcoded phase_complete from LLM:** The current code relies entirely on the LLM's `phase_complete: boolean` to decide when a phase ends. This is unpredictable. Instead, use `COMPLEXITY_CONFIG` question counts as guardrails, with the LLM's signal as one input.
- **No streaming for question/suggestion:** Currently `llmParse()` is used for questions (non-streaming). This is fine for the structured question, but the suggestion text could benefit from streaming to show the AI "thinking." Consider a two-step flow: `llmParse()` for the question structure, then optionally stream the suggestion reasoning.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat scroll management | Custom virtual scrolling | Simple `useRef` + `scrollIntoView` | Max 20 messages; virtual scrolling is massive over-engineering |
| Collapsible sections | Custom height animation from scratch | framer-motion `AnimatePresence` + `height: "auto"` | Already in the codebase pattern (see PhaseContent in ProjectPage) |
| Confidence badge colors | Hardcoded color maps | A simple Record lookup + cn() | Already the pattern used for complexity badges |
| Debounced auto-save | Custom debounce | Save synchronously on every action (localStorage is fast) | localStorage writes are synchronous and < 1ms for this data size |
| Typing indicator animation | Custom keyframe animation | Three-dot CSS animation or framer-motion | Trivial CSS, don't over-think it |

**Key insight:** The chat UI is fundamentally a simple linear message list with at most 20-40 messages. Do NOT reach for complex chat libraries, virtual scrolling, or real-time WebSocket patterns. This is a turn-based conversation rendered as a scrollable div.

## Common Pitfalls

### Pitfall 1: Chat Scroll Jank on Message Append
**What goes wrong:** New messages appear but the scroll position jumps erratically, or the user loses their scroll position.
**Why it happens:** Calling `scrollTo` synchronously during render, or not accounting for user scroll position.
**How to avoid:** Track `isNearBottom` with a scroll listener. Only auto-scroll when user is near the bottom. Use `requestAnimationFrame` or `useEffect` to scroll after DOM paint. Use `behavior: "smooth"` for non-jarring scroll.
**Warning signs:** Messages appear but viewport doesn't follow; or user trying to read history gets yanked to bottom.

### Pitfall 2: localStorage Quota Exceeded
**What goes wrong:** After many questions and long AI suggestions, `saveProject()` fails silently because localStorage is full (typically 5-10MB).
**Why it happens:** Storing full chat messages with reasoning, suggestions, and metadata for multiple projects.
**How to avoid:** Keep chat messages lean (don't store full streaming text in each message). Monitor total storage. Show a warning if approaching 4MB. Implement a `trimOldMessages()` that collapses old phase messages into summaries.
**Warning signs:** `saveProject()` starts throwing `QuotaExceededError`.

### Pitfall 3: Stale Closure in Auto-Save Effect
**What goes wrong:** The auto-save effect captures a stale `project` reference, overwriting newer data.
**Why it happens:** React closure semantics -- the effect captures the `project` variable from its render cycle.
**How to avoid:** Use a ref for the latest project state, or derive the save payload from the reducer state (which is always current). Alternatively, use `useCallback` with proper dependencies.
**Warning signs:** Data appears to "revert" after saving; earlier answers disappear.

### Pitfall 4: Phase Transition Race Condition
**What goes wrong:** User clicks "Accept" on the last question of a phase, but the phase advance and next question fetch race, causing duplicate messages or a stuck state.
**Why it happens:** `advancePhase()` and `fetchNextQuestion()` are both async and both update state.
**How to avoid:** Use the reducer to enforce sequential transitions. The reducer should be the single source of truth -- `PHASE_COMPLETE` action must complete before `START_THINKING` for the next phase. Gate API calls behind state status checks.
**Warning signs:** Duplicate questions appear; or the UI shows "Thinking..." but never resolves.

### Pitfall 5: AI Suggestion Quality -- Bad Proposed Answers
**What goes wrong:** The AI proposes generic, unhelpful answers that users always override.
**Why it happens:** The suggest prompt doesn't have enough context or instruction to propose specific, best-practice answers.
**How to avoid:** The suggest prompt must include: (1) all previous answers for context, (2) the project description, (3) explicit instruction to propose a specific, opinionated answer based on industry best practices, (4) instruction to include concrete examples (e.g., "PostgreSQL with Prisma ORM" not "a database"). Temperature should be 0.6-0.7 for creativity but not randomness.
**Warning signs:** Users click "Write My Own" on >50% of suggestions; suggestions are vague ("a suitable solution").

### Pitfall 6: Backward Compatibility with Existing Projects
**What goes wrong:** Users with projects created before Phase 2 (using old Q&A format) see a broken UI.
**Why it happens:** New code expects `chat_messages` field on DiscoveryData, but old projects only have `answers: QAEntry[]`.
**How to avoid:** Add a migration function that converts old `QAEntry[]` into `ChatMessage[]` on project load. Check for `chat_messages` field existence. Never remove the `answers` array -- keep it as the canonical data source, with `chat_messages` as the UI representation.
**Warning signs:** Old projects show empty chat; or crash with "cannot read property of undefined."

### Pitfall 7: Adaptive Depth -- LLM Ignores Question Count Guidance
**What goes wrong:** The LLM sets `phase_complete: true` after 2 questions for a complex project, or asks 15 questions for a simple project.
**Why it happens:** The LLM prompt doesn't strictly enforce question counts; it makes a judgment call.
**How to avoid:** Implement client-side guardrails:
- Minimum questions per phase: `COMPLEXITY_CONFIG[complexity].questions.min / 3` (divide by 3 phases)
- Maximum questions per phase: `COMPLEXITY_CONFIG[complexity].questions.max / 3`
- The LLM's `phase_complete` signal is only honored if `questionsAsked >= minPerPhase`
- Force phase complete if `questionsAsked >= maxPerPhase`

**Warning signs:** Simple projects take 20 minutes; complex projects finish in 3 questions.

## Code Examples

Verified patterns from the existing codebase:

### Extended Discovery Question Schema (with Suggestion)
```typescript
// In src/lib/llm/schemas.ts -- extend existing schema

export const DiscoverySuggestionSchema = z.object({
  question: z.string(),
  why: z.string(),
  options: z.array(z.string()).nullable(),
  field: z.string(),
  phase_complete: z.boolean(),
  // NEW: AI's proposed answer
  suggested_answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
  best_practice_note: z.string().nullable(),
});

export type DiscoverySuggestionOutput = z.infer<typeof DiscoverySuggestionSchema>;
```

### Suggest-Then-Confirm Prompt Template
```typescript
// In src/lib/llm/prompts.ts -- new prompt for suggest action

export function promptDiscoverySuggestion(
  description: string,
  phase: string,
  answers: Array<{ question: string; answer: string }>,
  complexity: string,
  isAgentic: boolean,
  understanding: Record<string, unknown>,
): string {
  const answersText = answers.length > 0
    ? answers.map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`).join("\n\n")
    : "No questions asked yet.";

  const understandingText = Object.keys(understanding).length > 0
    ? JSON.stringify(understanding, null, 2)
    : "No structured understanding yet.";

  return `The user is building: "${description}"
Complexity: ${complexity}
Has agentic components: ${isAgentic}
Current phase: ${phase}

Current structured understanding:
${understandingText}

Previous Q&A:
${answersText}

Generate the next most important question AND propose a specific, best-practice answer.

Your proposed answer should be:
- SPECIFIC: Name exact technologies, patterns, and approaches (not "a database" but "PostgreSQL with Prisma ORM")
- OPINIONATED: Based on industry best practices for this type of project
- ACTIONABLE: Something the user can confirm as-is or tweak slightly
- CONTEXTUAL: Informed by all previous answers and the project description

Also update the structured understanding object with what you know so far.

${phase === "discover" ? "Focus on: vision, target users, platform, timeline, scope boundaries." : ""}
${phase === "define" ? "Focus on: specific features with acceptance criteria, user stories, edge cases." : ""}
${phase === "architect" ? "Focus on: data model, API design, tech stack, security." : ""}
${isAgentic ? "Include agentic considerations: agent patterns, tool access, safety, cost." : ""}

Respond as JSON with these exact fields.`;
}
```

### Adaptive Depth Logic
```typescript
// In src/lib/discovery/adaptive-depth.ts

import { COMPLEXITY_CONFIG } from "@/lib/constants";
import type { Complexity, Phase } from "@/lib/types";

const DISCOVERY_PHASES: Phase[] = ["discover", "define", "architect"];

export interface DepthConfig {
  minQuestionsPerPhase: number;
  maxQuestionsPerPhase: number;
  totalMin: number;
  totalMax: number;
}

export function getDepthConfig(complexity: Complexity): DepthConfig {
  const config = COMPLEXITY_CONFIG[complexity];
  const phaseCount = DISCOVERY_PHASES.length;
  return {
    minQuestionsPerPhase: Math.ceil(config.questions.min / phaseCount),
    maxQuestionsPerPhase: Math.ceil(config.questions.max / phaseCount),
    totalMin: config.questions.min,
    totalMax: config.questions.max,
  };
}

export function shouldPhaseComplete(
  complexity: Complexity,
  questionsAskedInPhase: number,
  llmSaysComplete: boolean,
): "continue" | "complete" | "force_complete" {
  const depth = getDepthConfig(complexity);

  // Haven't asked minimum yet -- always continue
  if (questionsAskedInPhase < depth.minQuestionsPerPhase) {
    return "continue";
  }

  // Hit maximum -- force complete regardless of LLM
  if (questionsAskedInPhase >= depth.maxQuestionsPerPhase) {
    return "force_complete";
  }

  // Between min and max -- trust LLM's signal
  return llmSaysComplete ? "complete" : "continue";
}
```

### ChatBubble Component
```tsx
// In src/components/discovery/chat-bubble.tsx
"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Bot, User } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isAI = message.role === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"}`}
    >
      {isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-blue-400" />
        </div>
      )}

      <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
        isAI
          ? "bg-white/[0.04] border border-white/6 text-white/80"
          : "bg-orange-500/10 border border-orange-500/20 text-orange-200"
      }`}>
        <p className="text-[13px] leading-relaxed">{message.content}</p>
        {message.type === "question" && message.content && (
          <p className="text-[11px] text-white/25 mt-1.5">
            {/* "why" context from the AI */}
          </p>
        )}
        {message.user_action && (
          <Badge variant="outline" className="mt-2 text-[10px]">
            {message.user_action === "accept" ? "Accepted suggestion" :
             message.user_action === "edit" ? "Edited suggestion" :
             "Custom answer"}
          </Badge>
        )}
      </div>

      {!isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center">
          <User className="h-4 w-4 text-orange-400" />
        </div>
      )}
    </motion.div>
  );
}
```

### Understanding Object Structure (DISC-05)
```typescript
// The "understanding" object is updated by the LLM after each answer
// It serves as structured context that improves question quality

interface DiscoveryUnderstanding {
  // Phase 1: Discover
  project_type?: string;       // "SaaS dashboard", "CLI tool", etc.
  target_audience?: string;    // "Freelance developers", "Enterprise teams"
  platform?: string;           // "Web (Next.js)", "Mobile (React Native)"
  scale?: string;              // "Single user", "Multi-tenant"
  timeline?: string;           // "MVP in 2 weeks", "Production in 3 months"

  // Phase 2: Define
  core_features?: string[];    // ["Auth", "Dashboard", "Reports"]
  user_roles?: string[];       // ["Admin", "Viewer", "Editor"]
  integrations?: string[];     // ["Stripe", "GitHub API"]

  // Phase 3: Architect
  data_entities?: string[];    // ["User", "Project", "Invoice"]
  api_style?: string;          // "REST", "GraphQL", "tRPC"
  auth_strategy?: string;      // "NextAuth + JWT", "Clerk"

  // Meta
  assumptions?: string[];      // Things inferred but not confirmed
  open_questions?: string[];   // Things still unclear
}
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 2) | Impact |
|------------------------|----------------------|--------|
| Flat Q&A cards (question above, answer below) | Chat-style bubbles (AI left, user right) | Conversational flow; feels like talking to an architect |
| User writes answers from scratch | AI proposes answers, user confirms/edits | 80% less typing; better quality answers with best practices baked in |
| LLM decides phase_complete freely | Client-side adaptive depth guardrails | Predictable question counts matching complexity config |
| Monolithic 528-line ProjectPage | Decomposed into 6-7 focused components | Maintainable, testable, composable |
| Q&A lost if not submitted | Auto-save every state change to localStorage | Session resume on reload (DISC-08) |
| Previous answers shown as flat cards | Completed phases collapse into summary cards | Cleaner UI; key decisions always visible without scrolling through 15 Q&As |

**Deprecated/outdated:**
- The current `currentQuestion` state pattern (single question at a time with no history) is replaced by `ChatMessage[]` array
- The current `handleSubmitAnswer()` flow (direct fetch -> save -> check phase_complete) is replaced by the reducer-based state machine

## Detailed Component Breakdown

### Component 1: ChatContainer
**File:** `src/components/discovery/chat-container.tsx`
**Responsibility:** Scrollable container wrapping all chat messages. Handles auto-scroll. Renders PhaseSummaryCards for completed phases, then ChatBubbles and SuggestConfirmCards for the current phase.
**Props:** `messages: ChatMessage[]`, `currentPhase: Phase`, `isThinking: boolean`
**Size estimate:** ~60 lines

### Component 2: ChatBubble
**File:** `src/components/discovery/chat-bubble.tsx`
**Responsibility:** Renders a single AI or user message with appropriate alignment, colors, and avatar.
**Props:** `message: ChatMessage`
**Size estimate:** ~50 lines

### Component 3: SuggestConfirmCard
**File:** `src/components/discovery/suggest-confirm-card.tsx`
**Responsibility:** The core suggest-then-confirm interaction. Shows AI's proposed answer, confidence badge, collapsible reasoning, and Accept/Edit/Override buttons. The proposed answer is in an editable textarea.
**Props:** `suggestion: AISuggestion`, `onAccept: (answer: string) => void`, `onEdit: (answer: string) => void`, `onOverride: (answer: string) => void`
**Size estimate:** ~100 lines

### Component 4: PhaseSummaryCard
**File:** `src/components/discovery/phase-summary-card.tsx`
**Responsibility:** Collapsed summary of a completed phase. Shows phase name, number of decisions, expandable list of key decisions.
**Props:** `phase: Phase`, `phaseNumber: number`, `decisions: Array<{ field: string; value: string }>`, `defaultExpanded?: boolean`
**Size estimate:** ~60 lines

### Component 5: SkipButton
**File:** `src/components/discovery/skip-button.tsx`
**Responsibility:** "I've said enough, generate it" button. Shows warning about fewer questions = less specific spec.
**Props:** `onSkip: () => void`, `questionsAnswered: number`, `complexity: Complexity`
**Size estimate:** ~40 lines

### Component 6: DiscoveryInput
**File:** `src/components/discovery/discovery-input.tsx`
**Responsibility:** The text input area at the bottom of the chat. Only visible when in "override" mode (user wants to write their own answer).
**Props:** `onSubmit: (answer: string) => void`, `placeholder?: string`, `disabled?: boolean`
**Size estimate:** ~40 lines

### Component 7: ThinkingIndicator
**File:** `src/components/discovery/thinking-indicator.tsx`
**Responsibility:** Animated "AI is thinking..." indicator shown in the chat while waiting for LLM response.
**Props:** none
**Size estimate:** ~20 lines

## API Changes

### New Action: "suggest" on /api/discover
The existing `/api/discover` route needs a new action that combines the current "question" action with answer suggestion.

```typescript
// In src/app/api/discover/route.ts -- add to switch cases

case "suggest": {
  const { description, phase, answers, complexity, is_agentic, understanding } = body;

  const { data, usage } = await llmParse({
    task: "question", // Reuses "question" model config (Sonnet, 2048 tokens, 0.7 temp)
    system: SYSTEM_DISCOVERY,
    prompt: promptDiscoverySuggestion(
      description, phase, answers || [],
      complexity, is_agentic, understanding || {},
    ),
    schema: DiscoverySuggestionSchema,
  });

  return NextResponse.json({
    ...data,
    meta: {
      tokens_input: usage.input_tokens,
      tokens_output: usage.output_tokens,
      cache_read: usage.cache_read_input_tokens,
      cache_creation: usage.cache_creation_input_tokens,
      model: usage.model,
    },
  });
}
```

### Model Config Consideration
The "question" task config (Sonnet, 2048 max tokens, 0.7 temp) should work for the suggest action since the response now includes a suggested answer + reasoning, which is more text but still well under 2048 tokens. If responses get truncated, bump to 4096. Could also add a separate "suggest" task to `MODEL_CONFIG` in models.ts.

## Type System Changes

### DiscoveryData Extension
```typescript
// In src/lib/types.ts -- add to DiscoveryData interface

export interface DiscoveryData {
  // ... existing fields ...

  // NEW: Chat-format message history for UI rendering
  chat_messages?: ChatMessage[];  // Optional for backward compat

  // NEW: AI's structured understanding (DISC-05)
  understanding?: Record<string, unknown>;
}
```

The `chat_messages` field is optional (`?`) so old projects load without errors. The `answers: QAEntry[]` array remains the canonical data -- `chat_messages` is the richer UI representation that includes suggestions, confidence levels, and user actions.

## Open Questions

1. **Two-step vs. single-step AI call**
   - What we know: Currently the LLM generates a question in one call. The new flow needs question + suggested answer.
   - What's unclear: Should the question and suggestion come from one LLM call (bigger response) or two sequential calls (question first, then suggestion)?
   - Recommendation: Single call. Two calls doubles latency and cost. The `DiscoverySuggestionSchema` combines both in one structured response. The LLM is perfectly capable of generating both in one pass.

2. **Understanding object persistence format**
   - What we know: DISC-05 requires a structured understanding object updated after each answer.
   - What's unclear: Should the understanding be fully LLM-managed (sent to and returned from the LLM each time) or partially client-managed (updated client-side from structured answers)?
   - Recommendation: LLM-managed. Include the current understanding in the prompt, ask the LLM to return an updated understanding in the response. Add an `updated_understanding` field to the schema. This keeps the AI's contextual reasoning coherent.

3. **Streaming for suggestions**
   - What we know: `llmParse()` is non-streaming. The suggestion text might benefit from streaming to show the AI "typing."
   - What's unclear: Is the latency of `llmParse()` for suggestions (typically 2-5 seconds with Sonnet) acceptable without streaming?
   - Recommendation: Start with `llmParse()` (non-streaming). Show a "thinking" indicator during the wait. If user testing shows the 2-5 second wait is frustrating, add streaming in a follow-up. The structured output guarantee from `llmParse()` is more valuable than streaming partial JSON.

4. **Migration path for existing projects**
   - What we know: Old projects have `answers: QAEntry[]` but no `chat_messages`.
   - What's unclear: How seamless does migration need to be?
   - Recommendation: On project load, if `chat_messages` is absent but `answers` exists, auto-convert `QAEntry[]` to `ChatMessage[]` (one AI question bubble + one user response bubble per entry, without suggestions). This provides backward compatibility without data loss.

## Plan Breakdown Recommendation

### Plan 02-01: Types, Schemas, and State Machine
- Extend `types.ts` with `ChatMessage`, `AISuggestion`, `ChatMessageRole`, `ChatMessageType`
- Add `chat_messages?` and `understanding?` fields to `DiscoveryData`
- Create `DiscoverySuggestionSchema` in `schemas.ts`
- Create `promptDiscoverySuggestion()` in `prompts.ts`
- Create `src/lib/discovery/state-machine.ts` (useReducer-based)
- Create `src/lib/discovery/adaptive-depth.ts`
- Add "suggest" action to `/api/discover/route.ts`

**Why first:** Everything else depends on the types, schemas, and state management.

### Plan 02-02: Chat UI Components
- Create `src/components/discovery/chat-container.tsx`
- Create `src/components/discovery/chat-bubble.tsx`
- Create `src/components/discovery/suggest-confirm-card.tsx`
- Create `src/components/discovery/thinking-indicator.tsx`
- Create `src/components/discovery/discovery-input.tsx`

**Why second:** Pure UI components that can be built against the types from Plan 01.

### Plan 02-03: Phase Summary, Skip, and Page Integration
- Create `src/components/discovery/phase-summary-card.tsx`
- Create `src/components/discovery/skip-button.tsx`
- Refactor `src/app/project/[id]/page.tsx` to use new components
- Implement auto-save/resume logic
- Implement backward compatibility migration for old projects
- Wire up adaptive depth to control phase transitions
- Test full flow: create project -> discover -> define -> architect -> specify

**Why third:** Integration plan that wires everything together and handles edge cases.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: All files in `src/lib/`, `src/app/`, `src/components/` read and analyzed
- `src/lib/types.ts` -- DiscoveryData, QAEntry, Project interfaces
- `src/lib/llm/client.ts` -- llmParse(), llmStream() implementations
- `src/lib/llm/schemas.ts` -- Existing Zod schemas
- `src/lib/llm/prompts.ts` -- Existing prompt templates
- `src/lib/llm/models.ts` -- Per-task model configuration
- `src/lib/constants.ts` -- COMPLEXITY_CONFIG with question counts per complexity level
- `src/app/api/discover/route.ts` -- Existing API route with action dispatch
- `src/app/project/[id]/page.tsx` -- Current 528-line monolithic page component
- `src/lib/storage.ts` -- localStorage persistence layer

### Secondary (MEDIUM confidence)
- React 19 `useReducer` pattern -- standard React hook, well-documented
- `framer-motion` AnimatePresence pattern -- already used in the codebase
- `scrollIntoView` / `scrollTo` with `behavior: "smooth"` -- standard Web API

### Tertiary (LOW confidence)
- Suggest-then-confirm UX pattern effectiveness -- based on general UX research and training data, not verified against specific studies. The core idea (AI proposes, user confirms) is well-established in AI-assisted tools but effectiveness for spec generation specifically is unverified.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all patterns use existing installed libraries
- Architecture: HIGH - Based on direct analysis of the existing codebase and standard React patterns
- Component design: HIGH - Straightforward decomposition of existing monolithic component
- Pitfalls: HIGH - Derived from analyzing existing code patterns and common React state management issues
- Suggest-then-confirm UX: MEDIUM - Pattern is sound but AI suggestion quality depends on prompt engineering iteration
- Adaptive depth: HIGH - Based on existing COMPLEXITY_CONFIG data in constants.ts

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable stack; no external dependency changes expected)
