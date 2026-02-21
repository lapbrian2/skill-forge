"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Validation Panel
// Displays validation scores, tollgate results, and remediations.
// Supports "Fix with AI" for each remediation.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Sparkles, Loader2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ValidationReport, TollgateResult, Remediation } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────

interface ValidationPanelProps {
  validation: ValidationReport;
  onFixSection?: (sectionNumber: number) => void;
  isFixing?: boolean;
}

// ── Score Ring ─────────────────────────────────────────────────

function ScoreRing({ score, grade, size = 80 }: { score: number; grade: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  const color = score >= 90 ? "#22c55e" :
    score >= 80 ? "#84cc16" :
      score >= 70 ? "#eab308" :
        score >= 60 ? "#f97316" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{grade}</span>
        <span className="text-[10px] text-white/30">{score}/100</span>
      </div>
    </div>
  );
}

// ── Tollgate Bar ──────────────────────────────────────────────

function TollgateBar({ tollgate, weight }: { tollgate: TollgateResult; weight: number }) {
  const [expanded, setExpanded] = useState(false);

  const barColor = tollgate.score >= 80 ? "bg-emerald-500" :
    tollgate.score >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-[12px] hover:bg-white/3 rounded px-1 py-0.5 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-3 w-3 text-white/30" /> : <ChevronRight className="h-3 w-3 text-white/30" />}
          <span className="text-white/60 font-medium">{tollgate.name}</span>
          <span className="text-[10px] text-white/20">({Math.round(weight * 100)}% weight)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40">
            {tollgate.passed_count}/{tollgate.passed_count + tollgate.failed_count}
          </span>
          <span className={`text-[11px] font-mono font-bold ${
            tollgate.score >= 80 ? "text-emerald-400" :
              tollgate.score >= 60 ? "text-amber-400" : "text-red-400"
          }`}>
            {tollgate.score}%
          </span>
        </div>
      </button>

      {/* Score bar */}
      <div className="h-1.5 rounded-full bg-white/5 mx-1">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${tollgate.score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Expanded checks */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pl-6 space-y-1 pt-1"
          >
            {tollgate.checks.map((check) => (
              <div key={check.id} className="flex items-start gap-2 text-[11px]">
                {check.passed ? (
                  <CheckCircle className="h-3 w-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span className={check.passed ? "text-white/40" : "text-white/60"}>
                    {check.description}
                  </span>
                  {check.details && (
                    <p className="text-white/20 text-[10px] mt-0.5">{check.details}</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Remediation Card ──────────────────────────────────────────

function RemediationCard({
  remediation,
  onFix,
  isFixing,
}: {
  remediation: Remediation;
  onFix?: () => void;
  isFixing?: boolean;
}) {
  const icon = remediation.severity === "critical" ? (
    <XCircle className="h-3.5 w-3.5 text-red-400" />
  ) : remediation.severity === "warning" ? (
    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
  ) : (
    <Info className="h-3.5 w-3.5 text-blue-400" />
  );

  return (
    <div className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/20 font-mono">{remediation.section}</span>
          <span className={`text-[9px] uppercase tracking-wider ${
            remediation.severity === "critical" ? "text-red-400" :
              remediation.severity === "warning" ? "text-amber-400" : "text-blue-400"
          }`}>
            {remediation.severity}
          </span>
        </div>
        <p className="text-[11px] text-white/50 mt-0.5">{remediation.message}</p>
      </div>
      {onFix && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onFix}
          disabled={isFixing}
          className="h-6 px-2 text-[10px] text-orange-400/70 hover:text-orange-400 hover:bg-orange-500/10 flex-shrink-0 gap-1"
        >
          {isFixing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Fix
        </Button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export function ValidationPanel({ validation, onFixSection, isFixing }: ValidationPanelProps) {
  const handleFix = useCallback((remediation: Remediation) => {
    if (!onFixSection) return;
    // Extract section number from remediation
    const sectionMatch = remediation.section.match(/Section (\d+)/);
    if (sectionMatch) {
      onFixSection(parseInt(sectionMatch[1], 10));
    }
  }, [onFixSection]);

  return (
    <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
      {/* Header with score */}
      <div className="p-5 flex items-center gap-6 border-b border-white/5">
        <ScoreRing
          score={validation.overall_score}
          grade={validation.grade}
        />
        <div className="space-y-2 flex-1">
          <h3 className="text-[14px] font-semibold">Quality Score</h3>
          <div className="space-y-2">
            <TollgateBar
              tollgate={validation.tollgate_4}
              weight={0.6}
            />
            <TollgateBar
              tollgate={validation.tollgate_5}
              weight={0.4}
            />
          </div>
        </div>
      </div>

      {/* Remediations */}
      {validation.remediations.length > 0 && (
        <div className="px-5 py-3">
          <h4 className="text-[11px] text-white/25 uppercase tracking-wider font-semibold mb-2">
            Issues ({validation.remediations.length})
          </h4>
          <div>
            {validation.remediations.map((r, i) => (
              <RemediationCard
                key={i}
                remediation={r}
                onFix={onFixSection ? () => handleFix(r) : undefined}
                isFixing={isFixing}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clean report */}
      {validation.remediations.length === 0 && (
        <div className="px-5 py-4 flex items-center gap-2 text-[12px] text-emerald-400/70">
          <CheckCircle className="h-4 w-4" />
          No issues found. Spec is ready to use.
        </div>
      )}
    </div>
  );
}
