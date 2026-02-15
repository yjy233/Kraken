# 随机会话 ID - Random Session IDs

## ✨ 功能改进

每次启动 CLI 时自动生成唯一的会话 ID，替代固定的 "cli" ID。

## 🎯 问题

**之前的行为：**
- 每次启动 CLI 都使用固定的会话 ID："cli"
- 所有会话历史保存到同一个文件：`.Kraken/sessions/cli/history.json`
- 每次新的对话都会覆盖之前的历史

**问题：**
- 无法保留多个 CLI 会话的历史
- 无法区分不同时间的对话记录
- 历史记录会被新对话覆盖丢失

## ✅ 解决方案

**现在的行为：**
- 每次启动 CLI 时自动生成随机会话 ID
- 格式：`session-YYYYMMDD-HHMMSS-RANDOM`
- 示例：`session-20260215-143022-a7f3d2`
- 每个会话历史保存到独立文件

## 📁 会话历史存储

### 目录结构

```
workspace/
└── .Kraken/
    └── sessions/
        ├── session-20260215-140000-abc123/
        │   └── history.json
        ├── session-20260215-143022-a7f3d2/
        │   └── history.json
        └── session-20260215-150500-xyz789/
            └── history.json
```

### 会话 ID 格式

```
session-20260215-143022-a7f3d2
│       │        │      │
│       │        │      └─ 随机后缀 (6字符)
│       │        └──────── 时间 (HHMMSS)
│       └───────────────── 日期 (YYYYMMDD)
└───────────────────────── 前缀
```

## 🔧 实现细节

### 新增文件

**`src/cli/sessionUtils.ts`**
```typescript
export function generateSessionId(): string {
  const now = new Date();

  // 日期: YYYYMMDD
  const datePart = `${year}${month}${day}`;

  // 时间: HHMMSS
  const timePart = `${hours}${minutes}${seconds}`;

  // 随机后缀: 6字符
  const randomPart = Math.random().toString(36).substring(2, 8);

  return `session-${datePart}-${timePart}-${randomPart}`;
}
```

### 修改文件

**`src/cli/CLI.ts`**

1. 导入工具函数：
   ```typescript
   import { generateSessionId } from "./sessionUtils";
   ```

2. 使用随机 ID（第 24 行）：
   ```typescript
   // 之前:
   this.sessionId = params.sessionId ?? "cli";

   // 现在:
   this.sessionId = params.sessionId ?? generateSessionId();
   ```

3. 在欢迎界面显示会话 ID（第 98 行）：
   ```typescript
   console.log(createListItem(`Session ID: ${this.sessionId}`, symbols.info));
   ```

## 📊 使用示例

### 启动 CLI

```bash
npm run dev
```

输出：
```
🐙 Kraken AI Assistant
Powered by ReAct Agent with Advanced Reasoning

ℹ Type your message and press Enter
ℹ Press Ctrl+C to exit
ℹ Session ID: session-20260215-143022-a7f3d2

────────────────────────────────────────────────────────────────────────────────
```

### 会话历史保存

对话后，历史自动保存到：
```
.Kraken/sessions/session-20260215-143022-a7f3d2/history.json
```

### 查看所有会话

```bash
ls -la .Kraken/sessions/
```

输出：
```
session-20260215-140000-abc123/
session-20260215-143022-a7f3d2/
session-20260215-150500-xyz789/
```

### 查看特定会话历史

```bash
cat .Kraken/sessions/session-20260215-143022-a7f3d2/history.json | jq .
```

## 🎯 优势

| 特性 | 之前 | 现在 |
|------|------|------|
| 会话 ID | 固定 "cli" | 随机唯一 |
| 历史保存 | 单一文件 | 独立文件 |
| 历史保留 | 覆盖丢失 | 永久保留 |
| 会话区分 | ❌ 无法区分 | ✅ 时间戳+随机 |
| 历史追溯 | ❌ 不可能 | ✅ 完整记录 |

## 🧪 测试

运行测试脚本：

```bash
npx tsx test_random_session_id.ts
```

结果：
```
=== Testing Random Session ID Generation ===

Generating 5 random session IDs:
  1. session-20260215-230413-jn487m
     Valid format: ✓
  2. session-20260215-230413-l87e26
     Valid format: ✓
  3. session-20260215-230413-msq6tv
     Valid format: ✓
  4. session-20260215-230413-1z8n6g
     Valid format: ✓
  5. session-20260215-230413-8bx9q4
     Valid format: ✓

✅ Each CLI invocation will now have a unique session ID
```

## 🔄 向后兼容

### 手动指定会话 ID

如果需要使用特定会话 ID（例如恢复旧会话），仍然可以手动指定：

```typescript
const cli = new CLI({
  messageBus,
  agent,
  sessionId: "my-custom-session" // 可选，手动指定
});
```

### 继续之前的会话

```typescript
// 使用之前的会话 ID
const cli = new CLI({
  messageBus,
  agent,
  sessionId: "session-20260215-143022-a7f3d2"
});
```

这样会加载之前保存的历史，并继续对话。

## 🗑️ 会话清理

### 查看所有会话

```bash
ls -la .Kraken/sessions/
```

### 删除旧会话

```bash
# 删除特定会话
rm -rf .Kraken/sessions/session-20260215-143022-a7f3d2

# 删除所有会话
rm -rf .Kraken/sessions/
```

### 查找旧会话（7天前）

```bash
find .Kraken/sessions/ -type d -mtime +7
```

### 自动清理脚本

```bash
#!/bin/bash
# cleanup-old-sessions.sh
# 删除 7 天前的会话

find .Kraken/sessions/ -type d -mtime +7 -exec rm -rf {} +
echo "✓ Cleaned up old sessions"
```

## 📝 代码改动总结

### 新增文件
- `src/cli/sessionUtils.ts` - 会话 ID 生成工具
- `test_random_session_id.ts` - 测试脚本
- `docs/RANDOM_SESSION_ID.md` - 本文档

### 修改文件
- `src/cli/CLI.ts`
  - 导入 `generateSessionId`
  - 第 24 行：使用随机 ID 替代 "cli"
  - 第 98 行：显示会话 ID

## 🎉 总结

### ✅ 改进效果

| 方面 | 之前 | 现在 |
|------|------|------|
| 会话唯一性 | ❌ 固定 ID | ✅ 随机唯一 |
| 历史保留 | ❌ 覆盖丢失 | ✅ 永久保存 |
| 会话识别 | ❌ 无时间戳 | ✅ 时间+随机 |
| 历史追溯 | ❌ 不可能 | ✅ 完整记录 |
| 多会话管理 | ❌ 不支持 | ✅ 独立存储 |

### 🎯 使用场景

特别适合：
- ✅ 需要保留多个对话历史
- ✅ 需要区分不同时间的会话
- ✅ 需要追溯历史记录
- ✅ 需要恢复之前的对话
- ✅ 调试和日志分析

### 📚 相关文档

- `docs/SESSION_PERSISTENCE.md` - 会话持久化
- `docs/INCREMENTAL_SAVE.md` - 增量保存
- `test_random_session_id.ts` - 测试示例
