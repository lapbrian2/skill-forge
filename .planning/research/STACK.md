# Technology Stack

**Project:** Skill Forge -- AI-Powered Engineering Specification Generator
**Researched:** 2026-02-20
**Overall confidence:** MEDIUM-HIGH (verified against installed packages and SDK type definitions; web sources unavailable for version freshness checks)

## Current Stack (Baseline)

What is already installed and working:

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | App framework |
| React | 19.2.3 | UI library |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | 4.2.0 | Styling |
| shadcn/ui | 3.8.5 (CLI) | Component library |
| Radix UI | 1.4.3 | Headless primitives |
| @anthropic-ai/sdk | 0.78.0 | LLM integration |
| Framer Motion | 12.34.3 | Animations |
| Sonner | 2.0.7 | Toast notifications |
| Lucide React | 0.575.0 | Icons |
| CodeMirror (@uiw/react-codemirror) | 4.25.4 | Code editing |
| JSZip | 3.10.1 | ZIP file generation |
| file-saver | 2.0.5 | File downloads |
| cmdk | 1.1.1 | Command palette |
| class-variance-authority | 0.7.1 | Component variants |
| clsx / tailwind-merge | latest | Class merging |

---

## Recommended Additions

Libraries and tools to ADD to the existing stack. Organized by the specific gap they fill.

### 1. Structured LLM Outputs -- Zod

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | ^3.25.0 or ^4.0.0 | Schema validation + structured LLM output | The Anthropic SDK v0.78.0 already declares zod as an optional peer dependency (`"zod": "^3.25.0 \|\| ^4.0.0"`). It ships `zodOutputFormat()` in `@anthropic-ai/sdk/helpers/zod` and `jsonSchemaOutputFormat()` in `@anthropic-ai/sdk/helpers/json-schema`. The current codebase does NOT use these -- instead it manually strips markdown fences and parses JSON with `JSON.parse()` in `llmCallJSON()`. This is fragile and loses type safety. |

**Confidence:** HIGH -- Verified directly from `@anthropic-ai/sdk/helpers/zod.d.ts` and `@anthropic-ai/sdk/lib/parser.d.ts` in node_modules.

**What this replaces:** The entire `llmCallJSON()` function in `src/lib/llm/client.ts` which currently appends "Respond ONLY with valid JSON" to the system prompt and manually strips code fences. The SDK's `messages.parse()` method with `zodOutputFormat()` provides:
- Typed `parsed_output` on the response object
- Proper JSON output format enforcement at the API level (via `output_config.format`)
- Automatic Zod validation of the response
- No more manual JSON.parse or fence-stripping

**Migration pattern:**
```typescript
// BEFORE (current fragile approach)
const { data } = await llmCallJSON<{ complexity: string }>({
  system: SYSTEM_COMPLEXITY,
  prompt: promptClassifyComplexity(description),
});

// AFTER (SDK-native structured outputs)
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ClassificationSchema = z.object({
  complexity: z.enum(["simple", "moderate", "complex"]),
  is_agentic: z.boolean(),
  reasoning: z.string(),
  suggested_name: z.string(),
  one_liner: z.string(),
});

const message = await client.messages.parse({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
  system: SYSTEM_COMPLEXITY,
  output_config: {
    format: zodOutputFormat(ClassificationSchema),
  },
});

const result = message.parsed_output; // fully typed as z.infer<typeof ClassificationSchema>
```

### 2. Streaming for Real-Time UX

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (already installed) @anthropic-ai/sdk | 0.78.0 | Streaming via `messages.stream()` | The SDK already provides `MessageStream` with event-based streaming (`on('text', ...)`, `on('thinking', ...)`, `on('inputJson', ...)`). The current codebase does NOT stream at all -- every LLM call blocks until complete, which means users stare at a loading spinner for 5-30 seconds. |

**Confidence:** HIGH -- Verified from `@anthropic-ai/sdk/lib/MessageStream.d.ts`.

**What this enables:**
- `client.messages.stream()` returns a `MessageStream` with typed events
- `stream.on('text', (delta, snapshot) => ...)` for incremental text delivery
- `stream.on('thinking', (delta, snapshot) => ...)` for extended thinking visibility
- `stream.toReadableStream()` for backend-to-frontend streaming via Server-Sent Events
- `MessageStream.fromReadableStream()` for frontend consumption

