"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateAll, FRAMEWORK_INFO } from "@/lib/generators";
import type { SkillSpec, GeneratedFile } from "@/lib/types";
import {
  Package, Copy, Check, AlertCircle, Download, FileText,
  Server, Users, Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const FW_ICONS: Record<string, typeof FileText> = {
  claude: FileText, mcp: Server, crewai: Users, langchain: LinkIcon,
};

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
      toast.success(`Generated ${generated.length} files across ${new Set(generated.map(f => f.framework)).size} frameworks`);
    } catch {
      setError("Invalid JSON. Paste a valid SkillSpec.");
    }
  };

  const handleCopy = (content: string, filename: string) => {
    navigator.clipboard.writeText(content);
    setCopied(filename);
    toast.success(`Copied ${filename}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadZip = useCallback(async () => {
    const zip = new JSZip();
    for (const f of files) {
      zip.file(`${f.framework}/${f.filename}`, f.content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    try {
      const spec: SkillSpec = JSON.parse(input);
      saveAs(blob, `${spec.name || "skill"}-generated.zip`);
    } catch {
      saveAs(blob, "skill-generated.zip");
    }
    toast.success("Downloaded ZIP");
  }, [files, input]);

  const grouped = files.reduce<Record<string, GeneratedFile[]>>((acc, f) => {
    (acc[f.framework] = acc[f.framework] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Generate Code</h1>
        <p className="text-[14px] text-white/40">
          Transform a SkillSpec into production-ready framework code
        </p>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"name": "my-skill", "version": "1.0.0", "description": "...", "capabilities": [...]}'
          className="font-mono text-[13px] min-h-[140px] bg-[#0A0A0A] border-white/8 placeholder:text-white/20 resize-none"
        />
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-[13px]">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </div>
        )}
        <Button
          onClick={handleBuild}
          disabled={!input.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-black font-medium"
        >
          <Package className="h-4 w-4 mr-2" /> Generate All Frameworks
        </Button>
      </div>

      {/* Output */}
      {files.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
            <span className="text-sm font-medium text-white/70">
              Generated {files.length} files
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadZip}
              className="text-xs h-8 border-white/10"
            >
              <Download className="h-3 w-3 mr-1.5" /> Download ZIP
            </Button>
          </div>

          <Tabs defaultValue={Object.keys(grouped)[0]} className="p-4">
            <TabsList className="bg-white/5 border border-white/8">
              {Object.keys(grouped).map(fw => {
                const Icon = FW_ICONS[fw] || FileText;
                return (
                  <TabsTrigger key={fw} value={fw} className="text-[13px] data-[state=active]:bg-white/10 gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {FRAMEWORK_INFO[fw]?.name || fw}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1 bg-white/8">{grouped[fw].length}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(grouped).map(([fw, fwFiles]) => (
              <TabsContent key={fw} value={fw} className="space-y-3 mt-4">
                {fwFiles.map(f => (
                  <div key={f.filename} className="rounded-lg border border-white/8 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/8">
                      <span className="text-[13px] font-mono text-white/60">{f.filename}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(f.content, f.filename)}
                        className="h-7 px-2 text-white/40 hover:text-white"
                      >
                        {copied === f.filename ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <pre className="p-4 text-[13px] overflow-x-auto max-h-[400px] font-mono text-white/70 leading-relaxed">
                      {f.content}
                    </pre>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
      </div>
    }>
      <BuildContent />
    </Suspense>
  );
}
