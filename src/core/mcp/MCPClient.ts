/**
 * MCP Client
 *
 * Connects to MCP servers via stdio transport
 */

import { spawn, ChildProcess } from "child_process";
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

export class MCPClient {
  private serverConfig: MCPServerConfig;
  private process?: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<
    number | string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private buffer = "";
  private initialized = false;
  private tools: MCPTool[] = [];

  constructor(config: MCPServerConfig) {
    this.serverConfig = config;
  }

  /**
   * Start the MCP server and connect
   */
  async connect(): Promise<void> {
    if (this.serverConfig.transport !== "stdio") {
      throw new Error("Only stdio transport is currently supported");
    }

    if (!this.serverConfig.command) {
      throw new Error("Command is required for stdio transport");
    }

    // Spawn the MCP server process
    this.process = spawn(this.serverConfig.command, this.serverConfig.args || [], {
      env: { ...process.env, ...this.serverConfig.env },
      stdio: ["pipe", "pipe", "pipe"]
    });

    // Handle stdout (responses)
    this.process.stdout?.on("data", (data: Buffer) => {
      this.handleData(data.toString());
    });

    // Handle stderr (logs)
    this.process.stderr?.on("data", (data: Buffer) => {
      console.error(`[MCP ${this.serverConfig.name}] ${data.toString()}`);
    });

    // Handle process exit
    this.process.on("exit", (code) => {
      console.log(`[MCP ${this.serverConfig.name}] Process exited with code ${code}`);
      this.initialized = false;
    });

    // Initialize connection
    await this.initialize();

    // List available tools
    await this.listTools();
  }

  /**
   * Handle incoming data from server
   */
  private handleData(data: string): void {
    this.buffer += data;

    // Process complete JSON-RPC messages
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message: MCPResponse = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        console.error(`[MCP ${this.serverConfig.name}] Failed to parse message:`, error);
      }
    }
  }

  /**
   * Handle a parsed JSON-RPC message
   */
  private handleMessage(message: MCPResponse): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      console.warn(`[MCP ${this.serverConfig.name}] Received response for unknown request:`, message.id);
      return;
    }

    this.pendingRequests.delete(message.id);

    if (message.error) {
      pending.reject(new Error(`${message.error.message} (code: ${message.error.code})`));
    } else {
      pending.resolve(message.result);
    }
  }

  /**
   * Send a JSON-RPC request to the server
   */
  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error("MCP server not connected");
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Send request as JSON line
      this.process!.stdin!.write(JSON.stringify(request) + "\n");

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
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
      `[MCP ${this.serverConfig.name}] Connected to ${result.serverInfo.name} v${result.serverInfo.version}`
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
    console.log(`[MCP ${this.serverConfig.name}] Loaded ${this.tools.length} tools`);
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
    return this.initialized && this.process !== undefined;
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
      this.initialized = false;
      this.tools = [];
    }
  }
}
