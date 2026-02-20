"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { validateSpec, autoFix } from "@/lib/validator";
import { ValidationReportView } from "@/components/validation-report";
import type { ValidationReport as VR } from "@/lib/types";
import { CheckCircle, AlertCircle, Wand2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { EXAMPLES_INDEX, getExample } from "@/lib/examples";

function ValidateContent() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [report, setReport] = useState<VR | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const specParam = searchParams.get("spec");
    if (specParam) {
      try {
        setInput(decodeURIComponent(specParam));
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  const handleValidate = () => {
    setError("");
    setReport(null);
    try {
      const spec = JSON.parse(input);
      const r = validateSpec(spec);
      setReport(r);
      toast.success(`Score: ${r.overall_score} (${r.grade})`);
    } catch {
      setError("Invalid JSON. Paste a valid SkillSpec JSON object.");
    }
  };

  const handleAutoFix = () => {
    try {
      const spec = JSON.parse(input);
      const fixed = autoFix(spec);
      setInput(JSON.stringify(fixed, null, 2));
      toast.success("Auto-fix applied");
    } catch {
      setError("Cannot auto-fix invalid JSON.");
    }
  };

  const handleLoadExample = () => {
    const ex = EXAMPLES_INDEX[0];
    const spec = getExample(ex.name);
    if (spec) {
      setInput(JSON.stringify(spec, null, 2));
      toast.success(`Loaded "${ex.display_name}" example`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Validate</h1>
        <p className="text-[14px] text-white/40">
          Run the 5-tollgate LSSBB validation pipeline on your SkillSpec
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"name": "my-skill", "description": "...", "version": "1.0.0", "capabilities": [...]}'
          className="font-mono text-[13px] min-h-[180px] bg-[#0A0A0A] border-white/8 placeholder:text-white/20 resize-none"
        />
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-[13px]">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleValidate}
            disabled={!input.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-black font-medium"
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Validate
          </Button>
          <Button variant="outline" size="sm" onClick={handleAutoFix} disabled={!input.trim()}>
            <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Auto-Fix
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLoadExample}>
            <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Load Example
          </Button>
        </div>
      </div>

      {report && <ValidationReportView report={report} />}
    </div>
  );
}

export default function ValidatePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    }>
      <ValidateContent />
    </Suspense>
  );
}
