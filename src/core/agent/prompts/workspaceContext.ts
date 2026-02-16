/**
 * Workspace context builder
 *
 * Generates a context message containing the workspace directory and file tree
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface WorkspaceContextOptions {
  /** Working directory path */
  workspaceRoot: string;

  /** Maximum depth for directory traversal (default: 2) */
  maxDepth?: number;

  /** Maximum number of files to include (default: 100) */
  maxFiles?: number;

  /** Patterns to ignore (e.g., node_modules, .git) */
  ignorePatterns?: string[];
}

interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  depth: number;
}

/**
 * Build workspace context message for the model
 * Includes working directory and file tree (limited to 2 levels, max 100 files)
 */
export async function buildWorkspaceContext(options: WorkspaceContextOptions): Promise<string> {
  const {
    workspaceRoot,
    maxDepth = 2,
    maxFiles = 100,
    ignorePatterns = ["node_modules", ".git", ".claude", "dist", "build", ".next"]
  } = options;

  try {
    const fileTree = await scanDirectory(workspaceRoot, {
      maxDepth,
      maxFiles,
      ignorePatterns,
      currentDepth: 0,
      baseDir: workspaceRoot
    });

    return formatWorkspaceContext(workspaceRoot, fileTree);
  } catch (error) {
    // If we can't read the directory, return basic info
    return `## Workspace Information

**Working Directory/工作目录/workspace**: \`${workspaceRoot}\`

(Unable to read directory contents: ${error instanceof Error ? error.message : String(error)})`;
  }
}

/**
 * Scan directory recursively with depth and file limits
 */
async function scanDirectory(
  dirPath: string,
  options: {
    maxDepth: number;
    maxFiles: number;
    ignorePatterns: string[];
    currentDepth: number;
    baseDir: string;
    fileCount?: { value: number };
  }
): Promise<FileTreeEntry[]> {
  const { maxDepth, maxFiles, ignorePatterns, currentDepth, baseDir } = options;
  const fileCount = options.fileCount || { value: 0 };

  // Stop if we've reached max depth
  if (currentDepth >= maxDepth) {
    return [];
  }

  // Stop if we've reached max files
  if (fileCount.value >= maxFiles) {
    return [];
  }

  const entries: FileTreeEntry[] = [];

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      // Stop if we've hit the file limit
      if (fileCount.value >= maxFiles) {
        break;
      }

      // Skip ignored patterns
      if (shouldIgnore(item.name, ignorePatterns)) {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);
      const relativePath = path.relative(baseDir, fullPath);

      const entry: FileTreeEntry = {
        name: item.name,
        path: relativePath,
        type: item.isDirectory() ? "directory" : "file",
        depth: currentDepth
      };

      entries.push(entry);
      fileCount.value++;

      // Recursively scan subdirectories
      if (item.isDirectory() && currentDepth + 1 < maxDepth) {
        const subEntries = await scanDirectory(fullPath, {
          ...options,
          currentDepth: currentDepth + 1,
          fileCount
        });
        entries.push(...subEntries);
      }
    }
  } catch (error) {
    // Silently skip directories we can't read
  }

  return entries;
}

/**
 * Check if a file/directory should be ignored
 */
function shouldIgnore(name: string, ignorePatterns: string[]): boolean {
  // Always ignore hidden files/directories starting with .
  if (name.startsWith(".")) {
    return true;
  }

  return ignorePatterns.some((pattern) => {
    if (pattern.includes("*")) {
      // Simple glob pattern matching
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(name);
    }
    return name === pattern;
  });
}

/**
 * Format workspace context as a readable message
 */
function formatWorkspaceContext(workspaceRoot: string, entries: FileTreeEntry[]): string {
  const tree = formatFileTree(entries);
  const fileCount = entries.filter((e) => e.type === "file").length;
  const dirCount = entries.filter((e) => e.type === "directory").length;

  return `## Workspace Information

**Working Directory**: \`${workspaceRoot}\`

**Directory Structure** (${fileCount} files, ${dirCount} directories):

\`\`\`
${tree}
\`\`\`

You can use tools like \`read_file\`, \`list_directory\`, \`grep\`, and \`glob\` to explore the workspace further.`;
}

/**
 * Format file tree entries into a tree structure
 */
function formatFileTree(entries: FileTreeEntry[]): string {
  if (entries.length === 0) {
    return "(empty directory)";
  }

  const lines: string[] = [];
  const sorted = [...entries].sort((a, b) => {
    // Sort directories first, then by name
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const indent = "  ".repeat(entry.depth);
    const icon = entry.type === "directory" ? "📁" : "📄";
    const displayName = entry.depth === 0 ? entry.name : path.basename(entry.path);

    lines.push(`${indent}${icon} ${displayName}`);
  }

  return lines.join("\n");
}
