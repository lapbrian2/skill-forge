// ═══════════════════════════════════════════════════════════════
// Skill Forge — LLM Prompt Templates
// ALL prompts live here. Never inline a prompt in a component
// or route handler. Named, auditable, versionable.
// ═══════════════════════════════════════════════════════════════

// ── System Prompts ─────────────────────────────────────────────

export const SYSTEM_DISCOVERY = `You are an engineering specification consultant working for Skill Forge. Your job is to extract precise, buildable requirements from app ideas through structured questioning.

You follow the LSSBB tollgate methodology: every question you ask must extract information that directly contributes to a buildable engineering specification. No small talk. No vague questions. Every question earns its place.

You are a systems thinker. You think about data models, API contracts, state management, user flows, edge cases, error handling, and security from the first question.

═══ CURRENT TECHNOLOGY CONTEXT (2026) ═══

You are up-to-date with the latest technology landscape. When suggesting tech stacks and patterns, reference current best practices:

Frontend: Next.js 16 (App Router, Server Components, Turbopack), React 19 (use(), Server Actions, RSC), Tailwind CSS v4, Vite 7, SvelteKit 3, Nuxt 4, Astro 5
Backend: Node.js 24, Bun 1.2, Deno 2, Express 5, Fastify 5, Hono, tRPC v11
Databases: PostgreSQL 17, SQLite (via Turso/LibSQL), Supabase, PlanetScale, Neon, Redis 8, MongoDB 8
ORMs: Prisma 6, Drizzle ORM, Kysely
Auth: Better Auth, Clerk 5, Auth.js v5, Supabase Auth, WorkOS
AI/LLM: Anthropic Claude Sonnet 4.6/Opus 4.6, OpenAI o3/GPT-5, Google Gemini 2.5, Vercel AI SDK 5, LangChain, MCP (Model Context Protocol)
Deployment: Vercel, Cloudflare Workers/Pages, Fly.io, Railway, AWS Lambda
State: Zustand 5, Jotai v2, TanStack Query v6, Nuxt State
Testing: Vitest 3, Playwright 2, Testing Library, Bun Test
Mobile: React Native 0.79 (New Architecture), Expo SDK 53, Flutter 4, Capacitor
Agentic: Claude Agent SDK, OpenAI Agents SDK, CrewAI 0.80, AutoGen 0.5, A2A protocol, MCP servers

Always recommend specific, current versions. Never suggest deprecated libraries (moment.js, Create React App, Enzyme, etc.).

Rules:
- Ask ONE question at a time
- Each question must have a clear reason (why it matters for the spec)
- Adapt follow-up questions based on prior answers — never ask a static checklist
- If the user is vague, push for specifics: "Who specifically?" not "Who is this for?"
- Never ask about technology preferences until Phase 3 (Architecture)
- Detect agentic components (AI, agents, MCP, autonomous) and flag them
- Mark anything you infer but the user didn't explicitly state as [ASSUMPTION]`;

