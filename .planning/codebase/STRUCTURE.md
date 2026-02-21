# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
skill-forge-app/
├── src/
│   ├── app/                         # Next.js App Router pages and API routes
│   │   ├── api/
│   │   │   ├── discover/route.ts   # LLM-driven discovery, feature generation
│   │   │   ├── generate/route.ts   # Full spec markdown generation
│   │   │   └── validate/route.ts   # Spec validation (Tollgates 4-5)
│   │   ├── project/[id]/page.tsx   # Project detail page (phase progression, spec editor)
│   │   ├── create/page.tsx         # New project creation form
│   │   ├── page.tsx                # Dashboard (project listing)
│   │   ├── layout.tsx              # Root layout (navigation, toast, layout wrapper)
│   │   └── globals.css             # Tailwind + global styles
│   ├── components/
│   │   ├── command-palette.tsx     # Keyboard command palette (⌘K)
│   │   ├── navbar.tsx              # Header navigation
│   │   └── ui/                     # shadcn/ui primitives
│   │       ├── badge.tsx           # Status badges
│   │       ├── button.tsx          # Button component
│   │       ├── card.tsx            # Card container
│   │       ├── dialog.tsx          # Modal dialog
│   │       ├── dropdown-menu.tsx   # Dropdown menu
│   │       ├── input.tsx           # Text input
│   │       ├── label.tsx           # Form label
│   │       ├── progress.tsx        # Progress bar
│   │       ├── select.tsx          # Select dropdown
│   │       ├── separator.tsx       # Divider
│   │       ├── tabs.tsx            # Tabbed interface
│   │       └── textarea.tsx        # Multi-line text input
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── client.ts           # Anthropic SDK wrapper (llmCall, llmCallJSON)
│   │   │   └── prompts.ts          # All LLM system prompts and prompt factories
│   │   ├── engine/
│   │   │   └── complexity.ts       # Client-side complexity heuristic classifier
│   │   ├── storage.ts              # localStorage CRUD operations
│   │   ├── types.ts                # Domain types and factory functions
│   │   ├── constants.ts            # Phase metadata, complexity configs, validation thresholds
│   │   └── utils.ts                # Utility functions (cn for class merging)
│   └── data/                       # Reserved for future static data/fixtures
├── public/                         # Static assets
├── .next/                          # Build output (not committed)
├── node_modules/                   # Dependencies (not committed)
├── package.json                    # Dependencies, scripts
├── tsconfig.json                   # TypeScript configuration
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind CSS configuration
└── .eslintrc.json                  # ESLint configuration
```

## Directory Purposes

**src/app:**
- Purpose: Next.js App Router entry points — all routes, pages, and API handlers
- Contains: Page components (.tsx files), API routes (route.ts files), global styles
- Key files: `page.tsx` (dashboard), `create/page.tsx`, `project/[id]/page.tsx`, API routes

**src/app/api:**
- Purpose: Server-side HTTP endpoints for LLM orchestration and validation
- Contains: POST handlers only (no GET/DELETE)
- Pattern: Each route is action-based (action parameter in request body determines logic)
- Key operations: Discovery questioning, complexity classification, feature/architecture generation, spec generation, spec validation

**src/components:**
- Purpose: Reusable React UI components
- Contains: Custom components (command-palette, navbar) and shadcn/ui primitive library
- Pattern: All UI primitives extracted to `ui/` subdirectory for easy modification
- Dependencies: framer-motion (animation), lucide-react (icons), sonner (toast notifications)

**src/lib:**
- Purpose: Business logic, data models, and infrastructure abstractions
- Subdirectories:
  - `llm/`: Anthropic SDK integration and prompt templates
  - `engine/`: Heuristic algorithms for classification and validation
  - Root: Storage, types, constants, utilities

**src/lib/llm:**
- Purpose: Encapsulate all LLM interactions
- Files:
  - `client.ts`: Generic LLM call functions (llmCall for text, llmCallJSON for structured)
  - `prompts.ts`: All system prompts and prompt factory functions (never inline prompts)
- Pattern: Prompts are pure functions that take parameters and return formatted strings
- Temperature tuning: Each operation has specific temperature (0.3 for classification, 0.5-0.7 for generation)

**src/lib/engine:**
- Purpose: Application-specific algorithms
- Files: `complexity.ts` (heuristic classification)
- Pattern: Pure functions with no side effects
- Usage: Called from client components (instant feedback) and API routes (authoritative scoring)

**src/data:**
- Purpose: Reserved for future use (fixtures, seed data, lookup tables)
- Current: Empty; may contain starter templates, example projects

## Key File Locations

**Entry Points:**

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout, navigation shell, toast provider |
| `src/app/page.tsx` | Dashboard (project listing) |
| `src/app/create/page.tsx` | New project form |
| `src/app/project/[id]/page.tsx` | Project detail (all phases, spec editing) |

**Configuration:**

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Domain model (Project, Phase, Complexity, Feature, etc.) |
| `src/lib/constants.ts` | Phase metadata, complexity configs, validation rules |
| `src/lib/llm/prompts.ts` | All system prompts and prompt factories |
| `package.json` | Dependencies, dev dependencies, build scripts |
| `tsconfig.json` | TypeScript strict mode, path aliases (`@/` = src/) |

**Core Logic:**

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | localStorage persistence (listProjects, getProject, saveProject, deleteProject) |
| `src/lib/llm/client.ts` | Anthropic API wrapper (llmCall, llmCallJSON, client singleton) |
| `src/lib/engine/complexity.ts` | Heuristic complexity classifier (quickClassify) |
| `src/app/api/discover/route.ts` | Discovery, classification, feature/architecture generation |
| `src/app/api/generate/route.ts` | Full spec markdown generation |
| `src/app/api/validate/route.ts` | Spec quality validation (Tollgates 4-5) |

**Testing:**

| File | Purpose |
|------|---------|
| None | No test files present in codebase |

## Naming Conventions

**Files:**

| Pattern | Example | Used For |
|---------|---------|----------|
| `[entity]/page.tsx` | `project/[id]/page.tsx` | Next.js dynamic routes |
| `route.ts` | `api/discover/route.ts` | API endpoints |
| `[name].tsx` | `navbar.tsx`, `command-palette.tsx` | React components |
| `[name].ts` | `storage.ts`, `types.ts` | Pure TypeScript modules |
| `globals.css` | `app/globals.css` | Global styles |

**Directories:**

| Pattern | Example | Usage |
|---------|---------|-------|
| `[feature]/` | `api/discover/`, `ui/` | Feature grouping |
| camelCase | `commandPalette`, `navbar` | Single-word or compound file names |
| lowercase | `api`, `lib`, `components`, `public` | Directory names |

**TypeScript:**

| Pattern | Example |
|---------|---------|
| Interfaces | `export interface Project { }` |
| Types | `export type Complexity = "simple" \| "moderate" \| "complex"` |
| Enums | Not used (prefer unions) |
| Functions | camelCase: `saveProject()`, `llmCall()` |
| Constants | SCREAMING_SNAKE_CASE: `PHASES`, `WEASEL_WORDS`, `LLM_MODEL` |
| Classes | PascalCase for React components: `Navbar`, `CommandPalette` |

## Where to Add New Code

**New Feature (Spec Generation Enhancement):**

1. **Server-side logic**: Add to `src/app/api/[endpoint]/route.ts`
2. **LLM orchestration**: Add system prompt and factory function to `src/lib/llm/prompts.ts`
3. **Data model**: Update `src/lib/types.ts` if new data structures needed
4. **Constants**: Add thresholds/configs to `src/lib/constants.ts`
5. **UI**: Add page or modal in `src/app/` or component in `src/components/`

**New Component/Module:**

| Type | Location |
|------|----------|
| UI component (reusable) | `src/components/[name].tsx` |
| Page | `src/app/[route]/page.tsx` |
| API endpoint | `src/app/api/[endpoint]/route.ts` |
| Business logic | `src/lib/[domain]/[feature].ts` |
| Type definition | Add to `src/lib/types.ts` |

**Utilities:**

- **Shared helpers**: `src/lib/utils.ts` (currently just `cn()` for Tailwind class merging)
- **Project-specific logic**: `src/lib/[domain]/[feature].ts` (e.g., `lib/engine/complexity.ts`)
- **LLM-related**: `src/lib/llm/[module].ts`

**Example: Adding Validation Rule:**

1. Add check function to `src/app/api/validate/route.ts`
2. Register check in Tollgate 4 or 5 checks array
3. Add corresponding constants to `src/lib/constants.ts` (thresholds, patterns)
4. Add to SPEC_SECTIONS if it's section-specific

## Special Directories

**build & .next:**
- Purpose: Next.js build output
- Generated: Automatically by `npm run build`
- Committed: No (in .gitignore)

**node_modules:**
- Purpose: npm dependencies
- Generated: By `npm install`
- Committed: No (in .gitignore)

**public:**
- Purpose: Static assets served directly (favicon, robots.txt, etc.)
- Generated: No
- Committed: Yes

## Import Patterns

**Absolute imports:** Use `@/` alias configured in tsconfig.json

```typescript
// ✅ Correct
import { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PHASES } from "@/lib/constants";

