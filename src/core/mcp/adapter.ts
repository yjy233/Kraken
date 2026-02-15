/**
 * MCP Tool Adapter
 *
 * Converts MCP tools to Kraken ToolDefinition format
 */

import type { ToolDefinition, ToolContext, ToolResult } from "../tools/types";
import type { MCPClient } from "./MCPClient";
import type { MCPSSEClient } from "./MCPSSEClient";
import type { MCPTool } from "./types";

/**
 * Common interface for MCP clients
 */
type MCPClientInstance = MCPClient | MCPSSEClient;

/**
 * Convert MCP tool to Kraken ToolDefinition
 */
export function convertMCPToolToKraken(
  mcpTool: MCPTool,
  client: MCPClientInstance,
  serverName: string
): ToolDefinition {
  return {
    name: `${serverName}__${mcpTool.name}`,
    description: `[MCP:${serverName}] ${mcpTool.description}`,
    inputSchema: mcpTool.inputSchema as Record<string, unknown>,

    async run(input: unknown, context: ToolContext): Promise<ToolResult> {
      try {
        context.logger.info(`Calling MCP tool: ${mcpTool.name} on server ${serverName}`);

        // Call the MCP tool
        const result = await client.callTool(mcpTool.name, input as Record<string, unknown>);

        // Handle error response
        if (result.isError) {
          const errorText = result.content
            .map((c) => c.text || "")
            .join("\n");
          return {
            ok: false,
            content: errorText
          };
        }

        // Extract text content from response
        const textContent = result.content
          .filter((c) => c.type === "text")
          .map((c) => c.text || "")
          .join("\n");

        return {
          ok: true,
          content: textContent,
          data: result
        };
      } catch (error) {
        context.logger.error(`MCP tool call failed: ${error}`);
        return {
          ok: false,
          content: `Error calling MCP tool: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  };
}

/**
 * Convert all tools from an MCP client
 */
export function convertAllMCPTools(client: MCPClientInstance, serverName: string): ToolDefinition[] {
  const mcpTools = client.getTools();
  return mcpTools.map((tool) => convertMCPToolToKraken(tool, client, serverName));
}