**The SDK supports streaming + structured outputs together:**
```typescript
const stream = client.messages.stream({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 8192,
  messages: [...],
  output_config: {
    format: zodOutputFormat(SpecSchema),
  },
});

// Stream text to client in real-time
stream.on('text', (delta) => controller.enqueue(delta));

// Get typed parsed output at the end
const message = await stream.finalMessage();
const spec = message.parsed_output; // fully typed
```

**Streaming transport pattern:** Use Next.js Route Handlers returning `ReadableStream` directly. The client reads via `fetch` + `ReadableStream` (native browser API). No extra libraries needed. Do NOT use the Vercel AI SDK for this -- the Anthropic SDK's built-in streaming is more direct, avoids an abstraction layer, and the codebase already depends on `@anthropic-ai/sdk`.

### 3. Markdown Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-markdown | ^10 (latest) | Render LLM-generated markdown specs | The app generates engineering specs as markdown (see `GeneratedSpec.markdown_content`). Currently there is NO markdown renderer installed. The spec output needs rich rendering: headings, code blocks, tables, lists, emphasis. react-markdown is the dominant React markdown renderer, uses remark/rehype under the hood, and supports streaming (partial markdown renders correctly). |
| remark-gfm | ^4 | GitHub Flavored Markdown support | Tables, task lists, strikethrough, autolinks. Engineering specs need tables for data models, API contracts. |
| rehype-highlight | ^7 | Syntax highlighting in code blocks | Specs contain code examples (API payloads, data models). Highlight.js via rehype gives syntax coloring. |
| rehype-slug | ^6 | Auto-generate heading IDs | Enables table-of-contents navigation within long specs (anchor links to sections). |

**Confidence:** MEDIUM -- react-markdown is well-established, but exact latest version number (^10) is based on training data and should be verified at install time. The library has been stable and actively maintained.

**Why NOT other options:**
- **@mdx-js/mdx**: Overkill. MDX is for interactive content with embedded JSX components. Our specs are pure markdown generated by an LLM -- no embedded React components needed.
- **marked + dangerouslySetInnerHTML**: Security risk. No React integration. No streaming-friendly rendering.
- **Custom parser**: Reinventing the wheel poorly.

**Why react-markdown specifically works for streaming:** react-markdown renders whatever markdown string you pass it. As streaming text arrives, you append to the string and re-render. react-markdown handles partial/incomplete markdown gracefully -- an unclosed heading or code block renders as far as it can. This gives users the "typing" effect during spec generation.

### 4. Extended Thinking Configuration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (already installed) @anthropic-ai/sdk | 0.78.0 | Extended thinking via `thinking` config | The SDK supports `ThinkingConfigParam` with `enabled` (budget_tokens), `disabled`, and `adaptive` modes. For spec generation (the core value prop), extended thinking dramatically improves output quality -- Claude can reason through data model relationships, identify edge cases, and maintain consistency across spec sections. |

**Confidence:** HIGH -- Verified from `ThinkingConfigEnabled`, `ThinkingConfigDisabled`, `ThinkingConfigAdaptive` types in messages.d.ts.

**Recommended usage pattern:**
- Discovery questions: `thinking: { type: 'disabled' }` -- fast responses needed for conversational flow
- Spec generation: `thinking: { type: 'enabled', budget_tokens: 8192 }` -- deep reasoning for comprehensive specs
- Validation: `thinking: { type: 'adaptive' }` -- let the model decide based on complexity

### 5. Output Effort Control

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (already installed) @anthropic-ai/sdk | 0.78.0 | Output effort via `output_config.effort` | The SDK's `OutputConfig` supports an `effort` field with levels: `low`, `medium`, `high`, `max`. This pairs with complexity tiers: simple projects get `medium` effort, complex projects get `high` or `max`. Controls cost/quality tradeoff per call. |

**Confidence:** HIGH -- Verified from `OutputConfig` interface in messages.d.ts.

### 6. Persistent Storage (Future-Ready)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (evaluate later) Supabase or SQLite | -- | Replace localStorage | The codebase explicitly notes "Designed for easy swap to Supabase in V2" in storage.ts. localStorage has hard limits (~5-10MB depending on browser) and a full spec generation can easily be 50KB+. For the MVP milestone, localStorage is acceptable. Flag for later. |

