"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Copy, Package } from "lucide-react";
import { getExample, EXAMPLES_INDEX } from "@/lib/examples";
import { validateSpec } from "@/lib/validator";
import { ValidationReportView } from "@/components/validation-report";
import { saveSkill } from "@/lib/storage";

export default function ExampleDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const router = useRouter();
  const spec = getExample(name);
  const meta = EXAMPLES_INDEX.find(e => e.name === name);

  if (!spec || !meta) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold">Example not found</h1>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/examples")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Examples
        </Button>
      </div>
    );
  }

  const report = validateSpec(spec);

  const handleUseAsTemplate = () => {
    saveSkill({ ...spec, name: `my-${spec.name}`, author: "" });
    router.push("/");
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/examples")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Examples
      </Button>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{spec.display_name || spec.name}</h1>
          <p className="text-muted-foreground mt-1">{spec.description}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="secondary">{meta.framework}</Badge>
            <Badge variant="outline">{meta.complexity}</Badge>
            <Badge variant="outline">v{spec.version}</Badge>
            {meta.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleCopyJson}>
            <Copy className="h-4 w-4 mr-2" /> Copy JSON
          </Button>
          <Button onClick={handleUseAsTemplate}>
            <Package className="h-4 w-4 mr-2" /> Use as Template
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {spec.problem_statement && (
            <Card>
              <CardHeader><CardTitle className="text-base">Problem Statement</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{spec.problem_statement}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Capabilities ({spec.capabilities.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {spec.capabilities.map((cap) => (
                <div key={cap.name}>
                  <div className="font-medium text-sm">{cap.name}</div>
                  <div className="text-sm text-muted-foreground">{cap.description}</div>
                  {cap.parameters && cap.parameters.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Params: {cap.parameters.map(p => `${p.name} (${p.type})`).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {spec.examples && spec.examples.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Examples</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {spec.examples.map((ex, i) => (
                  <div key={i} className="text-sm">
                    <div className="text-muted-foreground">Input: {typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input)}</div>
                    <div className="text-green-400/80 mt-0.5">Expected: {typeof ex.expected_output === "string" ? ex.expected_output : JSON.stringify(ex.expected_output)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <ValidationReportView report={report} />
      </div>
    </div>
  );
}
