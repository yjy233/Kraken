/**
 * Skill scanner - scans workspace/.skills directory for available skills
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { Skill, SkillMetadata } from "./types";

/**
 * Parse frontmatter YAML from markdown
 */
function parseFrontmatter(content: string): { metadata: Record<string, any>; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  const yamlContent = match[1];
  const markdownContent = match[2];

  // Simple YAML parser for key: value pairs
  const metadata: Record<string, any> = {};
  const lines = yamlContent.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    // Remove quotes if present
    metadata[key] = value.replace(/^["']|["']$/g, "");
  }

  return { metadata, content: markdownContent };
}

/**
 * Scan workspace/.skills directory for skills
 */
export async function scanSkills(workspaceRoot: string): Promise<Skill[]> {
  const skillsDir = path.join(workspaceRoot, ".skills");

  try {
    await fs.access(skillsDir);
  } catch {
    // .skills directory doesn't exist
    return [];
  }

  const skills: Skill[] = [];
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillPath = path.join(skillsDir, entry.name);
    const readmePath = path.join(skillPath, "readme.md");

    try {
      const readmeContent = await fs.readFile(readmePath, "utf-8");
      const { metadata, content } = parseFrontmatter(readmeContent);

      const skill: Skill = {
        name: metadata.name || entry.name,
        description: metadata.description || "No description available",
        path: skillPath,
        metadata: {
          name: metadata.name || entry.name,
          description: metadata.description || "No description available",
          version: metadata.version,
          author: metadata.author
        },
        readme: content.trim()
      };

      skills.push(skill);
    } catch (error) {
      // Skip skills without readme.md or with invalid format
      console.warn(`Failed to load skill ${entry.name}:`, error);
    }
  }

  return skills;
}

/**
 * Get directory structure as a tree string
 */
export async function getSkillStructure(skillPath: string, prefix = "", isLast = true): Promise<string> {
  const entries = await fs.readdir(skillPath, { withFileTypes: true });
  let result = "";

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLastEntry = i === entries.length - 1;
    const connector = isLastEntry ? "└── " : "├── ";
    const extension = isLastEntry ? "    " : "│   ";

    result += prefix + connector + entry.name + "\n";

    if (entry.isDirectory()) {
      const subPath = path.join(skillPath, entry.name);
      const subTree = await getSkillStructure(subPath, prefix + extension, isLastEntry);
      result += subTree;
    }
  }

  return result;
}