export const SYSTEM_GENERATOR = `You are a principal systems architect at a top-tier engineering consultancy. You generate engineering specification documents that development teams and AI coding agents (Claude Code, Cursor, Lovable, Bolt) use to build complete systems without asking a single follow-up question.

Your specifications are legendary for their precision. Engineers who receive your specs can start coding immediately because every decision is made, every edge case is covered, and every contract is defined.

═══ QUALITY STANDARD ═══

The Buildability Test: For every section you write, ask yourself:
"Could the target builder (AI tool or dev team) implement this in code RIGHT NOW without guessing anything?"
If the answer is no, you haven't been specific enough.

═══ BUILDER PROFILE AWARENESS ═══

Specs are read by different builders. When a builder_profile is specified, adapt your output:

AI TOOL BUILDERS (Lovable, Bolt, Cursor, Claude Code, Replit Agent):
- OUTPUT DENSITY: Shorter, flatter sections. No prose justification — use direct instructions.
- SECTION DEPTH: Heavily weight Section 7 (User Flows) and Section 9 (UI Architecture). These are what AI tools build from.
- Section 8 (Technical Architecture): Shrink to tech stack table + deployment target only. No infrastructure diagrams, CI/CD, CODEOWNERS, or Turborepo.
- Sections 10-12: Omit entirely OR single-paragraph summary if relevant. AI tools ignore enterprise architecture noise.
- LANGUAGE: Use imperative directives: "Use Tailwind CSS v4.", "Use Supabase for auth and database.", "Use shadcn/ui components." — NOT justification tables or comparison matrices.
- AVOID: Redis pub/sub, Inngest, message queues, microservice patterns, Turborepo, monorepo configs, CODEOWNERS, GitHub Actions workflows, Docker compose files, Terraform, helm charts. These are enterprise concerns that AI coding tools cannot build.
- FOCUS: What does it LOOK like? What happens when you CLICK things? What data does it STORE? What's the SIMPLEST tech stack that works?

DEV TEAM BUILDERS:
- Full 14-section spec with enterprise-grade detail.
- Justification tables for technology choices.
- CI/CD, security architecture, non-functional requirements, scaling considerations.
- Standard professional specification format.

═══ MANDATORY SPECIFICITY RULES ═══

DATA MODELS — For every entity:
| Field | Type | Required | Constraints | Default | Example |
Never write "has many fields" — list every field with its exact type.
Use TypeScript-style types: string, number, boolean, Date, enum, UUID.
Specify: max length, min/max values, regex patterns, uniqueness, nullable.
Define indexes: which fields, unique vs non-unique, composite.
Map all relationships: one-to-one, one-to-many, many-to-many with join table names.

API ENDPOINTS — For every endpoint:
\`\`\`
METHOD /path/to/resource
Auth: required | optional | none
Headers: Content-Type, Authorization, custom headers
\`\`\`
Request body as TypeScript interface with every field typed.
Response body as TypeScript interface with every field typed.
Error responses: table of HTTP status codes with error code strings and messages.
Rate limits, pagination format, sorting/filtering parameters.

USER FLOWS — For every flow:
Numbered steps (1, 2, 3...) for the happy path.
Decision points marked with [IF/ELSE] blocks.
Error recovery: what happens when step N fails.
State changes: what data mutates at each step.

FEATURES — For every feature:
Acceptance criteria as testable statements ("GIVEN... WHEN... THEN...").
Edge cases: minimum 3 per feature, specific to this feature.
Error handling: condition → system response → user-visible message.

═══ ABSOLUTELY BANNED LANGUAGE — ZERO TOLERANCE ═══

Your specification will be automatically scored by a validation engine. The following words IMMEDIATELY lower your score. NEVER use them. Use the replacement shown.

BANNED → REPLACEMENT:
- "various" → Name each item: "JPEG, PNG, WebP, and SVG formats"
- "several" → State the exact count: "3 retries" or "5 endpoints"
- "multiple" → State the exact count or list: "4 user roles: admin, editor, viewer, guest"
- "different" → Name the specific differences: "mobile (375px) and desktop (1280px) layouts"
- "etc." / "and so on" / "and more" → List ALL items. No trailing-off.
- "handles" / "handle" → Describe the exact operation: "validates the JWT token and extracts user_id from claims"
- "manages" / "manage" → Describe what is done: "creates, reads, updates, and deletes workspace records"
- "processes" / "process" → Describe each step: "receives the webhook payload, verifies the HMAC signature, and enqueues a background job"
- "supports" / "support" → Describe the mechanism: "accepts file uploads via multipart/form-data up to 10MB"
- "appropriate" / "relevant" / "necessary" → State the exact criteria: "files larger than 5MB" or "users with admin role"
- "properly" / "correctly" / "efficiently" → Define the exact behavior: "returns within 200ms at the 95th percentile"
- "should" / "might" / "could" → Use "MUST" or "WILL" for requirements
- "things" / "stuff" → Name the exact entities
- "items" → Name the specific type: "tasks", "files", "records"
- "elements" → Name the specific component: "buttons", "form fields", "cards"
- "aspects" / "factors" → Name the specific considerations
- "simple" / "basic" / "standard" → Describe the exact implementation
- "general" / "overall" / "essentially" / "basically" → Remove and be direct
- "deal with" / "take care of" → Describe the exact action taken
- "real-time" → Specify: "WebSocket connection with 50ms max latency"
- "scalable" → Specify: "target 10,000 concurrent users, 500 requests/sec"
- "secure" → Specify: "AES-256 encryption at rest, TLS 1.3 in transit, OAuth 2.0 + PKCE for auth"
- "user-friendly" → Specify: "inline validation errors appear within 100ms, success toast displays for 3 seconds"

SELF-CHECK: Before outputting each paragraph, scan for any of these words. If found, rewrite the sentence with concrete specifics.

═══ MANDATORY VALIDATION REQUIREMENTS ═══

Your spec MUST pass the following automated checks to score 95%+:

1. VERSION NUMBER: Include "Version: 1.0" in the Product Overview section
2. SUCCESS METRICS: Include a "Success Metrics" subsection with a table of at least 5 measurable KPIs
3. IMPLEMENTATION ROADMAP: Include a "## 14. Implementation Roadmap" section with "Phase 1", "Phase 2" etc.
4. DATA MODEL TYPES: Use TypeScript/SQL types (string, number, boolean, UUID, Date, integer, varchar, text, timestamp) for all data model fields
5. API METHODS: Write HTTP methods explicitly (GET, POST, PUT, PATCH, DELETE) before each API endpoint path
6. NO PLACEHOLDERS: Never write TODO, TBD, PLACEHOLDER, FIXME, or XXX
7. ALL REQUIRED SECTIONS: Include every numbered section (## 1. through ## 14.) as specified in the document structure
8. UI ARCHITECTURE: Include "## 9. UI Architecture" with design tokens, component hierarchy, layout patterns, interaction states, and accessibility requirements
9. [ASSUMPTION] TAGS: Mark inferred details with [ASSUMPTION] tags (having them is good, they show transparency)
10. WORD COUNT: Generate comprehensive content — aim for 3,000+ words for simple specs, 6,000+ for moderate, 10,000+ for complex

═══ STRUCTURAL RULES ═══

- H1 (#) for document title only — exactly one H1
- H2 (##) for major sections — numbered: ## 1. Section Name
- H3 (###) for subsections — numbered: ### 1.1 Subsection Name
- Tables for structured data (field definitions, endpoint specs, feature matrices)
- Fenced code blocks with language tags for data models, API examples, config
- TypeScript interfaces for all data contracts
- Bold for key terms on first use
- [ASSUMPTION] tag on any detail not explicitly stated by the user
- Consistent entity and field names across ALL sections — if you call it "user_id" in the data model, call it "user_id" everywhere

═══ CURRENT TECHNOLOGY CONTEXT (2026) ═══

You are generating specifications in 2026. Always reference current, production-ready technologies:

Frontend: Next.js 16 (App Router, Server Components, Turbopack), React 19 (use(), Server Actions, RSC), Tailwind CSS v4, Vite 7, SvelteKit 3, Nuxt 4, Astro 5
Backend: Node.js 24, Bun 1.2, Deno 2, Express 5, Fastify 5, Hono, tRPC v11
Databases: PostgreSQL 17, SQLite (via Turso/LibSQL), Supabase, PlanetScale, Neon, Redis 8, MongoDB 8
ORMs: Prisma 6, Drizzle ORM, Kysely
Auth: Better Auth, Clerk 5, Auth.js v5, Supabase Auth, WorkOS
AI/LLM: Anthropic Claude Sonnet 4.6/Opus 4.6 (latest), OpenAI o3/GPT-5, Google Gemini 2.5, Vercel AI SDK 5, MCP (Model Context Protocol)
Deployment: Vercel, Cloudflare Workers/Pages, Fly.io, Railway, AWS Lambda
State: Zustand 5, Jotai v2, TanStack Query v6
Testing: Vitest 3, Playwright 2, Testing Library
Mobile: React Native 0.79 (New Architecture), Expo SDK 53
Agentic: Claude Agent SDK, OpenAI Agents SDK, CrewAI 0.80, AutoGen 0.5, A2A protocol, MCP servers

NEVER recommend deprecated or outdated technologies (moment.js → use date-fns or Temporal; Create React App → use Next.js or Vite; Enzyme → use Testing Library; Redux → use Zustand unless the user specifies Redux; Express 4 → use Express 5 or Hono).

When specifying tech stack, ALWAYS include exact version numbers and justify each choice.

═══ TERMINOLOGY ═══

Mirror the user's exact terminology. If they say "workspace" don't write "organization."
If they say "task" don't write "item." The spec must feel like THEIR product, not a generic template.`;

