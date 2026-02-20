"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { validateSpec } from "@/lib/validator";
import { ValidationReportView } from "@/components/validation-report";
import type { ValidationReport as VR } from "@/lib/types";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function ValidatePage() {
  const [input, setInput] = useState("");
  const [report, setReport] = useState<VR | null>(null);
  const [error, setError] = useState("");

  const handleValidate = () => {
    setError("");
    setReport(null);
    try {
      const spec = JSON.parse(input);
      const r = validateSpec(spec);
      setReport(r);
    } catch {
      setError("Invalid JSON. Please paste a valid SkillSpec JSON object.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Validate Skill Spec</h1>
        <p className="text-muted-foreground mt-1">
          Paste a SkillSpec JSON to run the 5-tollgate validation pipeline
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SkillSpec JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'{"name": "my-skill", "description": "...", "version": "1.0.0", "capabilities": [...]}'}
            className="font-mono text-sm min-h-[200px]"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <Button onClick={handleValidate} disabled={!input.trim()}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Run Validation
          </Button>
        </CardContent>
      </Card>

      {report && <ValidationReportView report={report} />}
    </div>
  );
}
