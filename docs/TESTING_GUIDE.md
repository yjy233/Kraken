# Testing the Enhanced ReAct Agent

This guide helps you test and verify the enhanced system prompt is working correctly.

## Quick Test

Run the agent in CLI mode:

```bash
npm run dev
```

## Test Cases

### Test 1: Simple Query (Should NOT use write_todo)

**Input:**
```
What is 2 + 2?
```

**Expected Behavior:**
- Agent responds immediately without calling tools
- No write_todo call
- Direct answer provided

**Pass Criteria:** ✓ No unnecessary tool calls

---

### Test 2: Complex Multi-Step Task (Should use write_todo)

**Input:**
```
Help me analyze the error handling patterns in this codebase and create a plan to make them consistent.
```

**Expected Behavior:**
1. Agent recognizes this as a complex task
2. **First action**: Calls `write_todo` to create task breakdown
3. Systematically executes tasks (reading files, analyzing patterns)
4. Updates todo list with progress checkmarks (✓)
5. Provides comprehensive final answer

**Pass Criteria:**
- ✓ First tool call is `write_todo`
- ✓ Todo list contains logical task breakdown
- ✓ Agent works through tasks systematically
- ✓ Final answer is comprehensive

**Verify:** Check `data/todo.md` to see the task breakdown

---

### Test 3: Research Task (Should use write_todo)

**Input:**
```
Research the top 3 vector database options and compare their pros and cons.
```

**Expected Behavior:**
1. Agent calls `write_todo` to plan research steps
2. Uses `web_search` for each topic
3. Updates todo list as searches complete
4. Synthesizes findings into comparison

**Pass Criteria:**
- ✓ Creates research plan in write_todo
- ✓ Executes web searches systematically
- ✓ Provides structured comparison

**Note:** Requires `ALLOW_NETWORK=true` in .env

---

### Test 4: File Analysis (Should use write_todo)

**Input:**
```
Find all the TypeScript files in src/core and list what each module does.
```

**Expected Behavior:**
1. Agent creates plan in `write_todo`
2. Uses `read_file` on relevant files
3. Tracks progress in todo list
4. Provides organized summary

**Pass Criteria:**
- ✓ Systematic file reading
- ✓ Progress tracking
- ✓ Clear organization of findings

---

### Test 5: Iteration Limit Test

**Input:**
```
Analyze every single line of code in the entire codebase and provide detailed documentation for each function.
```

**Expected Behavior:**
1. Agent recognizes this is too large for iteration limit
2. Creates focused plan in `write_todo`
3. Prioritizes most important files
4. Provides what it can within limits
5. Todo list shows remaining work

**Pass Criteria:**
- ✓ Agent doesn't try to do everything at once
- ✓ Creates prioritized plan
- ✓ Gracefully handles limits
- ✓ Todo list persists for future work

---

### Test 6: Error Handling

**Input:**
```
Read the file at /nonexistent/path/file.txt
```

**Expected Behavior:**
1. Agent attempts to use `read_file` tool
2. Tool returns error
3. Agent acknowledges the error
4. Agent explains the issue to user

**Pass Criteria:**
- ✓ Error is handled gracefully
- ✓ Clear explanation provided
- ✓ No crash or infinite loop

---

## Verification Checklist

After testing, verify:

- [ ] Simple tasks don't trigger unnecessary planning
- [ ] Complex tasks trigger `write_todo` as first action
- [ ] Todo lists contain logical, actionable steps
- [ ] Agent updates todo list with progress (✓ marks)
- [ ] Agent uses appropriate tools for each task
- [ ] Agent explains its reasoning clearly
- [ ] Agent handles errors gracefully
- [ ] Agent respects iteration limits
- [ ] Todo file (`data/todo.md`) contains useful task breakdowns
- [ ] Final answers are comprehensive and helpful

## Observing Agent Behavior

### Watch for These Patterns

**Good Signs:**
- "This is a complex task that requires multiple steps. Let me break it down."
- First tool call is `write_todo` for multi-step tasks
- Agent refers to its plan when working
- Progress updates in todo list
- Clear reasoning before each action

**Warning Signs:**
- Using write_todo for trivial tasks
- Not using write_todo for obvious complex tasks
- Ignoring its own plan
- Repeating the same failed action
- No reasoning explanation

## Debugging

### If write_todo isn't being used for complex tasks:

1. Check that the tool is registered:
   ```bash
   # In CLI, try directly:
   write_todo "Test task"
   ```

2. Verify system prompt is loaded:
   - Check `src/core/agent/ReActAgent.ts` imports SYSTEM_PROMPT
   - Verify no custom `systemPrompt` option is overriding it

3. Check model temperature:
   - Higher temperature (>0.5) can make behavior less consistent
   - Default 0.2 should work well

### If agent creates but ignores the plan:

1. Check iteration limit:
   - Default is 6 steps, may need more for complex tasks
   - Set `REACT_MAX_STEPS=10` for testing

2. Verify todo file is accessible:
   - Check `data/todo.md` exists and is readable
   - Verify sandbox permissions allow access

## Example CLI Session

Here's what a good session looks like:

```
> Help me implement rate limiting for the network tools

🤖 This is a complex task that requires multiple steps. Let me create a plan first.

🔧 write_todo
   Input: { text: "Task: Implement rate limiting\n- [ ] Review current network tool implementations\n- [ ] Design rate limiter interface\n- [ ] Implement rate limiter class\n- [ ] Integrate with web_fetch tool\n- [ ] Integrate with web_search tool\n- [ ] Integrate with browser tool\n- [ ] Add configuration options\n- [ ] Test rate limiting works" }

✅ Todo appended to data/todo.md

🔧 read_file
   Input: { path: "src/core/tools/core_tool/web_fetch.ts" }

✅ File content retrieved...

[Agent continues systematically through the plan...]

🔧 write_todo
   Input: { text: "✓ Reviewed network tools\n✓ Designed rate limiter\n- [ ] Implement rate limiter class..." }

✅ Todo updated

[Agent completes work...]

✅ I've implemented rate limiting for all network tools. Here's what I did:
   1. Created a RateLimiter class...
   2. Integrated it with each network tool...
   3. Added configuration via environment variables...

   See data/todo.md for the complete task breakdown and what was accomplished.
```

## Performance Expectations

With the enhanced prompt:

- **Token usage**: ~2500 additional tokens per request (system prompt)
- **Quality improvement**: Significant - better planning and execution
- **Success rate**: Should handle complex tasks more reliably
- **Transparency**: Much better - users can see the plan

The token cost is negligible compared to the quality improvement.

## Next Steps

If testing reveals issues:

1. **Adjust the system prompt**: Edit `src/core/agent/prompts/systemPrompt.ts`
2. **Create custom prompts**: Use `buildCustomSystemPrompt()` for domain-specific needs
3. **Modify examples**: Update `EXAMPLES.md` with your use cases
4. **Tune parameters**: Adjust `REACT_MAX_STEPS`, temperature, etc.

## Feedback

After testing, document:
- What works well
- What could be improved
- Edge cases that need handling
- Suggestions for prompt improvements

Share findings to help improve the system!
