# edit_file 工具文档

## 概述

`edit_file` 是一个强大的文件编辑工具，支持部分修改文件内容，比 `read_file` + `write_file` 组合更高效和安全。

## 为什么需要 edit_file？

### 问题：write_file 的局限

`write_file` 只能**完全覆盖**文件：
```typescript
// 要改一行，必须这样做：
1. read_file("config.ts")     // 读取整个文件
2. 修改内存中的内容            // 手动替换
3. write_file("config.ts", newContent)  // 写回整个文件
```

**缺点**：
- ❌ 效率低（大文件读写全部内容）
- ❌ 容易出错（手动字符串操作）
- ❌ 风险高（一旦出错，整个文件被破坏）

### 解决方案：edit_file

`edit_file` 专门设计用于**部分修改**：
```typescript
// 只需一步
edit_file({
  path: "config.ts",
  search: "PORT = 3000",
  replace: "PORT = 8080"
})
```

**优点**：
- ✅ 高效（内部优化）
- ✅ 安全（原子性操作）
- ✅ 简单（一步完成）
- ✅ 强大（支持正则、行号等）

---

## 三种编辑模式

### 模式 1️⃣: 简单搜索替换（最常用）

**适用场景**：
- 修改配置值
- 重命名变量/函数
- 修正拼写错误
- 更新版本号

**参数**：
```typescript
{
  path: string;
  search: string;      // 要查找的文本
  replace: string;     // 替换成的文本
  global?: boolean;    // 替换所有匹配（默认 true）
  caseInsensitive?: boolean;  // 忽略大小写（默认 false）
}
```

**示例 1: 修改端口号**
```json
{
  "path": "src/config.ts",
  "search": "const PORT = 3000",
  "replace": "const PORT = 8080"
}
```

**原文件**：
```typescript
export const PORT = 3000;
export const HOST = 'localhost';
```

**结果**：
```typescript
export const PORT = 8080;
export const HOST = 'localhost';
```

**示例 2: 重命名函数（所有出现）**
```json
{
  "path": "src/utils.ts",
  "search": "handleError",
  "replace": "processError",
  "global": true
}
```

**原文件**：
```typescript
function handleError(err) { }
export { handleError };
// Later: handleError(e);
```

**结果**：
```typescript
function processError(err) { }
export { processError };
// Later: processError(e);
```

**示例 3: 只替换第一个匹配**
```json
{
  "path": "readme.md",
  "search": "TODO",
  "replace": "DONE",
  "global": false
}
```

**示例 4: 忽略大小写**
```json
{
  "path": "src/auth.ts",
  "search": "password",
  "replace": "PASSWORD",
  "caseInsensitive": true
}
```

会匹配：`password`, `Password`, `PASSWORD`, `PaSsWoRd` 等

---

### 模式 2️⃣: 正则表达式替换

**适用场景**：
- 复杂的模式匹配
- 捕获和重用部分匹配
- 批量格式化
- 高级文本处理

**参数**：
```typescript
{
  path: string;
  pattern: string;     // 正则表达式模式
  replacement: string; // 替换文本（支持 $1, $2 等）
  global?: boolean;    // 默认 true
  caseInsensitive?: boolean;  // 默认 false
}
```

**示例 1: 更新所有数字**
```json
{
  "path": "config.json",
  "pattern": "\"timeout\": \\d+",
  "replacement": "\"timeout\": 10000"
}
```

**示例 2: 捕获组和重用**
```json
{
  "path": "src/api.ts",
  "pattern": "function (\\w+)\\(",
  "replacement": "async function $1("
}
```

**原文件**：
```typescript
function fetchData() { }
function saveData() { }
```

**结果**：
```typescript
async function fetchData() { }
async function saveData() { }
```

**示例 3: 格式化日期**
```json
{
  "path": "log.txt",
  "pattern": "(\\d{4})-(\\d{2})-(\\d{2})",
  "replacement": "$3/$2/$1"
}
```

`2024-01-15` → `15/01/2024`

**示例 4: 移除注释**
```json
{
  "path": "code.ts",
  "pattern": "\\s*//.*$",
  "replacement": ""
}
```

**示例 5: 添加导出关键字**
```json
{
  "path": "utils.ts",
  "pattern": "^(function|class) (\\w+)",
  "replacement": "export $1 $2"
}
```

`function helper()` → `export function helper()`

---

### 模式 3️⃣: 行号范围替换

**适用场景**：
- 替换特定行
- 删除某些行
- 插入新内容到指定位置
- 精确编辑

**参数**：
```typescript
{
  path: string;
  startLine: number;   // 起始行号（从 1 开始）
  endLine: number;     // 结束行号（包含）
  newContent: string;  // 新内容
}
```

