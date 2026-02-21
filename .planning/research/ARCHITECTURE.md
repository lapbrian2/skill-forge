# Architecture Patterns

**Domain:** AI-powered multi-step workflow app (engineering specification generator)
**Researched:** 2026-02-20
**Confidence:** MEDIUM (training data expertise on LLM orchestration patterns, verified against existing codebase analysis; no live doc verification available for Vercel AI SDK or Anthropic SDK latest APIs)

## Recommended Architecture

### Target Architecture: Event-Driven LLM Pipeline with Streaming UI

The current architecture is a **synchronous request-response loop** where each LLM call blocks the UI thread with a spinner. The target architecture should be an **event-driven pipeline** where LLM operations stream results to the client in real-time, state transitions are explicit, and the prompt system is composable rather than monolithic.

```
+-------------------------------------------------------------------+
|  PRESENTATION LAYER (React 19 / Next.js 16)                       |
|                                                                    |
|  +------------------+  +-----------------+  +------------------+  |
|  | Phase Navigator  |  | Conversation    |  | Spec Viewer      |  |
|  | (stepper + gate) |  | Panel (Q&A +    |  | (markdown +      |  |
|  |                  |  |  streaming)      |  |  validation)     |  |
|  +--------+---------+  +--------+--------+  +--------+---------+  |
|           |                     |                     |            |
+-----------+---------------------+---------------------+------------+
            |                     |                     |
   +--------v---------------------v---------------------v--------+
   |  STATE MANAGEMENT LAYER                                     |
   |                                                              |
   |  +-------------------+  +------------------+                 |
   |  | useProject()      |  | useDiscovery()   |                 |
   |  | (project CRUD,    |  | (Q&A state,      |                 |
   |  |  phase machine)   |  |  streaming ctrl)  |                |
   |  +-------------------+  +------------------+                 |
   |                                                              |
   |  +-------------------+  +------------------+                 |
   |  | useSpec()         |  | useTollgate()    |                 |
   |  | (generation,      |  | (validation,     |                 |
   |  |  streaming recv)  |  |  remediation)    |                 |
   |  +-------------------+  +------------------+                 |
   +------+-----------------------+-------------------+-----------+
          |                       |                   |
   +------v-----------------------v-------------------v-----------+
   |  API LAYER (Next.js Route Handlers)                          |
   |                                                              |
   |  POST /api/discover     POST /api/generate    POST /api/validate  |
   |  (streaming JSON)       (streaming markdown)  (sync JSON)        |
   +------+-----------------------+-------------------+-----------+
          |                       |                   |
   +------v-----------------------v-------------------v-----------+
   |  LLM ORCHESTRATION LAYER                                    |
   |                                                              |
   |  +------------------+  +------------------+                  |
   |  | PromptBuilder    |  | LLMClient        |                  |
   |  | (composable      |  | (streaming +     |                  |
   |  |  prompt chain)   |  |  batch modes)    |                  |
   |  +------------------+  +------------------+                  |
   |                                                              |
   |  +------------------+  +------------------+                  |
   |  | ResponseParser   |  | RetryEngine      |                  |
   |  | (JSON extract +  |  | (exponential     |                  |
   |  |  validation)     |  |  backoff + cache) |                  |
   |  +------------------+  +------------------+                  |
   +------+-----------------------+----------------------------+--+
          |                       |                            |
   +------v-----------------------v----------------------------v--+
   |  PERSISTENCE LAYER                                           |
   |                                                              |
   |  +------------------+  +------------------+                  |
   |  | ProjectStore     |  | PromptRegistry   |                  |
   |  | (localStorage    |  | (versioned       |                  |
   |  |  -> Supabase)    |  |  prompt configs) |                  |
   |  +------------------+  +------------------+                  |
   +--------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Build Phase |
|-----------|---------------|-------------------|-------------|
| **Phase Navigator** | Stepper UI, tollgate gate display, phase controls | useProject (reads phase), useTollgate (reads gate status) | Early (exists, needs refactor) |
| **Conversation Panel** | Q&A display, answer input, streaming question display, AI suggestion chips | useDiscovery (reads/writes Q&A), API /discover (streaming) | Early (exists, needs streaming) |
| **Spec Viewer** | Markdown render, section navigation, copy/download, inline editing | useSpec (reads spec), useTollgate (reads validation) | Mid (exists, needs streaming) |
| **useProject hook** | Project CRUD, phase state machine, save/load coordination | ProjectStore (persistence), Phase Navigator (state consumer) | Early (new) |
| **useDiscovery hook** | Discovery Q&A state, streaming question handling, answer submission | API /discover (network), useProject (phase data) | Early (new) |
| **useSpec hook** | Spec generation state, streaming markdown receipt, section tracking | API /generate (network), useProject (project data) | Mid (new) |
| **useTollgate hook** | Validation state, remediation tracking, gate pass/fail | API /validate (network), useProject (validation data) | Mid (new) |
| **PromptBuilder** | Composable prompt construction from templates + context + few-shot examples | PromptRegistry (reads templates), LLMClient (produces prompts for) | Early (critical path) |
| **LLMClient** | Anthropic SDK wrapper with streaming + batch modes, token tracking | Anthropic API (external), ResponseParser (output processing) | Early (critical path) |
| **ResponseParser** | JSON extraction from LLM output, schema validation, error recovery | LLMClient (receives raw output), RetryEngine (triggers retry on parse failure) | Early (critical path) |
| **RetryEngine** | Exponential backoff, parse-failure retry with prompt refinement | LLMClient (re-invokes), API routes (error reporting) | Early (critical path) |
| **ProjectStore** | Persistence abstraction (localStorage now, Supabase later) | useProject (consumer), localStorage/Supabase (provider) | Exists (minor refactor) |
| **PromptRegistry** | Versioned prompt templates, A/B testing support, prompt composition | PromptBuilder (consumer), prompts.ts (source of truth) | Mid (enhancement) |

### Data Flow

**Discovery Flow (Q&A with Streaming):**

```
User types answer
  -> useDiscovery.submitAnswer()
    -> saves QAEntry to project.discovery.answers
    -> calls POST /api/discover {action: "question", stream: true}
      -> PromptBuilder.buildDiscoveryPrompt(phase, answers, context)
        -> composes: system prompt + phase instructions + prior Q&A + few-shot examples
      -> LLMClient.stream(prompt)
        -> Anthropic messages.create({stream: true})
          -> yields text deltas
      -> ResponseParser.parseStreamedJSON(deltas)
        -> accumulates text, detects JSON structure
        -> on complete: validates against DiscoveryQuestion schema
        -> on parse failure: RetryEngine.retry() with "respond as valid JSON" appended
      -> streams partial question text to client via ReadableStream
    -> useDiscovery receives streamed question, updates UI progressively
    -> if phase_complete: useTollgate.runGate() -> advancePhase()
