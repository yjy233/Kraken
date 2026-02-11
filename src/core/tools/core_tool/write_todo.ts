import type { ToolDefinition } from "../types";

export interface WriteTodoInput {
  text: string;
  path?: string;
}

export function createWriteTodoTool(): ToolDefinition<WriteTodoInput> {
  return {
    name: "write_todo",
    description: "Append a line to a todo list file in the sandbox.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Todo text to append." },
        path: { type: "string", description: "Optional path to todo file." }
      },
      required: ["text"]
    },
    async run(input, context) {
      const targetPath = input.path ?? "data/todo.md";
      try {
        await context.sandbox.appendFile(targetPath, `- ${input.text}\n`);
        return { ok: true, content: `Todo appended to ${targetPath}` };
      } catch (error) {
        return { ok: false, content: `write_todo error: ${(error as Error).message}` };
      }
    }
  };
}
