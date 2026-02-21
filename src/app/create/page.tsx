"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2 } from "lucide-react";
import { quickClassify } from "@/lib/engine/complexity";
import { createProject, BUILDER_PROFILE_LABELS } from "@/lib/types";
import { saveProject } from "@/lib/storage";
import { toast } from "sonner";
import type { Complexity, BuilderProfile } from "@/lib/types";

const STARTERS = [
  { label: "Project Management Tool", desc: "A project management tool for freelancers with time tracking, client invoicing, and milestone tracking" },
  { label: "Code Review Agent", desc: "An autonomous code review agent that analyzes pull requests for bugs, security vulnerabilities, and code quality, then posts findings as GitHub comments" },
  { label: "Recipe App", desc: "A recipe sharing app where users can save, organize, and search recipes by ingredient, cuisine, or dietary restriction" },
  { label: "API Dashboard", desc: "A real-time API monitoring dashboard that tracks uptime, response times, error rates, and sends alerts when thresholds are breached" },
  { label: "Learning Platform", desc: "An online learning platform with courses, quizzes, progress tracking, and certificate generation" },
  { label: "MCP Tool Server", desc: "An MCP server that provides tools for managing GitHub issues, searching code, and automating PR workflows" },
];

const CX_META = {
  simple: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", desc: "3-5 questions, 2-4 page spec" },
  moderate: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", desc: "8-12 questions, 6-12 page spec" },
  complex: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", desc: "15-20 questions, 12-25 page spec" },
};

const BUILDER_PROFILES: { id: BuilderProfile; label: string; desc: string; icon: string }[] = [
  { id: "lovable", label: "Lovable", desc: "AI app builder", icon: "heart" },
  { id: "bolt", label: "Bolt", desc: "AI full-stack builder", icon: "zap" },
  { id: "claude_code", label: "Claude Code", desc: "AI coding agent", icon: "terminal" },
  { id: "cursor", label: "Cursor", desc: "AI code editor", icon: "mouse-pointer" },
  { id: "replit_agent", label: "Replit Agent", desc: "AI dev environment", icon: "play" },
  { id: "dev_team", label: "Dev Team", desc: "Traditional engineers", icon: "users" },
];

export default function CreatePage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [builderProfile, setBuilderProfile] = useState<BuilderProfile>("claude_code");
  const [isCreating, setIsCreating] = useState(false);
  const [classification, setClassification] = useState<{
    complexity: Complexity;
    is_agentic: boolean;
    confidence: number;
  } | null>(null);

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (value.trim().length > 10) {
      setClassification(quickClassify(value));
    } else {
      setClassification(null);
    }
  };

  const handleCreate = async () => {
    if (!description.trim()) {
      toast.error("Describe what you want to build");
      return;
    }

    setIsCreating(true);

    try {
      let complexity: Complexity = classification?.complexity || "moderate";
      let isAgentic = classification?.is_agentic || false;
      let name = "";
      let oneLiner = "";

      try {
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "classify", description: description.trim() }),
        });

        if (res.ok) {
          const data = await res.json();
          complexity = data.complexity as Complexity;
          isAgentic = data.is_agentic;
          name = data.suggested_name || "";
          oneLiner = data.one_liner || "";
        }
      } catch {
        // LLM unavailable — use client-side classification
      }

      const project = createProject(description.trim(), complexity, builderProfile);
      project.is_agentic = isAgentic;
      project.name = name;
      project.one_liner = oneLiner;

      saveProject(project);
      toast.success("Project created!");
      router.push(`/project/${project.id}`);
    } catch {
      toast.error("Failed to create project");
      setIsCreating(false);
    }
  };

  const cx = classification ? CX_META[classification.complexity] : null;
  const isAITool = builderProfile !== "dev_team";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Hero */}
        <div className="text-center space-y-2 pt-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-2">
            <Sparkles className="h-6 w-6 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">What do you want to build?</h1>
          <p className="text-[14px] text-white/35 max-w-lg mx-auto">
            Describe your app idea. Skill Forge will guide you through structured discovery
            and generate a complete engineering specification.
          </p>
        </div>

        {/* Builder Profile Selector */}
        <div className="max-w-2xl mx-auto space-y-2">
          <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium">
            What are you building with?
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {BUILDER_PROFILES.map(bp => (
              <button
                key={bp.id}
                onClick={() => setBuilderProfile(bp.id)}
                className={`text-center rounded-xl border transition-all p-2.5 ${
                  builderProfile === bp.id
                    ? "border-orange-500/50 bg-orange-500/10 ring-1 ring-orange-500/20"
                    : "border-white/5 bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/10"
                }`}
              >
                <span className={`text-[12px] font-medium block ${
                  builderProfile === bp.id ? "text-orange-400" : "text-white/60"
                }`}>
                  {bp.label}
                </span>
                <span className="text-[9px] text-white/20 block mt-0.5">{bp.desc}</span>
              </button>
            ))}
          </div>
          {isAITool && (
            <p className="text-[11px] text-orange-400/50">
              Spec optimized for {BUILDER_PROFILE_LABELS[builderProfile]} — shorter, UI-focused, direct instructions
            </p>
          )}
        </div>

        {/* Input */}
        <div className="rounded-2xl border border-white/8 bg-[#111] p-6 space-y-4 max-w-2xl mx-auto">
          <Textarea
            value={description}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder={isAITool
              ? "e.g. A habit tracker with daily streaks, charts, and reminders"
              : "e.g. A project management tool for freelancers with time tracking and invoicing"
            }
            className="bg-[#0A0A0A] border-white/8 text-[15px] min-h-[130px] resize-none placeholder:text-white/15 leading-relaxed rounded-xl"
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate();
            }}
          />

          {/* Live classification */}
          {classification && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-3 text-[13px]"
            >
              <Badge variant="outline" className={`${cx?.color} ${cx?.bg}`}>
                {classification.complexity}
              </Badge>
              <span className="text-white/25">{cx?.desc}</span>
              {classification.is_agentic && (
                <Badge variant="outline" className="text-purple-400 bg-purple-500/10 border-purple-500/20">
                  agentic
                </Badge>
              )}
            </motion.div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/15">Ctrl+Enter to start</span>
            <Button
              onClick={handleCreate}
              disabled={!description.trim() || isCreating}
              className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-11 px-8 text-[14px] rounded-xl"
            >
              {isCreating ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="mr-2">
                  <Sparkles className="h-4 w-4" />
                </motion.div>
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {isCreating ? "Creating..." : "Start Discovery"}
            </Button>
          </div>
        </div>

        {/* Templates */}
        <div className="max-w-2xl mx-auto space-y-3">
          <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium">
            Or start from a template
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STARTERS.map(s => (
              <button
                key={s.label}
                onClick={() => handleDescriptionChange(s.desc)}
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
    </div>
  );
}
