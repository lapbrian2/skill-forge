# Phase 3: Spec Generation and Output - Research

**Researched:** 2026-02-20
**Domain:** Streaming markdown rendering, LLM prompt engineering for spec generation, section-level document management
**Confidence:** MEDIUM (web search/fetch unavailable; findings based on training data verified against npm registry where possible + codebase analysis)

## Summary

Phase 3 transforms the current raw `<pre>` spec display into a rich, interactive document viewer with streaming markdown rendering, a live table of contents, preview/raw toggle, copy/download actions, and section-level regeneration. The core technical challenge is rendering markdown progressively as tokens arrive via SSE without flickering, layout thrashing, or broken syntax mid-stream. A secondary challenge is engineering the system prompt to produce specs with concrete data models, API contracts, and user terminology rather than generic boilerplate.

The recommended stack centers on `react-markdown` with `remark-gfm` for GitHub Flavored Markdown (tables, strikethrough, task lists) and `rehype-highlight` with `highlight.js` for syntax highlighting. This combination is the most battle-tested for streaming markdown in React -- ChatGPT, Vercel AI SDK demos, and most AI chat UIs use it. The existing `@uiw/react-codemirror` already in the project provides the raw markdown editor for the toggle view.

**Primary recommendation:** Use `react-markdown` + `remark-gfm` + `rehype-highlight` for rendering; extract headings via regex on the streaming text for the live TOC; use section boundary markers (`## N.`) for section-level regeneration; deeply engineer the system prompt with few-shot examples to enforce specificity.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | ^9.x | Render markdown as React components | De facto standard for markdown-to-React. Pure React rendering (no dangerouslySetInnerHTML). Handles streaming text gracefully -- re-renders on each text update. Used by ChatGPT web UI, Vercel AI SDK, and most AI-powered apps. |
| remark-gfm | ^4.x | GitHub Flavored Markdown plugin | Adds tables, strikethrough, task lists, autolinks to react-markdown. Engineering specs heavily use tables (data models, API contracts). |
| rehype-highlight | ^7.x | Syntax highlighting in code blocks | Uses highlight.js under the hood. Lightweight, works during streaming (highlights complete code blocks, gracefully ignores incomplete ones). |
| highlight.js | ^11.x | Syntax highlighting engine | Peer dependency of rehype-highlight. Supports 190+ languages including TypeScript, SQL, JSON, YAML -- all common in engineering specs. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @uiw/react-codemirror | 4.25.4 (existing) | Raw markdown editor view | Toggle to "raw" mode shows the markdown source in CodeMirror with syntax highlighting. Already installed. |
| @codemirror/lang-markdown | 6.5.0 (existing) | Markdown language support | Used in raw view CodeMirror instance. Already installed. |
| file-saver | 2.0.5 (existing) | Download spec as .md file | Already installed. Use `saveAs()` for cross-browser download. |
| framer-motion | 12.34.3 (existing) | Animation for TOC, section transitions | Already installed. Use for smooth section appearance during streaming. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | marked + DOMPurify | Lower-level, requires dangerouslySetInnerHTML, manual sanitization. Better raw performance but worse React integration. |
| react-markdown | MDX | Overkill -- MDX is for interactive components inside markdown. Spec display is read-only. |
| react-markdown | @mdx-js/react | Same as MDX -- too heavy for display-only use case. |
| rehype-highlight | shiki | Higher quality highlighting (TextMate grammars) but significantly heavier bundle and slower. Poor streaming compatibility -- Shiki needs complete code blocks to highlight. |
| rehype-highlight | prismjs + rehype-prism-plus | Good alternative but highlight.js is more widely used and has simpler integration with rehype. |
| highlight.js themes | Custom CSS | Unnecessary -- highlight.js ships dark themes (github-dark, atom-one-dark) that match the app's dark UI. |

