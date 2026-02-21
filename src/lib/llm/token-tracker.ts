// ═══════════════════════════════════════════════════════════════
// Skill Forge — Token Usage Tracking
// Utilities for accumulating and summarizing LLM costs
// per project. Stored in localStorage alongside project data.
// ═══════════════════════════════════════════════════════════════

import type { Project, TokenUsageEntry } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────

export interface TokenTotals {
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cache_creation_tokens: number;
  total_calls: number;
  by_task: Record<string, { input: number; output: number; calls: number }>;
  by_model: Record<string, { input: number; output: number; calls: number }>;
}

// ── Cost Estimation ───────────────────────────────────────────
// NOTE: These are approximate costs as of early 2025.
// Update when Anthropic changes pricing.

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 0.80, output: 4.00 },        // $/MTok
  "claude-sonnet-4-20250514": { input: 3.00, output: 15.00 }, // $/MTok
};

const CACHE_READ_DISCOUNT = 0.90;    // 90% discount on input price
const CACHE_CREATION_PREMIUM = 0.25; // 25% premium on input price

// ── Factory ───────────────────────────────────────────────────

/**
 * Create a new token usage entry with current timestamp.
 * Defaults cache fields to 0 if not provided.
 */
export function createTokenUsageEntry(
  task: string,
  model: string,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  },
): TokenUsageEntry {
  return {
    task,
    model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
    timestamp: new Date().toISOString(),
  };
}

// ── Project Mutation ──────────────────────────────────────────

/**
 * Add a token usage entry to a project.
 * Returns a NEW Project object (immutable pattern).
 * Handles legacy projects that may lack token_usage field.
 */
export function addTokenUsage(project: Project, entry: TokenUsageEntry): Project {
  const existingUsage = project.token_usage ?? [];
  return {
    ...project,
    token_usage: [...existingUsage, entry],
    updated_at: new Date().toISOString(),
  };
}

// ── Aggregation ───────────────────────────────────────────────

/**
 * Compute total token usage across all entries.
 * Groups by task type and by model for detailed breakdown.
 */
export function getTokenTotals(entries: TokenUsageEntry[]): TokenTotals {
  const totals: TokenTotals = {
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cache_read_tokens: 0,
    total_cache_creation_tokens: 0,
    total_calls: entries.length,
    by_task: {},
    by_model: {},
  };

  for (const entry of entries) {
    totals.total_input_tokens += entry.input_tokens;
    totals.total_output_tokens += entry.output_tokens;
    totals.total_cache_read_tokens += entry.cache_read_input_tokens;
    totals.total_cache_creation_tokens += entry.cache_creation_input_tokens;

    // Group by task
    if (!totals.by_task[entry.task]) {
      totals.by_task[entry.task] = { input: 0, output: 0, calls: 0 };
    }
    totals.by_task[entry.task].input += entry.input_tokens;
    totals.by_task[entry.task].output += entry.output_tokens;
    totals.by_task[entry.task].calls += 1;

    // Group by model
    if (!totals.by_model[entry.model]) {
      totals.by_model[entry.model] = { input: 0, output: 0, calls: 0 };
    }
    totals.by_model[entry.model].input += entry.input_tokens;
    totals.by_model[entry.model].output += entry.output_tokens;
    totals.by_model[entry.model].calls += 1;
  }

  return totals;
}

// ── Cost Estimation ───────────────────────────────────────────

/**
 * Estimate USD cost for a set of token usage entries.
 * Uses approximate Anthropic pricing. Returns costs in dollars.
 */
export function estimateCost(entries: TokenUsageEntry[]): {
  input_cost: number;
  output_cost: number;
  cache_savings: number;
  total_cost: number;
} {
  let inputCost = 0;
  let outputCost = 0;
  let cacheSavings = 0;

  for (const entry of entries) {
    const pricing = PRICING[entry.model] ?? PRICING["claude-sonnet-4-20250514"];

    // Standard input cost
    inputCost += (entry.input_tokens / 1_000_000) * pricing.input;

    // Output cost
    outputCost += (entry.output_tokens / 1_000_000) * pricing.output;

    // Cache read savings (charged at discounted rate instead of full rate)
    const cacheReadCost = (entry.cache_read_input_tokens / 1_000_000) * pricing.input * (1 - CACHE_READ_DISCOUNT);
    const cacheReadFullCost = (entry.cache_read_input_tokens / 1_000_000) * pricing.input;
    cacheSavings += cacheReadFullCost - cacheReadCost;

    // Cache creation premium (charged at premium rate)
    inputCost += (entry.cache_creation_input_tokens / 1_000_000) * pricing.input * (1 + CACHE_CREATION_PREMIUM);
  }

  return {
    input_cost: Math.round(inputCost * 10000) / 10000,
    output_cost: Math.round(outputCost * 10000) / 10000,
    cache_savings: Math.round(cacheSavings * 10000) / 10000,
    total_cost: Math.round((inputCost + outputCost) * 10000) / 10000,
  };
}
