"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateAll, FRAMEWORK_INFO } from "@/lib/generators";
import type { SkillSpec, GeneratedFile } from "@/lib/types";
import { Package, Copy, Check, AlertCircle } from "lucide-react";

function BuildContent() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const specParam = searchParams.get("spec");
    if (specParam) {
      try {
        setInput(decodeURIComponent(specParam));
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  const handleBuild = () => {
    setError("");
    setFiles([]);
    try {
      const spec: SkillSpec = JSON.parse(input);
      const generated = generateAll(spec);
      setFiles(generated);
    } catch {
      setError("Invalid JSON. Please paste a valid SkillSpec.");
    }
  };

  const handleCopy = (content: string, filename: string) => {
    navigator.clipboard.writeText(content);
    setCopied(filename);
    setTimeout(() => setCopied(null), 2000);
  };

  const grouped = files.reduce<Record<string, GeneratedFile[]>>((acc, f) => {
    (acc[f.framework] = acc[f.framework] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Code</h1>
        <p className="text-muted-foreground mt-1">
          Generate framework-specific code from a SkillSpec
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">SkillSpec JSON</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your SkillSpec JSON here..."
            className="font-mono text-sm min-h-[150px]"
          />
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <Button onClick={handleBuild} disabled={!input.trim()}>
            <Package className="h-4 w-4 mr-2" /> Generate All Frameworks
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(grouped)[0]}>
              <TabsList>
                {Object.keys(grouped).map(fw => (
                  <TabsTrigger key={fw} value={fw}>
                    {FRAMEWORK_INFO[fw]?.name || fw}
                    <Badge variant="secondary" className="ml-2 text-xs">{grouped[fw].length}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(grouped).map(([fw, fwFiles]) => (
                <TabsContent key={fw} value={fw} className="space-y-4 mt-4">
                  {fwFiles.map(f => (
                    <div key={f.filename} className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                        <span className="text-sm font-medium">{f.filename}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(f.content, f.filename)}>
                          {copied === f.filename ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <pre className="p-4 text-sm overflow-x-auto max-h-[400px] font-mono">{f.content}</pre>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuildContent />
    </Suspense>
  );
}
