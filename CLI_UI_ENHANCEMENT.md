# CLI UI Enhancement

## 概述 (Overview)

Kraken CLI 已经过完全重新设计，提供更美观、更易读的界面。现在使用彩色卡片式消息框和改进的格式。

## 新增功能 (New Features)

### 1. 彩色卡片消息框 (Colored Card Messages)

所有消息现在显示为美观的卡片式框：

#### 工具调用 (Tool Calls) - 黄色卡片 🟨
```
┌──────────────────────────────────────────────────────────┐
│ 🔧 Tool Call: grep                                       │
├──────────────────────────────────────────────────────────┤
│ Input:                                                   │
│ {                                                        │
│   "pattern": "TODO",                                     │
│   "recursive": true                                      │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
```

#### 工具结果 (Tool Results) - 绿色/红色卡片 🟩/🟥
```
┌──────────────────────────────────────────────────────────┐
│ ✓ Tool Result: grep ✓ Success                           │
├──────────────────────────────────────────────────────────┤
│ Found 3 matches:                                         │
│ src/index.ts:42: // TODO: Add error handling            │
│ src/core/agent.ts:15: // TODO: Optimize                 │
└──────────────────────────────────────────────────────────┘
```

#### 思考过程 (Thinking) - 青色卡片 🔵
```
┌──────────────────────────────────────────────────────────┐
│ 🤔 Thinking                                              │
├──────────────────────────────────────────────────────────┤
│ Step 1/6                                                 │
└──────────────────────────────────────────────────────────┘
```

#### 错误消息 (Errors) - 红色卡片 🔴
```
┌──────────────────────────────────────────────────────────┐
│ ✗ Error                                                  │
├──────────────────────────────────────────────────────────┤
│ File not found: /path/to/file                           │
└──────────────────────────────────────────────────────────┘
```

### 2. 美化的响应格式 (Beautiful Response Format)

助手响应现在有清晰的标题和分隔线：

```
Assistant Response
════════════════════════════════════════════════════════════

I found 3 TODO comments in your codebase. Here's what they are:

1. src/index.ts:42 - Add error handling
2. src/core/agent.ts:15 - Optimize performance
3. src/tools/grep.ts:88 - Add unit tests

────────────────────────────────────────────────────────────
```

### 3. 欢迎界面 (Welcome Banner)

启动时显示美观的欢迎界面：

```
🐙 Kraken AI Assistant
════════════════════════════════════════════════════════════
Powered by ReAct Agent with Advanced Reasoning

ℹ Type your message and press Enter
ℹ Press Ctrl+C to exit

────────────────────────────────────────────────────────────
```

### 4. 状态徽章 (Status Badges)

成功/失败状态现在有彩色徽章：

- ✅ ✓ Success (绿色)
- ❌ ✗ Failed (红色)
- ℹ️ ℹ Info (蓝色)
- ⚠️ ⚠ Warning (黄色)

## UI 工具库 (UI Utilities)

### 新模块: `src/cli/ui.ts`

提供了完整的 UI 工具集：

#### 颜色 (Colors)
```typescript
import { colors } from "./ui";

console.log(colors.yellow + "Yellow text" + colors.reset);
console.log(colors.green + "Green text" + colors.reset);
console.log(colors.red + "Red text" + colors.reset);
```

#### 卡片 (Cards)
```typescript
import { createCard } from "./ui";

const card = createCard({
  title: "Tool Call",
  content: "Processing...",
  color: "yellow",
  icon: "🔧"
});
console.log(card);
```

支持的颜色：`yellow`, `green`, `red`, `blue`, `cyan`, `magenta`

#### 徽章 (Badges)
```typescript
import { createBadge } from "./ui";

console.log(createBadge("Success", "success"));
console.log(createBadge("Failed", "error"));
console.log(createBadge("Info", "info"));
console.log(createBadge("Warning", "warning"));
```

#### 标题 (Headings)
```typescript
import { createHeading } from "./ui";

console.log(createHeading("Main Title", 1));  // Level 1 (大标题)
console.log(createHeading("Section", 2));     // Level 2 (节标题)
console.log(createHeading("Subsection", 3));  // Level 3 (子标题)
```

#### 分隔线 (Dividers)
```typescript
import { createDivider } from "./ui";

console.log(createDivider("─", 60));  // ────────────────────
console.log(createDivider("═", 60));  // ════════════════════
```

#### 列表项 (List Items)
```typescript
import { createListItem, symbols } from "./ui";

console.log(createListItem("First item", symbols.bullet));
console.log(createListItem("Second item", symbols.arrow));
```

#### 格式化数据 (Format Data)
```typescript
import { formatToolData } from "./ui";

const data = { pattern: "TODO", recursive: true };
console.log(formatToolData(data));
// 自动格式化 JSON，截断过长输出
```

## 视觉改进 (Visual Improvements)

### 之前 (Before):
```
[Tool Call] grep
  Input: {"pattern":"TODO","recursive":true}

[Tool Result ✓] grep
  Found 3 matches: src/index.ts:42: // TODO: Add error handling...