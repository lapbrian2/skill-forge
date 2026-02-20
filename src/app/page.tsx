"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, CheckCircle, Package, BookOpen, Search, Trash2,
  ArrowRight, Sparkles, Zap, Clock,
} from "lucide-react";
import { loadSkills, deleteSkill } from "@/lib/storage";
import { validateSpec } from "@/lib/validator";
import type { SkillSpec } from "@/lib/types";
import { toast } from "sonner";

const QUICK_ACTIONS = [
  { href: "/create", label: "Create", description: "Build a new skill spec", icon: Plus, gradient: "from-orange-500/20 to-orange-600/5" },
  { href: "/validate", label: "Validate", description: "Run 5-tollgate QA", icon: CheckCircle, gradient: "from-blue-500/20 to-blue-600/5" },
  { href: "/build", label: "Generate", description: "Multi-framework code", icon: Package, gradient: "from-purple-500/20 to-purple-600/5" },
  { href: "/examples", label: "Examples", description: "7 reference skills", icon: BookOpen, gradient: "from-green-500/20 to-green-600/5" },
  { href: "/analyze", label: "Analyze", description: "Improve existing specs", icon: Search, gradient: "from-cyan-500/20 to-cyan-600/5" },
];

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
}

function statusDot(score: number) {
  if (score >= 90) return "bg-emerald-400";
  if (score >= 70) return "bg-amber-400";
  return "bg-red-400";
}

export default function Dashboard() {
  const [skills, setSkills] = useState<SkillSpec[]>([]);

  useEffect(() => {
    setSkills(loadSkills());
  }, []);

  const handleDelete = (name: string) => {
    deleteSkill(name);
    setSkills(loadSkills());
    toast.success("Skill deleted");
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Skill Forge</h1>
          <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-400/30">
            BETA
          </Badge>
        </div>
        <p className="text-[15px] text-white/50 max-w-lg">
          Engineering-grade skill and tool creation for AI agents. Define specs, validate quality, generate production code.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUICK_ACTIONS.map(({ href, label, description, icon: Icon, gradient }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Link href={href}>
              <div className={`group relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-b ${gradient} p-4 hover:border-white/15 transition-all cursor-pointer h-full`}>
                <Icon className="h-5 w-5 text-white/60 mb-3 group-hover:text-white/80 transition-colors" />
                <div className="font-medium text-sm text-white/90">{label}</div>
                <div className="text-[12px] text-white/40 mt-0.5">{description}</div>
                <ArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-white/0 group-hover:text-white/30 transition-all group-hover:translate-x-0.5" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Your Skills */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-400" />
            Your Skills
            <span className="text-white/30 font-normal text-sm">({skills.length})</span>
          </h2>
          {skills.length > 0 && (
            <Link href="/create">
              <Button variant="outline" size="sm" className="text-xs h-8">
                <Plus className="h-3 w-3 mr-1" /> New
              </Button>
            </Link>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {skills.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-dashed border-white/10 p-12 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white/20" />
                </div>
              </div>
              <p className="text-white/40 text-sm mb-1">No skills yet</p>
              <p className="text-white/25 text-xs mb-6">Create your first skill or start from an example</p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/create">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black font-medium">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Skill
                  </Button>
                </Link>
                <Link href="/examples">
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Browse Examples
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {skills.map((skill, i) => {
                const report = validateSpec(skill);
                return (
                  <motion.div
                    key={skill.name}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="group rounded-xl border border-white/8 bg-[#111] hover:border-white/12 transition-all overflow-hidden">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${statusDot(report.overall_score)}`} />
                              <span className="font-medium text-sm truncate">
                                {skill.display_name || skill.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 pl-4">
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">{skill.complexity || "moderate"}</Badge>
                              <span className="text-[11px] text-white/30">v{skill.version}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-xl font-bold tabular-nums ${scoreColor(report.overall_score)}`}>
                              {report.overall_score}
                            </span>
                            <div className={`text-[10px] font-medium ${scoreColor(report.overall_score)}`}>
                              {report.grade}
                            </div>
                          </div>
                        </div>

                        <p className="text-[12px] text-white/40 line-clamp-2">{skill.description}</p>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(skill.target_frameworks || []).map(fw => (
                            <Badge key={fw} variant="secondary" className="text-[10px] h-5 px-1.5 bg-white/5">{fw}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex border-t border-white/8">
                        <Link
                          href={`/build?spec=${encodeURIComponent(JSON.stringify(skill))}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                        >
                          <Package className="h-3 w-3" /> Build
                        </Link>
                        <div className="w-px bg-white/8" />
                        <Link
                          href={`/validate?spec=${encodeURIComponent(JSON.stringify(skill))}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" /> Validate
                        </Link>
                        <div className="w-px bg-white/8" />
                        <button
                          onClick={() => handleDelete(skill.name)}
                          className="px-3 py-2.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="text-center text-[11px] text-white/20 flex items-center justify-center gap-2">
        <Clock className="h-3 w-3" />
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-mono text-[10px]">Cmd+K</kbd> to search
      </div>
    </div>
  );
}
