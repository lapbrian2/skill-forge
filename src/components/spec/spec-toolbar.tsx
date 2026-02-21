"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Spec Toolbar
// Actions: copy, download, toggle view mode, stats display.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Copy, Check, Download, Eye, Code2, FileText,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────

type ViewMode = "preview" | "raw";

interface SpecToolbarProps {
  content: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  wordCount: number;
  sectionCount: number;
  validationGrade?: string;
  validationScore?: number;
  isStreaming?: boolean;
  projectName?: string;
}

// ── Component ─────────────────────────────────────────────────

export function SpecToolbar({
  content,
  viewMode,
  onViewModeChange,
  wordCount,
  sectionCount,
  validationGrade,
  validationScore,
  isStreaming = false,
  projectName = "spec",
}: SpecToolbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Spec copied to clipboard! Paste into Claude Code.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}-spec.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Spec downloaded!");
  }, [content, projectName]);

  const gradeColor = validationGrade
    ? validationGrade === "A" ? "text-emerald-400"
      : validationGrade === "B" ? "text-lime-400"
        : validationGrade === "C" ? "text-amber-400"
          : "text-red-400"
    : "";

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 py-3 px-1">
      {/* Left: Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleCopy}
          disabled={!content}
          className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-8 text-[12px] gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Spec
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleDownload}
          disabled={!content}
          className="border-white/10 h-8 text-[12px] gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download .md
        </Button>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-white/8 overflow-hidden ml-2">
          <button
            onClick={() => onViewModeChange("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
              viewMode === "preview"
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
          <button
            onClick={() => onViewModeChange("raw")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
              viewMode === "raw"
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            <Code2 className="h-3 w-3" />
            Raw
          </button>
        </div>
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-4 text-[11px] text-white/25">
        {validationGrade && (
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-bold ${gradeColor}`}>
              {validationGrade}
            </span>
            {validationScore !== undefined && (
              <span className="text-white/20">{validationScore}/100</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span>{sectionCount} sections</span>
        </div>

        <span>{wordCount.toLocaleString()} words</span>

        {isStreaming && (
          <span className="text-orange-400/60 animate-pulse">generating...</span>
        )}
      </div>
    </div>
  );
}
