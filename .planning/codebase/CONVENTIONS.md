# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `navbar.tsx`, `command-palette.tsx`, `button.tsx`)
- Pages: `page.tsx` or `[dynamic].tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Utilities/Types: `camelCase.ts` (e.g., `utils.ts`, `types.ts`, `constants.ts`)
- UI components: Single word or kebab-case in `src/components/ui/` (e.g., `button.tsx`, `dropdown-menu.tsx`)

**Functions:**
- camelCase: `quickClassify()`, `llmCall()`, `saveProject()`, `listProjects()`
- JSDoc comments for public functions: Optional but used for key functions
- Event handlers: `handleX` pattern (e.g., `handleDelete()`, `handleCreate()`, `handleDescriptionChange()`)

**Variables:**
- camelCase: `isCreating`, `classification`, `description`, `tokenCount`
- Constants: SCREAMING_SNAKE_CASE (e.g., `PROJECTS_KEY`, `LLM_MODEL`, `TOLLGATE_WEIGHTS`)
- React state: descriptive camelCase (e.g., `projects`, `isAgentic`, `currentPhase`)
- Type variables: camelCase (e.g., `complexity`, `grade`)

**Types:**
- PascalCase for interfaces/types: `Project`, `DiscoveryData`, `Feature`, `ValidationReport`
- Compound types use underscore notation: `Phase = "discover" | "define" | "architect" | "specify" | "deliver"`
- Generic types: `LLMResponse<T>`, `LLMCallOptions`

## Code Style

**Formatting:**
- No Prettier config found — use default formatting
- 2-space indentation (observed)
- Line length: No explicit limit enforced
- Semicolons: Always included
- Quotes: Double quotes for imports, single quotes in template strings

**Linting:**
- ESLint 9 with `eslint-config-next` (core-web-vitals + TypeScript)
- Config: `C:\Users\Brian\OneDrive\Desktop\skill-forge-app\eslint.config.mjs`
- No custom ESLint overrides beyond Next.js defaults
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
- Run: `npm run lint` (though no lint script visible in package.json)

**TypeScript:**
- `strict: true` in `tsconfig.json` — all strict checks enabled
- Target: ES2017
- Module: esnext
- Path alias: `@/*` → `./src/*`
- Runtime checks for `Error` instances: `error instanceof Error ? error.message : "Unknown error"`

## Import Organization

**Order:**
1. React/Next.js imports (e.g., `import { useState } from "react"`)
2. Next.js framework imports (e.g., `import Link from "next/link"`)
3. Third-party libraries (e.g., `import { Button } from "@/components/ui/button"`)
4. Local imports using `@/*` alias (e.g., `import { saveProject } from "@/lib/storage"`)
5. Type imports: `import type { Project } from "@/lib/types"`

**Path Aliases:**
- All local imports use `@/` prefix (e.g., `@/lib/storage`, `@/components/navbar`, `@/lib/types`)
- No relative imports (`../`) used in codebase

**Barrels:**
- UI components exported from individual files
- No barrel re-exports (index.ts) observed in codebase

## Error Handling

**Patterns:**
- Try-catch with typed error handling: `catch (error: unknown)`
- Always check instanceof: `error instanceof Error ? error.message : "Unknown error"`
- Server-side: Return `NextResponse.json({ error: message }, { status: 500 })`
- Client-side: Use `toast.error()` from sonner library for user feedback
- Silent fallback in optional operations: `catch { /* continue without it */ }`
- Validation with early returns: `if (!value) return NextResponse.json({ error: "..." }, { status: 400 })`

**Specific Examples:**
- `src/app/api/discover/route.ts`: Catches unknown errors and returns 500 with message
- `src/app/api/generate/route.ts`: Returns 400 for missing required fields, 500 for processing errors
- `src/app/create/page.tsx`: Uses try-catch for fetch operations with fallback to client-side classification
- `src/lib/storage.ts`: Returns empty array on error in `listProjects()`; silently returns void on errors in write operations

## Logging

**Framework:** `console.error()` for error logging

**Patterns:**
- Prefix logs with route/module: `console.error("[/api/discover]", message)`
- Only log errors, not debug info
- No logging in UI components
- JSON parsing errors logged with context

**Examples:**
```typescript
// In API routes
console.error("[/api/validate]", message);

