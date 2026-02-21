"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, ArrowLeft, CheckCircle, Loader2, Download,
  Copy, FileText, Sparkles, AlertCircle, ChevronRight,
} from "lucide-react";
import { getProject, saveProject } from "@/lib/storage";
import { PHASES } from "@/lib/constants";
import type { Project, Phase, QAEntry } from "@/lib/types";
import { toast } from "sonner";

const PHASE_COLORS: Record<string, string> = {
  discover: "bg-blue-500",
  define: "bg-purple-500",
  architect: "bg-amber-500",
  specify: "bg-orange-500",
  deliver: "bg-emerald-500",
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<{
    question: string;
    why: string;
    options: string[] | null;
    field: string;
    phase_complete: boolean;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [specMarkdown, setSpecMarkdown] = useState("");

  // Load project
  useEffect(() => {
    const p = getProject(projectId);
    if (!p) {
      toast.error("Project not found");
      router.push("/");
      return;
    }
    setProject(p);
    if (p.spec?.markdown_content) {
      setSpecMarkdown(p.spec.markdown_content);
    }
  }, [projectId, router]);

  // Auto-fetch first question when entering a discovery phase
  useEffect(() => {
    if (project && !currentQuestion && !isLoading && ["discover", "define", "architect"].includes(project.current_phase)) {
      fetchNextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.current_phase]);

  const save = useCallback((updated: Project) => {
    setProject(updated);
    saveProject(updated);
  }, []);

  // Fetch next question from LLM
  const fetchNextQuestion = async () => {
    if (!project) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "question",
          description: project.initial_description,
          phase: project.current_phase,
          answers: project.discovery.answers.map(a => ({ question: a.question, answer: a.answer })),
          complexity: project.complexity,
          is_agentic: project.is_agentic,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentQuestion(data);
      } else {
        toast.error("Failed to generate question. Check your API key.");
      }
    } catch {
      toast.error("LLM unavailable. Add ANTHROPIC_API_KEY to your environment.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit answer and get next question
  const handleSubmitAnswer = async () => {
    if (!project || !currentQuestion || !answer.trim()) return;

    const entry: QAEntry = {
      id: crypto.randomUUID(),
      phase: project.current_phase,
      question: currentQuestion.question,
      answer: answer.trim(),
      timestamp: new Date().toISOString(),
    };

    const updated = {
      ...project,
      discovery: {
        ...project.discovery,
        answers: [...project.discovery.answers, entry],
      },
    };

    save(updated);
    setAnswer("");

    // Check if phase is complete
    if (currentQuestion.phase_complete) {
      advancePhase(updated);
    } else {
      setCurrentQuestion(null);
      // Will trigger fetchNextQuestion via useEffect
      setProject(updated);
    }
  };

  // Advance to next phase
  const advancePhase = (proj: Project) => {
    const phaseOrder: Phase[] = ["discover", "define", "architect", "specify", "deliver"];
    const currentIdx = phaseOrder.indexOf(proj.current_phase);
    const nextPhase = phaseOrder[currentIdx + 1];

    if (!nextPhase) return;

    // Mark tollgate passed
    const discovery = { ...proj.discovery };
    if (proj.current_phase === "discover") discovery.tollgate_1_passed = true;
    if (proj.current_phase === "define") discovery.tollgate_2_passed = true;
    if (proj.current_phase === "architect") discovery.tollgate_3_passed = true;

    const updated = { ...proj, current_phase: nextPhase, discovery };
    save(updated);
    setCurrentQuestion(null);

    if (nextPhase === "specify") {
      generateSpec(updated);
    }

    toast.success(`Phase complete! Moving to ${nextPhase}`);
  };

  // Confirm current phase and advance
  const handleConfirmPhase = () => {
    if (!project) return;
    advancePhase(project);
  };

  // Generate the full spec
  const generateSpec = async (proj: Project) => {
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_data: {
            name: proj.name,
            one_liner: proj.one_liner,
            description: proj.initial_description,
            complexity: proj.complexity,
            is_agentic: proj.is_agentic,
            discovery: proj.discovery,
          },
          complexity: proj.complexity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const spec = {
          project_id: proj.id,
          version: "1.0",
          markdown_content: data.markdown,
          section_count: data.section_count,
          word_count: data.word_count,
          generated_at: new Date().toISOString(),
        };

        const updated = { ...proj, spec, current_phase: "deliver" as Phase };
        save(updated);
        setSpecMarkdown(data.markdown);

        // Auto-validate
        try {
          const valRes = await fetch("/api/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spec_content: data.markdown }),
          });
          if (valRes.ok) {
            const valData = await valRes.json();
            const validation = {
              project_id: proj.id,
              spec_version: "1.0",
              timestamp: new Date().toISOString(),
              tollgate_4: valData.tollgate_4,
              tollgate_5: valData.tollgate_5,
              overall_score: valData.overall_score,
              grade: valData.grade,
              remediations: valData.remediations,
              passed: valData.passed,
            };
            save({ ...updated, validation });
          }
        } catch {
          // Validation is optional
        }

        toast.success("Spec generated!");
      } else {
        toast.error("Failed to generate spec");
      }
    } catch {
      toast.error("LLM unavailable");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!project) {
    return <div className="text-center text-white/30 py-20">Loading...</div>;
  }

  const phaseIdx = PHASES.findIndex(p => p.id === project.current_phase);
  const phaseAnswers = project.discovery.answers.filter(a => a.phase === project.current_phase);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">
            {project.name || project.initial_description.slice(0, 50)}
          </h1>
          {project.one_liner && (
            <p className="text-[13px] text-white/35">{project.one_liner}</p>
          )}
        </div>
        <Badge variant="outline" className={`text-[11px] ${
          project.complexity === "simple" ? "text-emerald-400 border-emerald-400/20"
          : project.complexity === "complex" ? "text-red-400 border-red-400/20"
          : "text-amber-400 border-amber-400/20"
        }`}>
          {project.complexity}
        </Badge>
      </div>

      {/* Phase Stepper */}
      <div className="flex items-center gap-2">
        {PHASES.map((phase, idx) => (
          <div key={phase.id} className="flex items-center gap-2 flex-1">
            <div className="flex-1 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                idx < phaseIdx
                  ? "bg-orange-500 text-black"
                  : idx === phaseIdx
                    ? `${PHASE_COLORS[phase.id]} text-white`
                    : "bg-white/8 text-white/25"
              }`}>
                {idx < phaseIdx ? <CheckCircle className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={`text-[12px] font-medium hidden sm:inline ${
                idx === phaseIdx ? "text-white" : idx < phaseIdx ? "text-white/50" : "text-white/20"
              }`}>
                {phase.label}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div className={`h-px flex-shrink-0 w-4 ${idx < phaseIdx ? "bg-orange-500" : "bg-white/8"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Phase Content */}
      <AnimatePresence mode="wait">
        {/* ── Discovery Phases (1-3) ── */}
        {["discover", "define", "architect"].includes(project.current_phase) && (
          <motion.div
            key={project.current_phase}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Phase description */}
            <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
              <h2 className="text-[14px] font-semibold text-white/70">
                Phase {phaseIdx + 1}: {PHASES[phaseIdx]?.label}
              </h2>
              <p className="text-[12px] text-white/30 mt-1">
                {PHASES[phaseIdx]?.description}
              </p>
            </div>

            {/* Previous answers */}
            {phaseAnswers.length > 0 && (
              <div className="space-y-2">
                {phaseAnswers.map((qa, i) => (
                  <div key={qa.id} className="rounded-lg border border-white/5 bg-white/[0.015] p-3 space-y-1.5">
                    <p className="text-[12px] text-white/40">{qa.question}</p>
                    <p className="text-[13px] text-white/70">{qa.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Current question */}
            {isLoading ? (
              <div className="flex items-center gap-3 p-6 text-white/30 text-[13px]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            ) : currentQuestion ? (
              <div className="rounded-xl border border-white/8 bg-[#111] p-5 space-y-4">
                <div className="space-y-2">
                  <p className="text-[15px] font-medium text-white/80">{currentQuestion.question}</p>
                  <p className="text-[11px] text-white/25">{currentQuestion.why}</p>
                </div>

                {/* Options or free-text */}
                {currentQuestion.options && currentQuestion.options.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {currentQuestion.options.map(opt => (
                        <Button
                          key={opt}
                          variant="outline"
                          size="sm"
                          onClick={() => setAnswer(opt)}
                          className={`text-[12px] border-white/8 ${
                            answer === opt ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "text-white/50"
                          }`}
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Or type your own answer..."
                      className="bg-[#0A0A0A] border-white/8 text-[13px] min-h-[60px] resize-none"
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitAnswer();
                      }}
                    />
                  </div>
                ) : (
                  <Textarea
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    className="bg-[#0A0A0A] border-white/8 text-[14px] min-h-[80px] resize-none"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmitAnswer();
                    }}
                  />
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/15">Ctrl+Enter to submit</span>
                  <div className="flex gap-2">
                    {phaseAnswers.length >= 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleConfirmPhase}
                        className="border-white/10 text-[12px]"
                      >
                        Confirm & advance <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim()}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" /> Answer
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* ── Specify Phase ── */}
        {project.current_phase === "specify" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 space-y-4"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-orange-400 mx-auto" />
                <h2 className="text-lg font-semibold">Generating your specification...</h2>
                <p className="text-[13px] text-white/30">This may take 30-60 seconds for complex projects</p>
              </>
            ) : (
              <>
                <Sparkles className="h-8 w-8 text-orange-400 mx-auto" />
                <h2 className="text-lg font-semibold">Ready to generate</h2>
                <p className="text-[13px] text-white/30">
                  {project.discovery.answers.length} answers collected across {
                    new Set(project.discovery.answers.map(a => a.phase)).size
                  } phases
                </p>
                <Button
                  onClick={() => generateSpec(project)}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Spec
                </Button>
              </>
            )}
          </motion.div>
        )}

        {/* ── Deliver Phase ── */}
        {project.current_phase === "deliver" && specMarkdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Score card */}
            {project.validation && (
              <div className="rounded-xl border border-white/8 bg-[#111] p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[12px] text-white/30">Quality Score</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-3xl font-bold ${
                        project.validation.overall_score >= 90 ? "text-emerald-400"
                        : project.validation.overall_score >= 70 ? "text-amber-400"
                        : "text-red-400"
                      }`}>
                        {project.validation.grade}
                      </span>
                      <span className="text-[14px] text-white/40">
                        {project.validation.overall_score}/100
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[12px] text-white/25 space-y-0.5">
                    <div>Completeness: {project.validation.tollgate_4.score}%</div>
                    <div>Production Ready: {project.validation.tollgate_5.score}%</div>
                    {project.spec && <div>{project.spec.word_count.toLocaleString()} words</div>}
                  </div>
                </div>
                {project.validation.remediations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/6 space-y-1">
                    {project.validation.remediations.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <AlertCircle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${r.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
                        <span className="text-white/40">{r.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(specMarkdown);
                  toast.success("Spec copied to clipboard! Paste into Claude Code.");
                }}
                className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Spec
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([specMarkdown], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${project.name || "spec"}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Downloaded!");
                }}
                className="border-white/10"
              >
                <Download className="h-4 w-4 mr-2" /> Download .md
              </Button>
            </div>

            {/* Spec content */}
            <div className="rounded-xl border border-white/8 bg-[#111] p-6 overflow-auto max-h-[600px]">
              <pre className="text-[13px] font-mono text-white/60 whitespace-pre-wrap leading-relaxed">
                {specMarkdown}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
