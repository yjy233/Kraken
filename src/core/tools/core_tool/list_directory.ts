import type { ToolDefinition } from "../types";

export interface ListDirectoryInput {
  path: string;
}

export function createListDirectoryTool(): ToolDefinition<ListDirectoryInput> {
  return {
    name: "list_directory",
    description: "List contents of a directory in the sandbox. Shows files and subdirectories with [FILE] or [DIR] prefix.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the directory. Can be relative to sandbox root or absolute path within allowlist."
        }
      },
      required: ["path"]
    },
    async run(input, context) {
      try {
        const entries = await context.sandbox.listDirectory(input.path);
        const content = entries.length > 0
          ? entries.join("\n")
          : "(empty directory)";
        return { ok: true, content };
      } catch (error) {
        return { ok: false, content: `list_directory error: ${(error as Error).message}` };
      }
    }
  };
}
