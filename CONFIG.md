# Kraken Configuration Guide

Complete reference for all configuration options in `Kraken.json`.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration Loading](#configuration-loading)
- [Agent Configuration](#agent-configuration)
- [LLM Configuration](#llm-configuration)
- [Session Management](#session-management)
- [Sandbox Configuration](#sandbox-configuration)
- [Tool Configuration](#tool-configuration)
- [Model Information Cache](#model-information-cache)
- [CLI Configuration](#cli-configuration)
- [Logging Configuration](#logging-configuration)
- [Advanced Configuration](#advanced-configuration)
- [Environment Variables](#environment-variables)

---

## Quick Start

### 1. Create Kraken.json

Copy the example `Kraken.json` to your project root and customize as needed.

### 2. Set Environment Variables

```bash
# Required
export OPENAI_API_KEY="your-api-key"

# Optional
export ARK_API_KEY="your-ark-api-key"
export WEB_SEARCH_ENDPOINT="https://api.search.com/v1"
export WEB_SEARCH_API_KEY="your-search-key"
```

### 3. Load Configuration in Code

```typescript
import { loadConfig, validateConfig } from "./config/loader";

const config = loadConfig("./Kraken.json");

// Validate
const errors = validateConfig(config);
if (errors.length > 0) {
  console.error("Configuration errors:", errors);
  process.exit(1);
}

// Use configuration
console.log("Using model:", config.agent.model);
```

---

## Configuration Loading

### Loading Order

1. **Default values** from `DEFAULT_CONFIG` in `src/config/types.ts`
2. **File values** from `Kraken.json` (merged with defaults)
3. **Environment variable substitution** (`${VAR_NAME}` syntax)
4. **Environment variable overrides** (based on `env.mapping`)

### Environment Variable Substitution

Special variables:
- `${CWD}` - Current working directory
- `${HOME}` - User home directory
- `${ENV_VAR}` - Any environment variable

Example:
```json
{
  "sandbox": {
    "rootDir": "${CWD}",
    "allowedDirs": ["${HOME}/Documents"]
  }
}
```

---

## Agent Configuration

Controls the ReAct agent behavior.

### `agent.model`

**Type**: `string`
**Default**: `"gpt-4o-mini"`
**Environment**: `OPENAI_MODEL`

The LLM model to use for the main agent loop.

**Examples**:
- `"gpt-4o-mini"` - Fast and economical
- `"gpt-4-turbo"` - High performance
- `"claude-3-opus-20240229"` - Anthropic Claude
- `"ep-20241101-xxxxx"` - Custom Ark endpoint

### `agent.maxIterations`

**Type**: `number`
**Default**: `6`
**Range**: `1-20`
**Environment**: `REACT_MAX_STEPS`

Maximum number of ReAct loop iterations before giving up.

**Recommendations**:
- Simple tasks: `3-5`
- Complex tasks: `6-10`
- Very complex: `10-20`

⚠️ Higher values = more API calls = higher cost

### `agent.temperature`

**Type**: `number`
**Default**: `0.2`
**Range**: `0.0-2.0`
**Environment**: `REACT_TEMPERATURE`

LLM sampling temperature. Lower = more focused, higher = more creative.

**Recommendations**:
- Coding tasks: `0.0-0.3`
- Writing tasks: `0.5-0.8`
- Creative tasks: `0.8-1.5`

### `agent.systemPrompt`

**Type**: `string | null`
**Default**: `null`

Custom system prompt. If `null`, uses the default ReAct prompt from `src/core/agent/prompts/systemPrompt.ts`.

**Example**:
```json
{
  "agent": {
    "systemPrompt": "You are a helpful coding assistant specialized in TypeScript."
  }
}
```

---

## LLM Configuration

Controls the LLM client behavior.

### `llm.provider`

**Type**: `"openai" | "azure" | "volcengine-ark" | "anthropic"`
**Default**: `"openai"`

LLM provider to use.

### `llm.apiKey`

**Type**: `string`
**Required**: Yes
**Environment**: `OPENAI_API_KEY`

API key for the LLM provider. Use `${OPENAI_API_KEY}` syntax to load from environment.

### `llm.baseUrl`

**Type**: `string`
**Default**: `"https://api.openai.com/v1"`
**Environment**: `OPENAI_BASE_URL`

Base URL for the LLM API.

**Examples**:
- OpenAI: `"https://api.openai.com/v1"`
- Volcengine Ark: `"https://ark.cn-beijing.volces.com"`
- Local: `"http://localhost:8000/v1"`

### `llm.timeoutMs`

**Type**: `number`
**Default**: `60000` (1 minute)

Request timeout in milliseconds.

### `llm.maxRetries`

**Type**: `number`
**Default**: `3`

Number of retry attempts on network errors.

### `llm.summaryModel`

**Type**: `string | null`
**Default**: `null`
**Environment**: `OPENAI_SUMMARY_MODEL`

Model for session compression. If `null`, uses `agent.model`.

**Recommendation**: Use a cheaper/faster model like `"gpt-4o-mini"` for summarization.

---

## Session Management

Controls conversation history and compression.

### `session.maxTokens`

**Type**: `number`
**Default**: `4000`
**Environment**: `MAX_SESSION_TOKENS`

Trigger compression when session exceeds this token count.

**Recommendations**:
- Based on model context window
- Leave room for response: `contextWindow * 0.6`
- Example: For 8K model, use `4000-5000`

### `session.compressionTargetTokens`

**Type**: `number`
**Default**: `600`
**Environment**: `SUMMARY_TARGET_TOKENS`

Target token count after compression.

**Must be**: Less than `maxTokens`

### `session.compressionEnabled`

**Type**: `boolean`
**Default**: `true`

Enable/disable automatic session compression.

### `session.keepRecentMessages`

**Type**: `number`
**Default**: `6`

Number of recent messages to preserve during compression (not summarized).

---

## Sandbox Configuration

Controls file system access restrictions.

### `sandbox.rootDir`

**Type**: `string`
**Default**: `"${CWD}"`
**Environment**: `SANDBOX_ROOT`

Root directory for resolving relative paths.

### `sandbox.allowedDirs`

**Type**: `string[]`
**Default**: `["${CWD}"]`
**Environment**: `SANDBOX_ALLOWED_DIRS` (comma-separated)

Array of absolute paths the sandbox can access.

**Example**:
```json
{
  "sandbox": {
    "allowedDirs": [
      "${CWD}",
      "${HOME}/Documents/kraken-data",
      "/tmp/kraken"
    ]
  }
}
```

⚠️ **Security**: Only list trusted directories!

### `sandbox.maxFileSizeBytes`

**Type**: `number`
**Default**: `1048576` (1 MB)
**Environment**: `SANDBOX_MAX_FILE_BYTES`

Maximum file size that can be read or written.

**Examples**:
- 1 MB: `1048576`
- 10 MB: `10485760`
- 100 MB: `104857600`

### `sandbox.allowSymlinks`

**Type**: `boolean`
**Default**: `false`

Allow following symbolic links.

⚠️ **Security**: Symlinks can escape sandbox - only enable if needed!

---

## Tool Configuration

Controls which tools are available and their settings.

### `tools.enabled`

**Type**: `string[]`
**Default**: `[]` (all tools enabled)

Array of enabled tool names. If empty, all tools are enabled.

**Available tools**:
- `"read_file"` - Read file contents
- `"write_file"` - Write/overwrite files
- `"edit_file"` - Edit files (search/replace, regex, line-range)
- `"write_todo"` - Write to TODO file
- `"grep"` - Search file contents
- `"glob"` - Find files by pattern
- `"bash"` - Execute shell commands
- `"web_fetch"` - Fetch web content
- `"browser"` - Automated browsing
- `"web_search"` - Web search

**Example** (only enable file tools):
```json
{
  "tools": {
    "enabled": ["read_file", "write_file", "edit_file", "grep", "glob"]
  }
}
```

### Network Tools

#### `tools.network.enabled`

**Type**: `boolean`
**Default**: `false`
**Environment**: `ALLOW_NETWORK`

Enable network tools (`web_fetch`, `browser`, `web_search`).

⚠️ **Security**: Network access can leak data - only enable if needed!

#### `tools.network.allowedDomains`

**Type**: `string[]`
**Default**: `[]` (all domains allowed)

Whitelist of allowed domains. Empty = all allowed.

**Example**:
```json
{
  "tools": {
    "network": {
      "enabled": true,
      "allowedDomains": [
        "api.github.com",
        "docs.python.org",
        "stackoverflow.com"
      ]
    }
  }
}
```

#### `tools.network.timeout`

**Type**: `number`
**Default**: `30000` (30 seconds)

Network request timeout in milliseconds.

### Bash Tool

#### `tools.bash.enabled`

**Type**: `boolean`
**Default**: `true`

Enable the bash tool.

#### `tools.bash.defaultTimeout`

**Type**: `number`
**Default**: `30000` (30 seconds)

Default timeout for bash commands.

#### `tools.bash.maxTimeout`

**Type**: `number`
**Default**: `300000` (5 minutes)

Maximum allowed timeout.

#### `tools.bash.shell`

**Type**: `string`
**Default**: `"/bin/bash"`

Shell to use for executing commands.

#### `tools.bash.allowedCommands`

**Type**: `string[]`
**Default**: `[]` (all commands allowed)

Whitelist of allowed commands. Empty = all allowed.

**Example**:
```json
{
  "tools": {
    "bash": {
      "allowedCommands": ["git", "npm", "node", "python", "ls", "cat"]
    }
  }
}
```

#### `tools.bash.blockedCommands`

**Type**: `string[]`
**Default**: `["rm -rf /", "dd if=/dev/zero"]`

Blacklist of dangerous commands.

### Web Search Tool

#### `tools.webSearch.provider`

**Type**: `"custom" | "google" | "bing" | "duckduckgo"`
**Default**: `"custom"`

Search provider to use.

#### `tools.webSearch.endpoint`

**Type**: `string`
**Required**: Yes (if using `web_search` tool)
**Environment**: `WEB_SEARCH_ENDPOINT`

Search API endpoint URL.

#### `tools.webSearch.apiKey`

**Type**: `string`
**Required**: Yes (if using `web_search` tool)
**Environment**: `WEB_SEARCH_API_KEY`

Search API key.

#### `tools.webSearch.maxResults`

**Type**: `number`
**Default**: `10`

Maximum number of search results to return.

---

## Model Information Cache

Manages model context window and pricing information.

### `modelInfo.sources`

**Type**: `ModelInfoSource[]`

Array of sources for model information. Sources are merged in order.

**Source types**:

1. **GitHub** (litellm database):
```json
{
  "type": "github",
  "url": "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json",
  "enabled": true
}
```

2. **Volcengine Ark API**:
```json
{
  "type": "ark",
  "apiKey": "${ARK_API_KEY}",
  "baseUrl": "https://ark.cn-beijing.volces.com",
  "enabled": true
}
```

3. **Custom URL**:
```json
{
  "type": "custom",
  "url": "https://your-company.com/models.json",
  "enabled": false
}
```

### `modelInfo.cacheExpiryMs`

**Type**: `number`
**Default**: `86400000` (24 hours)

Cache expiration time in milliseconds.

### `modelInfo.autoUpdate`

**Type**: `boolean`
**Default**: `true`

Auto-refresh cache when expired.

---

## CLI Configuration

Controls CLI display and colors.

### `cli.colors`

**Type**: `CLIColorsConfig`

Color scheme for different message types.

**Available colors**: `"yellow"`, `"green"`, `"red"`, `"blue"`, `"cyan"`, `"magenta"`, `"white"`, `"gray"`

**Example**:
```json
{
  "cli": {
    "colors": {
      "thinking": "cyan",
      "toolCall": "yellow",
      "toolSuccess": "green",
      "toolError": "red",
      "response": "blue"
    }
  }
}
```

### `cli.display.showTimestamps`

**Type**: `boolean`
**Default**: `true`

Show timestamps in CLI messages.

### `cli.display.showTokenCount`

**Type**: `boolean`
**Default**: `true`

Show token counts in messages.

### `cli.display.compactMode`

**Type**: `boolean`
**Default**: `false`

Reduce vertical spacing for compact display.

### `cli.display.maxCardWidth`

**Type**: `number`
**Default**: `80`

Maximum width of card-style messages.

---

## Logging Configuration

Controls logging behavior.

### `logging.level`

**Type**: `"debug" | "info" | "warn" | "error"`
**Default**: `"info"`

Minimum log level to display.

### `logging.file`

**Type**: `string | null`
**Default**: `null`

Log file path. `null` = no file logging.

**Example**:
```json
{
  "logging": {
    "file": "./logs/kraken.log"
  }
}
```

### `logging.console`

**Type**: `boolean`
**Default**: `true`

Enable console logging.

### `logging.structured`

**Type**: `boolean`
**Default**: `false`

Use JSON structured logs (useful for log aggregation).

---

## Advanced Configuration

Advanced settings for power users.

### `advanced.tokenCountMethod`

**Type**: `"approximate" | "tiktoken" | "gpt2"`
**Default**: `"approximate"`

Token counting method.

- `"approximate"`: Fast, divides text length by `approximateTokenDivisor`
- `"tiktoken"`: Accurate, uses OpenAI's tokenizer (requires installation)
- `"gpt2"`: Uses GPT-2 tokenizer

### `advanced.approximateTokenDivisor`

**Type**: `number`
**Default**: `4`

Divisor for approximate token counting.

**Typical values**:
- English: `4` (1 token ≈ 4 characters)
- Code: `3-4`
- Chinese: `2-3`

### `advanced.enableMessageBus`

**Type**: `boolean`
**Default**: `true`

Enable MessageBus event system for decoupled architecture.

### `advanced.gracefulShutdownMs`

**Type**: `number`
**Default**: `5000` (5 seconds)

Wait time for graceful shutdown.

---

## Environment Variables

### Loading .env File

**Config**: `env.loadDotenv`
**Default**: `true`

Load `.env` file on startup.

### Environment Variable Overrides

**Config**: `env.overrideWithEnv`
**Default**: `true`

Allow environment variables to override config file values.

### Variable Mapping

**Config**: `env.mapping`

Maps environment variables to config paths.

**Example mapping**:
```json
{
  "env": {
    "mapping": {
      "OPENAI_API_KEY": "llm.apiKey",
      "OPENAI_MODEL": "agent.model",
      "REACT_MAX_STEPS": "agent.maxIterations"
    }
  }
}
```

**Complete default mapping**:

| Environment Variable | Config Path |
|---------------------|-------------|
| `OPENAI_API_KEY` | `llm.apiKey` |
| `OPENAI_MODEL` | `agent.model` |
| `OPENAI_BASE_URL` | `llm.baseUrl` |
| `OPENAI_SUMMARY_MODEL` | `llm.summaryModel` |
| `REACT_MAX_STEPS` | `agent.maxIterations` |
| `REACT_TEMPERATURE` | `agent.temperature` |
| `MAX_SESSION_TOKENS` | `session.maxTokens` |
| `SUMMARY_TARGET_TOKENS` | `session.compressionTargetTokens` |
| `ALLOW_NETWORK` | `tools.network.enabled` |
| `SANDBOX_ROOT` | `sandbox.rootDir` |
| `SANDBOX_ALLOWED_DIRS` | `sandbox.allowedDirs` |
| `SANDBOX_MAX_FILE_BYTES` | `sandbox.maxFileSizeBytes` |
| `WEB_SEARCH_ENDPOINT` | `tools.webSearch.endpoint` |
| `WEB_SEARCH_API_KEY` | `tools.webSearch.apiKey` |
| `ARK_API_KEY` | `modelInfo.sources[1].apiKey` |
| `ARK_BASE_URL` | `modelInfo.sources[1].baseUrl` |

---

## Examples

### Minimal Configuration

```json
{
  "version": "1.0.0",
  "agent": {
    "model": "gpt-4o-mini"
  },
  "llm": {
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

### Development Configuration

```json
{
  "version": "1.0.0",
  "agent": {
    "model": "gpt-4o-mini",
    "maxIterations": 10,
    "temperature": 0.1
  },
  "llm": {
    "apiKey": "${OPENAI_API_KEY}",
    "baseUrl": "https://api.openai.com/v1"
  },
  "tools": {
    "enabled": ["read_file", "write_file", "edit_file", "grep", "glob", "bash"],
    "network": {
      "enabled": false
    }
  },
  "logging": {
    "level": "debug",
    "file": "./logs/dev.log",
    "console": true
  }
}
```

### Production Configuration

```json
{
  "version": "1.0.0",
  "agent": {
    "model": "gpt-4-turbo",
    "maxIterations": 6,
    "temperature": 0.2
  },
  "llm": {
    "apiKey": "${OPENAI_API_KEY}",
    "summaryModel": "gpt-4o-mini",
    "maxRetries": 5
  },
  "session": {
    "maxTokens": 8000,
    "compressionTargetTokens": 1000
  },
  "tools": {
    "network": {
      "enabled": true,
      "allowedDomains": ["api.github.com", "docs.python.org"]
    },
    "bash": {
      "allowedCommands": ["git", "npm", "node"],
      "blockedCommands": ["rm -rf /", "shutdown", "reboot"]
    }
  },
  "logging": {
    "level": "info",
    "file": "./logs/production.log",
    "structured": true
  }
}
```

---

## Validation

Use the built-in validator:

```typescript
import { loadConfig, validateConfig } from "./config/loader";

const config = loadConfig();
const errors = validateConfig(config);

if (errors.length > 0) {
  console.error("Configuration errors:");
  errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}
```

---

## See Also

- [Kraken.json](../Kraken.json) - Example configuration file
- [src/config/types.ts](../src/config/types.ts) - TypeScript type definitions
- [src/config/loader.ts](../src/config/loader.ts) - Configuration loader
- [CLAUDE.md](../CLAUDE.md) - Project overview
