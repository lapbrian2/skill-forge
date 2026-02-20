// 5-Tollgate Validation Pipeline — ported from Python validator.py
// Applies LSSBB methodology to skill specification validation

import type { SkillSpec, ValidationReport, TollgateResult, Remediation, Check } from "./types";

export const TOLLGATE_WEIGHTS: Record<number, number> = {
  1: 0.20, 2: 0.25, 3: 0.25, 4: 0.15, 5: 0.15,
};

export const TOLLGATE_NAMES: Record<number, string> = {
  1: "Structure", 2: "Clarity", 3: "Completeness", 4: "Testability", 5: "Production Readiness",
};

const WEASEL_WORDS = [
  "various", "several", "many", "some", "few", "appropriate", "relevant",
  "suitable", "proper", "necessary", "efficiently", "effectively", "properly",
  "correctly", "accordingly", "general", "generic", "basic", "simple",
  "standard", "typical", "normal", "usual", "common", "etc", "miscellaneous",
  "stuff", "things", "whatever", "somehow", "somewhere", "something",
  "anything", "everything", "handle", "manage", "process", "deal with",
  "take care of", "perform", "do", "make", "get", "put", "set",
  "various tasks", "as needed", "when necessary", "if applicable",
  "in general", "for the most part", "more or less", "kind of",
  "sort of", "basically", "essentially", "approximately", "roughly",
];

function check(name: string, passed: boolean, detail: string = ""): Check {
  return { name, passed, detail };
}

function remediation(
  severity: "error" | "warning" | "info",
  message: string,
  tollgate: number,
  location?: string,
  fix?: string,
  auto_fixable: boolean = false,
): Remediation {
  return { severity, message, tollgate, location, suggested_fix: fix, auto_fixable };
}

// Tollgate 1: Structure (20%)
function tollgateStructure(spec: Record<string, unknown>): TollgateResult {
  const checks: Check[] = [];
  const remediations: Remediation[] = [];

  const required = ["name", "description", "version", "capabilities"];
  for (const field of required) {
    let present = field in spec && spec[field] != null;
    if (field === "capabilities") {
      present = present && Array.isArray(spec.capabilities);
    }
    checks.push(check(`required_field_${field}`, present, `Field '${field}' present`));
    if (!present) {
      remediations.push(remediation("error", `Required field '${field}' is missing`, 1, field, `Add '${field}' to your skill specification`));
    }
  }

  const name = (spec.name as string) || "";
  const nameOk = !!name && /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);
  checks.push(check("name_format", nameOk, "Name is kebab-case"));
  if (!nameOk && name) {
    remediations.push(remediation("error", `Name '${name}' must be kebab-case (lowercase, hyphens only)`, 1, "name", `Rename to '${name.toLowerCase().replace(/ /g, "-").replace(/_/g, "-")}'`, true));
  }

  const version = (spec.version as string) || "";
  const verOk = !!version && /^\d+\.\d+\.\d+$/.test(version);
  checks.push(check("version_format", verOk, "Version is semver"));
  if (!verOk) {
    remediations.push(remediation("error", `Version '${version}' must be semver (e.g. 1.0.0)`, 1, "version", "Set version to '0.1.0' or appropriate semver", true));
  }

  const desc = (spec.description as string) || "";
  const descOk = desc.length >= 10 && desc.length <= 500;
  checks.push(check("description_length", descOk, `Description length: ${desc.length}`));
  if (!descOk) {
    remediations.push(remediation("warning", `Description should be 10-500 chars (currently ${desc.length})`, 1, "description"));
  }

  const caps = spec.capabilities;
  const capsOk = Array.isArray(caps);
  checks.push(check("capabilities_type", capsOk, "Capabilities is a list"));

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;
  const score = checks.length > 0 ? Math.floor(100 * passedCount / checks.length) : 0;

  return {
    tollgate_number: 1, name: "Structure", passed: score >= 70, score,
    checks, passed_count: passedCount, failed_count: failedCount, remediations,
  };
}

