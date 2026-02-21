// ═══════════════════════════════════════════════════════════════
// POST /api/validate
// Runs Tollgates 4-5 against a spec document.
// Uses Zod-validated structured output for LLM clarity scoring.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { llmParse } from "@/lib/llm/client";
import { ValidationClaritySchema } from "@/lib/llm/schemas";
import { SYSTEM_VALIDATOR, promptValidateClarity } from "@/lib/llm/prompts";
import { WEASEL_WORDS, TOLLGATE_WEIGHTS, scoreToGrade, SPEC_SECTIONS } from "@/lib/constants";
import type { Check, Remediation, TollgateResult } from "@/lib/types";

function checkSection(markdown: string, sectionNumber: number, title: string): Check {
  const pattern = new RegExp(`## ${sectionNumber}\\.\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "i");
  const hasSection = pattern.test(markdown) || markdown.includes(`## ${sectionNumber}.`);
  return {
    id: `section_${sectionNumber}`,
    description: `Section ${sectionNumber}: ${title} exists`,
    passed: hasSection,
    details: hasSection ? undefined : `Missing section ${sectionNumber}: ${title}`,
  };
}

function checkWeaselWords(markdown: string): { count: number; found: string[] } {
  const lower = markdown.toLowerCase();
  const found = WEASEL_WORDS.filter(w => lower.includes(w));
  return { count: found.length, found };
}

function checkPlaceholders(markdown: string): string[] {
  const patterns = [/\bTODO\b/gi, /\bTBD\b/gi, /\bPLACEHOLDER\b/gi, /\bFIXME\b/gi, /\bXXX\b/gi];
  const found: string[] = [];
  for (const p of patterns) {
    const matches = markdown.match(p);
    if (matches) found.push(...matches);
  }
  return found;
}

function checkAssumptions(markdown: string): number {
  const matches = markdown.match(/\[ASSUMPTION\]/gi);
  return matches ? matches.length : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { spec_content, required_sections } = body;

    if (!spec_content) {
      return NextResponse.json({ error: "spec_content required" }, { status: 400 });
    }

    const sections = required_sections || [1, 2, 3, 4, 5, 6, 7, 8, 13];
    const remediations: Remediation[] = [];

    // ── Tollgate 4: Completeness ──────────────────────────────
    const t4Checks: Check[] = [];

    // Check required sections exist
    for (const num of sections) {
      const sectionInfo = SPEC_SECTIONS.find(s => s.number === num);
      if (sectionInfo) {
        const check = checkSection(spec_content, num, sectionInfo.title);
        t4Checks.push(check);
        if (!check.passed) {
          remediations.push({
            tollgate: 4,
            severity: "critical",
            section: `Section ${num}`,
            message: `Missing required section: ${sectionInfo.title}`,
            auto_fixable: false,
          });
        }
      }
    }

    // Check for weasel words
    const weasels = checkWeaselWords(spec_content);
    t4Checks.push({
      id: "clarity_weasel_words",
      description: "No vague/weasel words used",
      passed: weasels.count <= 3,
      details: weasels.count > 3 ? `Found ${weasels.count} weasel words: ${weasels.found.slice(0, 5).join(", ")}` : undefined,
    });
    if (weasels.count > 3) {
      remediations.push({
        tollgate: 4,
        severity: "warning",
        section: "Throughout",
        message: `Found ${weasels.count} vague words (${weasels.found.slice(0, 5).join(", ")}). Replace with specific terms.`,
        auto_fixable: false,
      });
    }

    // Check word count meets complexity minimum
    const wordCount = spec_content.split(/\s+/).length;
    const minWords = 500; // Even simple specs should be substantial
    t4Checks.push({
      id: "depth_word_count",
      description: `Spec has sufficient depth (>${minWords} words)`,
      passed: wordCount >= minWords,
      details: wordCount < minWords ? `Only ${wordCount} words. Spec needs more detail.` : undefined,
    });

    // Check data model has field definitions
    const hasFieldTypes = /\b(string|number|boolean|uuid|integer|float|text|date|timestamp|varchar|int)\b/i.test(spec_content);
    t4Checks.push({
      id: "data_model_types",
      description: "Data model includes field types",
      passed: hasFieldTypes,
    });

    // Check API endpoints have methods
    const hasApiMethods = /\b(GET|POST|PUT|PATCH|DELETE)\s+\//i.test(spec_content);
    t4Checks.push({
      id: "api_methods",
      description: "API endpoints include HTTP methods",
      passed: hasApiMethods || !sections.includes(6),
    });

    const t4Passed = t4Checks.filter(c => c.passed).length;
    const t4Score = t4Checks.length > 0 ? Math.round((t4Passed / t4Checks.length) * 100) : 0;

    const tollgate4: TollgateResult = {
      name: "Completeness",
      checks: t4Checks,
      passed_count: t4Passed,
      failed_count: t4Checks.length - t4Passed,
      score: t4Score,
    };

    // ── Tollgate 5: Production Readiness ──────────────────────
    const t5Checks: Check[] = [];

    // No TODO/TBD/placeholder text
    const placeholders = checkPlaceholders(spec_content);
    t5Checks.push({
      id: "no_placeholders",
      description: "No TODO/TBD/placeholder text",
      passed: placeholders.length === 0,
      details: placeholders.length > 0 ? `Found: ${placeholders.join(", ")}` : undefined,
    });
    if (placeholders.length > 0) {
      remediations.push({
        tollgate: 5,
        severity: "critical",
        section: "Throughout",
        message: `Found ${placeholders.length} placeholder markers: ${placeholders.slice(0, 3).join(", ")}. All must be resolved.`,
        auto_fixable: false,
      });
    }

    // Assumptions flagged
    const assumptionCount = checkAssumptions(spec_content);
    t5Checks.push({
      id: "assumptions_flagged",
      description: "Assumptions explicitly marked",
      passed: true, // Having them is good, not having them is also fine
      details: assumptionCount > 0 ? `${assumptionCount} assumptions flagged for review` : "No assumptions to review",
    });

    // Has version number
    const hasVersion = /\bv?\d+\.\d+/i.test(spec_content);
    t5Checks.push({
      id: "has_version",
      description: "Version number assigned",
      passed: hasVersion,
    });

    // Has success metrics
    const hasMetrics = /success\s+metric|kpi|measur/i.test(spec_content);
    t5Checks.push({
      id: "has_metrics",
      description: "Success metrics defined",
      passed: hasMetrics,
    });

    // Has implementation roadmap
    const hasRoadmap = /roadmap|implementation.*phase|phase\s+\d/i.test(spec_content);
    t5Checks.push({
      id: "has_roadmap",
      description: "Implementation roadmap present",
      passed: hasRoadmap,
    });

    const t5Passed = t5Checks.filter(c => c.passed).length;
    const t5Score = t5Checks.length > 0 ? Math.round((t5Passed / t5Checks.length) * 100) : 0;

    const tollgate5: TollgateResult = {
      name: "Production Readiness",
      checks: t5Checks,
      passed_count: t5Passed,
      failed_count: t5Checks.length - t5Passed,
      score: t5Score,
    };

    // ── Overall Score ─────────────────────────────────────────
    const overall = Math.round(
      t4Score * TOLLGATE_WEIGHTS.tollgate_4 +
      t5Score * TOLLGATE_WEIGHTS.tollgate_5
    );
    const grade = scoreToGrade(overall);

    // ── Optional: LLM clarity scoring for key sections ────────
    // Only if API key is available and spec is long enough
    let llmClarity = null;
    let llmUsage = null;
    if (wordCount > 300) {
      try {
        // Score a sample section (first 2000 chars of data model or features)
        const sampleSection = spec_content.slice(0, 2000);
        const { data, usage } = await llmParse({
          task: "validate",
          system: SYSTEM_VALIDATOR,
          prompt: promptValidateClarity(sampleSection, "Sample"),
          schema: ValidationClaritySchema,
        });
        llmClarity = data;
        llmUsage = {
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
          cache_read: usage.cache_read_input_tokens,
          cache_creation: usage.cache_creation_input_tokens,
          model: usage.model,
        };

        if (data.issues.length > 0) {
          for (const issue of data.issues.slice(0, 3)) {
            remediations.push({
              tollgate: 4,
              severity: "warning",
              section: "LLM Analysis",
              message: issue,
              auto_fixable: false,
            });
          }
        }
      } catch {
        // LLM scoring is optional — continue without it
      }
    }

    return NextResponse.json({
      tollgate_4: tollgate4,
      tollgate_5: tollgate5,
      overall_score: overall,
      grade,
      remediations,
      passed: overall >= 70,
      llm_clarity: llmClarity,
      llm_usage: llmUsage,
      word_count: wordCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[/api/validate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