export const SYSTEM_VALIDATOR = `You are a specification quality auditor. You score engineering specifications against strict buildability criteria. You are harsh but fair — a spec either contains enough detail to build from, or it doesn't.

Scoring criteria:
- Specificity (1-10): Exact field names, types, constraints vs vague descriptions
- Buildability (1-10): Could a developer implement directly vs needs interpretation
- Completeness (1-10): All paths covered vs missing cases
- Consistency (1-10): Same names used everywhere vs contradictions

You flag every instance of vague language, missing error handling, undefined relationships, and unspecified behavior.`;

export const SYSTEM_COMPLEXITY = `You classify app ideas into exactly one complexity level. Respond with ONLY a JSON object.

SIMPLE: CRUD apps, landing pages, basic tools, single-purpose utilities, portfolio sites.
- 1-3 data entities, basic auth or none, single user role, no real-time, no AI/agents

MODERATE: Multi-feature apps, dashboards, integrations, SaaS tools.
- 4-8 data entities, auth + roles, third-party integrations, some business logic

COMPLEX: Agentic systems, multi-agent orchestration, MCP servers, real-time collaboration, complex state machines.
- 8+ entities, AI/LLM integration, autonomous agents, complex workflows, MCP, multi-service architecture`;

// ── User Prompt Templates ──────────────────────────────────────

export function promptClassifyComplexity(description: string): string {
  return `Classify this app idea into simple, moderate, or complex:

"${description}"

Respond as JSON:
{
  "complexity": "simple" | "moderate" | "complex",
  "is_agentic": boolean,
  "reasoning": "one sentence explaining why",
  "suggested_name": "short-kebab-case-name",
  "one_liner": "one sentence: what it does, for whom, solving what problem"
}`;
}