**Confidence:** N/A -- This is a flag, not a recommendation for this milestone.

### 7. Rate Limiting and Error Handling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (no library needed) | -- | Rate limit handling | The Anthropic SDK already provides typed errors: `RateLimitError`, `APIConnectionError`, `APIConnectionTimeoutError`, etc. (verified from `@anthropic-ai/sdk/core/error.d.ts`). The current codebase catches generic errors with `error instanceof Error ? error.message : "Unknown error"`. This should be upgraded to handle SDK-specific error types for proper retry logic and user-facing messages. |

**Confidence:** HIGH -- Verified from SDK exports.

### 8. Prompt Caching

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| (already installed) @anthropic-ai/sdk | 0.78.0 | Cache control via `cache_control` blocks | The SDK supports `CacheControlEphemeral` with `type: 'ephemeral'` and `ttl: '5m' \| '1h'` on system prompts and content blocks. The system prompts in `prompts.ts` are static and reused across calls -- these are perfect candidates for prompt caching. Reduces input token costs by up to 90% for cached content. |

**Confidence:** HIGH -- Verified from `CacheControlEphemeral` interface: `{ type: 'ephemeral'; ttl?: '5m' | '1h' }`.

**Implementation pattern:**
```typescript
const response = await client.messages.create({
  model: LLM_MODEL,
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: SYSTEM_DISCOVERY,
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ],
  messages: [...],
});
```

---

## Recommended Stack Changes

Changes to EXISTING patterns, not new additions.

### 1. Upgrade LLM Model Selection

**Current:** `LLM_MODEL = "claude-sonnet-4-20250514"` (hardcoded)

**Recommended:** Use model per task pattern, selecting from the current model list:

| Task | Model | Rationale |
|------|-------|-----------|
| Complexity classification | `claude-haiku-4-5` | Fast, cheap, simple classification task |
| Discovery questions | `claude-sonnet-4-5-20250929` | Good conversational quality, reasonable speed |
| Feature generation | `claude-sonnet-4-5-20250929` | Quality/speed balance for structured output |
| Spec generation | `claude-sonnet-4-5-20250929` with extended thinking | Deep reasoning for comprehensive specs |
| Validation/scoring | `claude-haiku-4-5` | Systematic checking, doesn't need creativity |

**Confidence:** HIGH -- Model names verified from `Model` type in messages.d.ts: `'claude-opus-4-6' | 'claude-sonnet-4-6' | ... | 'claude-haiku-4-5' | 'claude-sonnet-4-5-20250929' | ...`

### 2. Replace llmCallJSON with SDK-Native Structured Outputs

**Current:** Manual JSON parsing with fence-stripping in `llmCallJSON()`
**Replace with:** `client.messages.parse()` + `zodOutputFormat()` for non-streaming calls, `client.messages.stream()` with structured output for streaming calls.

See Zod section above for full migration pattern.

### 3. Add Streaming to Spec Generation

**Current:** The `/api/generate` route blocks for the entire LLM response (can take 30+ seconds for complex specs at 16384 max_tokens), then returns the full markdown at once.

**Replace with:** SSE/ReadableStream pattern:

```typescript
// In route.ts
export async function POST(req: NextRequest) {
  const body = await req.json();

  const stream = client.messages.stream({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16384,
    thinking: { type: "enabled", budget_tokens: 8192 },
    system: [
      {
        type: "text",
        text: SYSTEM_GENERATOR,
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    messages: [{ role: "user", content: prompt }],
  });

  // Convert SDK stream to ReadableStream for the client
  return new Response(stream.toReadableStream());
}

// On the client
const response = await fetch("/api/generate", { method: "POST", body: ... });
const sdkStream = MessageStream.fromReadableStream(response.body);
sdkStream.on('text', (delta) => {
  setMarkdown(prev => prev + delta);
});
```

### 4. Add Streaming to Discovery Questions

**Current:** Each discovery question call blocks for 3-8 seconds. The user submits an answer and stares at a spinner.

**Better:** Stream the question response so the question text appears to "type in" -- this feels more like a conversation with an AI consultant and less like submitting a form.

