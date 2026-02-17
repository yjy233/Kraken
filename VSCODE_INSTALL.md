# Kraken VS Code 插件安装和使用指南

## 安装步骤

1. **确保已配置环境变量**
   在项目根目录创建 `.env` 文件：
   ```bash
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_BASE_URL=https://api.openai.com/v1  # 可选，使用其他 API 提供商
   ```

2. **安装插件**
   - 在 VS Code 中按 `Cmd+Shift+P`（Mac）或 `Ctrl+Shift+P`（Windows/Linux）
   - 输入 `Extensions: Install from VSIX...`
   - 选择 `kraken.vsix` 文件

3. **重新加载 VS Code**
   - 安装完成后，点击 "Reload Window" 或重启 VS Code

## 使用方法

### 打开侧边栏

安装成功后，你会在左侧活动栏看到 Kraken 图标（章鱼图标）。点击它会打开 Kraken 聊天侧边栏。

### 与 Kraken 对话

1. 在侧边栏底部的输入框中输入你的问题或任务
2. 按 `Cmd+Enter`（Mac）或 `Ctrl+Enter`（Windows/Linux）发送，或点击 "Send" 按钮
3. Kraken 会显示：
   - **思考过程**（蓝色边框）- Kraken 的推理步骤
   - **工具调用**（黄色边框）- Kraken 使用的工具和参数
   - **工具结果**（黄色边框）- 工具执行的结果
   - **最终回复**（绿色边框）- Kraken 的回答

### 清除会话

点击 "Clear Session" 按钮可以清除当前的对话历史，开始新的会话。

## 功能特性

- **ReAct 推理循环**：Kraken 使用 Reasoning + Acting 模式，逐步思考和执行任务
- **内置工具**：
  - `read_file` - 读取文件内容
  - `write_file` - 写入文件
  - `edit_file` - 编辑文件的特定部分
  - `grep` - 搜索文件内容
  - `glob` - 查找文件
  - `bash` - 执行 shell 命令
  - `write_todo` - 创建任务列表
- **自动上下文管理**：会话过长时自动压缩历史记录
- **工作区感知**：自动使用当前打开的工作区作为工作目录

## 配置选项

在 VS Code 设置中搜索 "Kraken" 可以配置：
- `kraken.model` - 使用的 LLM 模型（默认: gpt-4o-mini）
- `kraken.maxIterations` - 最大推理步数（默认: 6）
- `kraken.temperature` - 模型温度（默认: 0.2）

## 故障排除

### 插件没有显示
- 检查是否已重新加载 VS Code
- 查看 VS Code 开发者控制台（Help > Toggle Developer Tools）的错误信息

### API 调用失败
- 确认 `.env` 文件中的 `OPENAI_API_KEY` 已正确设置
- 检查网络连接
- 查看侧边栏中的错误消息

### 无法访问文件
- Kraken 只能访问当前打开的工作区目录
- 确保你在 VS Code 中打开了一个文件夹或工作区

## 示例用法

```
用户: 帮我创建一个简单的 TypeScript 配置文件

Kraken: [思考] 我需要创建一个 tsconfig.json 文件...
        [工具调用] write_file
        [工具结果] 文件已创建
        [回复] 我已经为你创建了 tsconfig.json 文件...
```

## 更新插件

1. 运行 `npm run package:vscode` 生成新的 `.vsix` 文件
2. 在 VS Code 中卸载旧版本
3. 重新安装新的 `.vsix` 文件
