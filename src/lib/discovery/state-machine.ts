// ═══════════════════════════════════════════════════════════════
// Skill Forge — Discovery State Machine
// useReducer-based state management for the chat conversation.
// Single source of truth for all discovery UI state.
// ═══════════════════════════════════════════════════════════════

import type { ChatMessage, AISuggestion, Phase } from "@/lib/types";

// ── State ─────────────────────────────────────────────────────

export type DiscoveryStatus =
  | "idle"
  | "ai_thinking"
  | "ai_suggested"
  | "user_responding"
  | "saving"
  | "phase_complete"
  | "all_complete";

export interface DiscoveryState {
  status: DiscoveryStatus;
  messages: ChatMessage[];
  currentPhase: Phase;
  questionsAskedInPhase: number;
  totalQuestionsAsked: number;
  understanding: Record<string, unknown>;
  currentQuestion: string | null;
  currentField: string | null;
  currentWhy: string | null;
  error: string | null;
}

export const INITIAL_STATE: DiscoveryState = {
  status: "idle",
  messages: [],
  currentPhase: "discover",
  questionsAskedInPhase: 0,
  totalQuestionsAsked: 0,
  understanding: {},
  currentQuestion: null,
  currentField: null,
  currentWhy: null,
  error: null,
};

// ── Actions ───────────────────────────────────────────────────

export type DiscoveryAction =
  | { type: "START_THINKING" }
  | { type: "AI_SUGGEST"; payload: { question: string; why: string; field: string; suggestion: AISuggestion; phase_complete: boolean } }
  | { type: "USER_RESPOND"; payload: { answer: string; action: "accept" | "edit" | "override" } }
  | { type: "PHASE_COMPLETE"; payload: { summary: string } }
  | { type: "ADVANCE_PHASE"; payload: { nextPhase: Phase } }
  | { type: "SKIP_TO_SPEC" }
  | { type: "RESTORE_SESSION"; payload: Partial<DiscoveryState> }
  | { type: "ERROR"; payload: string }
  | { type: "CLEAR_ERROR" };

// ── Reducer ───────────────────────────────────────────────────

export function discoveryReducer(state: DiscoveryState, action: DiscoveryAction): DiscoveryState {
  switch (action.type) {
    case "START_THINKING":
      return {
        ...state,
        status: "ai_thinking",
        error: null,
      };

    case "AI_SUGGEST": {
      const { question, why, field, suggestion } = action.payload;
      const questionMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        type: "question",
        content: question,
        phase: state.currentPhase,
        field,
        why,
        timestamp: new Date().toISOString(),
      };

      const suggestionMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        type: "suggestion",
        content: suggestion.proposed_answer,
        phase: state.currentPhase,
        field,
        suggestion,
        timestamp: new Date().toISOString(),
      };

      return {
        ...state,
        status: "ai_suggested",
        messages: [...state.messages, questionMsg, suggestionMsg],
        currentQuestion: question,
        currentField: field,
        currentWhy: why,
      };
    }

    case "USER_RESPOND": {
      const { answer, action: userAction } = action.payload;
      const responseMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        type: "user_response",
        content: answer,
        phase: state.currentPhase,
        field: state.currentField || "",
        user_action: userAction,
        timestamp: new Date().toISOString(),
      };

      return {
        ...state,
        status: "saving",
        messages: [...state.messages, responseMsg],
        questionsAskedInPhase: state.questionsAskedInPhase + 1,
        totalQuestionsAsked: state.totalQuestionsAsked + 1,
        currentQuestion: null,
        currentField: null,
        currentWhy: null,
      };
    }

    case "PHASE_COMPLETE": {
      const summaryMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "system",
        type: "phase_summary",
        content: action.payload.summary,
        phase: state.currentPhase,
        field: "",
        timestamp: new Date().toISOString(),
      };

      return {
        ...state,
        status: "phase_complete",
        messages: [...state.messages, summaryMsg],
      };
    }

    case "ADVANCE_PHASE":
      return {
        ...state,
        status: "idle",
        currentPhase: action.payload.nextPhase,
        questionsAskedInPhase: 0,
      };

    case "SKIP_TO_SPEC":
      return {
        ...state,
        status: "all_complete",
        currentPhase: "specify",
      };

    case "RESTORE_SESSION":
      return {
        ...state,
        ...action.payload,
      };

    case "ERROR":
      return {
        ...state,
        status: "ai_suggested", // Allow retry from error state
        error: action.payload,
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
}
