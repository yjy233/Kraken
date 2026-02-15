import type { ToolDefinition } from "../types";

export interface EditFileInput {
  path: string;

  // 模式 1: 搜索替换（最常用）
  search?: string;
  replace?: string;

  // 模式 2: 正则表达式替换
  pattern?: string;
  replacement?: string;

  // 模式 3: 行号范围替换
  startLine?: number;
  endLine?: number;
  newContent?: string;

  // 选项
  global?: boolean;        // 替换所有匹配（默认 true）
  caseInsensitive?: boolean; // 大小写不敏感（默认 false）
}

interface EditResult {
  success: boolean;
  originalContent: string;
  modifiedContent: string;
  matchCount: number;
  linesChanged: number[];
}

export function createEditFileTool(): ToolDefinition<EditFileInput> {
  return {
    name: "edit_file",
    description: "Edit a file by replacing specific content. Supports: 1) Simple text search/replace, 2) Regex pattern matching, 3) Line number-based editing. More efficient than read+write for partial modifications.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file to edit"
        },
        search: {
          type: "string",
          description: "Text to search for (Mode 1: simple string search)"
        },
        replace: {
          type: "string",
          description: "Text to replace with (for search mode)"
        },
        pattern: {
          type: "string",
          description: "Regex pattern to match (Mode 2: regex mode)"
        },
        replacement: {
          type: "string",
          description: "Replacement text (for regex mode, supports $1, $2 etc.)"
        },
        startLine: {
          type: "number",
          description: "Start line number (1-based) for line mode (Mode 3)"
        },
        endLine: {
          type: "number",
          description: "End line number (1-based) for line mode (Mode 3)"
        },
        newContent: {
          type: "string",
          description: "New content for the specified line range (Mode 3)"
        },
        global: {
          type: "boolean",
          description: "Replace all occurrences (default: true)"
        },
        caseInsensitive: {
          type: "boolean",
          description: "Case-insensitive search (default: false)"
        }
      },
      required: ["path"]
    },
    async run(input, context) {
      try {
        // Read original file
        const originalContent = await context.sandbox.readFile(input.path);
        let modifiedContent = originalContent;
        let matchCount = 0;
        const linesChanged: number[] = [];

        // Determine edit mode and apply changes
        if (input.search !== undefined && input.replace !== undefined) {
          // Mode 1: Simple search and replace
          const result = searchAndReplace(
            originalContent,
            input.search,
            input.replace,
            input.global ?? true,
            input.caseInsensitive ?? false
          );
          modifiedContent = result.content;
          matchCount = result.matchCount;
          linesChanged.push(...result.linesChanged);

        } else if (input.pattern !== undefined && input.replacement !== undefined) {
          // Mode 2: Regex pattern replacement
          const result = regexReplace(
            originalContent,
            input.pattern,
            input.replacement,
            input.global ?? true,
            input.caseInsensitive ?? false
          );
          modifiedContent = result.content;
          matchCount = result.matchCount;
          linesChanged.push(...result.linesChanged);

        } else if (input.startLine !== undefined && input.endLine !== undefined && input.newContent !== undefined) {
          // Mode 3: Line range replacement
          const result = replaceLineRange(
            originalContent,
            input.startLine,
            input.endLine,
            input.newContent
          );
          modifiedContent = result.content;
          matchCount = 1;
          linesChanged.push(...result.linesChanged);

        } else {
          return {
            ok: false,
            content: "edit_file error: Must specify either (search + replace), (pattern + replacement), or (startLine + endLine + newContent)"
          };
        }

        // Check if any changes were made
        if (modifiedContent === originalContent) {
          return {
            ok: false,
            content: `No matches found. File unchanged.`
          };
        }

        // Write modified content back to file
        await context.sandbox.writeFile(input.path, modifiedContent);

        // Calculate statistics
        const originalLines = originalContent.split("\n").length;
        const modifiedLines = modifiedContent.split("\n").length;
        const lineDiff = modifiedLines - originalLines;

        // Format result message
        let message = `File edited successfully: ${input.path}\n`;
        message += `- Matches: ${matchCount}\n`;
        message += `- Lines changed: ${linesChanged.length > 0 ? linesChanged.join(", ") : "N/A"}\n`;
        message += `- Original size: ${originalContent.length} bytes (${originalLines} lines)\n`;
        message += `- New size: ${modifiedContent.length} bytes (${modifiedLines} lines)`;
        if (lineDiff !== 0) {
          message += `\n- Line difference: ${lineDiff > 0 ? "+" : ""}${lineDiff}`;
        }

        return {
          ok: true,
          content: message,
          data: {
            matchCount,
            linesChanged,
            originalSize: originalContent.length,
            newSize: modifiedContent.length,
            lineDiff
          }
        };

      } catch (error) {
        return {
          ok: false,
          content: `edit_file error: ${(error as Error).message}`
        };
      }
    }
  };
}

