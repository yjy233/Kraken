# New Tools Documentation

This document describes the three new tools added to Kraken: `write_file`, `grep`, and `glob`.

## Tools Overview

### write_file

Write or overwrite file contents in the sandbox.

**Purpose**: Create new files or completely replace existing file contents.

**Input Schema**:
```typescript
{
  path: string;    // Path to the file (relative to sandbox root)
  content: string; // Content to write
}
```

**Example Usage**:
```typescript
// Create a new configuration file
{
  "path": "config/settings.json",
  "content": "{\"debug\": true, \"port\": 3000}"
}

// Overwrite an existing file
{
  "path": "src/utils/helper.ts",
  "content": "export function helper() {\n  return 42;\n}"
}
```

**Use Cases**:
- Creating new files
- Implementing code changes
- Generating configuration files
- Creating documentation files
- Saving processed data

**Important Notes**:
- Completely overwrites existing files (no append/merge)
- For appending, use `write_todo` or implement an append tool
- Subject to sandbox restrictions (allowlisted directories)
- Returns file size after write

---

### grep

Search for text patterns in files and directories.

**Purpose**: Find specific content within files, similar to Unix grep command.

**Input Schema**:
```typescript
{
  pattern: string;        // Text or regex pattern to search for
  path?: string;          // Directory or file to search (default: sandbox root)
  recursive?: boolean;    // Search subdirectories (default: true)
  ignoreCase?: boolean;   // Case-insensitive search (default: false)
  maxResults?: number;    // Limit results (default: 100)
}
```

**Example Usage**:
```typescript
// Find all TODO comments
{
  "pattern": "TODO",
  "recursive": true
}

// Find all error handling (case-insensitive)
{
  "pattern": "try.*catch",
  "ignoreCase": true
}

// Find imports in a specific directory
{
  "pattern": "^import.*from",
  "path": "src/core"
}

// Find function definitions with limit
{
  "pattern": "function\\s+\\w+",
  "maxResults": 50
}
```

**Output Format**:
```
Found 3 match(es):

src/core/agent.ts:42: function processRequest(input: string) {
src/utils/helper.ts:15: function formatDate(date: Date) {
src/tools/grep.ts:88: function searchFile(filePath: string) {
```

**Features**:
- Supports JavaScript regular expressions
- Returns file path, line number, and matching line content
- Recursively searches directories by default
- Automatically skips: node_modules, .git, dist, build, .cache
- Only searches text files (filters by extension)
- Respects sandbox restrictions

**Use Cases**:
- Finding TODO/FIXME comments
- Locating all usages of a function/class
- Finding import statements
- Searching for error patterns
- Code archaeology (finding old patterns)
- Security audits (finding sensitive patterns)

---

### glob

Find files and directories matching glob patterns.

**Purpose**: Locate files by name patterns, similar to shell globbing.

**Input Schema**:
```typescript
{
  pattern: string;      // Glob pattern with wildcards
  path?: string;        // Base directory (default: sandbox root)
  maxResults?: number;  // Limit results (default: 200)
}
```

**Glob Pattern Syntax**:
- `*` - Match any characters except `/` (e.g., `*.ts` matches all TypeScript files)
- `**` - Match any characters including `/` (recursive, e.g., `**/*.ts` matches all TypeScript files in subdirs)
- `?` - Match single character except `/` (e.g., `file?.ts` matches `file1.ts`, `fileA.ts`)

**Example Usage**:
```typescript
// Find all TypeScript files
{
  "pattern": "**/*.ts"
}

// Find all JSON files in src directory
{
  "pattern": "src/**/*.json"
}

// Find all test files
{
  "pattern": "**/*.test.ts"
}

// Find all README files
{
  "pattern": "**/README.md"
}

// Find files in a specific directory
{
  "pattern": "*.js",
  "path": "src/tools"
}

// Limit results for large projects
{
  "pattern": "**/*.tsx",
  "maxResults": 50
}
```

**Output Format**:
```
Found 5 match(es):

FILE src/core/agent.ts (3.2KB)
FILE src/core/tools.ts (1.8KB)
DIR  src/core/utils
FILE src/core/utils/logger.ts (945B)
FILE src/index.ts (512B)
```

**Features**:
- Standard glob pattern matching
- Displays file type (FILE/DIR) and size
- Sorted alphabetically
- Automatically skips: node_modules, .git, dist, build, .cache
- Respects sandbox restrictions

**Use Cases**:
- Finding all files of a specific type
- Locating configuration files
- Listing test files
- Finding documentation
- Discovering project structure
- Batch file operations

---

## Common Workflows

### 1. Find and Replace Across Files

```typescript
// Step 1: Find all files with the old pattern
glob({ pattern: "**/*.ts" })

// Step 2: Search for the old function name
grep({ pattern: "oldFunctionName", recursive: true })

// Step 3: Read each file, modify, and write back
read_file({ path: "src/file1.ts" })
// ... modify content ...
write_file({ path: "src/file1.ts", content: newContent })

// Step 4: Verify changes
grep({ pattern: "oldFunctionName" })  // Should return no results
grep({ pattern: "newFunctionName" })  // Should show new usage
```

