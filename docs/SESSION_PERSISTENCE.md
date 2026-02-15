# 会话持久化（Session Persistence）

## 概述

Kraken 会在**每一轮对话后**自动将会话上下文保存到磁盘，存储在 `workspace/.Kraken/sessions/:sessionId/history.json` 文件中。这确保即使程序崩溃，之前的对话历史也不会丢失。

## 功能特性

### 增量自动保存
- ✅ **每次 AI 响应后保存** - 不等到会话结束
- ✅ **每次工具调用后保存** - 实时更新历史
- ✅ **崩溃安全** - 已保存的对话不会丢失
- ✅ **覆盖模式** - 每次保存覆盖整个文件（保持最新状态）

### 存储位置

```
workspace/
└── .Kraken/
    └── sessions/
        └── {sessionId}/
            └── history.json
```

### 保存时机（增量保存）

会话历史会在以下**每个**情况下立即保存：

1. ✅ **每次 Assistant 返回文本响应**
   - 用户问问题 → AI 回答 → 立即保存

2. ✅ **每次工具调用完成**
   - AI 调用工具 → 工具返回结果 → 立即保存

3. ✅ **发生错误时**
   - 出现错误 → 立即保存当前状态

4. ✅ **达到迭代限制**
   - 达到最大步数 → 保存最终状态

### 示例对话流程

```
用户: "列出文件"
→ 保存（包含用户消息）

AI: [调用 list_directory 工具]
→ 保存（包含工具调用）

工具: 返回文件列表
→ 保存（包含工具结果）

AI: "这是文件列表..."
→ 保存（包含最终响应）
```

**每一步都会保存！** 🎉

### 数据格式

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
      "content": "Hello, can you help me?"
    },
    {
      "role": "assistant",
      "content": "Of course! How can I assist you?"
    },
    {
      "role": "user",
      "content": "Read package.json"
    },
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_123",
          "type": "function",
          "function": {
            "name": "read_file",
            "arguments": "{\"path\": \"package.json\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "tool_call_id": "call_123",
      "content": "{ \"name\": \"kraken-ai-assistant\", ... }"
    }
  ]
}
```

## 实现细节

### 核心模块

**`src/core/session/persistence.ts`**
- `saveSessionHistory()` - 保存会话历史
- `loadSessionHistory()` - 加载会话历史
- `listSessions()` - 列出所有会话
- `deleteSessionHistory()` - 删除会话历史

**`src/core/session/SessionStore.ts`**
- 新增 `workspaceRoot` 配置项
- 新增 `saveHistory()` 方法

**`src/core/agent/ReActAgent.ts`**
- 在 `run()` 方法结束时调用 `sessions.saveHistory()`

### 集成流程

```typescript
// 1. 创建 SessionStore 时传递 workspaceRoot
const sessions = new SessionStore(
  {
    maxTokens: 4000,
    compressionTargetTokens: 600,
    summaryModel: "gpt-4o-mini",
    workspaceRoot: "/Users/bill/code/MyProject" // ← 新增
  },
  llm
);

// 2. Agent 运行结束时自动保存
async run(sessionId: string, input: string): Promise<string> {
  // ... agent logic ...

  // 对话结束时保存
  await this.sessions.saveHistory(sessionId);

  return response;
}
```

## 使用示例

### 编程方式

```typescript
import {
  saveSessionHistory,
  loadSessionHistory,
  listSessions
} from "./src/core/session/persistence";

// 保存会话
await saveSessionHistory(
  "/Users/bill/code/MyProject",
  "session-123",
  messages
);

// 加载会话
const history = await loadSessionHistory(
  "/Users/bill/code/MyProject",
  "session-123"
);

if (history) {
  console.log(`Loaded ${history.messages.length} messages`);
}

// 列出所有会话
const sessions = await listSessions("/Users/bill/code/MyProject");
console.log("Sessions:", sessions);
```

### CLI 自动保存

CLI 模式下会自动保存，每次启动 CLI 都会生成唯一的随机会话 ID：

```bash
cd /Users/bill/code/MyProject
kraken

# 显示会话 ID:
# Session ID: session-20260215-143022-a7f3d2

# 对话...
User: Hello
Agent: Hi there!

# 对话结束后，历史保存到:
# /Users/bill/code/MyProject/.Kraken/sessions/session-20260215-143022-a7f3d2/history.json
```

**注意：** 每次启动 CLI 都会创建新的会话目录，历史不会被覆盖。详见 `docs/RANDOM_SESSION_ID.md`。

## 查看保存的会话

```bash
# 列出所有会话
ls -la .Kraken/sessions/

# 查看特定会话历史（替换为实际的 session ID）
cat .Kraken/sessions/session-20260215-143022-a7f3d2/history.json | jq .

# 查看元数据
cat .Kraken/sessions/session-20260215-143022-a7f3d2/history.json | jq .metadata

# 统计消息数
cat .Kraken/sessions/session-20260215-143022-a7f3d2/history.json | jq '.messages | length'

