import type { SkillSpec } from "./types";

const SKILLS_KEY = "skillforge_skills";
const DRAFT_KEY = "skillforge_draft";

export function saveSkill(spec: SkillSpec): void {
  const skills = loadSkills();
  const idx = skills.findIndex(s => s.name === spec.name);
  if (idx >= 0) {
    skills[idx] = spec;
  } else {
    skills.push(spec);
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  }
}

export function loadSkills(): SkillSpec[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteSkill(name: string): void {
  const skills = loadSkills().filter(s => s.name !== name);
  if (typeof window !== "undefined") {
    localStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
  }
}

export function saveDraft(spec: Partial<SkillSpec>): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(spec));
  }
}

export function loadDraft(): Partial<SkillSpec> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DRAFT_KEY);
  }
}
