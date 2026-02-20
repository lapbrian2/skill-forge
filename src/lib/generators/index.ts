import type { SkillSpec, GeneratedFile } from "../types";
import { generateClaude } from "./claude";
import { generateMcp } from "./mcp";
import { generateCrewai } from "./crewai";
import { generateLangchain } from "./langchain";

export const GENERATORS: Record<string, (spec: SkillSpec) => GeneratedFile[]> = {
  claude: generateClaude,
  mcp: generateMcp,
  crewai: generateCrewai,
  langchain: generateLangchain,
};

export function generateAll(spec: SkillSpec, targets?: string[]): GeneratedFile[] {
  const frameworks = targets || spec.target_frameworks || ["claude"];
  const files: GeneratedFile[] = [];

  for (const fw of frameworks) {
    const gen = GENERATORS[fw];
    if (gen) files.push(...gen(spec));
  }

  return files;
}

export const FRAMEWORK_INFO: Record<string, { name: string; description: string; icon: string }> = {
  claude: { name: "Claude SKILL.md", description: "Markdown skill definition for Claude", icon: "FileText" },
  mcp: { name: "MCP Server", description: "FastMCP server with @mcp.tool decorators", icon: "Server" },
  crewai: { name: "CrewAI Agent", description: "Agent config + tools for CrewAI", icon: "Users" },
  langchain: { name: "LangChain Tool", description: "BaseTool subclass + Pydantic schema", icon: "Link" },
};