```

**Spec Generation Flow (Streaming Markdown):**

```
User triggers "Generate Spec" (or auto-trigger on phase advance)
  -> useSpec.generate()
    -> calls POST /api/generate {stream: true}
      -> PromptBuilder.buildSpecPrompt(project, complexity, sections)
        -> composes: SYSTEM_GENERATOR + all discovery data + section template + formatting rules
      -> LLMClient.stream(prompt, {maxTokens: 16384})
        -> Anthropic messages.create({stream: true})
          -> yields text deltas (markdown content)
      -> streams raw markdown to client via ReadableStream
    -> useSpec receives streamed markdown, renders progressively in Spec Viewer
    -> on complete:
      -> count sections, words
      -> save spec to project
      -> auto-trigger validation: POST /api/validate (sync, not streamed)
      -> useTollgate receives validation report
```

**Tollgate Validation Flow (Synchronous):**

```
Spec generation completes (or user manually triggers)
  -> useTollgate.validate(specContent, requiredSections)
    -> calls POST /api/validate (NOT streamed - validation is fast)
      -> runs Tollgate 4 checks (completeness: sections, weasel words, depth)
      -> runs Tollgate 5 checks (readiness: no TODOs, version, metrics, roadmap)
      -> optional: LLMClient.call() for clarity scoring on sample
      -> returns ValidationReport with scores, grade, remediations
    -> useTollgate updates state
    -> Phase Navigator shows gate pass/fail
    -> Spec Viewer shows remediation annotations
```

**State Transitions (Phase Machine):**

```
discover ──[tollgate_1]──> define ──[tollgate_2]──> architect ──[tollgate_3]──> specify ──[auto]──> deliver
   ^                         ^                          ^                          |              |
   |                         |                          |                          |              |
  Q&A loop                 Q&A loop                   Q&A loop                  Generate      Output
  (3-20 Qs)               (3-20 Qs)                  (3-20 Qs)                  (stream)      (copy/dl)
