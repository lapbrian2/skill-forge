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
import { saveSkill, clearDraft } from "@/lib/storage";
import { createEmptySpec } from "@/lib/types";
import type { SkillSpec, Capability, Parameter } from "@/lib/types";
import {
  Sparkles, Wand2, Save, ChevronDown, ChevronRight,
  Plus, Trash2, CheckCircle, ArrowRight, Download,
  FileText, Server, Users, Link as LinkIcon,
  RotateCcw, Copy, Package, Shield, AlertTriangle,
  Zap, Eye, Settings2, Hash, Target, Brain,
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

const FW_META: Record<string, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  claude: { label: "Claude", icon: FileText, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  mcp: { label: "MCP", icon: Server, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  crewai: { label: "CrewAI", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  langchain: { label: "LangChain", icon: LinkIcon, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
};

const CX_META: Record<string, { color: string; bg: string }> = {
  simple: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  moderate: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  complex: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

/* ── Score Ring (small inline) ── */
function ScoreRing({ score }: { score: number }) {
  const r = 28, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 90 ? "#10B981" : score >= 70 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative w-[72px] h-[72px] flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <motion.circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[15px] font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

/* ── Stat Pill ── */
function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/6">
      <Icon className="h-3.5 w-3.5 text-white/25" />
      <span className="text-[11px] text-white/30">{label}</span>
      <span className="text-[12px] text-white/70 font-medium ml-auto">{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/* ── Main Page                                               ── */
/* ══════════════════════════════════════════════════════════════ */
export default function CreatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"input" | "result">("input");
  const [description, setDescription] = useState("");
  const [spec, setSpec] = useState<SkillSpec>(createEmptySpec);
  const [saved, setSaved] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (patch: Partial<SkillSpec>) => setSpec(prev => ({ ...prev, ...patch }));

  /* ── Build spec from description ── */
  const handleBuild = () => {
    if (!description.trim()) { toast.error("Describe what your skill should do"); return; }
    setIsBuilding(true);
    setTimeout(() => {
      let generated = buildSpecFromDescription(description.trim());
      generated = autoFix(enhanceSpec(generated));
      setSpec(generated);
      setMode("result");
      setIsBuilding(false);
      toast.success("Skill built!");
    }, 500);
  };

  /* ── Save ── */
  const handleSave = () => {
    saveSkill(spec);
    clearDraft();
    setSaved(true);
    toast.success("Skill saved!");
    setTimeout(() => router.push("/"), 800);
  };

  /* ── Start over ── */
  const handleReset = () => {
    setMode("input");
    setDescription("");
    setSpec(createEmptySpec());
    setShowAdvanced(false);
    setSaved(false);
  };

  const report = mode === "result" ? validateSpec(spec) : null;

  return (
    <div className="space-y-6">
      {/* ══════ INPUT MODE ══════ */}
      {mode === "input" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Hero */}
          <div className="text-center space-y-2 pt-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-2">
              <Sparkles className="h-6 w-6 text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">What should your skill do?</h1>
            <p className="text-[14px] text-white/35 max-w-md mx-auto">
              Describe it in your own words. We handle the rest.
            </p>
          </div>

          {/* Input card */}
          <div className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4 max-w-2xl mx-auto">
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Review code for security vulnerabilities and write a report with severity ratings"
              className="bg-[#0A0A0A] border-white/8 text-[15px] min-h-[130px] resize-none placeholder:text-white/15 leading-relaxed rounded-xl"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleBuild(); }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/15">Ctrl+Enter to build</span>
              <Button
                onClick={handleBuild}
                disabled={!description.trim() || isBuilding}
                className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-11 px-8 text-[14px] rounded-xl"
              >
                {isBuilding ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="mr-2">
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                {isBuilding ? "Building..." : "Build My Skill"}
              </Button>
            </div>
          </div>

          {/* Quick starts */}
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium">
              Or start from a template
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STARTERS.map(s => (
                <button
                  key={s.label}
                  onClick={() => { setDescription(s.desc); }}
                  className="group text-left rounded-xl border border-white/5 bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/10 transition-all p-3"
                >
                  <span className="text-[13px] font-medium text-white/60 group-hover:text-white/90 transition-colors block">
                    {s.label}
                  </span>
                  <p className="text-[10px] text-white/20 mt-0.5 line-clamp-2">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════ RESULT MODE ══════ */}
      {mode === "result" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <button onClick={handleReset} className="flex items-center gap-1.5 text-[13px] text-white/30 hover:text-white/60 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/build?spec=${encodeURIComponent(JSON.stringify(spec, null, 2))}`)}
                className="border-white/10 text-[12px] h-8"
              >
                <Package className="h-3 w-3 mr-1.5" /> Generate Code
              </Button>
              <Button
                onClick={handleSave}
                disabled={saved}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-8"
              >
                {saved ? <><CheckCircle className="h-3.5 w-3.5 mr-1" /> Saved!</> : <><Save className="h-3.5 w-3.5 mr-1" /> Save Skill</>}
              </Button>
            </div>
          </div>

          {/* Hero card — name + score */}
          <div className="rounded-2xl border border-white/8 bg-[#111] p-6">
            <div className="flex items-start gap-5">
              {report && <ScoreRing score={report.overall_score} />}
              <div className="flex-1 min-w-0 space-y-2">
                <h2 className="text-xl font-bold tracking-tight truncate">{spec.display_name || spec.name}</h2>
                <p className="text-[13px] text-white/50 leading-relaxed line-clamp-2">{spec.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {/* Complexity badge */}
                  {spec.complexity && CX_META[spec.complexity] && (
                    <Badge variant="outline" className={`text-[10px] ${CX_META[spec.complexity].color} ${CX_META[spec.complexity].bg}`}>
                      {spec.complexity}
                    </Badge>
                  )}
                  {/* Framework badges */}
                  {(spec.target_frameworks || []).map(fw => {
                    const meta = FW_META[fw];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <Badge key={fw} variant="outline" className={`text-[10px] gap-1 ${meta.color} ${meta.bg}`}>
                        <Icon className="h-2.5 w-2.5" /> {meta.label}
                      </Badge>
                    );
                  })}
                  {/* Tag badges */}
                  {(spec.tags || []).slice(0, 3).map(t => (
                    <Badge key={t} variant="outline" className="text-[10px] text-white/30 border-white/8">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* What was generated — clean summary grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat icon={Zap} label="Capabilities" value={spec.capabilities.length} />
            <Stat icon={Eye} label="Examples" value={(spec.examples || []).length} />
            <Stat icon={AlertTriangle} label="Edge Cases" value={(spec.edge_cases || []).length} />
            <Stat icon={Shield} label="Safety Rules" value={(spec.safety_boundaries || []).length} />
          </div>

          {/* Generated sections — read-only summaries */}
          <div className="space-y-3">
            {/* Capabilities */}
            <SummaryCard title="Capabilities" icon={Zap} count={spec.capabilities.length}>
              {spec.capabilities.map((cap, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-white/4 last:border-0">
                  <div className="w-5 h-5 rounded-md bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] text-orange-400 font-bold">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[13px] text-white/80 font-medium">{cap.name.replace(/-/g, " ")}</span>
                    <p className="text-[11px] text-white/30 mt-0.5">{cap.description}</p>
                    {(cap.parameters || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(cap.parameters || []).map((p, pi) => (
                          <span key={pi} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/35">
                            {p.name}: {p.type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </SummaryCard>

            {/* Examples */}
            <SummaryCard title="Examples" icon={Eye} count={(spec.examples || []).length}>
              {(spec.examples || []).map((ex, i) => (
                <div key={i} className="py-2 border-b border-white/4 last:border-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] text-white/25 border-white/8 h-4">IN</Badge>
                    <span className="text-[12px] text-white/50 truncate">{typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] text-emerald-400/50 border-emerald-400/15 h-4">OUT</Badge>
                    <span className="text-[12px] text-white/50 truncate">{typeof ex.expected_output === "string" ? ex.expected_output : JSON.stringify(ex.expected_output)}</span>
                  </div>
                </div>
              ))}
            </SummaryCard>

            {/* Error Handling */}
            <SummaryCard title="Error Handling" icon={AlertTriangle} count={(spec.error_handling || []).length}>
              {(spec.error_handling || []).map((err, i) => (
                <div key={i} className="py-2 border-b border-white/4 last:border-0">
                  <span className="text-[12px] text-white/60">{err.condition}</span>
                  <p className="text-[11px] text-white/25 mt-0.5">{err.handling}</p>
                </div>
              ))}
            </SummaryCard>

            {/* Safety */}
            <SummaryCard title="Safety Rules" icon={Shield} count={(spec.safety_boundaries || []).length}>
              <ul className="space-y-1.5">
                {(spec.safety_boundaries || []).map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-white/50">
                    <CheckCircle className="h-3 w-3 text-emerald-400/50 mt-0.5 flex-shrink-0" />
                    {rule}
                  </li>
                ))}
              </ul>
            </SummaryCard>

            {/* Edge Cases */}
            <SummaryCard title="Edge Cases" icon={Target} count={(spec.edge_cases || []).length}>
              <div className="flex flex-wrap gap-1.5">
                {(spec.edge_cases || []).map((ec, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] text-white/40 border-white/8">
                    {ec}
                  </Badge>
                ))}
              </div>
            </SummaryCard>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 py-1">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(JSON.stringify(spec, null, 2)); toast.success("Copied!"); }} className="border-white/8 text-[12px] h-8 text-white/40">
              <Copy className="h-3 w-3 mr-1.5" /> Copy JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/validate?spec=${encodeURIComponent(JSON.stringify(spec, null, 2))}`)} className="border-white/8 text-[12px] h-8 text-white/40">
              <CheckCircle className="h-3 w-3 mr-1.5" /> Full Validation
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/analyze?spec=${encodeURIComponent(JSON.stringify(spec, null, 2))}`)} className="border-white/8 text-[12px] h-8 text-white/40">
              <Brain className="h-3 w-3 mr-1.5" /> Analyze
            </Button>
          </div>

          {/* ── Advanced editing toggle ── */}
          <div className="border-t border-white/5 pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[12px] text-white/20 hover:text-white/40 transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {showAdvanced ? "Hide" : "Show"} advanced editing
              {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-4">
                    {/* Identity */}
                    <AdvancedSection title="Identity">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Name (slug)">
                          <Input value={spec.name} onChange={e => update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                        </Field>
                        <Field label="Display Name">
                          <Input value={spec.display_name || ""} onChange={e => update({ display_name: e.target.value })} className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                        </Field>
                      </div>
                      <Field label="Description">
                        <Textarea value={spec.description} onChange={e => update({ description: e.target.value })} className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[60px] resize-none" />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Complexity">
                          <div className="flex gap-1">
                            {(["simple", "moderate", "complex"] as const).map(c => (
                              <Button key={c} variant="ghost" size="sm" onClick={() => update({ complexity: c })}
                                className={`text-[11px] h-7 flex-1 ${spec.complexity === c ? `bg-white/10 ${CX_META[c]?.color || "text-white"}` : "text-white/30"}`}>
                                {c}
                              </Button>
                            ))}
                          </div>
                        </Field>
                        <Field label="Version">
                          <Input value={spec.version} onChange={e => update({ version: e.target.value })} className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                        </Field>
                        <Field label="Author">
                          <Input value={spec.author || ""} onChange={e => update({ author: e.target.value })} className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                        </Field>
                      </div>
                    </AdvancedSection>

                    {/* Capabilities editor */}
                    <AdvancedSection title={`Capabilities (${spec.capabilities.length})`}>
                      <CapabilitiesEditor capabilities={spec.capabilities} onChange={caps => update({ capabilities: caps })} />
                    </AdvancedSection>

                    {/* Examples editor */}
                    <AdvancedSection title={`Examples (${(spec.examples || []).length})`}>
                      {(spec.examples || []).map((ex, i) => (
                        <div key={i} className="rounded-lg border border-white/6 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] text-white/25 border-white/8">#{i + 1}</Badge>
                            <Button variant="ghost" size="sm" onClick={() => update({ examples: (spec.examples || []).filter((_, idx) => idx !== i) })} className="h-6 w-6 p-0 text-white/20 hover:text-red-400">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <Textarea value={typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input)} onChange={e => { const n = [...(spec.examples || [])]; n[i] = { ...n[i], input: e.target.value }; update({ examples: n }); }} placeholder="Input" className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[40px] resize-none" />
                          <Textarea value={typeof ex.expected_output === "string" ? ex.expected_output : JSON.stringify(ex.expected_output)} onChange={e => { const n = [...(spec.examples || [])]; n[i] = { ...n[i], expected_output: e.target.value }; update({ examples: n }); }} placeholder="Expected Output" className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[40px] resize-none" />
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => update({ examples: [...(spec.examples || []), { input: "", expected_output: "" }] })} className="text-[11px] text-white/25"><Plus className="h-3 w-3 mr-1" /> Add Example</Button>
                    </AdvancedSection>

                    {/* Edge Cases */}
                    <AdvancedSection title="Edge Cases">
                      <Textarea value={(spec.edge_cases || []).join("\n")} onChange={e => update({ edge_cases: e.target.value.split("\n").filter(l => l.trim()) })} placeholder="One per line" className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[60px] resize-none" />
                    </AdvancedSection>

                    {/* Error Handling */}
                    <AdvancedSection title={`Error Handling (${(spec.error_handling || []).length})`}>
                      {(spec.error_handling || []).map((err, i) => (
                        <div key={i} className="flex items-start gap-2 py-1">
                          <div className="flex-1 space-y-1">
                            <Input value={err.condition} onChange={e => { const n = [...(spec.error_handling || [])]; n[i] = { ...n[i], condition: e.target.value }; update({ error_handling: n }); }} placeholder="When..." className="bg-[#0A0A0A] border-white/8 text-[12px] h-7" />
                            <Input value={err.handling} onChange={e => { const n = [...(spec.error_handling || [])]; n[i] = { ...n[i], handling: e.target.value }; update({ error_handling: n }); }} placeholder="Do..." className="bg-[#0A0A0A] border-white/8 text-[12px] h-7" />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => update({ error_handling: (spec.error_handling || []).filter((_, idx) => idx !== i) })} className="h-6 w-6 p-0 text-white/15 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => update({ error_handling: [...(spec.error_handling || []), { condition: "", handling: "", user_message: "" }] })} className="text-[11px] text-white/25"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                    </AdvancedSection>

                    {/* Safety */}
                    <AdvancedSection title="Safety Rules">
                      <Textarea value={(spec.safety_boundaries || []).join("\n")} onChange={e => update({ safety_boundaries: e.target.value.split("\n").filter(l => l.trim()) })} placeholder="One per line" className="bg-[#0A0A0A] border-white/8 text-[12px] min-h-[60px] resize-none" />
                    </AdvancedSection>

                    {/* Frameworks & Tags */}
                    <AdvancedSection title="Frameworks & Tags">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(["claude", "mcp", "crewai", "langchain"] as const).map(fw => {
                          const meta = FW_META[fw];
                          const Icon = meta.icon;
                          const active = (spec.target_frameworks || []).includes(fw);
                          return (
                            <Button key={fw} variant="ghost" size="sm"
                              onClick={() => { const fws = spec.target_frameworks || []; update({ target_frameworks: active ? fws.filter(f => f !== fw) : [...fws, fw] }); }}
                              className={`text-[12px] h-8 gap-1.5 border ${active ? `bg-white/5 ${meta.color} ${meta.bg}` : "text-white/30 border-white/8"}`}>
                              <Icon className="h-3 w-3" /> {meta.label}
                            </Button>
                          );
                        })}
                      </div>
                      <Field label="Tags (comma-separated)">
                        <Input value={(spec.tags || []).join(", ")} onChange={e => update({ tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} className="bg-[#0A0A0A] border-white/8 text-[12px]" />
                      </Field>
                    </AdvancedSection>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ══════ Helper Components ══════ */

function SummaryCard({ title, icon: Icon, count, children }: {
  title: string; icon: typeof Zap; count: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-white/25" />
          <span className="text-[13px] font-medium text-white/60">{title}</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-white/30 border-white/8">{count}</Badge>
        </div>
        {open ? <ChevronDown className="h-3 w-3 text-white/20" /> : <ChevronRight className="h-3 w-3 text-white/20" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdvancedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/6 bg-[#111] p-4 space-y-3">
      <h4 className="text-[12px] font-medium text-white/40 uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-white/30">{label}</Label>
      {children}
    </div>
  );
}

/* ══════ Capabilities Editor ══════ */
function CapabilitiesEditor({ capabilities, onChange }: { capabilities: Capability[]; onChange: (caps: Capability[]) => void }) {
  const addCap = () => onChange([...capabilities, { name: "", description: "", required: true, parameters: [] }]);
  const removeCap = (i: number) => onChange(capabilities.filter((_, idx) => idx !== i));
  const updateCap = (i: number, patch: Partial<Capability>) => { const n = [...capabilities]; n[i] = { ...n[i], ...patch }; onChange(n); };
  const addParam = (ci: number) => { updateCap(ci, { parameters: [...(capabilities[ci].parameters || []), { name: "", type: "string", description: "", required: true }] }); };
  const removeParam = (ci: number, pi: number) => { updateCap(ci, { parameters: (capabilities[ci].parameters || []).filter((_, idx) => idx !== pi) }); };
  const updateParam = (ci: number, pi: number, patch: Partial<Parameter>) => { const p = [...(capabilities[ci].parameters || [])]; p[pi] = { ...p[pi], ...patch }; updateCap(ci, { parameters: p }); };

  return (
    <div className="space-y-2">
      {capabilities.map((cap, i) => (
        <div key={i} className="rounded-lg border border-white/6 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={cap.name} onChange={e => updateCap(i, { name: e.target.value })} placeholder="capability_name" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
              <Input value={cap.description} onChange={e => updateCap(i, { description: e.target.value })} placeholder="What does this do?" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeCap(i)} className="h-7 w-7 p-0 text-white/15 hover:text-red-400"><Trash2 className="h-3 w-3" /></Button>
          </div>
          <div className="ml-3 pl-3 border-l border-white/6 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/15">Params ({(cap.parameters || []).length})</span>
              <Button variant="ghost" size="sm" onClick={() => addParam(i)} className="text-[10px] h-5 text-white/20"><Plus className="h-2.5 w-2.5 mr-0.5" /> Add</Button>
            </div>
            {(cap.parameters || []).map((p, pi) => (
              <div key={pi} className="grid grid-cols-[1fr_70px_1fr_24px] gap-1.5 items-center">
                <Input value={p.name} onChange={e => updateParam(i, pi, { name: e.target.value })} placeholder="name" className="bg-[#0A0A0A] border-white/8 text-[11px] h-7" />
                <Input value={p.type} onChange={e => updateParam(i, pi, { type: e.target.value })} placeholder="type" className="bg-[#0A0A0A] border-white/8 text-[11px] h-7" />
                <Input value={p.description} onChange={e => updateParam(i, pi, { description: e.target.value })} placeholder="desc" className="bg-[#0A0A0A] border-white/8 text-[11px] h-7" />
                <Button variant="ghost" size="sm" onClick={() => removeParam(i, pi)} className="h-6 w-6 p-0 text-white/15 hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></Button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={addCap} className="text-[11px] text-orange-400/60 hover:text-orange-400"><Plus className="h-3 w-3 mr-1" /> Add Capability</Button>
    </div>
  );
}
