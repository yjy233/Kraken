# MCP 快速开始

## 什么是 MCP？

MCP (Model Context Protocol) 是一个开放标准，允许 AI 助手连接到外部工具和数据源。通过 MCP，Kraken 可以访问：

- 文件系统
- 数据库
- API 服务
- 网络搜索
- 更多...

## 快速配置

### 1. 启用 MCP

在 `.Kraken/Kraken.json` 中添加：

```json
{
  "mcp": {
    "enabled": true,
    "servers": [
      {
        "name": "filesystem",
        "description": "文件系统操作",
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/yourname/Documents"],
        "enabled": true
      }
    ]
  }
}
```

### 2. 启动 Kraken

```bash
kraken
```

MCP 服务器会自动连接，你会看到：

```
[MCP Manager] Connecting to server: filesystem
[MCP filesystem] Connected to filesystem-server v1.0.0
[MCP filesystem] Loaded 5 tools
```

### 3. 使用 MCP 工具

```
User: 请使用 filesystem 服务器列出我的文档目录

Agent: [使用 filesystem__list_directory 工具]
```

## 常用 MCP 服务器

### 文件系统

```json
{
  "name": "filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
  "enabled": true
}
```

### SQLite 数据库

```json
{
  "name": "sqlite",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"],
  "enabled": true
}
```

### Brave 搜索

```json
{
  "name": "brave-search",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "你的API密钥"
  },
  "enabled": true
}
```

## 工具命名

MCP 工具会以服务器名作为前缀：

- `filesystem__read_file`
- `sqlite__query`
- `brave-search__search`

## 测试示例

运行测试脚本：

```bash
npm run dev -- examples_mcp.ts
```

## 完整文档

查看 `docs/MCP_INTEGRATION.md` 获取完整文档。

## 故障排查

**服务器无法连接？**
- 检查命令路径
- 确认依赖已安装 (`npx -y` 会自动安装)
- 查看环境变量

**工具未显示？**
- 确认 `mcp.enabled: true`
- 确认服务器 `enabled: true`
- 查看启动日志

## 资源

- [MCP 官网](https://modelcontextprotocol.io)
- [官方服务器列表](https://github.com/modelcontextprotocol/servers)
