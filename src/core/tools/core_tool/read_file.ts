import type { ToolDefinition } from "../types";

export interface ReadFileInput {
  path: string;
}

export function createReadFileTool(): ToolDefinition<ReadFileInput> {
  return {
    name: "read_file",
    description: "Read a file from the sandbox.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path relative to sandbox root or absolute path within allowlist."
        }
      },
      required: ["path"]
    },
    async run(input, context) {
      try {
        const content = await context.sandbox.readFile(input.path);
        return { ok: true, content };
      } catch (error) {
        return { ok: false, content: `read_file error: ${(error as Error).message}` };
      }
    }
  };
}