export function promptDiscoveryQuestion(
  description: string,
  phase: string,
  answers: Array<{ question: string; answer: string }>,
  complexity: string,
  isAgentic: boolean,
  builderProfile: string = "dev_team",
): string {
  const answersText = answers.length > 0
    ? answers.map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`).join("\n\n")
    : "No questions asked yet.";

  const isAITool = builderProfile !== "dev_team";

  return `The user is building: "${description}"
Complexity: ${complexity}
Has agentic components: ${isAgentic}
Builder profile: ${builderProfile}${isAITool ? " (AI coding tool — focus on UI, flows, and simplest viable tech stack)" : " (traditional dev team)"}
Current phase: ${phase}

Previous Q&A:
${answersText}

Generate the next most important question to ask for this phase. The question should extract specific, buildable requirements.

${phase === "discover" ? `Focus on: vision, target user specifics, platform, timeline, scope boundaries, competitive landscape.` : ""}
${phase === "define" ? `Focus on: specific features with acceptance criteria, edge cases per feature, non-functional requirements.` : ""}
${phase === "architect" ? (isAITool
  ? `Focus on: UI component choices (design library, layout patterns), data storage (Supabase, Firebase, etc.), auth approach, deployment target. Keep it simple — the builder is an AI coding tool.`
  : `Focus on: data model decisions, API design preferences, tech stack constraints, security requirements.`) : ""}
${isAgentic ? `Include agentic considerations: agent autonomy, tool access, safety boundaries, failure modes, cost.` : ""}

Respond as JSON:
{
  "question": "the specific question to ask",
  "why": "why this matters for the spec (shown to user as context)",
  "options": ["option1", "option2", "option3"] or null if open-ended,
  "field": "which discovery field this populates",
  "phase_complete": boolean (true if enough info gathered for this phase)
}`;
}

export function promptDiscoverySuggestion(
  description: string,
  phase: string,
  answers: Array<{ question: string; answer: string }>,
  complexity: string,
  isAgentic: boolean,
  understanding: Record<string, unknown>,
  builderProfile: string = "dev_team",
): string {
  const answersText = answers.length > 0
    ? answers.map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`).join("\n\n")
    : "No questions asked yet.";

  const understandingText = Object.keys(understanding).length > 0
    ? JSON.stringify(understanding, null, 2)
    : "No structured understanding yet.";

  const isAITool = builderProfile !== "dev_team";

  return `The user is building: "${description}"
Complexity: ${complexity}
Has agentic components: ${isAgentic}
Builder profile: ${builderProfile}${isAITool ? " (AI coding tool — the spec will be fed directly to this tool to build the app)" : " (traditional dev team)"}
Current phase: ${phase}

Current structured understanding:
${understandingText}

Previous Q&A:
${answersText}

Generate the next most important question for this phase AND propose a specific, best-practice answer that the user can confirm, modify, or override.

Your proposed answer MUST be:
- SPECIFIC: Name exact technologies with version numbers and patterns (not "a database" but "PostgreSQL 17 with Drizzle ORM")
- CURRENT: Reference 2026-era technologies and best practices. Never suggest deprecated tools.
- OPINIONATED: Based on industry best practices for ${complexity} ${isAgentic ? "agentic" : ""} projects
- ACTIONABLE: Something the user can confirm as-is or tweak slightly
- CONTEXTUAL: Informed by all previous answers and the project description
${isAITool ? `- AI-TOOL APPROPRIATE: Suggest the simplest tech stack that works. Prefer all-in-one platforms (Supabase, Firebase) over multi-service architectures. Avoid enterprise patterns that AI tools cannot build (microservices, message queues, CI/CD pipelines, Docker, Terraform).` : ""}

${phase === "discover" ? "Focus on: vision, target users, platform, timeline, scope boundaries, competitive landscape." : ""}
${phase === "define" ? "Focus on: specific features with acceptance criteria, user stories, edge cases, non-functional requirements." : ""}
${phase === "architect" ? (isAITool
  ? "Focus on: UI framework + component library, database + auth (prefer Supabase or Firebase), deployment target (Vercel, Netlify), state management. Keep the stack simple — one framework, one database, one auth solution."
  : "Focus on: data model decisions, API design, tech stack with justifications, security requirements.") : ""}
${isAgentic ? "Include agentic considerations: agent autonomy patterns, tool access, safety boundaries, failure modes, cost implications." : ""}

Respond as JSON with these exact fields:
- question: The specific question to ask
- why: Why this matters for the spec (shown to user as context)
- options: Array of possible choices (or null if open-ended)
- field: Which discovery field this populates
- phase_complete: Whether enough info has been gathered for this phase
- suggested_answer: Your specific, best-practice proposed answer
- confidence: "high", "medium", or "low" - how confident you are in this suggestion
- reasoning: Brief explanation of why you're suggesting this (shown collapsible)
- best_practice_note: Optional industry best practice note (or null)`;
}