// Tollgate 2: Clarity (25%)
function tollgateClarity(spec: Record<string, unknown>): TollgateResult {
  const checks: Check[] = [];
  const remediations: Remediation[] = [];

  const desc = ((spec.description as string) || "").toLowerCase();
  const foundWeasels = WEASEL_WORDS.filter(w => ` ${desc} `.includes(` ${w} `) || desc.startsWith(w));
  checks.push(check("no_weasel_words_desc", foundWeasels.length === 0, foundWeasels.length > 0 ? `Found weasel words: ${foundWeasels.slice(0, 5).join(", ")}` : "No weasel words"));
  if (foundWeasels.length > 0) {
    remediations.push(remediation("warning", `Description contains vague language: ${foundWeasels.slice(0, 5).join(", ")}. Use specific terms.`, 2, "description"));
  }

  const descText = (spec.description as string) || "";
  const actionVerbs = ["creates", "generates", "analyzes", "converts", "validates", "parses", "transforms", "extracts", "builds", "checks", "monitors", "detects", "formats", "calculates", "compiles"];
  const hasVerb = actionVerbs.some(v => descText.toLowerCase().includes(v));
  checks.push(check("description_has_action_verb", hasVerb, "Description contains action verb"));
  if (!hasVerb) {
    remediations.push(remediation("info", "Description should include specific action verbs (creates, generates, analyzes, etc.)", 2, "description"));
  }

  const caps = (spec.capabilities as Array<Record<string, unknown>>) || [];
  let capsClear = true;
  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i];
    if (typeof cap === "object" && cap) {
      const capDesc = ((cap.description as string) || "").toLowerCase();
      const capWeasels = WEASEL_WORDS.filter(w => ` ${capDesc} `.includes(` ${w} `));
      if (capWeasels.length > 0) {
        capsClear = false;
        remediations.push(remediation("warning", `Capability '${cap.name || i}' description uses vague language: ${capWeasels.slice(0, 3).join(", ")}`, 2, `capabilities[${i}].description`));
      }
    }
  }
  checks.push(check("capabilities_clear", capsClear, "Capability descriptions are specific"));

  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i];
    if (typeof cap === "object" && cap) {
      const cdesc = (cap.description as string) || "";
      if (cdesc.length < 5) {
        checks.push(check(`cap_${i}_desc_length`, false, `Capability '${cap.name || i}' description too short`));
        remediations.push(remediation("warning", `Capability '${cap.name || i}' needs a longer description (min 5 chars)`, 2, `capabilities[${i}].description`));
      } else {
        checks.push(check(`cap_${i}_desc_length`, true, `Capability '${cap.name || i}' description OK`));
      }
    }
  }

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;
  const score = checks.length > 0 ? Math.floor(100 * passedCount / Math.max(checks.length, 1)) : 50;

  return {
    tollgate_number: 2, name: "Clarity", passed: score >= 70, score,
    checks, passed_count: passedCount, failed_count: failedCount, remediations,
  };
}

// Tollgate 3: Completeness (25%)
function tollgateCompleteness(spec: Record<string, unknown>): TollgateResult {
  const checks: Check[] = [];
  const remediations: Remediation[] = [];

  const caps = (spec.capabilities as Array<Record<string, unknown>>) || [];
  const hasCaps = caps.length > 0;
  checks.push(check("has_capabilities", hasCaps, `${caps.length} capabilities defined`));
  if (!hasCaps) {
    remediations.push(remediation("error", "No capabilities defined. Add at least one capability.", 3, "capabilities"));
  }

  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i];
    if (typeof cap === "object" && cap) {
      const hasName = !!cap.name;
      const hasDesc = !!cap.description;
      checks.push(check(`cap_${i}_name`, hasName, `Cap ${i} has name`));
      checks.push(check(`cap_${i}_desc`, hasDesc, `Cap ${i} has description`));
      if (!hasName) {
        remediations.push(remediation("error", `Capability ${i} is missing a name`, 3, `capabilities[${i}].name`));
      }
    }
  }

  const complexity = (spec.complexity as string) || "simple";
  if (complexity === "moderate" || complexity === "complex") {
    const errors = (spec.error_handling as unknown[]) || [];
    const hasErrors = errors.length > 0;
    checks.push(check("error_handling_defined", hasErrors, `${errors.length} error handlers`));
    if (!hasErrors) {
      remediations.push(remediation("warning", "No error handling defined. Consider adding error conditions.", 3, "error_handling"));
    }

    const edges = (spec.edge_cases as unknown[]) || [];
    const hasEdges = edges.length > 0;
    checks.push(check("edge_cases_defined", hasEdges, `${edges.length} edge cases`));
    if (!hasEdges) {
      remediations.push(remediation("info", "No edge cases documented. Consider common edge cases.", 3, "edge_cases"));
    }
  }

  const hasIo = !!(spec.inputs as unknown[])?.length || !!(spec.outputs as unknown[])?.length;
  checks.push(check("io_contracts", hasIo, "Input/output contracts defined"));
  if (!hasIo) {
    remediations.push(remediation("info", "No explicit inputs/outputs defined. Consider adding I/O contracts.", 3));
  }

  const frameworks = (spec.target_frameworks as string[]) || [];
  checks.push(check("target_frameworks", frameworks.length > 0, `Targets: ${frameworks.join(", ")}`));

  if (complexity === "complex") {
    const deps = (spec.dependencies as unknown[]) || [];
    checks.push(check("dependencies_listed", deps.length > 0, `${deps.length} dependencies`));
    if (deps.length === 0) {
      remediations.push(remediation("info", "Complex skill should list dependencies.", 3, "dependencies"));
    }
  }

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;
  const score = Math.floor(100 * passedCount / Math.max(checks.length, 1));

  return {
    tollgate_number: 3, name: "Completeness", passed: score >= 70, score,
    checks, passed_count: passedCount, failed_count: failedCount, remediations,
  };
}

