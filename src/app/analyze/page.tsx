"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { validateSpec } from "@/lib/validator";
import { ValidationReportView } from "@/components/validation-report";
import type { ValidationReport as VR } from "@/lib/types";
import { Search, AlertCircle } from "lucide-react";

function detectFramework(content: string): string {
  if (content.includes("@mcp.tool") || content.includes("FastMCP")) return "mcp";
  if (content.includes("@tool(") || content.includes("crewai")) return "crewai";
  if (content.includes("BaseTool") || content.includes("langchain")) return "langchain";
  if (content.startsWith("#") || content.includes("## Capabilities")) return "claude";
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
      setError("Please paste some skill code or a SkillSpec JSON.");
      return;
    }

    const detected = detectFramework(input);
    setFramework(detected);

    try {
      const spec = JSON.parse(input);
      if (spec.name && spec.description) {
        setReport(validateSpec(spec));
        return;
      }
    } catch { /* not json */ }

    setError("Could not extract a SkillSpec from the input. Try pasting valid SkillSpec JSON for full analysis.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analyze Skill</h1>
        <p className="text-muted-foreground mt-1">
          Paste existing skill code or a SkillSpec JSON to analyze and get improvement suggestions
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Skill Code or JSON</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a SKILL.md, server.py, agent_config.yaml, tool.py, or SkillSpec JSON..."
            className="font-mono text-sm min-h-[200px]"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <Button onClick={handleAnalyze} disabled={!input.trim()}>
            <Search className="h-4 w-4 mr-2" /> Analyze
          </Button>
        </CardContent>
      </Card>

      {framework && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Detected framework:</span>
              <Badge variant="secondary">{framework}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {report && <ValidationReportView report={report} />}
    </div>
  );
}
