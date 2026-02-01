# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Kraken is a minimal ReAct-style AI assistant implemented in TypeScript. It features a soft sandbox for file access, an OpenAI-compatible LLM client, session compression via summarization, a tool execution system, and Feishu WebSocket event intake.

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (uses tsx)
npm run dev

# Build TypeScript to JavaScript
npm build

# Run production build
npm start
```

## Architecture

### Core Components

**ReAct Agent (`src/agent/ReActAgent.ts`)**
- Implements the ReAct (Reasoning + Acting) loop
- Parses LLM responses expecting JSON format: `{"type":"tool","tool_name":string,"tool_input":object}` or `{"type":"final","final":string}`
- Orchestrates LLM calls, tool execution, and session management
- Maximum iterations controlled by `REACT_MAX_STEPS` (default: 6)

**Sandbox (`src/sandbox/Sandbox.ts`)**
- Soft sandbox restricting file access to allowlisted directories
- NOT OS-level isolation - only enforces path allowlisting and file size limits
- Three operations: `readFile()`, `writeFile()`, `appendFile()`
- Paths resolved relative to `SANDBOX_ROOT` or validated against `SANDBOX_ALLOWED_DIRS`

**Session Store (`src/session/SessionStore.ts`)**
- Manages conversation history per session ID
- Auto-compresses when token count exceeds `MAX_SESSION_TOKENS`
- Compression: keeps last 6 messages as tail, summarizes the rest via LLM
- Summary injected as system message to preserve context

**Tool Registry (`src/tools/ToolRegistry.ts`)**
- Simple map-based registry of available tools
- Builtin tools in `src/tools/builtin.ts`: `read_file`, `write_todo`, `web_fetch`, `browser`, `web_search`
- Tools receive `ToolContext` containing `sandbox`, `sessionId`, and `logger`

**LLM Client (`src/llm/OpenAIClient.ts`)**
- Thin wrapper around OpenAI-compatible chat completion API
- Supports custom `OPENAI_BASE_URL` for alternative providers
- Separate model config for main responses and summarization

### Modes

**CLI Mode** (`RUN_MODE=cli`)
- Interactive readline interface
- Single session ID: "cli"
- User types messages, agent responds

**Feishu Mode** (`RUN_MODE=feishu`, default)
- Connects to Feishu WebSocket endpoint
- Processes events as JSON strings
- Single session ID: "feishu"
- Requires `FEISHU_WS_URL` to be set

## Configuration

All configuration via environment variables (see `.env` or shell exports):

**Required:**
- `OPENAI_API_KEY`

**Common:**
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (for alternative providers)
- `RUN_MODE` (`cli` or `feishu`)
- `REACT_MAX_STEPS` (default: 6)
- `MAX_SESSION_TOKENS` (default: 4000)
- `ALLOW_NETWORK` (set to `true` to enable `web_fetch`, `browser`, `web_search`)

**For Feishu:**
- `FEISHU_WS_URL` (WebSocket endpoint)
- `FEISHU_WS_HEADERS` (JSON string for auth headers)

## Adding New Tools

1. Define tool in `src/tools/builtin.ts` following the `ToolDefinition` interface
2. Tool receives typed `input` and `context` (sandbox, sessionId, logger)
3. Return `ToolResult` with `ok: boolean` and `content: string`
4. Add to array returned by `createBuiltinTools()`

## Key Patterns

- All LLM responses must be valid JSON with `type` field
- Session compression happens automatically when token threshold exceeded
- Sandbox throws errors for paths outside allowlist - no bypass mechanism
- Network tools require explicit opt-in via `ALLOW_NETWORK=true`
- Tool execution results feed back into the ReAct loop as messages with `role: "tool"`
