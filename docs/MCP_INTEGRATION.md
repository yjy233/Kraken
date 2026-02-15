# MCP (Model Context Protocol) Integration

Kraken now supports MCP servers! You can connect to any MCP-compatible server and use its tools in your AI workflows.

## What is MCP?

MCP (Model Context Protocol) is an open standard for connecting AI assistants to external tools and data sources. It allows Kraken to interact with:

- File systems
- Databases
- APIs
- Web services
- And more!

## Configuration

Add MCP servers to your `Kraken.json`:

```json
{
  "mcp": {
    "enabled": true,
    "servers": [
      {
        "name": "filesystem",
        "description": "File system operations",
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/yourname/Documents"],
        "enabled": true
      }
    ]
  }
}
```

## Available MCP Servers

### Official Servers

1. **Filesystem** - File operations
   ```json
   {
     "name": "filesystem",
     "transport": "stdio",
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
     "enabled": true
   }
   ```

2. **SQLite** - Database queries
   ```json
   {
     "name": "sqlite",
     "transport": "stdio",
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"],
     "enabled": true
   }
   ```

3. **Brave Search** - Web search
   ```json
   {
     "name": "brave-search",
     "transport": "stdio",
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-brave-search"],
     "env": {
       "BRAVE_API_KEY": "your-api-key-here"
     },
     "enabled": true
   }
   ```

4. **GitHub** - GitHub operations
   ```json
   {
     "name": "github",
     "transport": "stdio",
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-github"],
     "env": {
       "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
     },
     "enabled": true
   }
   ```

5. **Google Drive** - Google Drive access
   ```json
   {
     "name": "gdrive",
     "transport": "stdio",
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-gdrive"],
     "enabled": true
   }
   ```

### Custom Servers

You can use any MCP-compatible server:

```json
{
  "name": "my-custom-server",
  "transport": "stdio",
  "command": "/path/to/my-server",
  "args": ["--option", "value"],
  "env": {
    "API_KEY": "secret"
  },
  "enabled": true
}
```

## Tool Naming

MCP tools are prefixed with the server name to avoid conflicts:

- `filesystem__read_file` - Read file from filesystem server
- `sqlite__query` - Query from SQLite server
- `brave-search__search` - Search using Brave

## Example Usage

Once configured, you can use MCP tools naturally in conversations:

```
User: Can you search for "TypeScript tutorials" using Brave?

Agent: I'll use the brave-search MCP server...
[Calls brave-search__search tool]
```

## Debugging

Enable debug logs to see MCP communication:

```json
{
  "logging": {
    "level": "debug"
  }
}
```

You'll see logs like:
```
[MCP Manager] Connecting to server: filesystem
[MCP filesystem] Connected to filesystem-server v1.0.0
[MCP filesystem] Loaded 5 tools
```

## Security Notes

- MCP servers run as child processes
- They have access to specified directories/resources only
- Use environment variables for sensitive data (API keys)
- Review server permissions before enabling

## Creating Your Own MCP Server

See the [MCP SDK documentation](https://github.com/modelcontextprotocol) to create custom servers.

## Troubleshooting

**Server won't connect:**
- Check command path is correct
- Verify required dependencies are installed
- Check environment variables are set
- Review server logs in stderr

**Tools not appearing:**
- Ensure `mcp.enabled: true`
- Check server's `enabled: true`
- Verify server initialized successfully
- Look for errors in console

## More Information

- [MCP Specification](https://modelcontextprotocol.io)
- [Official Servers](https://github.com/modelcontextprotocol/servers)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
