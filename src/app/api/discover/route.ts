// ═══════════════════════════════════════════════════════════════
// POST /api/discover
// Handles: complexity classification, discovery questions,
// product brief generation, feature generation, architecture
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { llmCallJSON } from "@/lib/llm/client";
import {
  SYSTEM_DISCOVERY,
  SYSTEM_COMPLEXITY,
  promptClassifyComplexity,
  promptDiscoveryQuestion,
  promptGenerateProductBrief,
  promptGenerateFeatures,
  promptGenerateArchitecture,
} from "@/lib/llm/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "classify": {
        const { description } = body;
        if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });

        const { data, meta } = await llmCallJSON<{
          complexity: string;
          is_agentic: boolean;
          reasoning: string;
          suggested_name: string;
          one_liner: string;
        }>({
          system: SYSTEM_COMPLEXITY,
          prompt: promptClassifyComplexity(description),
          temperature: 0.3,
        });

        return NextResponse.json({ ...data, meta });
      }

      case "question": {
        const { description, phase, answers, complexity, is_agentic } = body;

        const { data, meta } = await llmCallJSON<{
          question: string;
          why: string;
          options: string[] | null;
          field: string;
          phase_complete: boolean;
        }>({
          system: SYSTEM_DISCOVERY,
          prompt: promptDiscoveryQuestion(description, phase, answers || [], complexity, is_agentic),
          temperature: 0.7,
        });

        return NextResponse.json({ ...data, meta });
      }

      case "brief": {
        const { description, answers } = body;

        const { data, meta } = await llmCallJSON<{
          name: string;
          display_name: string;
          one_liner: string;
          vision: string;
          target_user: string;
          platform: string;
          timeline: string;
          out_of_scope: string[];
          competitive: string;
          is_agentic: boolean;
        }>({
          system: SYSTEM_DISCOVERY,
          prompt: promptGenerateProductBrief(description, answers || []),
          temperature: 0.5,
        });

        return NextResponse.json({ ...data, meta });
      }

      case "features": {
        const { brief, answers, complexity } = body;

        const { data, meta } = await llmCallJSON<{
          features: Array<{
            name: string;
            description: string;
            tier: string;
            agent_role: string;
            acceptance_criteria: string[];
            edge_cases: string[];
            error_handling: Array<{ condition: string; handling: string; user_message: string }>;
          }>;
          user_stories: string[];
          nonfunctional: string[];
        }>({
          system: SYSTEM_DISCOVERY,
          prompt: promptGenerateFeatures(brief, answers || [], complexity),
          maxTokens: 8192,
          temperature: 0.6,
        });

        return NextResponse.json({ ...data, meta });
      }

      case "architecture": {
        const { brief, features, complexity, is_agentic, answers } = body;

        const { data, meta } = await llmCallJSON<{
          data_model: string;
          api_design: string;
          tech_stack: string;
          security: string;
          agentic_architecture: string;
          state_management: string;
        }>({
          system: SYSTEM_DISCOVERY,
          prompt: promptGenerateArchitecture(brief, features, complexity, is_agentic, answers || []),
          maxTokens: 8192,
          temperature: 0.5,
        });

        return NextResponse.json({ ...data, meta });
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
