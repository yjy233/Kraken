# Agent Prompts

This directory contains system prompts and prompt templates for the ReAct Agent.

## Files

- **systemPrompt.ts**: The default comprehensive system prompt that guides the agent's behavior
- **index.ts**: Exports and utility functions for working with prompts

## Default System Prompt

The default system prompt (`SYSTEM_PROMPT`) is designed to:

1. **Encourage structured reasoning**: Guides the agent to think through problems systematically
2. **Promote task decomposition**: Emphasizes breaking down complex tasks using the `write_todo` tool
3. **Explain the ReAct pattern**: Helps the agent understand its Reasoning + Acting loop
4. **Provide tool usage guidance**: Explains when and how to use each tool effectively
5. **Set quality standards**: Encourages verification, iteration, and clear communication

## Key Features

### Complex Task Handling

The prompt specifically guides the agent to:
- Use `write_todo` FIRST for multi-step tasks to create a task breakdown
- Execute tasks systematically, checking off items as they're completed
- Update the task list if new requirements are discovered
- Validate work after completing key steps

### Reasoning Guidelines

The prompt encourages:
- Explicit thinking about what's known and what needs to be discovered
- Considering multiple approaches before choosing one
- Acknowledging uncertainty and explaining investigation plans
- Learning from tool results and adapting the approach

## Customizing the System Prompt

### Option 1: Use Environment Variable or Config

You can provide a custom system prompt when creating the ReActAgent:

\`\`\`typescript
const agent = new ReActAgent({
  llm,
  tools,
  sessions,
  sandbox,
  logger,
  options: {
    model: "gpt-4",
    systemPrompt: "Your custom prompt here..."
  }
});
\`\`\`

### Option 2: Extend the Base Prompt

Use the `buildCustomSystemPrompt` helper to add additional instructions:

\`\`\`typescript
import { buildCustomSystemPrompt } from "./core/agent/prompts";

const customPrompt = buildCustomSystemPrompt(\`
You are specifically helping with code review tasks.
Focus on:
- Security vulnerabilities
- Performance issues
- Code style consistency
\`);

const agent = new ReActAgent({
  // ...
  options: {
    model: "gpt-4",
    systemPrompt: customPrompt
  }
});
\`\`\`

### Option 3: Create a New Prompt Template

Create a new file in this directory for domain-specific prompts:

\`\`\`typescript
// prompts/codeReviewPrompt.ts
export const CODE_REVIEW_PROMPT = \`
You are a code review assistant...
\`;
\`\`\`

Then use it:

\`\`\`typescript
import { CODE_REVIEW_PROMPT } from "./core/agent/prompts/codeReviewPrompt";

const agent = new ReActAgent({
  // ...
  options: {
    model: "gpt-4",
    systemPrompt: CODE_REVIEW_PROMPT
  }
});
\`\`\`

## Best Practices

When creating custom prompts:

1. **Be specific about the agent's role**: Clearly define what the agent should focus on
2. **Explain tool usage**: Guide when and how to use specific tools
3. **Set quality expectations**: Define what good output looks like
4. **Handle edge cases**: Explain how to deal with errors or unexpected situations
5. **Encourage reasoning**: Promote thinking through problems before acting
6. **Keep it concise**: While comprehensive, avoid unnecessary verbosity

## Testing Custom Prompts

After creating a custom prompt, test it with:
- Simple tasks (ensure basic functionality works)
- Complex multi-step tasks (verify task decomposition works)
- Edge cases (check error handling and uncertainty management)
- Tool-heavy tasks (confirm appropriate tool selection)

## Future Enhancements

Potential additions to the prompt system:
- **Persona templates**: Pre-built prompts for common use cases (code review, data analysis, etc.)
- **Dynamic prompt injection**: Context-aware additions based on available tools
- **Few-shot examples**: Include example reasoning traces for better performance
- **Tool-specific guidance**: Detailed instructions for advanced tool usage patterns
