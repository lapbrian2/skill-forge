// ═══════════════════════════════════════════════════════════════
// Skill Forge — Terminology Extractor
// Extracts domain-specific terms from user's description and
// discovery answers. Used to inject into spec generation prompt
// so the generated spec echoes the user's own language.
// ═══════════════════════════════════════════════════════════════

import type { QAEntry } from "@/lib/types";

// ── Common Words to Filter ───────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "must", "ought",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
  "my", "your", "his", "its", "our", "their", "this", "that", "these",
  "those", "what", "which", "who", "whom", "when", "where", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "just", "but", "and", "or", "if", "then", "because", "as",
  "until", "while", "of", "at", "by", "for", "with", "about", "against",
  "between", "through", "during", "before", "after", "above", "below",
  "to", "from", "up", "down", "in", "out", "on", "off", "over", "under",
  "again", "further", "once", "here", "there", "where", "when", "why",
  "how", "any", "both", "each", "few", "more", "most", "other", "some",
  "no", "not", "only", "same", "so", "than", "too", "very",
  "want", "wants", "like", "likes", "think", "thinks", "know", "knows",
  "make", "makes", "made", "use", "uses", "used", "also", "get", "gets",
  "got", "let", "something", "anything", "everything", "nothing",
  "app", "application", "system", "thing", "things", "way", "ways",
  "yes", "no", "maybe", "probably", "sure", "okay", "well",
]);

// ── Term Extraction ──────────────────────────────────────────

/**
 * Extract domain-specific terminology from user's description and answers.
 * Returns unique terms that should be echoed in the generated spec.
 */
export function extractTerminology(
  description: string,
  answers: QAEntry[],
): string[] {
  const allText = [
    description,
    ...answers.map(a => a.answer),
  ].join(" ");

  const terms = new Set<string>();

  // Extract multi-word phrases (2-3 words that appear together meaningfully)
  extractPhrases(allText).forEach(phrase => terms.add(phrase));

  // Extract significant single words
  extractSignificantWords(allText).forEach(word => terms.add(word));

  // Extract proper nouns and technical terms (capitalized or camelCase)
  extractProperNouns(allText).forEach(noun => terms.add(noun));

  // Extract terms in quotes
  extractQuotedTerms(allText).forEach(term => terms.add(term));

  return Array.from(terms)
    .filter(t => t.length > 2)
    .sort((a, b) => b.length - a.length) // Longer terms first (more specific)
    .slice(0, 30); // Limit to prevent prompt bloat
}

/**
 * Extract meaningful multi-word phrases.
 */
function extractPhrases(text: string): string[] {
  const phrases: string[] = [];

  // Common technical patterns
  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g,           // Capitalized phrases: "Product Manager"
    /\b(\w+\s+(?:API|SDK|CLI|UI|UX|DB|AI|ML|MCP))\b/gi, // Technical noun phrases
    /\b((?:user|admin|data|error|auth)\s+\w+)\b/gi,      // Domain compound nouns
    /\b(\w+[-_]\w+(?:[-_]\w+)*)\b/g,                     // Hyphenated/underscored terms
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[1].trim();
      if (phrase.split(/\s+/).every(w => !STOP_WORDS.has(w.toLowerCase()))) {
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

/**
 * Extract significant single words (domain terms, not common English).
 */
function extractSignificantWords(text: string): string[] {
  const words = text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(w =>
      w.length > 3 &&
      !STOP_WORDS.has(w.toLowerCase()) &&
      !/^\d+$/.test(w),
    );

  // Count frequency — higher frequency = more important
  const freq = new Map<string, number>();
  for (const word of words) {
    const lower = word.toLowerCase();
    freq.set(lower, (freq.get(lower) || 0) + 1);
  }

  // Return words that appear 2+ times (user emphasizes them)
  return Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/**
 * Extract proper nouns and technical terms (capitalized, camelCase, UPPER_CASE).
 */
function extractProperNouns(text: string): string[] {
  const nouns: string[] = [];

  // CamelCase or PascalCase words
  const camelCase = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g) || [];
  nouns.push(...camelCase);

  // ALL_CAPS terms (constants, acronyms)
  const allCaps = text.match(/\b[A-Z]{2,}(?:_[A-Z]+)*\b/g) || [];
  nouns.push(...allCaps.filter(t => t.length > 2));

  return nouns;
}

/**
 * Extract terms in quotes (user explicitly named something).
 */
function extractQuotedTerms(text: string): string[] {
  const terms: string[] = [];
  const quotes = text.match(/["']([^"']+)["']/g) || [];
  for (const quote of quotes) {
    const term = quote.slice(1, -1).trim();
    if (term.length > 2 && term.length < 50) {
      terms.push(term);
    }
  }
  return terms;
}
