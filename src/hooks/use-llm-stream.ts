"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Streaming LLM Consumer Hook
// React hook for consuming SSE streams from API routes.
// Uses manual SSE parsing for lightweight client bundle.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────

interface StreamUsage {
  input_tokens: number;
  output_tokens: number;
}

interface StreamState {
  text: string;
  isStreaming: boolean;
  error: string | null;
  usage: StreamUsage | null;
}

interface UseLLMStreamReturn extends StreamState {
  startStream: (url: string, body: object) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────

/**
 * React hook for consuming SSE streams from LLM API routes.
 * Accumulates text incrementally, provides abort support,
 * and captures usage data from the stream.
 */
export function useLLMStream(): UseLLMStreamReturn {
  const [state, setState] = useState<StreamState>({
    text: "",
    isStreaming: false,
    error: null,
    usage: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (url: string, body: object) => {
    // Abort any existing stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Reset state
    setState({ text: "", isStreaming: true, error: null, usage: null });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.error || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorBody.slice(0, 200)}`;
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      // Parse SSE events manually (avoids importing full Anthropic SDK on client)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (double newline separated)
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep incomplete event in buffer

        for (const eventBlock of events) {
          // Each SSE event may have multiple lines
          for (const line of eventBlock.split("\n")) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              // Handle text delta events (content_block_delta)
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta" &&
                event.delta?.text
              ) {
                accumulatedText += event.delta.text;
                setState(prev => ({
                  ...prev,
                  text: accumulatedText,
                }));
              }

              // Capture usage from message_delta (final event with output token count)
              if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens ?? 0;
              }

              // Capture input tokens from message_start
              if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens ?? 0;
              }
            } catch {
              // Skip malformed JSON events
            }
          }
        }
      }

      // Stream complete
      const finalUsage: StreamUsage | null =
        inputTokens > 0 || outputTokens > 0
          ? { input_tokens: inputTokens, output_tokens: outputTokens }
          : null;

      setState(prev => ({
        ...prev,
        isStreaming: false,
        usage: finalUsage,
      }));
    } catch (error) {
      // Ignore abort errors (user cancelled)
      if (error instanceof DOMException && error.name === "AbortError") {
        setState(prev => ({ ...prev, isStreaming: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : "Stream failed",
      }));
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ text: "", isStreaming: false, error: null, usage: null });
  }, []);

  return {
    ...state,
    startStream,
    abort,
    reset,
  };
}
