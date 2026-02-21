# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**Anthropic Claude API:**
- Service: Anthropic AI API (claude-sonnet-4-20250514 model)
- What it's used for: Complete LLM backbone for all AI-powered features including:
  - Complexity classification of project descriptions
  - Discovery question generation during interview phase
  - Product brief generation
  - Feature specification generation
  - Architecture recommendation generation
  - Full engineering specification document generation
  - Specification validation and clarity scoring
- SDK/Client: @anthropic-ai/sdk 0.78.0
- Auth: `ANTHROPIC_API_KEY` (environment variable)
- Location: `src/lib/llm/client.ts` (client initialization and call wrappers)
- Usage patterns:
  - Text completion via `llmCall()` in `src/lib/llm/client.ts:41-65`
  - JSON parsing via `llmCallJSON<T>()` in `src/lib/llm/client.ts:71-93`
  - Streaming: Not used (all calls are completion-based)
  - Token counting: Tracked in response metadata

## Data Storage

**Databases:**
- Not used in production code. Project data is stored client-side only.

**Client Storage:**
- localStorage (browser)
  - Storage key: `skillforge_projects`
  - Implementation: `src/lib/storage.ts`
  - Contains: Serialized Project objects with all discovery data, specs, and validation results
  - Scope: Client-side only, per-browser storage
  - Note: Comment in `src/lib/storage.ts:3` indicates "Designed for easy swap to Supabase in V2"

**File Storage:**
- Local filesystem only via browser download
  - Mechanism: file-saver 2.0.5 library
  - Format: Project exports via jszip 3.10.1 for ZIP files
  - No cloud storage integration

**Caching:**
- None - No persistent caching layer

## Authentication & Identity

**Auth Provider:**
- None - No user authentication system
- Implementation:
  - App is public/anonymous by design
  - ANTHROPIC_API_KEY is the only credential required
  - No user login, no session management
  - All projects stored locally in user's browser

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service integrated

**Logs:**
- Browser console only
  - `console.error()` calls in API routes for debugging
  - Locations:
    - `src/app/api/discover/route.ts:135` - Discovery endpoint errors
    - `src/app/api/generate/route.ts:53` - Generation endpoint errors
    - `src/app/api/validate/route.ts:250` - Validation endpoint errors
  - No centralized logging, aggregation, or analytics

## CI/CD & Deployment

**Hosting:**
- Vercel - Confirmed by `.vercel/` directory and README deployment instructions
- Next.js serverless functions for API routes
- Static export for client pages
- Edge Functions: Not detected

**CI Pipeline:**
- None detected - No CI config files found
- Deployment: Manual or via Vercel git integration
- Build command: `next build`
- Start command: `next start`

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude access (critical, no fallback)

**Optional env vars:**
- None detected

**Secrets location:**
- `.env.local` (development) - Not committed per `.gitignore`
- Vercel Environment Variables (production) - Configured in Vercel project settings
- Development: Create `.env.local` file with `ANTHROPIC_API_KEY=sk-...`

**Missing or future:**
- `DATABASE_URL` - Comment in `src/lib/storage.ts` indicates Supabase V2 planned
- `SUPABASE_ANON_KEY` - Likely for future multi-user support

## Webhooks & Callbacks

**Incoming:**
- None - API routes are REST endpoints only, no webhook receivers

**Outgoing:**
- None - No outgoing webhooks, callbacks, or event subscriptions

## API Routes (Internal)

**POST `/api/discover`:**
- Purpose: Multi-action endpoint for discovery phase
- Actions: classify, question, brief, features, architecture
- Calls: `llmCallJSON()` from Anthropic SDK
- Returns: Structured JSON with LLM responses and metadata
- Location: `src/app/api/discover/route.ts:1-138`

**POST `/api/generate`:**
- Purpose: Generate full engineering specification document
- Calls: `llmCall()` from Anthropic SDK
- Returns: Markdown specification with section count, word count, token usage
- Location: `src/app/api/generate/route.ts:1-56`

**POST `/api/validate`:**
- Purpose: Validate specification against Tollgate 4 (completeness) and Tollgate 5 (production readiness)
- Calls: Optional `llmCallJSON()` for clarity scoring
- Returns: Validation report with scores, grades, remediations
- Location: `src/app/api/validate/route.ts:1-254`

## Rate Limiting & Quotas

**Anthropic API:**
- No rate limiting implemented in code
- Relies on Anthropic account quota limits
- Model: claude-sonnet-4-20250514
- Token limits per request:
  - `llmCall()`: 4096 tokens default (configurable per call)
  - Generation requests: 16384 tokens max
  - Feature generation: 8192 tokens max
  - Architecture generation: 8192 tokens max

## Request/Response Flow

**User → Frontend → API Route → Anthropic → Response:**

1. Browser (React) makes fetch request to `/api/discover|/api/generate|/api/validate`
2. API route receives JSON body
3. Route calls `llmCall()` or `llmCallJSON()` wrapper
4. Wrapper initializes Anthropic client with `process.env.ANTHROPIC_API_KEY`
5. Client sends request to Anthropic Claude API
6. Response parsed, tokens counted, latency measured
7. JSON response sent back to browser
8. Data stored in localStorage and component state

---

*Integration audit: 2026-02-20*