```

Each tollgate is a quality gate. The current implementation auto-advances when the LLM says `phase_complete: true`. The improved architecture should add explicit tollgate validation: a summarization step that confirms the phase gathered sufficient information before advancing.

## Patterns to Follow

### Pattern 1: Streaming LLM Responses to the Client

**What:** Use the Anthropic SDK's streaming mode with Next.js Route Handlers to pipe text deltas to the browser in real-time, then render them progressively.

**When:** All LLM calls that produce user-visible output (questions, spec markdown). NOT for classification or validation (those are fast, JSON-only).

**Why:** The current architecture blocks the UI for 5-30 seconds per LLM call with just a spinner. Streaming makes the app feel alive -- the user sees the AI "thinking" character by character. This is the single biggest UX improvement possible.

**Server (API Route):**
```typescript
// src/app/api/generate/route.ts
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const { project_data, complexity } = await req.json();
  const anthropic = new Anthropic();

  // Create streaming response
  const stream = anthropic.messages.stream({
    model: LLM_MODEL,
    max_tokens: 16384,
    temperature: 0.5,
    system: SYSTEM_GENERATOR,
    messages: [{ role: "user", content: buildSpecPrompt(project_data, complexity) }],
  });

  // Convert Anthropic stream to Web ReadableStream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`));
      });

      stream.on("message", (message) => {
        const usage = message.usage;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done",
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
        })}\n\n`));
        controller.close();
      });

      stream.on("error", (error) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`));
        controller.close();
      });
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

**Client (React Hook):**
```typescript
// src/hooks/useStreamingLLM.ts
export function useStreamingLLM() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const stream = useCallback(async (url: string, body: object) => {
    setIsStreaming(true);
    setText("");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

      for (const line of lines) {
        const data = JSON.parse(line.slice(6));
        if (data.type === "delta") {
          accumulated += data.text;
          setText(accumulated);
        } else if (data.type === "done") {
          // Handle completion metadata
        } else if (data.type === "error") {
          throw new Error(data.message);
        }
      }
    }

    setIsStreaming(false);
    return accumulated;
  }, []);

  return { text, isStreaming, stream };
}
```

**Confidence:** MEDIUM -- Anthropic SDK supports `.stream()` and `.on("text")` based on training data. Exact API shape should be verified against Anthropic SDK 0.78.0 docs before implementation.

### Pattern 2: Structured Output with Schema Validation

**What:** Use constrained JSON output from the LLM with runtime schema validation, not just "respond with JSON" in the prompt. Parse with a schema validator (Zod) and retry on failure.

**When:** Every LLM call that expects structured data (discovery questions, classification, features, architecture, validation clarity).

**Why:** The current `llmCallJSON` function relies on prompt instructions ("Respond ONLY with valid JSON") and basic markdown fence stripping. This is fragile. LLMs occasionally produce malformed JSON, extra text before/after the JSON, or valid JSON that doesn't match the expected shape. Schema validation + retry makes this robust.

```typescript
// src/lib/llm/response-parser.ts
import { z } from "zod";

export const DiscoveryQuestionSchema = z.object({
  question: z.string().min(10),
  why: z.string().min(10),
  options: z.array(z.string()).nullable(),
  field: z.string(),
  phase_complete: z.boolean(),
});

export type DiscoveryQuestion = z.infer<typeof DiscoveryQuestionSchema>;

export function extractJSON(text: string): string {
  // Strategy 1: Clean markdown fences
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Strategy 2: Find JSON object boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export function parseAndValidate<T>(
  text: string,
  schema: z.ZodType<T>,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error.format()._errors.join(", ") };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "JSON parse failed" };
  }
}
```

**Confidence:** HIGH -- Zod schema validation is a well-established pattern. The extraction logic addresses known LLM output quirks.

### Pattern 3: Composable Prompt Builder

**What:** Replace monolithic prompt strings with a composable builder that assembles prompts from modular pieces: system instructions, phase-specific rules, context window (prior Q&A), few-shot examples, and output format constraints.

**When:** Building any prompt for the LLM. The current approach of string concatenation in `prompts.ts` works but becomes unmaintainable as prompts grow more sophisticated.

