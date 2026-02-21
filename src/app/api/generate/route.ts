// ═══════════════════════════════════════════════════════════════
// POST /api/generate
// Streams the full engineering specification document
// token-by-token via SSE using Anthropic SDK streaming.
// Extracts user terminology for spec echoing (SPEC-04).
// ═══════════════════════════════════════════════════════════════

import { llmStream } from "@/lib/llm/client";
import { SYSTEM_GENERATOR, promptGenerateSpec } from "@/lib/llm/prompts";
import { COMPLEXITY_CONFIG } from "@/lib/constants";
import { extractTerminology } from "@/lib/spec/terminology";
import type { Complexity, QAEntry } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { project_data, complexity } = body;

    if (!project_data) {
      return new Response(JSON.stringify({ error: "project_data required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cx = (complexity || "moderate") as Complexity;
    const sections = COMPLEXITY_CONFIG[cx].sections as unknown as number[];

    // Extract terminology from user's discovery answers (SPEC-04)
    const description = project_data.description || project_data.one_liner || "";
    const answers: QAEntry[] = project_data.discovery?.answers || [];
    const terminology = extractTerminology(description, answers);

    const stream = await llmStream({
      task: "generate",
      system: SYSTEM_GENERATOR,
      prompt: promptGenerateSpec(
        JSON.stringify(project_data, null, 2),
        cx,
        sections,
        terminology,
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
    console.error("[/api/generate]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
