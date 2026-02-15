# Testing New Tools

Quick test prompts for the CLI to verify new tools work correctly.

## Test 1: write_file

**Prompt:**
```
Create a new file called "test_output.txt" with the content "Hello from Kraken!"
```

**Expected Behavior:**
- Agent uses `write_file` tool
- Creates `data/test_output.txt` or similar
- Reports success with file size

**Verification:**
```
Read the file test_output.txt
```

---

## Test 2: glob

**Prompt:**
```
Find all TypeScript files in the src directory
```

**Expected Behavior:**
- Agent uses `glob` with pattern "src/**/*.ts"
- Returns list of all .ts files
- Shows file sizes

**Alternative Prompts:**
```
Find all JSON configuration files
List all test files in the project
Show me all markdown files
```

---

## Test 3: grep

**Prompt:**
```
Search for the word "export" in all TypeScript files
```

**Expected Behavior:**
- Agent uses `grep` with pattern "export"
- Returns matching lines with file:line: format
- Shows context of matches

**Alternative Prompts:**
```
Find all TODO comments in the codebase
Search for "function create" in the code
Find all import statements
```

---

## Test 4: Combined Workflow

**Prompt:**
```
Find all TypeScript files that contain the word "sandbox", then read the first one you find
```

**Expected Behavior:**
1. Agent uses `grep` to find files with "sandbox"
2. Agent uses `read_file` to read one of the matching files
3. Agent provides summary of what was found

---

## Test 5: Complex Task

**Prompt:**
```
Help me find all functions in the codebase that start with "create" and list them in a file called "creator_functions.txt"
```

**Expected Behavior:**
1. Agent uses `write_todo` to plan:
   - Find all files
   - Search for "function create" pattern
   - Collect results
   - Write to file
2. Agent uses `grep` with pattern "function create\\w+"
3. Agent uses `write_file` to save results
4. Agent confirms completion

---

## Test 6: Glob Patterns

**Prompt:**
```
Show me the directory structure by listing all directories
```

**Expected Behavior:**
- Agent uses `glob` with appropriate pattern
- Lists directories found

**Alternative:**
```
Find all files that end with .config.ts
Find all index.ts files
```

---

## Test 7: Error Handling

**Prompt:**
```
Search for "nonexistentpattern12345" in all files
```

**Expected Behavior:**
- Agent uses `grep`
- Returns "No matches found" message
- Handles gracefully (no error)

**Another Test:**
```
Write a file to /etc/forbidden/path.txt
```

**Expected Behavior:**
- Agent attempts `write_file`
- Sandbox blocks access
- Agent reports sandbox restriction error

---

## Test 8: Case Sensitivity

**Prompt:**
```
Search for "FUNCTION" case-insensitively
```

**Expected Behavior:**
- Agent uses `grep` with `ignoreCase: true`
- Finds "function", "Function", "FUNCTION", etc.

---

## Verification Commands

After running tests, verify files were created:

```bash
# Check if test file was created
ls -la data/test_output.txt

# Read test file
cat data/test_output.txt

# Check creator functions list (if created)
cat data/creator_functions.txt

# List data directory
ls -la data/
```

---

## Performance Test

**Prompt:**
```
Find all occurrences of "function" in the entire src directory
```

**Expected Behavior:**
- Should complete in reasonable time
- May hit maxResults limit (100)
- Returns structured output

**Check:**
- Does it skip node_modules? ✓
- Does it skip .git? ✓
- Does it respect maxResults? ✓

---

## Integration Test

**Prompt:**
```
I need to understand the tool system. First find all tool files, then search for "ToolDefinition" in those files, and give me a summary.
```

**Expected Behavior:**
1. Agent uses `glob` to find tool files: "src/core/tools/**/*.ts"
2. Agent uses `grep` to search for "ToolDefinition"
3. Agent may use `read_file` on specific files
4. Agent provides comprehensive summary

This tests:
- Tool chaining
- Strategic tool selection
- Information synthesis

---

## Notes

- All file operations are subject to sandbox restrictions
- Network tools require `ALLOW_NETWORK=true`
- Default limits: 100 matches (grep), 200 files (glob)
- Patterns support JavaScript regex (grep) and glob syntax (glob)

---

## Success Criteria

✅ write_file: Creates files in sandbox
✅ grep: Finds content in files
✅ glob: Finds files by pattern
✅ Error handling: Graceful failure messages
✅ Tool chaining: Can combine tools effectively
✅ Performance: Reasonable speed on large codebases
✅ Sandbox: Respects restrictions properly
