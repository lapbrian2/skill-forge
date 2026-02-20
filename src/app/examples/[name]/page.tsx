"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Package, ChevronRight } from "lucide-react";
import { getExample, EXAMPLES_INDEX } from "@/lib/examples";
import { validateSpec } from "@/lib/validator";
import { ValidationReportView } from "@/components/validation-report";
import { saveSkill } from "@/lib/storage";
import { toast } from "sonner";

const FW_COLORS: Record<string, string> = {
  claude: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  mcp: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  crewai: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  langchain: "text-green-400 bg-green-400/10 border-green-400/20",
};

export default function ExampleDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const router = useRouter();
  const spec = getExample(name);
  const meta = EXAMPLES_INDEX.find(e => e.name === name);

  if (!spec || !meta) {
    return (
      <div className="text-center py-20 space-y-4">
        <h1 className="text-xl font-bold text-white/60">Example not found</h1>
        <Button variant="outline" size="sm" onClick={() => router.push("/examples")} className="border-white/10">
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
        </Button>
      </div>
    );
  }

  const report = validateSpec(spec);

  const handleUseAsTemplate = () => {
    saveSkill({ ...spec, name: `my-${spec.name}`, author: "" });
    toast.success("Saved as template! Redirecting...");
    setTimeout(() => router.push("/"), 600);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    toast.success("Copied JSON");
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px] text-white/30">
        <button onClick={() => router.push("/examples")} className="hover:text-white/60 transition-colors">
          Examples
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white/50">{spec.display_name || spec.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{spec.display_name || spec.name}</h1>
          <p className="text-[14px] text-white/40 max-w-lg">{spec.description}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-2 ${FW_COLORS[meta.framework] || ""}`}>
              {meta.framework}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-2 text-white/40 border-white/10">{meta.complexity}</Badge>
            <Badge variant="outline" className="text-[10px] px-2 text-white/30 border-white/8">v{spec.version}</Badge>
            {meta.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-2 text-white/20 border-white/8">{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopyJson} className="border-white/10 text-[12px]">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy JSON
          </Button>
          <Button size="sm" onClick={handleUseAsTemplate} className="bg-orange-500 hover:bg-orange-600 text-black font-medium text-[12px]">
            <Package className="h-3.5 w-3.5 mr-1.5" /> Use as Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {spec.problem_statement && (
            <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-2">
              <h3 className="text-sm font-medium text-white/70">Problem Statement</h3>
              <p className="text-[13px] text-white/50">{spec.problem_statement}</p>
            </div>
          )}

          <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-3">
            <h3 className="text-sm font-medium text-white/70">Capabilities ({spec.capabilities.length})</h3>
            {spec.capabilities.map((cap) => (
              <div key={cap.name} className="space-y-1 py-2 border-b border-white/5 last:border-0">
                <div className="text-[13px] font-medium text-white/80">{cap.name}</div>
                <div className="text-[12px] text-white/40">{cap.description}</div>
                {cap.parameters && cap.parameters.length > 0 && (
                  <div className="text-[11px] text-white/25 font-mono">
                    {cap.parameters.map(p => `${p.name}: ${p.type}`).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          {spec.examples && spec.examples.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-3">
              <h3 className="text-sm font-medium text-white/70">Examples ({spec.examples.length})</h3>
              {spec.examples.map((ex, i) => (
                <div key={i} className="rounded-lg bg-[#0A0A0A] p-3 space-y-1.5 text-[12px]">
                  <div className="text-white/40">
                    <span className="text-white/20 font-mono">in:</span>{" "}
                    {typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input)}
                  </div>
                  <div className="text-emerald-400/60">
                    <span className="text-emerald-400/30 font-mono">out:</span>{" "}
                    {typeof ex.expected_output === "string" ? ex.expected_output : JSON.stringify(ex.expected_output)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column — validation */}
        <ValidationReportView report={report} />
      </div>
    </div>
  );
}
