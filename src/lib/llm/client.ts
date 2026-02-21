// ═══════════════════════════════════════════════════════════════
// Skill Forge — LLM Client
// Production-grade LLM infrastructure with streaming,
// structured output (Zod), retry, and prompt caching.
// Server-side only — called from API routes.
// ═══════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getModelConfig, type TaskType } from "./models";
import { LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE } from "../constants";

// ── Client Singleton ──────────────────────────────────────────

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ── Types ─────────────────────────────────────────────────────

export interface TokenUsageData {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  model: string;
}

export interface LLMStreamOptions {
  task: TaskType;
  system: string;
  prompt: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface LLMParseOptions<T extends z.ZodType> {
  task: TaskType;
  system: string;
  prompt: string;
  schema: T;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface LLMParseResult<T extends z.ZodType> {
  data: z.infer<T>;
  usage: TokenUsageData;
}

// ── Retry Logic ───────────────────────────────────────────────

/**
 * Wrap an async function with exponential backoff retry.
 * Does NOT retry 4xx errors (except 429 rate limit).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (error instanceof Anthropic.APIError) {
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
      }

      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ── Streaming LLM Call ────────────────────────────────────────

/**
 * Stream an LLM response token-by-token.
 * Returns an Anthropic MessageStream with .toReadableStream() for SSE.
 * Uses per-task model selection and prompt caching.
 */
export async function llmStream(options: LLMStreamOptions) {
  const anthropic = getClient();
  const config = getModelConfig(options.task);

  const messages: Array<{ role: "user" | "assistant"; content: string }> =
    options.messages && options.messages.length > 0
      ? options.messages
      : [{ role: "user", content: options.prompt }];

  return withRetry(() => {
    const stream = anthropic.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: [
        {
          type: "text" as const,
          text: options.system,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages,
    });

    return Promise.resolve(stream);
  });
}

// ── Structured Output LLM Call ────────────────────────────────

/**
 * Make an LLM call with Zod-validated structured output.
 * Uses zodOutputFormat() for server-side constrained JSON generation.
 * Returns typed, validated data with token usage metadata.
 */
export async function llmParse<T extends z.ZodType>(
  options: LLMParseOptions<T>,
): Promise<LLMParseResult<T>> {
  const anthropic = getClient();
  const config = getModelConfig(options.task);

  const messages: Array<{ role: "user" | "assistant"; content: string }> =
    options.messages && options.messages.length > 0
      ? options.messages
      : [{ role: "user", content: options.prompt }];

  return withRetry(async () => {
    const message = await anthropic.messages.parse({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: [
        {
          type: "text" as const,
          text: options.system,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages,
      output_config: {
        format: zodOutputFormat(options.schema),
      },
    });

    return {
      data: message.parsed_output as z.infer<T>,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        cache_read_input_tokens: (message.usage as unknown as Record<string, number>).cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: (message.usage as unknown as Record<string, number>).cache_creation_input_tokens ?? 0,
        model: message.model,
      },
    };
  });
}

// ── Deprecated Functions ──────────────────────────────────────
// These are kept for backward compatibility during migration.
// API routes will be migrated to use llmStream/llmParse in Plan 03.

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
 * @deprecated Use `llmStream()` for streaming or `llmParse()` for structured output.
 * Make a non-streaming LLM call. Server-side only.
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
 * @deprecated Use `llmParse()` with a Zod schema for validated structured output.
 * Make an LLM call expecting JSON output with fragile JSON.parse.
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
