import type { SkillSpec } from "./types";

export interface ExampleMeta {
  name: string;
  display_name: string;
  framework: string;
  complexity: string;
  description: string;
  tags: string[];
}

export const EXAMPLES_INDEX: ExampleMeta[] = [
  { name: "text-summarizer", display_name: "Text Summarizer", framework: "claude", complexity: "simple", description: "Summarizes text passages into concise bullet points.", tags: ["nlp", "text", "summarization"] },
  { name: "code-reviewer", display_name: "Code Reviewer", framework: "claude", complexity: "moderate", description: "Reviews code for bugs, security issues, and style violations.", tags: ["code", "review", "security"] },
  { name: "project-planner", display_name: "Project Planner", framework: "claude", complexity: "complex", description: "Decomposes project goals into milestones, tasks, and dependencies.", tags: ["planning", "project-management"] },
  { name: "unit-converter", display_name: "Unit Converter", framework: "mcp", complexity: "simple", description: "Converts values between measurement units.", tags: ["utility", "conversion", "math"] },
  { name: "file-organizer", display_name: "File Organizer", framework: "mcp", complexity: "moderate", description: "Organizes files into directories by type, date, or custom rules.", tags: ["filesystem", "organization"] },
  { name: "research-assistant", display_name: "Research Assistant", framework: "crewai", complexity: "moderate", description: "Multi-agent research crew that gathers, validates, and synthesizes information.", tags: ["research", "multi-agent"] },
  { name: "web-scraper", display_name: "Web Scraper", framework: "langchain", complexity: "moderate", description: "Extracts structured data from web pages with configurable selectors.", tags: ["web", "scraping", "extraction"] },
];

