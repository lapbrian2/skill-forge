"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Package, BookOpen, Search, Trash2 } from "lucide-react";
import { loadSkills, deleteSkill } from "@/lib/storage";
import { validateSpec } from "@/lib/validator";
import type { SkillSpec } from "@/lib/types";

const QUICK_ACTIONS = [
  { href: "/create", label: "Create Skill", description: "Build a new skill from scratch", icon: Plus, color: "text-green-400" },
  { href: "/validate", label: "Validate", description: "Check a skill spec quality", icon: CheckCircle, color: "text-blue-400" },
  { href: "/build", label: "Generate Code", description: "Generate framework outputs", icon: Package, color: "text-purple-400" },
  { href: "/examples", label: "Browse Examples", description: "7 reference skills", icon: BookOpen, color: "text-orange-400" },
  { href: "/analyze", label: "Analyze Skill", description: "Improve existing skills", icon: Search, color: "text-cyan-400" },
];

export default function Dashboard() {
  const [skills, setSkills] = useState<SkillSpec[]>([]);

  useEffect(() => {
    setSkills(loadSkills());
  }, []);

  const handleDelete = (name: string) => {
    deleteSkill(name);
    setSkills(loadSkills());
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Skill Forge</h1>
        <p className="text-muted-foreground mt-1">
          Engineering-grade skill and tool creation for AI agents
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {QUICK_ACTIONS.map(({ href, label, description, icon: Icon, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <Icon className={`h-8 w-8 ${color} mb-3`} />
                <div className="font-medium">{label}</div>
                <div className="text-sm text-muted-foreground mt-1">{description}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Skills */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Skills ({skills.length})</h2>
        {skills.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No skills created yet</p>
              <Link href="/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Skill
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => {
              const report = validateSpec(skill);
              return (
                <Card key={skill.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{skill.display_name || skill.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{skill.complexity || "moderate"}</Badge>
                          <Badge variant="outline" className="text-xs">v{skill.version}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${report.overall_score >= 70 ? "text-green-400" : "text-red-400"}`}>
                          {report.overall_score}
                        </div>
                        <div className="text-xs text-muted-foreground">{report.grade}</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{skill.description}</p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {(skill.target_frameworks || []).map(fw => (
                        <Badge key={fw} variant="secondary" className="text-xs">{fw}</Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/build?spec=${encodeURIComponent(JSON.stringify(skill))}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Package className="h-3 w-3 mr-1" /> Build
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(skill.name)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
