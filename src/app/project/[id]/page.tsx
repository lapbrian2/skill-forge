"use client";

import { useEffect, useReducer, useCallback, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Sparkles, AlertCircle,
} from "lucide-react";
import { getProject, saveProject } from "@/lib/storage";
import { PHASES } from "@/lib/constants";
import { discoveryReducer, INITIAL_STATE } from "@/lib/discovery/state-machine";
import { shouldPhaseComplete } from "@/lib/discovery/adaptive-depth";
import { ChatContainer } from "@/components/discovery/chat-container";
import { SkipButton } from "@/components/discovery/skip-button";
import { SpecViewer } from "@/components/spec/spec-viewer";
import { ValidationPanel } from "@/components/spec/validation-panel";
import { ErrorBoundary } from "@/components/error-boundary";
import { useLLMStream } from "@/hooks/use-llm-stream";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { replaceSection, parseSpecSections } from "@/lib/spec/section-parser";
import type { Project, Phase, QAEntry, ChatMessage } from "@/lib/types";
import { toast } from "sonner";

const PHASE_COLORS: Record<string, string> = {
  discover: "bg-blue-500",
  define: "bg-purple-500",
  architect: "bg-amber-500",
  specify: "bg-orange-500",
  deliver: "bg-emerald-500",
};

