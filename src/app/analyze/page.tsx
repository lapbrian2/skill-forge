"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { validateSpec } from "@/lib/validator";
import { ValidationReportView } from "@/components/validation-report";
import type { ValidationReport as VR, SkillSpec } from "@/lib/types";
import { Search, AlertCircle, FileText, Server, Users, Link as LinkIcon, Braces } from "lucide-react";
import { toast } from "sonner";

const FW_META: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  mcp: { label: "MCP (FastMCP)", icon: Server, color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  crewai: { label: "CrewAI", icon: Users, color: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
  langchain: { label: "LangChain", icon: LinkIcon, color: "text-green-400 border-green-400/30 bg-green-400/10" },
  claude: { label: "Claude SKILL.md", icon: FileText, color: "text-orange-400 border-orange-400/30 bg-orange-400/10" },
  json: { label: "SkillSpec JSON", icon: Braces, color: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  unknown: { label: "Unknown Format", icon: AlertCircle, color: "text-white/40 border-white/10 bg-white/5" },
};

function detectFramework(content: string): string {
  if (content.includes("@mcp.tool") || content.includes("FastMCP")) return "mcp";
  if (content.includes("@tool(") || content.includes("crewai") || content.includes("CrewAI")) return "crewai";
  if (content.includes("BaseTool") || content.includes("langchain") || content.includes("LangChain")) return "langchain";
  if (content.startsWith("#") || content.includes("## Capabilities") || content.includes("## Description")) return "claude";
  try { JSON.parse(content); return "json"; } catch { /* not json */ }
  return "unknown";
}

export default function AnalyzePage() {
  const [input, setInput] = useState("");
  const [framework, setFramework] = useState<string | null>(null);
  const [report, setReport] = useState<VR | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = () => {
    setError("");
    setReport(null);
    setFramework(null);

    if (!input.trim()) {
      setError("Paste some skill code or a SkillSpec JSON.");
      return;
    }

    const detected = detectFramework(input);
    setFramework(detected);

    try {
      const spec: SkillSpec = JSON.parse(input);
      if (spec.name && spec.description) {
        setReport(validateSpec(spec));
        toast.success(`Detected ${FW_META[detected]?.label || detected} — validation complete`);
        return;
      }
    } catch { /* not json */ }

    if (detected === "unknown") {
      setError("Could not identify the framework. Paste valid SkillSpec JSON for full analysis.");
    } else {
      setError(`Detected ${FW_META[detected]?.label} format, but only SkillSpec JSON can be fully validated. Convert to JSON first.`);
    }
  };

  const fw = framework ? FW_META[framework] : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Analyze</h1>
        <p className="text-[14px] text-white/40">
          Paste existing skill code to detect its framework and validate quality
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a SKILL.md, server.py, agent_config.yaml, tool.py, or SkillSpec JSON..."
          className="font-mono text-[13px] min-h-[180px] bg-[#0A0A0A] border-white/8 placeholder:text-white/20 resize-none"
        />

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-[13px]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={!input.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-black font-medium"
          >
            <Search className="h-4 w-4 mr-2" /> Analyze
          </Button>

          {fw && (
            <Badge variant="outline" className={`text-[12px] px-2.5 py-1 ${fw.color}`}>
              <fw.icon className="h-3 w-3 mr-1.5" />
              {fw.label}
            </Badge>
          )}
        </div>
      </div>

      {report && <ValidationReportView report={report} />}
    </div>
  );
}
