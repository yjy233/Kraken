/**
 * MCP Integration Example
 *
 * This example shows how to use MCP servers with Kraken
 */

import { MCPManager } from "./src/core/mcp/MCPManager";
import type { MCPServerConfig } from "./src/core/mcp/types";

async function main() {
  // Configure MCP servers
  const mcpServers: MCPServerConfig[] = [
    {
      name: "filesystem",
      description: "File system operations",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", process.cwd()],
      enabled: true
    }
  ];

  // Create MCP manager
  const mcpManager = new MCPManager(mcpServers);

  try {
    // Connect to all servers
    console.log("Connecting to MCP servers...");
    await mcpManager.connectAll();

    // Get list of connected servers
    const connected = mcpManager.getConnectedServers();
    console.log("Connected servers:", connected);

    // Get all available tools
    const tools = mcpManager.getAllTools();
    console.log(`\nAvailable tools (${tools.length}):`);
    tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Example: Call a tool
    const fsClient = mcpManager.getClient("filesystem");
    if (fsClient) {
      console.log("\nCalling filesystem__list_directory tool...");
      const result = await fsClient.callTool("list_directory", {
        path: "."
      });

      console.log("Result:", JSON.stringify(result, null, 2));
    }

    // Cleanup
    await mcpManager.disconnectAll();
    console.log("\nDisconnected from all servers");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
