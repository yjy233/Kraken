import type { ToolDefinition } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

export interface GrepInput {
  pattern: string;
  path?: string;
  recursive?: boolean;
  ignoreCase?: boolean;
  maxResults?: number;
}

interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export function createGrepTool(): ToolDefinition<GrepInput> {
  return {
    name: "grep",
    description: "Search for text patterns in files. Returns matching lines with file paths and line numbers.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Text pattern or regular expression to search for."
        },
        path: {
          type: "string",
          description: "File or directory path to search in. Defaults to sandbox root."
        },
        recursive: {
          type: "boolean",
          description: "If true, search recursively in directories. Default: true."
        },
        ignoreCase: {
          type: "boolean",
          description: "If true, perform case-insensitive search. Default: false."
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return. Default: 100."
        }
      },
      required: ["pattern"]
    },
    async run(input, context) {
      try {
        const searchPath = input.path ?? ".";
        const recursive = input.recursive ?? true;
        const maxResults = input.maxResults ?? 100;

        // Create regex from pattern
        const flags = input.ignoreCase ? "gi" : "g";
        const regex = new RegExp(input.pattern, flags);

        const matches: GrepMatch[] = [];

        // Resolve path through sandbox
        const fullPath = await resolvePathInSandbox(searchPath, context.sandbox);

        // Check if path exists
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await searchDirectory(fullPath, regex, matches, recursive, maxResults);
        } else {
          await searchFile(fullPath, fullPath, regex, matches, maxResults);
        }

        if (matches.length === 0) {
          return { ok: true, content: `No matches found for pattern: ${input.pattern}` };
        }

        // Format results
        const resultText = matches.map(m =>
          `${m.file}:${m.line}: ${m.content.trim()}`
        ).join("\n");

        const summary = matches.length >= maxResults
          ? `Found ${matches.length}+ matches (limit reached):`
          : `Found ${matches.length} match(es):`;

        return {
          ok: true,
          content: `${summary}\n\n${resultText}`,
          data: { matches }
        };
      } catch (error) {
        return { ok: false, content: `grep error: ${(error as Error).message}` };
      }
    }
  };
}

async function resolvePathInSandbox(searchPath: string, sandbox: any): Promise<string> {
  // This is a simplified version - in production, use sandbox's path resolution
  if (path.isAbsolute(searchPath)) {
    return searchPath;
  }
  // Assume sandbox has a root or working directory
  const root = process.cwd();
  return path.resolve(root, searchPath);
}

async function searchDirectory(
  dirPath: string,
  regex: RegExp,
  matches: GrepMatch[],
  recursive: boolean,
  maxResults: number
): Promise<void> {
  if (matches.length >= maxResults) return;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= maxResults) break;

      const fullPath = path.join(dirPath, entry.name);

      // Skip common directories to avoid
      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name)) continue;
        if (recursive) {
          await searchDirectory(fullPath, regex, matches, recursive, maxResults);
        }
      } else if (entry.isFile()) {
        if (shouldSearchFile(entry.name)) {
          await searchFile(fullPath, fullPath, regex, matches, maxResults);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
    return;
  }
}

async function searchFile(
  filePath: string,
  displayPath: string,
  regex: RegExp,
  matches: GrepMatch[],
  maxResults: number
): Promise<void> {
  if (matches.length >= maxResults) return;

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
      const line = lines[i];
      if (regex.test(line)) {
        matches.push({
          file: displayPath,
          line: i + 1,
          content: line
        });
        // Reset regex lastIndex for next line
        regex.lastIndex = 0;
      }
    }
  } catch (error) {
    // Skip files we can't read or that aren't text
    return;
  }
}

function shouldSkipDirectory(name: string): boolean {
  const skipDirs = ["node_modules", ".git", "dist", "build", ".next", "coverage", ".cache"];
  return skipDirs.includes(name) || name.startsWith(".");
}

function shouldSearchFile(name: string): boolean {
  // Only search text files
  const textExtensions = [
    ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt",
    ".yml", ".yaml", ".xml", ".html", ".css", ".scss",
    ".sh", ".bash", ".py", ".rb", ".go", ".rs", ".c", ".cpp",
    ".h", ".hpp", ".java", ".cs", ".php", ".sql"
  ];

  return textExtensions.some(ext => name.endsWith(ext));
}