---

## What NOT to Use

| Technology | Why NOT |
|------------|---------|
| Vercel AI SDK (`ai` package) | Adds an abstraction layer over the Anthropic SDK you already have. The `@anthropic-ai/sdk` v0.78.0 already provides streaming, structured outputs, thinking, caching, and tool use natively. The Vercel AI SDK's `useChat` hook assumes a generic chat UI pattern that doesn't match Skill Forge's guided discovery flow. Adding it would mean two SDKs doing the same thing. |
| LangChain / LangGraph | Over-engineered for this use case. Skill Forge has a linear flow (discover -> define -> architect -> specify -> deliver), not an agent loop. The SDK's native tool use and streaming cover everything needed. LangChain adds 50+ transitive dependencies for features you won't use. |
| OpenAI SDK | You're on Anthropic. The Anthropic SDK is installed and working. No multi-provider need. |
| Prisma / Drizzle (for now) | The app uses localStorage and has no database yet. Adding an ORM before adding a database is premature. When you add Supabase later, evaluate then. |
| tRPC | The API surface is small (3 routes: discover, generate, validate) and follows a simple POST-with-action pattern. tRPC adds type-safe RPC which is valuable for large APIs but overkill for 3 endpoints. Next.js Route Handlers + Zod validation covers this. |
| Redux / Zustand (for now) | React 19's built-in state management (useState, useReducer, useContext, use() hook) plus the existing per-page state pattern is sufficient. The app doesn't have complex cross-component state -- each page manages its own discovery flow. If state management becomes painful later, Zustand is the right choice (tiny, simple). |
| Socket.io / Pusher | SSE via ReadableStream covers the streaming use case. WebSockets add bidirectional communication you don't need -- the client sends requests, the server streams responses. One-directional is sufficient. |
| MDX | Engineering specs are pure LLM-generated markdown. No embedded React components needed. MDX adds compilation complexity for zero benefit. |

---

## Installation

```bash
# Structured outputs (Anthropic SDK peer dependency)
npm install zod

# Markdown rendering
npm install react-markdown remark-gfm rehype-highlight rehype-slug

# Types (already have @types/file-saver, nothing else needed)
```

That's it. Four packages. Everything else is already installed or built into the existing SDK.

---

## Architecture Impact Summary

### What changes in the codebase:

1. **`src/lib/llm/client.ts`** -- Replace `llmCallJSON()` with Zod-based structured output wrappers. Add streaming variants. Add per-task model selection. Add prompt caching.

2. **`src/lib/llm/schemas.ts`** (new file) -- Zod schemas for every LLM output shape. These become the single source of truth for both TypeScript types and API validation.

3. **`src/app/api/discover/route.ts`** -- Use structured outputs. Optionally add streaming for question generation.

4. **`src/app/api/generate/route.ts`** -- Return `ReadableStream` instead of JSON. Add extended thinking.

5. **`src/app/project/[id]/page.tsx`** -- Consume streaming spec generation. Render markdown with react-markdown.

6. **Error handling throughout** -- Use SDK-specific error types (`RateLimitError`, etc.) for proper retry logic and user messaging.

---

## Sources

All findings verified directly from installed packages in `node_modules/`:

- `@anthropic-ai/sdk` v0.78.0 -- package.json, helpers/zod.d.ts, lib/MessageStream.d.ts, lib/parser.d.ts, resources/messages/messages.d.ts
- `next` v16.1.6 -- package.json
- `react` v19.2.3 -- package.json
- `tailwindcss` v4.2.0 -- package.json
- `shadcn` v3.8.5 -- package.json
- `radix-ui` v1.4.3 -- package.json
- `framer-motion` v12.34.3 -- package.json
- `sonner` v2.0.7 -- package.json

**Note on confidence:** WebSearch and WebFetch tools were unavailable during this research session. All version numbers and API surfaces were verified against the actually installed packages in `node_modules/`. The react-markdown version recommendation (^10) and remark-gfm/rehype plugin versions are based on training data and should be verified at `npm install` time -- npm will resolve to the latest compatible version regardless. The Anthropic SDK analysis is HIGH confidence because it was verified directly against the type definitions shipped in v0.78.0.