**Installation:**
```bash
npm install react-markdown remark-gfm rehype-highlight highlight.js
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   └── spec/                      # All spec viewer components
│       ├── markdown-renderer.tsx   # Core streaming markdown renderer
│       ├── toc-sidebar.tsx         # Live table of contents sidebar
│       ├── spec-toolbar.tsx        # Action bar (copy, download, toggle, stats)
│       ├── spec-viewer.tsx         # Main composer component (layout + state)
│       └── section-actions.tsx     # Per-section hover overlay (regenerate, copy)
├── lib/
│   └── spec/
│       └── section-parser.ts      # Parse/split/reassemble spec by sections
├── app/
│   ├── api/
│   │   └── generate-section/
│   │       └── route.ts           # Single-section regeneration endpoint
│   └── project/[id]/
│       └── page.tsx               # Updated to use SpecViewer instead of <pre>
└── lib/llm/
    └── prompts.ts                 # Updated with section regeneration prompt + improved spec prompt
```

### Pattern 1: Streaming Markdown Rendering

**What:** Re-render `react-markdown` on every text update from SSE without layout thrashing.

**When to use:** Whenever displaying LLM output that is markdown-formatted and streaming token by token.

**Key technique:** The `text` string from `useLLMStream` grows with each token. Pass it directly to `<ReactMarkdown>`. React-markdown is designed to handle this -- it parses the full string each render, which is fast for documents under ~50KB (typical spec is 5-15KB).

**Example:**
```typescript
// Source: training data pattern (MEDIUM confidence)
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  isStreaming: boolean;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  isStreaming,
}: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom heading with id for TOC anchor links
          h1: ({ children, ...props }) => {
            const id = slugify(String(children));
            return <h1 id={id} {...props}>{children}</h1>;
          },
          h2: ({ children, ...props }) => {
            const id = slugify(String(children));
            return <h2 id={id} className="scroll-mt-4" {...props}>{children}</h2>;
          },
          h3: ({ children, ...props }) => {
            const id = slugify(String(children));
            return <h3 id={id} className="scroll-mt-4" {...props}>{children}</h3>;
          },
          // Custom code block with copy button
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-orange-300" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="relative group">
                <code className={className} {...props}>{children}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(String(children))}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Copy
                </button>
              </div>
            );
          },
          // Styled tables for data models and API contracts
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-white/10">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white/70">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-white/10 px-3 py-2 text-xs text-white/50">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse ml-1" />
      )}
    </div>
  );
});
```

### Pattern 2: Live TOC Extraction from Streaming Text

**What:** Extract headings from the growing markdown string and build a navigable table of contents that updates in real-time.

**When to use:** When you need a sidebar TOC that grows as content streams in.

**Key technique:** Use a simple regex to extract headings from the raw markdown string. Do NOT try to extract from the rendered DOM -- it's fragile with streaming content. The regex approach is fast and works on partial content.

**Example:**
```typescript
// Source: training data pattern (MEDIUM confidence)
interface TocEntry {
  id: string;
  text: string;
  level: number; // 1, 2, or 3
}

function extractToc(markdown: string): TocEntry[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const entries: TocEntry[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = slugify(text);
    entries.push({ id, text, level });
  }

  return entries;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
```

**Scroll tracking:** Use `IntersectionObserver` on heading elements to determine which section is currently visible. Update the active TOC entry accordingly.

### Pattern 3: Section-Level Regeneration

**What:** Allow users to regenerate individual spec sections without regenerating the entire document.

**When to use:** When a specific section (e.g., Data Model, API Specification) needs improvement while keeping the rest intact.

**Key technique:** Use the spec's heading structure (`## N. Section Title`) as section boundaries. Parse the spec into sections, replace one section's content with the new streamed output, and reassemble.

