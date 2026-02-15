/**
 * MCP Manager
 *
 * Manages multiple MCP server connections
 */

import type { ToolDefinition } from "../tools/types";
import { MCPClient } from "./MCPClient";
import { MCPSSEClient } from "./MCPSSEClient";
import { convertAllMCPTools } from "./adapter";
import type { MCPServerConfig } from "./types";

/**
 * Union type for MCP clients (stdio or SSE)
 */
type MCPClientInstance = MCPClient | MCPSSEClient;

/**
 *
 * MCPManager is responsible for managing multiple MCP server connections, retrieving tools from them, and providing a unified interface for the rest of the application to interact with these servers.
 */
export class MCPManager {
  private clients = new Map<string, MCPClientInstance>();
  private configs: MCPServerConfig[];

  constructor(configs: MCPServerConfig[]) {
    this.configs = configs.filter((c) => c.enabled);
  }

  /**
   * Connect to all configured MCP servers
   */
  async connectAll(): Promise<void> {
    const promises = this.configs.map(async (config) => {
      try {
        console.log(`[MCP Manager] Connecting to server: ${config.name} (${config.transport})`);

        // Create appropriate client based on transport type
        const client = config.transport === "sse"
          ? new MCPSSEClient(config)
          : new MCPClient(config);

        await client.connect();
        this.clients.set(config.name, client);
        console.log(`[MCP Manager] Successfully connected to: ${config.name}`);
      } catch (error) {
        console.error(`[MCP Manager] Failed to connect to ${config.name}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): ToolDefinition[] {
    const allTools: ToolDefinition[] = [];

    for (const [serverName, client] of this.clients.entries()) {
      if (client.isConnected()) {
        const tools = convertAllMCPTools(client, serverName);
        allTools.push(...tools);
      }
    }

    return allTools;
  }

  /**
   * Get a specific client by server name
   */
  getClient(serverName: string): MCPClientInstance | undefined {
    return this.clients.get(serverName);
  }

  /**
   * Get list of connected server names
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.entries())
      .filter(([_, client]) => client.isConnected())
      .map(([name]) => name);
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.values()).map((client) => client.disconnect());
    await Promise.all(promises);
    this.clients.clear();
  }

  /**
   * Disconnect from a specific server
   */
  async disconnect(serverName: string): Promise<void> {
    const client = this.clients.get(serverName);
    if (client) {
      await client.disconnect();
      this.clients.delete(serverName);
    }
  }
}
