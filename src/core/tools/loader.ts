/**
 * Tool initialization helper
 *
 * Loads builtin tools and MCP tools
 */

import type { ToolDefinition } from "../tools/types";
import { createBuiltinTools } from "../tools/core_tool";
import { MCPManager } from "../mcp/MCPManager";
import type { MCPConfig } from "../../config/types";

export interface ToolLoaderOptions {
  mcpConfig?: MCPConfig;
}

/**
 * Load all tools (builtin + MCP)
 */
export async function loadAllTools(options: ToolLoaderOptions = {}): Promise<{
  tools: ToolDefinition[];
  mcpManager?: MCPManager;
}> {
  // Always load builtin tools
  const tools: ToolDefinition[] = createBuiltinTools();

  // Load MCP tools if enabled
  let mcpManager: MCPManager | undefined;

  if (options.mcpConfig?.enabled && options.mcpConfig.servers.length > 0) {
    try {
      console.log("[Tool Loader] Initializing MCP servers...");
      mcpManager = new MCPManager(options.mcpConfig.servers);
      await mcpManager.connectAll();

      const mcpTools = mcpManager.getAllTools();
      console.log(`[Tool Loader] Loaded ${mcpTools.length} MCP tools`);

      tools.push(...mcpTools);
    } catch (error) {
      console.error("[Tool Loader] Failed to load MCP tools:", error);
    }
  }

  console.log(`[Tool Loader] Total tools loaded: ${tools.length}`);

  return { tools, mcpManager };
}