**Example:**
```typescript
// Source: codebase pattern (existing SPEC_SECTIONS constant)
interface SpecSection {
  number: number;
  title: string;
  content: string;     // Full section including heading
  startIndex: number;  // Character index in original markdown
  endIndex: number;
}

function parseSpecSections(markdown: string): SpecSection[] {
  const sectionRegex = /^## (\d+)\.\s+(.+)$/gm;
  const sections: SpecSection[] = [];
  let match;
  const matches: Array<{ number: number; title: string; index: number }> = [];

  while ((match = sectionRegex.exec(markdown)) !== null) {
    matches.push({
      number: parseInt(match[1]),
      title: match[2].trim(),
      index: match.index,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
    sections.push({
      number: matches[i].number,
      title: matches[i].title,
      content: markdown.slice(start, end).trim(),
      startIndex: start,
      endIndex: end,
    });
  }

  return sections;
}

function replaceSection(
  markdown: string,
  sectionNumber: number,
  newContent: string
): string {
  const sections = parseSpecSections(markdown);
  const target = sections.find(s => s.number === sectionNumber);
  if (!target) return markdown;

  return (
    markdown.slice(0, target.startIndex) +
    newContent.trim() +
    "\n\n" +
    markdown.slice(target.endIndex).trimStart()
  );
}
```

### Pattern 4: Preview/Raw Toggle with Shared Scroll Position

**What:** Toggle between rendered markdown preview and raw markdown source while maintaining approximate scroll position.

**When to use:** OUT-02 requirement. Users need to see raw markdown (for copy-editing or inspecting formatting) and rendered preview.

**Key technique:** Use the existing `@uiw/react-codemirror` for the raw view (already installed with markdown language support). Use `react-markdown` for preview. Track scroll percentage before toggle and restore after.

### Anti-Patterns to Avoid

- **Parsing markdown in the DOM:** Never try to extract heading structure by querying the rendered DOM during streaming. The DOM lags behind, causes layout thrash, and breaks during partial renders. Always parse the raw markdown string.

- **Using `dangerouslySetInnerHTML` with marked/markdown-it:** While faster for initial render, this bypasses React's reconciliation and creates XSS risks. `react-markdown` is specifically designed to avoid this.

- **Memoizing the entire ReactMarkdown output:** Don't try to cache previously rendered sections and only re-render the new content. This creates visual inconsistency and is unnecessary -- react-markdown's virtual DOM diffing handles this efficiently for spec-sized documents.

- **Debouncing the streaming text:** Don't debounce state updates from SSE to reduce renders. This creates a stuttering "batch update" effect instead of smooth token-by-token flow. React batches state updates automatically in React 19.

