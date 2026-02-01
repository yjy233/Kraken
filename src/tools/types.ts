import type { Sandbox } from "../sandbox/Sandbox";
import type { Logger } from "../utils/logger";

export interface ToolContext {
  sandbox: Sandbox;
  sessionId: string;
  logger: Logger;
}

export interface ToolDefinition<Input = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (input: Input, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolResult {
  ok: boolean;
  content: string;
  data?: unknown;
}
