# ReAct Agent System Prompt Enhancement

## Summary of Changes

The ReActAgent has been enhanced with a comprehensive system prompt that dramatically improves the agent's reasoning capabilities and promotes effective use of the `write_todo` tool for complex tasks.

## What Was Changed

### 1. New Prompts Module (`src/core/agent/prompts/`)

Created a new prompts module with:
- **systemPrompt.ts**: Comprehensive default system prompt (~2500 tokens)
- **index.ts**: Exports and utility functions
- **README.md**: Documentation for customizing prompts
- **EXAMPLES.md**: Real-world usage examples

### 2. Enhanced System Prompt Features

The new system prompt includes:

#### Core Principles
- **Think Before You Act**: Encourages reasoning before tool use
- **Break Down Complex Tasks**: Promotes task decomposition
- **Use Tools Strategically**: Guides appropriate tool selection
- **Iterate and Refine**: Emphasizes learning from results

#### ReAct Pattern Explanation
- Clear description of the Reason → Act → Observe → Repeat loop
- Helps the agent understand its own operation mode

#### Tool Usage Guidance
- Specific instructions for when to use each tool
- **Emphasis on write_todo**: Detailed guidance on using write_todo for complex tasks

#### Complex Task Handling Protocol
1. Use `write_todo` FIRST to create task breakdown
2. Execute tasks systematically
3. Update todo list to track progress
4. Validate work after key steps

#### Reasoning Guidelines
- Be explicit about thinking process
- Consider multiple approaches
- Acknowledge uncertainty
- Learn from tool results

### 3. Updated ReActAgent Class

#### New Option
```typescript
export interface ReActAgentOptions {
  model: string;
  maxIterations?: number;
  temperature?: number;
  systemPrompt?: string; // NEW: Allow custom system prompt
}
```

#### Modified buildMessages Method
```typescript
private buildMessages(sessionId: string): ChatMessage[] {
  const systemMessage: ChatMessage = {
    role: "system",
    content: this.options.systemPrompt ?? SYSTEM_PROMPT // Use custom or default
  };

  return [systemMessage, ...this.sessions.get(sessionId)];
}
```

## Benefits

### 1. Better Task Decomposition
The agent now automatically breaks down complex tasks into manageable steps using `write_todo`.

**Before**:
```
User: "Refactor the error handling"
Agent: *tries to do everything at once*
Agent: *runs out of iterations*
```

**After**:
```
User: "Refactor the error handling"
Agent: *creates todo list with steps*
Agent: *systematically works through each step*
Agent: *tracks progress in todo file*
Agent: *provides comprehensive results*
```

### 2. Transparent Planning
Users can see the agent's plan by reading the todo file, providing visibility into the approach.

### 3. Resumability
If the agent hits the iteration limit, the plan persists in the todo file, allowing manual continuation or retry.

### 4. Better Tool Selection
The agent now understands when to use each tool and why, leading to more efficient tool usage.

### 5. Improved Reasoning
Explicit guidance on reasoning helps the agent think through problems more systematically.

## Usage

### Default Behavior
No changes needed! The enhanced prompt is now the default:

```typescript
const agent = new ReActAgent({
  llm,
  tools,
  sessions,
  sandbox,
  logger,
  options: { model: "gpt-4" }
});
```

### Custom System Prompt
You can override with a custom prompt:

```typescript
const agent = new ReActAgent({
  llm,
  tools,
  sessions,
  sandbox,
  logger,
  options: {
    model: "gpt-4",
    systemPrompt: "Your custom instructions here..."
  }
});
```

### Extending Default Prompt
Use the helper to add domain-specific instructions:

```typescript
import { buildCustomSystemPrompt } from "./core/agent/prompts";

const customPrompt = buildCustomSystemPrompt(`
Focus specifically on:
- Security best practices
- Performance optimization
- Code maintainability
`);

const agent = new ReActAgent({
  // ...
  options: {
    model: "gpt-4",
    systemPrompt: customPrompt
  }
});
```

## Testing

### Try These Prompts

**Simple Task** (should NOT use write_todo):
```
"What is the capital of France?"
```

**Complex Task** (should use write_todo):
```
"Help me implement rate limiting for all network tools"
"Analyze the codebase for security vulnerabilities"
"Create a comprehensive test suite"
```

**Research Task** (should use write_todo):
```
"Research vector database options and recommend one for this project"
```

### Expected Behavior

For complex tasks, you should see:
1. Agent calls `write_todo` to create task breakdown
2. Agent executes tasks using appropriate tools
3. Agent updates todo list with checkmarks (✓) as progress is made
4. Agent provides comprehensive final answer
5. Todo file contains complete record of the plan and progress

## Future Enhancements

Potential improvements:
- **Persona templates**: Pre-built prompts for specific domains (code review, data analysis, etc.)
- **Few-shot examples**: Include example reasoning traces in the prompt
- **Dynamic tool guidance**: Adjust instructions based on available tools
- **Reflection prompts**: Encourage the agent to review its own work
- **Error recovery patterns**: Specific guidance for handling common failures

## Files Modified

- ✨ **NEW**: `src/core/agent/prompts/systemPrompt.ts` - Comprehensive system prompt
- ✨ **NEW**: `src/core/agent/prompts/index.ts` - Exports and utilities
- ✨ **NEW**: `src/core/agent/prompts/README.md` - Documentation
- ✨ **NEW**: `src/core/agent/prompts/EXAMPLES.md` - Usage examples
- 📝 **MODIFIED**: `src/core/agent/ReActAgent.ts` - Uses new prompt, supports custom prompts

## Migration

No migration needed! The changes are backward compatible. Existing code will automatically use the enhanced prompt.

## Performance Notes

- The new system prompt is ~2500 tokens
- This adds ~$0.0025 per request for GPT-4 (negligible)
- Benefits far outweigh the minor token cost increase
- Consider using the optional `systemPrompt` parameter to reduce tokens for simple use cases if needed

## Feedback

The enhanced prompt should significantly improve:
- Task planning and decomposition
- Progress transparency
- Tool usage efficiency
- Reasoning quality
- User experience

Test with your typical use cases and adjust the prompt as needed using the customization options.