// In utilities - no logging observed
```

## Comments

**When to Comment:**
- Section headers with decorative dividers: `// ═══════════════════════════════════════════`
- Category labels: `// ── Read ───────────────────────────`, `// ── Write ──────────────────────────`
- Complex business logic explanations

**JSDoc/TSDoc:**
- Minimal usage — used only for critical exported functions
- Format: `/** Explanation */` (single line) or multi-line with `@param`, `@returns`
- Examples:
  ```typescript
  /**
   * Make an LLM call. Server-side only.
   * Returns the text content and usage metadata.
   */
  export async function llmCall(options: LLMCallOptions): Promise<LLMResult>

  /**
   * Quick client-side heuristic for complexity classification.
   * Used for instant feedback before the LLM classification returns.
   */
  export function quickClassify(description: string): { ... }
  ```

## Function Design

**Size:** Functions are typically 10-50 lines; longer functions break logic into helpers

**Parameters:**
- Use object parameters for multiple options: `llmCallOptions` object with `system`, `prompt`, `maxTokens`, `temperature`
- Avoid long parameter lists
- Use generics for type-safe results: `llmCallJSON<T>()`

**Return Values:**
- Always explicitly typed
- API routes return `NextResponse.json()`
- Server functions return plain objects or arrays
- Async functions return `Promise<T>`
- Generic wrappers: `Promise<{ data: T; meta: { ... } }>`

## Module Design

**Exports:**
- Named exports preferred: `export function foo()`, `export interface Bar`
- Default exports for components: `export default function DashboardPage()`
- No star exports

**File Structure:**
- `src/lib/types.ts`: Type definitions and factory functions (e.g., `createProject()`)
- `src/lib/constants.ts`: Config, lookup tables, threshold values
- `src/lib/utils.ts`: Shared utilities (e.g., `cn()` for classname merging)
- `src/lib/storage.ts`: localStorage persistence layer
- `src/lib/llm/client.ts`: Server-side LLM client
- `src/lib/llm/prompts.ts`: System prompts and prompt templates
- `src/lib/engine/complexity.ts`: Business logic for complexity detection
- `src/app/api/[action]/route.ts`: Isolated API route handlers
- `src/components/ui/`: shadcn-style UI components (CVA variants)
- `src/components/`: Application-level components

**Client vs. Server:**
- Components marked `"use client"` at top of file
- API routes are inherently server-only
- Storage operations check `typeof window === "undefined"` for SSR safety

## Code Examples

### Type Definition Pattern
```typescript
export type Complexity = "simple" | "moderate" | "complex";
export type Phase = "discover" | "define" | "architect" | "specify" | "deliver";

export interface Project {
  id: string;
  name: string;
  // ...
  discovery: DiscoveryData;
  spec: GeneratedSpec | null;
  validation: ValidationReport | null;
}

export function createProject(description: string, complexity: Complexity = "moderate"): Project {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return { id, name: "", /* ... */ };
}
```

### API Route Pattern
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "classify": {
        // validation
        if (!description) return NextResponse.json({ error: "..." }, { status: 400 });

        // LLM call
        const { data, meta } = await llmCallJSON<...>({ ... });

        // response
        return NextResponse.json({ ...data, meta });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/route]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Component Pattern (with CVA)
```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "...",
      destructive: "...",
    },
    size: {
      default: "...",
      sm: "...",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function Button({ className, variant, size, asChild, ...props }) {
  const Comp = asChild ? Slot.Root : "button"
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
```

### Event Handler Pattern
```typescript
const handleDelete = (id: string, name: string) => {
  deleteProject(id);
  setProjects(listProjects());
  toast.success(`Deleted "${name || "Untitled"}"`);
};

const handleCreate = async () => {
  if (!description.trim()) {
    toast.error("Error message");
    return;
  }

  try {
    // operation
  } catch {
    toast.error("Failed to create");
    setIsCreating(false);
  }
};
```

---

*Convention analysis: 2026-02-20*
