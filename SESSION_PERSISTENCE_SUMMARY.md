# 会话持久化功能 - 实现总结

## ✅ 功能已完成

每次对话结束时，Kraken 会自动将所有上下文保存到 `workspace/.Kraken/sessions/:session-id/history.json`，每次新对话都会覆盖旧内容。

## 📁 文件结构

```
workspace/
├── .Kraken/
│   └── sessions/
│       └── cli/              # CLI 会话
│           └── history.json  # 会话历史
│       └── session-123/      # 其他会话
│           └── history.json
```

## 🎯 实现细节

### 1. 新增文件

**核心功能**:
- `src/core/session/persistence.ts` - 持久化工具函数
  - `saveSessionHistory()` - 保存会话
  - `loadSessionHistory()` - 加载会话
  - `listSessions()` - 列出会话
  - `deleteSessionHistory()` - 删除会话

**文档**:
- `docs/SESSION_PERSISTENCE.md` - 完整文档
- `view-session.sh` - 查看会话的 Shell 脚本

**测试**:
- `test_session_persistence.ts` - 功能测试脚本

### 2. 修改文件

**`src/core/session/SessionStore.ts`**:
- 添加 `workspaceRoot` 可选参数
- 新增 `saveHistory()` 方法

**`src/core/agent/ReActAgent.ts`**:
- 在 `run()` 方法的 3 个退出点调用 `saveHistory()`:
  1. 对话正常结束
  2. 发生错误
  3. 达到迭代限制

**`src/cli/index.ts`**:
- 传递 `workspaceRoot` 给 SessionStore

## 🔄 工作流程

```
1. 用户输入 → Agent 处理
2. 对话结束 → sessions.saveHistory(sessionId)
3. 创建目录 → .Kraken/sessions/:sessionId/
4. 保存文件 → history.json (覆盖旧内容)
```

## 📊 保存的数据格式

```json
{
  "metadata": {
    "sessionId": "cli",
    "savedAt": "2026-02-15T14:14:02.665Z",
    "messageCount": 10,
    "lastMessageRole": "assistant"
  },
  "messages": [
    {
      "role": "user",
      "content": "User message"
    },
    {
      "role": "assistant",
      "content": "Assistant response"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [...]
    },
    {
      "role": "tool",
      "tool_call_id": "call_123",
      "content": "Tool result"
    }
  ]
}
```

## 🧪 测试结果

运行 `npx tsx test_session_persistence.ts`:

```
✓ Test 1: Save session history
✓ Test 2: Load session history
✓ Test 3: List sessions
✓ Test 4: Load non-existent session
✓ Test 5: Delete session
✓ Test 6: Overwrite session (new conversation)
```

## 🚀 使用方法

### CLI 自动保存

```bash
cd /Users/bill/code/MyProject
kraken

# 对话...
# 结束后自动保存到 .Kraken/sessions/cli/history.json
```

### 查看保存的会话

```bash
# 使用提供的脚本
./view-session.sh cli

# 或使用 jq
cat .Kraken/sessions/cli/history.json | jq .

# 或使用 cat
cat .Kraken/sessions/cli/history.json
```

### 编程方式

```typescript
import { saveSessionHistory, loadSessionHistory } from "./src/core/session/persistence";

// 保存
await saveSessionHistory(workspaceRoot, sessionId, messages);

// 加载
const history = await loadSessionHistory(workspaceRoot, sessionId);
```

## 🔒 隐私保护

- ✅ `.gitignore` 已包含 `.Kraken/` 目录
- ✅ 会话历史不会被提交到 Git
- ✅ 保存失败不影响对话流程

## 🎨 特性亮点

1. **自动化** - 无需手动保存，对话结束自动保存
2. **覆盖模式** - 每次新对话覆盖旧历史，保持最新状态
3. **完整上下文** - 保存所有消息，包括工具调用
4. **优雅降级** - 无 workspaceRoot 时跳过保存
5. **错误容忍** - 保存失败不中断对话
6. **易于查看** - 提供查看脚本和文档

## 📚 相关文档

- `docs/SESSION_PERSISTENCE.md` - 完整使用指南
- `test_session_persistence.ts` - 测试示例
- `view-session.sh` - 查看工具

## 🔄 下次启动

当前实现每次都覆盖历史。如果需要保留多个历史版本，可以：

1. 使用时间戳命名：`history-{timestamp}.json`
2. 使用不同的 sessionId
3. 实现归档功能

## ✨ 示例输出

运行 `./view-session.sh demo`:

```
==================================================
  Kraken Session Viewer
==================================================

📁 Session: demo
📄 File: .Kraken/sessions/demo/history.json

=== Metadata ===
Session ID: demo
Saved at: 2026-02-15T14:20:00.000Z
Messages: 6
Last role: assistant

=== Conversation History ===

👤 USER:
   Hello, can you list files?

🤖 ASSISTANT (tool call):
   Tools: list_directory

🔧 TOOL RESULT:
   [DIR]  src
   [FILE] package.json

🤖 ASSISTANT:
   Here are the files...

==================================================
✅ Session loaded successfully
==================================================
```

## 🎉 总结

✅ **已完成**: 会话持久化功能完整实现
✅ **已测试**: 所有测试通过
✅ **已文档化**: 完整文档和示例
✅ **已集成**: CLI 自动启用
✅ **已保护**: .gitignore 配置