// Tollgate 4: Testability (15%)
function tollgateTestability(spec: Record<string, unknown>): TollgateResult {
  const checks: Check[] = [];
  const remediations: Remediation[] = [];

  const examples = (spec.examples as Array<Record<string, unknown>>) || [];
  checks.push(check("has_examples", examples.length > 0, `${examples.length} examples`));
  if (examples.length === 0) {
    remediations.push(remediation("warning", "No examples defined. Add at least 2 examples (happy path + edge case).", 4, "examples"));
  }

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    if (typeof ex === "object" && ex) {
      const hasInput = !!ex.input;
      const hasOutput = !!ex.expected_output;
      checks.push(check(`example_${i}_input`, hasInput, `Example ${i} has input`));
      checks.push(check(`example_${i}_output`, hasOutput, `Example ${i} has expected output`));
      if (!hasOutput) {
        remediations.push(remediation("warning", `Example ${i} missing expected_output. Add expected behavior.`, 4, `examples[${i}].expected_output`));
      }
    }
  }

  const complexity = (spec.complexity as string) || "simple";
  const minExamples: Record<string, number> = { simple: 1, moderate: 2, complex: 3 };
  const needed = minExamples[complexity] || 1;
  checks.push(check("enough_examples", examples.length >= needed, `Need ${needed}+ examples for ${complexity} skill`));
  if (examples.length < needed) {
    remediations.push(remediation("warning", `${complexity.charAt(0).toUpperCase() + complexity.slice(1)} skill should have at least ${needed} examples.`, 4, "examples"));
  }

  const caps = (spec.capabilities as Array<Record<string, unknown>>) || [];
  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i];
    if (typeof cap === "object" && cap) {
      const testable = !!cap.description && (cap.description as string).length > 10;
      checks.push(check(`cap_${i}_testable`, testable, `Capability '${cap.name || i}' is testable`));
    }
  }

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;
  const score = Math.floor(100 * passedCount / Math.max(checks.length, 1));

  return {
    tollgate_number: 4, name: "Testability", passed: score >= 70, score,
    checks, passed_count: passedCount, failed_count: failedCount, remediations,
  };
}

