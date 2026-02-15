/**
 * Kraken Configuration Types
 *
 * TypeScript type definitions for Kraken.json configuration file
 */

/**
 * Color options for CLI display
 */
export type Color = "yellow" | "green" | "red" | "blue" | "cyan" | "magenta" | "white" | "gray";

/**
 * Log level options
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Token counting methods
 */
export type TokenCountMethod = "approximate" | "tiktoken" | "gpt2";

/**
 * Web search provider options
 */
export type WebSearchProvider = "custom" | "google" | "bing" | "duckduckgo";

/**
 * LLM provider options
 */
export type LLMProvider = "openai" | "azure" | "volcengine-ark" | "anthropic";

/**
 * Model info source types
 */
export type ModelInfoSourceType = "github" | "ark" | "custom";

/**
 * ReAct Agent configuration
 */
export interface AgentConfig {
  /** LLM model name */
  model: string;

  /** Maximum number of ReAct loop iterations (1-20) */
  maxIterations: number;

  /** LLM temperature (0.0-2.0). Lower values = more focused */
  temperature: number;

  /** Custom system prompt. If null, uses default ReAct prompt */
  systemPrompt: string | null;
}

/**
 * Message compression configuration
 */
export interface CompressionConfig {
  /** Enable automatic message compression */
  enabled: boolean;

  /** Compression model (null = use summaryModel or main model) */
  model: string | null;

  /** Compression trigger threshold (0.5 = 50% of context window) */
  threshold: number;

  /** Maximum allowed percentage after compression (0.9 = 90%) */
  maxAllowedPercentage: number;

  /** Manually specified context window size (null = auto-detect from model info) */
  contextWindow: number | null;
}

/**
 * LLM Client configuration
 */
export interface LLMConfig {
  /** LLM provider */
  provider: LLMProvider;

  /** API key (can use ${ENV_VAR} syntax) */
  apiKey: string;

  /** API base URL */
  baseUrl: string;

  /** Request timeout in milliseconds */
  timeoutMs: number;

  /** Maximum number of retries on failure */
  maxRetries: number;

  /** Model for session compression. If null, uses main model */
  summaryModel: string | null;

  /** Message compression configuration */
  compression: CompressionConfig;
}

/**
 * Session management configuration
 */
export interface SessionConfig {
  /** Trigger compression when session exceeds this token count */
  maxTokens: number;

  /** Target token count after compression */
  compressionTargetTokens: number;

  /** Enable/disable automatic compression */
  compressionEnabled: boolean;

  /** Number of recent messages to preserve during compression */
  keepRecentMessages: number;
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  /** Root directory for relative paths */
  rootDir: string;

  /** Array of absolute paths the sandbox can access */
  allowedDirs: string[];

  /** Maximum file size in bytes */
  maxFileSizeBytes: number;

  /** Allow following symbolic links */
  allowSymlinks: boolean;
}

/**
 * Network tool configuration
 */
export interface NetworkToolConfig {
  /** Enable network tools (web_fetch, browser, web_search) */
  enabled: boolean;

  /** Whitelist of allowed domains (empty = all allowed) */
  allowedDomains: string[];

  /** Network request timeout in milliseconds */
  timeout: number;
}

/**
 * Bash tool configuration
 */
export interface BashToolConfig {
  /** Enable bash tool */
  enabled: boolean;

  /** Default command timeout in milliseconds */
  defaultTimeout: number;

  /** Maximum allowed timeout in milliseconds */
  maxTimeout: number;

  /** Shell to use */
  shell: string;

  /** Whitelist of allowed commands (empty = all allowed) */
  allowedCommands: string[];

  /** Blacklist of dangerous commands */
  blockedCommands: string[];
}

/**
 * Web search tool configuration
 */
export interface WebSearchToolConfig {
  /** Search provider */
  provider: WebSearchProvider;

  /** Search API endpoint */
  endpoint: string;

  /** Search API key */
  apiKey: string;

  /** Maximum number of search results */
  maxResults: number;
}

/**
 * Tool configuration
 */
export interface ToolsConfig {
  /** Array of enabled tool names (empty = all enabled) */
  enabled: string[];

  /** Network tool settings */
  network: NetworkToolConfig;

  /** Bash tool settings */
  bash: BashToolConfig;

  /** Web search tool settings */
  webSearch: WebSearchToolConfig;
}

/**
 * Model info source configuration
 */
export interface ModelInfoSource {
  /** Source type */
  type: ModelInfoSourceType;

  /** Source URL (for github and custom types) */
  url?: string;

  /** API key (for ark type) */
  apiKey?: string;

  /** Base URL (for ark type) */
  baseUrl?: string;

  /** Enable this source */
  enabled: boolean;
}

/**
 * Model information cache configuration
 */
export interface ModelInfoConfig {
  /** Array of model info sources */
  sources: ModelInfoSource[];

  /** Cache expiration time in milliseconds */
  cacheExpiryMs: number;

  /** Auto-refresh when cache expires */
  autoUpdate: boolean;
}

/**
 * CLI color configuration
 */
export interface CLIColorsConfig {
  thinking: Color;
  toolCall: Color;
  toolSuccess: Color;
  toolError: Color;
  response: Color;
}

/**
 * CLI display configuration
 */
export interface CLIDisplayConfig {
  /** Show timestamps in messages */
  showTimestamps: boolean;

  /** Show token counts */
  showTokenCount: boolean;

  /** Reduce vertical spacing */
  compactMode: boolean;

