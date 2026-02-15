# list_directory 工具使用指南

## 功能

`list_directory` 工具用于列出指定目录中的所有文件和子目录。

## 语法

```json
{
  "path": "目录路径"
}
```

## 参数

- **path** (必需): 要列出的目录路径
  - 可以是相对路径（相对于 sandbox root）
  - 也可以是绝对路径（必须在 allowlist 内）

## 输出格式

每个条目前面会有一个前缀：
- `[DIR]  ` - 表示目录
- `[FILE] ` - 表示文件

## 使用示例

### 示例 1: 列出当前目录

```json
{
  "path": "."
}
```

输出：
```
[DIR]  src
[DIR]  docs
[FILE] package.json
[FILE] README.md
[FILE] tsconfig.json
```

### 示例 2: 列出子目录

```json
{
  "path": "src/core"
}
```

输出：
```
[DIR]  agent
[DIR]  llm
[DIR]  tools
[DIR]  sandbox
[FILE] index.ts
```

### 示例 3: 列出绝对路径

```json
{
  "path": "/Users/bill/code/Kraken"
}
```

输出：
```
[DIR]  .Kraken
[DIR]  src
[DIR]  docs
[FILE] package.json
[FILE] README.md
```

### 示例 4: 空目录

```json
{
  "path": "empty_folder"
}
```

输出：
```
(empty directory)
```

## 错误处理

### 路径不是目录

```json
{
  "path": "package.json"
}
```

错误：
```
list_directory error: Path is not a directory
```

### 路径不存在

```json
{
  "path": "nonexistent"
}
```

错误：
```
list_directory error: ENOENT: no such file or directory
```

### 路径在 sandbox 外

```json
{
  "path": "/etc/passwd"
}
```

错误：
```
list_directory error: Path is outside of sandbox allowlist
```

## AI 对话示例

**用户**: 列出当前目录的内容

**Agent**: 我将使用 list_directory 工具查看当前目录。

```json
{
  "path": "."
}
```

**结果**:
```
[DIR]  src
[DIR]  docs
[DIR]  node_modules
[FILE] package.json
[FILE] README.md
[FILE] tsconfig.json
```

当前目录包含 3 个子目录和 3 个文件。

---

**用户**: src 目录下有什么？

**Agent**: 让我查看 src 目录的内容。

```json
{
  "path": "src"
}
```

**结果**:
```
[DIR]  core
[DIR]  cli
[FILE] index.ts
```

src 目录包含 2 个子目录（core 和 cli）以及 1 个入口文件 index.ts。

## 配置

在 `Kraken.json` 中确保工具已启用：

```json
{
  "tools": {
    "enabled": [
      "list_directory",
      "read_file",
      "write_file"
    ]
  }
}
```

## 与其他工具配合

### 与 read_file 配合

1. 使用 `list_directory` 找到文件
2. 使用 `read_file` 读取文件内容

```
list_directory "src" → 看到 index.ts
read_file "src/index.ts" → 读取内容
```

### 与 grep 配合

1. 使用 `list_directory` 找到目录
2. 使用 `grep` 在目录中搜索

```
list_directory "src/core" → 看到子目录
grep "class.*Agent" "src/core/**/*.ts" → 搜索所有 Agent 类
```

## 安全性

- ✅ 受 sandbox 限制保护
- ✅ 只能访问 allowlist 内的目录
- ✅ 不会显示敏感系统目录
- ✅ 路径自动验证和解析

## 技术实现

工具位置：
- 工具定义: `src/core/tools/core_tool/list_directory.ts`
- Sandbox 方法: `src/core/sandbox/Sandbox.ts:listDirectory()`

## 相关工具

- `read_file` - 读取文件内容
- `write_file` - 写入文件
- `grep` - 在文件中搜索
- `glob` - 按模式查找文件
