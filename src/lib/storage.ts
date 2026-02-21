// ═══════════════════════════════════════════════════════════════
// Skill Forge — Project Storage (localStorage V1)
// Designed for easy swap to Supabase in V2
// ═══════════════════════════════════════════════════════════════

import type { Project } from "./types";

const PROJECTS_KEY = "skillforge_projects";

// ── Read ───────────────────────────────────────────────────────

export function listProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const projects: Project[] = JSON.parse(raw);
    return projects.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  } catch {
    return [];
  }
}

export function getProject(id: string): Project | null {
  const projects = listProjects();
  return projects.find(p => p.id === id) ?? null;
}

// ── Write ──────────────────────────────────────────────────────

export function saveProject(project: Project): void {
  if (typeof window === "undefined") return;
  const projects = listProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  const updated = { ...project, updated_at: new Date().toISOString() };

  if (idx >= 0) {
    projects[idx] = updated;
  } else {
    projects.push(updated);
  }

  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  if (typeof window === "undefined") return;
  const projects = listProjects().filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// ── Helpers ────────────────────────────────────────────────────

export function getProjectCount(): number {
  return listProjects().length;
}

export function clearAllProjects(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROJECTS_KEY);
}
