// ═══════════════════════════════════════════════════════════════
// POST /api/generate
// Streams the full engineering specification document
// token-by-token via SSE using Anthropic SDK streaming.
// Uses a continuation strategy: if the model hits token limits,
// it automatically continues generating remaining sections.
// ═══════════════════════════════════════════════════════════════

import { getClient } from "@/lib/llm/client";
import { getModelConfig } from "@/lib/llm/models";
import { SYSTEM_GENERATOR, promptGenerateSpec } from "@/lib/llm/prompts";
import { COMPLEXITY_CONFIG } from "@/lib/constants";
import { extractTerminology } from "@/lib/spec/terminology";
import type { Complexity, QAEntry } from "@/lib/types";

// Extend Vercel function timeout for long spec generation streams.
// Hobby: 60s max, Pro: 300s max. Set to 300 — Vercel clamps to plan limit.
export const maxDuration = 300;

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

    const anthropic = getClient();
    const config = getModelConfig("generate");

    const userPrompt = promptGenerateSpec(
      JSON.stringify(project_data, null, 2),
      cx,
      sections,
      terminology,
    );

    // Create a TransformStream to pipe our multi-pass output through
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Run streaming in background so we can return the response immediately
    (async () => {
      try {
        let fullText = "";
        const MAX_CONTINUATIONS = 3;

        // === PASS 1: Initial generation ===
        const stream1 = anthropic.messages.stream({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          system: [
            {
              type: "text" as const,
              text: SYSTEM_GENERATOR,
              cache_control: { type: "ephemeral" as const },
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
        });

        // Forward all raw events from pass 1
        const rawStream1 = stream1.toReadableStream();
        const reader1 = rawStream1.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader1.read();
          if (done) break;

          // Forward raw bytes to client
          await writer.write(value);

          // Also decode to track accumulated text
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6).trim() : trimmed;
            if (!jsonStr || jsonStr === "[DONE]") continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta?.text) {
                fullText += event.delta.text;
              }
            } catch { /* skip */ }
          }
        }

        // === CHECK: Did we get all required sections? ===
        for (let pass = 0; pass < MAX_CONTINUATIONS; pass++) {
          const missingSections = sections.filter(num => {
            const pattern = new RegExp(`##\\s+${num}\\.\\s`, "m");
            return !pattern.test(fullText);
          });

          if (missingSections.length === 0) break; // All sections present!

          // === CONTINUATION PASS ===
          const continuePrompt = `You were generating an engineering specification but your output was cut off. Here is what you generated so far:

---BEGIN PARTIAL SPEC---
${fullText.slice(-3000)}
---END PARTIAL SPEC---

The following REQUIRED sections are MISSING and must be generated NOW:
${missingSections.map(n => `- ## ${n}. (see the document structure in your system prompt)`).join("\n")}

CRITICAL: Continue generating from EXACTLY where you left off. Start with the next missing section heading (## ${missingSections[0]}.). Do NOT repeat any content already generated. Do NOT add any preamble or explanation — output ONLY the missing spec sections in Markdown.`;

          const streamN = anthropic.messages.stream({
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            system: [
              {
                type: "text" as const,
                text: SYSTEM_GENERATOR,
                cache_control: { type: "ephemeral" as const },
              },
            ],
            messages: [
              { role: "user", content: userPrompt },
              { role: "assistant", content: fullText.slice(-6000) },
              { role: "user", content: continuePrompt },
            ],
          });

          const rawStreamN = streamN.toReadableStream();
          const readerN = rawStreamN.getReader();

          while (true) {
            const { done, value } = await readerN.read();
            if (done) break;
            await writer.write(value);

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6).trim() : trimmed;
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta?.text) {
                  fullText += event.delta.text;
                }
              } catch { /* skip */ }
            }
          }
        }

        await writer.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream error";
        // Write error as a JSON event the client can detect
        const errorEvent = JSON.stringify({ type: "error", error: { message } });
        await writer.write(encoder.encode(errorEvent + "\n"));
        await writer.close();
      }
    })();

    return new Response(readable, {
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
