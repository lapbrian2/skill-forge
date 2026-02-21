// ═══════════════════════════════════════════════════════════════
// Skill Forge — Per-Task Model Configuration
// Maps each LLM task type to the appropriate model,
// token limit, and temperature for cost/quality optimization.
// ═══════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────

export type TaskType =
  | "classify"
  | "question"
  | "brief"
  | "features"
  | "architecture"
  | "generate"
  | "validate";

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

// ── Model Configuration Map ───────────────────────────────────
// Haiku for fast, cheap tasks (classification, validation scoring)
// Sonnet for quality-critical tasks (discovery, generation)

export const MODEL_CONFIG: Record<TaskType, ModelConfig> = {
  classify: {
    model: "claude-haiku-4-5",
    maxTokens: 1024,
    temperature: 0.3,
  },
  question: {
    model: "claude-sonnet-4-6",
    maxTokens: 2048,
    temperature: 0.7,
  },
  brief: {
    model: "claude-sonnet-4-6",
    maxTokens: 4096,
    temperature: 0.5,
  },
  features: {
    model: "claude-sonnet-4-6",
    maxTokens: 8192,
    temperature: 0.6,
  },
  architecture: {
    model: "claude-sonnet-4-6",
    maxTokens: 8192,
    temperature: 0.5,
  },
  generate: {
    model: "claude-sonnet-4-6",
    maxTokens: 32768,
    temperature: 0.5,
  },
  validate: {
    model: "claude-haiku-4-5",
    maxTokens: 2048,
    temperature: 0.2,
  },
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Get model configuration for a given task type.
 * Ensures every LLM call uses the optimal model/settings.
 */
export function getModelConfig(task: TaskType): ModelConfig {
  return MODEL_CONFIG[task];
}
