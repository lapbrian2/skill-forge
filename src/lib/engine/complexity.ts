// ═══════════════════════════════════════════════════════════════
// Skill Forge — Complexity Detection Engine
// Client-side heuristic + server-side LLM classification
// ═══════════════════════════════════════════════════════════════

import type { Complexity } from "../types";
import { AGENTIC_KEYWORDS } from "../constants";

/**
 * Quick client-side heuristic for complexity classification.
 * Used for instant feedback before the LLM classification returns.
 */
export function quickClassify(description: string): {
  complexity: Complexity;
  is_agentic: boolean;
  confidence: number;
} {
  const lower = description.toLowerCase();
  const words = lower.split(/\s+/);
  const wordCount = words.length;

  // Agentic detection
  const is_agentic = AGENTIC_KEYWORDS.some(kw => lower.includes(kw));

  // Complexity signals
  const complexSignals = [
    "multi-agent", "orchestrat", "real-time", "realtime", "pipeline",
    "workflow engine", "distributed", "microservice", "event-driven",
    "machine learning", "autonomous", "state machine", "complex",
  ];
  const moderateSignals = [
    "dashboard", "admin", "integration", "third-party", "auth",
    "roles", "permissions", "notification", "search", "filter",
    "analytics", "report", "import", "export", "webhook",
    "payment", "subscription", "team", "collaboration",
  ];
  const simpleSignals = [
    "todo", "crud", "landing", "portfolio", "blog", "calculator",
    "converter", "timer", "counter", "form", "survey", "quiz",
    "single page", "simple", "basic", "just a",
  ];

  const complexScore = complexSignals.filter(s => lower.includes(s)).length;
  const moderateScore = moderateSignals.filter(s => lower.includes(s)).length;
  const simpleScore = simpleSignals.filter(s => lower.includes(s)).length;

  // Agentic automatically bumps to complex
  if (is_agentic) {
    return { complexity: "complex", is_agentic, confidence: 0.8 };
  }

  if (complexScore >= 2 || (complexScore >= 1 && wordCount > 50)) {
    return { complexity: "complex", is_agentic, confidence: 0.7 };
  }

  if (simpleScore >= 2 || (simpleScore >= 1 && wordCount < 20)) {
    return { complexity: "simple", is_agentic, confidence: 0.7 };
  }

  if (moderateScore >= 2) {
    return { complexity: "moderate", is_agentic, confidence: 0.7 };
  }

  // Default to moderate if unclear
  const confidence = wordCount < 10 ? 0.4 : 0.5;
  return { complexity: "moderate", is_agentic, confidence };
}