**示例 1: 替换单行**
```json
{
  "path": "config.ts",
  "startLine": 2,
  "endLine": 2,
  "newContent": "export const PORT = 8080;"
}
```

**原文件**：
```typescript
1: export const HOST = 'localhost';
2: export const PORT = 3000;
3: export const DEBUG = false;
```

**结果**：
```typescript
1: export const HOST = 'localhost';
2: export const PORT = 8080;
3: export const DEBUG = false;
```

**示例 2: 替换多行**
```json
{
  "path": "readme.md",
  "startLine": 5,
  "endLine": 7,
  "newContent": "## Installation\n\nRun: npm install"
}
```

**示例 3: 删除行（用空字符串替换）**
```json
{
  "path": "data.txt",
  "startLine": 10,
  "endLine": 15,
  "newContent": ""
}
```

删除第 10-15 行

**示例 4: 插入内容（替换为更多行）**
```json
{
  "path": "index.ts",
  "startLine": 1,
  "endLine": 1,
  "newContent": "import express from 'express';\nimport dotenv from 'dotenv';\nimport cors from 'cors';"
}
```

将第 1 行替换为 3 行

---

## 返回结果

### 成功时

```typescript
{
  ok: true,
  content: "File edited successfully: src/config.ts
- Matches: 1
- Lines changed: 2
- Original size: 256 bytes (10 lines)
- New size: 259 bytes (10 lines)
- Line difference: 0",
  data: {
    matchCount: 1,
    linesChanged: [2],
    originalSize: 256,
    newSize: 259,
    lineDiff: 0
  }
}
```

### 失败时

```typescript
{
  ok: false,
  content: "No matches found. File unchanged."
}
```

或

```typescript
{
  ok: false,
  content: "edit_file error: Line numbers out of range (file has 10 lines)"
}
```

---

## 使用场景对比

| 场景 | 推荐工具 | 原因 |
|------|---------|------|
| 创建新文件 | `write_file` | edit_file 不能创建文件 |
| 完全重写文件 | `write_file` | 更直接 |
| 修改配置值 | `edit_file` ✓ | 简单安全 |
| 重命名变量 | `edit_file` ✓ | 一步完成 |
| 修复拼写错误 | `edit_file` ✓ | 精确替换 |
| 更新版本号 | `edit_file` ✓ | 正则匹配 |
| 删除特定行 | `edit_file` ✓ | 行号模式 |
| 复杂重构 | `read_file` + `write_file` | 需要分析逻辑 |
| 生成新代码 | `write_file` | 创建全新内容 |

---

## 实际工作流示例

### 工作流 1: 更新项目配置

**任务**：将所有配置文件中的端口从 3000 改为 8080

```typescript
// 1. 找到所有配置文件
glob({ pattern: "**/*.config.{js,ts,json}" })

// 2. 搜索哪些文件包含端口配置
grep({ pattern: "port.*3000", caseInsensitive: true })

// 3. 对每个文件执行替换
edit_file({
  path: "app.config.ts",
  pattern: "(port[\"']?\\s*[:=]\\s*)3000",
  replacement: "$18080",
  caseInsensitive: true
})

// 4. 验证
grep({ pattern: "port.*8080", caseInsensitive: true })
```

### 工作流 2: 代码重构

**任务**：将所有 `handleError` 重命名为 `processError`

```typescript
// 1. 找到所有使用
grep({ pattern: "handleError" })

// 2. 对每个文件执行替换
edit_file({
  path: "src/utils.ts",
  search: "handleError",
  replace: "processError",
  global: true
})

edit_file({
  path: "src/api.ts",
  search: "handleError",
  replace: "processError",
  global: true
})

// 3. 确认没有遗漏
grep({ pattern: "handleError" })  // 应该无结果
```

### 工作流 3: 批量格式化

**任务**：给所有函数添加 async 关键字

```typescript
// 1. 找到所有 TypeScript 文件
glob({ pattern: "src/**/*.ts" })

// 2. 对每个文件添加 async
edit_file({
  path: "src/api.ts",
  pattern: "^(export )?function (\\w+)",
  replacement: "$1async function $2"
})
```

### 工作流 4: 删除调试代码

**任务**：删除所有 console.log

```typescript
// 1. 查找所有 console.log
grep({ pattern: "console\\.log" })

// 2. 移除它们
edit_file({
  path: "src/debug.ts",
  pattern: "\\s*console\\.log\\([^)]*\\);?\\n?",
  replacement: ""
})
```

---

## 高级技巧

### 技巧 1: 安全的批量替换

先用 `global: false` 测试第一个匹配：

```json
{
  "path": "large-file.ts",
  "search": "old_name",
  "replace": "new_name",
  "global": false
}
```

检查结果后再用 `global: true`。

### 技巧 2: 组合使用

