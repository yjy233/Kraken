# Kraken 配置说明

## 配置来源与优先级（由低到高）
1. 环境变量
2. `~/.Kraken/Kraken.json`
3. 工作目录下 `./.Kraken/Kraken.json`

同名字段会被更高优先级覆盖；未提供的字段会沿用低优先级的值。

## Kraken.json 位置
- 用户级：`~/.Kraken/Kraken.json`
- 工作区级：`./.Kraken/Kraken.json`

文件格式为标准 JSON 对象（不支持注释）。

## 字段说明（Kraken.json / 环境变量）

| 字段 | 类型 | 说明 | 默认/行为 | 对应环境变量 |
| --- | --- | --- | --- | --- |
| `protocol` | `"openai" \| "gemini" \| "claude"` | 选择 LLM 协议 | 默认 `openai` | `LLM_PROTOCOL` |
| `apiKey` | `string` | API Key（必填） | 无默认值 | `LLM_API_KEY`（若无则用 `OPENAI_API_KEY`） |
| `model` | `string` | 主模型名称 | 默认 `gpt-4o-mini` | `LLM_MODEL`（若无则用 `OPENAI_MODEL`） |
| `summaryModel` | `string` | 会话压缩模型 | 默认跟随 `model` | `LLM_SUMMARY_MODEL`（若无则用 `OPENAI_SUMMARY_MODEL`） |
| `baseUrl` | `string` | API Base URL | 未配置时使用客户端默认 | `LLM_BASE_URL`（若无则用 `OPENAI_BASE_URL`） |
| `anthropicVersion` | `string` | Claude 版本号 Header | 默认 `2023-06-01` | `ANTHROPIC_VERSION` |
| `timeoutMs` | `number` | 请求超时（毫秒） | 默认 `60000` | `LLM_TIMEOUT_MS` |
| `workspaceRoot` | `string` | 工作区根目录 | 默认当前启动目录 | `WORKSPACE_ROOT` |
| `sandboxRoot` | `string` | Sandbox 根目录 | 若 `workspaceRoot` 未设置则使用 | `SANDBOX_ROOT` |
| `sandboxAllowedDirs` | `string[]` | 额外可访问目录白名单 | 默认仅 `workspaceRoot` | `SANDBOX_ALLOWED_DIRS`（逗号分隔） |
| `sandboxMaxFileBytes` | `number` | Sandbox 单文件最大读取大小 | 默认 `1048576` | `SANDBOX_MAX_FILE_BYTES` |
| `maxSessionTokens` | `number` | 会话最大 token（估算） | 默认 `4000` | `MAX_SESSION_TOKENS` |
| `summaryTargetTokens` | `number` | 压缩摘要目标 token | 默认 `600` | `SUMMARY_TARGET_TOKENS` |
| `maxIterations` | `number` | ReAct 最大步骤数 | 默认 `6` | `REACT_MAX_STEPS` |
| `temperature` | `number` | 采样温度 | 默认 `0.2` | `REACT_TEMPERATURE` |
| `logLevel` | `string` | 日志级别 | 默认 `info` | `LOG_LEVEL` |

### `baseUrl` 默认值
- OpenAI：`https://api.openai.com/v1`
- Gemini：`https://generativelanguage.googleapis.com/v1beta`
- Claude：`https://api.anthropic.com/v1`

> 如果未配置 `baseUrl`，会使用对应客户端的默认值。

## 仅支持环境变量的网络工具配置
以下参数当前只读取环境变量（不在 Kraken.json 中生效）：

- `ALLOW_NETWORK`：设为 `true` 时启用 `web_fetch` / `browser` / `web_search`
- `WEB_SEARCH_ENDPOINT`：`web_search` 的服务地址
- `WEB_SEARCH_API_KEY`：`web_search` 的 API Key

## Kraken.json 示例

`~/.Kraken/Kraken.json`（全局默认）：
```json
{
  "protocol": "openai",
  "apiKey": "YOUR_KEY",
  "model": "gpt-4o-mini",
  "summaryModel": "gpt-4o-mini",
  "logLevel": "info"
}
```

`./.Kraken/Kraken.json`（当前工作区覆盖）：
```json
{
  "protocol": "claude",
  "apiKey": "YOUR_KEY",
  "model": "claude-3-5-sonnet-20241022",
  "anthropicVersion": "2023-06-01",
  "sandboxAllowedDirs": ["/Users/bill/code/Kraken"],
  "maxIterations": 8
}
```
