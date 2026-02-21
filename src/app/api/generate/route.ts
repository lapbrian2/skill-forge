// ═══════════════════════════════════════════════════════════════
// POST /api/generate
// Generates the full engineering specification document
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { llmCall } from "@/lib/llm/client";
import { SYSTEM_GENERATOR, promptGenerateSpec } from "@/lib/llm/prompts";
import { COMPLEXITY_CONFIG } from "@/lib/constants";
import type { Complexity } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { project_data, complexity } = body;

    if (!project_data) {
      return NextResponse.json({ error: "project_data required" }, { status: 400 });
    }

    const cx = (complexity || "moderate") as Complexity;
    const sections = COMPLEXITY_CONFIG[cx].sections as unknown as number[];

    const result = await llmCall({
      system: SYSTEM_GENERATOR,
      prompt: promptGenerateSpec(
        JSON.stringify(project_data, null, 2),
        cx,
        sections
      ),
      maxTokens: 16384,
      temperature: 0.5,
    });

    // Count sections and words
    const sectionMatches = result.content.match(/^## \d+\./gm);
    const sectionCount = sectionMatches ? sectionMatches.length : 0;
    const wordCount = result.content.split(/\s+/).length;

    return NextResponse.json({
      markdown: result.content,
      section_count: sectionCount,
      word_count: wordCount,
      meta: {
        tokens_input: result.tokens_input,
        tokens_output: result.tokens_output,
        model: result.model,
        latency_ms: result.latency_ms,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
