# 修复 "posix_spawnp failed" 终端错误

## 问题原因

`posix_spawnp failed` 错误通常由以下原因导致：

1. **SHELL 环境变量未设置或指向不存在的路径**
2. **node-pty 预构建二进制文件 ABI 版本与 VS Code 不兼容**
3. **spawn-helper 缺少执行权限**

## 快速修复步骤

### 步骤 1: 检查 SHELL 环境变量

在终端中运行：
```bash
echo $SHELL
```

如果输出为空或指向不存在的路径，请设置：
```bash
export SHELL=/bin/zsh  # macOS 默认，或改为你的 shell
```

永久设置（推荐）：
```bash
echo 'export SHELL=/bin/zsh' >> ~/.zshrc
# 如果使用 bash：
# echo 'export SHELL=/bin/bash' >> ~/.bashrc
```

### 步骤 2: 重新安装插件

```bash
# 1. 卸载旧版本
code --uninstall-extension kraken-ai-assistant-v36

# 2. 清理扩展目录（重要！）
rm -rf ~/.vscode/extensions/kraken-ai-assistant-v36-*

# 3. 重新安装
code --install-extension kraken.vsix

# 4. 重启 VS Code
```

### 步骤 3: 修复权限问题（如果上述步骤无效）

如果问题仍然存在，可能是 `spawn-helper` 缺少执行权限：

```bash
# 找到 VS Code 扩展目录中的 node-pty
EXT_DIR=~/.vscode/extensions/kraken-ai-assistant-v36-*/node_modules/node-pty

# 添加执行权限
chmod +x $EXT_DIR/prebuilds/darwin-arm64/spawn-helper
chmod +x $EXT_DIR/prebuilds/darwin-x64/spawn-helper

# 重启 VS Code
```

## 替代方案：使用 CLI 模式

如果 VS Code 终端插件无法工作，可以暂时使用 CLI 模式：

```bash
cd /Users/bill/code/Kraken
npm run dev
```

## 运行诊断脚本

项目包含一个诊断脚本，可以帮助排查问题：

```bash
cd /Users/bill/code/Kraken
./diagnose-terminal.sh
```

## 如果问题仍然存在

请检查 VS Code 的开发者工具控制台获取详细错误信息：

1. 在 VS Code 中按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 "Developer: Toggle Developer Tools"
3. 切换到 Console 标签
4. 尝试打开 Kraken Terminal，查看错误日志

常见错误及解决方案：

| 错误信息 | 解决方案 |
|---------|---------|
| `posix_spawnp failed` | 检查 SHELL 环境变量 |
| `spawn ENOENT` | shell 路径不存在，检查 `$SHELL` |
| `Module did not self-register` | node-pty 版本不兼容，需要重新编译 |
| `cannot find module 'node-pty'` | 重新安装插件 |

## 已知限制

- VS Code 的 Node.js 版本需要与 node-pty 预构建版本兼容
- 某些 Linux 发行版可能需要手动安装 `build-essential` 和 `python3` 来编译 node-pty

## 获取帮助

如果以上步骤都无法解决问题，请提供：
1. VS Code 版本 (`code --version`)
2. 操作系统版本
3. SHELL 环境变量值 (`echo $SHELL`)
4. VS Code 开发者工具控制台中的完整错误日志
