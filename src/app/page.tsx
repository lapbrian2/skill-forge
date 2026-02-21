"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, ArrowRight, Sparkles, Trash2, FileText,
  Clock, ChevronRight,
} from "lucide-react";
import { listProjects, deleteProject } from "@/lib/storage";
import { PHASES } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { toast } from "sonner";

const PHASE_COLORS: Record<string, string> = {
  discover: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  define: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  architect: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  specify: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  deliver: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const CX_COLORS: Record<string, string> = {
  simple: "text-emerald-400 border-emerald-400/20",
  moderate: "text-amber-400 border-amber-400/20",
  complex: "text-red-400 border-red-400/20",
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(listProjects());
  }, []);

  const handleDelete = (id: string, name: string) => {
    deleteProject(id);
    setProjects(listProjects());
    toast.success(`Deleted "${name || "Untitled"}"`);
  };

  const phaseIndex = (phase: string) => PHASES.findIndex(p => p.id === phase);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Your Specs</h1>
          <p className="text-[14px] text-white/35">
            {projects.length === 0
              ? "No specs yet. Describe what you want to build."
              : `${projects.length} specification${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/create">
          <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold h-10 px-5">
            <Plus className="h-4 w-4 mr-2" /> New Spec
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-white/10 p-12 text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <Sparkles className="h-7 w-7 text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold">Build your first spec</h2>
          <p className="text-[14px] text-white/35 max-w-md mx-auto">
            Describe an app idea in plain English. Skill Forge walks you through
            structured discovery and generates a complete engineering specification
            you can hand directly to Claude Code.
          </p>
          <Link href="/create">
            <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold mt-2">
              <Plus className="h-4 w-4 mr-2" /> Get Started
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Project list */}
      <div className="space-y-3">
        {projects.map((project, i) => {
          const pi = phaseIndex(project.current_phase);
          const grade = project.validation?.grade;
          const score = project.validation?.overall_score;

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-semibold truncate">
                        {project.name || project.initial_description.slice(0, 60) || "Untitled"}
                      </h3>
                      <Badge variant="outline" className={`text-[10px] ${CX_COLORS[project.complexity] || ""}`}>
                        {project.complexity}
                      </Badge>
                      {project.is_agentic && (
                        <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/20">
                          agentic
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {project.one_liner && (
                      <p className="text-[13px] text-white/40 line-clamp-1">{project.one_liner}</p>
                    )}

                    {/* Phase stepper */}
                    <div className="flex items-center gap-1 pt-1">
                      {PHASES.map((phase, idx) => (
                        <div key={phase.id} className="flex items-center">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              idx < pi
                                ? "w-8 bg-orange-500"
                                : idx === pi
                                  ? "w-8 bg-orange-500/50"
                                  : "w-8 bg-white/8"
                            }`}
                          />
                          {idx < PHASES.length - 1 && <div className="w-1" />}
                        </div>
                      ))}
                      <Badge
                        variant="outline"
                        className={`ml-2 text-[10px] ${PHASE_COLORS[project.current_phase] || "text-white/30"}`}
                      >
                        {PHASES[pi]?.label || project.current_phase}
                      </Badge>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-[11px] text-white/20">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                      {score !== undefined && (
                        <span className={`font-bold ${score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400"}`}>
                          {grade} ({score})
                        </span>
                      )}
                      {project.spec && (
                        <span className="flex items-center gap-1 text-white/30">
                          <FileText className="h-3 w-3" />
                          {project.spec.word_count.toLocaleString()} words
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.preventDefault(); handleDelete(project.id, project.name); }}
                      className="h-8 w-8 p-0 text-white/15 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/project/${project.id}`)}
                      className="border-white/8 text-[12px] h-8"
                    >
                      {project.current_phase === "deliver" ? "View Spec" : "Resume"}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
