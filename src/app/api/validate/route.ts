// ═══════════════════════════════════════════════════════════════
// POST /api/validate
// Runs Tollgates 4-5 against a spec document.
// Granular checks with weighted scoring for fair grading.
// Uses Zod-validated structured output for LLM clarity scoring.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { llmParse } from "@/lib/llm/client";
import { ValidationClaritySchema } from "@/lib/llm/schemas";
import { SYSTEM_VALIDATOR, promptValidateClarity } from "@/lib/llm/prompts";
import { WEASEL_WORDS, TOLLGATE_WEIGHTS, scoreToGrade, SPEC_SECTIONS } from "@/lib/constants";
import type { Check, Remediation, TollgateResult } from "@/lib/types";

// Extend Vercel function timeout for LLM-based validation.
export const maxDuration = 60;

// ── Helper functions ───────────────────────────────────────────

function checkSection(markdown: string, sectionNumber: number, title: string): Check {
  // More lenient: check for ## N. or ## N: or just ## N followed by title words
  const patterns = [
    new RegExp(`##\\s+${sectionNumber}\\.\\s+`, "i"),
    new RegExp(`##\\s+${sectionNumber}\\.`, "i"),
    new RegExp(`##\\s+${sectionNumber}\\s`, "i"),
  ];
  const hasSection = patterns.some(p => p.test(markdown));
  return {
    id: `section_${sectionNumber}`,
    description: `Section ${sectionNumber}: ${title} exists`,
    passed: hasSection,
    details: hasSection ? undefined : `Missing section ${sectionNumber}: ${title}`,
  };
}

function countWeaselWordOccurrences(markdown: string): { totalOccurrences: number; uniqueFound: string[]; occurrenceMap: Record<string, number> } {
  const lower = markdown.toLowerCase();
  const occurrenceMap: Record<string, number> = {};
  let totalOccurrences = 0;

  for (const word of WEASEL_WORDS) {
    // Use word boundary matching for more accurate counting
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      occurrenceMap[word] = matches.length;
      totalOccurrences += matches.length;
    }
  }

  return {
    totalOccurrences,
    uniqueFound: Object.keys(occurrenceMap),
    occurrenceMap,
  };
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

