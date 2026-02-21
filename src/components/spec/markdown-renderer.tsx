"use client";

// ═══════════════════════════════════════════════════════════════
// Skill Forge — Streaming Markdown Renderer
// Renders markdown progressively as it streams from the LLM.
// Handles partial/incomplete markdown gracefully.
// ═══════════════════════════════════════════════════════════════

import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Components } from "react-markdown";

// ── Types ─────────────────────────────────────────────────────

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  onSectionHover?: (sectionNumber: number | null) => void;
}

// ── Copy Button for Code Blocks ───────────────────────────────

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/8 transition-colors opacity-0 group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-white/40" />
      )}
    </button>
  );
}

// ── Custom Components ─────────────────────────────────────────

function createComponents(): Components {
  return {
    // Headings with anchor IDs
    h1: ({ children, ...props }) => (
      <h1
        id={slugify(String(children))}
        className="text-2xl font-bold tracking-tight text-white mt-8 mb-4 first:mt-0 scroll-mt-20"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        id={slugify(String(children))}
        className="text-xl font-semibold text-white mt-8 mb-3 pt-4 border-t border-white/6 first:border-t-0 first:pt-0 scroll-mt-20"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        id={slugify(String(children))}
        className="text-[15px] font-semibold text-white/90 mt-6 mb-2 scroll-mt-20"
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        id={slugify(String(children))}
        className="text-[14px] font-medium text-white/80 mt-4 mb-2 scroll-mt-20"
        {...props}
      >
        {children}
      </h4>
    ),

    // Paragraphs
    p: ({ children, ...props }) => (
      <p className="text-[13px] leading-relaxed text-white/60 mb-3" {...props}>
        {children}
      </p>
    ),

    // Lists
    ul: ({ children, ...props }) => (
      <ul className="text-[13px] leading-relaxed text-white/60 mb-3 space-y-1 list-disc list-inside ml-2" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="text-[13px] leading-relaxed text-white/60 mb-3 space-y-1 list-decimal list-inside ml-2" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-white/60" {...props}>
        {children}
      </li>
    ),

    // Code blocks with copy button
    pre: ({ children, ...props }) => (
      <div className="group relative my-4">
        <pre
          className="rounded-lg bg-[#0A0A0A] border border-white/6 p-4 overflow-x-auto text-[12px] leading-relaxed"
          {...props}
        >
          {children}
        </pre>
        <CopyCodeButton
          code={extractTextFromChildren(children)}
        />
      </div>
    ),
    code: ({ className, children, ...props }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code
            className="text-[12px] bg-white/6 border border-white/8 rounded px-1.5 py-0.5 text-orange-300 font-mono"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code className={`${className || ""} font-mono`} {...props}>
          {children}
        </code>
      );
    },

    // Tables
    table: ({ children, ...props }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-white/8">
        <table className="w-full text-[12px]" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-white/4 border-b border-white/8" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => (
      <tbody className="divide-y divide-white/5" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => (
      <tr className="hover:bg-white/3 transition-colors" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th
        className="px-3 py-2 text-left text-[11px] font-semibold text-white/50 uppercase tracking-wider"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-3 py-2 text-white/60" {...props}>
        {children}
      </td>
    ),

    // Blockquote (used for [ASSUMPTION] notes)
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="border-l-2 border-amber-500/40 bg-amber-500/5 rounded-r-lg px-4 py-2 my-3 text-[12px] text-amber-200/70"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Horizontal rule
    hr: ({ ...props }) => (
      <hr className="my-6 border-white/8" {...props} />
    ),

    // Strong and emphasis
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-white/80" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="text-white/50 italic" {...props}>
        {children}
      </em>
    ),

    // Links
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
  };
}

// ── Helpers ───────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (children && typeof children === "object" && "props" in children) {
    const props = children.props as { children?: React.ReactNode };
    return extractTextFromChildren(props.children);
  }
  return String(children || "");
}

// ── Component ─────────────────────────────────────────────────

const components = createComponents();

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  isStreaming = false,
}: MarkdownRendererProps) {
  return (
    <div className={`spec-markdown-content ${isStreaming ? "streaming" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
});