# 查看最新的会话（按修改时间）
ls -t .Kraken/sessions/ | head -1
```

## 隐私与安全

### .gitignore 保护

`.gitignore` 已包含 `.Kraken/` 目录，所以会话历史不会被提交到 Git：

```gitignore
.Kraken
```

### 敏感信息

会话历史可能包含：
- 用户输入
- 模型响应
- 工具调用参数
- 工具返回结果

**建议**：
- ✅ 不要提交到版本控制
- ✅ 定期清理旧会话
- ✅ 注意敏感数据

## 会话管理

### 清理旧会话

```bash
# 手动删除
rm -rf .Kraken/sessions/

# 或使用 API
```

```typescript
import { deleteSessionHistory } from "./src/core/session/persistence";

await deleteSessionHistory(workspaceRoot, "old-session-id");
```

### 列出所有会话

```typescript
import { listSessions } from "./src/core/session/persistence";

const sessions = await listSessions(workspaceRoot);
console.log("All sessions:", sessions);
```

## 覆盖行为

每次新对话都会**完全覆盖**之前的历史：

```typescript
// 第一次对话
await saveSessionHistory(root, "cli", [
  { role: "user", content: "First message" }
]);

// 第二次对话（覆盖）
await saveSessionHistory(root, "cli", [
  { role: "user", content: "Second message" }
]);

// 只保留第二次对话
```

如果需要保留历史，可以使用不同的 sessionId。

## 配置选项

### 禁用保存

不传递 `workspaceRoot` 即可禁用：

```typescript
const sessions = new SessionStore(
  {
    maxTokens: 4000,
    compressionTargetTokens: 600,
    summaryModel: "gpt-4o-mini"
    // 不设置 workspaceRoot
  },
  llm
);
```

### 自定义保存路径

修改 `persistence.ts` 中的路径逻辑：

```typescript
// 当前: workspace/.Kraken/sessions/:sessionId/history.json
// 自定义: workspace/.custom-path/sessions/:sessionId/history.json
```

## 错误处理

保存失败不会中断对话：

```typescript
async saveHistory(sessionId: string): Promise<void> {
  if (!this.options.workspaceRoot) {
    return; // 跳过保存
  }

  try {
    await saveSessionHistory(...);
  } catch (error) {
    console.warn(`Failed to save session history:`, error);
    // 继续执行，不抛出错误
  }
}
```

## 性能考虑

### 文件大小

- 典型对话：1-10 KB
- 长对话（压缩后）：10-50 KB
- 包含工具调用：可能更大

### I/O 性能

- 保存是异步的
- 使用 `fs.promises` API
- 不会阻塞对话流程

### 磁盘空间

```bash
# 检查会话大小
du -sh .Kraken/sessions/

# 示例输出: 128K
```

## 测试

运行测试脚本：

```bash
npx tsx test_session_persistence.ts
```

测试包括：
- ✓ 保存会话历史
- ✓ 加载会话历史
- ✓ 列出所有会话
- ✓ 加载不存在的会话
- ✓ 删除会话
- ✓ 覆盖会话（新对话）

## 未来增强

可能的改进方向：
- [ ] 会话历史归档（而非覆盖）
- [ ] 压缩存储（gzip）
- [ ] 自动清理旧会话
- [ ] 导出/导入功能
- [ ] 会话搜索
- [ ] 会话统计分析
- [ ] 增量保存（而非完整覆盖）

## 相关文件

- `src/core/session/persistence.ts` - 持久化工具
- `src/core/session/SessionStore.ts` - 会话存储（集成）
- `src/core/agent/ReActAgent.ts` - Agent（调用保存）
- `src/cli/index.ts` - CLI（传递 workspaceRoot）
- `test_session_persistence.ts` - 测试脚本
- `.gitignore` - 忽略 .Kraken 目录

## 故障排查

### 会话未保存

检查：
1. ✓ `workspaceRoot` 是否配置
2. ✓ 目录是否有写权限
3. ✓ 磁盘空间是否充足

### 无法加载会话

检查：
1. ✓ 文件是否存在
2. ✓ JSON 格式是否正确
3. ✓ 路径是否正确

### 权限错误

```bash
# 修复权限
chmod -R 755 .Kraken/sessions/
```

## 示例：查看最近的对话

```bash
#!/bin/bash
# view-last-session.sh

# 找到最新的会话目录
SESSIONS_DIR=".Kraken/sessions"
LATEST_SESSION=$(ls -t "$SESSIONS_DIR" | head -1)

if [ -n "$LATEST_SESSION" ] && [ -f "$SESSIONS_DIR/$LATEST_SESSION/history.json" ]; then
  echo "=== Latest Session: $LATEST_SESSION ==="
  cat "$SESSIONS_DIR/$LATEST_SESSION/history.json" | jq '.metadata'
  echo ""
  echo "=== Messages ==="
  cat "$SESSIONS_DIR/$LATEST_SESSION/history.json" | jq '.messages[] | "\(.role): \(.content)"'
else
  echo "No session history found"
fi
```

运行：

```bash
chmod +x view-last-session.sh
./view-last-session.sh
```
