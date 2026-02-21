"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ChevronDown } from "lucide-react";

interface PhaseSummaryCardProps {
  phaseLabel: string;
  phaseNumber: number;
  decisions: Array<{ field: string; value: string }>;
  defaultExpanded?: boolean;
}

export function PhaseSummaryCard({ phaseLabel, phaseNumber, decisions, defaultExpanded = false }: PhaseSummaryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/6 bg-white/[0.02] p-4"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span className="text-[13px] font-medium text-white/70">
            Phase {phaseNumber}: {phaseLabel}
          </span>
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-400/20">
            {decisions.length} decisions
          </Badge>
        </div>
        <ChevronDown className={`h-4 w-4 text-white/20 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/6 space-y-1.5">
              {decisions.map((d, i) => (
                <div key={i} className="flex gap-2 text-[12px]">
                  <span className="text-white/25 flex-shrink-0">{d.field}:</span>
                  <span className="text-white/50 line-clamp-2">{d.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
