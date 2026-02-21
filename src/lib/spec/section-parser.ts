// ═══════════════════════════════════════════════════════════════
// Skill Forge — Spec Section Parser
// Parse generated specs into sections for navigation,
// regeneration, and manipulation.
// ═══════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────

export interface SpecSection {
  number: number;
  title: string;
  fullHeading: string;
  content: string;
  startIndex: number;
  endIndex: number;
  subsections: SubSection[];
}

export interface SubSection {
  number: string;       // e.g., "1.1", "1.2"
  title: string;
  content: string;
}

// ── Parse Spec into Sections ──────────────────────────────────

/**
 * Parse a complete spec markdown into numbered sections.
 * Splits on `## N.` headings (H2 with section numbers).
 * Each section includes its subsections (### N.N).
 */
export function parseSpecSections(markdown: string): SpecSection[] {
  const sections: SpecSection[] = [];
  // Match ## followed by a number, then period/space, then title
  const sectionRegex = /^## (\d+)\.\s+(.+)$/gm;
  const matches: Array<{ index: number; number: number; title: string; fullMatch: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    matches.push({
      index: match.index,
      number: parseInt(match[1], 10),
      title: match[2].trim(),
      fullMatch: match[0],
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
    const content = markdown.slice(current.index, nextIndex);

    // Extract subsections
    const subsections = parseSubsections(content, current.number);

    sections.push({
      number: current.number,
      title: current.title,
      fullHeading: current.fullMatch,
      content: content.trimEnd(),
      startIndex: current.index,
      endIndex: nextIndex,
      subsections,
    });
  }

  return sections;
}

/**
 * Parse subsections (### N.M headings) within a section.
 */
function parseSubsections(sectionContent: string, parentNumber: number): SubSection[] {
  const subsections: SubSection[] = [];
  const subRegex = new RegExp(`^### (${parentNumber}\\.\\d+)\\s+(.+)$`, "gm");
  const matches: Array<{ index: number; number: string; title: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = subRegex.exec(sectionContent)) !== null) {
    matches.push({
      index: match.index,
      number: match[1],
      title: match[2].trim(),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i < matches.length - 1 ? matches[i + 1].index : sectionContent.length;
    const content = sectionContent.slice(current.index, nextIndex);

    subsections.push({
      number: current.number,
      title: current.title,
      content: content.trimEnd(),
    });
  }

  return subsections;
}

// ── Section Manipulation ──────────────────────────────────────

/**
 * Replace a single section in the full spec markdown.
 * Preserves everything before and after the section.
 */
export function replaceSection(
  markdown: string,
  sectionNumber: number,
  newContent: string,
): string {
  const sections = parseSpecSections(markdown);
  const target = sections.find(s => s.number === sectionNumber);

  if (!target) {
    console.warn(`Section ${sectionNumber} not found in spec`);
    return markdown;
  }

  const before = markdown.slice(0, target.startIndex);
  const after = markdown.slice(target.endIndex);

  // Ensure the new content ends with a newline for clean joining
  const cleanContent = newContent.trimEnd() + "\n\n";

  return before + cleanContent + after;
}

/**
 * Get a specific section by number.
 */
export function getSectionByNumber(
  sections: SpecSection[],
  number: number,
): SpecSection | null {
  return sections.find(s => s.number === number) ?? null;
}

/**
 * Get section context for regeneration: the sections immediately before and after.
 * Provides surrounding context so the AI can maintain consistency.
 */
export function getSectionContext(
  markdown: string,
  sectionNumber: number,
): { before: string; after: string } {
  const sections = parseSpecSections(markdown);
  const targetIdx = sections.findIndex(s => s.number === sectionNumber);

  if (targetIdx < 0) return { before: "", after: "" };

  const beforeSection = targetIdx > 0 ? sections[targetIdx - 1] : null;
  const afterSection = targetIdx < sections.length - 1 ? sections[targetIdx + 1] : null;

  return {
    before: beforeSection
      ? `[Previous section: ${beforeSection.fullHeading}]\n${beforeSection.content.slice(0, 500)}...`
      : "",
    after: afterSection
      ? `[Next section: ${afterSection.fullHeading}]\n${afterSection.content.slice(0, 500)}...`
      : "",
  };
}

/**
 * Get word count and section count from spec content.
 */
export function getSpecStats(markdown: string): { wordCount: number; sectionCount: number } {
  const sections = parseSpecSections(markdown);
  const words = markdown.split(/\s+/).filter(w => w.length > 0);
  return {
    wordCount: words.length,
    sectionCount: sections.length,
  };
}
