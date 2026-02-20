// SkillSpec and related types — ported from Python Pydantic models

export interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
  constraints?: Record<string, unknown>;
}

export interface Capability {
  name: string;
  description: string;
  required?: boolean;
  deterministic?: boolean;
  parameters?: Parameter[];
  examples?: string[];
  error_modes?: string[];
}

export interface Example {
  name?: string;
  description?: string;
  input: string | Record<string, unknown>;
  expected_output: string | Record<string, unknown>;
  notes?: string;
}

export interface ErrorSpec {
  condition: string;
  handling: string;
  user_message?: string;
}

export interface InputSpec {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface OutputSpec {
  name: string;
  type: string;
  description: string;
}

export interface SkillSpec {
  name: string;
  display_name?: string;
  version: string;
  description: string;
  complexity?: "simple" | "moderate" | "complex";
  author?: string;
  problem_statement?: string;
  target_user?: string;
  trigger_patterns?: string[];
  capabilities: Capability[];
  inputs?: InputSpec[];
  outputs?: OutputSpec[];
  examples?: Example[];
  edge_cases?: string[];
  error_handling?: ErrorSpec[];
  safety_boundaries?: string[];
  target_frameworks?: string[];
  dependencies?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// Validation types

export interface Remediation {
  severity: "error" | "warning" | "info";
  message: string;
  tollgate: number;
  location?: string;
  suggested_fix?: string;
  auto_fixable: boolean;
}

export interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

export interface TollgateResult {
  tollgate_number: number;
  name: string;
  passed: boolean;
  score: number;
  checks: Check[];
  passed_count: number;
  failed_count: number;
  remediations: Remediation[];
}

export interface ValidationReport {
  skill_name: string;
  skill_version?: string;
  overall_score: number;
  grade: string;
  passed: boolean;
  tollgate_results: TollgateResult[];
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  remediations: Remediation[];
}

// Generator output types

export interface GeneratedFile {
  filename: string;
  content: string;
  framework: string;
  type: string;
}

// Empty spec for wizard initialization
export function createEmptySpec(): SkillSpec {
  return {
    name: "",
    version: "1.0.0",
    description: "",
    complexity: "moderate",
    author: "",
    capabilities: [],
    target_frameworks: ["claude"],
    examples: [],
    edge_cases: [],
    error_handling: [],
    safety_boundaries: [],
    inputs: [],
    outputs: [],
    tags: [],
  };
}
