"use client";

import type { ValidationReport } from "@/lib/types";
import { TOLLGATE_NAMES, TOLLGATE_WEIGHTS } from "@/lib/validator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle, AlertTriangle, Info, CheckCircle2,
  Shield, TrendingUp,
} from "lucide-react";

function gradeColor(grade: string) {
  switch (grade) {
    case "A": return "text-emerald-400";
    case "B": return "text-blue-400";
    case "C": return "text-amber-400";
    case "D": return "text-orange-400";
    default: return "text-red-400";
  }
}

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  if (score >= 50) return "text-orange-400";
  return "text-red-400";
}

function progressColor(score: number) {
  if (score >= 90) return "[&>div]:bg-emerald-500";
  if (score >= 70) return "[&>div]:bg-amber-500";
  if (score >= 50) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-red-500";
}

function severityIcon(severity: string) {
  switch (severity) {
    case "error": return <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />;
    case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />;
    default: return <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />;
  }
}

export function ValidationReportView({ report }: { report: ValidationReport }) {
  return (
    <div className="space-y-4">
      {/* Score Overview */}
      <div className="rounded-xl border border-white/8 bg-[#111] p-6">
        <div className="flex items-center gap-8">
          {/* Score ring */}
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={report.overall_score >= 90 ? "#34D399" : report.overall_score >= 70 ? "#FBBF24" : "#EF4444"}
                strokeWidth="6"
                strokeDasharray={`${report.overall_score * 2.64} 264`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold tabular-nums ${scoreColor(report.overall_score)}`}>
                {report.overall_score}
              </span>
              <span className="text-[10px] text-white/30">/ 100</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${gradeColor(report.grade)}`}>{report.grade}</span>
              <Badge
                variant={report.passed ? "default" : "destructive"}
                className={`text-[11px] ${report.passed ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : ""}`}
              >
                {report.passed ? "PASSED" : "FAILED"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-white/40">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                {report.passed_checks}/{report.total_checks} checks
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                {report.remediations.length} suggestions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tollgate Breakdown */}
      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
        <h3 className="text-sm font-medium text-white/70">Tollgate Breakdown</h3>
        {report.tollgate_results.map((t) => (
          <div key={t.tollgate_number} className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 text-white/70">
                {t.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                )}
                {t.name}
                <span className="text-white/25 text-[11px]">
                  {Math.round((TOLLGATE_WEIGHTS[t.tollgate_number] || 0.2) * 100)}%
                </span>
              </span>
              <span className={`tabular-nums font-medium ${scoreColor(t.score)}`}>{t.score}</span>
            </div>
            <Progress value={t.score} className={`h-1.5 bg-white/5 ${progressColor(t.score)}`} />
          </div>
        ))}
      </div>

      {/* Remediations */}
      {report.remediations.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-3">
          <h3 className="text-sm font-medium text-white/70">
            Recommendations
            <span className="text-white/25 ml-2 font-normal">({report.remediations.length})</span>
          </h3>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
            {report.remediations.map((r, i) => (
              <div key={i} className="flex gap-2.5 text-[13px] py-1.5">
                {severityIcon(r.severity)}
                <div className="space-y-0.5 min-w-0">
                  <div className="text-white/60">{r.message}</div>
                  {r.location && (
                    <div className="text-[11px] text-white/25 font-mono">{r.location}</div>
                  )}
                  {r.suggested_fix && (
                    <div className="text-[11px] text-emerald-400/60">{r.suggested_fix}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
