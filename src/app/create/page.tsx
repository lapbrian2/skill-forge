"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { validateSpec, autoFix } from "@/lib/validator";
import { buildSpecFromDescription, enhanceSpec } from "@/lib/spec-builder";
import { saveSkill, saveDraft, loadDraft, clearDraft } from "@/lib/storage";
import { createEmptySpec } from "@/lib/types";
import type { SkillSpec, Capability, Parameter } from "@/lib/types";
import {
  Sparkles, Wand2, Save, ChevronDown, ChevronRight,
  Plus, Trash2, CheckCircle, ArrowRight, Eye, Code,
  Zap, FileText, Server, Users, Link as LinkIcon,
  RotateCcw, Copy, Package,
} from "lucide-react";
import { toast } from "sonner";

/* ── Quick-start examples ── */
const STARTERS = [
  { label: "Code Reviewer", desc: "Review pull requests for bugs, security issues, and code quality" },
  { label: "Email Summarizer", desc: "Summarize long email threads into key action items" },
  { label: "Data Cleaner", desc: "Clean and validate CSV data, fix formatting issues, remove duplicates" },
  { label: "API Monitor", desc: "Monitor REST API endpoints for uptime and response time changes" },
  { label: "Meeting Notes", desc: "Extract action items and decisions from meeting transcripts" },
  { label: "File Organizer", desc: "Organize and rename files in a directory based on content and type" },
];

const FW_ICONS: Record<string, typeof FileText> = {
  claude: FileText, mcp: Server, crewai: Users, langchain: LinkIcon,
};

const FW_COLORS: Record<string, string> = {
  claude: "text-orange-400 border-orange-400/30",
  mcp: "text-blue-400 border-blue-400/30",
  crewai: "text-purple-400 border-purple-400/30",
  langchain: "text-green-400 border-green-400/30",
};

const CX_COLORS: Record<string, string> = {
  simple: "text-emerald-400",
  moderate: "text-amber-400",
  complex: "text-red-400",
};

/* ── Collapsible Section ── */
function Section({
  title, count, defaultOpen = false, children
}: {
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-white/30" /> : <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
          <span className="text-[14px] font-medium text-white/80">{title}</span>
          {count !== undefined && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-white/40 border-white/10">{count}</Badge>
          )}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Score Bar ── */
function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500";
  const grade = score >= 95 ? "A+" : score >= 90 ? "A" : score >= 85 ? "B+" : score >= 80 ? "B" : score >= 70 ? "C" : "D";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={`text-[14px] font-bold ${score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400"}`}>
        {score} ({grade})
      </span>
    </div>
  );
}

