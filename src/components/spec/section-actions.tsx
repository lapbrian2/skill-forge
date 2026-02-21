"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Section Actions
// Per-section action buttons for regeneration and copying.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────

interface SectionActionsProps {
  sectionNumber: number;
  sectionTitle: string;
  sectionContent: string;
  isRegenerating: boolean;
  onRegenerate: (sectionNumber: number) => void;
}

// ── Component ─────────────────────────────────────────────────

export function SectionActions({
  sectionNumber,
  sectionTitle,
  sectionContent,
  isRegenerating,
  onRegenerate,
}: SectionActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sectionContent);
      setCopied(true);
      toast.success(`Section ${sectionNumber} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [sectionContent, sectionNumber]);

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onRegenerate(sectionNumber)}
        disabled={isRegenerating}
        className="h-6 px-2 text-[10px] text-white/30 hover:text-orange-400 hover:bg-orange-500/10 gap-1"
        title={`Regenerate section ${sectionNumber}: ${sectionTitle}`}
      >
        {isRegenerating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        Regen
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopy}
        className="h-6 px-2 text-[10px] text-white/30 hover:text-white/60 hover:bg-white/5 gap-1"
        title="Copy this section"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