**Why:** The system prompt is described as "the product's secret sauce." It deserves a first-class architecture. Composable prompts enable: (1) testing individual pieces, (2) A/B testing prompt variations, (3) adjusting context window size to fit token limits, (4) versioning prompts independently.

```typescript
// src/lib/llm/prompt-builder.ts

interface PromptSegment {
  id: string;
  content: string;
  priority: number; // Higher = more important, kept when truncating
  estimatedTokens: number;
}

export class PromptBuilder {
  private systemSegments: PromptSegment[] = [];
  private userSegments: PromptSegment[] = [];
  private maxContextTokens: number;

  constructor(maxContextTokens: number = 180000) {
    this.maxContextTokens = maxContextTokens;
  }

  system(id: string, content: string, priority: number = 50): this {
    this.systemSegments.push({
      id,
      content,
      priority,
      estimatedTokens: Math.ceil(content.length / 4), // rough estimate
    });
    return this;
  }

  user(id: string, content: string, priority: number = 50): this {
    this.userSegments.push({
      id,
      content,
      priority,
      estimatedTokens: Math.ceil(content.length / 4),
    });
    return this;
  }

  build(): { system: string; user: string } {
    // Sort by priority descending, then truncate lowest priority segments
    // if total exceeds maxContextTokens
    const allSegments = [
      ...this.systemSegments.map(s => ({ ...s, role: "system" as const })),
      ...this.userSegments.map(s => ({ ...s, role: "user" as const })),
    ].sort((a, b) => b.priority - a.priority);

    let totalTokens = 0;
    const included = new Set<string>();

    for (const segment of allSegments) {
      if (totalTokens + segment.estimatedTokens <= this.maxContextTokens) {
        included.add(segment.id);
        totalTokens += segment.estimatedTokens;
      }
    }

    return {
      system: this.systemSegments
        .filter(s => included.has(s.id))
        .map(s => s.content)
        .join("\n\n"),
      user: this.userSegments
        .filter(s => included.has(s.id))
        .map(s => s.content)
        .join("\n\n"),
    };
  }
}

// Usage example for discovery question generation:
export function buildDiscoveryPrompt(
  phase: string,
  description: string,
  answers: QAEntry[],
  complexity: string,
  isAgentic: boolean,
): { system: string; user: string } {
  const builder = new PromptBuilder();

  // System prompt pieces (priority determines what survives truncation)
  builder.system("core-role", SYSTEM_DISCOVERY, 100);
  builder.system("phase-rules", getPhaseRules(phase), 90);
  if (isAgentic) {
    builder.system("agentic-rules", AGENTIC_DISCOVERY_ADDENDUM, 80);
  }
  builder.system("output-format", DISCOVERY_JSON_FORMAT, 95);

  // User prompt pieces
  builder.user("project-desc", `The user is building: "${description}"`, 100);
  builder.user("project-meta", `Complexity: ${complexity}\nAgentic: ${isAgentic}`, 90);

  // Q&A history - older answers get lower priority (may be truncated for long projects)
  answers.forEach((qa, i) => {
    const priority = 70 - (answers.length - i); // newest = highest priority
    builder.user(
      `qa-${i}`,
      `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`,
      Math.max(priority, 30),
    );
  });

  builder.user("instruction", "Generate the next most important question.", 95);

  return builder.build();
}
```

**Confidence:** HIGH -- This is a standard prompt engineering architecture pattern. The priority-based truncation prevents context window overflow, which is a real risk for complex projects with 20+ Q&A entries.

### Pattern 4: Retry with Backoff for LLM Calls

**What:** Wrap all LLM calls in a retry engine that handles transient failures (rate limits, network errors, timeouts) and parse failures (malformed JSON) differently.

**When:** Every LLM call. The current code has zero retry logic -- a single failure crashes the flow.

**Why:** LLM APIs are inherently unreliable. Rate limits (429), server errors (500/503), network timeouts, and malformed output are all common. A production-grade app must handle these gracefully.

