# 斜杠命令 - Slash Commands

## ✨ 功能介绍

为 CLI 添加斜杠命令（Slash Commands）支持，类似于 Discord、Slack 等应用的命令系统。

## 🎯 目的

**问题：**
- 用户无法清空对话历史
- 需要重启程序才能开始新对话
- 缺少交互式命令控制

**解决方案：**
- 添加 `/clear` 命令清空会话
- 支持扩展更多命令
- 提供友好的命令帮助

## 📝 可用命令

### `/clear` - 清空会话

清空当前对话并开始新会话。

**功能：**
1. 清空当前 session 的所有 messages
2. 生成新的随机 session ID
3. 清屏并显示欢迎界面
4. 显示旧/新 session ID 对比

**使用示例：**
```
💭 You │ Hello, can you help me?
(AI 回复...)

💭 You │ What is TypeScript?
(AI 回复...)

💭 You │ /clear

✓ Session cleared!
  Old session: session-20260215-143022-a7f3d2
  New session: session-20260215-144530-xyz789

💭 You │ What is React?
(AI 以全新上下文回复，不记得之前问过 TypeScript)
```

### `/exit` - 退出 CLI

优雅地退出 Kraken CLI。

**别名：** `/quit`

**功能：**
1. 显示告别消息
2. 显示当前 session ID
3. 正常退出程序（exit code 0）

**使用示例：**
```
💭 You │ Thanks for your help!
(AI 回复...)

💭 You │ /exit

👋 Goodbye!
Thanks for using Kraken!
Session ID: session-20260216-143022-a7f3d2

(程序退出)
```

**对比 Ctrl+C：**

| 方式 | 效果 | 体验 |
|------|------|------|
| Ctrl+C | 强制中断，无提示 | ⭐⭐☆☆☆ |
| /exit | 显示感谢信息，优雅退出 | ⭐⭐⭐⭐⭐ |

## 🔧 实现细节

### 新增方法

**`src/core/session/SessionStore.ts`**

```typescript
/**
 * Clear all messages for a session
 */
clear(sessionId: string): void {
  this.sessions.set(sessionId, []);
}
```

**`src/core/agent/ReActAgent.ts`**

```typescript
/**
 * Clear all messages for a session
 */
clearSession(sessionId: string): void {
  this.sessions.clear(sessionId);
}
```

**`src/cli/CLI.ts`**

```typescript
/**
 * Handle slash commands
 * Returns true if command was handled, false otherwise
 */
private handleSlashCommand(command: string): boolean {
  const trimmed = command.trim();

  if (trimmed === "/clear") {
    // 1. Clear current session
    this.agent.clearSession(this.sessionId);

    // 2. Generate new session ID
    const oldSessionId = this.sessionId;
    this.sessionId = generateSessionId();

    // 3. Clear screen and show welcome message
    console.clear();
    console.log(createHeading("🐙 Kraken AI Assistant", 1));
    // ... welcome screen ...

    // 4. Show success message
    console.log(colors.green + "✓ Session cleared!" + colors.reset);
    console.log(colors.gray + `  Old session: ${oldSessionId}` + colors.reset);
    console.log(colors.gray + `  New session: ${this.sessionId}` + colors.reset);

    return true;
  }

  // Handle unknown commands
  if (trimmed.startsWith("/")) {
    console.log(colors.red + "✗ Unknown command: " + trimmed + colors.reset);
    console.log(colors.gray + "  Available commands:" + colors.reset);
    console.log(colors.gray + "    /clear - Clear conversation and start a new session" + colors.reset);
    return true;
  }

  return false;
}
```

### 修改文件

**`src/cli/CLI.ts`** - 在 line 事件处理器中调用

```typescript
this.rl.on("line", async (line) => {
  if (!line.trim()) {
    this.rl.prompt();
    return;
  }

  // Handle slash commands
  if (this.handleSlashCommand(line)) {
    this.rl.prompt();
    return;
  }

  // ... normal message processing ...
});
```

## 🎨 视觉效果

### 执行 `/clear` 命令

**之前的界面：**
```
You
What is TypeScript?

Assistant Response
════════════════════════════════════════════════════════════

TypeScript is a typed superset of JavaScript...

────────────────────────────────────────────────────────────────────────────────

💭 You │ /clear_
```

**执行后的界面：**
```
🐙 Kraken AI Assistant
════════════════════════════════════════════════════════════
Powered by ReAct Agent with Advanced Reasoning

ℹ Type your message and press Enter
ℹ Press Ctrl+C to exit
ℹ Session ID: session-20260215-144530-xyz789

────────────────────────────────────────────────────────────────────────────────

✓ Session cleared!
  Old session: session-20260215-143022-a7f3d2
  New session: session-20260215-144530-xyz789

💭 You │ _
```

### 未知命令提示

**输入：** `/unknown`

**输出：**
```
✗ Unknown command: /unknown
  Available commands:
    /clear - Clear conversation and start a new session
    /exit  - Exit the CLI (or /quit)

💭 You │ _
```

## 📊 命令处理流程