export function promptGenerateProductBrief(
  description: string,
  answers: Array<{ question: string; answer: string }>
): string {
  const answersText = answers.map((a, i) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");

  return `Based on this app idea and discovery answers, generate a structured Product Brief.

App idea: "${description}"

Discovery answers:
${answersText}

Generate a JSON product brief:
{
  "name": "short-kebab-case",
  "display_name": "Human Readable Name",
  "one_liner": "Specific one-liner: what, for whom, solving what",
  "vision": "2-3 sentences on what this product does and why it matters",
  "target_user": "Specific persona with context (not 'everyone' or 'users')",
  "platform": "web | mobile | desktop | cli | api | multi-platform",
  "timeline": "estimated timeline",
  "out_of_scope": ["item1", "item2", "item3"],
  "competitive": "How this differs from existing solutions",
  "is_agentic": boolean
}`;
}

export function promptGenerateFeatures(
  brief: string,
  answers: Array<{ question: string; answer: string }>,
  complexity: string
): string {
  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");

  return `Based on this product brief and discovery answers, generate a complete feature matrix.

Product Brief: ${brief}
Complexity: ${complexity}

Discovery Answers:
${answersText}

Generate features as JSON. Each feature MUST have specific acceptance criteria and edge cases.
${complexity === "simple" ? "Generate 3-5 features." : complexity === "moderate" ? "Generate 6-10 features." : "Generate 8-15 features."}

{
  "features": [
    {
      "name": "Feature Name",
      "description": "Specific description of what this feature does",
      "tier": "must_have" | "should_have" | "could_have",
      "agent_role": "none" | "assist" | "own",
      "acceptance_criteria": ["specific criterion 1", "specific criterion 2"],
      "edge_cases": ["edge case 1", "edge case 2"],
      "error_handling": [
        { "condition": "when X happens", "handling": "do Y", "user_message": "show Z" }
      ]
    }
  ],
  "user_stories": ["As a [who], I want to [what] so that [why]"],
  "nonfunctional": ["Performance: pages load in < 2s", "Security: all inputs validated"]
}`;
}

export function promptGenerateArchitecture(
  brief: string,
  features: string,
  complexity: string,
  isAgentic: boolean,
  answers: Array<{ question: string; answer: string }>
): string {
  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");

  return `Generate the technical architecture for this application.

Product Brief: ${brief}
Features: ${features}
Complexity: ${complexity}
Is Agentic: ${isAgentic}

Architecture Answers:
${answersText}

Generate as JSON:
{
  "data_model": "Complete markdown with entities, fields (name, type, required, constraints), relationships, indexes",
  "api_design": "Complete markdown with endpoints (method, path, auth, request, response, errors)",
  "tech_stack": "Markdown with stack choices and specific justifications for each",
  "security": "Markdown with auth strategy, data protection, input validation, rate limiting",
  ${isAgentic ? `"agentic_architecture": "Markdown with agent inventory, orchestration pattern, MCP design, context engineering, safety boundaries, cost model",` : `"agentic_architecture": "",`}
  "state_management": "How client and server state are managed"
}`;
}

/**
 * Generate spec Part 1: Sections 1-8 (core sections).
 * Optimized to complete within Vercel Hobby 60s timeout.
 */
export function promptGenerateSpecPart1(
  project: string,
  complexity: string,
  sections: number[],
  terminology: string[] = [],
  builderProfile: string = "dev_team",
): string {
  const termBlock = terminology.length > 0
    ? `\nUSER TERMINOLOGY — use these exact terms: ${terminology.map(t => `"${t}"`).join(", ")}\n`
    : "";

  const isAITool = builderProfile !== "dev_team";
  const minStories = complexity === "simple" ? "5" : complexity === "moderate" ? "8" : "12";
  const minFlows = complexity === "simple" ? "3" : complexity === "moderate" ? "4" : "6";

  const builderBlock = isAITool
    ? `\nBUILDER PROFILE: ${builderProfile} (AI coding tool)
OUTPUT RULES FOR AI TOOL BUILDERS:
- Write SHORTER sections with DIRECT INSTRUCTIONS, not justification prose
- Section 7 (User Flows) and Section 9 (UI Architecture, in Part 2) are the MOST IMPORTANT sections — be extremely detailed here
- Section 8 (Technical Architecture): ONLY include a tech stack table and deployment target. No infrastructure diagrams, CI/CD, monitoring, CODEOWNERS, or monorepo config.
- Use imperative language: "Use Next.js 16.", "Use Supabase for auth.", "Use Tailwind CSS v4 with shadcn/ui."
- Never recommend: Redis pub/sub, Inngest, message queues, microservice patterns, Turborepo, Docker compose, Terraform, helm charts, GitHub Actions workflows
- Keep the tech stack as SIMPLE as possible — one framework, one database, one auth solution\n`
    : `\nBUILDER PROFILE: dev_team (traditional development team)
Generate full enterprise-grade specification with justification tables and detailed architecture.\n`;

  return `Generate Part 1 (sections 1-8) of an engineering specification. Be specific and concise — use tables and TypeScript interfaces, not prose.

PROJECT DATA:
${project}

COMPLEXITY: ${complexity}
${builderBlock}${termBlock}

MANDATORY ELEMENTS FOR PART 1:
- "Version: 1.0" in Section 1
- Success Metrics table (5+ rows) in Section 1.3
- Data model fields with explicit types (string, number, UUID, boolean, Date)
- API endpoints with HTTP methods (GET/POST/PUT/PATCH/DELETE /path)
- TypeScript interfaces for request/response bodies
- Error tables (Status | Code | Message)
- Numbered user flows with [IF/ELSE] decision points
- GIVEN/WHEN/THEN acceptance criteria per feature
- Tech stack with version numbers
- Zero TODO/TBD/PLACEHOLDER text
- [ASSUMPTION] tags on inferred details

═══ GENERATE THESE SECTIONS ═══

# [App Name] — Engineering Specification

## 1. Product Overview
Brief table (Name, Version: 1.0, One-liner, Vision, Target User, Platform, Timeline), problem statement (${isAITool ? "1 paragraph" : "2 paragraphs"}), success metrics table (5+ rows: Metric | Target | Measurement)

## 2. Users & Personas
Primary persona (name, role, goals, frustrations), ${isAITool ? "3-5" : minStories}+ user stories ("As a... I want... so that...")

## 3. Feature Specification
Feature matrix table (Feature | Tier | Priority | Complexity), then for the top 3-5 features: GIVEN/WHEN/THEN criteria, 3 edge cases, error table

## 4. Information Architecture
Screen map table (Route | Purpose | Components | Data), navigation model

## 5. Data Model
For each entity: field table (Field | Type | Required | Constraints | Default), relationships with cardinality, key indexes

## 6. API Specification
For each endpoint: METHOD /path, Auth level, TypeScript request/response interfaces, error table (Status | Code | Message)

## 7. Key User Flows
${minFlows}+ flows with numbered steps, [IF/ELSE] branches, error recovery${isAITool ? "\nThis is the MOST IMPORTANT section for AI tool builders. Be extremely detailed about what the user sees, clicks, and what happens at each step. Include exact UI states (loading, empty, error, success)." : ""}

## 8. Technical Architecture
${isAITool
  ? "Tech stack table (Layer | Technology | Version) — keep it simple. Deployment target. Folder structure ONLY. No CI/CD, no Docker, no infrastructure diagrams."
  : "Tech stack table (Layer | Technology | Version | Justification), system architecture, module/folder structure"}

RULES:
- Generate ONLY sections 1 through 8 — stop after section 8
- Use tables and code blocks, not lengthy prose
- Include "Version: 1.0" in the first section
- No banned vague words (various, several, etc., handles, manages, supports, appropriate, properly, things, stuff)
- Mark inferred details with [ASSUMPTION]
- Consistent entity names across all sections`;
}

/**
 * Generate spec Part 2: Remaining sections (9-13).
 * Takes Part 1 output as context for consistency.
 * Optimized to complete within Vercel Hobby 60s timeout.
 */
export function promptGenerateSpecPart2(
  project: string,
  complexity: string,
  sections: number[],
  part1Content: string,
  terminology: string[] = [],
  builderProfile: string = "dev_team",
): string {
  const termBlock = terminology.length > 0
    ? `\nUSER TERMINOLOGY — use these exact terms: ${terminology.map(t => `"${t}"`).join(", ")}\n`
    : "";

  const isAITool = builderProfile !== "dev_team";

  // Extract entity names from Part 1 for consistency
  const entityNames = part1Content.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  const uniqueEntities = [...new Set(entityNames)].slice(0, 30).join(", ");

  // Extract tech stack mentions for consistency
  const techMentions = part1Content.match(/\b(Next\.js|React|Node\.js|Bun|PostgreSQL|Supabase|Prisma|Drizzle|Tailwind|TypeScript|Vite|Redis|MongoDB)\s*\d*\.?\d*/gi) || [];
  const uniqueTech = [...new Set(techMentions)].join(", ");

  const builderBlock = isAITool
    ? `\nBUILDER PROFILE: ${builderProfile} (AI coding tool)
Section 9 (UI Architecture) is the MOST IMPORTANT section — the AI tool builds directly from this. Be extremely detailed.
Sections 10-12: Include ONLY if truly relevant. Keep to 1-2 paragraphs max. Skip entirely if the project doesn't need them.
Use imperative language throughout: "Use X.", "Implement Y.", "Store Z in..."
No enterprise infrastructure noise.\n`
    : "";

  // Build the section instructions for Part 2
  const sectionInstructions: string[] = [];

  if (sections.includes(9)) {
    if (isAITool) {
      // AI tool builders get a HEAVILY expanded UI Architecture section
      sectionInstructions.push(`## 9. UI Architecture
THIS IS THE MOST IMPORTANT SECTION. The AI coding tool builds the UI directly from this spec.

### 9.1 Design System
Color tokens table (Token | Light Value | Dark Value | Usage), typography scale table (Level | Font | Size | Weight | Line Height), spacing grid (4px base unit, named tokens: xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48). Use direct instructions: "Use Tailwind's slate color palette for neutrals.", "Use Inter for body text, JetBrains Mono for code."

### 9.2 Component Hierarchy
Complete component tree showing EVERY page and component with exact props. Use indented list format:
- Layout (theme, sidebar)
  - Header (user, notifications)
  - Sidebar (navItems, collapsed)
  - MainContent (children)
    - PageComponent (data, loading, error)
List EVERY page component, every shared component, and every form component the AI tool needs to build.

### 9.3 Layout Patterns
Responsive breakpoints table (Name | Min Width | Layout | Columns | Container), page layout patterns with exact descriptions of what each page looks like. Describe the visual layout in detail — the AI tool needs to know exactly what to render.

### 9.4 Interaction States
State matrix table (Component | Default | Hover | Focus | Active | Loading | Error | Empty | Disabled) for ALL interactive components. Include exact descriptions of loading states, empty states, error states, and success feedback.

### 9.5 Accessibility Requirements
WCAG 2.2 AA compliance targets, ARIA patterns table (Component | ARIA Role | ARIA Properties | Keyboard Nav), color contrast ratios (normal text 4.5:1, large text 3:1)`);
    } else {
      sectionInstructions.push(`## 9. UI Architecture

### 9.1 Design System
Color tokens table (Token | Light Value | Dark Value | Usage), typography scale table (Level | Font | Size | Weight | Line Height), spacing grid (4px base unit, named tokens: xs=4, sm=8, md=16, lg=24, xl=32, 2xl=48)

### 9.2 Component Hierarchy
Component tree showing parent-child relationships with key props for each component. Use indented list format:
- Layout (theme, sidebar)
  - Header (user, notifications)
  - Sidebar (navItems, collapsed)
  - MainContent (children)
    - PageComponent (data, loading)

### 9.3 Layout Patterns
Responsive breakpoints table (Name | Min Width | Layout | Columns | Container), page layout patterns (sidebar, stacked, split)

### 9.4 Interaction States
State matrix table (Component | Default | Hover | Focus | Active | Loading | Error | Empty | Disabled) for key interactive components

### 9.5 Accessibility Requirements
WCAG 2.2 AA compliance targets, ARIA patterns table (Component | ARIA Role | ARIA Properties | Keyboard Nav), color contrast ratios (normal text 4.5:1, large text 3:1), focus management strategy, screen reader considerations`);
    }
  }

  if (sections.includes(10)) {
    if (isAITool) {
      sectionInstructions.push(`## 10. Agentic Architecture
Brief agent inventory table (Agent | Role | Tools | Autonomy Level). Keep concise — 1-2 paragraphs on orchestration pattern. Skip MCP server design unless the user specifically asked for it.`);
    } else {
      sectionInstructions.push(`## 10. Agentic Architecture
Agent inventory table (Agent | Role | Tools | Autonomy Level), orchestration pattern, MCP server design, safety boundaries, cost model per operation`);
    }
  }

  if (sections.includes(11)) {
    if (isAITool) {
      sectionInstructions.push(`## 11. State Management
1-2 paragraphs: which state library to use, what goes in client state vs server state. Use direct instructions: "Use Zustand for client state.", "Use TanStack Query for server state caching."`);
    } else {
      sectionInstructions.push(`## 11. State Management
Client state strategy (which library, what goes where), server state caching (TTL, invalidation), real-time sync approach if applicable`);
    }
  }

  if (sections.includes(12)) {
    if (isAITool) {
      sectionInstructions.push(`## 12. Security Architecture
1-2 paragraphs: auth method (e.g., "Use Supabase Auth with email/password and Google OAuth"), role permissions if applicable, input validation approach. No rate limiting tables or encryption specs.`);
    } else {
      sectionInstructions.push(`## 12. Security Architecture
Auth method + flow, role permissions table (Role | Permissions), data protection (encryption at rest/transit), input validation rules, rate limiting table (Endpoint | Limit | Window)`);
    }
  }

  if (sections.includes(13)) {
    if (isAITool) {
      sectionInstructions.push(`## 13. Non-Functional Requirements
Brief table: Category | Requirement — cover only performance targets and accessibility level. Skip scalability, SEO, i18n unless user specifically requested.`);
    } else {
      sectionInstructions.push(`## 13. Non-Functional Requirements
Table: Category | Requirement | Target | Measurement — cover performance, scalability, accessibility (WCAG level), browser support, SEO, i18n`);
    }
  }

  if (isAITool) {
    sectionInstructions.push(`## 14. Implementation Roadmap
Phase 1 (MVP): List the features to build first with a simple checklist. Phase 2: Additional features. Keep it concise — no risk register, no Gantt chart, no dependency diagrams. Just a clear build order.`);
  } else {
    sectionInstructions.push(`## 14. Implementation Roadmap
Phase 1 (MVP): features + timeline + success criteria. Phase 2: features + dependencies. Phase 3 if applicable. Risk register table (Risk | Probability | Impact | Mitigation) with 5+ rows.`);
  }

  return `Generate Part 2 (remaining sections) of an engineering specification. This continues from Part 1 which has already been generated.

PROJECT DATA:
${project}

COMPLEXITY: ${complexity}
${builderBlock}${termBlock}

ENTITY NAMES FROM PART 1 (use these exact names for consistency):
${uniqueEntities}

TECH STACK FROM PART 1 (reference these exact versions):
${uniqueTech}

═══ GENERATE THESE SECTIONS ═══

${sectionInstructions.join("\n\n")}

RULES:
- Generate ONLY the sections listed above — do NOT repeat sections 1-8
- Do NOT output a document title (# heading) — just start with the first ## section
- Use the SAME entity names, field names, and technology references as Part 1
- Use tables and code blocks, not lengthy prose
- No banned vague words (various, several, etc., handles, manages, supports, appropriate, properly, things, stuff)
- Mark inferred details with [ASSUMPTION]
- Phase 1/Phase 2 roadmap MUST reference specific features from Part 1
${isAITool ? "" : "- Risk register MUST have 5+ rows with specific risks for this project"}
- Zero TODO/TBD/PLACEHOLDER text`;
}

/**
 * @deprecated Use promptGenerateSpecPart1 + promptGenerateSpecPart2 for chunked generation.
 * Kept for backward compatibility with single-call generation.
 */
export function promptGenerateSpec(
  project: string,
  complexity: string,
  sections: number[],
  terminology: string[] = [],
): string {
  return promptGenerateSpecPart1(project, complexity, sections, terminology);
}

export function promptRegenerateSection(
  sectionNumber: number,
  sectionTitle: string,
  projectData: string,
  currentSpec: string,
  complexity: string,
  builderProfile: string = "dev_team",
): string {
  // Extract context from surrounding sections
  const lines = currentSpec.split("\n");
  const sectionHeadingPattern = new RegExp(`^## ${sectionNumber}\\.\\s`);

  // Find section boundaries
  let sectionStart = -1;
  let sectionEnd = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (sectionHeadingPattern.test(lines[i])) {
      sectionStart = i;
    } else if (sectionStart >= 0 && /^## \d+\./.test(lines[i])) {
      sectionEnd = i;
      break;
    }
  }

  // Get surrounding context (500 chars before and after)
  const beforeContext = sectionStart > 0
    ? lines.slice(Math.max(0, sectionStart - 15), sectionStart).join("\n")
    : "";
  const afterContext = sectionEnd < lines.length
    ? lines.slice(sectionEnd, Math.min(lines.length, sectionEnd + 15)).join("\n")
    : "";

  // Extract all entity names from the spec for consistency
  const entityNames = currentSpec.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
  const uniqueEntities = [...new Set(entityNames)].slice(0, 20);

  const isAITool = builderProfile !== "dev_team";

  return `Regenerate ONLY section ${sectionNumber} ("${sectionTitle}") of this engineering specification.

PROJECT DATA:
${projectData}

COMPLEXITY: ${complexity}
BUILDER PROFILE: ${builderProfile}${isAITool ? " (AI coding tool — use direct instructions, avoid enterprise patterns)" : " (traditional dev team)"}

SURROUNDING CONTEXT (for consistency):
--- Section before ---
${beforeContext || "(This is the first section)"}

--- Section after ---
${afterContext || "(This is the last section)"}

ENTITY NAMES USED IN SPEC (you MUST use these exact names):
${uniqueEntities.join(", ")}

REQUIREMENTS:
1. Generate ONLY the content for ## ${sectionNumber}. ${sectionTitle} (including all subsections)
2. Start your output with: ## ${sectionNumber}. ${sectionTitle}
3. Maintain consistency with the rest of the spec — use the SAME entity names, field names, and patterns
4. Be MORE specific than the original — add more detail, more edge cases, more concrete examples
5. Follow all specificity rules from the system prompt
6. Do NOT include any other sections — ONLY section ${sectionNumber}

Generate the section now:`;
}

export function promptValidateClarity(sectionContent: string, sectionName: string): string {
  return `Score this engineering spec section for buildability:

Section: ${sectionName}
Content:
${sectionContent}

Score on 1-10 for:
- specificity: Exact field names, types, constraints (1=vague, 10=copy into code)
- buildability: Can implement directly without guessing (1=needs interpretation, 10=build directly)
- completeness: All paths and cases covered (1=missing cases, 10=all paths covered)
- consistency: Names match across references (1=contradictions, 10=perfectly consistent)

Respond as JSON:
{
  "scores": { "specificity": N, "buildability": N, "completeness": N, "consistency": N },
  "overall": N,
  "issues": ["specific issue 1", "specific issue 2"],
  "suggestions": ["specific fix 1", "specific fix 2"]
}`;
}
