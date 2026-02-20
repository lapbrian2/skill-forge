"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle, AlertCircle,
} from "lucide-react";

const STEPS = [
  "Identity",
  "Capabilities",
  "Examples",
  "Error Handling",
  "I/O & Frameworks",
  "Review",
];

const FRAMEWORKS = ["claude", "mcp", "crewai", "langchain"];
const COMPLEXITIES: SkillSpec["complexity"][] = ["simple", "moderate", "complex"];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [spec, setSpec] = useState<SkillSpec>(createEmptySpec);
  const [saved, setSaved] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setSpec({ ...createEmptySpec(), ...draft } as SkillSpec);
    }
  }, []);

  // Auto-save draft on changes
  useEffect(() => {
    if (spec.name || spec.description || spec.capabilities.length > 0) {
      saveDraft(spec);
    }
  }, [spec]);

  const update = (patch: Partial<SkillSpec>) => setSpec(prev => ({ ...prev, ...patch }));

  const handleSave = () => {
    if (!spec.name.trim()) return;
    saveSkill(spec);
    clearDraft();
    setSaved(true);
    setTimeout(() => router.push("/"), 1000);
  };

  const report = step === 5 ? validateSpec(spec) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Skill</h1>
        <p className="text-muted-foreground mt-1">
          Build a SkillSpec step by step
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex-1 text-center py-2 text-xs font-medium rounded transition-colors ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <StepIdentity spec={spec} update={update} />}
      {step === 1 && <StepCapabilities spec={spec} update={update} />}
      {step === 2 && <StepExamples spec={spec} update={update} />}
      {step === 3 && <StepErrors spec={spec} update={update} />}
      {step === 4 && <StepIO spec={spec} update={update} />}
      {step === 5 && (
        <StepReview spec={spec} report={report} onSave={handleSave} saved={saved} />
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={!spec.name.trim() || saved}>
            <Save className="h-4 w-4 mr-2" />
            {saved ? "Saved!" : "Save Skill"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Step 1: Identity ── */

function StepIdentity({
  spec,
  update,
}: {
  spec: SkillSpec;
  update: (p: Partial<SkillSpec>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skill Identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name (slug)</Label>
            <Input
              value={spec.name}
              onChange={e =>
                update({ name: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })
              }
              placeholder="my-skill"
            />
          </div>
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={spec.display_name || ""}
              onChange={e => update({ display_name: e.target.value })}
              placeholder="My Skill"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={spec.description}
            onChange={e => update({ description: e.target.value })}
            placeholder="What does this skill do? Be specific — this drives validation scoring."
            className="min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <Label>Problem Statement</Label>
          <Textarea
            value={spec.problem_statement || ""}
            onChange={e => update({ problem_statement: e.target.value })}
            placeholder="What problem does this skill solve?"
            className="min-h-[60px]"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Complexity</Label>
            <div className="flex gap-2">
              {COMPLEXITIES.map(c => (
                <Button
                  key={c}
                  variant={spec.complexity === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => update({ complexity: c })}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Version</Label>
            <Input
              value={spec.version}
              onChange={e => update({ version: e.target.value })}
              placeholder="1.0.0"
            />
          </div>
          <div className="space-y-2">
            <Label>Author</Label>
            <Input
              value={spec.author || ""}
              onChange={e => update({ author: e.target.value })}
              placeholder="Your name"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tags (comma-separated)</Label>
          <Input
            value={(spec.tags || []).join(", ")}
            onChange={e =>
              update({
                tags: e.target.value
                  .split(",")
                  .map(t => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="productivity, automation, text"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Step 2: Capabilities ── */

function StepCapabilities({
  spec,
  update,
}: {
  spec: SkillSpec;
  update: (p: Partial<SkillSpec>) => void;
}) {
  const caps = spec.capabilities;

  const addCap = () => {
    update({
      capabilities: [
        ...caps,
        { name: "", description: "", required: true, parameters: [] },
      ],
    });
  };

  const removeCap = (i: number) => {
    update({ capabilities: caps.filter((_, idx) => idx !== i) });
  };

  const updateCap = (i: number, patch: Partial<Capability>) => {
    const next = [...caps];
    next[i] = { ...next[i], ...patch };
    update({ capabilities: next });
  };

  const addParam = (capIdx: number) => {
    const cap = caps[capIdx];
    const params = [...(cap.parameters || []), { name: "", type: "string", description: "", required: true }];
    updateCap(capIdx, { parameters: params });
  };

  const removeParam = (capIdx: number, pIdx: number) => {
    const cap = caps[capIdx];
    const params = (cap.parameters || []).filter((_, idx) => idx !== pIdx);
    updateCap(capIdx, { parameters: params });
  };

  const updateParam = (capIdx: number, pIdx: number, patch: Partial<Parameter>) => {
    const cap = caps[capIdx];
    const params = [...(cap.parameters || [])];
    params[pIdx] = { ...params[pIdx], ...patch };
    updateCap(capIdx, { parameters: params });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Capabilities ({caps.length})
            </CardTitle>
            <Button size="sm" onClick={addCap}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {caps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No capabilities yet. Add at least one.
            </p>
          )}
          {caps.map((cap, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={cap.name}
                      onChange={e => updateCap(i, { name: e.target.value })}
                      placeholder="capability_name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={cap.description}
                      onChange={e => updateCap(i, { description: e.target.value })}
                      placeholder="What does this capability do?"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeCap(i)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>

              {/* Parameters */}
              <div className="pl-4 border-l-2 border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Parameters ({(cap.parameters || []).length})
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => addParam(i)}>
                    <Plus className="h-3 w-3 mr-1" /> Param
                  </Button>
                </div>
                {(cap.parameters || []).map((p, pi) => (
                  <div key={pi} className="flex items-center gap-2">
                    <Input
                      value={p.name}
                      onChange={e => updateParam(i, pi, { name: e.target.value })}
                      placeholder="name"
                      className="text-xs h-8"
                    />
                    <Input
                      value={p.type}
                      onChange={e => updateParam(i, pi, { type: e.target.value })}
                      placeholder="type"
                      className="text-xs h-8 w-24"
                    />
                    <Input
                      value={p.description}
                      onChange={e => updateParam(i, pi, { description: e.target.value })}
                      placeholder="description"
                      className="text-xs h-8"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeParam(i, pi)}>
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Step 3: Examples ── */

function StepExamples({
  spec,
  update,
}: {
  spec: SkillSpec;
  update: (p: Partial<SkillSpec>) => void;
}) {
  const examples = spec.examples || [];
  const edgeCases = spec.edge_cases || [];

  const addExample = () => {
    update({ examples: [...examples, { input: "", expected_output: "" }] });
  };

  const removeExample = (i: number) => {
    update({ examples: examples.filter((_, idx) => idx !== i) });
  };

  const updateExample = (i: number, patch: Partial<Example>) => {
    const next = [...examples];
    next[i] = { ...next[i], ...patch };
    update({ examples: next });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Examples ({examples.length})</CardTitle>
            <Button size="sm" onClick={addExample}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {examples.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No examples yet. Add at least 2 for a good validation score.
            </p>
          )}
          {examples.map((ex, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <Badge variant="secondary" className="text-xs">#{i + 1}</Badge>
                <Button variant="ghost" size="sm" onClick={() => removeExample(i)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Input</Label>
                <Textarea
                  value={typeof ex.input === "string" ? ex.input : JSON.stringify(ex.input)}
                  onChange={e => updateExample(i, { input: e.target.value })}
                  placeholder="What goes in?"
                  className="text-sm min-h-[60px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expected Output</Label>
                <Textarea
                  value={typeof ex.expected_output === "string" ? ex.expected_output : JSON.stringify(ex.expected_output)}
                  onChange={e => updateExample(i, { expected_output: e.target.value })}
                  placeholder="What should come out?"
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edge Cases ({edgeCases.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={edgeCases.join("\n")}
            onChange={e =>
              update({
                edge_cases: e.target.value
                  .split("\n")
                  .filter(l => l.trim()),
              })
            }
            placeholder={"One edge case per line, e.g.:\nEmpty input provided\nExtremely long input text\nInput in unsupported language"}
            className="text-sm min-h-[100px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Step 4: Error Handling ── */

function StepErrors({
  spec,
  update,
}: {
  spec: SkillSpec;
  update: (p: Partial<SkillSpec>) => void;
}) {
  const errors = spec.error_handling || [];
  const safety = spec.safety_boundaries || [];

  const addError = () => {
    update({
      error_handling: [
        ...errors,
        { condition: "", handling: "", user_message: "" },
      ],
    });
  };

  const removeError = (i: number) => {
    update({ error_handling: errors.filter((_, idx) => idx !== i) });
  };

  const updateError = (i: number, patch: Partial<ErrorSpec>) => {
    const next = [...errors];
    next[i] = { ...next[i], ...patch };
    update({ error_handling: next });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Error Handling ({errors.length})</CardTitle>
            <Button size="sm" onClick={addError}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Define at least one error condition for a better score.
            </p>
          )}
          {errors.map((err, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Condition</Label>
                    <Input
                      value={err.condition}
                      onChange={e => updateError(i, { condition: e.target.value })}
                      placeholder="When does this error occur?"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Handling</Label>
                    <Input
                      value={err.handling}
                      onChange={e => updateError(i, { handling: e.target.value })}
                      placeholder="How should it be handled?"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">User Message</Label>
                    <Input
                      value={err.user_message || ""}
                      onChange={e => updateError(i, { user_message: e.target.value })}
                      placeholder="What does the user see?"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="ml-2" onClick={() => removeError(i)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Safety Boundaries ({safety.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={safety.join("\n")}
            onChange={e =>
              update({
                safety_boundaries: e.target.value
                  .split("\n")
                  .filter(l => l.trim()),
              })
            }
            placeholder={"One boundary per line, e.g.:\nMust not execute arbitrary code\nMust not access external systems without permission\nMust validate all user inputs"}
            className="text-sm min-h-[100px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Step 5: I/O & Frameworks ── */

function StepIO({
  spec,
  update,
}: {
  spec: SkillSpec;
  update: (p: Partial<SkillSpec>) => void;
}) {
  const inputs = spec.inputs || [];
  const outputs = spec.outputs || [];
  const frameworks = spec.target_frameworks || [];

  const addInput = () => {
    update({ inputs: [...inputs, { name: "", type: "string", description: "", required: true }] });
  };

  const removeInput = (i: number) => {
    update({ inputs: inputs.filter((_, idx) => idx !== i) });
  };

  const updateInput = (i: number, patch: Partial<InputSpec>) => {
    const next = [...inputs];
    next[i] = { ...next[i], ...patch };
    update({ inputs: next });
  };

  const addOutput = () => {
    update({ outputs: [...outputs, { name: "", type: "string", description: "" }] });
  };

  const removeOutput = (i: number) => {
    update({ outputs: outputs.filter((_, idx) => idx !== i) });
  };

  const updateOutput = (i: number, patch: Partial<OutputSpec>) => {
    const next = [...outputs];
    next[i] = { ...next[i], ...patch };
    update({ outputs: next });
  };

  const toggleFramework = (fw: string) => {
    if (frameworks.includes(fw)) {
      update({ target_frameworks: frameworks.filter(f => f !== fw) });
    } else {
      update({ target_frameworks: [...frameworks, fw] });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Inputs ({inputs.length})</CardTitle>
            <Button size="sm" onClick={addInput}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {inputs.map((inp, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={inp.name}
                onChange={e => updateInput(i, { name: e.target.value })}
                placeholder="name"
                className="text-sm h-8"
              />
              <Input
                value={inp.type}
                onChange={e => updateInput(i, { type: e.target.value })}
                placeholder="type"
                className="text-sm h-8 w-24"
              />
              <Input
                value={inp.description}
                onChange={e => updateInput(i, { description: e.target.value })}
                placeholder="description"
                className="text-sm h-8"
              />
              <Button variant="ghost" size="sm" onClick={() => removeInput(i)}>
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Outputs ({outputs.length})</CardTitle>
            <Button size="sm" onClick={addOutput}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {outputs.map((out, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={out.name}
                onChange={e => updateOutput(i, { name: e.target.value })}
                placeholder="name"
                className="text-sm h-8"
              />
              <Input
                value={out.type}
                onChange={e => updateOutput(i, { type: e.target.value })}
                placeholder="type"
                className="text-sm h-8 w-24"
              />
              <Input
                value={out.description}
                onChange={e => updateOutput(i, { description: e.target.value })}
                placeholder="description"
                className="text-sm h-8"
              />
              <Button variant="ghost" size="sm" onClick={() => removeOutput(i)}>
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target Frameworks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORKS.map(fw => (
              <Button
                key={fw}
                variant={frameworks.includes(fw) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFramework(fw)}
              >
                {fw}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Step 6: Review ── */

function StepReview({
  spec,
  report,
  onSave,
  saved,
}: {
  spec: SkillSpec;
  report: ReturnType<typeof validateSpec> | null;
  onSave: () => void;
  saved: boolean;
}) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="h-4 w-4" /> Skill saved! Redirecting...
        </div>
      )}

      {!spec.name.trim() && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" /> Skill name is required before saving.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Spec Summary</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowJson(!showJson)}>
                {showJson ? "Summary" : "JSON"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showJson ? (
              <pre className="text-xs overflow-auto max-h-[500px] font-mono whitespace-pre-wrap">
                {JSON.stringify(spec, null, 2)}
              </pre>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{spec.name || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Description:</span>{" "}
                  {spec.description || "—"}
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{spec.complexity}</Badge>
                  <Badge variant="outline">v{spec.version}</Badge>
                  {(spec.target_frameworks || []).map(fw => (
                    <Badge key={fw} variant="outline">{fw}</Badge>
                  ))}
                </div>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Capabilities:</span> {spec.capabilities.length}
                </div>
                <div>
                  <span className="text-muted-foreground">Examples:</span> {(spec.examples || []).length}
                </div>
                <div>
                  <span className="text-muted-foreground">Edge Cases:</span> {(spec.edge_cases || []).length}
                </div>
                <div>
                  <span className="text-muted-foreground">Error Handlers:</span> {(spec.error_handling || []).length}
                </div>
                <div>
                  <span className="text-muted-foreground">Safety Boundaries:</span> {(spec.safety_boundaries || []).length}
                </div>
                <div>
                  <span className="text-muted-foreground">Inputs:</span> {(spec.inputs || []).length}
                  {" / "}
                  <span className="text-muted-foreground">Outputs:</span> {(spec.outputs || []).length}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {report && <ValidationReportView report={report} />}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
          }}
        >
          Copy JSON
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const encoded = encodeURIComponent(JSON.stringify(spec, null, 2));
            window.location.href = `/build?spec=${encoded}`;
          }}
        >
          <Sparkles className="h-4 w-4 mr-2" /> Generate Code
        </Button>
      </div>
    </div>
  );
}
