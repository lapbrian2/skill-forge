// ═══════════════════════════════════════════════════════════════
// POST /api/generate-section
// Streams a single regenerated section of the engineering spec.
// Used when user wants to regenerate one section without
// regenerating the entire document.
// ═══════════════════════════════════════════════════════════════

import { llmStream } from "@/lib/llm/client";
import { SYSTEM_GENERATOR, promptRegenerateSection } from "@/lib/llm/prompts";

// Extend Vercel function timeout for section regeneration streams.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      section_number,
      section_title,
      project_data,
      current_spec,
      complexity,
    } = body;

    if (!section_number || !project_data || !current_spec) {
      return new Response(
        JSON.stringify({
          error: "section_number, project_data, and current_spec are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = await llmStream({
      task: "generate",
      system: SYSTEM_GENERATOR,
      prompt: promptRegenerateSection(
        section_number,
        section_title || `Section ${section_number}`,
        JSON.stringify(project_data, null, 2),
        current_spec,
        complexity || "moderate",
      ),
    });

    return new Response(stream.toReadableStream(), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/generate-section]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