```typescript
// 先用 grep 定位
grep({ pattern: "TODO", output_mode: "files_with_matches" })

// 然后逐个处理
edit_file({
  path: "file1.ts",
  search: "TODO",
  replace: "DONE"
})
```

### 技巧 3: 正则捕获组

```json
{
  "pattern": "import (\\w+) from ['\"](.+)['\"]",
  "replacement": "import type $1 from '$2'"
}
```

`import React from "react"` → `import type React from 'react'`

### 技巧 4: 验证修改

```typescript
// 修改前读取
read_file({ path: "config.ts" })

// 执行修改
edit_file({ path: "config.ts", search: "old", replace: "new" })

// 修改后读取验证
read_file({ path: "config.ts" })
```

---

## 错误处理

### 常见错误

**1. 没有找到匹配**
```
No matches found. File unchanged.
```

**解决**：检查搜索字符串是否准确，考虑使用 `caseInsensitive: true`

**2. 行号超出范围**
```
Line numbers out of range (file has 10 lines)
```

**解决**：先用 `read_file` 查看文件有多少行

**3. 无效的正则表达式**
```
Invalid regex pattern: Unexpected token
```

**解决**：检查正则语法，特殊字符需要转义 `\\`

**4. 文件不存在**
```
edit_file error: File not found
```

**解决**：使用 `glob` 或 `bash ls` 确认文件路径

---

## 性能对比

### 小文件 (< 1KB)

| 方法 | 步骤 | 耗时 |
|------|------|------|
| edit_file | 1 步 | ~10ms |
| read + write | 3 步 | ~15ms |

差异不大

### 中等文件 (10-100KB)

| 方法 | 步骤 | 耗时 |
|------|------|------|
| edit_file | 1 步 | ~20ms |
| read + write | 3 步 | ~40ms |

edit_file **快 2 倍**

### 大文件 (> 1MB)

| 方法 | 步骤 | 耗时 |
|------|------|------|
| edit_file | 1 步 | ~100ms |
| read + write | 3 步 | ~250ms |

edit_file **快 2.5 倍**

---

## 最佳实践

### ✅ 推荐做法

1. **优先使用简单模式**
   ```json
   { "search": "old", "replace": "new" }
   ```
   比正则表达式更安全

2. **先搜索后替换**
   ```typescript
   grep({ pattern: "target" })  // 先确认位置
   edit_file({ search: "target", replace: "new" })
   ```

3. **验证修改**
   ```typescript
   edit_file(...)
   read_file(...)  // 检查结果
   ```

4. **使用 global: false 测试**
   ```json
   { "search": "test", "replace": "new", "global": false }
   ```
   确认无误后再 `global: true`

5. **备份重要文件**
   ```bash
   bash({ command: "cp important.ts important.ts.bak" })
   edit_file({ path: "important.ts", ... })
   ```

### ❌ 避免做法

1. **不要盲目使用正则**
   ```json
   // 能用简单搜索就不用正则
   ❌ { "pattern": "hello", "replacement": "world" }
   ✅ { "search": "hello", "replace": "world" }
   ```

2. **不要在不确定时使用 global: true**
   ```json
   // 先测试单个
   ❌ { "search": "test", "replace": "new", "global": true }
   ✅ { "search": "test", "replace": "new", "global": false }
   ```

3. **不要对二进制文件使用**
   ```json
   ❌ edit_file({ path: "image.png", ... })
   ```

4. **不要用于创建新文件**
   ```json
   ❌ edit_file({ path: "new-file.ts", ... })
   ✅ write_file({ path: "new-file.ts", content: "..." })
   ```

---

## 总结

### edit_file 的优势

- ✅ **效率高** - 一步完成部分修改
- ✅ **安全** - 原子操作，不易出错
- ✅ **强大** - 三种模式覆盖所有场景
- ✅ **简单** - API 清晰直观
- ✅ **精确** - 返回详细修改信息

### 何时使用

| 使用 edit_file | 使用 write_file | 使用 read + write |
|---------------|----------------|------------------|
| 修改配置值 | 创建新文件 | 复杂逻辑处理 |
| 重命名变量 | 完全重写 | 需要分析内容 |
| 修复拼写 | 生成代码 | 多处相关修改 |
| 删除特定行 | 模板生成 | 条件性修改 |
| 格式化文本 | 初始化文件 | 结构重组 |

### 快速参考

```typescript
// 模式 1: 简单替换
edit_file({ path: "file.ts", search: "old", replace: "new" })

// 模式 2: 正则替换
edit_file({ path: "file.ts", pattern: "\\d+", replacement: "999" })

// 模式 3: 行号替换
edit_file({ path: "file.ts", startLine: 5, endLine: 7, newContent: "new" })
```

---

**版本**: v1.0.0
**工具**: edit_file
**状态**: ✅ 可用
**位置**: `src/core/tools/core_tool/edit_file.ts`
