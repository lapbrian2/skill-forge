// ═══════════════════════════════════════════════════════════════
// POST /api/discover
// Handles: complexity classification, discovery questions,
// product brief generation, feature generation, architecture
// Uses Zod-validated structured output via llmParse.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { llmParse } from "@/lib/llm/client";
import {
  ClassificationSchema,
  DiscoveryQuestionSchema,
  DiscoverySuggestionSchema,
  ProductBriefSchema,
  FeaturesSchema,
  ArchitectureSchema,
} from "@/lib/llm/schemas";
import {
  SYSTEM_DISCOVERY,
  SYSTEM_COMPLEXITY,
  promptClassifyComplexity,
  promptDiscoveryQuestion,
  promptDiscoverySuggestion,
  promptGenerateProductBrief,
  promptGenerateFeatures,
  promptGenerateArchitecture,
} from "@/lib/llm/prompts";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "classify": {
        const { description } = body;
        if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });

        const { data, usage } = await llmParse({
          task: "classify",
          system: SYSTEM_COMPLEXITY,
          prompt: promptClassifyComplexity(description),
          schema: ClassificationSchema,
        });

        return NextResponse.json({
          ...data,
          meta: {
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            cache_read: usage.cache_read_input_tokens,
            cache_creation: usage.cache_creation_input_tokens,
            model: usage.model,
          },
        });
      }

      case "question": {
        const { description, phase, answers, complexity, is_agentic } = body;

        const { data, usage } = await llmParse({
          task: "question",
          system: SYSTEM_DISCOVERY,
          prompt: promptDiscoveryQuestion(description, phase, answers || [], complexity, is_agentic),
          schema: DiscoveryQuestionSchema,
        });

        return NextResponse.json({
          ...data,
          meta: {
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            cache_read: usage.cache_read_input_tokens,
            cache_creation: usage.cache_creation_input_tokens,
            model: usage.model,
          },
        });
      }

      case "brief": {
        const { description, answers } = body;

        const { data, usage } = await llmParse({
          task: "brief",
          system: SYSTEM_DISCOVERY,
          prompt: promptGenerateProductBrief(description, answers || []),
          schema: ProductBriefSchema,
        });

        return NextResponse.json({
          ...data,
          meta: {
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            cache_read: usage.cache_read_input_tokens,
            cache_creation: usage.cache_creation_input_tokens,
            model: usage.model,
          },
        });
      }

      case "features": {
        const { brief, answers, complexity } = body;

        const { data, usage } = await llmParse({
          task: "features",
          system: SYSTEM_DISCOVERY,
          prompt: promptGenerateFeatures(brief, answers || [], complexity),
          schema: FeaturesSchema,
        });

        return NextResponse.json({
          ...data,
          meta: {
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            cache_read: usage.cache_read_input_tokens,
            cache_creation: usage.cache_creation_input_tokens,
            model: usage.model,
          },
        });
      }

      case "architecture": {
        const { brief, features, complexity, is_agentic, answers } = body;

        const { data, usage } = await llmParse({
          task: "architecture",
          system: SYSTEM_DISCOVERY,
          prompt: promptGenerateArchitecture(brief, features, complexity, is_agentic, answers || []),
          schema: ArchitectureSchema,
        });

        return NextResponse.json({
          ...data,
          meta: {
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            cache_read: usage.cache_read_input_tokens,
            cache_creation: usage.cache_creation_input_tokens,
            model: usage.model,
          },
        });
      }

      case "suggest": {
        const { description, phase, answers, complexity, is_agentic, understanding } = body;

        const { data, usage } = await llmParse({
          task: "question",
          system: SYSTEM_DISCOVERY,
          prompt: promptDiscoverySuggestion(
            description, phase, answers || [],
            complexity, is_agentic, understanding || {},
          ),
          schema: DiscoverySuggestionSchema,
        });

        return NextResponse.json({
          ...data,
          meta: {
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            cache_read: usage.cache_read_input_tokens,
            cache_creation: usage.cache_creation_input_tokens,
            model: usage.model,
          },
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/discover]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
