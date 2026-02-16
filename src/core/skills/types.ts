/**
 * Skill type definitions
 */

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  author?: string;
}

export interface Skill {
  name: string;
  description: string;
  path: string;
  metadata: SkillMetadata;
  readme: string;
}