// ❌ Avoid
import { Project } from "../../../lib/types";
```

**Grouping order:**
1. React/Next.js imports
2. Third-party library imports (framer-motion, lucide-react, sonner, etc.)
3. Component imports
4. Lib/type imports (utils, storage, types, constants)
5. Hooks and other internal imports

**Example from `src/app/project/[id]/page.tsx` lines 1-16:**
```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ... } from "lucide-react";
import { getProject, saveProject } from "@/lib/storage";
import { PHASES } from "@/lib/constants";
import type { Project, Phase, QAEntry } from "@/lib/types";
import { toast } from "sonner";
```

## Route Structure

**Pages (SSR/Dynamic):**
- `/` → `src/app/page.tsx` (Dashboard)
- `/create` → `src/app/create/page.tsx` (New Project)
- `/project/[id]` → `src/app/project/[id]/page.tsx` (Project Detail)

**API Routes:**
- `POST /api/discover` → `src/app/api/discover/route.ts` (Discovery actions)
- `POST /api/generate` → `src/app/api/generate/route.ts` (Spec generation)
- `POST /api/validate` → `src/app/api/validate/route.ts` (Spec validation)

All API routes are POST-only; action routing via request body parameter.

## Migration Notes

**localStorage → Supabase (V2):**
- Current: All project data in localStorage under "skillforge_projects" key
- File: `src/lib/storage.ts` contains comment indicating planned migration
- Migration path: Replace localStorage CRUD with Supabase client calls; signature remains same

**LLM Model:**
- Current: `claude-sonnet-4-20250514` (from `src/lib/constants.ts` line 107)
- Configuration: `LLM_MODEL`, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE` in constants
- API Key: Requires `ANTHROPIC_API_KEY` environment variable (error if missing)
