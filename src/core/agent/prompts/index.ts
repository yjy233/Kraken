/**
 * Prompt templates for the ReAct Agent
 */

export { SYSTEM_PROMPT } from "./systemPrompt";

/**
 * Build a custom system prompt by extending the base prompt
 */
export function buildCustomSystemPrompt(additionalInstructions: string): string {
  const { SYSTEM_PROMPT } = require("./systemPrompt");
  return `${SYSTEM_PROMPT}

## Additional Instructions

${additionalInstructions}`;
}