// Tollgate 5: Production Readiness (15%)
function tollgateProduction(spec: Record<string, unknown>): TollgateResult {
  const checks: Check[] = [];
  const remediations: Remediation[] = [];

  const placeholders = ["TODO", "FIXME", "TBD", "PLACEHOLDER", "XXX", "HACK"];
  const specStr = JSON.stringify(spec).toUpperCase();
  const foundPlaceholders = placeholders.filter(p => specStr.includes(p));
  checks.push(check("no_placeholders", foundPlaceholders.length === 0, foundPlaceholders.length > 0 ? `Placeholders found: ${foundPlaceholders.join(", ")}` : "No placeholders"));
  if (foundPlaceholders.length > 0) {
    remediations.push(remediation("error", `Contains placeholder text: ${foundPlaceholders.join(", ")}. Replace with real content.`, 5));
  }

  const version = (spec.version as string) || "0.0.0";
  checks.push(check("version_assigned", version !== "0.0.0" && !!version, `Version: ${version}`));

  const complexity = (spec.complexity as string) || "simple";
  if (complexity === "moderate" || complexity === "complex") {
    const safety = (spec.safety_boundaries as unknown[]) || [];
    checks.push(check("safety_boundaries", safety.length > 0, `${safety.length} safety boundaries`));
    if (safety.length === 0) {
      remediations.push(remediation("warning", "No safety boundaries defined. Add rules for what the skill must NEVER do.", 5, "safety_boundaries"));
    }
  }

  checks.push(check("author_specified", !!spec.author, "Author specified"));
  if (!spec.author) {
    remediations.push(remediation("info", "No author specified. Set author in config or skill spec.", 5, "author"));
  }

  const desc = (spec.description as string) || "";
  const descReal = !["lorem ipsum", "test skill", "placeholder"].some(p => desc.toLowerCase().includes(p));
  checks.push(check("description_real", descReal, "Description is real content"));

  const frameworks = (spec.target_frameworks as string[]) || ["claude"];
  if (frameworks.includes("mcp")) {
    const hasIo = !!(spec.inputs as unknown[])?.length || !!(spec.outputs as unknown[])?.length;
    checks.push(check("mcp_io_defined", hasIo, "MCP target has I/O definitions"));
    if (!hasIo) {
      remediations.push(remediation("warning", "MCP target needs explicit input/output definitions for tool parameters.", 5, "inputs/outputs"));
    }
  }

  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = checks.length - passedCount;
  const score = Math.floor(100 * passedCount / Math.max(checks.length, 1));

  return {
    tollgate_number: 5, name: "Production Readiness", passed: score >= 70, score,
    checks, passed_count: passedCount, failed_count: failedCount, remediations,
  };
}

const TOLLGATE_FUNCTIONS: Record<number, (spec: Record<string, unknown>) => TollgateResult> = {
  1: tollgateStructure,
  2: tollgateClarity,
  3: tollgateCompleteness,
  4: tollgateTestability,
  5: tollgateProduction,
};

export function validateSpec(spec: SkillSpec | Record<string, unknown>, tollgates?: number[]): ValidationReport {
  const gates = tollgates || [1, 2, 3, 4, 5];
  const results: TollgateResult[] = [];
  const allRemediations: Remediation[] = [];
  let totalChecks = 0, totalPassed = 0, totalFailed = 0;

  const raw = spec as Record<string, unknown>;

  for (const gateNum of gates) {
    const fn = TOLLGATE_FUNCTIONS[gateNum];
    if (!fn) continue;
    const result = fn(raw);
    results.push(result);
    allRemediations.push(...result.remediations);
    totalChecks += result.passed_count + result.failed_count;
    totalPassed += result.passed_count;
    totalFailed += result.failed_count;
  }

  let weightedScore = 0;
  let totalWeight = 0;
  for (const result of results) {
    const weight = TOLLGATE_WEIGHTS[result.tollgate_number] || 0.2;
    weightedScore += result.score * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? Math.floor(weightedScore / totalWeight) : 0;

  let grade: string;
  if (overallScore >= 90) grade = "A";
  else if (overallScore >= 80) grade = "B";
  else if (overallScore >= 70) grade = "C";
  else if (overallScore >= 60) grade = "D";
  else grade = "F";

  return {
    skill_name: (raw.name as string) || "unknown",
    skill_version: raw.version as string,
    overall_score: overallScore,
    grade,
    passed: overallScore >= 70,
    tollgate_results: results,
    total_checks: totalChecks,
    passed_checks: totalPassed,
    failed_checks: totalFailed,
    remediations: allRemediations,
  };
}

export function autoFix(spec: SkillSpec): SkillSpec {
  const fixed = { ...spec };

  // Fix name to kebab-case
  if (fixed.name) {
    let name = fixed.name.toLowerCase().replace(/ /g, "-").replace(/_/g, "-");
    name = name.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    fixed.name = name;
  }

  // Fix version to semver
  if (fixed.version && !/^\d+\.\d+\.\d+$/.test(fixed.version)) {
    fixed.version = "0.1.0";
  }

  return fixed;
}
