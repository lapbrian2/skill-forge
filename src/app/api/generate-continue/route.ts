// ═══════════════════════════════════════════════════════════════
// POST /api/generate-continue
// Streams Part 2 of the engineering specification (sections 9-13).
// Called after /api/generate completes Part 1 (sections 1-8).
// This two-call strategy ensures each call completes within
// Vercel Hobby's 60-second function timeout.
// ═══════════════════════════════════════════════════════════════

import { llmStream } from "@/lib/llm/client";
import { SYSTEM_GENERATOR, promptGenerateSpecPart2 } from "@/lib/llm/prompts";
import { COMPLEXITY_CONFIG } from "@/lib/constants";
import { extractTerminology } from "@/lib/spec/terminology";
import type { Complexity, QAEntry } from "@/lib/types";

// Extend Vercel function timeout — Hobby: 60s max, Pro: 300s max.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_data, complexity, part1_content, builder_profile } = body;

    if (!project_data || !part1_content) {
      return new Response(
        JSON.stringify({ error: "project_data and part1_content required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const cx = (complexity || "moderate") as Complexity;
    const sections = COMPLEXITY_CONFIG[cx].sections as unknown as number[];
    const profile = builder_profile || "dev_team";

    // Extract terminology from user's discovery answers
    const description = project_data.description || project_data.one_liner || "";
    const answers: QAEntry[] = project_data.discovery?.answers || [];
    const terminology = extractTerminology(description, answers);

    const stream = await llmStream({
      task: "generate",
      system: SYSTEM_GENERATOR,
      prompt: promptGenerateSpecPart2(
        JSON.stringify(project_data, null, 2),
        cx,
        sections,
        part1_content,
        terminology,
        profile,
      ),
    });

    // Return SSE stream — use raw Response (not NextResponse) to avoid compression
    return new Response(stream.toReadableStream(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/generate-continue]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
