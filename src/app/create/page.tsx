"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { validateSpec } from "@/lib/validator";
import { ValidationReportView } from "@/components/validation-report";
import { saveSkill, saveDraft, loadDraft, clearDraft } from "@/lib/storage";
import { createEmptySpec } from "@/lib/types";
import type { SkillSpec, Capability, Parameter, Example, ErrorSpec, InputSpec, OutputSpec } from "@/lib/types";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Save, Sparkles,
  CheckCircle, AlertCircle, Eye, Code, Wand2,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { name: "Identity", required: ["name", "description"] },
  { name: "Capabilities", required: ["capabilities"] },
  { name: "Examples", required: [] },
  { name: "Error Handling", required: [] },
  { name: "I/O & Frameworks", required: [] },
  { name: "Review", required: [] },
];

const FRAMEWORKS = ["claude", "mcp", "crewai", "langchain"];
const COMPLEXITIES: SkillSpec["complexity"][] = ["simple", "moderate", "complex"];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [spec, setSpec] = useState<SkillSpec>(createEmptySpec);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setSpec({ ...createEmptySpec(), ...draft } as SkillSpec);
  }, []);

  useEffect(() => {
    if (spec.name || spec.description || spec.capabilities.length > 0) {
      saveDraft(spec);
    }
  }, [spec]);

  const update = (patch: Partial<SkillSpec>) => setSpec(prev => ({ ...prev, ...patch }));

  const canAdvance = (): boolean => {
    if (step === 0) return !!(spec.name.trim() && spec.description.trim());
    if (step === 1) return spec.capabilities.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canAdvance()) {
      toast.error("Fill required fields before continuing");
      return;
    }
    setStep(Math.min(5, step + 1));
  };

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

  const report = step === 5 ? validateSpec(spec) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Create Skill</h1>
          <p className="text-[14px] text-white/40">Build a SkillSpec step by step</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="text-[12px] text-white/40"
          >
            {showPreview ? <Code className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
            {showPreview ? "Editor" : "Preview JSON"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => { if (i <= step || canAdvance()) setStep(i); }}
            className={`flex-1 py-2 text-[11px] font-medium rounded-md transition-all ${
              i === step
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : i < step
                  ? "bg-white/8 text-white/50"
                  : "bg-white/3 text-white/20"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {showPreview ? (
        <div className="rounded-xl border border-white/8 bg-[#111] p-5">
          <pre className="text-[13px] font-mono text-white/60 overflow-auto max-h-[500px] whitespace-pre-wrap">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {step === 0 && <StepIdentity spec={spec} update={update} />}
            {step === 1 && <StepCapabilities spec={spec} update={update} />}
            {step === 2 && <StepExamples spec={spec} update={update} />}
            {step === 3 && <StepErrors spec={spec} update={update} />}
            {step === 4 && <StepIO spec={spec} update={update} />}
            {step === 5 && <StepReview spec={spec} report={report} onSave={handleSave} saved={saved} />}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="border-white/10"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        {step < 5 ? (
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!canAdvance()}
            className="bg-orange-500 hover:bg-orange-600 text-black font-medium"
          >
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!spec.name.trim() || saved}
            className="bg-orange-500 hover:bg-orange-600 text-black font-medium"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saved ? "Saved!" : "Save Skill"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Step 1 ── */
function StepIdentity({ spec, update }: { spec: SkillSpec; update: (p: Partial<SkillSpec>) => void }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
      <h3 className="text-sm font-medium text-white/70">Skill Identity</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] text-white/50">Name (slug) *</Label>
          <Input
            value={spec.name}
            onChange={e => update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })}
            placeholder="my-skill"
            className="bg-[#0A0A0A] border-white/8 text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] text-white/50">Display Name</Label>
          <Input
            value={spec.display_name || ""}
            onChange={e => update({ display_name: e.target.value })}
            placeholder="My Skill"
            className="bg-[#0A0A0A] border-white/8 text-[13px]"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px] text-white/50">Description *</Label>
        <Textarea
          value={spec.description}
          onChange={e => update({ description: e.target.value })}
          placeholder="What does this skill do? Be specific."
          className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[80px] resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px] text-white/50">Problem Statement</Label>
        <Textarea
          value={spec.problem_statement || ""}
          onChange={e => update({ problem_statement: e.target.value })}
          placeholder="What problem does this skill solve?"
          className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[60px] resize-none"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] text-white/50">Complexity</Label>
          <div className="flex gap-1.5">
            {COMPLEXITIES.map(c => (
              <Button
                key={c}
                variant="ghost"
                size="sm"
                onClick={() => update({ complexity: c })}
                className={`text-[12px] h-8 flex-1 ${spec.complexity === c ? "bg-white/10 text-white" : "text-white/40"}`}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] text-white/50">Version</Label>
          <Input value={spec.version} onChange={e => update({ version: e.target.value })} className="bg-[#0A0A0A] border-white/8 text-[13px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] text-white/50">Author</Label>
          <Input value={spec.author || ""} onChange={e => update({ author: e.target.value })} placeholder="Your name" className="bg-[#0A0A0A] border-white/8 text-[13px]" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px] text-white/50">Tags (comma-separated)</Label>
        <Input
          value={(spec.tags || []).join(", ")}
          onChange={e => update({ tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
          placeholder="productivity, automation, text"
          className="bg-[#0A0A0A] border-white/8 text-[13px]"
        />
      </div>
    </div>
  );
}

/* ── Step 2 ── */
function StepCapabilities({ spec, update }: { spec: SkillSpec; update: (p: Partial<SkillSpec>) => void }) {
  const caps = spec.capabilities;
  const addCap = () => update({ capabilities: [...caps, { name: "", description: "", required: true, parameters: [] }] });
  const removeCap = (i: number) => update({ capabilities: caps.filter((_, idx) => idx !== i) });
  const updateCap = (i: number, patch: Partial<Capability>) => {
    const next = [...caps]; next[i] = { ...next[i], ...patch }; update({ capabilities: next });
  };
  const addParam = (ci: number) => {
    const params = [...(caps[ci].parameters || []), { name: "", type: "string", description: "", required: true }];
    updateCap(ci, { parameters: params });
  };
  const removeParam = (ci: number, pi: number) => {
    updateCap(ci, { parameters: (caps[ci].parameters || []).filter((_, idx) => idx !== pi) });
  };
  const updateParam = (ci: number, pi: number, patch: Partial<Parameter>) => {
    const params = [...(caps[ci].parameters || [])]; params[pi] = { ...params[pi], ...patch }; updateCap(ci, { parameters: params });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70">Capabilities ({caps.length})</h3>
        <Button size="sm" onClick={addCap} className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-0 h-8 text-[12px]">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {caps.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-white/30 text-[13px]">
          Add at least one capability
        </div>
      )}

      {caps.map((cap, i) => (
        <div key={i} className="rounded-xl border border-white/8 bg-[#111] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={cap.name} onChange={e => updateCap(i, { name: e.target.value })} placeholder="capability_name" className="bg-[#0A0A0A] border-white/8 text-[13px]" />
              <Input value={cap.description} onChange={e => updateCap(i, { description: e.target.value })} placeholder="What does this capability do?" className="bg-[#0A0A0A] border-white/8 text-[13px]" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeCap(i)} className="text-white/30 hover:text-red-400 h-8 w-8 p-0">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="ml-3 pl-3 border-l border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/25">Parameters ({(cap.parameters || []).length})</span>
              <Button variant="ghost" size="sm" onClick={() => addParam(i)} className="text-[11px] h-6 text-white/30 hover:text-white/60">
                <Plus className="h-3 w-3 mr-0.5" /> Param
              </Button>
            </div>
            {(cap.parameters || []).map((p, pi) => (
              <div key={pi} className="grid grid-cols-[1fr_80px_1fr_32px] gap-2 items-center">
                <Input value={p.name} onChange={e => updateParam(i, pi, { name: e.target.value })} placeholder="name" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                <Input value={p.type} onChange={e => updateParam(i, pi, { type: e.target.value })} placeholder="type" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                <Input value={p.description} onChange={e => updateParam(i, pi, { description: e.target.value })} placeholder="description" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
                <Button variant="ghost" size="sm" onClick={() => removeParam(i, pi)} className="h-8 w-8 p-0 text-white/20 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Step 3 ── */
function StepExamples({ spec, update }: { spec: SkillSpec; update: (p: Partial<SkillSpec>) => void }) {
  const examples = spec.examples || [];
  const edgeCases = spec.edge_cases || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70">Examples ({examples.length})</h3>
          <Button size="sm" onClick={() => update({ examples: [...examples, { input: "", expected_output: "" }] })} className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-0 h-8 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {examples.length === 0 && (
          <p className="text-[12px] text-white/25 text-center py-4">Add at least 2 examples for a good score</p>
        )}
        {examples.map((ex, i) => (
          <div key={i} className="rounded-lg border border-white/8 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] text-white/30 border-white/10">#{i + 1}</Badge>
              <Button variant="ghost" size="sm" onClick={() => update({ examples: examples.filter((_, idx) => idx !== i) })} className="h-6 w-6 p-0 text-white/20 hover:text-red-400">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              value={typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input)}
              onChange={e => { const next = [...examples]; next[i] = { ...next[i], input: e.target.value }; update({ examples: next }); }}
              placeholder="Input"
              className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[50px] resize-none"
            />
            <Textarea
              value={typeof ex.expected_output === "string" ? ex.expected_output : JSON.stringify(ex.expected_output)}
              onChange={e => { const next = [...examples]; next[i] = { ...next[i], expected_output: e.target.value }; update({ examples: next }); }}
              placeholder="Expected Output"
              className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[50px] resize-none"
            />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-2">
        <h3 className="text-sm font-medium text-white/70">Edge Cases ({edgeCases.length})</h3>
        <Textarea
          value={edgeCases.join("\n")}
          onChange={e => update({ edge_cases: e.target.value.split("\n").filter(l => l.trim()) })}
          placeholder={"One per line:\nEmpty input\nExtremely long text\nSpecial characters"}
          className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
}

/* ── Step 4 ── */
function StepErrors({ spec, update }: { spec: SkillSpec; update: (p: Partial<SkillSpec>) => void }) {
  const errors = spec.error_handling || [];
  const safety = spec.safety_boundaries || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70">Error Handling ({errors.length})</h3>
          <Button size="sm" onClick={() => update({ error_handling: [...errors, { condition: "", handling: "", user_message: "" }] })} className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-0 h-8 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {errors.length === 0 && (
          <p className="text-[12px] text-white/25 text-center py-4">Define at least one error condition</p>
        )}
        {errors.map((err, i) => (
          <div key={i} className="rounded-lg border border-white/8 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input value={err.condition} onChange={e => { const next = [...errors]; next[i] = { ...next[i], condition: e.target.value }; update({ error_handling: next }); }} placeholder="Condition" className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                <Input value={err.handling} onChange={e => { const next = [...errors]; next[i] = { ...next[i], handling: e.target.value }; update({ error_handling: next }); }} placeholder="Handling" className="bg-[#0A0A0A] border-white/8 text-[13px]" />
                <Input value={err.user_message || ""} onChange={e => { const next = [...errors]; next[i] = { ...next[i], user_message: e.target.value }; update({ error_handling: next }); }} placeholder="User message" className="bg-[#0A0A0A] border-white/8 text-[13px]" />
              </div>
              <Button variant="ghost" size="sm" onClick={() => update({ error_handling: errors.filter((_, idx) => idx !== i) })} className="h-8 w-8 p-0 text-white/20 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-2">
        <h3 className="text-sm font-medium text-white/70">Safety Boundaries ({safety.length})</h3>
        <Textarea
          value={safety.join("\n")}
          onChange={e => update({ safety_boundaries: e.target.value.split("\n").filter(l => l.trim()) })}
          placeholder={"One per line:\nMust not execute arbitrary code\nMust validate all inputs\nMust not access external systems without permission"}
          className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
}

/* ── Step 5 ── */
function StepIO({ spec, update }: { spec: SkillSpec; update: (p: Partial<SkillSpec>) => void }) {
  const inputs = spec.inputs || [];
  const outputs = spec.outputs || [];
  const frameworks = spec.target_frameworks || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70">Inputs ({inputs.length})</h3>
          <Button size="sm" onClick={() => update({ inputs: [...inputs, { name: "", type: "string", description: "", required: true }] })} className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-0 h-8 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {inputs.map((inp, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_1fr_32px] gap-2 items-center">
            <Input value={inp.name} onChange={e => { const next = [...inputs]; next[i] = { ...next[i], name: e.target.value }; update({ inputs: next }); }} placeholder="name" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            <Input value={inp.type} onChange={e => { const next = [...inputs]; next[i] = { ...next[i], type: e.target.value }; update({ inputs: next }); }} placeholder="type" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            <Input value={inp.description} onChange={e => { const next = [...inputs]; next[i] = { ...next[i], description: e.target.value }; update({ inputs: next }); }} placeholder="description" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            <Button variant="ghost" size="sm" onClick={() => update({ inputs: inputs.filter((_, idx) => idx !== i) })} className="h-8 w-8 p-0 text-white/20 hover:text-red-400">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/70">Outputs ({outputs.length})</h3>
          <Button size="sm" onClick={() => update({ outputs: [...outputs, { name: "", type: "string", description: "" }] })} className="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-0 h-8 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
        {outputs.map((out, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_1fr_32px] gap-2 items-center">
            <Input value={out.name} onChange={e => { const next = [...outputs]; next[i] = { ...next[i], name: e.target.value }; update({ outputs: next }); }} placeholder="name" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            <Input value={out.type} onChange={e => { const next = [...outputs]; next[i] = { ...next[i], type: e.target.value }; update({ outputs: next }); }} placeholder="type" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            <Input value={out.description} onChange={e => { const next = [...outputs]; next[i] = { ...next[i], description: e.target.value }; update({ outputs: next }); }} placeholder="description" className="bg-[#0A0A0A] border-white/8 text-[12px] h-8" />
            <Button variant="ghost" size="sm" onClick={() => update({ outputs: outputs.filter((_, idx) => idx !== i) })} className="h-8 w-8 p-0 text-white/20 hover:text-red-400">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-3">
        <h3 className="text-sm font-medium text-white/70">Target Frameworks</h3>
        <div className="flex flex-wrap gap-2">
          {FRAMEWORKS.map(fw => (
            <Button
              key={fw}
              variant="ghost"
              size="sm"
              onClick={() => {
                if (frameworks.includes(fw)) update({ target_frameworks: frameworks.filter(f => f !== fw) });
                else update({ target_frameworks: [...frameworks, fw] });
              }}
              className={`text-[12px] h-8 ${frameworks.includes(fw) ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" : "text-white/40 border border-white/8"}`}
            >
              {fw}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 6 ── */
function StepReview({ spec, report, onSave, saved }: {
  spec: SkillSpec;
  report: ReturnType<typeof validateSpec> | null;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 text-emerald-400 text-[13px] bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
          <CheckCircle className="h-4 w-4" /> Skill saved! Redirecting...
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary */}
        <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-3">
          <h3 className="text-sm font-medium text-white/70">Summary</h3>
          <div className="space-y-2 text-[13px]">
            <div><span className="text-white/30">Name:</span> <span className="text-white/80 font-medium">{spec.name || "---"}</span></div>
            <div><span className="text-white/30">Description:</span> <span className="text-white/60">{spec.description || "---"}</span></div>
            <Separator className="bg-white/8" />
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px] text-white/50">{spec.complexity}</Badge>
              <Badge variant="outline" className="text-[10px] text-white/50">v{spec.version}</Badge>
              {(spec.target_frameworks || []).map(fw => (
                <Badge key={fw} variant="outline" className="text-[10px] text-orange-400/70 border-orange-400/20">{fw}</Badge>
              ))}
            </div>
            <Separator className="bg-white/8" />
            <div className="grid grid-cols-2 gap-1 text-[12px]">
              <span className="text-white/30">Capabilities: <span className="text-white/60">{spec.capabilities.length}</span></span>
              <span className="text-white/30">Examples: <span className="text-white/60">{(spec.examples || []).length}</span></span>
              <span className="text-white/30">Edge Cases: <span className="text-white/60">{(spec.edge_cases || []).length}</span></span>
              <span className="text-white/30">Error Handlers: <span className="text-white/60">{(spec.error_handling || []).length}</span></span>
              <span className="text-white/30">Safety Rules: <span className="text-white/60">{(spec.safety_boundaries || []).length}</span></span>
              <span className="text-white/30">I/O: <span className="text-white/60">{(spec.inputs || []).length}/{(spec.outputs || []).length}</span></span>
            </div>
          </div>
        </div>

        {/* Validation */}
        {report && <ValidationReportView report={report} />}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(spec, null, 2)).then(() => toast.success("Copied JSON"))} className="border-white/10 text-[12px]">
          Copy JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.href = `/build?spec=${encodeURIComponent(JSON.stringify(spec, null, 2))}`} className="border-white/10 text-[12px]">
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate Code
        </Button>
      </div>
    </div>
  );
}
