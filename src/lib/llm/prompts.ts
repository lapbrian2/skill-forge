// ═══════════════════════════════════════════════════════════════
// Skill Forge — LLM Prompt Templates
// ALL prompts live here. Never inline a prompt in a component
// or route handler. Named, auditable, versionable.
// ═══════════════════════════════════════════════════════════════

// ── System Prompts ─────────────────────────────────────────────

export const SYSTEM_DISCOVERY = `You are an engineering specification consultant working for Skill Forge. Your job is to extract precise, buildable requirements from app ideas through structured questioning.

You follow the LSSBB tollgate methodology: every question you ask must extract information that directly contributes to a buildable engineering specification. No small talk. No vague questions. Every question earns its place.

You are a systems thinker. You think about data models, API contracts, state management, user flows, edge cases, error handling, and security from the first question.

Rules:
- Ask ONE question at a time
- Each question must have a clear reason (why it matters for the spec)
- Adapt follow-up questions based on prior answers — never ask a static checklist
- If the user is vague, push for specifics: "Who specifically?" not "Who is this for?"
- Never ask about technology preferences until Phase 3 (Architecture)
- Detect agentic components (AI, agents, MCP, autonomous) and flag them
- Mark anything you infer but the user didn't explicitly state as [ASSUMPTION]`;

export const SYSTEM_GENERATOR = `You are a senior systems architect generating an engineering specification document. You produce the exact level of detail needed for a developer or AI coding agent to build the described system without ambiguity.

Rules:
- Be specific: name exact field types, endpoint paths, error codes, state transitions
- No weasel words: never use "various", "etc.", "handles", "manages", "appropriate", "properly"
- Every feature must have: acceptance criteria, error handling, and edge cases
- Data models must include: fields, types, constraints, relationships, indexes
- API endpoints must include: method, path, auth, request body, response contract, error codes
- User flows must include: numbered steps, happy path, error paths
- Mark any assumptions as [ASSUMPTION]
- Use consistent entity and field names across ALL sections
- Format as clean, well-structured Markdown with proper heading hierarchy`;

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
  isAgentic: boolean
): string {
  const answersText = answers.length > 0
    ? answers.map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`).join("\n\n")
    : "No questions asked yet.";

  return `The user is building: "${description}"
Complexity: ${complexity}
Has agentic components: ${isAgentic}
Current phase: ${phase}

Previous Q&A:
${answersText}

Generate the next most important question to ask for this phase. The question should extract specific, buildable requirements.

${phase === "discover" ? `Focus on: vision, target user specifics, platform, timeline, scope boundaries, competitive landscape.` : ""}
${phase === "define" ? `Focus on: specific features with acceptance criteria, edge cases per feature, non-functional requirements.` : ""}
${phase === "architect" ? `Focus on: data model decisions, API design preferences, tech stack constraints, security requirements.` : ""}
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

export function promptGenerateSpec(
  project: string,
  complexity: string,
  sections: number[]
): string {
  return `Generate a complete engineering specification document for this project.

PROJECT DATA:
${project}

COMPLEXITY: ${complexity}
SECTIONS TO GENERATE: ${sections.join(", ")}

Generate the FULL specification as a single Markdown document. Follow this exact section structure:

# [App Name] — Engineering Specification

## 1. Product Overview
### 1.1 Product Brief (table format)
### 1.2 Problem Statement
### 1.3 Success Metrics (table format)

## 2. Users & Personas
### 2.1 Primary Persona
### 2.2 User Stories

## 3. Feature Specification
### 3.1 Feature Matrix (table format)
### 3.2 Detailed Feature Descriptions (per feature: What, Why, Acceptance Criteria, Edge Cases, Error Handling)

## 4. Information Architecture
### 4.1 Screen Map / Sitemap
### 4.2 Navigation Model

## 5. Data Model (per entity: fields, types, constraints, relationships, indexes)

## 6. API Specification (per endpoint: method, path, auth, request, response, errors)

## 7. Key User Flows (numbered steps, happy path + error paths)

## 8. Technical Architecture
### 8.1 Tech Stack (with justifications)
### 8.2 System Architecture (text diagram)
### 8.3 Module Structure

${sections.includes(9) ? `## 9. Agentic Architecture
### 9.1 Agent Inventory
### 9.2 Orchestration Pattern
### 9.3 MCP Design
### 9.4 Context Engineering
### 9.5 Safety Boundaries
### 9.6 Agent Cost Model` : ""}

${sections.includes(10) ? `## 10. State Management` : ""}
${sections.includes(11) ? `## 11. Security Architecture` : ""}
${sections.includes(12) ? `## 12. Non-Functional Requirements` : ""}

## 13. Implementation Roadmap (phased with clear MVP boundary, risks, dependencies)

RULES:
- Be EXTREMELY specific. Name exact fields, types, endpoints, error codes.
- NO weasel words: "various", "etc.", "handles", "manages", "appropriate"
- Every feature has acceptance criteria AND error handling
- Data models have fields with types AND constraints
- APIs have full request/response contracts
- User flows have numbered steps with error paths
- Mark assumptions as [ASSUMPTION]
- This document must be detailed enough that a developer or Claude Code can build from it with ZERO ambiguity`;
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
