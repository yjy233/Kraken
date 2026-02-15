/**
 * MCP (Model Context Protocol) Types
 *
 * Based on MCP specification
 * @see https://modelcontextprotocol.io
 */

/**
 * MCP Transport types
 */
export type MCPTransport = "stdio" | "sse";

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  /** Server name/identifier */
  name: string;

  /** Server description */
  description?: string;

  /** Transport type */
  transport: MCPTransport;

  /** Command to start the server (for stdio) */
  command?: string;

  /** Arguments for the command (for stdio) */
  args?: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** Server URL (for SSE) */
  url?: string;

  /** Enable this server */
  enabled: boolean;
}

/**
 * MCP Tool Schema (JSON Schema)
 */
export interface MCPToolSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: MCPToolSchema;
}

/**
 * MCP Request/Response types
 */
export interface MCPRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP Initialize response
 */
export interface MCPInitializeResult {
  protocolVersion: string;
  serverInfo: {
    name: string;
    version: string;
  };
  capabilities: {
    tools?: Record<string, unknown>;
    resources?: Record<string, unknown>;
    prompts?: Record<string, unknown>;
  };
}

/**
 * MCP Tools list response
 */
export interface MCPToolsListResult {
  tools: MCPTool[];
}

/**
 * MCP Tool call request
 */
export interface MCPCallToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * MCP Tool call response
 */
export interface MCPCallToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
}
