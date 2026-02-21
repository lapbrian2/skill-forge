# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Server-Driven Structured Discovery with Client-Side Storage

Skill Forge implements a **five-phase structured discovery** system that guides users from rough app ideas to production-ready engineering specifications. The architecture separates concerns across client-side UI state management, server-side LLM orchestration, browser-based persistence, and validation logic.

**Key Characteristics:**
- **Phase-locked workflow**: Project advances linearly through discover → define → architect → specify → deliver phases
- **LLM-driven generation**: All discovery questions, feature generation, and spec synthesis delegated to Claude via Anthropic SDK
- **Hybrid classification**: Client-side heuristics for instant feedback + server-side LLM for authoritative complexity scoring
- **Browser-native storage**: Projects persisted to localStorage; designed for Supabase migration
- **Tollgate validation**: Two-stage spec validation (Completeness + Production Readiness) scoring specs from 0-100

## Layers

**Presentation Layer:**
- Purpose: React/Next.js UI components, user interactions, form handling, real-time visual feedback
- Location: `src/app/` (pages), `src/components/` (shared UI)
- Contains: Page components (dashboard, create, project detail, discovery UI), UI primitives (button, input, dialog, etc.), command palette
- Depends on: Storage layer (read/write projects), LLM client (fetch discovery questions), constants (phase metadata, theme colors)
- Used by: End users via web browser

**API/Route Layer:**
- Purpose: Next.js API routes that orchestrate LLM calls and validation logic
- Location: `src/app/api/` (discover, generate, validate)
- Contains: Request handlers, LLM call coordination, Anthropic SDK integration, response parsing
- Depends on: LLM client module, prompts module, validation engine, constants
- Used by: Client components via fetch() calls

**Engine Layer:**
- Purpose: Business logic for complexity classification, validation, and scoring
- Location: `src/lib/engine/` (complexity.ts), `src/app/api/validate/route.ts`
- Contains: Heuristic classification algorithms, tollgate checking, weasel-word detection, placeholder scanning, spec quality metrics
- Depends on: Constants (WEASEL_WORDS, GRADE_THRESHOLDS, SPEC_SECTIONS), types
- Used by: Create page (quick classification), API routes (scoring)

**Storage Layer:**
- Purpose: Persistence abstraction for project data
- Location: `src/lib/storage.ts`
- Contains: localStorage CRUD operations (listProjects, getProject, saveProject, deleteProject)
- Depends on: Types module (Project interface)
- Used by: All client pages and components

**Data/Types Layer:**
- Purpose: Core domain types and factory functions
- Location: `src/lib/types.ts`
- Contains: Project, DiscoveryData, Feature, GeneratedSpec, ValidationReport, Phase, Complexity enums and interfaces
- Depends on: Nothing (foundational)
- Used by: Every other layer

**LLM Orchestration Layer:**
- Purpose: Encapsulates Anthropic API communication and prompt management
- Location: `src/lib/llm/client.ts`, `src/lib/llm/prompts.ts`
- Contains: `llmCall()` and `llmCallJSON()` functions, system prompts (SYSTEM_DISCOVERY, SYSTEM_GENERATOR, SYSTEM_VALIDATOR, SYSTEM_COMPLEXITY), prompt factory functions
- Depends on: @anthropic-ai/sdk, constants (LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE)
- Used by: API routes for all LLM-driven features

**Configuration Layer:**
- Purpose: Centralized constants and metadata
- Location: `src/lib/constants.ts`
- Contains: Phase definitions (PHASES), complexity configs (COMPLEXITY_CONFIG), validation thresholds (GRADE_THRESHOLDS, TOLLGATE_WEIGHTS), section map (SPEC_SECTIONS), agentic keywords, weasel words
- Depends on: Nothing
- Used by: All layers (engine, API, UI, storage)

## Data Flow

**User Creates Project:**
1. User enters app description in `/create` page (`src/app/create/page.tsx`)
2. Client runs `quickClassify()` from `src/lib/engine/complexity.ts` for instant feedback
3. On form submit, calls `POST /api/discover` with action "classify"
4. Server calls `llmCallJSON()` → SYSTEM_COMPLEXITY prompt → Claude → returns complexity, is_agentic, suggested_name
5. Client creates Project object via `createProject()` factory, updates properties from LLM
6. Project saved to localStorage via `saveProject()` in `src/lib/storage.ts`
7. Router redirects to `/project/[id]`

