# 工作区上下文（Workspace Context）功能

## 概述

Kraken 现在会自动将工作区目录结构发送给 AI 模型，帮助模型更好地理解项目结构和可用文件。

## 功能特性

### 自动包含
- ✅ 自动扫描工作目录
- ✅ 生成文件树结构
- ✅ 作为系统消息提供给模型

### 智能限制
- 📁 **最大深度**: 2 层文件夹
- 📄 **最大文件数**: 100 个文件
- 🚫 **自动过滤**: 忽略 `node_modules`, `.git`, `dist` 等

### 性能优化
- ⚡ 只在首次调用时生成
- 💾 结果被缓存，避免重复扫描
- 🔒 无法读取时优雅降级

## 生成的上下文格式

```markdown
## Workspace Information

**Working Directory**: `/Users/bill/code/Kraken`

**Directory Structure** (52 files, 7 directories):

```
📁 src
  📁 core
  📁 cli
📄 package.json
📄 README.md
📄 tsconfig.json
```

You can use tools like `read_file`, `list_directory`, `grep`, and `glob` to explore the workspace further.
```

## 实现位置

### 核心模块

**`src/core/agent/prompts/workspaceContext.ts`**
- `buildWorkspaceContext()` - 主函数
- 扫描目录
- 生成文件树
- 格式化输出

### 集成位置

**`src/core/agent/ReActAgent.ts`**
- 在 `buildMessages()` 中调用
- 添加为系统消息
- 缓存结果避免重复生成

## 使用示例

### 编程方式

```typescript
import { buildWorkspaceContext } from "./src/core/agent/prompts/workspaceContext";

const context = await buildWorkspaceContext({
  workspaceRoot: "/Users/bill/code/MyProject",
  maxDepth: 2,
  maxFiles: 100,
  ignorePatterns: ["node_modules", ".git", "dist"]
});

console.log(context);
```

### 在 Agent 中使用

```typescript
const agent = new ReActAgent({
  llm,
  tools,
  sessions,
  sandbox,
  logger,
  options: {
    model: "gpt-4o-mini",
    workspaceRoot: "/Users/bill/code/MyProject" // ← 指定工作区
  }
});
```

Agent 会自动在每个会话的第一次调用时生成工作区上下文。

## 配置选项

```typescript
interface WorkspaceContextOptions {
  /** 工作目录路径 */
  workspaceRoot: string;

  /** 最大扫描深度（默认: 2） */
  maxDepth?: number;

  /** 最大文件数（默认: 100） */
  maxFiles?: number;

  /** 忽略的模式列表 */
  ignorePatterns?: string[];
}
```

### 默认忽略模式

```typescript
[
  "node_modules",
  ".git",
  ".claude",
  "dist",
  "build",
  ".next"
]
```

以 `.` 开头的文件和文件夹也会被自动忽略。

## AI 模型的好处

### 更好的上下文理解

模型现在可以：
- 🔍 了解项目结构
- 📝 知道哪些文件可用
- 🎯 提供更精准的文件路径建议
- 💡 更智能地选择要读取的文件

### 减少往返次数

以前：
```
User: 修改配置文件
Agent: 项目中有哪些配置文件？[使用 glob]
User: 修改 package.json
Agent: [读取 package.json]
```

现在：
```
User: 修改配置文件
Agent: 我看到项目中有 package.json，让我读取它 [直接 read_file]
```

## 性能考虑

### 缓存机制

```typescript
private workspaceContextCache?: string;

// 只生成一次
if (this.options.workspaceRoot && !this.workspaceContextCache) {
  this.workspaceContextCache = await buildWorkspaceContext({...});
}
```

### 文件限制

- 最多扫描 100 个文件
- 最多 2 层深度
- 遇到限制后停止扫描
- 不会影响性能

### Token 使用

典型的工作区上下文约 500-1000 tokens，对于大多数模型来说可以忽略不计。

## 自定义行为

### 禁用工作区上下文

不提供 `workspaceRoot` 即可：

```typescript
const agent = new ReActAgent({
  options: {
    model: "gpt-4o-mini"
    // 不设置 workspaceRoot
  }
});
```

### 自定义扫描参数

修改 `ReActAgent.ts` 中的调用：

```typescript
this.workspaceContextCache = await buildWorkspaceContext({
  workspaceRoot: this.options.workspaceRoot,
  maxDepth: 3,        // 改为 3 层
  maxFiles: 200,      // 改为 200 个文件
  ignorePatterns: [   // 自定义忽略
    "node_modules",
    ".git",
    "*.log"
  ]
});
```

## 错误处理

如果无法读取目录：

```markdown
## Workspace Information

**Working Directory**: `/path/to/project`

(Unable to read directory contents: ENOENT: no such file or directory)
```

模型仍然会知道工作目录，但不会有文件列表。

## 测试

运行测试脚本：

```bash
npx tsx test_workspace_context.ts
```

测试包括：
- ✓ 标准扫描（2层，100文件）
- ✓ 限制文件数（20文件）
- ✓ 限制深度（1层）
- ✓ 自定义忽略模式

## 相关文件

- `src/core/agent/prompts/workspaceContext.ts` - 核心实现
- `src/core/agent/prompts/index.ts` - 导出
- `src/core/agent/ReActAgent.ts` - 集成
- `src/cli/index.ts` - CLI 传递 workspaceRoot
- `test_workspace_context.ts` - 测试脚本

## 未来增强

可能的改进方向：
- [ ] 支持 `.gitignore` 模式
- [ ] 显示文件大小
- [ ] 显示最后修改时间
- [ ] 支持符号链接
- [ ] 可配置的格式化选项
- [ ] 增量更新（文件变化时）