```typescript
// src/lib/llm/retry-engine.ts

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: ["rate_limit_error", "overloaded_error", "api_error"],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = cfg.retryableErrors.some(e =>
        lastError!.message.includes(e)
      );

      if (!isRetryable || attempt === cfg.maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        cfg.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        cfg.maxDelayMs,
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// For JSON parse failures, retry with a stricter prompt
export async function withParseRetry<T>(
  callFn: (extraInstructions?: string) => Promise<string>,
  parseFn: (text: string) => T,
  maxRetries: number = 2,
): Promise<T> {
  let lastRaw = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const extraInstructions = attempt > 0
      ? `\n\nPREVIOUS ATTEMPT FAILED TO PARSE. You MUST respond with ONLY valid JSON. No text before or after. Your previous response started with: "${lastRaw.slice(0, 100)}"`
      : undefined;

    lastRaw = await callFn(extraInstructions);

    try {
      return parseFn(lastRaw);
    } catch {
      if (attempt === maxRetries) {
        throw new Error(`Failed to parse LLM response after ${maxRetries + 1} attempts. Raw: ${lastRaw.slice(0, 200)}`);
      }
    }
  }

  throw new Error("Unreachable");
}
```

**Confidence:** HIGH -- Exponential backoff with jitter is the standard approach. Parse-failure retry with prompt adjustment is a proven LLM-specific pattern.

### Pattern 5: Custom React Hooks for Domain State

**What:** Extract the monolithic project page component into domain-specific custom hooks that encapsulate state, side effects, and business logic.

**When:** Immediately. The current `page.tsx` is ~530 lines with state management, API calls, phase logic, and rendering all interleaved.

**Why:** The current component violates single responsibility. Each hook owns one concern: project lifecycle, discovery Q&A, spec generation, and validation. This makes each piece independently testable and the component tree composable.

```typescript
// src/hooks/useProject.ts
export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);

  // Load, save, phase advancement, tollgate management
  // Returns: project, save, advancePhase, currentPhase, phaseIndex

  return { project, save, advancePhase, currentPhase, phaseIndex, isLoaded };
}

// src/hooks/useDiscovery.ts
export function useDiscovery(project: Project | null, save: (p: Project) => void) {
  const [currentQuestion, setCurrentQuestion] = useState<DiscoveryQuestion | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  // Fetch next question (streaming), submit answer, skip question
  // Returns: currentQuestion, submitAnswer, isStreaming, streamedText, phaseAnswers

  return { currentQuestion, submitAnswer, isStreaming, streamedText, phaseAnswers };
}

// src/hooks/useSpecGeneration.ts
export function useSpecGeneration(project: Project | null, save: (p: Project) => void) {
  const [markdown, setMarkdown] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate spec (streaming), regenerate, track progress
  // Returns: markdown, generate, isGenerating, progress

  return { markdown, generate, isGenerating, progress };
}

// src/hooks/useTollgate.ts
export function useTollgate(project: Project | null, save: (p: Project) => void) {
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Run validation, check gate status
  // Returns: validation, validate, isValidating, canAdvance

  return { validation, validate, isValidating, canAdvance };
}
```

**Confidence:** HIGH -- Standard React patterns. Directly addresses the "Giant Monolithic Page Component" concern in the existing CONCERNS.md.

### Pattern 6: Prompt Registry and Versioning

**What:** Organize prompts as versioned, testable artifacts rather than inline strings. Each prompt has a version, description, and test fixture.

**When:** After the PromptBuilder is in place. This is a refinement, not a blocker.

**Why:** The prompts ARE the product. If a prompt regression makes the AI ask bad questions or generate vague specs, the product is broken. Versioned prompts enable: rollback, A/B testing, regression testing with fixture inputs.

```typescript
// src/lib/llm/prompt-registry.ts

interface PromptVersion {
  id: string;
  version: string;
  content: string;
  description: string;
  changelog: string;
}

// Organize by concern, not by arbitrary names
export const PROMPTS = {
  discovery: {
    system: {
      id: "discovery-system",
      version: "2.0",
      content: `You are an engineering specification consultant...`,
      description: "Core discovery interviewer personality and rules",
      changelog: "v2.0: Added suggest-then-confirm pattern, systems thinking emphasis",
    },
    phases: {
      discover: { /* phase-specific rules */ },
      define: { /* phase-specific rules */ },
      architect: { /* phase-specific rules */ },
    },
    outputFormat: { /* JSON schema instructions */ },
  },
  generator: {
    system: { /* ... */ },
    sectionTemplates: { /* per-section formatting rules */ },
  },
  validator: {
    system: { /* ... */ },
    scoringRubric: { /* ... */ },
  },
} as const;
```

**Confidence:** HIGH -- Organizational pattern, no external dependencies.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous LLM Calls with Loading Spinners