**User Answers Discovery Questions:**
1. ProjectPage (`src/app/project/[id]/page.tsx`) loads project from localStorage
2. Auto-triggers `fetchNextQuestion()` which calls `POST /api/discover` with action "question"
3. Server passes description, phase, previous answers, complexity to `promptDiscoveryQuestion()`
4. Claude generates next contextual question with "why it matters" explanation
5. User answers; client records QAEntry with question, answer, timestamp in project.discovery.answers
6. If LLM indicates phase is complete, client calls `advancePhase()` which moves to next phase
7. Project saved to localStorage before advancing

**Generation Phase:**
1. After architect phase completes, user enters "specify" phase
2. Project page calls `POST /api/generate` with full project_data + complexity
3. Server uses `promptGenerateSpec()` to build a structured prompt with all discovery data
4. Claude generates full markdown specification (up to 16K tokens)
5. Server counts sections (regex `## \d+\.`) and words, returns metadata
6. Client displays spec in CodeMirror editor, saves to `project.spec`

**Validation Phase:**
1. User in "deliver" phase or can manually trigger validation
2. Calls `POST /api/validate` with spec_content + required_sections
3. Server performs Tollgate 4 (Completeness) checks:
   - Section existence checks for each required section
   - Weasel word detection (WEASEL_WORDS list)
   - Word count threshold check (minimum 500)
   - Data model field types detected
   - API endpoint HTTP methods detected
4. Server performs Tollgate 5 (Production Readiness) checks:
   - Placeholder markers (TODO, TBD, PLACEHOLDER, FIXME, XXX)
   - Version number presence
   - Success metrics defined
   - Implementation roadmap present
5. Scores weighted: 60% Tollgate 4 + 40% Tollgate 5
6. Score converted to grade (A-F) via GRADE_THRESHOLDS
7. Optional: LLM clarity scoring on sample section if spec > 300 words
8. Returns ValidationReport with all checks, remediations, overall_score, passed boolean

**State Management:**
- **Client state**: React hooks (useState, useEffect) in page components, no global state library
- **Persistent state**: localStorage via `storage.ts` - single "skillforge_projects" key containing serialized Project[]
- **UI state**: Form inputs (answer text), loading spinners (isLoading, isGenerating), current question display
- **Phase state**: Tracked in Project.current_phase enum; advances linearly
- **LLM context**: Full discovery Q&A log maintained in project.discovery.answers for contextual question generation

## Key Abstractions

**Project:**
- Purpose: Root aggregate containing all data for a single specification effort
- Examples: `src/lib/types.ts` (Project interface), factory in `src/lib/types.ts` (createProject)
- Pattern: Contains nested DiscoveryData with phases 1-3, answers array, spec output, validation report
- Lifecycle: Created on /create, mutated through each phase, final state output as markdown

**DiscoveryData:**
- Purpose: Aggregates all structured data gathered during phases 1-3
- Examples: `src/lib/types.ts` lines 31-65
- Pattern: Three nested objects (phase1, phase2, phase3) matching the structured interview phases
- Tollgates: phase1.complete → tollgate_1_passed, etc.

**Feature:**
- Purpose: Individual product feature with requirements, acceptance criteria, error handling
- Examples: `src/lib/types.ts` lines 77-86, generated in `POST /api/discover` action "features"
- Pattern: Name, description, tier (must_have/should_have/could_have), agent_role (none/assist/own), acceptance_criteria array, edge_cases array, error_handling array
- Used by: Feature generation (phase 2), then serialized into spec generation prompt

**GeneratedSpec:**
- Purpose: Output document abstraction
- Examples: `src/lib/types.ts` lines 96-103
- Pattern: Stores markdown_content, section_count, word_count, generated_at timestamp
- Validation: Run against this via /api/validate

**ValidationReport:**
- Purpose: Quality assessment of a spec against buildability criteria
- Examples: `src/lib/types.ts` lines 107-141
- Pattern: Two TollgateResult objects, overall_score (0-100), grade (A-F), remediations list, passed boolean
- Lifecycle: Generated on demand via /api/validate, saved to project.validation

**Phase Enum:**
- Purpose: Defines the five-stage workflow
- Examples: "discover" | "define" | "architect" | "specify" | "deliver"
- Pattern: Linear progression; each phase has metadata in PHASES array in constants
- Validation: Tollgate passed on phase completion gates advance to next

