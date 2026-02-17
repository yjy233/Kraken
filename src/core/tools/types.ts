import type { Sandbox } from "../sandbox/Sandbox";
import type { Logger } from "../utils/logger";
import type { KrakenConfig } from "../config/loadConfig";

export interface ToolContext {
  sandbox: Sandbox;
  sessionId: string;
  logger: Logger;
  config?: KrakenConfig;
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
