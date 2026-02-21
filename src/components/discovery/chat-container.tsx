"use client";

import { useRef, useEffect } from "react";
import type { ChatMessage, Phase } from "@/lib/types";
import { ChatBubble } from "./chat-bubble";
import { SuggestConfirmCard } from "./suggest-confirm-card";
import { PhaseSummaryCard } from "./phase-summary-card";
import { ThinkingIndicator } from "./thinking-indicator";
import { PHASES } from "@/lib/constants";

interface ChatContainerProps {
  messages: ChatMessage[];
  currentPhase: Phase;
  isThinking: boolean;
  onAccept: (answer: string) => void;
  onEdit: (answer: string) => void;
  onOverride: (answer: string) => void;
  disabled?: boolean;
}

export function ChatContainer({
  messages,
  currentPhase,
  isThinking,
  onAccept,
  onEdit,
  onOverride,
  disabled,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isNearBottom.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    if (isNearBottom.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, isThinking]);

  // Group messages by phase for summary cards
  const completedPhases = getCompletedPhases(messages, currentPhase);
  const currentPhaseMessages = messages.filter(
    m => m.phase === currentPhase && m.type !== "phase_summary"
  );

  // Find the latest suggestion (if the last AI message is a suggestion)
  const lastMessage = currentPhaseMessages[currentPhaseMessages.length - 1];
  const activeSuggestion = lastMessage?.type === "suggestion" && lastMessage.suggestion
    ? lastMessage.suggestion
    : null;

  // Messages to render in the current phase (excluding the active suggestion's message)
  const visibleMessages = activeSuggestion
    ? currentPhaseMessages.slice(0, -1) // Don't render the suggestion as a bubble
    : currentPhaseMessages;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto space-y-4 py-4 pr-1"
      style={{ maxHeight: "calc(100vh - 320px)" }}
    >
      {/* Completed phase summaries */}
      {completedPhases.map(cp => (
        <PhaseSummaryCard
          key={cp.phase}
          phaseLabel={cp.label}
          phaseNumber={cp.number}
          decisions={cp.decisions}
        />
      ))}

      {/* Current phase messages */}
      {visibleMessages.map(msg => (
        <ChatBubble key={msg.id} message={msg} />
      ))}

      {/* Active suggestion card */}
      {activeSuggestion && (
        <SuggestConfirmCard
          suggestion={activeSuggestion}
          onAccept={onAccept}
          onEdit={onEdit}
          onOverride={onOverride}
          disabled={disabled}
        />
      )}

      {/* Thinking indicator */}
      {isThinking && <ThinkingIndicator />}
    </div>
  );
}

// Helper: extract completed phase summaries from messages
function getCompletedPhases(messages: ChatMessage[], currentPhase: Phase) {
  const phaseOrder: Phase[] = ["discover", "define", "architect"];
  const currentIdx = phaseOrder.indexOf(currentPhase);
  const completed: Array<{ phase: Phase; label: string; number: number; decisions: Array<{ field: string; value: string }> }> = [];

  for (let i = 0; i < currentIdx; i++) {
    const phase = phaseOrder[i];
    const phaseInfo = PHASES.find(p => p.id === phase);
    const phaseMessages = messages.filter(m => m.phase === phase && m.type === "user_response");

    completed.push({
      phase,
      label: phaseInfo?.label || phase,
      number: phaseInfo?.number || i + 1,
      decisions: phaseMessages.map(m => ({
        field: m.field || "response",
        value: m.content.slice(0, 150),
      })),
    });
  }

  return completed;
}