/* ── Main Page ── */
export default function CreatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"describe" | "refine">("describe");
  const [description, setDescription] = useState("");
  const [spec, setSpec] = useState<SkillSpec>(createEmptySpec);
  const [saved, setSaved] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.name) {
      setSpec({ ...createEmptySpec(), ...draft } as SkillSpec);
      setMode("refine");
    }
  }, []);

  // Auto-save draft when refining
  useEffect(() => {
    if (mode === "refine" && (spec.name || spec.description)) {
      saveDraft(spec);
    }
  }, [spec, mode]);

  const update = (patch: Partial<SkillSpec>) => setSpec(prev => ({ ...prev, ...patch }));

  /* Build spec from description */
  const handleBuild = () => {
    if (!description.trim()) {
      toast.error("Describe what your skill should do");
      return;
    }
    setIsBuilding(true);
    // Small delay for visual feedback
    setTimeout(() => {
      const generated = buildSpecFromDescription(description.trim());
      setSpec(generated);
      setMode("refine");
      setIsBuilding(false);
      toast.success("Skill architecture generated!");
    }, 400);
  };

  /* Auto-enhance the current spec */
  const handleEnhance = () => {
    const enhanced = enhanceSpec(spec);
    const fixed = autoFix(enhanced);
    setSpec(fixed);
    toast.success("Spec enhanced and auto-fixed");
  };

  /* Save final skill */
  const handleSave = () => {
    if (!spec.name.trim()) {
      toast.error("Skill name is required");
      return;
    }
    saveSkill(spec);
    clearDraft();
    setSaved(true);
    toast.success("Skill saved!");
    setTimeout(() => router.push("/"), 800);
  };

  /* Start over */
  const handleReset = () => {
    setMode("describe");
    setDescription("");
    setSpec(createEmptySpec());
    clearDraft();
    toast("Starting fresh");
  };

  const report = mode === "refine" ? validateSpec(spec) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-400" />
            <h1 className="text-2xl font-bold tracking-tight">Create Skill</h1>
          </div>
          <p className="text-[14px] text-white/40">
            {mode === "describe"
              ? "Describe what you want in plain English"
              : "Fine-tune your generated skill"}
          </p>
        </div>
        {mode === "refine" && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowJson(!showJson)}
              className="text-[12px] text-white/40"
            >
              {showJson ? <Code className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {showJson ? "Editor" : "JSON"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-[12px] text-white/40"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Start Over
            </Button>
          </div>
        )}
      </div>

      {/* ══════ DESCRIBE MODE ══════ */}
      {mode === "describe" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Main input */}
          <div className="rounded-xl border border-white/8 bg-[#111] p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[14px] text-white/60 font-medium">
                What should your skill do?
              </Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Example: Review pull requests for bugs, security vulnerabilities, and code quality issues. Output a structured report with severity ratings."
                className="bg-[#0A0A0A] border-white/8 text-[14px] min-h-[120px] resize-none placeholder:text-white/20 leading-relaxed"
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild();
                }}
              />
              <p className="text-[11px] text-white/20">
                Be as detailed or brief as you like. The system fills in everything else.
              </p>
            </div>

            <Button
              onClick={handleBuild}
              disabled={!description.trim() || isBuilding}
              className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-11 px-6 text-[14px]"
            >
              {isBuilding ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2"
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  Building...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" /> Build My Skill
                </>
              )}
            </Button>
          </div>

          {/* Quick starts */}
          <div className="space-y-3">
            <span className="text-[12px] text-white/25 uppercase tracking-wider font-medium">
              Quick Start Templates
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {STARTERS.map(s => (
                <button
                  key={s.label}
                  onClick={() => setDescription(s.desc)}
                  className="group text-left rounded-lg border border-white/6 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12 transition-all p-3 space-y-1"
                >
                  <span className="text-[13px] font-medium text-white/70 group-hover:text-white/90 transition-colors">
                    {s.label}
                  </span>
                  <p className="text-[11px] text-white/30 line-clamp-2">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Manual escape hatch */}
          <div className="text-center pt-2">
            <button
              onClick={() => setMode("refine")}
              className="text-[12px] text-white/20 hover:text-white/40 transition-colors"
            >
              or build manually from scratch <ArrowRight className="h-3 w-3 inline ml-0.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ══════ REFINE MODE ══════ */}
      {mode === "refine" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Score bar */}
          {report && (
            <div className="rounded-xl border border-white/8 bg-[#111] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/40">Quality Score</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEnhance}
                    className="text-[11px] h-7 text-orange-400 hover:text-orange-300"
                  >
                    <Wand2 className="h-3 w-3 mr-1" /> Auto-Enhance
                  </Button>
                </div>
              </div>
              <ScoreBar score={report.overall_score} />
              {report.remediations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {report.remediations.slice(0, 3).map((r, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] text-amber-400/70 border-amber-400/15">
                      {r.message.slice(0, 50)}{r.message.length > 50 ? "..." : ""}
                    </Badge>
                  ))}
                  {report.remediations.length > 3 && (
                    <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">
                      +{report.remediations.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {showJson ? (
            /* JSON preview */
            <div className="rounded-xl border border-white/8 bg-[#111] p-5">
              <pre className="text-[13px] font-mono text-white/60 overflow-auto max-h-[500px] whitespace-pre-wrap">
                {JSON.stringify(spec, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              {/* Identity */}
              <Section title="Identity" defaultOpen={true}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/40">Name</Label>
                    <Input
                      value={spec.name}
                      onChange={e => update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
                      className="bg-[#0A0A0A] border-white/8 text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/40">Display Name</Label>
                    <Input
                      value={spec.display_name || ""}
                      onChange={e => update({ display_name: e.target.value })}
                      className="bg-[#0A0A0A] border-white/8 text-[13px]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-white/40">Description</Label>
                  <Textarea
                    value={spec.description}
                    onChange={e => update({ description: e.target.value })}
                    className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[60px] resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/40">Complexity</Label>
                    <div className="flex gap-1">
                      {(["simple", "moderate", "complex"] as const).map(c => (
                        <Button
                          key={c}
                          variant="ghost"
                          size="sm"
                          onClick={() => update({ complexity: c })}
                          className={`text-[11px] h-7 flex-1 ${spec.complexity === c ? `bg-white/10 ${CX_COLORS[c]}` : "text-white/30"}`}
                        >
                          {c}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/40">Version</Label>
                    <Input value={spec.version} onChange={e => update({ version: e.target.value })} className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/40">Author</Label>
                    <Input value={spec.author || ""} onChange={e => update({ author: e.target.value })} placeholder="Your name" className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                  </div>
                </div>
              </Section>

              {/* Problem & Target */}
              <Section title="Problem & Audience">
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-white/40">What problem does this solve?</Label>
                  <Textarea
                    value={spec.problem_statement || ""}
                    onChange={e => update({ problem_statement: e.target.value })}
                    className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[50px] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-white/40">Who is this for?</Label>
                  <Input
                    value={spec.target_user || ""}
                    onChange={e => update({ target_user: e.target.value })}
                    className="bg-[#0A0A0A] border-white/8 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-white/40">When should it activate? (one per line)</Label>
                  <Textarea
                    value={(spec.trigger_patterns || []).join("\n")}
                    onChange={e => update({ trigger_patterns: e.target.value.split("\n").filter(l => l.trim()) })}
                    placeholder={"review this\ncan you review\ncheck this code"}
                    className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[60px] resize-none"
                  />
                </div>
              </Section>

              {/* Capabilities */}
              <Section title="Capabilities" count={spec.capabilities.length} defaultOpen={true}>
                <CapabilitiesEditor capabilities={spec.capabilities} onChange={caps => update({ capabilities: caps })} />
              </Section>

              {/* Inputs & Outputs */}
              <Section title="Inputs & Outputs" count={(spec.inputs?.length || 0) + (spec.outputs?.length || 0)}>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-white/40">Inputs</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => update({ inputs: [...(spec.inputs || []), { name: "", type: "string", description: "", required: true }] })}
                        className="text-[11px] h-6 text-white/30"
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add
                      </Button>
                    </div>
                    {(spec.inputs || []).map((inp, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_1fr_28px] gap-2 items-center mb-2">
                        <Input value={inp.name} onChange={e => { const next = [...(spec.inputs || [])]; next[i] = { ...next[i], name: e.target.value }; update({ inputs: next }); }} placeholder="name" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                        <Input value={inp.type} onChange={e => { const next = [...(spec.inputs || [])]; next[i] = { ...next[i], type: e.target.value }; update({ inputs: next }); }} placeholder="type" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                        <Input value={inp.description} onChange={e => { const next = [...(spec.inputs || [])]; next[i] = { ...next[i], description: e.target.value }; update({ inputs: next }); }} placeholder="description" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                        <Button variant="ghost" size="sm" onClick={() => update({ inputs: (spec.inputs || []).filter((_, idx) => idx !== i) })} className="h-7 w-7 p-0 text-white/20 hover:text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-white/40">Outputs</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => update({ outputs: [...(spec.outputs || []), { name: "", type: "string", description: "" }] })}
                        className="text-[11px] h-6 text-white/30"
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add
                      </Button>
                    </div>
                    {(spec.outputs || []).map((out, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_1fr_28px] gap-2 items-center mb-2">
                        <Input value={out.name} onChange={e => { const next = [...(spec.outputs || [])]; next[i] = { ...next[i], name: e.target.value }; update({ outputs: next }); }} placeholder="name" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                        <Input value={out.type} onChange={e => { const next = [...(spec.outputs || [])]; next[i] = { ...next[i], type: e.target.value }; update({ outputs: next }); }} placeholder="type" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                        <Input value={out.description} onChange={e => { const next = [...(spec.outputs || [])]; next[i] = { ...next[i], description: e.target.value }; update({ outputs: next }); }} placeholder="description" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                        <Button variant="ghost" size="sm" onClick={() => update({ outputs: (spec.outputs || []).filter((_, idx) => idx !== i) })} className="h-7 w-7 p-0 text-white/20 hover:text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Examples */}
              <Section title="Examples" count={(spec.examples || []).length}>
                <div className="space-y-3">
                  {(spec.examples || []).map((ex, i) => (
                    <div key={i} className="rounded-lg border border-white/6 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">#{i + 1}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => update({ examples: (spec.examples || []).filter((_, idx) => idx !== i) })} className="h-6 w-6 p-0 text-white/20 hover:text-red-400">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Textarea
                        value={typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input)}
                        onChange={e => { const next = [...(spec.examples || [])]; next[i] = { ...next[i], input: e.target.value }; update({ examples: next }); }}
                        placeholder="Input"
                        className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[40px] resize-none"
                      />
                      <Textarea
                        value={typeof ex.expected_output === "string" ? ex.expected_output : JSON.stringify(ex.expected_output)}
                        onChange={e => { const next = [...(spec.examples || [])]; next[i] = { ...next[i], expected_output: e.target.value }; update({ examples: next }); }}
                        placeholder="Expected Output"
                        className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[40px] resize-none"
                      />
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update({ examples: [...(spec.examples || []), { input: "", expected_output: "" }] })}
                    className="text-[11px] text-white/30 hover:text-white/50"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Example
                  </Button>
                </div>
              </Section>

              {/* Edge Cases & Error Handling */}
              <Section title="Edge Cases & Error Handling" count={(spec.edge_cases?.length || 0) + (spec.error_handling?.length || 0)}>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/40">Edge Cases (one per line)</Label>
                    <Textarea
                      value={(spec.edge_cases || []).join("\n")}
                      onChange={e => update({ edge_cases: e.target.value.split("\n").filter(l => l.trim()) })}
                      placeholder={"Empty input\nExtremely large files\nSpecial characters in filenames"}
                      className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[60px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[12px] text-white/40">Error Handlers</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => update({ error_handling: [...(spec.error_handling || []), { condition: "", handling: "", user_message: "" }] })}
                        className="text-[11px] h-6 text-white/30"
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add
                      </Button>
                    </div>
                    {(spec.error_handling || []).map((err, i) => (
                      <div key={i} className="rounded-lg border border-white/6 p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-1.5">
                            <Input value={err.condition} onChange={e => { const next = [...(spec.error_handling || [])]; next[i] = { ...next[i], condition: e.target.value }; update({ error_handling: next }); }} placeholder="When this happens..." className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                            <Input value={err.handling} onChange={e => { const next = [...(spec.error_handling || [])]; next[i] = { ...next[i], handling: e.target.value }; update({ error_handling: next }); }} placeholder="Do this..." className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                            <Input value={err.user_message || ""} onChange={e => { const next = [...(spec.error_handling || [])]; next[i] = { ...next[i], user_message: e.target.value }; update({ error_handling: next }); }} placeholder="Tell the user..." className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => update({ error_handling: (spec.error_handling || []).filter((_, idx) => idx !== i) })} className="h-7 w-7 p-0 text-white/20 hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Safety Boundaries */}
              <Section title="Safety Rules" count={spec.safety_boundaries?.length || 0}>
                <Textarea
                  value={(spec.safety_boundaries || []).join("\n")}
                  onChange={e => update({ safety_boundaries: e.target.value.split("\n").filter(l => l.trim()) })}
                  placeholder={"Never execute code without confirmation\nValidate all inputs before processing\nDo not persist user data"}
                  className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[80px] resize-none"
                />
              </Section>

              {/* Frameworks & Tags */}
              <Section title="Frameworks & Tags">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[12px] text-white/40">Target Frameworks</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["claude", "mcp", "crewai", "langchain"] as const).map(fw => {
                        const Icon = FW_ICONS[fw];
                        const active = (spec.target_frameworks || []).includes(fw);
                        return (
                          <Button
                            key={fw}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const fws = spec.target_frameworks || [];
                              update({ target_frameworks: active ? fws.filter(f => f !== fw) : [...fws, fw] });
                            }}
                            className={`text-[12px] h-8 gap-1.5 border ${active ? `bg-white/5 ${FW_COLORS[fw]}` : "text-white/30 border-white/8"}`}
                          >
                            <Icon className="h-3 w-3" /> {fw}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/40">Tags (comma-separated)</Label>
                    <Input
                      value={(spec.tags || []).join(", ")}
                      onChange={e => update({ tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                      placeholder="productivity, automation, text"
                      className="bg-[#0A0A0A] border-white/8 text-[12px]"
                    />
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between py-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(JSON.stringify(spec, null, 2)); toast.success("Copied JSON"); }}
                className="border-white/10 text-[12px]"
              >
                <Copy className="h-3 w-3 mr-1.5" /> Copy JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/build?spec=${encodeURIComponent(JSON.stringify(spec, null, 2))}`)}
                className="border-white/10 text-[12px]"
              >
                <Package className="h-3 w-3 mr-1.5" /> Generate Code
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/validate?spec=${encodeURIComponent(JSON.stringify(spec, null, 2))}`)}
                className="border-white/10 text-[12px]"
              >
                <CheckCircle className="h-3 w-3 mr-1.5" /> Full Validation
              </Button>
            </div>

            <Button
              onClick={handleSave}
              disabled={!spec.name.trim() || saved}
              className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
            >
              {saved ? (
                <><CheckCircle className="h-4 w-4 mr-1.5" /> Saved!</>
              ) : (
                <><Save className="h-4 w-4 mr-1.5" /> Save Skill</>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ══════ Capabilities Editor ══════ */
function CapabilitiesEditor({
  capabilities,
  onChange,
}: {
  capabilities: Capability[];
  onChange: (caps: Capability[]) => void;
}) {
  const addCap = () => onChange([...capabilities, { name: "", description: "", required: true, parameters: [] }]);
  const removeCap = (i: number) => onChange(capabilities.filter((_, idx) => idx !== i));
  const updateCap = (i: number, patch: Partial<Capability>) => {
    const next = [...capabilities];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const addParam = (ci: number) => {
    const params = [...(capabilities[ci].parameters || []), { name: "", type: "string", description: "", required: true }];
    updateCap(ci, { parameters: params });
  };
  const removeParam = (ci: number, pi: number) => {
    updateCap(ci, { parameters: (capabilities[ci].parameters || []).filter((_, idx) => idx !== pi) });
  };
  const updateParam = (ci: number, pi: number, patch: Partial<Parameter>) => {
    const params = [...(capabilities[ci].parameters || [])];
    params[pi] = { ...params[pi], ...patch };
    updateCap(ci, { parameters: params });
  };

  return (
    <div className="space-y-3">
      {capabilities.map((cap, i) => (
        <div key={i} className="rounded-lg border border-white/6 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={cap.name} onChange={e => updateCap(i, { name: e.target.value })} placeholder="capability_name" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
              <Input value={cap.description} onChange={e => updateCap(i, { description: e.target.value })} placeholder="What does this do?" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeCap(i)} className="h-7 w-7 p-0 text-white/20 hover:text-red-400">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          {/* Parameters */}
          <div className="ml-3 pl-3 border-l border-white/6 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/20">Parameters ({(cap.parameters || []).length})</span>
              <Button variant="ghost" size="sm" onClick={() => addParam(i)} className="text-[10px] h-5 text-white/25 hover:text-white/50">
                <Plus className="h-2.5 w-2.5 mr-0.5" /> Param
              </Button>
            </div>
            {(cap.parameters || []).map((p, pi) => (
              <div key={pi} className="grid grid-cols-[1fr_70px_1fr_24px] gap-1.5 items-center">
                <Input value={p.name} onChange={e => updateParam(i, pi, { name: e.target.value })} placeholder="name" className="bg-[#0A0A0A] border-white/8 text-[11px] h-7" />
                <Input value={p.type} onChange={e => updateParam(i, pi, { type: e.target.value })} placeholder="type" className="bg-[#0A0A0A] border-white/8 text-[11px] h-7" />
                <Input value={p.description} onChange={e => updateParam(i, pi, { description: e.target.value })} placeholder="description" className="bg-[#0A0A0A] border-white/8 text-[11px] h-7" />
                <Button variant="ghost" size="sm" onClick={() => removeParam(i, pi)} className="h-6 w-6 p-0 text-white/15 hover:text-red-400">
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={addCap}
        className="text-[11px] text-orange-400/70 hover:text-orange-400"
      >
        <Plus className="h-3 w-3 mr-1" /> Add Capability
      </Button>
    </div>
  );
}
