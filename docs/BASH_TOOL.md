# Bash Tool Documentation

## 概述 (Overview)

`bash` 工具允许 Kraken Agent 执行 shell 命令，使其能够进行 git 操作、运行测试、管理包等系统级操作。

## 功能 (Features)

- ✅ 执行任意 bash 命令
- ✅ 超时保护（默认 30 秒，最多 5 分钟）
- ✅ 自定义工作目录
- ✅ 捕获 stdout 和 stderr
- ✅ 最大输出缓冲区 10MB
- ✅ 错误处理和详细的错误信息
- ✅ 日志记录执行的命令

## API

### 输入参数 (Input Schema)

```typescript
{
  command: string;    // 必需：要执行的 bash 命令
  timeout?: number;   // 可选：超时时间（毫秒），默认 30000，最大 300000
  cwd?: string;       // 可选：工作目录，默认当前目录
}
```

### 输出 (Output)

成功时：
```typescript
{
  ok: true,
  content: string,           // stdout 和 stderr 的组合输出
  data: {
    stdout: string,          // 标准输出
    stderr: string           // 标准错误
  }
}
```

失败时：
```typescript
{
  ok: false,
  content: string,           // 错误消息
  data: {
    stdout?: string,         // 部分输出
    stderr?: string,         // 错误输出
    code?: number,           // 退出代码
    signal?: string          // 终止信号
  }
}
```

## 使用示例 (Usage Examples)

### 1. Git 操作

#### 查看状态
```json
{
  "command": "git status"
}
```

#### 查看提交历史
```json
{
  "command": "git log --oneline -10"
}
```

#### 查看差异
```json
{
  "command": "git diff"
}
```

#### 添加和提交
```json
{
  "command": "git add . && git commit -m 'Update files'"
}
```

### 2. 包管理

#### 安装依赖
```json
{
  "command": "npm install",
  "timeout": 120000
}
```

#### 运行构建
```json
{
  "command": "npm run build"
}
```

#### 查看已安装的包
```json
{
  "command": "npm list --depth=0"
}
```

### 3. 文件系统操作

#### 列出文件
```json
{
  "command": "ls -la"
}
```

#### 查看当前目录
```json
{
  "command": "pwd"
}
```

#### 创建目录
```json
{
  "command": "mkdir -p data/backups"
}
```

#### 移动文件
```json
{
  "command": "mv old.txt new.txt"
}
```

### 4. 运行测试

#### 运行所有测试
```json
{
  "command": "npm test"
}
```

#### 运行特定测试
```json
{
  "command": "npm test -- --grep 'tool tests'"
}
```

#### Python 测试
```json
{
  "command": "pytest tests/"
}
```

### 5. 进程管理

#### 查看进程
```json
{
  "command": "ps aux | grep node"
}
```

#### 查看端口占用
```json
{
  "command": "lsof -i :3000"
}
```

### 6. 系统信息

#### 查看系统信息
```json
{
  "command": "uname -a"
}
```

#### 查看磁盘使用
```json
{
  "command": "df -h"
}
```

#### 查看内存使用
```json
{
  "command": "free -h"
}
```

### 7. 文本处理

#### 使用 grep
```json
{
  "command": "grep -r 'TODO' src/"
}
```

#### 使用 find
```json
{
  "command": "find . -name '*.ts' -type f"
}
```

#### 使用 wc
```json
{
  "command": "wc -l src/**/*.ts"
}
```

### 8. 链式命令

#### 多个命令（AND）
```json
{
  "command": "cd src && ls -la && pwd"
}
```

#### 多个命令（管道）
```json
{
  "command": "cat package.json | grep version"
}
```

## 安全考虑 (Security Considerations)

### 超时保护

- 默认超时：30 秒
- 最大超时：5 分钟（300,000 毫秒）
- 超时的命令会被终止

```json
{
  "command": "npm install",
  "timeout": 120000  // 2 分钟
}
```

### 危险命令

**谨慎使用以下命令：**

- `rm -rf` - 删除文件
- `mv` - 移动/重命名
- `chmod` - 修改权限
- `chown` - 修改所有者
- `sudo` - 提升权限（通常不可用）
- `kill` - 终止进程

**建议：**
- 在执行破坏性操作前先检查
- 使用 `-n` 或 `--dry-run` 选项预览
- 备份重要文件

### 输出限制

- 最大输出缓冲区：10MB
- 超过限制会导致命令失败
- 对于大输出，考虑重定向到文件

## 最佳实践 (Best Practices)

### 1. 使用正确的工具

```
❌ 不推荐：bash "cat file.txt"
✅ 推荐：read_file { path: "file.txt" }

❌ 不推荐：bash "echo 'content' > file.txt"
✅ 推荐：write_file { path: "file.txt", content: "content" }

❌ 不推荐：bash "ls src/**/*.ts"
✅ 推荐：glob { pattern: "src/**/*.ts" }

❌ 不推荐：bash "grep -r 'TODO' ."
✅ 推荐：grep { pattern: "TODO", recursive: true }
```

### 2. 使用 bash 的场景

**适合使用 bash：**
- Git 操作（status, log, diff, commit）
- 包管理（npm, pip, cargo）
- 运行测试（npm test, pytest）
- 构建项目（npm run build）
- 系统信息（uname, df, ps）
- 进程管理（kill, ps aux）

