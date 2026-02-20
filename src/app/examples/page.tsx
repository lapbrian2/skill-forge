"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAMPLES_INDEX } from "@/lib/examples";
import { FileText, Server, Users, Link as LinkIcon, ArrowRight, Sparkles } from "lucide-react";

const FW_ICONS: Record<string, typeof FileText> = {
  claude: FileText, mcp: Server, crewai: Users, langchain: LinkIcon,
};

const FW_COLORS: Record<string, string> = {
  claude: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  mcp: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  crewai: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  langchain: "text-green-400 bg-green-400/10 border-green-400/20",
};

const CX_COLORS: Record<string, string> = {
  simple: "text-emerald-400 border-emerald-400/20",
  moderate: "text-amber-400 border-amber-400/20",
  complex: "text-red-400 border-red-400/20",
};

const FRAMEWORKS = ["all", "claude", "mcp", "crewai", "langchain"];
const COMPLEXITIES = ["all", "simple", "moderate", "complex"];

export default function ExamplesPage() {
  const [fwFilter, setFwFilter] = useState("all");
  const [cxFilter, setCxFilter] = useState("all");

  const filtered = EXAMPLES_INDEX.filter(e =>
    (fwFilter === "all" || e.framework === fwFilter) &&
    (cxFilter === "all" || e.complexity === cxFilter)
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-400" />
          <h1 className="text-2xl font-bold tracking-tight">Reference Library</h1>
        </div>
        <p className="text-[14px] text-white/40">
          7 production-quality examples scoring 94-100 on validation
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-white/30 mr-1">Framework</span>
          {FRAMEWORKS.map(fw => (
            <Button
              key={fw}
              variant="ghost"
              size="sm"
              onClick={() => setFwFilter(fw)}
              className={`text-[12px] h-7 px-2.5 ${
                fwFilter === fw ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {fw === "all" ? "All" : fw}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-white/30 mr-1">Complexity</span>
          {COMPLEXITIES.map(cx => (
            <Button
              key={cx}
              variant="ghost"
              size="sm"
              onClick={() => setCxFilter(cx)}
              className={`text-[12px] h-7 px-2.5 ${
                cxFilter === cx ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              {cx === "all" ? "All" : cx}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((ex, i) => {
          const Icon = FW_ICONS[ex.framework] || FileText;
          return (
            <motion.div
              key={ex.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={`/examples/${ex.name}`}>
                <div className="group rounded-xl border border-white/8 bg-[#111] hover:border-white/15 transition-all p-4 h-full space-y-3 cursor-pointer">
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-[14px] text-white/90">{ex.display_name}</span>
                    <div className={`p-1.5 rounded-md border ${FW_COLORS[ex.framework] || ""}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <p className="text-[12px] text-white/40 line-clamp-2">{ex.description}</p>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${FW_COLORS[ex.framework] || ""}`}>
                      {ex.framework}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${CX_COLORS[ex.complexity] || ""}`}>
                      {ex.complexity}
                    </Badge>
                    {ex.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[10px] h-5 px-1.5 text-white/30 border-white/10">{tag}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center text-[11px] text-white/0 group-hover:text-white/30 transition-colors">
                    View details <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/30 text-sm">
          No examples match the current filters.
        </div>
      )}
    </div>
  );
}
