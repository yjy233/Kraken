# 飞书机器人调试指南

## 🚀 快速开始调试

### 1. 基础调试模式

```bash
# 启用调试日志
npm run bot:debug

# 或
DEBUG=lark npm run bot
```

### 2. 详细调试模式

```bash
# 打印所有详细信息
npm run bot:verbose

# 或
DEBUG=lark:* npm run bot
```

### 3. 断点调试模式

```bash
# 每条消息会暂停，等待你确认
npm run bot:inspect
```

---

## 🐛 调试功能详解

### 控制台输出

启动调试模式后，你会看到：

```
🤖 正在启动飞书机器人...

[2024-01-15T10:30:00.000Z] [INFO] 正在加载配置...
[2024-01-15T10:30:00.001Z] [CONFIG] 加载的配置 { enabled: true, hasAppId: true, ... }
✅ 飞书机器人已启动!

🐛 调试模式已启用
   日志文件: ./lark-debug.log

按 Ctrl+C 停止

📨 消息事件
  消息ID: om_xxxxxxxxxxxxxxxx
  聊天ID: oc_xxxxxxxxxxxxxxxx (p2p)
  发送者: ou_xxxxxxxxxxxxxxxx
  消息类型: text
  内容: 你好
[2024-01-15T10:30:05.123Z] [PARSE] 解析后的文本 { text: '你好' }
[2024-01-15T10:30:05.124Z] [HANDLE] 处理命令 { command: '你好' }
[2024-01-15T10:30:05.125Z] [REPLY] 回复: 打招呼
```

---

## 🎯 断点调试

使用 `--inspect` 参数进入交互式调试：

```bash
npm run bot:inspect
```

当收到消息时：

```
============================================================
🛑 断点: 收到消息
============================================================
{
  "messageId": "om_xxxxxx",
  "chatId": "oc_xxxxxx",
  "sender": { ... },
  "content": "{\"text\":\"hello\"}",
  ...
}
------------------------------------------------------------
命令:
  c - 继续 (continue)
  d - 打印数据详情 (dump)
  s - 跳过此消息 (skip)
  q - 退出 (quit)
> c
```

### 断点命令

| 命令 | 说明 |
|------|------|
| `c` / Enter | 继续处理此消息 |
| `d` | 打印完整数据详情 |
| `s` | 跳过此消息（不回复） |
| `q` / Ctrl+C | 退出程序 |

---

## 📝 日志文件

调试日志会自动保存到 `./lark-debug.log`：

```bash
# 实时查看日志
tail -f lark-debug.log

# 查看最后 50 行
tail -n 50 lark-debug.log
```

### 日志格式

```
[2024-01-15T10:30:00.000Z] [INFO] 正在加载配置...
[2024-01-15T10:30:05.123Z] [MESSAGE] 收到消息
{
  "messageId": "om_xxxxxx",
  "chatId": "oc_xxxxxx",
  ...
}
[2024-01-15T10:30:05.124Z] [PARSE] 解析后的文本
{
  "text": "你好",
  "messageType": "text"
}
```

---

## 🔧 调试命令

在飞书中向机器人发送以下命令进行调试：

| 命令 | 功能 |
|------|------|
| `debug` | 打印当前会话的调试信息 |
| `echo <文本>` | 测试消息回显 |
| `ping` | 测试连接状态 |
| `help` | 显示帮助信息 |

### 示例

```
你: debug

机器人: 🐛 **调试信息**

聊天类型: p2p
发送者: ou_xxxxxxxx...
消息ID: om_xxxxxxxx...
时间: 2024-01-15T10:30:00.000Z
关键词匹配: kraken, 机器人
```

---

## 🎨 自定义调试

### 修改调试配置

在 `start-bot.ts` 中修改 `DEBUG` 对象：

```typescript
const DEBUG = {
  enabled: true,           // 始终启用调试
  verbose: true,           // 详细模式
  logFile: "./logs/debug.log",  // 自定义日志路径
  logToFile: true,         // 记录到文件
  dumpEvents: true,        // 打印完整事件
  breakpoint: false,       // 断点模式
};
```

### 添加自定义调试日志

```typescript
await debugLog("MY_TAG", "我的调试信息", { key: "value" });
```

输出：
```
[2024-01-15T10:30:00.000Z] [MY_TAG] 我的调试信息 { key: 'value' }
```

---

## 🔍 常见问题排查

### 1. 收不到消息

```bash
# 检查调试日志
DEBUG=lark:* npm run bot

# 确认事件订阅
# 前往飞书开放平台 → 事件订阅 → 检查 URL 和事件类型
```

### 2. 消息解析失败

```bash
# 查看原始消息内容
DEBUG=lark:* npm run bot

# 检查 MESSAGE 日志中的 content 字段
```

### 3. 群聊中机器人不回复

```bash
# 检查提及检测
# 查看 MENTION 日志

# 确认关键词配置
# Kraken.json: lark.botKeywords
```

### 4. 调试日志文件未创建

```bash
# 检查权限
ls -la ./

# 手动创建目录
mkdir -p ./logs

# 或使用绝对路径
LARK_DEBUG_LOG=/tmp/lark-debug.log npm run bot
```

---

## 📊 VS Code 调试

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Lark Bot",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "start-bot.ts"],
      "env": {
        "DEBUG": "lark:*"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Lark Bot (Breakpoint)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "start-bot.ts", "--inspect"],
      "env": {
        "DEBUG": "lark:*"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

然后按 `F5` 启动调试。

---

## 🧪 测试消息

### 使用 curl 模拟（需要 access_token）

```bash
# 获取 tenant_access_token
curl -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "cli_xxxxxx",
    "app_secret": "xxxxxx"
  }'

# 发送测试消息
curl -X POST https://open.feishu.cn/open-apis/im/v1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receive_id": "ou_xxxxxx",
    "msg_type": "text",
    "content": "{\"text\":\"test\"}"
  }'
```

---

## 💡 调试技巧

### 1. 过滤特定用户的消息

```typescript
client.on("im.message.receive_v1", async (data) => {
  // 只调试特定用户
  if (data.sender.senderId.open_id !== "ou_target_user") {
    return;
  }
  // ... 调试代码
});
```

### 2. 保存消息到文件

```typescript
// 在 handleMessage 中添加
await fs.appendFile(
  "./messages.jsonl", 
  JSON.stringify(data) + "\n"
);
```

### 3. 延迟回复（测试并发）

```typescript
await new Promise(r => setTimeout(r, 5000)); // 延迟 5 秒
```

### 4. 模拟错误

```typescript
if (text === "error") {
  throw new Error("测试错误");
}
```

---

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `start-bot.ts` | 主启动文件，含调试代码 |
| `lark-debug.log` | 调试日志文件 |
| `LARK_CONFIG.md` | 配置文档 |
