// ═══════════════════════════════════════════════════════════════
// Skill Forge — Adaptive Discovery Depth
// Controls question count per phase based on project complexity.
// Guardrails ensure the LLM doesn't over-ask or under-ask.
// ═══════════════════════════════════════════════════════════════

import { COMPLEXITY_CONFIG } from "@/lib/constants";
import type { Complexity } from "@/lib/types";

const DISCOVERY_PHASE_COUNT = 3; // discover, define, architect

export interface DepthConfig {
  minQuestionsPerPhase: number;
  maxQuestionsPerPhase: number;
  totalMin: number;
  totalMax: number;
}

export function getDepthConfig(complexity: Complexity): DepthConfig {
  const config = COMPLEXITY_CONFIG[complexity];
  return {
    minQuestionsPerPhase: Math.ceil(config.questions.min / DISCOVERY_PHASE_COUNT),
    maxQuestionsPerPhase: Math.ceil(config.questions.max / DISCOVERY_PHASE_COUNT),
    totalMin: config.questions.min,
    totalMax: config.questions.max,
  };
}

export function shouldPhaseComplete(
  complexity: Complexity,
  questionsAskedInPhase: number,
  llmSaysComplete: boolean,
): "continue" | "complete" | "force_complete" {
  const depth = getDepthConfig(complexity);

  if (questionsAskedInPhase < depth.minQuestionsPerPhase) {
    return "continue";
  }

  if (questionsAskedInPhase >= depth.maxQuestionsPerPhase) {
    return "force_complete";
  }

  return llmSaysComplete ? "complete" : "continue";
}