- **Using Shiki for streaming code blocks:** Shiki requires the complete code block to perform highlighting. During streaming, code blocks are often incomplete, causing Shiki to error or show unhighlighted text. highlight.js via rehype-highlight handles partial blocks gracefully (it simply won't highlight incomplete blocks, then highlights when the closing fence appears).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown to React | Custom parser or regex-based renderer | `react-markdown` | Markdown parsing has hundreds of edge cases (nested lists, indented code, HTML entities). Any custom parser will break on real specs. |
| GFM tables | Custom table regex | `remark-gfm` | GFM table alignment, pipe escaping, and cell spanning are deceptively complex. |
| Syntax highlighting | Custom token colorizer | `rehype-highlight` + `highlight.js` | Language detection, grammar rules, and theme support are enormous surface areas. |
| Heading slug generation | Custom id generator | Simple `slugify()` function | Keep it simple but consistent. Match react-markdown heading ids with TOC link targets. |
| Clipboard API | Custom clipboard polyfill | `navigator.clipboard.writeText()` | Modern browsers all support this. The project already uses it in the existing deliver phase code. |
| File download | Custom download logic | `file-saver` (already installed) or native Blob+URL approach | The project already has both `file-saver` installed and native download code in the deliver phase. Either works. |

**Key insight:** The markdown rendering pipeline has been battle-tested by millions of ChatGPT users rendering streaming AI output. The `react-markdown` + `remark-gfm` + `rehype-highlight` stack is the same stack those applications use. Building custom is guaranteed to produce worse results.

## Common Pitfalls

### Pitfall 1: Incomplete Markdown Syntax During Streaming

**What goes wrong:** During streaming, a token arrives mid-syntax. For example, the text might end with `| Column 1 |` (incomplete table row), ```` ``` ```` (code fence opened but not closed), or `**bold te` (incomplete bold). This causes react-markdown to either show raw syntax or produce broken layout.

**Why it happens:** LLM tokens don't respect markdown boundaries. A single token might be "ific" completing the word "specific" or "\n##" starting a new heading.

**How to avoid:** `react-markdown` handles this gracefully by default. Incomplete elements are rendered as text until the closing syntax arrives. The only visual artifact is seeing raw markdown syntax briefly during streaming, which resolves as more tokens arrive. This is the same behavior users see in ChatGPT and is expected UX.

**Warning signs:** If you see persistent broken formatting AFTER streaming completes, the markdown itself is malformed (a prompt engineering issue, not a rendering issue).

### Pitfall 2: Performance Degradation with Large Specs on Re-render

**What goes wrong:** Complex specs (15-25 pages, 10K+ words) cause noticeable lag on each re-render as react-markdown re-parses the full text on every token.

**Why it happens:** react-markdown parses the entire markdown string on each render. For very large documents with many tables, code blocks, and nested lists, parsing takes 10-50ms per render, and tokens arrive every 20-50ms.

**How to avoid:** Use `React.memo` on the MarkdownRenderer component with a custom comparison function that compares the `content` prop. React 19's automatic batching helps, but for very large specs, consider throttling updates to every 100ms during streaming (only during streaming -- show every update when not streaming). This provides smooth visual flow without the per-token cost.

**Warning signs:** Browser DevTools Performance tab shows long "Recalculate Style" or "Layout" operations during streaming.

### Pitfall 3: TOC Scroll Tracking Conflicts with Click-to-Navigate

**What goes wrong:** The IntersectionObserver-based scroll tracking updates the active TOC item on scroll. When the user clicks a TOC item to scroll to a section, the scroll tracking fires for intermediate sections, causing the active highlight to flicker through multiple sections before settling.

**Why it happens:** `scrollIntoView` triggers scroll events that fire IntersectionObserver callbacks for every section that crosses the viewport during the scroll animation.

**How to avoid:** When a TOC click triggers `scrollIntoView`, set a "programmatic scroll" flag. Ignore IntersectionObserver updates while this flag is set. Clear the flag after a short timeout (500ms) or on the next user-initiated scroll event.

**Warning signs:** Clicking a TOC item causes the highlight to rapidly flash through multiple entries.

### Pitfall 4: Section Regeneration Breaks Context Consistency

**What goes wrong:** When regenerating a single section (e.g., "Data Model"), the regenerated content uses different entity names, field types, or patterns than the rest of the spec. For example, the existing spec says `User.email_verified` but the regenerated section uses `User.isEmailVerified`.

**Why it happens:** The regeneration prompt doesn't include enough context about the rest of the spec. The LLM generates a valid section in isolation but inconsistent with the whole.

**How to avoid:** The section regeneration prompt MUST include:
1. The complete spec text (for context, marked with cache_control for prompt caching)
2. Explicit instruction: "Use EXACTLY the same entity names, field names, and patterns as the existing spec"
3. The surrounding sections (the section before and after the target) for local context
4. The data model section specifically, if regenerating a non-data-model section (since entity names are defined there)

**Warning signs:** Regenerated sections feel "off" -- correct content but different naming or formatting style.

### Pitfall 5: System Prompt Engineering -- Vague Specs Despite Good Discovery

**What goes wrong:** Even with detailed discovery data, the LLM produces specs with generic language: "handles authentication", "manages user data", "supports various configurations".

**Why it happens:** The LLM's training data is full of vague documentation. Without explicit anti-vagueness constraints and concrete examples, it defaults to documentation-style writing.

**How to avoid:** The system prompt must include:
1. An explicit banned-words list (the `WEASEL_WORDS` constant already exists)
2. Few-shot examples showing BAD (vague) vs GOOD (specific) output for each section type
3. Structural constraints: "Every data model field MUST have: name, TypeScript type, nullable?, default value, validation constraint"
4. A self-check instruction: "Before finishing each section, verify: could a developer implement this section with ZERO questions? If not, add the missing detail."

**Warning signs:** Running the existing validation/weasel-word checker on generated specs and seeing > 5 flagged terms.

### Pitfall 6: Raw Markdown Toggle Loses Scroll Position

**What goes wrong:** User is reading section 7 in rendered preview mode, toggles to raw markdown, and ends up at the top of the document.

**Why it happens:** The preview and raw views are different components with different content heights. Swapping components resets scroll to 0.

**How to avoid:** Before toggling, calculate the scroll percentage (`scrollTop / scrollHeight`). After toggling and the new view renders, set the new scroll position to the same percentage of the new scrollHeight. Alternatively, find the currently visible heading in the preview, then scroll to the same heading text in the raw view.

## Code Examples

### Complete TOC Sidebar with Scroll Tracking

```typescript
// Source: training data pattern (MEDIUM confidence)
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

interface TocSidebarProps {
  content: string;
  isStreaming: boolean;
}

export function TocSidebar({ content, isStreaming }: TocSidebarProps) {
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const isProgrammaticScroll = useRef(false);

  // Extract headings whenever content changes
  useEffect(() => {
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const newEntries: TocEntry[] = [];
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const text = match[2].trim();
      newEntries.push({
        id: slugify(text),
        text,
        level: match[1].length,
      });
    }
    setEntries(newEntries);
  }, [content]);

  // IntersectionObserver for scroll tracking
  useEffect(() => {
    if (entries.length === 0) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (isProgrammaticScroll.current) return;
        for (const entry of observerEntries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const tocEntry of entries) {
      const el = document.getElementById(tocEntry.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [entries]);

  const scrollTo = useCallback((id: string) => {
    isProgrammaticScroll.current = true;
    setActiveId(id);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 600);
  }, []);

  return (
    <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4">
      <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">
        Contents
      </h3>
      <ul className="space-y-1">
        <AnimatePresence>
          {entries.map((entry) => (
            <motion.li
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => scrollTo(entry.id)}
                className={`
                  block w-full text-left text-[12px] py-1 transition-colors
                  ${entry.level === 1 ? "pl-0 font-semibold" : ""}
                  ${entry.level === 2 ? "pl-3" : ""}
                  ${entry.level === 3 ? "pl-6 text-[11px]" : ""}
                  ${activeId === entry.id
                    ? "text-orange-400 border-l-2 border-orange-400 pl-2"
                    : "text-white/40 hover:text-white/60"
                  }
                `}
              >
                {entry.text}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {isStreaming && (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          Generating...
        </div>
      )}
    </nav>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
```

### Section Regeneration API Route

```typescript
// Source: codebase pattern adapted (HIGH confidence for structure, MEDIUM for prompt)
import { llmStream } from "@/lib/llm/client";
import { SYSTEM_GENERATOR, promptRegenerateSection } from "@/lib/llm/prompts";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { section_number, section_title, project_data, current_spec, complexity } = body;

    if (!section_number || !project_data || !current_spec) {
      return new Response(
        JSON.stringify({ error: "section_number, project_data, and current_spec required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = await llmStream({
      task: "generate",
      system: SYSTEM_GENERATOR,
      prompt: promptRegenerateSection(
        section_number,
        section_title,
        JSON.stringify(project_data, null, 2),
        current_spec,
        complexity
      ),
    });

    return new Response(stream.toReadableStream(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/generate-section]", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### Enhanced System Prompt with Few-Shot Specificity Examples

```typescript
// Source: training data + existing prompt patterns (MEDIUM-HIGH confidence)
export const SYSTEM_GENERATOR_V2 = `You are a senior systems architect generating an engineering specification document. You produce the exact level of detail needed for a developer or AI coding agent to build the described system without ambiguity.

ABSOLUTE RULES (violation = failure):
1. NEVER use these words: ${WEASEL_WORDS.join(", ")}
2. Every data model field MUST specify: name, TypeScript type, nullable?, default value, validation constraint
3. Every API endpoint MUST specify: HTTP method, exact path, auth requirement, request body schema, success response schema, every error response (status code + body)
4. Every user flow MUST be numbered steps with: actor, action, system response, error branches
5. Use the user's exact terminology for domain concepts — never substitute generic terms
6. Mark anything you infer but the user didn't say as [ASSUMPTION]

SPECIFICITY STANDARD — BAD vs GOOD:

BAD Data Model:
  "The User model has fields for basic user information and authentication data."

GOOD Data Model:
  ### User
  | Field | Type | Nullable | Default | Constraint |
  |-------|------|----------|---------|------------|
  | id | string (UUID v4) | No | auto-generated | Primary key |
  | email | string | No | - | Unique, max 254 chars, RFC 5322 format |
  | password_hash | string | No | - | bcrypt, 60 chars |
  | display_name | string | No | - | 2-50 chars, alphanumeric + spaces |
  | created_at | DateTime (ISO 8601) | No | now() | Immutable after creation |
  | updated_at | DateTime (ISO 8601) | No | now() | Auto-updated on mutation |

BAD API:
  "POST /api/users — Creates a new user account with validation."

GOOD API:
  ### POST /api/users
  **Auth:** None (public registration)
  **Request Body:**
  \`\`\`json
  {
    "email": "user@example.com",        // Required, RFC 5322
    "password": "securePassword123!",   // Required, min 8 chars, 1 upper, 1 digit
    "display_name": "Jane Developer"    // Required, 2-50 chars
  }
  \`\`\`
  **Success (201):**
  \`\`\`json
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "display_name": "Jane Developer",
    "created_at": "2024-01-15T10:30:00Z"
  }
  \`\`\`
  **Errors:**
  | Status | Condition | Body |
  |--------|-----------|------|
  | 400 | Missing required field | \`{ "error": "email is required" }\` |
  | 400 | Invalid email format | \`{ "error": "Invalid email format" }\` |
  | 400 | Password too weak | \`{ "error": "Password must be 8+ chars with 1 uppercase and 1 digit" }\` |
  | 409 | Email already registered | \`{ "error": "Email already in use" }\` |

BAD User Flow:
  "The user logs in and is redirected to the dashboard."

GOOD User Flow:
  #### Login Flow
  1. User navigates to /login
  2. User enters email and password, clicks "Sign In"
  3. Client sends POST /api/auth/login with { email, password }
  4. Server validates credentials against User table
     - **If valid:** Returns 200 with JWT token (exp: 7 days). Client stores in httpOnly cookie. Redirect to /dashboard.
     - **If invalid credentials:** Returns 401 \`{ "error": "Invalid email or password" }\`. Client shows error toast. No redirect.
     - **If account locked:** Returns 423 \`{ "error": "Account locked. Try again in 30 minutes." }\`. Client shows error with countdown.
  5. Dashboard loads user's projects via GET /api/projects (auth required)

SELF-CHECK: Before completing each section, ask yourself: "Could a developer implement this section with ZERO questions back to me?" If the answer is no, add the missing detail.`;
```

### Spec Toolbar Component

```typescript
// Source: existing codebase patterns (HIGH confidence)
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Eye, Code2, FileText } from "lucide-react";
import { toast } from "sonner";

interface SpecToolbarProps {
  content: string;
  viewMode: "preview" | "raw";
  onViewModeChange: (mode: "preview" | "raw") => void;
  wordCount: number;
  sectionCount: number;
  validationGrade?: string;
  isStreaming: boolean;
}

export function SpecToolbar({
  content,
  viewMode,
  onViewModeChange,
  wordCount,
  sectionCount,
  validationGrade,
  isStreaming,
}: SpecToolbarProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success("Spec copied to clipboard!");
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "specification.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded specification.md");
  };

  return (
    <div className="flex items-center justify-between border-b border-white/8 pb-3 mb-4">
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "preview" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("preview")}
          className="h-7 text-[11px]"
        >
          <Eye className="h-3 w-3 mr-1" /> Preview
        </Button>
        <Button
          variant={viewMode === "raw" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("raw")}
          className="h-7 text-[11px]"
        >
          <Code2 className="h-3 w-3 mr-1" /> Raw
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] text-white/25">
          {wordCount.toLocaleString()} words | {sectionCount} sections
        </span>
        {validationGrade && (
          <Badge variant="outline" className="text-[10px]">
            {validationGrade}
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={isStreaming || !content}
          className="h-7 text-[11px]"
        >
          <Copy className="h-3 w-3 mr-1" /> Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isStreaming || !content}
          className="h-7 text-[11px]"
        >
          <Download className="h-3 w-3 mr-1" /> Download .md
        </Button>
      </div>
    </div>
  );
}
```

### Section Regeneration Prompt Template

```typescript
// Source: codebase prompt pattern + training data (MEDIUM confidence)
export function promptRegenerateSection(
  sectionNumber: number,
  sectionTitle: string,
  projectData: string,
  currentSpec: string,
  complexity: string
): string {
  return `Regenerate ONLY section ${sectionNumber} ("${sectionTitle}") of this engineering specification.

CURRENT FULL SPEC (for context — maintain consistency with all other sections):
${currentSpec}

PROJECT DATA:
${projectData}

COMPLEXITY: ${complexity}

INSTRUCTIONS:
1. Generate ONLY the content for "## ${sectionNumber}. ${sectionTitle}" and its subsections
2. Start your output with "## ${sectionNumber}. ${sectionTitle}"
3. Use EXACTLY the same entity names, field names, API paths, and conventions as the existing spec
4. Improve specificity, completeness, and detail compared to the current version
5. Follow all the specificity rules from the system prompt
6. Do NOT include content from other sections
7. Do NOT add a section heading for any other section number

SELF-CHECK: After generating, verify every entity name and field name matches the rest of the spec exactly.`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `marked` + `dangerouslySetInnerHTML` | `react-markdown` (pure React) | 2020+ | Safer (no XSS), better React integration, easier custom rendering |
| Prism.js for highlighting | highlight.js via rehype-highlight (or Shiki for static) | 2023+ | highlight.js simpler integration with unified/rehype ecosystem; Shiki for static generation |
| Manual SSE parsing | Vercel AI SDK `useChat` | 2023+ | This project correctly uses manual SSE for lighter bundle. AI SDK is heavier but more features. |
| Full document re-generation | Section-level regeneration | 2024+ | Much faster iteration on specific sections; critical UX improvement |
| Static TOC from complete document | Live TOC from streaming content | 2024+ (AI apps) | Standard pattern in AI document generators |

**Deprecated/outdated:**
- `remark-highlight.js` (old package): Use `rehype-highlight` instead (same engine, correct position in unified pipeline)
- `react-markdown` v8 and below: v9+ uses ESM-only, compatible with Next.js 16
- `remark-gfm` v3 and below: v4+ required for react-markdown v9

## Prompt Engineering Deep Dive (SPEC-03, SPEC-04, SPEC-05)

### The Specificity Problem

The existing `SYSTEM_GENERATOR` prompt (in `src/lib/llm/prompts.ts`) is good but lacks two critical elements:

1. **Few-shot examples**: The prompt says "be specific" but doesn't show what "specific" looks like. LLMs respond dramatically better to examples than instructions. Adding 2-3 BAD vs GOOD examples per section type (data model, API, user flow) increases specificity measurably.

2. **Terminology echo**: The prompt doesn't explicitly instruct the LLM to reuse the user's exact domain language. Adding "Use the user's exact terminology for domain concepts -- never substitute generic terms" and passing the user's Q&A transcript with their exact words makes a significant difference.

### Recommended Prompt Structure for SPEC-03

The enhanced system prompt should:
1. Keep the existing rules (they're solid)
2. Add the `WEASEL_WORDS` list inline (already exists as a constant)
3. Add BAD vs GOOD few-shot examples for the three most important section types
4. Add a self-check instruction
5. Add terminology echo instruction

The user prompt (`promptGenerateSpec`) should:
1. Include the full discovery Q&A with original user wording (SPEC-04)
2. Structure the project data to highlight user-chosen names and terms
3. Pass the complexity to calibrate section depth

### Confidence: MEDIUM-HIGH
This is well-established prompt engineering technique. The specific few-shot examples should be tested and iterated with real spec outputs.

## Tailwind CSS v4 Typography Considerations

The project uses Tailwind CSS v4. For the prose/typography styles needed by `react-markdown` rendered output, there are two approaches:

1. **Use `@tailwindcss/typography` plugin**: Provides `prose` classes that style rendered markdown beautifully. However, verify v4 compatibility -- Tailwind v4 changed the plugin system.

2. **Custom CSS classes on react-markdown components**: The custom `components` prop approach (shown in Pattern 1 above) styles each element individually. This gives full control and avoids the typography plugin dependency entirely.

**Recommendation:** Use the custom components approach (option 2). It avoids adding another dependency, gives precise control over dark mode styling (the app uses a dark theme), and is more maintainable since all styles are co-located with the rendering code.

## Open Questions

1. **react-markdown v9 + Next.js 16 ESM compatibility**
   - What we know: react-markdown v9 is ESM-only. Next.js 16 supports ESM imports.
   - What's unclear: Whether there are specific transpilation issues with the current next.config.ts setup. The app uses `"type": "module"` or standard CJS.
   - Recommendation: Install and test. If ESM issues arise, add `transpilePackages: ["react-markdown"]` to next.config.ts.

2. **highlight.js bundle size**
   - What we know: Full highlight.js is ~1MB. Only a subset of languages is needed for engineering specs (TypeScript, JavaScript, JSON, YAML, SQL, Python, bash, HTML, CSS).
   - What's unclear: Whether rehype-highlight supports selective language registration to reduce bundle.
   - Recommendation: Import only needed languages if bundle size becomes an issue. For v1, the full bundle is acceptable since it's loaded lazily.

3. **react-markdown streaming performance ceiling**
   - What we know: Re-parsing the full markdown on each token works fine for documents under ~50KB. Typical specs are 5-15KB.
   - What's unclear: Exact performance characteristics with complex specs (many tables, code blocks) in the 15-25KB range on the `generate` task's 16K max tokens.
   - Recommendation: Implement with memo + optional throttle (100ms during streaming). Measure with real specs. Optimize only if needed.

4. **IntersectionObserver behavior within scrollable container**
   - What we know: The current spec display uses `max-h-[600px] overflow-auto`. IntersectionObserver defaults to viewport root.
   - What's unclear: Whether IntersectionObserver correctly tracks headings inside a scrollable div rather than the viewport.
   - Recommendation: Pass the scrollable container as the `root` option to IntersectionObserver. This is well-supported but must be set explicitly.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis**: Direct reading of all source files in `src/` -- types, hooks, prompts, API routes, page components
- **Existing planning docs**: ROADMAP.md, REQUIREMENTS.md, 03-01-PLAN.md, STACK.md, CONVENTIONS.md, STRUCTURE.md
- **npm registry** (attempted): Version verification for react-markdown, remark-gfm, rehype-highlight, highlight.js (Bash denied -- versions based on training data)

### Secondary (MEDIUM confidence)
- **react-markdown API and streaming patterns**: Based on training data (library is stable and widely documented, approach is well-established in AI applications)
- **rehype-highlight / highlight.js integration**: Based on training data (standard unified ecosystem plugin)
- **IntersectionObserver for scroll tracking**: Based on training data (Web API, well-documented)
- **Prompt engineering patterns**: Based on training data and analysis of existing project prompts

### Tertiary (LOW confidence)
- **Exact latest versions**: Could not verify via npm registry due to tool restrictions. Versions cited are from training data (may be stale by 6-12 months). Planner should verify versions at install time.
- **Tailwind v4 typography plugin compatibility**: Not verified. Custom components approach recommended to avoid this uncertainty.

## Metadata

**Confidence breakdown:**
- Standard stack (react-markdown + remark-gfm + rehype-highlight): MEDIUM-HIGH -- well-established pattern, but exact latest versions unverified
- Architecture (component structure, section parser, TOC extraction): HIGH -- based on direct codebase analysis and standard React patterns
- Prompt engineering (few-shot examples, specificity enforcement): MEDIUM-HIGH -- well-established technique, specific examples should be iterated
- Streaming rendering patterns: MEDIUM -- based on widely-used patterns in AI apps, but not verified against current library versions
- Pitfalls: MEDIUM-HIGH -- based on real-world experience patterns with these libraries

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (30 days -- libraries are stable, patterns are established)
