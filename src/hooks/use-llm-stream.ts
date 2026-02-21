"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Streaming LLM Consumer Hook
// React hook for consuming SSE streams from API routes.
// Supports multi-call stitching for chunked generation.
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
  /** Continue streaming and append to existing text (for multi-call stitching) */
  continueStream: (url: string, body: object) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────

/**
 * React hook for consuming SSE streams from LLM API routes.
 * Accumulates text incrementally, provides abort support,
 * and captures usage data from the stream.
 *
 * Supports two modes:
 * - `startStream()`: Resets text and streams from scratch
 * - `continueStream()`: Appends to existing text (for multi-call stitching)
 */
export function useLLMStream(): UseLLMStreamReturn {
  const [state, setState] = useState<StreamState>({
    text: "",
    isStreaming: false,
    error: null,
    usage: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  // Ref to track accumulated text across re-renders
  const accumulatedRef = useRef("");

  /**
   * Core streaming logic shared between startStream and continueStream.
   * @param url API endpoint
   * @param body Request body
   * @param initialText Text to prepend (empty for startStream, existing text for continueStream)
   */
  const doStream = useCallback(async (url: string, body: object, initialText: string) => {
    // Abort any existing stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Set initial state
    accumulatedRef.current = initialText;
    setState({
      text: initialText,
      isStreaming: true,
      error: null,
      usage: null,
    });

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

      // Parse streaming events (supports both SSE format and raw JSON lines)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on newlines — handles both SSE (double newline) and raw JSON lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line === "[DONE]") continue;

          // Strip SSE "data: " prefix if present, otherwise use raw line
          const jsonStr = line.startsWith("data: ") ? line.slice(6).trim() : line;
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const event = JSON.parse(jsonStr);

            // Handle text delta events (content_block_delta)
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta" &&
              event.delta?.text
            ) {
              accumulatedRef.current += event.delta.text;
              const currentText = accumulatedRef.current;
              setState(prev => ({
                ...prev,
                text: currentText,
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
            // Skip malformed JSON events (e.g., SSE event: lines)
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

  /** Start a new stream — resets all text */
  const startStream = useCallback(async (url: string, body: object) => {
    await doStream(url, body, "");
  }, [doStream]);

  /** Continue streaming — appends to existing text (for multi-call stitching) */
  const continueStream = useCallback(async (url: string, body: object) => {
    // Add separator between parts for clean stitching
    const existingText = accumulatedRef.current.trimEnd() + "\n\n";
    await doStream(url, body, existingText);
  }, [doStream]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    accumulatedRef.current = "";
    setState({ text: "", isStreaming: false, error: null, usage: null });
  }, []);

  return {
    ...state,
    startStream,
    continueStream,
    abort,
    reset,
  };
}