// ── Main handler ───────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { spec_content, required_sections } = body;

    if (!spec_content) {
      return NextResponse.json({ error: "spec_content required" }, { status: 400 });
    }

    const sections = required_sections || [1, 2, 3, 4, 5, 6, 7, 8, 13];
    const remediations: Remediation[] = [];
    const wordCount = spec_content.split(/\s+/).length;

    // ══════════════════════════════════════════════════════════
    // Tollgate 4: Completeness & Specificity (60% weight)
    // More granular checks — each check is worth less, so
    // one failure doesn't tank the entire score.
    // ══════════════════════════════════════════════════════════
    const t4Checks: Check[] = [];

    // 4.1: Check required sections exist
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

    // 4.2: Weasel words — graduated scoring
    // Few weasel words = pass, moderate = warning, excessive = fail
    const weasels = countWeaselWordOccurrences(spec_content);
    const weaselDensity = wordCount > 0 ? (weasels.totalOccurrences / wordCount) * 1000 : 0;
    // density < 2 per 1000 words = great, < 5 = ok, >= 5 = needs work
    const weaselPass = weaselDensity < 5;
    t4Checks.push({
      id: "clarity_weasel_low",
      description: "Minimal vague language (< 5 per 1000 words)",
      passed: weaselPass,
      details: !weaselPass
        ? `${weasels.totalOccurrences} vague words found (${weaselDensity.toFixed(1)}/1000 words): ${weasels.uniqueFound.slice(0, 5).join(", ")}`
        : `${weasels.totalOccurrences} vague words (${weaselDensity.toFixed(1)}/1000 words) — within threshold`,
    });
    if (!weaselPass) {
      remediations.push({
        tollgate: 4,
        severity: "warning",
        section: "Throughout",
        message: `Found ${weasels.totalOccurrences} vague words (${weasels.uniqueFound.slice(0, 5).join(", ")}). Replace with specific terms.`,
        auto_fixable: false,
      });
    }

    // 4.3: Word count — graduated by check
    const minWords = 500;
    const goodWords = 2000;
    t4Checks.push({
      id: "depth_minimum",
      description: `Spec meets minimum depth (>${minWords} words)`,
      passed: wordCount >= minWords,
      details: wordCount < minWords ? `Only ${wordCount} words. Spec needs more detail.` : undefined,
    });
    t4Checks.push({
      id: "depth_comprehensive",
      description: `Spec has comprehensive depth (>${goodWords} words)`,
      passed: wordCount >= goodWords,
      details: wordCount < goodWords ? `${wordCount} words — aim for ${goodWords}+ for thorough coverage.` : undefined,
    });

    // 4.4: Data model specificity
    const hasFieldTypes = /\b(string|number|boolean|uuid|integer|float|text|date|timestamp|varchar|int|Date|UUID|enum)\b/i.test(spec_content);
    t4Checks.push({
      id: "data_model_types",
      description: "Data model includes typed field definitions",
      passed: hasFieldTypes,
    });

    // 4.5: Has data model tables (pipes indicate markdown tables)
    const tableCount = (spec_content.match(/\|.*\|.*\|/g) || []).length;
    t4Checks.push({
      id: "has_tables",
      description: "Uses structured tables for data definitions",
      passed: tableCount >= 3,
      details: tableCount < 3 ? `Only ${tableCount} tables found. Use tables for field defs, endpoints, errors.` : undefined,
    });

    // 4.6: API endpoints have methods
    const apiMethodMatches = spec_content.match(/\b(GET|POST|PUT|PATCH|DELETE)\s+\//gi) || [];
    const hasApiMethods = apiMethodMatches.length > 0;
    t4Checks.push({
      id: "api_methods",
      description: "API endpoints include HTTP methods",
      passed: hasApiMethods || !sections.includes(6),
    });

    // 4.7: Has TypeScript interfaces
    const tsInterfaceCount = (spec_content.match(/\binterface\s+\w+/g) || []).length;
    t4Checks.push({
      id: "has_typescript_interfaces",
      description: "TypeScript interfaces defined for data contracts",
      passed: tsInterfaceCount >= 2,
      details: tsInterfaceCount < 2 ? `Only ${tsInterfaceCount} TypeScript interfaces. Define request/response types.` : undefined,
    });

    // 4.8: Has code blocks
    const codeBlockCount = (spec_content.match(/```/g) || []).length / 2;
    t4Checks.push({
      id: "has_code_blocks",
      description: "Includes code examples and type definitions",
      passed: codeBlockCount >= 2,
      details: codeBlockCount < 2 ? `Only ${Math.floor(codeBlockCount)} code blocks. Add TypeScript interfaces and examples.` : undefined,
    });

    // 4.9: Has acceptance criteria (GIVEN/WHEN/THEN or similar)
    const hasCriteria = /\b(GIVEN|WHEN|THEN|acceptance\s+criteria)\b/i.test(spec_content);
    t4Checks.push({
      id: "has_acceptance_criteria",
      description: "Features have testable acceptance criteria",
      passed: hasCriteria,
    });

    // 4.10: Has error handling tables/descriptions
    const hasErrorHandling = /\b(error|Error)\s+(response|handling|code|table)/i.test(spec_content) ||
      /\b(400|401|403|404|409|422|429|500)\b/.test(spec_content);
    t4Checks.push({
      id: "has_error_handling",
      description: "Error handling documented with status codes",
      passed: hasErrorHandling,
    });

    // 4.11: Has edge cases mentioned
    const hasEdgeCases = /edge\s+case|boundary|corner\s+case|empty\s+state|invalid\s+input/i.test(spec_content);
    t4Checks.push({
      id: "has_edge_cases",
      description: "Edge cases documented",
      passed: hasEdgeCases,
    });

    // 4.12: Has user flows with numbered steps
    const hasNumberedSteps = /^\s*\d+\.\s+/m.test(spec_content);
    t4Checks.push({
      id: "has_numbered_flows",
      description: "User flows use numbered steps",
      passed: hasNumberedSteps,
    });

    const t4Passed = t4Checks.filter(c => c.passed).length;
    const t4Score = t4Checks.length > 0 ? Math.round((t4Passed / t4Checks.length) * 100) : 0;

    const tollgate4: TollgateResult = {
      name: "Completeness & Specificity",
      checks: t4Checks,
      passed_count: t4Passed,
      failed_count: t4Checks.length - t4Passed,
      score: t4Score,
    };

    // ══════════════════════════════════════════════════════════
    // Tollgate 5: Production Readiness (40% weight)
    // ══════════════════════════════════════════════════════════
    const t5Checks: Check[] = [];

    // 5.1: No placeholders
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

    // 5.2: Assumptions flagged
    const assumptionCount = checkAssumptions(spec_content);
    t5Checks.push({
      id: "assumptions_flagged",
      description: "Assumptions explicitly marked with [ASSUMPTION]",
      passed: true, // Having them is good, not having them is also fine
      details: assumptionCount > 0 ? `${assumptionCount} assumptions flagged for review` : "No assumptions to review",
    });

    // 5.3: Has version number
    const hasVersion = /\bv(ersion)?[:\s]*\d+\.\d+/i.test(spec_content) || /\b\d+\.\d+\.\d+\b/.test(spec_content);
    t5Checks.push({
      id: "has_version",
      description: "Version number assigned",
      passed: hasVersion,
    });
    if (!hasVersion) {
      remediations.push({
        tollgate: 5,
        severity: "warning",
        section: "Section 1",
        message: "Missing version number. Add 'Version: 1.0' to the Product Overview.",
        auto_fixable: false,
      });
    }

    // 5.4: Has success metrics
    const hasMetrics = /success\s+metric|kpi|measur/i.test(spec_content);
    t5Checks.push({
      id: "has_metrics",
      description: "Success metrics defined",
      passed: hasMetrics,
    });

    // 5.5: Has implementation roadmap
    const hasRoadmap = /roadmap|implementation\s+(plan|roadmap)|phase\s+\d/i.test(spec_content);
    t5Checks.push({
      id: "has_roadmap",
      description: "Implementation roadmap present",
      passed: hasRoadmap,
    });

    // 5.6: Has tech stack with versions
    const hasTechVersions = /\b(next\.?js|react|node|bun|deno|postgres|supabase|prisma|drizzle|tailwind|vite)\s+\d/i.test(spec_content) ||
      /v\d+(\.\d+)?/.test(spec_content);
    t5Checks.push({
      id: "has_tech_versions",
      description: "Technology choices include version numbers",
      passed: hasTechVersions,
    });

    // 5.7: Has consistent naming (check for H2 section numbering consistency)
    const sectionNumbers = spec_content.match(/^## \d+\./gm) || [];
    const numbersUsed = sectionNumbers.map((s: string) => parseInt(s.replace(/^## (\d+)\./, "$1")));
    const isSequential = numbersUsed.length > 0 &&
      numbersUsed.every((n: number, i: number) => i === 0 || n > numbersUsed[i - 1]);
    t5Checks.push({
      id: "section_numbering",
      description: "Sections numbered sequentially",
      passed: isSequential && sectionNumbers.length >= 5,
      details: sectionNumbers.length < 5 ? `Only ${sectionNumbers.length} numbered sections found.` : undefined,
    });

    // 5.8: Has risk assessment
    const hasRisks = /risk\s+(register|assessment|analysis)|probability|impact|mitigation/i.test(spec_content);
    t5Checks.push({
      id: "has_risks",
      description: "Risk assessment included",
      passed: hasRisks,
    });

    // 5.9: Has security considerations
    const hasSecurity = /\b(authentication|authorization|encrypt|RBAC|OAuth|JWT|CORS|XSS|CSRF|sanitiz)\b/i.test(spec_content);
    t5Checks.push({
      id: "has_security",
      description: "Security architecture addressed",
      passed: hasSecurity,
    });

    // 5.10: Has performance targets
    const hasPerformance = /\b(latency|response\s+time|load\s+time|\d+ms|\d+\s*sec|concurrent|throughput|p95|p99)\b/i.test(spec_content);
    t5Checks.push({
      id: "has_performance",
      description: "Performance targets specified",
      passed: hasPerformance,
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
    let llmClarity = null;
    let llmUsage = null;
    if (wordCount > 300) {
      try {
        // Score a sample section — try to find the data model or features section
        const dataModelMatch = spec_content.match(/## 5\.[\s\S]*?(?=## \d+\.|$)/);
        const sampleSection = dataModelMatch
          ? dataModelMatch[0].slice(0, 2000)
          : spec_content.slice(0, 2000);

        const { data, usage } = await llmParse({
          task: "validate",
          system: SYSTEM_VALIDATOR,
          prompt: promptValidateClarity(sampleSection, dataModelMatch ? "Data Model" : "Opening"),
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
              severity: "info",
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
