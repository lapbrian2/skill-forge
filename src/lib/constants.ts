// ═══════════════════════════════════════════════════════════════
// Skill Forge — Constants
// ═══════════════════════════════════════════════════════════════

// ── Weasel Words ───────────────────────────────────────────────
// Flagged during Tollgate 4 clarity checks. These indicate vague,
// non-buildable language that must be replaced with specifics.

// High-confidence vague words. These are almost always symptoms of
// hand-waving rather than specification. Common technical terms like
// "items", "elements" are excluded since they appear in legitimate contexts
// (e.g. "form elements", "list items", "DOM elements").
export const WEASEL_WORDS = [
  "various", "etc", "and so on", "and more",
  "deal with", "take care of",
  "several", "appropriate", "relevant",
  "necessary", "basically", "essentially",
  "properly", "correctly", "things", "stuff",
  "aspects", "factors",
];

// ── Validation Thresholds ──────────────────────────────────────

export const TOLLGATE_WEIGHTS = {
  tollgate_4: 0.60, // Completeness is king
  tollgate_5: 0.40, // Production readiness
};

export const GRADE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
  F: 0,
};

export function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= GRADE_THRESHOLDS.A) return "A";
  if (score >= GRADE_THRESHOLDS.B) return "B";
  if (score >= GRADE_THRESHOLDS.C) return "C";
  if (score >= GRADE_THRESHOLDS.D) return "D";
  return "F";
}

// ── Phase Metadata ─────────────────────────────────────────────

export const PHASES = [
  { id: "discover", label: "Discover", number: 1, description: "Clarify the problem space" },
  { id: "define", label: "Define", number: 2, description: "Scope features & requirements" },
  { id: "architect", label: "Architect", number: 3, description: "Design systems & structure" },
  { id: "specify", label: "Specify", number: 4, description: "Generate the full spec" },
  { id: "deliver", label: "Deliver", number: 5, description: "Output the spec" },
] as const;

// ── Complexity ─────────────────────────────────────────────────

export const COMPLEXITY_CONFIG = {
  simple: {
    label: "Simple",
    questions: { min: 3, max: 5 },
    specPages: { min: 2, max: 4 },
    sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14],
    description: "CRUD apps, landing pages, basic tools",
  },
  moderate: {
    label: "Moderate",
    questions: { min: 8, max: 12 },
    specPages: { min: 6, max: 12 },
    sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14],
    description: "Multi-feature apps, dashboards, integrations",
  },
  complex: {
    label: "Complex",
    questions: { min: 15, max: 20 },
    specPages: { min: 12, max: 25 },
    sections: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    description: "Agentic systems, multi-agent, MCP, real-time",
  },
} as const;

// ── Agentic Detection Keywords ─────────────────────────────────

export const AGENTIC_KEYWORDS = [
  "agent", "agents", "llm", "ai", "mcp", "autonomous", "multi-agent",
  "claude", "tool use", "tool_use", "agentic", "orchestrat",
  "crew", "langchain", "autogen", "a2a", "react loop",
  "plan and execute", "reflection", "context window",
];

// ── Section Map ────────────────────────────────────────────────

export const SPEC_SECTIONS = [
  { number: 1, title: "Product Overview", required: true },
  { number: 2, title: "Users & Personas", required: true },
  { number: 3, title: "Feature Specification", required: true },
  { number: 4, title: "Information Architecture", required: true },
  { number: 5, title: "Data Model", required: true },
  { number: 6, title: "API Specification", required: true },
  { number: 7, title: "Key User Flows", required: true },
  { number: 8, title: "Technical Architecture", required: true },
  { number: 9, title: "UI Architecture", required: true },
  { number: 10, title: "Agentic Architecture", required: false },
  { number: 11, title: "State Management", required: false },
  { number: 12, title: "Security Architecture", required: false },
  { number: 13, title: "Non-Functional Requirements", required: false },
  { number: 14, title: "Implementation Roadmap", required: true },
];

// ── LLM Config ─────────────────────────────────────────────────
// DEPRECATED: Use MODEL_CONFIG from src/lib/llm/models.ts instead.
// These constants are kept for backward compatibility with deprecated
// llmCall() and llmCallJSON() functions during migration.

export const LLM_MODEL = "claude-sonnet-4-6";
export const LLM_MAX_TOKENS = 4096;
export const LLM_TEMPERATURE = 0.7;
