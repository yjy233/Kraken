# Kraken AI Assistant (TypeScript)

![Kraken AI Assistant Logo](assets/logo.svg)

A minimal ReAct-style AI assistant in TypeScript with a simple sandbox, OpenAI-compatible LLM client, session compression, tool system, and Feishu WebSocket event intake.

## Features
- ReAct loop with tool execution
- Soft sandbox for file access (allowlisted paths)
- OpenAI-style chat completions client (compatible providers)
- Session compression via summarization
- Built-in tools: `write_todo`, `read_file`, `web_fetch`, `browser`, `web_search`
- Feishu WebSocket event intake (event subscription WS)

## Quick start
```bash
npm install
npm run dev
```

## Configuration
Set environment variables (use `.env` or export in shell):

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (optional, default: `https://api.openai.com/v1`)
- `OPENAI_SUMMARY_MODEL` (optional, defaults to `OPENAI_MODEL`)
- `RUN_MODE` (`cli` or `feishu`, default: `feishu`)

### ReAct
- `REACT_MAX_STEPS` (default: `6`)
- `REACT_TEMPERATURE` (default: `0.2`)

### Session compression
- `MAX_SESSION_TOKENS` (default: `4000`)
- `SUMMARY_TARGET_TOKENS` (default: `600`)

### Sandbox
- `SANDBOX_ROOT` (default: `process.cwd()`)
- `SANDBOX_ALLOWED_DIRS` (comma-separated absolute paths)
- `SANDBOX_MAX_FILE_BYTES` (default: `1048576`)

### Network tools
- `ALLOW_NETWORK` set to `true` to enable `web_fetch` and `web_search`
- `WEB_SEARCH_ENDPOINT` (optional)
- `WEB_SEARCH_API_KEY` (optional)

### Feishu WebSocket event subscription
- `FEISHU_WS_URL` (required to enable Feishu)
- `FEISHU_WS_HEADERS` (optional JSON string for auth headers)

## Notes on the sandbox
This is a **soft sandbox**: it restricts file access to allowlisted directories and limits file size, but does not provide OS-level isolation. For stronger isolation, wrap tool execution in a container or VM.

## Example usage
### CLI mode
```bash
export RUN_MODE=cli
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4o-mini
npm run dev
```

### Feishu mode
```bash
export RUN_MODE=feishu
export OPENAI_API_KEY=your_key
export OPENAI_MODEL=gpt-4o-mini
export FEISHU_WS_URL=wss://your-feishu-endpoint
npm run dev
```

## Project structure
```
src/
  agent/          # ReAct loop
  llm/            # OpenAI-compatible client
  sandbox/        # soft sandbox
  session/        # session compression
  tools/          # tool registry + builtin tools
  integrations/   # Feishu WS
  utils/          # helpers
```
