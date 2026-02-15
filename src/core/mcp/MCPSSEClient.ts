/**
 * MCP SSE Client
 *
 * Connects to MCP servers via SSE (Server-Sent Events) / HTTP Stream transport
 */

import type {
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MCPInitializeResult,
  MCPToolsListResult,
  MCPCallToolRequest,
  MCPCallToolResult,
  MCPTool
} from "./types";

export class MCPSSEClient {
  private serverConfig: MCPServerConfig;
  private requestId = 0;
  private pendingRequests = new Map<
    number | string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private initialized = false;
  private tools: MCPTool[] = [];
  private sessionId?: string;
  private abortController?: AbortController;

  constructor(config: MCPServerConfig) {
    this.serverConfig = config;
  }

  /**
   * Connect to the MCP SSE server
   */
  async connect(): Promise<void> {
    if (!this.serverConfig.url) {
      throw new Error("URL is required for SSE transport");
    }

    // Initialize connection
    await this.initialize();

    // List available tools
    await this.listTools();

    console.log(`[MCP SSE ${this.serverConfig.name}] Connected to ${this.serverConfig.url}`);
  }

  /**
   * Send HTTP request to the server
   */
  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.serverConfig.url) {
      throw new Error("MCP SSE server URL not configured");
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    const url = new URL(this.serverConfig.url);

    // Add session ID if available
    if (this.sessionId) {
      url.searchParams.set("sessionId", this.sessionId);
    }

    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      try {
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.getAuthHeaders()
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: MCPResponse = await response.json();

        clearTimeout(timeout);

        if (data.error) {
          reject(new Error(`${data.error.message} (code: ${data.error.code})`));
        } else {
          // Store session ID from response if provided
          if (method === "initialize" && data.result) {
            const result = data.result as any;
            if (result.sessionId) {
              this.sessionId = result.sessionId;
            }
          }
          resolve(data.result);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add API key if provided in env
    if (this.serverConfig.env?.API_KEY) {
      headers["Authorization"] = `Bearer ${this.serverConfig.env.API_KEY}`;
    }

    // Add custom headers from env
    if (this.serverConfig.env) {
      Object.entries(this.serverConfig.env).forEach(([key, value]) => {
        if (key.startsWith("HEADER_")) {
          const headerName = key.replace("HEADER_", "").replace(/_/g, "-");
          headers[headerName] = value;
        }
      });
    }

    return headers;
  }

  /**
   * Initialize the MCP connection
   */
  private async initialize(): Promise<void> {
    const result = (await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      clientInfo: {
        name: "kraken-ai-assistant",
        version: "0.1.0"
      },
      capabilities: {
        tools: {}
      }
    })) as MCPInitializeResult;

    console.log(
      `[MCP SSE ${this.serverConfig.name}] Connected to ${result.serverInfo.name} v${result.serverInfo.version}`
    );

    // Send initialized notification
    await this.sendRequest("notifications/initialized");

    this.initialized = true;
  }

  /**
   * List available tools from the server
   */
  private async listTools(): Promise<void> {
    const result = (await this.sendRequest("tools/list")) as MCPToolsListResult;
    this.tools = result.tools || [];
    console.log(`[MCP SSE ${this.serverConfig.name}] Loaded ${this.tools.length} tools`);
  }

  /**
   * Get list of available tools
   */
  getTools(): MCPTool[] {
    return this.tools;
  }

  /**
   * Call a tool on the server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPCallToolResult> {
    const request: MCPCallToolRequest = {
      name,
      arguments: args
    };

    const result = (await this.sendRequest("tools/call", request)) as MCPCallToolResult;
    return result;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.initialized;
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
    this.initialized = false;
    this.tools = [];
    this.sessionId = undefined;
  }
}
