# Concerns

Technical debt, known issues, and areas requiring attention.

## Critical Issues

### 1. API Routes Fail Without ANTHROPIC_API_KEY
- **Location:** `src/lib/llm/client.ts`, `src/app/api/discover/route.ts`, `src/app/api/generate/route.ts`, `src/app/api/validate/route.ts`
- **Impact:** All LLM-powered features (discovery, spec generation, validation) throw 500 errors without the env var
- **No env var is configured on Vercel** — the deployed app's core workflow is broken
- **No graceful degradation** — hard crash, no user-facing error message explaining why

### 2. Discovery Flow Not Functional
- **Location:** `src/app/project/[id]/page.tsx`
- **Impact:** The 5-phase discovery workflow calls `/api/discover` for questions but the API route depends on LLM availability
- **No fallback question bank** — if LLM fails, no questions are generated
- **No offline/demo mode** — impossible to test without API key

### 3. No Error Boundaries
- **Location:** Throughout app
- **Impact:** Any runtime error crashes the entire page with no recovery
- **No error boundary components** wrapping major sections

## Architecture Concerns

### 4. Prompt Quality Unvalidated
- **Location:** `src/lib/llm/prompts.ts`
- **Impact:** All prompts were written in a single pass without testing against actual LLM responses
- **JSON parsing fragility** — `llmCallJSON` does basic markdown fence stripping but could fail on malformed responses
- **No retry logic** — single LLM call, no fallback on parse failure

### 5. No Rate Limiting or Token Tracking
- **Location:** `src/app/api/*.ts`
- **Impact:** Each API call is unbounded — no rate limiting, no token budget tracking
- **Spec generation uses maxTokens: 16384** — expensive per call with no guard rails

### 6. localStorage as Only Persistence
- **Location:** `src/lib/storage.ts`
- **Impact:** All project data stored in browser localStorage
- **Data loss risk** — clearing browser data loses all work
- **No export/import** — can't backup or transfer projects
- **Size limits** — localStorage caps at ~5-10MB depending on browser

## Code Quality

### 7. Giant Monolithic Page Component
- **Location:** `src/app/project/[id]/page.tsx`
- **Impact:** The entire 5-phase workflow is a single ~600 line component
- **No separation of concerns** — phase components, Q&A logic, spec viewer all inline
- **Hard to maintain and extend**

### 8. No TypeScript Strict Checks
- **Location:** `tsconfig.json`
- **Impact:** Type safety gaps — `any` types, missing null checks
- **No ESLint rules enforcing quality**

### 9. No Tests
- **Impact:** Zero test coverage — no unit tests, no integration tests, no E2E tests
- **Regression risk** is high during refactoring

## Security

### 10. API Key Exposure Risk
- **Location:** `src/lib/llm/client.ts`
- **Impact:** API key is server-side only (good), but no CORS restrictions on API routes
- **No authentication** — anyone can call `/api/discover`, `/api/generate`, `/api/validate` directly
- **No abuse prevention** — could be exploited to run up API costs

## Performance

### 11. No Loading States for LLM Calls
- **Location:** `src/app/project/[id]/page.tsx`
- **Impact:** LLM calls take 5-30 seconds — basic spinner but no streaming, no progress indication
- **No timeout handling** — if LLM hangs, user waits indefinitely

### 12. No Caching
- **Impact:** Same discovery questions regenerated every time, same classification repeated
- **No memoization** of LLM results

---
*Mapped: 2025-02-20*