const DISCOVERY_PHASES: Phase[] = ["discover", "define", "architect"];
const NEXT_PHASE_MAP: Record<string, Phase> = {
  discover: "define",
  define: "architect",
  architect: "specify",
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [state, dispatch] = useReducer(discoveryReducer, INITIAL_STATE);
  const [specMarkdown, setSpecMarkdown] = useState("");
  const [regeneratingSection, setRegeneratingSection] = useState<number | null>(null);
  const stream = useLLMStream();
  const sectionStream = useLLMStream();

  // Refs for stable access in callbacks without re-triggering effects
  const projectRef = useRef<Project | null>(null);
  const stateRef = useRef(state);
  projectRef.current = project;
  stateRef.current = state;

  // Track whether we've triggered the initial fetch for the current phase
  const fetchTriggeredRef = useRef<string | null>(null);

  // Load project and restore session
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

    // Restore chat session
    if (p.discovery.chat_messages && p.discovery.chat_messages.length > 0) {
      const phaseQuestions = p.discovery.chat_messages.filter(
        (m: ChatMessage) => m.phase === p.current_phase && m.type === "user_response"
      ).length;
      dispatch({
        type: "RESTORE_SESSION",
        payload: {
          messages: p.discovery.chat_messages,
          currentPhase: p.current_phase,
          questionsAskedInPhase: phaseQuestions,
          totalQuestionsAsked: p.discovery.chat_messages.filter((m: ChatMessage) => m.type === "user_response").length,
          understanding: p.discovery.understanding || {},
          status: "idle",
        },
      });
    } else if (p.discovery.answers.length > 0) {
      // Migrate old Q&A format
      const migratedMessages = migrateQAToChat(p.discovery.answers);
      const phaseQuestions = migratedMessages.filter(
        (m: ChatMessage) => m.phase === p.current_phase && m.type === "user_response"
      ).length;
      dispatch({
        type: "RESTORE_SESSION",
        payload: {
          messages: migratedMessages,
          currentPhase: p.current_phase,
          questionsAskedInPhase: phaseQuestions,
          totalQuestionsAsked: migratedMessages.filter((m: ChatMessage) => m.type === "user_response").length,
          status: "idle",
        },
      });
    }
  }, [projectId, router]);

  // Auto-generate spec if page loads at specify phase with no spec
  const autoGenTriggeredRef = useRef(false);
  useEffect(() => {
    if (
      project &&
      project.current_phase === "specify" &&
      !project.spec?.markdown_content &&
      !stream.isStreaming &&
      !stream.text &&
      !autoGenTriggeredRef.current
    ) {
      autoGenTriggeredRef.current = true;
      generateSpec(project);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.current_phase]);

  // Auto-save chat messages to localStorage
  useEffect(() => {
    if (!project || state.messages.length === 0) return;
    const updated: Project = {
      ...project,
      discovery: {
        ...project.discovery,
        chat_messages: state.messages,
        understanding: state.understanding,
        answers: derivQAEntries(state.messages),
      },
      current_phase: state.currentPhase,
      updated_at: new Date().toISOString(),
    };
    saveProject(updated);
    setProject(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.messages.length, state.currentPhase]);

  // Auto-fetch first suggestion when entering a discovery phase
  useEffect(() => {
    if (
      project &&
      state.status === "idle" &&
      DISCOVERY_PHASES.includes(state.currentPhase) &&
      fetchTriggeredRef.current !== `${state.currentPhase}-${state.messages.length}`
    ) {
      fetchTriggeredRef.current = `${state.currentPhase}-${state.messages.length}`;
      fetchSuggestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.currentPhase, project?.id]);

  const save = useCallback((updated: Project) => {
    setProject(updated);
    saveProject(updated);
  }, []);

  // Fetch next AI suggestion
  const fetchSuggestion = async () => {
    const proj = projectRef.current;
    const s = stateRef.current;
    if (!proj) return;
    dispatch({ type: "START_THINKING" });

    try {
      const answers = derivQAEntries(s.messages);
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest",
          description: proj.initial_description,
          phase: s.currentPhase,
          answers: answers.map(a => ({ question: a.question, answer: a.answer })),
          complexity: proj.complexity,
          is_agentic: proj.is_agentic,
          understanding: s.understanding,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get suggestion. Check your API key.");
      }

      const data = await res.json();

      // Track the LLM's phase_complete flag for the next user response
      lastPhaseCompleteRef.current = data.phase_complete === true;

      dispatch({
        type: "AI_SUGGEST",
        payload: {
          question: data.question,
          why: data.why,
          field: data.field,
          suggestion: {
            proposed_answer: data.suggested_answer,
            confidence: data.confidence,
            reasoning: data.reasoning,
            best_practice_note: data.best_practice_note,
          },
          phase_complete: data.phase_complete,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "LLM unavailable";
      dispatch({ type: "ERROR", payload: message });
      toast.error(message);
    }
  };

  // Track the last phase_complete flag from the API
  const lastPhaseCompleteRef = useRef(false);

  // Generate spec using streaming
  const generateSpec = useCallback(async (proj: Project) => {
    stream.reset();

    await stream.startStream("/api/generate", {
      project_data: {
        name: proj.name,
        one_liner: proj.one_liner,
        description: proj.initial_description,
        complexity: proj.complexity,
        is_agentic: proj.is_agentic,
        discovery: proj.discovery,
      },
      complexity: proj.complexity,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance to the next phase (shared logic for force_complete and llm_complete)
  const advancePhase = useCallback((proj: Project, s: typeof state) => {
    const phaseAnswers = s.messages.filter(
      (m: ChatMessage) => m.phase === s.currentPhase && m.type === "user_response"
    );
    const summary = phaseAnswers.map((a: ChatMessage) => `${a.field}: ${a.content.slice(0, 100)}`).join("; ");
    dispatch({ type: "PHASE_COMPLETE", payload: { summary } });

    const discovery = { ...proj.discovery };
    if (s.currentPhase === "discover") discovery.tollgate_1_passed = true;
    if (s.currentPhase === "define") discovery.tollgate_2_passed = true;
    if (s.currentPhase === "architect") discovery.tollgate_3_passed = true;

    const nextPhase = NEXT_PHASE_MAP[s.currentPhase];
    if (nextPhase) {
      setTimeout(() => {
        dispatch({ type: "ADVANCE_PHASE", payload: { nextPhase } });
        const updated = {
          ...proj,
          current_phase: nextPhase,
          discovery: {
            ...discovery,
            chat_messages: stateRef.current.messages,
            understanding: stateRef.current.understanding,
          },
        };
        save(updated);

        if (nextPhase === "specify") {
          generateSpec(updated);
        }

        toast.success(`Phase complete! Moving to ${nextPhase}`);
      }, 500);
    }
  }, [save, generateSpec]);

  // Handle user response (accept/edit/override)
  const handleUserResponse = useCallback((answer: string, action: "accept" | "edit" | "override") => {
    const proj = projectRef.current;
    const s = stateRef.current;
    if (!proj) return;
    dispatch({ type: "USER_RESPOND", payload: { answer, action } });

    // Check adaptive depth — also honor the LLM's phase_complete flag
    const questionsInPhase = s.questionsAskedInPhase + 1;
    const llmSaysComplete = lastPhaseCompleteRef.current;
    const depthResult = shouldPhaseComplete(
      proj.complexity,
      questionsInPhase,
      llmSaysComplete,
    );

    if (depthResult === "force_complete" || depthResult === "complete") {
      advancePhase(proj, { ...s, questionsAskedInPhase: questionsInPhase });
    } else {
      // Continue — fetch next suggestion after state settles
      setTimeout(() => {
        dispatch({ type: "RESTORE_SESSION", payload: { status: "idle" } });
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, advancePhase]);

  const handlePhaseComplete = useCallback(() => {
    const proj = projectRef.current;
    const s = stateRef.current;
    if (!proj) return;
    advancePhase(proj, s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancePhase]);

  const handleSkipToSpec = useCallback(() => {
    const proj = projectRef.current;
    const s = stateRef.current;
    if (!proj) return;
    dispatch({ type: "SKIP_TO_SPEC" });
    const updated = {
      ...proj,
      current_phase: "specify" as Phase,
      discovery: {
        ...proj.discovery,
        chat_messages: s.messages,
        understanding: s.understanding,
      },
    };
    save(updated);
    generateSpec(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save, generateSpec]);

  // Regenerate a single section (SPEC-06)
  const handleRegenerateSection = useCallback(async (sectionNumber: number) => {
    const proj = projectRef.current;
    if (!proj || !specMarkdown) return;

    const sections = parseSpecSections(specMarkdown);
    const targetSection = sections.find(s => s.number === sectionNumber);
    if (!targetSection) {
      toast.error(`Section ${sectionNumber} not found`);
      return;
    }

    setRegeneratingSection(sectionNumber);
    sectionStream.reset();

    try {
      await sectionStream.startStream("/api/generate-section", {
        section_number: sectionNumber,
        section_title: targetSection.title,
        project_data: {
          name: proj.name,
          one_liner: proj.one_liner,
          description: proj.initial_description,
          complexity: proj.complexity,
          is_agentic: proj.is_agentic,
          discovery: proj.discovery,
        },
        current_spec: specMarkdown,
        complexity: proj.complexity,
      });
    } catch {
      toast.error("Failed to regenerate section");
      setRegeneratingSection(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specMarkdown]);

  // When section regeneration completes, splice it into the spec
  useEffect(() => {
    if (
      !sectionStream.isStreaming &&
      sectionStream.text &&
      regeneratingSection !== null &&
      project
    ) {
      const updatedMarkdown = replaceSection(
        specMarkdown,
        regeneratingSection,
        sectionStream.text,
      );

      setSpecMarkdown(updatedMarkdown);

      // Update saved spec
      if (project.spec) {
        const sectionMatches = updatedMarkdown.match(/^## \d+\./gm);
        const updatedSpec = {
          ...project.spec,
          markdown_content: updatedMarkdown,
          section_count: sectionMatches ? sectionMatches.length : 0,
          word_count: updatedMarkdown.split(/\s+/).length,
        };
        const updated = { ...project, spec: updatedSpec };
        save(updated);
      }

      setRegeneratingSection(null);
      sectionStream.reset();
      toast.success(`Section ${regeneratingSection} regenerated`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionStream.isStreaming, sectionStream.text, regeneratingSection]);

  // When full spec streaming completes, save the spec
  const specSavedRef = useRef(false);
  useEffect(() => {
    if (stream.isStreaming) {
      specSavedRef.current = false; // Reset when a new stream starts
    }
    if (!stream.isStreaming && stream.text && project && !specSavedRef.current) {
      specSavedRef.current = true;
      const content = stream.text;
      const sectionMatches = content.match(/^## \d+\./gm);
      const spec = {
        project_id: project.id,
        version: "1.0",
        markdown_content: content,
        section_count: sectionMatches ? sectionMatches.length : 0,
        word_count: content.split(/\s+/).length,
        generated_at: new Date().toISOString(),
      };

      const updated = { ...project, spec, current_phase: "deliver" as Phase };
      save(updated);
      setSpecMarkdown(content);

      // Auto-validate
      fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec_content: content }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(valData => {
          if (valData) {
            const validation = {
              project_id: project.id,
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
        })
        .catch(() => {}); // Validation is optional

      toast.success("Spec generated!");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.isStreaming, stream.text]);

  // Keyboard shortcuts (UX-01)
  useKeyboardShortcuts({
    onCopySpec: () => {
      if (specMarkdown) {
        navigator.clipboard.writeText(specMarkdown);
        toast.success("Spec copied to clipboard!");
      }
    },
  });

  if (!project) {
    return <div className="text-center text-white/30 py-20">Loading...</div>;
  }

  const phaseIdx = PHASES.findIndex(p => p.id === (state.currentPhase || project.current_phase));
  const isDiscoveryPhase = DISCOVERY_PHASES.includes(state.currentPhase);
  const showSpecViewer = (state.currentPhase === "specify" && (stream.isStreaming || stream.text)) ||
    (project.current_phase === "deliver" && specMarkdown);

  return (
    <ErrorBoundary>
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

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Discovery Phases */}
        {isDiscoveryPhase && (
          <motion.div
            key="discovery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Error banner */}
            {state.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-[12px] text-red-300">{state.error}</p>
                <button
                  onClick={fetchSuggestion}
                  className="ml-auto text-[11px] text-red-400 hover:text-red-300 underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Chat container */}
            <ChatContainer
              messages={state.messages}
              currentPhase={state.currentPhase}
              isThinking={state.status === "ai_thinking"}
              onAccept={(answer) => handleUserResponse(answer, "accept")}
              onEdit={(answer) => handleUserResponse(answer, "edit")}
              onOverride={(answer) => handleUserResponse(answer, "override")}
              disabled={state.status === "saving"}
            />

            {/* Skip button */}
            {state.totalQuestionsAsked >= 1 && (
              <SkipButton
                onSkip={handleSkipToSpec}
                questionsAnswered={state.totalQuestionsAsked}
                complexity={project.complexity}
              />
            )}
          </motion.div>
        )}

        {/* Specify Phase: Ready to Generate (fallback if auto-generate didn't fire) */}
        {state.currentPhase === "specify" && !stream.isStreaming && !stream.text && !specMarkdown && (
          <motion.div
            key="specify-ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 space-y-4"
          >
            <Sparkles className="h-8 w-8 text-orange-400 mx-auto" />
            <h2 className="text-lg font-semibold">Ready to generate</h2>
            <p className="text-[13px] text-white/30">
              {state.totalQuestionsAsked} answers collected
            </p>
            <Button
              onClick={() => generateSpec(project)}
              className="bg-orange-500 hover:bg-orange-600 text-black font-semibold"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Generate Spec
            </Button>
          </motion.div>
        )}

        {/* Validation Panel (shown when spec has been validated) */}
        {project.current_phase === "deliver" && project.validation && !stream.isStreaming && (
          <motion.div
            key="validation"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ValidationPanel
              validation={project.validation}
              onFixSection={handleRegenerateSection}
              isFixing={regeneratingSection !== null}
            />
          </motion.div>
        )}

        {/* Spec Viewer: Streaming or Delivered */}
        {showSpecViewer && (
          <motion.div
            key="spec-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <SpecViewer
              content={stream.isStreaming ? stream.text : specMarkdown}
              isStreaming={stream.isStreaming}
              project={project}
              regeneratingSection={regeneratingSection}
              onRegenerate={handleRegenerateSection}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

// Helper: convert ChatMessage[] to QAEntry[] for backward compatibility
function derivQAEntries(messages: ChatMessage[]): QAEntry[] {
  const entries: QAEntry[] = [];
  const questions = messages.filter(m => m.type === "question");
  const responses = messages.filter(m => m.type === "user_response");

  for (let i = 0; i < Math.min(questions.length, responses.length); i++) {
    entries.push({
      id: responses[i].id,
      phase: questions[i].phase,
      question: questions[i].content,
      answer: responses[i].content,
      timestamp: responses[i].timestamp,
    });
  }

  return entries;
}

// Helper: migrate old QAEntry[] to ChatMessage[]
function migrateQAToChat(entries: QAEntry[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const entry of entries) {
    messages.push({
      id: crypto.randomUUID(),
      role: "ai",
      type: "question",
      content: entry.question,
      phase: entry.phase,
      field: "",
      timestamp: entry.timestamp,
    });
    messages.push({
      id: entry.id,
      role: "user",
      type: "user_response",
      content: entry.answer,
      phase: entry.phase,
      field: "",
      user_action: "override",
      timestamp: entry.timestamp,
    });
  }
  return messages;
}
