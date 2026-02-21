"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward, AlertTriangle } from "lucide-react";
import type { Complexity } from "@/lib/types";

interface SkipButtonProps {
  onSkip: () => void;
  questionsAnswered: number;
  complexity: Complexity;
}

export function SkipButton({ onSkip, questionsAnswered, complexity }: SkipButtonProps) {
  const [showWarning, setShowWarning] = useState(false);

  const minRecommended = complexity === "simple" ? 3 : complexity === "moderate" ? 8 : 15;
  const isUnderRecommended = questionsAnswered < minRecommended;

  const handleClick = () => {
    if (isUnderRecommended && !showWarning) {
      setShowWarning(true);
      return;
    }
    onSkip();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {showWarning && (
        <div className="flex items-center gap-2 text-amber-400/70 text-[11px] bg-amber-400/5 border border-amber-400/10 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Only {questionsAnswered} questions answered. Recommended: {minRecommended}+ for {complexity} projects.
            Fewer questions = less specific spec. Continue anyway?
          </span>
        </div>
      )}
      <Button
        onClick={handleClick}
        variant="ghost"
        size="sm"
        className="text-white/25 hover:text-white/40 text-[11px]"
      >
        <SkipForward className="h-3.5 w-3.5 mr-1.5" />
        {showWarning ? "Yes, skip to spec generation" : "I've said enough -- generate the spec"}
      </Button>
    </div>
  );
}
