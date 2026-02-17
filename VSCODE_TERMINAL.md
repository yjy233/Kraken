# Kraken VS Code 终端插件

## 功能说明

Kraken VS Code 插件现在包含一个完整的集成终端，可以直接在 VS Code 侧边栏中运行 shell 命令。

## 主要特性

✅ **完整的终端模拟器**
- 基于 xterm.js 的专业终端界面
- 支持颜色、光标移动等终端特性
- 自动适配 VS Code 主题

✅ **真实 Shell 环境**
- 使用 node-pty 创建真实的伪终端进程
- macOS/Linux: 使用用户默认 shell (bash/zsh)
- Windows: 使用 PowerShell
- 工作目录自动设置为当前工作区

✅ **原生集成**
- 显示在 VS Code 活动栏
- 支持终端调整大小
- 进程管理（自动清理）

## 安装方法

### 1. 从源码安装

```bash
# 确保依赖已安装
npm install

# 构建插件
npm run build:vscode

# 打包为 .vsix 文件
npm run package:vscode

# 在 VS Code 中安装
code --install-extension kraken.vsix
```

### 2. 手动安装

1. 打开 VS Code
2. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
3. 输入 "Extensions: Install from VSIX..."
4. 选择 `kraken.vsix` 文件

## 使用方法

### 打开终端

方式一：点击活动栏中的终端图标 (📟)

方式二：使用命令面板
1. 按 `Cmd+Shift+P` / `Ctrl+Shift+P`
2. 输入 "Kraken: Open Terminal"
3. 回车

### 使用终端

- **输入命令**：直接在终端中输入，支持所有标准终端快捷键
- **复制粘贴**：使用标准快捷键 `Cmd+C` / `Cmd+V`
- **清屏**：输入 `clear` 或 `Ctrl+L`
- **退出**：关闭侧边栏或输入 `exit`

### 常用命令示例

```bash
# 查看当前目录
pwd

# 列出文件
ls -la

# 运行 Kraken CLI
npm run dev

# Git 操作
git status
git log

# 安装依赖
npm install

# 运行测试
npm test
```

## 技术架构

```
VS Code Extension
├── Extension Host
│   ├── KrakenChatProvider
│   │   └── node-pty (真实 shell 进程)
│   └── Message Passing
└── Webview
    └── xterm.js (终端 UI)
```

### 通信流程

```
用户输入 → xterm.js
    ↓ postMessage
Extension Host → node-pty
    ↓ shell 输出
Extension Host
    ↓ postMessage
xterm.js → 显示输出
```

## 配置

### 环境变量

终端继承 VS Code 进程的所有环境变量，包括：
- `PATH`
- `HOME`
- `USER`
- 自定义环境变量

### Shell 选择

- **macOS/Linux**: 使用 `$SHELL` 环境变量指定的 shell
- **Windows**: 使用 `powershell.exe`

可以通过设置环境变量来更改：
```bash
export SHELL=/bin/zsh  # 使用 zsh
export SHELL=/bin/bash # 使用 bash
```

## 注意事项

⚠️ **node-pty 编译**
- node-pty 需要本地编译
- 确保系统安装了构建工具：
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: build-essential, python3
  - Windows: Visual Studio Build Tools

⚠️ **进程管理**
- 关闭侧边栏时，终端进程会自动终止
- 重新打开会创建新的 shell 会话

⚠️ **安全性**
- 终端拥有与 VS Code 相同的权限
- 可以访问文件系统和执行任意命令
- 请谨慎执行不可信的命令

## 与 CLI 模式对比

| 特性 | VS Code 终端插件 | CLI 模式 |
|------|-----------------|---------|
| 界面 | VS Code 侧边栏 | 独立终端 |
| Shell | 真实 shell 进程 | readline 包装 |
| 颜色支持 | ✅ 完整支持 | ✅ ANSI 颜色 |
| 集成 | VS Code 原生 | 独立运行 |
| 启动 | 点击图标 | `npm run dev` |
| 工作区 | 自动检测 | 需手动 cd |

## 故障排除

### 终端无法启动

1. 检查 node-pty 是否正确安装：
   ```bash
   npm list node-pty
   ```

2. 重新构建 node-pty：
   ```bash
   npm rebuild node-pty
   ```

### 终端显示乱码

- 确保 VS Code 使用 UTF-8 编码
- 检查 shell 配置文件 (.bashrc, .zshrc) 中的 locale 设置

### 无法看到终端图标

1. 重新加载 VS Code 窗口：
   - `Cmd+Shift+P` → "Developer: Reload Window"

2. 检查插件是否已激活：
   - 查看 "Extensions" 面板

## 开发和调试

### 查看日志

1. 打开开发者工具：`Help` → `Toggle Developer Tools`
2. 查看 Console 中的日志输出

### 重新加载插件

修改代码后：
```bash
# 重新构建
npm run build:vscode

# 在 VS Code 中重新加载窗口
Cmd+Shift+P → "Developer: Reload Window"
```

## 后续优化建议

- [ ] 添加多终端支持（标签页）
- [ ] 保存终端历史
- [ ] 自定义终端主题
- [ ] 添加右键菜单（复制/粘贴/清屏）
- [ ] 支持终端分屏
- [ ] 集成 Kraken AI 命令建议

## 相关文件

- `src/vscode/extension.ts` - 插件入口
- `src/vscode/chatProvider.ts` - 终端提供者（包含 xterm.js 集成）
- `package.json` - 插件配置和命令注册
- `package.vscode.json` - VS Code 特定配置

## 许可证

与 Kraken 主项目相同
