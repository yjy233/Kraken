# Enhanced ReAct Agent Examples

This document demonstrates how the enhanced ReAct Agent with the comprehensive system prompt handles various types of tasks.

## Example 1: Simple Task (No Task Decomposition Needed)

**User**: "What is 2 + 2?"

**Agent Behavior**:
- Recognizes this is a simple query
- Responds directly without using tools
- No need for write_todo

**Response**: "2 + 2 equals 4."

---

## Example 2: Complex Task (Task Decomposition Required)

**User**: "Help me refactor the error handling across the codebase to use a consistent pattern"

**Agent Reasoning**:
"This is a complex multi-step task that requires:
1. Understanding current error handling patterns
2. Identifying all files with error handling
3. Proposing a consistent pattern
4. Creating a refactoring plan

I should use write_todo to break this down."

**Step 1**: Call `write_todo`
```json
{
  "text": "Task: Refactor error handling\n- [ ] Scan codebase for all error handling patterns\n- [ ] Document current approaches (try-catch, error callbacks, etc.)\n- [ ] Identify inconsistencies\n- [ ] Propose unified error handling pattern\n- [ ] List files that need refactoring\n- [ ] Prioritize refactoring by impact"
}
```

**Step 2**: Call `read_file` on key files to analyze patterns

**Step 3**: Update `write_todo` with findings
```json
{
  "text": "✓ Found 3 different error patterns: try-catch, callback errors, Promise rejections\n- [ ] Create unified ErrorHandler class\n- [ ] Define error types and codes\n- [ ] Update tool execution error handling\n- [ ] Update session store error handling"
}
```

**Step 4**: Continue executing tasks systematically

**Final Response**: "I've analyzed the error handling patterns in your codebase and created a refactoring plan in data/todo.md. Here's what I found:..."

---

## Example 3: Research Task

**User**: "Research the latest trends in vector databases and summarize them"

**Agent Reasoning**:
"This requires web research with multiple steps. I should organize this."

**Step 1**: Call `write_todo`
```json
{
  "text": "Task: Research vector databases\n- [ ] Search for 'vector database trends 2025'\n- [ ] Search for 'vector database benchmarks'\n- [ ] Search for 'popular vector databases comparison'\n- [ ] Summarize key findings\n- [ ] List top 3 databases with pros/cons"
}
```

**Step 2**: Call `web_search` for each topic

**Step 3**: Update todo with checkmarks as searches complete

**Step 4**: Synthesize findings into summary

---

## Example 4: File Analysis Task

**User**: "Check if there are any TODO comments in the codebase and list them"

**Agent Reasoning**:
"This requires scanning multiple files. Let me break it down."

**Step 1**: Call `write_todo`
```json
{
  "text": "Task: Find all TODO comments\n- [ ] List all source files\n- [ ] Read each file and search for TODO comments\n- [ ] Extract TODO text and location\n- [ ] Organize by file and priority if indicated"
}
```

**Step 2**: Use `read_file` on source files

**Step 3**: Compile list of TODOs

**Final Response**: "I found 12 TODO comments across 5 files:..."

---

## Example 5: Iterative Problem Solving

**User**: "The application keeps crashing when I try to use the browser tool"

**Agent Reasoning**:
"This is a debugging task that may require multiple investigation steps."

**Step 1**: Call `write_todo`
```json
{
  "text": "Task: Debug browser tool crash\n- [ ] Read browser tool implementation\n- [ ] Check for recent changes to browser tool\n- [ ] Look for error handling gaps\n- [ ] Review browser tool dependencies\n- [ ] Check if sandbox permissions are configured\n- [ ] Test with simple browser command"
}
```

**Step 2**: Call `read_file` on browser.ts

**Step 3**: Discover missing error handling

**Step 4**: Update `write_todo`
```json
{
  "text": "✓ Found issue: browser tool doesn't handle launch failures\n- [ ] Add try-catch around browser launch\n- [ ] Add validation for ALLOW_NETWORK setting\n- [ ] Add user-friendly error messages"
}
```

**Final Response**: "I found the issue. The browser tool doesn't properly handle launch failures. Here's what needs to be fixed:..."

---

## Key Patterns Demonstrated

### 1. Task Decomposition
The agent uses `write_todo` to break down complex tasks into manageable steps.

### 2. Progress Tracking
The agent updates the todo list with checkmarks (✓) as steps are completed.

### 3. Adaptive Planning
The agent updates the task list when new requirements are discovered.

### 4. Systematic Execution
The agent works through tasks in a logical order, using appropriate tools.

### 5. Validation
The agent includes verification steps in task lists to ensure quality.

---

## Benefits of Enhanced Prompt

1. **Better Planning**: Agent thinks through the full scope before acting
2. **Transparency**: User can see the agent's plan in the todo file
3. **Resumability**: If the agent hits iteration limit, the plan persists
4. **Learning**: Agent improves its planning based on tool results
5. **Efficiency**: Systematic approach reduces wasted tool calls

---

## Testing the Enhanced Agent

Try these prompts to see the improved behavior:

### Complex Planning
- "Help me implement a caching layer for the LLM responses"
- "Analyze the performance bottlenecks in this application"
- "Create a comprehensive test suite for the tool system"

### Research Tasks
- "Research best practices for ReAct agent design and summarize"
- "Find and compare three alternatives to the current session store approach"

### Multi-step Execution
- "Refactor all tools to use async/await consistently"
- "Add TypeScript strict mode and fix all resulting errors"
- "Implement rate limiting for all network-based tools"

Each of these should trigger the agent to:
1. Use `write_todo` to create a task breakdown
2. Execute tasks systematically
3. Update progress in the todo file
4. Provide comprehensive results
