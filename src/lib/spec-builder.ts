/**
 * Smart SkillSpec builder — generates a full spec from a plain English description.
 * No AI API needed. Uses pattern matching, keyword extraction, and templates.
 */

import type { SkillSpec, Capability, InputSpec, OutputSpec, ErrorSpec, Example } from "./types";

/** Turn a phrase into a kebab-case slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Capitalize first letter of each word */
function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

/** Extract the core action verb from a description */
function extractCoreAction(desc: string): string {
  const lower = desc.toLowerCase();
  const actionMap: [string[], string][] = [
    [["summarize", "summary", "condense", "shorten", "brief"], "summarize"],
    [["review", "check", "audit", "inspect", "lint", "analyze code"], "review"],
    [["generate", "create", "produce", "make", "build", "write"], "generate"],
    [["convert", "transform", "translate", "parse", "format"], "convert"],
    [["search", "find", "look up", "query", "fetch", "retrieve"], "search"],
    [["organize", "sort", "categorize", "classify", "group"], "organize"],
    [["extract", "scrape", "pull", "harvest", "mine"], "extract"],
    [["validate", "verify", "test", "check", "confirm"], "validate"],
    [["schedule", "plan", "timeline", "calendar", "roadmap"], "plan"],
    [["email", "message", "notify", "alert", "send"], "notify"],
    [["compare", "diff", "contrast", "match"], "compare"],
    [["monitor", "watch", "track", "observe"], "monitor"],
    [["clean", "filter", "deduplicate", "sanitize"], "clean"],
    [["recommend", "suggest", "advise"], "recommend"],
    [["calculate", "compute", "count", "measure"], "calculate"],
    [["automate", "workflow", "pipeline", "process"], "automate"],
    [["respond", "answer", "reply", "chat"], "respond"],
  ];

  for (const [keywords, action] of actionMap) {
    if (keywords.some(k => lower.includes(k))) return action;
  }
  return "process";
}

/** Detect domain/category from description */
function detectDomain(desc: string): { domain: string; tags: string[] } {
  const lower = desc.toLowerCase();
  const domains: [string[], string, string[]][] = [
    [["code", "programming", "developer", "function", "api", "bug", "git", "repository", "pull request"], "development", ["code", "developer-tools"]],
    [["text", "document", "article", "writing", "content", "paragraph", "language", "nlp", "word"], "text-processing", ["nlp", "text"]],
    [["file", "folder", "directory", "filesystem", "organize", "rename", "move", "backup"], "file-management", ["filesystem", "organization"]],
    [["data", "database", "sql", "csv", "json", "excel", "spreadsheet", "analytics"], "data", ["data", "analytics"]],
    [["web", "url", "website", "scrape", "browser", "html", "page", "http", "api"], "web", ["web", "api"]],
    [["email", "inbox", "message", "notification", "slack", "communication"], "communication", ["communication", "automation"]],
    [["image", "photo", "video", "media", "visual", "design", "graphic"], "media", ["media", "visual"]],
    [["research", "study", "paper", "academic", "information", "knowledge"], "research", ["research", "knowledge"]],
    [["money", "finance", "price", "cost", "budget", "invoice", "payment"], "finance", ["finance", "business"]],
    [["project", "task", "plan", "milestone", "deadline", "team", "manage"], "project-management", ["planning", "productivity"]],
    [["security", "password", "auth", "encrypt", "vulnerability", "scan"], "security", ["security", "compliance"]],
    [["customer", "support", "ticket", "feedback", "user", "help"], "support", ["support", "customer-service"]],
  ];

  for (const [keywords, domain, tags] of domains) {
    if (keywords.some(k => lower.includes(k))) return { domain, tags };
  }
  return { domain: "general", tags: ["utility", "automation"] };
}

/** Detect complexity from description */
function detectComplexity(desc: string): "simple" | "moderate" | "complex" {
  const lower = desc.toLowerCase();
  const complexSignals = ["multiple", "complex", "advanced", "enterprise", "workflow", "pipeline", "multi-step", "dependencies", "integration", "orchestrate", "coordinate"];
  const simpleSignals = ["simple", "basic", "single", "one", "quick", "just", "only"];

  const complexScore = complexSignals.filter(s => lower.includes(s)).length;
  const simpleScore = simpleSignals.filter(s => lower.includes(s)).length;

  if (complexScore >= 2) return "complex";
  if (simpleScore >= 2 || desc.length < 50) return "simple";
  return "moderate";
}

/** Suggest the best framework based on description */
function suggestFramework(desc: string, action: string): string[] {
  const lower = desc.toLowerCase();

  if (lower.includes("mcp") || lower.includes("server") || lower.includes("tool server")) return ["mcp"];
  if (lower.includes("crewai") || lower.includes("crew") || lower.includes("multi-agent") || lower.includes("agents work together")) return ["crewai"];
  if (lower.includes("langchain") || lower.includes("chain") || lower.includes("pipeline")) return ["langchain"];

  // Default smart picks
  if (["extract", "convert", "calculate", "validate", "clean"].includes(action)) return ["mcp"];
  if (["plan", "research", "recommend"].includes(action)) return ["claude"];

  return ["claude"];
}

