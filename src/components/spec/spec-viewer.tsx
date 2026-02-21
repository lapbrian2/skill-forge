"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Spec Viewer
// Main viewer composing TOC sidebar, markdown renderer, toolbar,
// and section actions. Handles streaming and section regeneration.
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { MarkdownRenderer } from "./markdown-renderer";
import { TocSidebar } from "./toc-sidebar";
import { SpecToolbar } from "./spec-toolbar";
import { SectionActions } from "./section-actions";
import { parseSpecSections, getSpecStats } from "@/lib/spec/section-parser";
import type { Project } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────

type ViewMode = "preview" | "raw";

interface SpecViewerProps {
  content: string;
  isStreaming?: boolean;
  project: Project;
  regeneratingSection: number | null;
  onRegenerate: (sectionNumber: number) => void;
}

// ── Component ─────────────────────────────────────────────────

export function SpecViewer({
  content,
  isStreaming = false,
  project,
  regeneratingSection,
  onRegenerate,
}: SpecViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");

  const stats = useMemo(() => getSpecStats(content), [content]);
  const sections = useMemo(() => parseSpecSections(content), [content]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <SpecToolbar
        content={content}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        wordCount={stats.wordCount}
        sectionCount={stats.sectionCount}
        validationGrade={project.validation?.grade}
        validationScore={project.validation?.overall_score}
        isStreaming={isStreaming}
        projectName={project.name || "spec"}
      />

      {/* Main content area with TOC sidebar */}
      <div className="flex gap-6">
        {/* TOC Sidebar — hidden on mobile */}
        {stats.sectionCount > 0 && (
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block w-52 flex-shrink-0 sticky top-20 self-start max-h-[calc(100vh-120px)] overflow-y-auto"
          >
            <TocSidebar
              content={content}
              isStreaming={isStreaming}
            />
          </motion.aside>
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-white/8 bg-[#111] overflow-hidden">
            {viewMode === "preview" ? (
              <div className="p-6 max-h-[calc(100vh-220px)] overflow-y-auto">
                {/* Render sections with action buttons */}
                {sections.length > 0 ? (
                  <div className="space-y-0">
                    {/* Preamble (content before first section) */}
                    {content.slice(0, sections[0].startIndex).trim() && (
                      <MarkdownRenderer
                        content={content.slice(0, sections[0].startIndex)}
                        isStreaming={false}
                      />
                    )}

                    {/* Sections with hover actions */}
                    {sections.map((section) => (
                      <div key={section.number} className="group relative">
                        {/* Section action buttons */}
                        <div className="absolute -top-1 right-0 z-10">
                          <SectionActions
                            sectionNumber={section.number}
                            sectionTitle={section.title}
                            sectionContent={section.content}
                            isRegenerating={regeneratingSection === section.number}
                            onRegenerate={onRegenerate}
                          />
                        </div>

                        {/* Section content with regeneration overlay */}
                        <div className={`relative ${
                          regeneratingSection === section.number
                            ? "opacity-40 pointer-events-none"
                            : ""
                        }`}>
                          <MarkdownRenderer
                            content={section.content}
                            isStreaming={
                              isStreaming &&
                              section.number === sections[sections.length - 1].number
                            }
                          />
                        </div>

                        {/* Regeneration loading overlay */}
                        {regeneratingSection === section.number && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-[#111]/80 rounded-lg px-4 py-2 flex items-center gap-2 border border-orange-500/20">
                              <div className="h-4 w-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                              <span className="text-[12px] text-orange-400">
                                Regenerating section {section.number}...
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Streaming cursor after last section */}
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </div>
                ) : (
                  /* Content without parseable sections (during early streaming) */
                  <MarkdownRenderer
                    content={content}
                    isStreaming={isStreaming}
                  />
                )}
              </div>
            ) : (
              /* Raw markdown view */
              <div className="p-6 max-h-[calc(100vh-220px)] overflow-y-auto">
                <pre className="text-[12px] font-mono text-white/50 whitespace-pre-wrap leading-relaxed">
                  {content}
                </pre>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
