"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Pencil, PenLine, ChevronDown, Lightbulb } from "lucide-react";
import type { AISuggestion } from "@/lib/types";

interface SuggestConfirmCardProps {
  suggestion: AISuggestion;
  onAccept: (answer: string) => void;
  onEdit: (answer: string) => void;
  onOverride: (answer: string) => void;
  disabled?: boolean;
}

const CONFIDENCE_STYLES = {
  high: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/5",
  low: "text-red-400 border-red-400/30 bg-red-400/5",
};

export function SuggestConfirmCard({ suggestion, onAccept, onEdit, onOverride, disabled }: SuggestConfirmCardProps) {
  const [editedAnswer, setEditedAnswer] = useState(suggestion.proposed_answer);
  const [showReasoning, setShowReasoning] = useState(false);
  const [mode, setMode] = useState<"suggest" | "editing" | "override">("suggest");
  const [overrideText, setOverrideText] = useState("");

  const handleAccept = () => onAccept(suggestion.proposed_answer);

  const handleEdit = () => {
    if (mode === "editing") {
      onEdit(editedAnswer);
    } else {
      setMode("editing");
    }
  };

  const handleOverride = () => {
    if (mode === "override") {
      if (overrideText.trim()) onOverride(overrideText.trim());
    } else {
      setMode("override");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="ml-10 rounded-xl border border-white/8 bg-[#111] p-4 space-y-3"
    >
      {/* Confidence badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-[10px] ${CONFIDENCE_STYLES[suggestion.confidence]}`}>
          {suggestion.confidence} confidence
        </Badge>
        {suggestion.best_practice_note && (
          <div className="flex items-center gap-1 text-[10px] text-blue-400/60">
            <Lightbulb className="h-3 w-3" />
            <span>Best practice</span>
          </div>
        )}
      </div>

      {/* Proposed answer */}
      {mode === "suggest" && (
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
          <p className="text-[13px] text-white/70 leading-relaxed">{suggestion.proposed_answer}</p>
        </div>
      )}

      {mode === "editing" && (
        <Textarea
          value={editedAnswer}
          onChange={e => setEditedAnswer(e.target.value)}
          className="bg-[#0A0A0A] border-white/10 text-[13px] min-h-[80px] resize-none focus:border-orange-500/30"
          autoFocus
        />
      )}

      {mode === "override" && (
        <Textarea
          value={overrideText}
          onChange={e => setOverrideText(e.target.value)}
          placeholder="Write your own answer..."
          className="bg-[#0A0A0A] border-white/10 text-[13px] min-h-[80px] resize-none focus:border-orange-500/30"
          autoFocus
        />
      )}

      {/* Best practice note */}
      {suggestion.best_practice_note && mode === "suggest" && (
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-2.5">
          <p className="text-[11px] text-blue-300/60 leading-relaxed">{suggestion.best_practice_note}</p>
        </div>
      )}

      {/* Reasoning (collapsible) */}
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/40 transition-colors"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${showReasoning ? "rotate-180" : ""}`} />
        Why this answer?
      </button>
      {showReasoning && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="text-[11px] text-white/30 leading-relaxed pl-4 border-l border-white/6"
        >
          {suggestion.reasoning}
        </motion.p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {mode === "suggest" && (
          <>
            <Button
              onClick={handleAccept}
              disabled={disabled}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[12px]"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Accept
            </Button>
            <Button
              onClick={handleEdit}
              disabled={disabled}
              variant="outline"
              size="sm"
              className="border-white/10 text-[12px]"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button
              onClick={handleOverride}
              disabled={disabled}
              variant="ghost"
              size="sm"
              className="text-white/40 text-[12px]"
            >
              <PenLine className="h-3.5 w-3.5 mr-1" /> Write My Own
            </Button>
          </>
        )}

        {mode === "editing" && (
          <>
            <Button
              onClick={handleEdit}
              disabled={disabled || editedAnswer === suggestion.proposed_answer}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-black text-[12px] font-semibold"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Confirm Edit
            </Button>
            <Button
              onClick={() => { setMode("suggest"); setEditedAnswer(suggestion.proposed_answer); }}
              variant="ghost"
              size="sm"
              className="text-white/40 text-[12px]"
            >
              Cancel
            </Button>
          </>
        )}

        {mode === "override" && (
          <>
            <Button
              onClick={handleOverride}
              disabled={disabled || !overrideText.trim()}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-black text-[12px] font-semibold"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Submit
            </Button>
            <Button
              onClick={() => { setMode("suggest"); setOverrideText(""); }}
              variant="ghost"
              size="sm"
              className="text-white/40 text-[12px]"
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