```
用户输入
  ↓
检查是否为空
  ↓
检查是否以 / 开头 → handleSlashCommand()
  ↓                        ↓
  否                      是否匹配已知命令？
  ↓                        ↓
发送给 Agent           是 → 执行命令
                         ↓
                       否 → 显示帮助
                         ↓
                      返回 true
  ↓
显示提示符
```

## 🧪 测试

运行测试脚本：

```bash
npx tsx test_slash_commands.ts
```

测试覆盖：
- ✅ `/clear` 命令功能展示
- ✅ 未知命令处理
- ✅ 命令帮助信息
- ✅ Session ID 变化

## 🎯 使用场景

### 场景 1: 切换话题

```
You: Tell me about Python
AI: Python is a programming language...

You: What are its best features?
AI: Python's best features include...

You: /clear
✓ Session cleared!

You: Tell me about JavaScript
AI: JavaScript is a programming language...
(AI 不记得之前讨论过 Python)
```

### 场景 2: 调试时清空上下文

```
You: Read file.txt
AI: [读取文件并处理...]

You: Process this data
AI: [基于之前的上下文处理...]

You: /clear
✓ Session cleared!

You: Read file2.txt
AI: [以全新上下文处理，不受之前影响]
```

### 场景 3: 误操作后重新开始

```
You: Delete all files in /important
AI: I'll help you delete...

You: Wait, stop!
AI: Okay, stopped.

You: /clear
✓ Session cleared!

You: List files in /important
AI: [以全新上下文工作，不记得删除指令]
```

## 🔄 命令生命周期

### 1. 命令检测
```typescript
if (!line.trim()) return;
if (this.handleSlashCommand(line)) return;
```

### 2. 命令解析
```typescript
const trimmed = command.trim();
if (trimmed === "/clear") { ... }
```

### 3. 命令执行
```typescript
// Clear session
this.agent.clearSession(this.sessionId);

// Generate new ID
this.sessionId = generateSessionId();

// Update UI
console.clear();
// ... show welcome screen ...
```

### 4. 反馈显示
```typescript
console.log(colors.green + "✓ Session cleared!" + colors.reset);
console.log(colors.gray + `  Old session: ${oldSessionId}` + colors.reset);
console.log(colors.gray + `  New session: ${this.sessionId}` + colors.reset);
```

## 📝 代码改动总结

### 修改文件

1. **`src/core/session/SessionStore.ts`**
   - 新增 `clear(sessionId: string): void` 方法

2. **`src/core/agent/ReActAgent.ts`**
   - 新增 `clearSession(sessionId: string): void` 方法

3. **`src/cli/CLI.ts`**
   - 新增 `handleSlashCommand(command: string): boolean` 方法
   - 在 `line` 事件处理器中调用命令处理器

### 新增文件

- `test_slash_commands.ts` - 演示脚本
- `docs/SLASH_COMMANDS.md` - 本文档

## 🚀 扩展命令

### 添加新命令示例

在 `handleSlashCommand()` 中添加：

```typescript
if (trimmed === "/help") {
  console.log(colors.cyan + "Available Commands:" + colors.reset);
  console.log(colors.gray + "  /clear - Clear conversation" + colors.reset);
  console.log(colors.gray + "  /exit  - Exit the CLI" + colors.reset);
  console.log(colors.gray + "  /help  - Show this help" + colors.reset);
  return true;
}

if (trimmed.startsWith("/save ")) {
  const filename = trimmed.slice(6).trim();
  // Save conversation to file
  console.log(colors.green + `✓ Saved to ${filename}` + colors.reset);
  return true;
}
```

### 带参数的命令

```typescript
if (trimmed.startsWith("/model ")) {
  const modelName = trimmed.slice(7).trim();
  // Change model
  console.log(colors.green + `✓ Model changed to ${modelName}` + colors.reset);
  return true;
}
```

## 📋 完整对比

| 特性 | 之前 | 现在 |
|------|------|------|
| 清空对话 | ❌ 需重启 | ✅ /clear 命令 |
| 退出程序 | Ctrl+C 强制中断 | ✅ /exit 优雅退出 |
| 交互式控制 | ❌ 无 | ✅ 斜杠命令 |
| 命令帮助 | ❌ 无 | ✅ 自动显示 |
| Session 管理 | ❌ 手动 | ✅ 自动更新 |
| 用户体验 | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ |

## 🎉 总结

### ✅ 改进效果

| 方面 | 之前 | 现在 |
|------|------|------|
| 清空对话 | 重启程序 | /clear 命令 |
| 命令系统 | 无 | 完整支持 |
| 扩展性 | 低 | 高（易于添加新命令） |
| 用户友好度 | 低 | 高（自动帮助提示） |

### 🎯 功能特点

- ✅ 简单易用的命令语法
- ✅ 自动生成新 session ID
- ✅ 清晰的视觉反馈
- ✅ 友好的错误提示
- ✅ 易于扩展新命令

### 📚 相关文件

- `src/core/session/SessionStore.ts` - Session 清空逻辑
- `src/core/agent/ReActAgent.ts` - Agent 清空接口
- `src/cli/CLI.ts` - 命令处理实现
- `test_slash_commands.ts` - 演示脚本

现在用户可以使用 `/clear` 快速清空对话，开始全新的会话！✨
