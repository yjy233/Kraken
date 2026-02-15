import type { ToolDefinition } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

export interface GlobInput {
  pattern: string;
  path?: string;
  maxResults?: number;
}

interface GlobMatch {
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
}

export function createGlobTool(): ToolDefinition<GlobInput> {
  return {
    name: "glob",
    description: "Find files and directories matching a pattern. Supports wildcards: * (any chars), ** (recursive), ? (single char).",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Glob pattern to match files (e.g., '**/*.ts', 'src/**/*.json', '*.md')"
        },
        path: {
          type: "string",
          description: "Base directory to search in. Defaults to sandbox root."
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return. Default: 200."
        }
      },
      required: ["pattern"]
    },
    async run(input, context) {
      try {
        const searchPath = input.path ?? ".";
        const maxResults = input.maxResults ?? 200;

        const fullPath = await resolvePathInSandbox(searchPath);

        const matches: GlobMatch[] = [];
        const regex = globToRegex(input.pattern);

        await findMatches(fullPath, "", regex, matches, maxResults);

        if (matches.length === 0) {
          return { ok: true, content: `No files found matching pattern: ${input.pattern}` };
        }

        // Sort by path
        matches.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

        // Format results
        const resultText = matches.map(m => {
          const type = m.isDirectory ? "DIR " : "FILE";
          const size = m.size ? ` (${formatSize(m.size)})` : "";
          return `${type} ${m.relativePath}${size}`;
        }).join("\n");

        const summary = matches.length >= maxResults
          ? `Found ${matches.length}+ matches (limit reached):`
          : `Found ${matches.length} match(es):`;

        return {
          ok: true,
          content: `${summary}\n\n${resultText}`,
          data: { matches }
        };
      } catch (error) {
        return { ok: false, content: `glob error: ${(error as Error).message}` };
      }
    }
  };
}

async function resolvePathInSandbox(searchPath: string): Promise<string> {
  if (path.isAbsolute(searchPath)) {
    return searchPath;
  }
  return path.resolve(process.cwd(), searchPath);
}

function globToRegex(pattern: string): RegExp {
  // Convert glob pattern to regex
  // Handle: * (any chars except /), ** (any chars including /), ? (single char)

  let regexPattern = pattern
    // Escape special regex chars except our wildcards
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    // Handle **/ (match any path including subdirs)
    .replace(/\*\*\//g, "(?:.*/)?")
    // Handle /** (match any remaining path)
    .replace(/\/\*\*/g, "(?:/.*)?")
    // Handle ** at start
    .replace(/^\*\*/, ".*")
    // Handle * (any chars except /)
    .replace(/\*/g, "[^/]*")
    // Handle ? (single char except /)
    .replace(/\?/g, "[^/]");

  return new RegExp(`^${regexPattern}$`);
}

async function findMatches(
  basePath: string,
  relativePath: string,
  regex: RegExp,
  matches: GlobMatch[],
  maxResults: number
): Promise<void> {
  if (matches.length >= maxResults) return;

  try {
    const fullPath = path.join(basePath, relativePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= maxResults) break;

      // Skip common directories
      if (entry.isDirectory() && shouldSkipDirectory(entry.name)) {
        continue;
      }

      const entryRelativePath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

      const entryFullPath = path.join(fullPath, entry.name);

      // Check if this entry matches the pattern
      if (regex.test(entryRelativePath)) {
        let size: number | undefined;

        if (entry.isFile()) {
          try {
            const stats = await fs.stat(entryFullPath);
            size = stats.size;
          } catch {
            // Ignore stat errors
          }
        }

        matches.push({
          path: entryFullPath,
          relativePath: entryRelativePath,
          isDirectory: entry.isDirectory(),
          size
        });
      }

      // Recurse into directories
      if (entry.isDirectory()) {
        await findMatches(basePath, entryRelativePath, regex, matches, maxResults);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    return;
  }
}

function shouldSkipDirectory(name: string): boolean {
  const skipDirs = ["node_modules", ".git", "dist", "build", ".next", "coverage", ".cache"];
  return skipDirs.includes(name);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