  /** Maximum width of card messages */
  maxCardWidth: number;
}

/**
 * CLI configuration
 */
export interface CLIConfig {
  /** Color scheme for different message types */
  colors: CLIColorsConfig;

  /** Display settings */
  display: CLIDisplayConfig;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: LogLevel;

  /** Log file path (null = no file logging) */
  file: string | null;

  /** Enable console logging */
  console: boolean;

  /** Use JSON structured logs */
  structured: boolean;
}

/**
 * Advanced configuration
 */
export interface AdvancedConfig {
  /** Token counting method */
  tokenCountMethod: TokenCountMethod;

  /** Divisor for approximate token counting */
  approximateTokenDivisor: number;

  /** Enable MessageBus event system */
  enableMessageBus: boolean;

  /** Graceful shutdown wait time in milliseconds */
  gracefulShutdownMs: number;
}

/**
 * Environment variable configuration
 */
export interface EnvConfig {
  /** Load .env file on startup */
  loadDotenv: boolean;

  /** Let environment variables override config file */
  overrideWithEnv: boolean;

  /** Mapping of environment variables to config paths */
  mapping: Record<string, string>;
}

/**
 * Complete Kraken configuration
 */
export interface KrakenConfig {
  /** Schema reference */
  $schema?: string;

  /** Config version */
  version: string;

  /** ReAct Agent settings */
  agent: AgentConfig;

  /** LLM client settings */
  llm: LLMConfig;

  /** Session management settings */
  session: SessionConfig;

  /** Sandbox settings */
  sandbox: SandboxConfig;

  /** Tool settings */
  tools: ToolsConfig;

  /** Model information cache settings */
  modelInfo: ModelInfoConfig;

  /** CLI settings */
  cli: CLIConfig;

  /** Logging settings */
  logging: LoggingConfig;

  /** Advanced settings */
  advanced: AdvancedConfig;

  /** Environment variable settings */
  env: EnvConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: KrakenConfig = {
  version: "1.0.0",

  agent: {
    model: "gpt-4o-mini",
    maxIterations: 6,
    temperature: 0.2,
    systemPrompt: null
  },

  llm: {
    provider: "openai",
    apiKey: "${OPENAI_API_KEY}",
    baseUrl: "https://api.openai.com/v1",
    timeoutMs: 60000,
    maxRetries: 3,
    summaryModel: null,
    compression: {
      enabled: true,
      model: null,
      threshold: 0.5,
      maxAllowedPercentage: 0.9,
      contextWindow: null
    }
  },

  session: {
    maxTokens: 4000,
    compressionTargetTokens: 600,
    compressionEnabled: true,
    keepRecentMessages: 6
  },

  sandbox: {
    rootDir: "${CWD}",
    allowedDirs: ["${CWD}"],
    maxFileSizeBytes: 1048576,
    allowSymlinks: false
  },

  tools: {
    enabled: [],
    network: {
      enabled: false,
      allowedDomains: [],
      timeout: 30000
    },
    bash: {
      enabled: true,
      defaultTimeout: 30000,
      maxTimeout: 300000,
      shell: "/bin/bash",
      allowedCommands: [],
      blockedCommands: ["rm -rf /", "dd if=/dev/zero"]
    },
    webSearch: {
      provider: "custom",
      endpoint: "${WEB_SEARCH_ENDPOINT}",
      apiKey: "${WEB_SEARCH_API_KEY}",
      maxResults: 10
    }
  },

  modelInfo: {
    sources: [
      {
        type: "github",
        url: "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json",
        enabled: true
      }
    ],
    cacheExpiryMs: 86400000,
    autoUpdate: true
  },

  cli: {
    colors: {
      thinking: "cyan",
      toolCall: "yellow",
      toolSuccess: "green",
      toolError: "red",
      response: "blue"
    },
    display: {
      showTimestamps: true,
      showTokenCount: true,
      compactMode: false,
      maxCardWidth: 80
    }
  },

  logging: {
    level: "info",
    file: null,
    console: true,
    structured: false
  },

  advanced: {
    tokenCountMethod: "approximate",
    approximateTokenDivisor: 4,
    enableMessageBus: true,
    gracefulShutdownMs: 5000
  },

  env: {
    loadDotenv: true,
    overrideWithEnv: true,
    mapping: {
      "OPENAI_API_KEY": "llm.apiKey",
      "OPENAI_MODEL": "agent.model",
      "OPENAI_BASE_URL": "llm.baseUrl",
      "OPENAI_SUMMARY_MODEL": "llm.summaryModel",
      "REACT_MAX_STEPS": "agent.maxIterations",
      "REACT_TEMPERATURE": "agent.temperature",
      "MAX_SESSION_TOKENS": "session.maxTokens",
      "SUMMARY_TARGET_TOKENS": "session.compressionTargetTokens",
      "ALLOW_NETWORK": "tools.network.enabled",
      "SANDBOX_ROOT": "sandbox.rootDir",
      "SANDBOX_ALLOWED_DIRS": "sandbox.allowedDirs",
      "SANDBOX_MAX_FILE_BYTES": "sandbox.maxFileSizeBytes",
      "WEB_SEARCH_ENDPOINT": "tools.webSearch.endpoint",
      "WEB_SEARCH_API_KEY": "tools.webSearch.apiKey",
      "ARK_API_KEY": "modelInfo.sources[1].apiKey",
      "ARK_BASE_URL": "modelInfo.sources[1].baseUrl"
    }
  }
};