**What:** Blocking the entire UI while waiting for an LLM response with only a "Thinking..." spinner.

**Why bad:** LLM calls take 5-30 seconds. A spinner for that duration feels broken. Users will refresh or leave. The current implementation uses this pattern for every call.

**Instead:** Stream all user-facing LLM output. Show progressive rendering (text appearing character by character). For fast calls (classification, validation), use optimistic UI with brief loading states.

### Anti-Pattern 2: Trusting LLM JSON Output Without Validation

**What:** Calling `JSON.parse()` on LLM output and treating it as the expected type.

**Why bad:** LLMs produce malformed JSON ~5-15% of the time, especially for complex schemas. The current `llmCallJSON<T>` casts with `as T` -- no runtime validation. A single malformed response crashes the flow.

**Instead:** Always validate with Zod schemas. Retry on parse failure with a stricter prompt. Log malformed responses for prompt improvement.

### Anti-Pattern 3: Entire Conversation History in Every Prompt

**What:** Sending ALL prior Q&A entries in every discovery question prompt, regardless of token budget.

**Why bad:** Complex projects can have 20+ Q&A pairs. At ~200 tokens per pair, that's 4000+ tokens of context -- plus the system prompt and instructions. This works now but will break for very detailed answers or when adding few-shot examples.

**Instead:** Use the PromptBuilder with priority-based truncation. Recent answers get high priority, older answers get lower priority. Summarize old phases rather than including raw Q&A. The PromptBuilder pattern (Pattern 3 above) handles this.

### Anti-Pattern 4: Single God-Component for the Workflow

**What:** Putting all phase logic, API calls, state management, and rendering in one page component.

**Why bad:** The current `project/[id]/page.tsx` is 530 lines handling 5 different phases, multiple API calls, state transitions, and rendering. This is untestable, hard to modify, and prone to regressions.

**Instead:** Extract custom hooks (Pattern 5) and phase-specific sub-components. The page component becomes an orchestrator that renders the correct phase component and passes the right hook data.

### Anti-Pattern 5: Inlining Prompt Logic in API Routes

**What:** Having API route handlers contain prompt construction, LLM calling, response parsing, and business logic all in one function.

**Why bad:** Makes prompts untestable in isolation, mixes HTTP concerns with LLM orchestration, and creates tight coupling between route structure and prompt logic.

**Instead:** API routes should be thin orchestrators. They parse the request, call the appropriate LLM pipeline function, and return the response. All prompt construction lives in the prompt layer. All response parsing lives in the parser layer.

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **LLM API costs** | ~$50/mo (tolerable) | ~$5K/mo (needs rate limiting) | Untenable without caching, smaller models for classification |
| **Vercel serverless** | No issues | Edge function timeouts for 30s+ generation calls | Need dedicated API server for long-running generations |
| **localStorage** | Fine | Need server-side persistence (Supabase) | Full DB with auth, sharding |
| **Streaming** | No issues | Connection limits on Vercel (50 concurrent) | Need WebSocket infrastructure or dedicated streaming server |
| **Prompt tokens** | Send full context | Summarize old phases | Embedding-based retrieval for relevant context only |
| **API key** | Single shared key | Per-user API key or proxy with rate limiting | Key management service with per-user quotas |

For v1 (localStorage, single shared API key, Vercel serverless), the architecture supports hundreds of concurrent users comfortably. The 10K+ concerns are documented but explicitly out of scope per PROJECT.md.

## Suggested Build Order

The components have clear dependencies. Build in this order to ensure each layer is solid before its consumers are built.

### Phase 1: LLM Infrastructure (build first -- everything depends on this)

1. **RetryEngine** (`src/lib/llm/retry-engine.ts`) -- no dependencies
2. **ResponseParser** (`src/lib/llm/response-parser.ts`) -- needs Zod schemas
3. **LLMClient refactor** (`src/lib/llm/client.ts`) -- add streaming mode, integrate RetryEngine and ResponseParser
4. **PromptBuilder** (`src/lib/llm/prompt-builder.ts`) -- no dependencies except prompt content

**Why first:** Every feature in the app calls the LLM. Getting streaming, retry, and parsing right here means everything built on top is reliable. The current `llmCall`/`llmCallJSON` functions are the foundation -- they need to be production-grade before building features on top.

### Phase 2: State Management Hooks (build second -- UI depends on these)

