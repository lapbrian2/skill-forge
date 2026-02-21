// ═══════════════════════════════════════════════════════════════
// Skill Forge — LLM Output Schemas
// Zod v4 schemas for all structured LLM outputs.
// Used with zodOutputFormat() for validated structured generation.
// ═══════════════════════════════════════════════════════════════

import { z } from "zod";

// ── Classification Schema ─────────────────────────────────────

export const ClassificationSchema = z.object({
  complexity: z.enum(["simple", "moderate", "complex"]),
  is_agentic: z.boolean(),
  reasoning: z.string(),
  suggested_name: z.string(),
  one_liner: z.string(),
});

export type ClassificationOutput = z.infer<typeof ClassificationSchema>;

// ── Discovery Question Schema ─────────────────────────────────

export const DiscoveryQuestionSchema = z.object({
  question: z.string(),
  why: z.string(),
  options: z.array(z.string()).nullable(),
  field: z.string(),
  phase_complete: z.boolean(),
});

export type DiscoveryQuestionOutput = z.infer<typeof DiscoveryQuestionSchema>;

// ── Discovery Suggestion Schema (with proposed answer) ────────

export const DiscoverySuggestionSchema = z.object({
  question: z.string(),
  why: z.string(),
  options: z.array(z.string()).nullable(),
  field: z.string(),
  phase_complete: z.boolean(),
  suggested_answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
  best_practice_note: z.string().nullable(),
});

export type DiscoverySuggestionOutput = z.infer<typeof DiscoverySuggestionSchema>;

// ── Product Brief Schema ──────────────────────────────────────

export const ProductBriefSchema = z.object({
  name: z.string(),
  display_name: z.string(),
  one_liner: z.string(),
  vision: z.string(),
  target_user: z.string(),
  platform: z.string(),
  timeline: z.string(),
  out_of_scope: z.array(z.string()),
  competitive: z.string(),
  is_agentic: z.boolean(),
});

export type ProductBriefOutput = z.infer<typeof ProductBriefSchema>;

// ── Features Schema ───────────────────────────────────────────

export const FeaturesSchema = z.object({
  features: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      tier: z.enum(["must_have", "should_have", "could_have"]),
      agent_role: z.enum(["none", "assist", "own"]),
      acceptance_criteria: z.array(z.string()),
      edge_cases: z.array(z.string()),
      error_handling: z.array(
        z.object({
          condition: z.string(),
          handling: z.string(),
          user_message: z.string(),
        })
      ),
    })
  ),
  user_stories: z.array(z.string()),
  nonfunctional: z.array(z.string()),
});

export type FeaturesOutput = z.infer<typeof FeaturesSchema>;

// ── Architecture Schema ───────────────────────────────────────

export const ArchitectureSchema = z.object({
  data_model: z.string(),
  api_design: z.string(),
  tech_stack: z.string(),
  security: z.string(),
  agentic_architecture: z.string(),
  state_management: z.string(),
});

export type ArchitectureOutput = z.infer<typeof ArchitectureSchema>;

// ── Validation Clarity Schema ─────────────────────────────────

export const ValidationClaritySchema = z.object({
  scores: z.object({
    specificity: z.number(),
    buildability: z.number(),
    completeness: z.number(),
    consistency: z.number(),
  }),
  overall: z.number(),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type ValidationClarityOutput = z.infer<typeof ValidationClaritySchema>;