**Complexity Enum:**
- Purpose: Classification of scope/effort level
- Examples: "simple" | "moderate" | "complex"
- Pattern: Each level has COMPLEXITY_CONFIG with question range, spec page range, required spec sections
- LLM guidance: Affects discovery question strategy and spec generation detail level

## Entry Points

**Web Entry Point:**
- Location: `src/app/layout.tsx`
- Triggers: Browser loads http://localhost:3000
- Responsibilities: Root HTML structure, Navbar, CommandPalette, Toaster (toast notifications), Tailwind styles, Google fonts

**Dashboard (/):**
- Location: `src/app/page.tsx`
- Triggers: User navigates to home or after project creation
- Responsibilities: Lists all projects from localStorage, shows current phase progress, project metadata, delete button, navigate to project detail

**Create (/create):**
- Location: `src/app/create/page.tsx`
- Triggers: User clicks "New Spec" button
- Responsibilities: Text area for app description, client-side quick classification, LLM classification on submit, project creation, redirect to project page

**Project Detail (/project/[id]):**
- Location: `src/app/project/[id]/page.tsx`
- Triggers: User clicks project in dashboard or after creation
- Responsibilities: Load project, manage phase progression, fetch discovery questions, collect answers, trigger spec generation, display/edit spec markdown, run validation

**API: POST /api/discover:**
- Location: `src/app/api/discover/route.ts`
- Triggers: Client calls fetch() with various actions
- Responsibilities: Route to action handler (classify, question, brief, features, architecture); call LLM; parse JSON response; return typed data

**API: POST /api/generate:**
- Location: `src/app/api/generate/route.ts`
- Triggers: Client calls fetch() to generate full spec
- Responsibilities: Build spec generation prompt from project data; call LLM with 16K tokens; count sections/words; return markdown + metadata

**API: POST /api/validate:**
- Location: `src/app/api/validate/route.ts`
- Triggers: Client calls fetch() to validate spec
- Responsibilities: Run Tollgate 4 & 5 checks; optional LLM clarity scoring; calculate overall score and grade; return ValidationReport

## Error Handling

**Strategy:** Try/catch at API layer; graceful degradation on client; user feedback via toast notifications

**Patterns:**

**LLM Unavailable:**
- File: `src/app/create/page.tsx` lines 64-80
- Pattern: Try LLM classify; on error, fall back to `quickClassify()` heuristic
- Message shown to user: "LLM unavailable. Add ANTHROPIC_API_KEY to your environment."

**Missing Project:**
- File: `src/app/project/[id]/page.tsx` lines 45-50
- Pattern: Load project from storage; if null, show error toast and redirect to home
- Message: "Project not found"

**API Errors:**
- Files: All routes in `src/app/api/`
- Pattern: Try/catch wrapping JSON parse and LLM calls; return NextResponse.json({error: message}, {status: 500})
- Client sees: Error toast with message

**Validation Errors:**
- File: `src/app/api/validate/route.ts`
- Pattern: Validation runs regardless of success/failure; Remediation[] list contains all issues
- User action: View remediations list in UI and manually fix spec

## Cross-Cutting Concerns

**Logging:**
- Approach: console.error() in catch blocks of API routes
- Format: `[/api/route]` prefix for context
- Example: `console.error("[/api/discover]", message);` in route.ts

**Validation:**
- Spec completeness: Tollgate 4 in /api/validate checks sections, weasel words, word count, data types, API methods
- Spec readiness: Tollgate 5 in /api/validate checks placeholders, version, metrics, roadmap
- Feature acceptance: Each Feature has acceptance_criteria array, edge_cases array, error_handling array
- Project phase: Enforced by linear phase progression in PHASE_ORDER

**Authentication:**
- Current: None (client-side browser only)
- Note: Comment in storage.ts indicates future Supabase migration will add auth

**Complexity Routing:**
- Used by: Discovery question strategy, spec section selection, spec depth expectations
- Affects: COMPLEXITY_CONFIG determines which sections are required; question count ranges
- Example: Simple projects only require sections [1,2,3,4,5,6,7,8,10,13]; complex requires all sections

**Agentic Awareness:**
- Is_agentic flag affects: Discovery question strategy (includes agent safety/autonomy questions), spec generation (includes agentic_architecture section if true)
- Detection: AGENTIC_KEYWORDS list in constants; matches in initial description
- Prompt impact: SYSTEM_DISCOVERY prompt conditionally includes agentic guidance
