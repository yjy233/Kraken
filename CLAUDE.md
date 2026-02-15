# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Kraken is a minimal ReAct-style AI assistant implemented in TypeScript. It features a soft sandbox for file access, an OpenAI-compatible LLM client, session compression via summarization, a tool execution system, and a MessageBus-based architecture for decoupled communication.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (uses tsx)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run production build
npm start
```

## Architecture

### Core Components

**ReAct Agent (`src/core/agent/ReActAgent.ts`)**
- Implements the ReAct (Reasoning + Acting) loop
- Uses OpenAI's standard function calling format with `tools` parameter
- Handles tool calls via `tool_calls` response field
- Orchestrates LLM calls, tool execution, and session management
- Maximum iterations controlled by `REACT_MAX_STEPS` (default: 6)
- Emits events to MessageBus for real-time communication
- Enhanced system prompt encourages task decomposition and strategic tool use
- Supports custom system prompts via `options.systemPrompt`

**Agent Prompts (`src/core/agent/prompts/`)**
- Comprehensive system prompt that guides agent reasoning and behavior
- Encourages use of `write_todo` tool for complex multi-step tasks
- Promotes structured thinking: Reason → Act → Observe → Repeat
- Includes tool usage guidelines and task decomposition protocols
- Customizable via `buildCustomSystemPrompt()` helper
- See `src/core/agent/prompts/README.md` for customization guide

**MessageBus (`src/core/messagebus/MessageBus.ts`)**
- Event-based communication system using Node.js EventEmitter
- Typed events: `agent:thinking`, `agent:tool_call`, `agent:tool_result`, `agent:response`, `agent:error`, `system:log`
- Enables decoupled architecture between core logic and UI layer
- Optional integration - Agent works with or without MessageBus

**Sandbox (`src/core/sandbox/Sandbox.ts`)**
- Soft sandbox restricting file access to allowlisted directories
- NOT OS-level isolation - only enforces path allowlisting and file size limits
- Three operations: `readFile()`, `writeFile()`, `appendFile()`
- Paths resolved relative to `SANDBOX_ROOT` or validated against `SANDBOX_ALLOWED_DIRS`

**Session Store (`src/core/session/SessionStore.ts`)**
- Manages conversation history per session ID
- Auto-compresses when token count exceeds `MAX_SESSION_TOKENS`
- Compression: keeps last 6 messages as tail, summarizes the rest via LLM
- Summary injected as system message to preserve context

**Tool Registry (`src/core/tools/ToolRegistry.ts`)**
- Simple map-based registry of available tools
- Builtin tools in `src/core/tools/core_tool/`: `read_file`, `write_file`, `write_todo`, `grep`, `glob`, `bash`, `web_fetch`, `browser`, `web_search`
- Tools receive `ToolContext` containing `sandbox`, `sessionId`, and `logger`
- File tools: `read_file`, `write_file`, `grep` (search in files), `glob` (find files by pattern)
- System tools: `bash` (execute shell commands)
- Network tools require `ALLOW_NETWORK=true`: `web_fetch`, `browser`, `web_search`

**LLM Client (`src/core/llm/OpenAIClient.ts`)**
- Thin wrapper around OpenAI-compatible chat completion API
- Supports custom `OPENAI_BASE_URL` for alternative providers
- Separate model config for main responses and summarization
- Supports standard OpenAI function calling with `tools` parameter
- Returns typed `tool_calls` in responses

### Modes

**CLI Mode (`src/cli/`)**
- Interactive readline interface with beautiful UI
- Colorful card-style message boxes for all outputs
- Tool calls displayed in yellow cards with formatted input
- Tool results shown in green (success) or red (error) cards
- Thinking process displayed in cyan cards
- Creates MessageBus and subscribes to agent events
- Displays thinking process, tool calls, and results in real-time
- Single session ID: "cli"
- Factory function `createCLI()` for easy instantiation
- UI utilities in `src/cli/ui.ts` with ANSI colors and box drawing

## Configuration

All configuration via environment variables (see `.env` or shell exports):

**Required:**
- `OPENAI_API_KEY`

**Common:**
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (for alternative providers)
- `OPENAI_SUMMARY_MODEL` (defaults to `OPENAI_MODEL`)
- `REACT_MAX_STEPS` (default: 6)
- `REACT_TEMPERATURE` (default: 0.2)
- `MAX_SESSION_TOKENS` (default: 4000)
- `SUMMARY_TARGET_TOKENS` (default: 600)
- `ALLOW_NETWORK` (set to `true` to enable `web_fetch`, `browser`, `web_search`)

**For Sandbox:**
- `SANDBOX_ROOT` (default: current working directory)
- `SANDBOX_ALLOWED_DIRS` (comma-separated absolute paths)
- `SANDBOX_MAX_FILE_BYTES` (default: 1048576)

**For Web Search:**
- `WEB_SEARCH_ENDPOINT` (required if using `web_search` tool)
- `WEB_SEARCH_API_KEY` (required if using `web_search` tool)

## Adding New Tools

1. Create a new tool file in `src/core/tools/core_tool/` following the `ToolDefinition` interface
2. Tool receives typed `input` and `context` (sandbox, sessionId, logger)
3. Return `ToolResult` with `ok: boolean` and `content: string`
4. Export from `src/core/tools/core_tool/index.ts` and add to the tool registry

## Key Patterns

- Uses OpenAI's standard function calling format
- Tools are registered with JSON Schema in the `tools` parameter
- LLM returns `tool_calls` array when it wants to use tools
- Tool results use `tool_call_id` to track which call they respond to
- Session compression happens automatically when token threshold exceeded
- Token counting is approximate: `text.length / 4`
- Sandbox throws errors for paths outside allowlist - no bypass mechanism
- Network tools require explicit opt-in via `ALLOW_NETWORK=true`
- Tool execution results feed back into the ReAct loop as messages with `role: "tool"`
