import type { ToolDefinition } from "../types";

export interface WriteFileInput {
  path: string;
  content: string;
}

export function createWriteFileTool(): ToolDefinition<WriteFileInput> {
  return {
    name: "write_file",
    description: "Write content to a file in the sandbox, creating or overwriting it.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path relative to sandbox root or absolute path within allowlist."
        },
        content: {
          type: "string",
          description: "Content to write to the file."
        }
      },
      required: ["path", "content"]
    },
    async run(input, context) {
      try {
        await context.sandbox.writeFile(input.path, input.content);
        return { ok: true, content: `File written to ${input.path} (${input.content.length} bytes)` };
      } catch (error) {
        return { ok: false, content: `write_file error: ${(error as Error).message}` };
      }
    }
  };
}
