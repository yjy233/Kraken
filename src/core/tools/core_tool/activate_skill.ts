/**
 * Activate Skill Tool - Activates a skill and returns its documentation
 */

import type { ToolDefinition, ToolResult } from "../types";
import type { Skill } from "../../skills/types";
import { getSkillStructure } from "../../skills/scanner";
import path from "node:path";

export interface ActivateSkillInput {
  skill_name: string;
}

/**
 * Create activate_skill tool
 */
export function createActivateSkillTool(availableSkills: Skill[]): ToolDefinition<ActivateSkillInput> {
  return {
    name: "activate_skill",
    description: `Activate a skill to get its full documentation and file structure. Available skills: ${availableSkills.map(s => s.name).join(", ")}`,
    inputSchema: {
      type: "object",
      properties: {
        skill_name: {
          type: "string",
          description: "Name of the skill to activate",
          enum: availableSkills.map(s => s.name)
        }
      },
      required: ["skill_name"]
    },
    async run(input, context): Promise<ToolResult> {
      const { skill_name } = input;

      // Find the skill
      const skill = availableSkills.find(s => s.name === skill_name);

      if (!skill) {
        return {
          ok: false,
          content: `Skill "${skill_name}" not found. Available skills: ${availableSkills.map(s => s.name).join(", ")}`
        };
      }

      try {
        // Get skill directory structure
        const skillName = path.basename(skill.path);
        const structure = await getSkillStructure(skill.path);

        const result = `# Skill Activated: ${skill.name}

**Description:** ${skill.description}
**Path:** ${skill.path}
${skill.metadata.version ? `**Version:** ${skill.metadata.version}` : ""}
${skill.metadata.author ? `**Author:** ${skill.metadata.author}` : ""}

## Documentation

${skill.readme}

## File Structure

\`\`\`
${skillName}/
${structure}\`\`\`

The skill has been activated. You can now use the files and resources in this skill.
`;

        return {
          ok: true,
          content: result
        };
      } catch (error) {
        return {
          ok: false,
          content: `Failed to activate skill "${skill_name}": ${(error as Error).message}`
        };
      }
    }
  };
}