const EXAMPLE_SPECS: Record<string, SkillSpec> = {
  "text-summarizer": {
    name: "text-summarizer", display_name: "Text Summarizer",
    description: "Condenses text passages into concise bullet-point summaries preserving key facts, figures, and conclusions while reducing content length by 70-80 percent.",
    version: "1.0.0", complexity: "simple", author: "Skill Forge Team",
    problem_statement: "Users need to quickly extract essential information from lengthy documents without reading the entire text.",
    target_user: "Knowledge workers, researchers, and students processing large volumes of text content.",
    target_frameworks: ["claude"],
    trigger_patterns: ["summarize this text", "give me bullet points", "what are the key takeaways", "condense this passage"],
    capabilities: [
      { name: "extract-key-points", description: "Identifies and extracts the most important facts, figures, and conclusions from input text.", parameters: [{ name: "text", type: "string", description: "The text passage to summarize.", required: true }, { name: "max_points", type: "number", description: "Maximum number of bullet points to return.", required: false }] },
      { name: "adjust-detail-level", description: "Controls summary granularity between brief (3-5 points) and detailed (8-12 points) output.", parameters: [{ name: "level", type: "string", description: "Detail level: 'brief', 'standard', or 'detailed'.", required: false }] },
    ],
    inputs: [{ name: "text", type: "string", description: "The text passage to summarize (50-10000 words).", required: true }, { name: "max_points", type: "number", description: "Maximum bullet points in output (default: 5).", required: false }, { name: "detail_level", type: "string", description: "One of: brief, standard, detailed.", required: false }],
    outputs: [{ name: "summary", type: "array", description: "List of bullet-point strings summarizing the input." }, { name: "word_count_original", type: "number", description: "Word count of the original text." }, { name: "word_count_summary", type: "number", description: "Word count of the generated summary." }],
    examples: [{ input: "A 500-word article about climate change impacts on coastal cities.", expected_output: "5 bullet points covering sea level rise, economic impact, population displacement, infrastructure damage, and adaptation strategies." }, { input: "A 2000-word research paper abstract on machine learning in healthcare.", expected_output: "7 bullet points covering methodology, dataset, key findings, accuracy metrics, limitations, and future work." }],
    edge_cases: ["Input text shorter than 50 words", "Input text exceeding 10000 words", "Text in a non-English language", "Text containing only numerical data or tables", "Input with mixed formatting (HTML, Markdown, plain text)"],
    error_handling: [{ condition: "Empty input text", handling: "Return error message: 'Input text is required and must be non-empty.'" }, { condition: "Text below minimum length", handling: "Return the input as-is with a note that it is already concise." }, { condition: "Unsupported language detected", handling: "Return error message specifying supported languages." }],
    safety_boundaries: ["Never fabricate information not present in the source text.", "Preserve factual accuracy of numbers, dates, and proper nouns.", "Flag when input may contain sensitive or confidential content."],
    tags: ["nlp", "text", "summarization", "productivity"],
  },
  "code-reviewer": {
    name: "code-reviewer", display_name: "Code Reviewer",
    description: "Analyzes source code for bugs, security vulnerabilities, style violations, and performance issues, returning line-specific findings with severity ratings and fix suggestions.",
    version: "1.0.0", complexity: "moderate", author: "Skill Forge Team",
    problem_statement: "Developers need automated code review to catch bugs and security issues before merging, reducing manual review burden by 60 percent.",
    target_user: "Software developers and team leads performing code reviews on pull requests.",
    target_frameworks: ["claude"],
    trigger_patterns: ["review this code", "find bugs in this function", "check for security issues", "what's wrong with this code"],
    capabilities: [
      { name: "detect-bugs", description: "Identifies logical errors, off-by-one mistakes, null reference risks, and unhandled exceptions in the code.", parameters: [{ name: "code", type: "string", description: "Source code to analyze.", required: true }, { name: "language", type: "string", description: "Programming language.", required: true }] },
      { name: "check-security", description: "Scans for common security vulnerabilities including SQL injection, XSS, hardcoded secrets, and insecure dependencies.", parameters: [{ name: "code", type: "string", description: "Source code to scan.", required: true }] },
      { name: "enforce-style", description: "Validates code against language-specific style conventions (PEP 8, ESLint defaults, Google style).", parameters: [{ name: "code", type: "string", description: "Source code to check.", required: true }, { name: "style_guide", type: "string", description: "Style guide to enforce.", required: false }] },
      { name: "suggest-improvements", description: "Recommends performance optimizations and idiomatic patterns for the detected language.", parameters: [{ name: "code", type: "string", description: "Source code to improve.", required: true }] },
    ],
    inputs: [{ name: "code", type: "string", description: "Source code to review (1-5000 lines).", required: true }, { name: "language", type: "string", description: "Programming language identifier.", required: true }, { name: "severity_threshold", type: "string", description: "Minimum severity to report: low, medium, high, critical.", required: false }],
    outputs: [{ name: "findings", type: "array", description: "List of findings with line number, severity, category, message, and suggested fix." }, { name: "summary", type: "object", description: "Summary with total findings count broken down by severity and category." }, { name: "score", type: "number", description: "Code quality score from 0 to 100." }],
    examples: [{ input: "Python function with SQL string concatenation: query = 'SELECT * FROM users WHERE id=' + user_id", expected_output: "Finding: SQL injection vulnerability at line 1, severity=critical, suggested fix: use parameterized query." }, { input: "JavaScript function with proper error handling and TypeScript types", expected_output: "No critical findings. Score: 92. Minor: consider extracting magic numbers to constants." }],
    edge_cases: ["Empty code input", "Code with syntax errors that prevent parsing", "Mixed-language files", "Minified or obfuscated code", "Code exceeding 5000 lines"],
    error_handling: [{ condition: "Unsupported programming language", handling: "Return error listing supported languages." }, { condition: "Code with syntax errors", handling: "Report syntax errors first, then continue best-effort analysis." }, { condition: "Empty code input", handling: "Return error: 'Code input is required and must be non-empty.'" }],
    safety_boundaries: ["Never execute or run the submitted code.", "Never store submitted code beyond the current session.", "Flag potential credentials or secrets found in code without displaying them."],
    tags: ["code", "review", "security", "quality", "developer-tools"],
  },
  "project-planner": {
    name: "project-planner", display_name: "Project Planner",
    description: "Decomposes project goals into structured milestones, tasks, and dependency chains with effort estimates, critical path identification, and risk assessment for software projects.",
    version: "1.0.0", complexity: "complex", author: "Skill Forge Team",
    problem_statement: "Teams struggle to break down large projects into actionable plans with realistic timelines, often missing dependencies and underestimating effort by 40 percent.",
    target_user: "Engineering managers and tech leads planning software projects with 3-20 team members.",
    target_frameworks: ["claude"],
    trigger_patterns: ["plan this project", "break this down into tasks", "create a project timeline", "identify dependencies"],
    capabilities: [
      { name: "decompose-goals", description: "Breaks a high-level project goal into milestones containing 3-8 tasks each with clear acceptance criteria.", parameters: [{ name: "goal", type: "string", description: "High-level project goal.", required: true }, { name: "team_size", type: "number", description: "Number of team members.", required: true }] },
      { name: "estimate-effort", description: "Assigns story point estimates to each task using three-point estimation (optimistic, likely, pessimistic).", parameters: [{ name: "tasks", type: "array", description: "List of tasks to estimate.", required: true }] },
      { name: "map-dependencies", description: "Identifies blocking and non-blocking dependencies between tasks and flags circular dependency chains.", parameters: [{ name: "tasks", type: "array", description: "List of tasks with descriptions.", required: true }] },
      { name: "identify-critical-path", description: "Calculates the longest dependency chain determining minimum project duration.", parameters: [{ name: "tasks", type: "array", description: "Tasks with dependencies and estimates.", required: true }] },
      { name: "assess-risks", description: "Identifies technical and organizational risks with probability, impact, and mitigation strategies.", parameters: [{ name: "plan", type: "object", description: "Complete project plan.", required: true }] },
      { name: "generate-timeline", description: "Produces a week-by-week timeline with parallel work streams accounting for team capacity.", parameters: [{ name: "plan", type: "object", description: "Plan with tasks, estimates, and dependencies.", required: true }, { name: "start_date", type: "string", description: "Project start date (ISO 8601).", required: true }] },
    ],
    inputs: [{ name: "goal", type: "string", description: "High-level project goal (10-500 words).", required: true }, { name: "team_size", type: "number", description: "Number of available team members (1-50).", required: true }, { name: "start_date", type: "string", description: "Project start date in ISO 8601 format.", required: false }],
    outputs: [{ name: "milestones", type: "array", description: "Ordered list of milestones with tasks, estimates, and acceptance criteria." }, { name: "dependencies", type: "array", description: "Dependency graph as adjacency list." }, { name: "critical_path", type: "array", description: "Ordered list of tasks on the critical path." }, { name: "timeline", type: "object", description: "Week-by-week schedule with assignments." }, { name: "risks", type: "array", description: "Identified risks with probability, impact, and mitigation." }],
    examples: [{ input: "Build a user authentication system with OAuth, MFA, and session management for a team of 4.", expected_output: "3 milestones: Core Auth (5 tasks), OAuth Integration (4 tasks), MFA and Hardening (4 tasks). Critical path: 8 weeks. Total: 89 story points." }, { input: "Migrate monolith to microservices for an e-commerce platform, team of 12.", expected_output: "5 milestones spanning 16 weeks. 23 tasks with 8 on critical path. Key risk: data migration delay (40% probability)." }],
    edge_cases: ["Single-person team with complex project", "Project with circular dependency requirements", "Extremely vague goal with no constraints", "Team of 50 with trivial project", "Hard deadline shorter than estimated duration"],
    error_handling: [{ condition: "Goal too vague (under 10 words)", handling: "Ask clarifying questions before generating plan." }, { condition: "Circular dependencies detected", handling: "Report the cycle and suggest restructuring." }, { condition: "Team size is zero or negative", handling: "Return error: 'Team size must be a positive integer.'" }],
    safety_boundaries: ["Never guarantee delivery dates — always present estimates with confidence ranges.", "Flag when estimates exceed historical accuracy thresholds.", "Note that plans require human review and adjustment for organizational context."],
    dependencies: [],
    tags: ["planning", "project-management", "estimation", "dependencies"],
  },
  "unit-converter": {
    name: "unit-converter", display_name: "Unit Converter",
    description: "Converts numeric values between measurement units across length, weight, temperature, volume, and time categories with precision control.",
    version: "1.0.0", complexity: "simple", author: "Skill Forge Team",
    problem_statement: "Users need instant unit conversions without searching for formulas or opening calculator apps.",
    target_user: "Engineers, scientists, and students who frequently convert between measurement systems.",
    target_frameworks: ["mcp"],
    trigger_patterns: ["convert 5 miles to kilometers", "how many grams in 2 pounds", "celsius to fahrenheit"],
    capabilities: [
      { name: "convert-value", description: "Converts a numeric value from one unit to another within the same category, returning the result with specified decimal precision.", parameters: [{ name: "value", type: "number", description: "Numeric value to convert.", required: true }, { name: "from_unit", type: "string", description: "Source unit.", required: true }, { name: "to_unit", type: "string", description: "Target unit.", required: true }, { name: "precision", type: "number", description: "Decimal places (default: 4).", required: false }] },
      { name: "list-units", description: "Lists all supported units grouped by category (length, weight, temperature, volume, time).", parameters: [{ name: "category", type: "string", description: "Filter by category.", required: false }] },
    ],
    inputs: [{ name: "value", type: "number", description: "The numeric value to convert.", required: true }, { name: "from_unit", type: "string", description: "Source measurement unit.", required: true }, { name: "to_unit", type: "string", description: "Target measurement unit.", required: true }, { name: "precision", type: "number", description: "Decimal places (0-10, default: 4).", required: false }],
    outputs: [{ name: "result", type: "number", description: "Converted numeric value." }, { name: "formula", type: "string", description: "Conversion formula applied." }, { name: "from_unit", type: "string", description: "Normalized source unit name." }, { name: "to_unit", type: "string", description: "Normalized target unit name." }],
    examples: [{ input: "Convert 100 celsius to fahrenheit", expected_output: "212.0 fahrenheit (formula: value * 9/5 + 32)" }, { input: "Convert 26.2 miles to kilometers", expected_output: "42.1648 kilometers (formula: value * 1.60934)" }],
    edge_cases: ["Converting between incompatible categories", "Extremely large values (1e308)", "Extremely small values (1e-308)", "Negative temperature conversions", "Zero value input"],
    error_handling: [{ condition: "Incompatible unit categories", handling: "Return error: 'Cannot convert between [category1] and [category2].'" }, { condition: "Unknown unit name", handling: "Return error with list of supported units." }, { condition: "Value overflow after conversion", handling: "Return error: 'Result exceeds representable range.'" }],
    safety_boundaries: ["Never approximate when exact conversion formulas exist.", "Always display the formula used for transparency.", "Flag when precision loss occurs due to floating-point limitations."],
    tags: ["utility", "conversion", "math", "measurement"],
  },
  "file-organizer": {
    name: "file-organizer", display_name: "File Organizer",
    description: "Scans a directory and moves files into organized subdirectories based on file type, creation date, or custom classification rules with dry-run preview and undo support.",
    version: "1.0.0", complexity: "moderate", author: "Skill Forge Team",
    problem_statement: "Users accumulate hundreds of unsorted files in download and desktop directories, wasting time searching for specific files.",
    target_user: "Desktop users and developers who want automated file organization without manual sorting.",
    target_frameworks: ["mcp"],
    trigger_patterns: ["organize my downloads folder", "sort files by type", "clean up this directory"],
    capabilities: [
      { name: "scan-directory", description: "Recursively scans a directory and catalogs all files with metadata (size, type, date, extension).", parameters: [{ name: "directory", type: "string", description: "Path to directory to scan.", required: true }, { name: "recursive", type: "boolean", description: "Scan subdirectories (default: false).", required: false }] },
      { name: "organize-by-type", description: "Moves files into subdirectories named by category: Documents, Images, Videos, Audio, Code, Archives, Other.", parameters: [{ name: "directory", type: "string", description: "Path to directory.", required: true }, { name: "dry_run", type: "boolean", description: "Preview changes without moving (default: true).", required: false }] },
      { name: "organize-by-date", description: "Moves files into YYYY/MM subdirectories based on file creation or modification date.", parameters: [{ name: "directory", type: "string", description: "Path to directory.", required: true }, { name: "date_field", type: "string", description: "Date to use: 'created' or 'modified'.", required: false }] },
      { name: "undo-last", description: "Reverses the most recent organize operation using the saved move log.", parameters: [{ name: "directory", type: "string", description: "Path to directory.", required: true }] },
    ],
    inputs: [{ name: "directory", type: "string", description: "Absolute path to the target directory.", required: true }, { name: "strategy", type: "string", description: "Organization strategy: 'type', 'date', or 'custom'.", required: false }],
    outputs: [{ name: "plan", type: "array", description: "List of planned moves." }, { name: "summary", type: "object", description: "Count of files by category." }, { name: "move_log", type: "string", description: "Path to the move log file." }],
    examples: [{ input: "Organize ~/Downloads by file type in dry-run mode.", expected_output: "Plan: 45 files to move — 12 to Documents, 18 to Images, 8 to Archives, 7 to Other. No files moved (dry run)." }, { input: "Organize /tmp/photos by date with recursive scan.", expected_output: "Moved 230 files into 2024/01 through 2024/12 subdirectories." }],
    edge_cases: ["Directory does not exist", "Directory is empty", "Files with no extension", "Symbolic links", "Read-only files", "Filename conflicts"],
    error_handling: [{ condition: "Directory does not exist", handling: "Return error: 'Directory not found: [path].'" }, { condition: "Permission denied", handling: "Skip the file, log as failed, continue." }, { condition: "Filename conflict", handling: "Append numeric suffix." }],
    safety_boundaries: ["Default to dry-run mode.", "Never delete any files.", "Refuse to organize system directories.", "Always create a move log for undo."],
    tags: ["filesystem", "organization", "automation", "productivity"],
  },
  "research-assistant": {
    name: "research-assistant", display_name: "Research Assistant",
    description: "Multi-agent research crew that gathers information from specified sources, cross-validates facts, identifies contradictions, and synthesizes findings into structured reports with citations.",
    version: "1.0.0", complexity: "moderate", author: "Skill Forge Team",
    problem_statement: "Researchers spend 60 percent of their time gathering and verifying information before any analysis can begin.",
    target_user: "Analysts, journalists, and academic researchers conducting multi-source research.",
    target_frameworks: ["crewai"],
    trigger_patterns: ["research this topic", "gather information about", "compile a research report on"],
    capabilities: [
      { name: "gather-sources", description: "Collects relevant information from a list of provided source URLs or document paths, extracting key claims with metadata.", parameters: [{ name: "topic", type: "string", description: "Research topic or question.", required: true }, { name: "sources", type: "array", description: "List of source URLs or file paths.", required: false }] },
      { name: "validate-facts", description: "Cross-references extracted claims across multiple sources, flagging contradictions and assigning confidence scores.", parameters: [{ name: "claims", type: "array", description: "List of claims to validate.", required: true }] },
      { name: "synthesize-report", description: "Compiles validated findings into a structured report with sections, citations, and confidence ratings.", parameters: [{ name: "findings", type: "array", description: "Validated findings to synthesize.", required: true }, { name: "format", type: "string", description: "Report format: summary, detailed, academic.", required: false }] },
    ],
    inputs: [{ name: "topic", type: "string", description: "Research topic or question.", required: true }, { name: "sources", type: "array", description: "URLs or file paths.", required: false }],
    outputs: [{ name: "report", type: "object", description: "Structured report with sections, claims, citations." }, { name: "contradictions", type: "array", description: "Identified contradictions between sources." }, { name: "source_quality", type: "array", description: "Quality assessment for each source." }],
    examples: [{ input: "Research quantum computing hardware from 3 academic papers.", expected_output: "Report with 5 sections. 2 contradictions flagged on error correction thresholds." }, { input: "Compare electric vehicle adoption rates across Europe, US, and China.", expected_output: "Comparative report with per-region data tables and 12 cited statistics." }],
    edge_cases: ["No sources provided", "Sources in different languages", "All sources contradict each other", "Inaccessible sources", "Topic too broad"],
    error_handling: [{ condition: "Source URL unreachable", handling: "Skip unreachable source, log warning, continue." }, { condition: "All sources contradict", handling: "Present all perspectives with confidence scores." }, { condition: "Topic too broad", handling: "Suggest 3-5 narrower subtopics." }],
    safety_boundaries: ["Never fabricate sources or citations.", "Always attribute claims to their original source.", "Flag when source quality is insufficient.", "Note limitations of scope in every report."],
    tags: ["research", "multi-agent", "synthesis", "fact-checking"],
  },
  "web-scraper": {
    name: "web-scraper", display_name: "Web Scraper",
    description: "Extracts structured data from web pages using configurable CSS selectors, returning clean JSON arrays with pagination support and rate limiting.",
    version: "1.0.0", complexity: "moderate", author: "Skill Forge Team",
    problem_statement: "Developers need to extract structured data from websites without writing custom parsing code for each site.",
    target_user: "Data engineers and analysts who need to collect structured data from web sources.",
    target_frameworks: ["langchain"],
    trigger_patterns: ["scrape data from this page", "extract product listings", "get all links from", "parse this webpage into JSON"],
    capabilities: [
      { name: "extract-elements", description: "Selects DOM elements using CSS selectors and extracts text content, attributes, or inner HTML.", parameters: [{ name: "url", type: "string", description: "Target page URL.", required: true }, { name: "selectors", type: "object", description: "Map of field names to CSS selectors.", required: true }] },
      { name: "paginate", description: "Follows pagination links to extract data across multiple pages up to a specified limit.", parameters: [{ name: "url", type: "string", description: "Starting page URL.", required: true }, { name: "next_selector", type: "string", description: "CSS selector for next page link.", required: true }, { name: "max_pages", type: "number", description: "Maximum pages to scrape (default: 5).", required: false }] },
      { name: "transform-output", description: "Cleans and transforms extracted data: trims whitespace, converts types, removes duplicates.", parameters: [{ name: "data", type: "array", description: "Raw extracted data.", required: true }] },
    ],
    inputs: [{ name: "url", type: "string", description: "Target web page URL (must be https).", required: true }, { name: "selectors", type: "object", description: "Map of output field names to CSS selectors.", required: true }, { name: "max_pages", type: "number", description: "Maximum pages for pagination (1-20).", required: false }],
    outputs: [{ name: "data", type: "array", description: "Array of extracted records." }, { name: "metadata", type: "object", description: "Scraping metadata: pages, records, duration, errors." }, { name: "errors", type: "array", description: "Extraction errors." }],
    examples: [{ input: "Extract product name and price from example.com/products using selectors {name: '.product-title', price: '.price'}", expected_output: "Array of 25 records. Metadata: 1 page, 25 records, 1.2s duration." }, { input: "Scrape job listings across 5 pages with pagination selector '.next-page a'", expected_output: "Array of 120 records across 5 pages. 2 errors on page 4." }],
    edge_cases: ["Page requires JavaScript rendering", "Page returns 403 or CAPTCHA", "Selector matches zero elements", "Page structure changes between pages", "Extremely large page (over 10MB)"],
    error_handling: [{ condition: "HTTP error (4xx, 5xx)", handling: "Log error with status code, skip page, continue." }, { condition: "Selector matches nothing", handling: "Return empty array with warning." }, { condition: "Rate limit detected (429)", handling: "Back off exponentially, retry up to 3 times." }],
    safety_boundaries: ["Always respect robots.txt directives.", "Enforce minimum 500ms delay between requests.", "Never bypass CAPTCHAs or authentication mechanisms.", "Refuse to scrape pages with explicit no-scraping terms."],
    dependencies: ["requests", "beautifulsoup4"],
    tags: ["web", "scraping", "extraction", "data-collection"],
  },
};

export function getExample(name: string): SkillSpec | undefined {
  return EXAMPLE_SPECS[name];
}

export function listExamples(framework?: string): ExampleMeta[] {
  if (!framework) return EXAMPLES_INDEX;
  return EXAMPLES_INDEX.filter(e => e.framework === framework);
}