5. **useProject hook** (`src/hooks/useProject.ts`) -- depends on storage layer (exists)
6. **useDiscovery hook** (`src/hooks/useDiscovery.ts`) -- depends on LLMClient (streaming), useProject
7. **useTollgate hook** (`src/hooks/useTollgate.ts`) -- depends on useProject, validation API
8. **useSpecGeneration hook** (`src/hooks/useSpecGeneration.ts`) -- depends on LLMClient (streaming), useProject

**Why second:** The hooks abstract away API calls and state management. The phase components become thin renderers. Hooks are independently testable.

### Phase 3: Discovery Flow (build third -- core user journey)

9. **Conversation Panel component** -- consumes useDiscovery
10. **Phase Navigator refactor** -- consumes useProject, useTollgate
11. **Tollgate validation gates** -- consumes useTollgate
12. **Suggest-then-confirm pattern** -- AI proposes, user confirms/overrides

**Why third:** This is the core product experience. Users spend 80% of their time in discovery phases. Getting the Q&A flow smooth with streaming is the highest-value work.

### Phase 4: Spec Generation (build fourth -- depends on discovery data)

13. **Streaming spec generation** -- consumes useSpecGeneration
14. **Progressive markdown rendering** -- renders streamed markdown in real-time
15. **Spec Viewer component** -- section navigation, copy/download, editing
16. **Auto-validation on generation** -- triggers useTollgate after spec completes

**Why fourth:** Spec generation is the payoff of the discovery flow. It only works once discovery is complete. Streaming makes the 30-60 second generation feel interactive rather than broken.

### Phase 5: Polish and Hardening

17. **PromptRegistry** -- versioned prompts, organized by concern
18. **Error boundaries** -- React error boundaries around phase components
19. **Rate limiting** -- per-session rate limiting on API routes
20. **Token budget tracking** -- track and display token usage per project

## LLM Call Patterns Summary

| Call Type | Mode | Max Tokens | Temperature | Retry Strategy | When |
|-----------|------|------------|-------------|----------------|------|
| Classify complexity | Batch (sync) | 1024 | 0.3 | Network retry (3x) | Project creation |
| Discovery question | Stream to client | 2048 | 0.7 | Network retry (3x) + parse retry (2x) | Each Q&A turn |
| Product brief | Batch (sync) | 4096 | 0.5 | Network retry (3x) + parse retry (2x) | End of Discover phase |
| Feature generation | Batch (sync) | 8192 | 0.6 | Network retry (3x) + parse retry (2x) | End of Define phase |
| Architecture generation | Batch (sync) | 8192 | 0.5 | Network retry (3x) + parse retry (2x) | End of Architect phase |
| Spec generation | Stream to client | 16384 | 0.5 | Network retry (2x, no parse retry) | Specify phase |
| Validation clarity | Batch (sync) | 2048 | 0.2 | Network retry (2x), optional (skip on fail) | After spec generation |

**Stream vs Batch decision:** Stream when the user is watching and the response is long (question display, spec generation). Batch when the response is structured JSON that needs parsing or is background processing (classification, feature generation, validation).

**Temperature rationale:**
- 0.2-0.3: Deterministic tasks (classification, validation scoring)
- 0.5: Balanced tasks (spec generation, architecture -- need consistency but some creativity)
- 0.6-0.7: Creative tasks (question generation, feature ideation -- need variety)

## Sources

- Existing codebase analysis: `src/lib/llm/client.ts`, `src/lib/llm/prompts.ts`, `src/app/api/*/route.ts`
- Existing architecture doc: `.planning/codebase/ARCHITECTURE.md`
- Existing concerns: `.planning/codebase/CONCERNS.md` (identifies 12 critical/moderate issues)
- Existing integrations: `.planning/codebase/INTEGRATIONS.md`
- Anthropic SDK patterns: Based on training data knowledge of @anthropic-ai/sdk streaming API (MEDIUM confidence -- verify `.stream()` and event API against SDK 0.78.0 docs before implementation)
- React streaming patterns: Based on training data knowledge of Server-Sent Events + ReadableStream in Next.js Route Handlers (HIGH confidence -- well-established pattern)
- Zod validation: Based on training data (HIGH confidence -- standard library, widely used)
- Prompt engineering architecture: Based on training data knowledge of production LLM applications (MEDIUM confidence -- patterns are sound but specific token estimates should be validated)

---

*Architecture research: 2026-02-20*