/** Generate capabilities from description */
function generateCapabilities(desc: string, action: string, domain: string): Capability[] {
  const capabilities: Capability[] = [];

  // Primary capability — always the core action
  const primaryName = `${action}-content`;
  capabilities.push({
    name: primaryName,
    description: `Performs the core ${action} operation on the provided input.`,
    required: true,
    parameters: [
      { name: "input", type: "string", description: "The primary content to process.", required: true },
    ],
  });

  // Smart secondary capabilities based on patterns
  const lower = desc.toLowerCase();

  if (lower.includes("format") || lower.includes("output") || lower.includes("style")) {
    capabilities.push({
      name: "configure-output",
      description: "Adjusts the output format, style, or detail level.",
      parameters: [
        { name: "format", type: "string", description: "Desired output format.", required: false },
      ],
    });
  }

  if (lower.includes("filter") || lower.includes("select") || lower.includes("criteria") || lower.includes("rule")) {
    capabilities.push({
      name: "apply-filters",
      description: "Applies filtering criteria to narrow or refine the results.",
      parameters: [
        { name: "criteria", type: "string", description: "Filtering rules or criteria.", required: false },
      ],
    });
  }

  if (lower.includes("save") || lower.includes("store") || lower.includes("export") || lower.includes("download")) {
    capabilities.push({
      name: "export-results",
      description: "Exports or saves the processed results in the specified format.",
      parameters: [
        { name: "destination", type: "string", description: "Where to save or export results.", required: false },
      ],
    });
  }

  if (lower.includes("batch") || lower.includes("multiple") || lower.includes("list") || lower.includes("bulk")) {
    capabilities.push({
      name: "batch-process",
      description: "Processes multiple items in a single operation.",
      parameters: [
        { name: "items", type: "array", description: "List of items to process.", required: true },
      ],
    });
  }

  // If only 1 cap, add a validation/reporting one
  if (capabilities.length === 1) {
    capabilities.push({
      name: "validate-input",
      description: "Checks that the input meets requirements before processing.",
      parameters: [
        { name: "input", type: "string", description: "Content to validate.", required: true },
      ],
    });
  }

  return capabilities;
}

/** Generate examples from the description */
function generateExamples(desc: string, action: string): Example[] {
  const examples: Example[] = [
    {
      input: `A typical ${action} request based on: ${desc.slice(0, 80)}`,
      expected_output: `Successfully processed result with relevant output for the ${action} operation.`,
    },
    {
      input: `A minimal input with only required fields for ${action}.`,
      expected_output: `Basic output covering the core functionality.`,
    },
  ];
  return examples;
}

/** Generate edge cases */
function generateEdgeCases(action: string, domain: string): string[] {
  const universal = [
    "Empty or blank input provided",
    "Extremely large input that exceeds expected limits",
    "Input contains special characters or unicode",
  ];

  const domainSpecific: Record<string, string[]> = {
    "text-processing": ["Input in a non-English language", "Input with mixed formatting (HTML, Markdown)"],
    "development": ["Code with syntax errors", "Minified or obfuscated code", "Mixed programming languages"],
    "file-management": ["Files with special characters in names", "Deeply nested directory structure", "Read-only or locked files"],
    "web": ["URL returns 404 or timeout", "Page requires authentication", "JavaScript-rendered content"],
    "data": ["Missing or null values in dataset", "Inconsistent data types across rows", "Extremely large dataset"],
    "communication": ["Message contains attachments", "Recipient list is empty", "Rate limit exceeded"],
    "finance": ["Currency conversion required", "Negative or zero amounts", "Invalid date formats"],
  };

  return [...universal, ...(domainSpecific[domain] || ["Input in an unexpected format", "Concurrent requests"])];
}

/** Generate error handlers */
function generateErrorHandlers(action: string): ErrorSpec[] {
  return [
    { condition: "Empty or missing input", handling: "Return clear error message indicating required fields.", user_message: "Please provide input to proceed." },
    { condition: "Input exceeds size limits", handling: "Reject with size limit details and suggest splitting input.", user_message: "Input is too large. Please reduce the size or split into smaller parts." },
    { condition: "Invalid input format", handling: "Validate format before processing and return specific format requirements.", user_message: "The input format is not recognized. Please check and try again." },
    { condition: "Processing timeout", handling: "Cancel operation after timeout threshold and return partial results if available.", user_message: "Processing took too long. Please try with a smaller input." },
  ];
}