**不适合使用 bash：**
- 读取文件内容 → 用 `read_file`
- 写入文件 → 用 `write_file`
- 查找文件 → 用 `glob`
- 搜索内容 → 用 `grep`

### 3. 错误处理

```json
// 检查命令是否成功
{
  "command": "git status"
}

// 如果失败，结果会包含错误信息
// result.ok === false
// result.content 包含错误详情
```

### 4. 工作目录

```json
// 指定工作目录
{
  "command": "ls",
  "cwd": "/path/to/directory"
}

// 或在命令中使用 cd
{
  "command": "cd /path/to/directory && ls"
}
```

### 5. 超时设置

```json
// 快速命令（默认 30 秒够用）
{
  "command": "git status"
}

// 长时间运行的命令
{
  "command": "npm install",
  "timeout": 120000  // 2 分钟
}

// 非常慢的操作
{
  "command": "npm run build:prod",
  "timeout": 300000  // 5 分钟（最大值）
}
```

## 常见工作流 (Common Workflows)

### 工作流 1: Git 提交工作流

```typescript
// 1. 检查状态
bash({ command: "git status" })

// 2. 查看差异
bash({ command: "git diff" })

// 3. 添加文件
bash({ command: "git add src/" })

// 4. 提交
bash({ command: "git commit -m 'feat: add new feature'" })

// 5. 推送
bash({ command: "git push origin main" })
```

### 工作流 2: 测试工作流

```typescript
// 1. 安装依赖
bash({ command: "npm install", timeout: 120000 })

// 2. 运行构建
bash({ command: "npm run build" })

// 3. 运行测试
bash({ command: "npm test" })

// 4. 检查覆盖率
bash({ command: "npm run coverage" })
```

### 工作流 3: 调试工作流

```typescript
// 1. 查看进程
bash({ command: "ps aux | grep node" })

// 2. 检查端口
bash({ command: "lsof -i :3000" })

// 3. 查看日志
bash({ command: "tail -n 100 logs/app.log" })

// 4. 重启服务
bash({ command: "npm restart" })
```

### 工作流 4: 项目信息收集

```typescript
// 1. Node 版本
bash({ command: "node --version" })

// 2. NPM 版本
bash({ command: "npm --version" })

// 3. Git 分支
bash({ command: "git branch --show-current" })

// 4. 依赖数量
bash({ command: "npm list --depth=0 | wc -l" })
```

## 错误示例 (Error Examples)

### 超时错误

```json
// 输入
{
  "command": "sleep 60",
  "timeout": 5000
}

// 输出
{
  "ok": false,
  "content": "bash error: Command timed out after 5000ms"
}
```

### 命令不存在

```json
// 输入
{
  "command": "nonexistentcommand"
}

// 输出
{
  "ok": false,
  "content": "bash error: Command failed...\nstderr:\nbash: nonexistentcommand: command not found"
}
```

### 权限错误

```json
// 输入
{
  "command": "cat /etc/shadow"
}

// 输出
{
  "ok": false,
  "content": "bash error: ...\nstderr:\ncat: /etc/shadow: Permission denied"
}
```

## 与其他工具的比较

| 场景 | bash | 其他工具 | 推荐 |
|------|------|----------|------|
| 读取文件 | `cat file.txt` | `read_file` | read_file |
| 写入文件 | `echo "..." > file` | `write_file` | write_file |
| 查找文件 | `find . -name "*.ts"` | `glob` | glob |
| 搜索内容 | `grep -r "TODO" .` | `grep` | grep |
| Git 操作 | `git status` | - | bash ✓ |
| NPM 命令 | `npm install` | - | bash ✓ |
| 运行测试 | `npm test` | - | bash ✓ |
| 系统信息 | `uname -a` | - | bash ✓ |

## 性能考虑 (Performance)

- **启动开销**: 每次调用都会创建新的 bash 进程（~10-50ms）
- **输出缓冲**: 最大 10MB，超过会失败
- **超时**: 默认 30 秒，可配置到 5 分钟
- **并发**: 可以并发执行多个命令

## 限制 (Limitations)

1. **交互式命令不支持**: 不能使用需要用户输入的命令（如 vim, nano）
2. **后台进程**: 后台进程在命令结束时会被终止
3. **环境变量**: 使用 Node.js 进程的环境变量
4. **Shell**: 固定使用 `/bin/bash`
5. **超时限制**: 最长 5 分钟

## 日志 (Logging)

所有 bash 命令执行都会被记录：

```
[bash] Executing: git status
[bash] Executing: npm test
[bash] Executing: ls -la
```

这有助于调试和审计。

## 总结 (Summary)

`bash` 工具是 Kraken 最强大的工具之一，允许执行系统级操作：

✅ **优势:**
- 灵活：几乎可以执行任何命令
- 强大：访问完整的 bash 功能
- 实用：git、npm、测试等必备

⚠️ **注意:**
- 谨慎使用破坏性命令
- 注意超时限制
- 优先使用专用工具（read_file、write_file 等）

**最佳实践:** 将 bash 用于其擅长的领域（git、npm、系统工具），对于文件操作使用专用工具。
