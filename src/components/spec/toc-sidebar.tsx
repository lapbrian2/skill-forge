"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Table of Contents Sidebar
// Live TOC that updates as the spec streams in.
// Highlights current section based on scroll position.
// ═══════════════════════════════════════════════════════════════

import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

interface TocEntry {
  id: string;
  text: string;
  level: number;
  number: string;
}

interface TocSidebarProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

// ── Heading Extraction ────────────────────────────────────────

function extractHeadings(markdown: string): TocEntry[] {
  const headings: TocEntry[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();

    // Extract section number if present (e.g., "1. Product Overview" → "1")
    const numMatch = text.match(/^(\d+(?:\.\d+)?)[.\s]/);
    const number = numMatch ? numMatch[1] : "";

    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    headings.push({ id, text, level, number });
  }

  return headings;
}

// ── Component ─────────────────────────────────────────────────

export function TocSidebar({ content, isStreaming = false, className = "" }: TocSidebarProps) {
  const [activeId, setActiveId] = useState<string>("");

  const headings = useMemo(() => extractHeadings(content), [content]);

  // Track scroll position to highlight active section
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      },
    );

    // Observe all heading elements
    const headingElements = document.querySelectorAll(
      ".spec-markdown-content h1[id], .spec-markdown-content h2[id], .spec-markdown-content h3[id]"
    );
    headingElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [headings]);

  const scrollTo = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }, []);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2 mb-3 px-2">
        <List className="h-3.5 w-3.5 text-white/30" />
        <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
          Contents
        </span>
        {isStreaming && (
          <span className="text-[10px] text-orange-400/60 animate-pulse">streaming...</span>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {headings.map((heading) => (
          <motion.button
            key={heading.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollTo(heading.id)}
            className={`
              w-full text-left px-2 py-1 rounded-md text-[11px] leading-tight
              transition-colors duration-150 hover:bg-white/5 block
              ${heading.level === 1
                ? "font-semibold text-white/60 pl-2"
                : heading.level === 2
                  ? "font-medium text-white/45 pl-4"
                  : "text-white/30 pl-6"
              }
              ${activeId === heading.id
                ? "!text-orange-400 bg-orange-500/5 border-l-2 border-orange-400 !pl-3"
                : ""
              }
            `}
            title={heading.text}
          >
            <span className="line-clamp-2">
              {heading.number && (
                <span className="text-white/20 mr-1 font-mono text-[10px]">
                  {heading.number}
                </span>
              )}
              {heading.text.replace(/^\d+(?:\.\d+)?[.\s]+/, "")}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </nav>
  );
}
