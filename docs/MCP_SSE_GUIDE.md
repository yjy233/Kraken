# MCP SSE/HTTP Stream 配置指南

## 概述

Kraken 现在支持通过 SSE (Server-Sent Events) / HTTP Stream 方式连接 MCP 服务器。这种方式适合远程 MCP 服务或自托管的 MCP API。

## 两种传输方式对比

### Stdio（本地进程）
```json
{
  "name": "filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
  "enabled": true
}
```
- ✅ 适合本地工具
- ✅ 低延迟
- ✅ 官方服务器支持
- ❌ 仅限本机

### SSE/HTTP（远程 API）
```json
{
  "name": "remote-api",
  "transport": "sse",
  "url": "https://api.example.com/mcp",
  "env": {
    "API_KEY": "your-key"
  },
  "enabled": true
}
```
- ✅ 支持远程服务
- ✅ 可扩展
- ✅ 云端部署
- ❌ 需要网络连接
- ❌ 略高延迟

## SSE 配置详解

### 基本配置

```json
{
  "mcp": {
    "enabled": true,
    "servers": [
      {
        "name": "my-remote-server",
        "description": "远程 MCP 服务",
        "transport": "sse",
        "url": "https://api.example.com/mcp",
        "enabled": true
      }
    ]
  }
}
```

### 使用 API 密钥

```json
{
  "name": "secure-api",
  "transport": "sse",
  "url": "https://api.example.com/mcp",
  "env": {
    "API_KEY": "your-secret-key"
  }
}
```

API 密钥会自动添加到 HTTP 请求头：
```
Authorization: Bearer your-secret-key
```

### 从环境变量读取

```json
{
  "env": {
    "API_KEY": "${MY_MCP_API_KEY}"
  }
}
```

在启动前设置：
```bash
export MY_MCP_API_KEY="your-key"
kraken
```

### 自定义 HTTP 头

使用 `HEADER_` 前缀添加自定义头：

```json
{
  "env": {
    "API_KEY": "secret",
    "HEADER_X-Custom-ID": "abc123",
    "HEADER_X-Tenant": "my-org"
  }
}
```

转换为：
```
Authorization: Bearer secret
X-Custom-ID: abc123
X-Tenant: my-org
```

## 完整示例

### 示例 1: 公共 MCP 服务

```json
{
  "name": "public-tools",
  "description": "公共 MCP 工具集",
  "transport": "sse",
  "url": "https://mcp.example.com/api",
  "enabled": true
}
```

### 示例 2: 需要认证的服务

```json
{
  "name": "authenticated-api",
  "description": "需要认证的 MCP API",
  "transport": "sse",
  "url": "https://secure-mcp.example.com",
  "env": {
    "API_KEY": "${MCP_API_KEY}",
    "HEADER_X-Organization": "my-company"
  },
  "enabled": true
}
```

### 示例 3: 本地开发服务器

```json
{
  "name": "local-dev",
  "description": "本地开发 MCP 服务器",
  "transport": "sse",
  "url": "http://localhost:3000/mcp",
  "enabled": true
}
```

## 混合配置

可以同时使用 stdio 和 SSE：

```json
{
  "mcp": {
    "enabled": true,
    "servers": [
      {
        "name": "local-fs",
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"],
        "enabled": true
      },
      {
        "name": "cloud-db",
        "transport": "sse",
        "url": "https://db-api.example.com/mcp",
        "env": {
          "API_KEY": "${DB_API_KEY}"
        },
        "enabled": true
      }
    ]
  }
}
```

## MCP SSE 服务器实现

如果你想创建自己的 MCP SSE 服务器，需要实现以下端点：

### POST /mcp

接收 JSON-RPC 2.0 请求：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "kraken-ai-assistant",
      "version": "0.1.0"
    }
  }
}
```

返回响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "my-mcp-server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {}
    }
  }
}
```

### 支持的方法

1. `initialize` - 初始化连接
2. `notifications/initialized` - 初始化完成通知
3. `tools/list` - 列出可用工具
4. `tools/call` - 调用工具

## 故障排查

### 连接失败

```
[MCP Manager] Failed to connect to remote-api: fetch failed
```

检查：
- ✓ URL 是否正确
- ✓ 服务器是否运行
- ✓ 网络连接
- ✓ 防火墙设置

### 认证失败

```
HTTP 401: Unauthorized
```

检查：
- ✓ API_KEY 是否正确
- ✓ 环境变量是否设置
- ✓ 认证头格式

### 工具不可用

```
[MCP SSE remote-api] Loaded 0 tools
```

检查：
- ✓ 服务器是否实现 `tools/list`
- ✓ 响应格式是否正确
- ✓ 查看服务器日志

## 测试 SSE 连接

使用 curl 测试：

```bash
curl -X POST https://api.example.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'
```

## 安全建议

1. **使用 HTTPS** - 生产环境必须使用加密连接
2. **环境变量** - API 密钥存储在环境变量中
3. **最小权限** - 只授予必要的访问权限
4. **日志审计** - 记录所有 MCP 调用

## 性能优化

1. **连接池** - 复用 HTTP 连接
2. **超时设置** - 合理的超时时间（默认 30 秒）
3. **重试机制** - 网络故障自动重试
4. **缓存** - 缓存工具列表

## 参考资源

- [MCP 规范](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [创建 MCP 服务器](https://github.com/modelcontextprotocol/servers)