### 2. Analyze Codebase Structure

```typescript
// Find all source files
glob({ pattern: "src/**/*.ts" })

// Find all test files
glob({ pattern: "**/*.test.ts" })

// Find all configuration files
glob({ pattern: "**/*.config.{js,ts,json}" })
```

### 3. Security Audit

```typescript
// Find potential security issues
grep({ pattern: "eval\\(", recursive: true })
grep({ pattern: "dangerouslySetInnerHTML", recursive: true })
grep({ pattern: "process\\.env\\.", recursive: true })

// Find API keys or secrets (be careful!)
grep({ pattern: "api[_-]?key", ignoreCase: true })
```

### 4. Code Quality Check

```typescript
// Find TODO/FIXME comments
grep({ pattern: "TODO|FIXME" })

// Find console.log statements
grep({ pattern: "console\\.log" })

// Find any/unknown types
grep({ pattern: ":\\s*(any|unknown)" })
```

### 5. Refactoring Workflow

```typescript
// 1. Plan the refactoring
write_todo({
  text: "Refactor authentication module\n- [ ] Find all auth-related files\n- [ ] List all auth functions\n- [ ] Update function signatures\n- [ ] Update all call sites\n- [ ] Run tests"
})

// 2. Find relevant files
glob({ pattern: "**/*auth*.ts" })

// 3. Search for specific patterns
grep({ pattern: "function authenticate" })

// 4. Read, modify, write
read_file({ path: "src/auth/login.ts" })
write_file({ path: "src/auth/login.ts", content: updatedContent })

// 5. Verify no breaking changes
grep({ pattern: "authenticate\\(" })
```

---

## Integration with System Prompt

The enhanced system prompt now includes guidance on when to use each tool:

- **glob** - When you need to find files by name/pattern
- **grep** - When you need to find content within files
- **read_file** - When you know the file path and need contents
- **write_file** - When you need to create or modify files
- **write_todo** - When you need to plan complex multi-step tasks

The agent is instructed to:
1. Use these tools strategically based on the task
2. Combine them in efficient workflows
3. Verify changes after writing files

---

## Performance Considerations

### grep
- Skips binary files automatically
- Limits results to prevent overwhelming output
- Skips common large directories (node_modules, etc.)
- Default limit: 100 matches

### glob
- Skips common large directories
- Limits results to prevent overwhelming output
- Default limit: 200 files
- Sorted output for consistency

### Best Practices
- Use specific patterns to reduce search space
- Set appropriate maxResults for large codebases
- Use path parameter to limit search scope
- Combine glob + read_file instead of reading everything

---

## Error Handling

All tools return a `ToolResult` with:
```typescript
{
  ok: boolean;      // Success/failure
  content: string;  // Human-readable result or error message
  data?: unknown;   // Structured data (for programmatic use)
}
```

**Common Errors**:
- Permission denied (file outside sandbox)
- File not found
- Path is a directory (when expecting file)
- File too large (exceeds sandbox limits)
- Invalid regex pattern (grep)
- Invalid glob pattern

---

## Examples in Practice

### Example 1: Find All Test Files and Check Coverage

**Agent Task**: "Check if all source files have corresponding test files"

**Agent Approach**:
```typescript
// 1. Plan the task
write_todo({
  text: "Check test coverage\n- [ ] Find all source files\n- [ ] Find all test files\n- [ ] Compare and identify missing tests"
})

// 2. Find source files
glob({ pattern: "src/**/*.ts", exclude: "**/*.test.ts" })
// Returns: 15 source files

// 3. Find test files
glob({ pattern: "src/**/*.test.ts" })
// Returns: 12 test files

// 4. Identify gaps
// Agent analyzes and reports: 3 files lack tests
```

### Example 2: Refactor Import Paths

**Agent Task**: "Update all imports from '@/utils' to '@/lib/utils'"

**Agent Approach**:
```typescript
// 1. Find all files with the old import
grep({ pattern: "from ['\"]@/utils", recursive: true })

// 2. For each file:
//    - Read file
//    - Replace import path
//    - Write updated content
read_file({ path: "src/components/Header.tsx" })
write_file({
  path: "src/components/Header.tsx",
  content: content.replace("from '@/utils'", "from '@/lib/utils'")
})

// 3. Verify
grep({ pattern: "from ['\"]@/utils" })
// Should return: No matches found
```

---

## Future Enhancements

Potential improvements:
- **append_file**: Append to file without overwriting
- **list_directory**: List directory contents (like ls)
- **file_info**: Get file metadata (size, modified date, permissions)
- **diff**: Compare two files
- **move_file**: Rename or move files
- **delete_file**: Remove files (with safety checks)

These would complement the existing tools and enable more sophisticated file operations.
