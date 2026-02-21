// ═══════════════════════════════════════════════════════════════
// Skill Forge — Core Data Model
// Version 2.0 — Engineering Specification Generator
// ═══════════════════════════════════════════════════════════════

// ── Project: The top-level entity ──────────────────────────────

export type Complexity = "simple" | "moderate" | "complex";
export type Phase = "discover" | "define" | "architect" | "specify" | "deliver";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type FeatureTier = "must_have" | "should_have" | "could_have";
export type AgentRole = "none" | "assist" | "own";

export interface Project {
  id: string;
  name: string;
  one_liner: string;
  initial_description: string;
  complexity: Complexity;
  current_phase: Phase;
  is_agentic: boolean;
  created_at: string; // ISO 8601
  updated_at: string;
  discovery: DiscoveryData;
  spec: GeneratedSpec | null;
  validation: ValidationReport | null;
  token_usage: TokenUsageEntry[];
}

// ── Discovery Data: structured answers from interview ──────────

export interface DiscoveryData {
  // Phase 1: Discover
  phase1: {
    vision: string;
    target_user: string;
    platform: string;
    timeline: string;
    out_of_scope: string[];
    competitive: string;
    agentic_notes: string;
    complete: boolean;
  };
  // Phase 2: Define
  phase2: {
    features: Feature[];
    user_stories: string[];
    nonfunctional: string[];
    complete: boolean;
  };
  // Phase 3: Architect
  phase3: {
    data_model: string; // LLM-generated markdown
    api_design: string; // LLM-generated markdown
    tech_stack: string; // LLM-generated markdown
    security: string;   // LLM-generated markdown
    agentic_architecture: string; // LLM-generated markdown (if agentic)
    complete: boolean;
  };
  // Raw Q&A log
  answers: QAEntry[];
  // Tollgate statuses
  tollgate_1_passed: boolean;
  tollgate_2_passed: boolean;
  tollgate_3_passed: boolean;
  // Chat-format message history (optional for backward compat)
  chat_messages?: ChatMessage[];
  // AI's structured understanding object (DISC-05)
  understanding?: Record<string, unknown>;
}

export interface QAEntry {
  id: string;
  phase: Phase;
  question: string;
  answer: string;
  timestamp: string;
}

// ── Chat Messages ─────────────────────────────────────────────

export type ChatMessageRole = "ai" | "user" | "system";
export type ChatMessageType =
  | "question"
  | "suggestion"
  | "user_response"
  | "phase_summary"
  | "thinking";

export interface AISuggestion {
  proposed_answer: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  best_practice_note: string | null;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  type: ChatMessageType;
  content: string;
  phase: Phase;
  field: string;
  why?: string;
  suggestion?: AISuggestion;
  user_action?: "accept" | "edit" | "override";
  timestamp: string;
}

// ── Feature: individual feature within the spec ────────────────

export interface Feature {
  id: string;
  name: string;
  description: string;
  tier: FeatureTier;
  agent_role: AgentRole;
  acceptance_criteria: string[];
  edge_cases: string[];
  error_handling: ErrorHandler[];
}

export interface ErrorHandler {
  condition: string;
  handling: string;
  user_message: string;
}

// ── Generated Spec: the final output document ──────────────────

export interface GeneratedSpec {
  project_id: string;
  version: string;
  markdown_content: string;
  section_count: number;
  word_count: number;
  generated_at: string;
}

// ── Validation Report ──────────────────────────────────────────

export interface ValidationReport {
  project_id: string;
  spec_version: string;
  timestamp: string;
  tollgate_4: TollgateResult;
  tollgate_5: TollgateResult;
  overall_score: number;
  grade: Grade;
  remediations: Remediation[];
  passed: boolean;
}

export interface TollgateResult {
  name: string;
  checks: Check[];
  passed_count: number;
  failed_count: number;
  score: number;
}

export interface Check {
  id: string;
  description: string;
  passed: boolean;
  details?: string;
}

export interface Remediation {
  tollgate: number;
  severity: "critical" | "warning" | "info";
  section: string;
  message: string;
  auto_fixable: boolean;
}

// ── Token Usage ───────────────────────────────────────────────
// NOTE: Existing localStorage projects may lack token_usage.
// Consumers should default to []

export interface TokenUsageEntry {
  task: string;           // e.g., "classify", "question", "generate"
  model: string;          // e.g., "claude-haiku-4-5"
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  timestamp: string;      // ISO 8601
}

// ── LLM Types ──────────────────────────────────────────────────

export interface DiscoveryQuestion {
  id: string;
  question: string;
  why: string;
  options: string[] | null;
  phase: Phase;
  required: boolean;
}

export interface LLMResponse<T> {
  data: T;
  tokens_used: number;
  model: string;
  latency_ms: number;
}

// ── Factory Functions ──────────────────────────────────────────

export function createProject(description: string, complexity: Complexity = "moderate"): Project {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id,
    name: "",
    one_liner: "",
    initial_description: description,
    complexity,
    current_phase: "discover",
    is_agentic: false,
    created_at: now,
    updated_at: now,
    discovery: createDiscoveryData(),
    spec: null,
    validation: null,
    token_usage: [],
  };
}

export function createDiscoveryData(): DiscoveryData {
  return {
    phase1: {
      vision: "",
      target_user: "",
      platform: "",
      timeline: "",
      out_of_scope: [],
      competitive: "",
      agentic_notes: "",
      complete: false,
    },
    phase2: {
      features: [],
      user_stories: [],
      nonfunctional: [],
      complete: false,
    },
    phase3: {
      data_model: "",
      api_design: "",
      tech_stack: "",
      security: "",
      agentic_architecture: "",
      complete: false,
    },
    answers: [],
    tollgate_1_passed: false,
    tollgate_2_passed: false,
    tollgate_3_passed: false,
  };
}

export function createFeature(): Feature {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    tier: "must_have",
    agent_role: "none",
    acceptance_criteria: [],
    edge_cases: [],
    error_handling: [],
  };
}
