# 飞书机器人配置指南

飞书机器人配置已整合到 Kraken.json 配置系统中。

## 🚀 快速开始

### 1. 配置 Kraken.json

在项目根目录的 `.Kraken/Kraken.json` 或全局 `~/.Kraken/Kraken.json` 中添加：

```json
{
  "lark": {
    "enabled": true,
    "appId": "cli_xxxxxxxxxxxx",
    "appSecret": "xxxxxxxxxxxxxxxx",
    "debug": true,
    "autoReplyOnMention": true,
    "botKeywords": ["kraken", "机器人"],
    "welcomeMessage": "你好！我是 Kraken AI 助手 🤖"
  }
}
```

### 2. 启动机器人

```bash
npm run bot
```

## ⚙️ 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `enabled` | boolean | false | 是否启用飞书机器人 |
| `appId` | string | - | 飞书应用 ID，支持 `${ENV_VAR}` 语法 |
| `appSecret` | string | - | 飞书应用密钥，支持 `${ENV_VAR}` 语法 |
| `debug` | boolean | false | 是否启用调试日志 |
| `autoReplyOnMention` | boolean | true | 群聊中只回复 @机器人的消息 |
| `botKeywords` | string[] | ["kraken"] | 机器人关键词，用于检测 @提及 |
| `welcomeMessage` | string \| null | null | 新用户欢迎消息，null 表示不发送 |
| `systemPrompt` | string \| null | null | 自定义系统提示词 |
| `eventHandlersPath` | string \| null | null | 自定义事件处理器文件路径 |

## 🔐 配置方式（优先级从高到低）

### 方式一：Kraken.json（推荐）

```json
{
  "lark": {
    "enabled": true,
    "appId": "${LARK_APP_ID}",
    "appSecret": "${LARK_APP_SECRET}"
  }
}
```

### 方式二：环境变量

```bash
export LARK_ENABLED=true
export LARK_APP_ID=cli_xxxxxxxx
export LARK_APP_SECRET=xxxxxxxx
```

### 方式三：.env 文件

```bash
LARK_ENABLED=true
LARK_APP_ID=cli_xxxxxxxx
LARK_APP_SECRET=xxxxxxxx
```

## 📁 配置文件层级

配置加载优先级（高优先级覆盖低优先级）：

1. **环境变量** - `LARK_APP_ID`, `LARK_APP_SECRET`
2. **工作区配置** - `./.Kraken/Kraken.json`
3. **全局配置** - `~/.Kraken/Kraken.json`
4. **.env 文件** - 项目根目录的 `.env`

## 🎯 完整配置示例

```json
{
  "$schema": "./kraken.schema.json",
  "version": "1.0.0",
  
  "agent": {
    "model": "gpt-4o-mini",
    "maxIterations": 6,
    "temperature": 0.2
  },
  
  "llm": {
    "provider": "openai",
    "apiKey": "${OPENAI_API_KEY}",
    "baseUrl": "https://api.openai.com/v1"
  },
  
  "lark": {
    "enabled": true,
    "appId": "${LARK_APP_ID}",
    "appSecret": "${LARK_APP_SECRET}",
    "debug": false,
    "autoReplyOnMention": true,
    "botKeywords": ["kraken", "机器人", "助手"],
    "welcomeMessage": "👋 你好！我是 Kraken AI 助手，可以帮你编写代码、查询资料、解答问题。\n\n输入 **help** 查看可用命令。",
    "systemPrompt": "你是一个 helpful 的 AI 助手，回答简洁明了。",
    "eventHandlersPath": null
  },
  
  "env": {
    "loadDotenv": true,
    "overrideWithEnv": true,
    "mapping": {
      "LARK_APP_ID": "lark.appId",
      "LARK_APP_SECRET": "lark.appSecret"
    }
  }
}
```

## 🤖 机器人命令

启动后，在飞书中与机器人对话：

| 命令 | 说明 |
|------|------|
| `hello` / `你好` | 打招呼 |
| `help` / `帮助` | 显示帮助信息 |
| `ping` | 测试连接 |
| `card` | 发送示例卡片 |
| 其他消息 | AI 智能回复 |

## 📝 接入 LLM

修改 `start-bot.ts` 中的 `generateAIResponse` 函数来接入实际的大模型：

```typescript
async function generateAIResponse(userMessage: string, config: any): Promise<string> {
  // 示例：接入 OpenAI
  const response = await fetch(`${config.llm?.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.llm?.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.agent?.model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

## 🔧 开发模式

使用 `debug: true` 查看详细日志：

```json
{
  "lark": {
    "enabled": true,
    "debug": true
  }
}
```

日志输出包括：
- 收到的消息事件
- 发送的消息内容
- WebSocket 连接状态
- 错误信息

## 🚀 部署

生产环境建议：

1. 使用环境变量存储敏感信息
2. 禁用 `debug` 模式
3. 配置日志文件路径
4. 使用进程管理器（如 PM2）

```bash
# 安装依赖
npm install

# 编译
npm run build

# 使用 PM2 启动
pm2 start dist/lark/index.js --name kraken-bot
```