/** Generate safety boundaries */
function generateSafetyBoundaries(domain: string): string[] {
  const universal = [
    "Never fabricate or hallucinate information not present in the input.",
    "Validate all inputs before processing.",
    "Do not persist or share user data beyond the current session.",
  ];

  const domainSpecific: Record<string, string[]> = {
    "development": ["Never execute or run submitted code.", "Flag potential credentials or secrets found in input."],
    "web": ["Respect robots.txt and rate limits.", "Do not bypass authentication or access controls."],
    "file-management": ["Never delete files without explicit confirmation.", "Create backups before modifying existing files."],
    "communication": ["Do not send messages without user confirmation.", "Do not access contacts or messages beyond the specified scope."],
    "finance": ["Do not provide financial advice.", "Flag potentially fraudulent transactions."],
    "security": ["Never store or log passwords or secrets.", "Report vulnerabilities responsibly."],
  };

  return [...universal, ...(domainSpecific[domain] || ["Do not perform destructive operations without confirmation."])];
}

/** Generate inputs/outputs */
function generateIO(action: string, capabilities: Capability[]): { inputs: InputSpec[]; outputs: OutputSpec[] } {
  const inputs: InputSpec[] = [
    { name: "input", type: "string", description: "The primary content to process.", required: true },
  ];

  // Add any unique params from capabilities
  const seen = new Set(["input"]);
  for (const cap of capabilities) {
    for (const p of cap.parameters || []) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        inputs.push({ name: p.name, type: p.type, description: p.description, required: p.required });
      }
    }
  }

  const outputs: OutputSpec[] = [
    { name: "result", type: "string", description: "The primary output of the processing operation." },
    { name: "metadata", type: "object", description: "Additional information about the processing (timing, counts, etc.)." },
  ];

  return { inputs, outputs };
}

/**
 * Main entry point: generate a full SkillSpec from a plain English description.
 */
export function buildSpecFromDescription(description: string): SkillSpec {
  const action = extractCoreAction(description);
  const { domain, tags } = detectDomain(description);
  const complexity = detectComplexity(description);
  const frameworks = suggestFramework(description, action);
  const capabilities = generateCapabilities(description, action, domain);
  const examples = generateExamples(description, action);
  const edgeCases = generateEdgeCases(action, domain);
  const errorHandling = generateErrorHandlers(action);
  const safetyBoundaries = generateSafetyBoundaries(domain);
  const { inputs, outputs } = generateIO(action, capabilities);

  // Build the name from the description
  const words = description.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).slice(0, 4);
  const name = slugify(words.join(" ")) || "my-skill";
  const displayName = titleCase(words.join(" ")) || "My Skill";

  return {
    name,
    display_name: displayName,
    version: "1.0.0",
    description,
    complexity,
    author: "",
    problem_statement: `Users need a tool that can ${action} efficiently, reducing manual effort and improving consistency.`,
    target_user: `Anyone who needs to ${action} content in the ${domain} domain.`,
    trigger_patterns: [
      `${action} this`,
      `can you ${action}`,
      `I need to ${action}`,
      `help me ${action}`,
    ],
    capabilities,
    inputs,
    outputs,
    examples,
    edge_cases: edgeCases,
    error_handling: errorHandling,
    safety_boundaries: safetyBoundaries,
    target_frameworks: frameworks,
    tags: [...tags, action],
    dependencies: [],
  };
}

/**
 * Enhance an existing spec — fill in gaps with smart defaults.
 */
export function enhanceSpec(spec: SkillSpec): SkillSpec {
  const action = extractCoreAction(spec.description || spec.name);
  const { domain, tags } = detectDomain(spec.description || spec.name);

  const enhanced = { ...spec };

  if (!enhanced.complexity) enhanced.complexity = detectComplexity(enhanced.description);
  if (!enhanced.problem_statement) {
    enhanced.problem_statement = `Users need a tool that can ${action} efficiently, reducing manual effort and improving consistency.`;
  }
  if (!enhanced.target_user) {
    enhanced.target_user = `Anyone who needs to ${action} content in the ${domain} domain.`;
  }
  if (!enhanced.trigger_patterns || enhanced.trigger_patterns.length === 0) {
    enhanced.trigger_patterns = [`${action} this`, `can you ${action}`, `I need to ${action}`];
  }
  if (enhanced.capabilities.length === 0) {
    enhanced.capabilities = generateCapabilities(enhanced.description, action, domain);
  }
  if (!enhanced.examples || enhanced.examples.length === 0) {
    enhanced.examples = generateExamples(enhanced.description, action);
  }
  if (!enhanced.edge_cases || enhanced.edge_cases.length === 0) {
    enhanced.edge_cases = generateEdgeCases(action, domain);
  }
  if (!enhanced.error_handling || enhanced.error_handling.length === 0) {
    enhanced.error_handling = generateErrorHandlers(action);
  }
  if (!enhanced.safety_boundaries || enhanced.safety_boundaries.length === 0) {
    enhanced.safety_boundaries = generateSafetyBoundaries(domain);
  }
  if (!enhanced.tags || enhanced.tags.length === 0) {
    enhanced.tags = [...tags, action];
  }
  if (!enhanced.target_frameworks || enhanced.target_frameworks.length === 0) {
    enhanced.target_frameworks = suggestFramework(enhanced.description, action);
  }

  return enhanced;
}
