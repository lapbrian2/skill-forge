// ═══════════════════════════════════════════════════════════════
// Skill Forge — LLM Client
// Server-side only — called from API routes
// ═══════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";
import { LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE } from "../constants";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface LLMCallOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResult {
  content: string;
  tokens_input: number;
  tokens_output: number;
  model: string;
  latency_ms: number;
}

/**
 * Make an LLM call. Server-side only.
 * Returns the text content and usage metadata.
 */
export async function llmCall(options: LLMCallOptions): Promise<LLMResult> {
  const anthropic = getClient();
  const start = Date.now();

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: options.maxTokens ?? LLM_MAX_TOKENS,
    temperature: options.temperature ?? LLM_TEMPERATURE,
    system: options.system,
    messages: [
      { role: "user", content: options.prompt },
    ],
  });

  const latency = Date.now() - start;
  const textBlock = response.content.find(b => b.type === "text");

  return {
    content: textBlock?.text ?? "",
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    model: response.model,
    latency_ms: latency,
  };
}

/**
 * Make an LLM call expecting JSON output.
 * Parses the response and returns typed data.
 */
export async function llmCallJSON<T>(options: LLMCallOptions): Promise<{ data: T; meta: Omit<LLMResult, "content"> }> {
  const result = await llmCall({
    ...options,
    system: options.system + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.",
  });

  // Strip any accidental markdown fencing
  let cleaned = result.content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const data = JSON.parse(cleaned) as T;
  return {
    data,
    meta: {
      tokens_input: result.tokens_input,
      tokens_output: result.tokens_output,
      model: result.model,
      latency_ms: result.latency_ms,
    },
  };
}
