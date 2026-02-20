"use client";

import type { ValidationReport } from "@/lib/types";
import { TOLLGATE_NAMES, TOLLGATE_WEIGHTS } from "@/lib/validator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-green-400";
    case "B": return "text-blue-400";
    case "C": return "text-yellow-400";
    case "D": return "text-orange-400";
    default: return "text-red-400";
  }
}

function scoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-yellow-400";
  if (score >= 50) return "text-orange-400";
  return "text-red-400";
}

function severityIcon(severity: string) {
  switch (severity) {
    case "error": return <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />;
    default: return <Info className="h-4 w-4 text-blue-400 shrink-0" />;
  }
}

export function ValidationReportView({ report }: { report: ValidationReport }) {
  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-5xl font-bold ${scoreColor(report.overall_score)}`}>
                  {report.overall_score}
                </div>
                <div className="text-sm text-muted-foreground mt-1">out of 100</div>
              </div>
              <div className="text-center">
                <div className={`text-5xl font-bold ${gradeColor(report.grade)}`}>
                  {report.grade}
                </div>
                <div className="text-sm text-muted-foreground mt-1">grade</div>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={report.passed ? "default" : "destructive"} className="text-sm">
                {report.passed ? "PASSED" : "FAILED"}
              </Badge>
              <div className="text-sm text-muted-foreground mt-2">
                {report.passed_checks}/{report.total_checks} checks passed
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tollgate Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tollgate Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.tollgate_results.map((t) => (
            <div key={t.tollgate_number} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {t.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  {t.name}
                  <span className="text-muted-foreground">
                    ({Math.round((TOLLGATE_WEIGHTS[t.tollgate_number] || 0.2) * 100)}%)
                  </span>
                </span>
                <span className={scoreColor(t.score)}>{t.score}/100</span>
              </div>
              <Progress value={t.score} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {t.passed_count}/{t.passed_count + t.failed_count} checks passed
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Remediations */}
      {report.remediations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Recommendations ({report.remediations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.remediations.map((r, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  {severityIcon(r.severity)}
                  <div>
                    <div>{r.message}</div>
                    {r.location && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Location: {r.location}
                      </div>
                    )}
                    {r.suggested_fix && (
                      <div className="text-xs text-green-400/70 mt-0.5">
                        Fix: {r.suggested_fix}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