/**
 * Mode 1: Simple search and replace
 */
function searchAndReplace(
  content: string,
  search: string,
  replace: string,
  global: boolean,
  caseInsensitive: boolean
): { content: string; matchCount: number; linesChanged: number[] } {
  const lines = content.split("\n");
  const linesChanged: number[] = [];
  let matchCount = 0;
  let totalMatches = 0;

  const modifiedLines = lines.map((line, index) => {
    const lineNumber = index + 1;
    let modifiedLine = line;
    let lineMatchCount = 0;

    if (global) {
      // Replace all occurrences in the line
      const searchPattern = caseInsensitive
        ? new RegExp(escapeRegex(search), "gi")
        : new RegExp(escapeRegex(search), "g");

      modifiedLine = line.replace(searchPattern, () => {
        lineMatchCount++;
        return replace;
      });
    } else {
      // Replace only first occurrence globally
      if (totalMatches === 0) {
        const searchPattern = caseInsensitive
          ? new RegExp(escapeRegex(search), "i")
          : new RegExp(escapeRegex(search));

        if (searchPattern.test(line)) {
          modifiedLine = line.replace(searchPattern, replace);
          lineMatchCount = 1;
          totalMatches = 1;
        }
      }
    }

    if (lineMatchCount > 0) {
      linesChanged.push(lineNumber);
      matchCount += lineMatchCount;
    }

    return modifiedLine;
  });

  return {
    content: modifiedLines.join("\n"),
    matchCount,
    linesChanged
  };
}

/**
 * Mode 2: Regex pattern replacement
 */
function regexReplace(
  content: string,
  pattern: string,
  replacement: string,
  global: boolean,
  caseInsensitive: boolean
): { content: string; matchCount: number; linesChanged: number[] } {
  const lines = content.split("\n");
  const linesChanged: number[] = [];
  let matchCount = 0;

  try {
    const flags = (global ? "g" : "") + (caseInsensitive ? "i" : "");
    const regex = new RegExp(pattern, flags);

    const modifiedLines = lines.map((line, index) => {
      const lineNumber = index + 1;
      const matches = line.match(regex);

      if (matches) {
        linesChanged.push(lineNumber);
        matchCount += matches.length;
        return line.replace(regex, replacement);
      }

      return line;
    });

    return {
      content: modifiedLines.join("\n"),
      matchCount,
      linesChanged
    };
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${(error as Error).message}`);
  }
}

/**
 * Mode 3: Replace line range
 */
function replaceLineRange(
  content: string,
  startLine: number,
  endLine: number,
  newContent: string
): { content: string; matchCount: number; linesChanged: number[] } {
  const lines = content.split("\n");
  const totalLines = lines.length;

  // Validate line numbers (1-based)
  if (startLine < 1 || endLine < 1) {
    throw new Error("Line numbers must be >= 1");
  }
  if (startLine > totalLines || endLine > totalLines) {
    throw new Error(`Line numbers out of range (file has ${totalLines} lines)`);
  }
  if (startLine > endLine) {
    throw new Error("startLine must be <= endLine");
  }

  // Convert to 0-based indices
  const startIdx = startLine - 1;
  const endIdx = endLine - 1;

  // Build list of changed lines
  const linesChanged: number[] = [];
  for (let i = startLine; i <= endLine; i++) {
    linesChanged.push(i);
  }

  // Replace the range
  const before = lines.slice(0, startIdx);
  const after = lines.slice(endIdx + 1);
  const newLines = newContent.split("\n");

  const modifiedLines = [...before, ...newLines, ...after];

  return {
    content: modifiedLines.join("\n"),
    matchCount: 1,
    linesChanged
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
