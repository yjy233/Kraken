import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { LLMProtocol } from "../llm/LLMClientFactory";
import type { MCPServerConfig } from "../mcp/types";


export interface TavilyConfig {
  apiKey?: string;
  enabled?: boolean;
}

export interface ToolsConfig {
  enabled?: boolean;
  allowNetwork?: boolean;
  tavily?: TavilyConfig;
}

export interface LarkConfig {
  enabled?: boolean;
  appId?: string;
  appSecret?: string;
  debug?: boolean;
  autoReplyOnMention?: boolean;
  botKeywords?: string[];
  welcomeMessage?: string | null;
  systemPrompt?: string | null;
  eventHandlersPath?: string | null;
}

export interface KrakenConfig {
  protocol?: LLMProtocol;
  apiKey?: string;
  model?: string;
  summaryModel?: string;
  baseUrl?: string;
  anthropicVersion?: string;
  timeoutMs?: number;
  workspaceRoot?: string;
  sandboxRoot?: string;
  sandboxAllowedDirs?: string[];
  sandboxMaxFileBytes?: number;
  maxSessionTokens?: number;
  summaryTargetTokens?: number;
  maxIterations?: number;
  temperature?: number;
  logLevel?: string;
  mcpServers?: MCPServerConfig[];
  lark?: LarkConfig;
  tools?: ToolsConfig;
}

interface JsonObject {
  [key: string]: unknown;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseAllowedDirs(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

/**
 * 替换字符串中的环境变量占位符 ${VAR_NAME}
 * @param value 可能包含环境变量占位符的值
 * @returns 替换后的值，如果是环境变量占位符但环境变量不存在则返回 undefined
 */
function resolveEnvVar(value: unknown): unknown {
  if (typeof value !== "string") return value;

  // 匹配 ${VAR_NAME} 或 $VAR_NAME 格式
  const envVarPattern = /^\$\{([^}]+)\}$|^\$([A-Z_][A-Z0-9_]*)$/;
  const match = value.match(envVarPattern);

  if (match) {
    const varName = match[1] || match[2];
    const envValue = process.env[varName];
    // 如果环境变量不存在，返回 undefined 而不是占位符字符串
    return envValue !== undefined ? envValue : undefined;
  }

  return value;
}


/**
 * 三层配置加载，优先级为：环境变量 < ~/.Kraken/Kraken.json < workspace/.Kraken/Kraken.json
 * @returns 
 * 
 */
function loadEnvConfig(): KrakenConfig {
  return {
    protocol: (process.env.LLM_PROTOCOL as LLMProtocol | undefined) ?? undefined,
    apiKey: process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL ?? process.env.OPENAI_MODEL,
    summaryModel: process.env.LLM_SUMMARY_MODEL ?? process.env.OPENAI_SUMMARY_MODEL,
    baseUrl: process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL,
    anthropicVersion: process.env.ANTHROPIC_VERSION,
    timeoutMs: parseNumber(process.env.LLM_TIMEOUT_MS),
    workspaceRoot: process.env.WORKSPACE_ROOT,
    sandboxRoot: process.env.SANDBOX_ROOT,
    sandboxAllowedDirs: parseAllowedDirs(process.env.SANDBOX_ALLOWED_DIRS),
    sandboxMaxFileBytes: parseNumber(process.env.SANDBOX_MAX_FILE_BYTES),
    maxSessionTokens: parseNumber(process.env.MAX_SESSION_TOKENS),
    summaryTargetTokens: parseNumber(process.env.SUMMARY_TARGET_TOKENS),
    maxIterations: parseNumber(process.env.REACT_MAX_STEPS),
    temperature: parseNumber(process.env.REACT_TEMPERATURE),
    logLevel: process.env.LOG_LEVEL,
    lark: {
      enabled: process.env.LARK_ENABLED === "true" || process.env.LARK_ENABLED === "1",
      appId: process.env.LARK_APP_ID || process.env.APP_ID,
      appSecret: process.env.LARK_APP_SECRET || process.env.APP_SECRET,
      debug: process.env.LARK_DEBUG === "true" || process.env.LARK_DEBUG === "1"
    },
    tools: {
      enabled: process.env.TOOLS_ENABLED !== "false",
      allowNetwork: process.env.ALLOW_NETWORK === "true" || process.env.ALLOW_NETWORK === "1",
      tavily: {
        enabled: process.env.TAVILY_ENABLED !== "false",
        apiKey: process.env.TAVILY_API_KEY
      }
    }
  };
}

async function readJsonFile(filePath: string): Promise<JsonObject | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as JsonObject;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Config JSON must be an object");
    }
    return parsed;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    throw new Error(`Failed to read config ${filePath}: ${err.message}`);
  }
}

function normalizeConfig(obj: JsonObject): KrakenConfig {
  const config: KrakenConfig = {};

  if (typeof obj.protocol === "string") {
    config.protocol = obj.protocol as LLMProtocol;
  }
  // 支持环境变量占位符 ${VAR_NAME}
  if (typeof obj.apiKey === "string") {
    const resolved = resolveEnvVar(obj.apiKey);
    if (typeof resolved === "string") config.apiKey = resolved;
  }
  // 兼容旧字段名
  if (!config.apiKey && typeof obj.openAIApiKey === "string") {
    const resolved = resolveEnvVar(obj.openAIApiKey);
    if (typeof resolved === "string") config.apiKey = resolved;
  }
  if (typeof obj.model === "string") config.model = obj.model;
  if (typeof obj.summaryModel === "string") config.summaryModel = obj.summaryModel;
  if (typeof obj.baseUrl === "string") {
    const resolved = resolveEnvVar(obj.baseUrl);
    if (typeof resolved === "string") config.baseUrl = resolved;
  }
  if (typeof obj.anthropicVersion === "string") config.anthropicVersion = obj.anthropicVersion;
  if (typeof obj.timeoutMs === "number") config.timeoutMs = obj.timeoutMs;
  if (typeof obj.workspaceRoot === "string") config.workspaceRoot = obj.workspaceRoot;
  if (typeof obj.sandboxRoot === "string") config.sandboxRoot = obj.sandboxRoot;
  if (Array.isArray(obj.sandboxAllowedDirs)) {
    config.sandboxAllowedDirs = obj.sandboxAllowedDirs.filter(
      (item) => typeof item === "string"
    ) as string[];
  }
  if (typeof obj.sandboxMaxFileBytes === "number") {
    config.sandboxMaxFileBytes = obj.sandboxMaxFileBytes;
  }
  if (typeof obj.maxSessionTokens === "number") config.maxSessionTokens = obj.maxSessionTokens;
  if (typeof obj.summaryTargetTokens === "number") {
    config.summaryTargetTokens = obj.summaryTargetTokens;
  }
  if (typeof obj.maxIterations === "number") config.maxIterations = obj.maxIterations;
  if (typeof obj.temperature === "number") config.temperature = obj.temperature;
  if (typeof obj.logLevel === "string") config.logLevel = obj.logLevel;

  // Parse MCP configuration
  if (obj.mcp && typeof obj.mcp === "object" && !Array.isArray(obj.mcp)) {
    const mcpObj = obj.mcp as JsonObject;
    if (mcpObj.enabled === true && Array.isArray(mcpObj.servers)) {
      config.mcpServers = mcpObj.servers
        .filter((s): s is JsonObject => typeof s === "object" && s !== null && !Array.isArray(s))
        .filter((s) => s.enabled === true)
        .map((s) => ({
          name: String(s.name || "unnamed"),
          description: s.description ? String(s.description) : undefined,
          transport: String(s.transport || "stdio") as "stdio" | "sse",
          command: s.command ? String(s.command) : undefined,
          args: Array.isArray(s.args) ? s.args.map(String) : undefined,
          env: s.env && typeof s.env === "object" && !Array.isArray(s.env)
            ? Object.fromEntries(
                Object.entries(s.env as Record<string, unknown>).map(([k, v]) => [k, String(v)])
              )
            : undefined,
          url: s.url ? String(s.url) : undefined,
          enabled: true
        }));
    }
  }

  // Parse Lark configuration
  if (obj.lark && typeof obj.lark === "object" && !Array.isArray(obj.lark)) {
    const larkObj = obj.lark as JsonObject;
    config.lark = {
      enabled: larkObj.enabled === true,
      appId: typeof larkObj.appId === "string" ? (resolveEnvVar(larkObj.appId) as string | undefined) : undefined,
      appSecret: typeof larkObj.appSecret === "string" ? (resolveEnvVar(larkObj.appSecret) as string | undefined) : undefined,
      debug: larkObj.debug === true,
      autoReplyOnMention: larkObj.autoReplyOnMention !== false,
      botKeywords: Array.isArray(larkObj.botKeywords)
        ? larkObj.botKeywords.filter((k): k is string => typeof k === "string")
        : undefined,
      welcomeMessage: larkObj.welcomeMessage !== undefined
        ? (larkObj.welcomeMessage === null ? null : String(larkObj.welcomeMessage))
        : undefined,
      systemPrompt: larkObj.systemPrompt !== undefined
        ? (larkObj.systemPrompt === null ? null : String(larkObj.systemPrompt))
        : undefined,
      eventHandlersPath: larkObj.eventHandlersPath !== undefined
        ? (larkObj.eventHandlersPath === null ? null : String(larkObj.eventHandlersPath))
        : undefined
    };
  }

  // Parse Tools configuration (including Tavily)
  if (obj.tools && typeof obj.tools === "object" && !Array.isArray(obj.tools)) {
    const toolsObj = obj.tools as JsonObject;
    config.tools = {
      enabled: toolsObj.enabled !== false,
    };

    // Only set allowNetwork when explicitly defined, to avoid overriding inherited values with false.
    // Also support root-level allowNetwork for compatibility.
    if (typeof toolsObj.allowNetwork === "boolean") {
      config.tools.allowNetwork = toolsObj.allowNetwork;
    } else if (obj.allowNetwork === true) {
      config.tools.allowNetwork = true;
    }

    // Parse Tavily config
    if (toolsObj.tavily && typeof toolsObj.tavily === "object" && !Array.isArray(toolsObj.tavily)) {
      const tavilyObj = toolsObj.tavily as JsonObject;
      config.tools.tavily = {
        enabled: tavilyObj.enabled !== false,
        apiKey: typeof tavilyObj.apiKey === "string" ? (resolveEnvVar(tavilyObj.apiKey) as string | undefined) : undefined
      };
    }
  } else if (obj.allowNetwork === true) {
    // Support root-level allowNetwork even without a tools object
    config.tools = { allowNetwork: true };
  }

  return config;
}

export async function loadKrakenConfig(cwd: string = process.cwd()): Promise<KrakenConfig> {
  const envConfig = loadEnvConfig();

  const homePath = path.join(os.homedir(), ".Kraken", "Kraken.json");
  const workspacePath = path.join(cwd, ".Kraken", "Kraken.json");

  const homeRaw = await readJsonFile(homePath);
  //console.log(`Loaded home config from ${homeRaw?.tools?.tavily?.apiKey ?}`);
  
  const workspaceRaw = await readJsonFile(workspacePath);

  const homeConfig = homeRaw ? normalizeConfig(homeRaw) : {};
  const workspaceConfig = workspaceRaw ? normalizeConfig(workspaceRaw) : {};
  
  if (homeConfig.lark) {
  }

  // 配置优先级（高优先级覆盖低优先级）：
  // 1. 当前目录 ./.Kraken/Kraken.json (最高优先级)
  // 2. 环境变量
  // 3. 用户目录 ~/.Kraken/Kraken.json (最低优先级)
  // 
  // 注意：对于嵌套对象（如 lark, tools），需要深度合并而不是简单覆盖
  // 辅助函数：合并非空值（undefined 和空字符串都视为空）
  const isEmptyValue = (value: any): boolean => {
    return value === undefined || value === null || value === "";
  };
  
  const mergeNested = <T>(base?: T, env?: T, override?: T): T | undefined => {
    const result = { ...base } as Record<string, any>;
    if (env) {
      Object.entries(env).forEach(([key, value]) => {
        if (!isEmptyValue(value)) result[key] = value;
      });
    }
    if (override) {
      Object.entries(override).forEach(([key, value]) => {
        if (!isEmptyValue(value)) result[key] = value;
      });
    }
    return Object.keys(result).length > 0 ? (result as T) : undefined;
  };
  
  // 提取嵌套配置，避免展开操作符覆盖它们
  const { lark: homeLark, tools: homeTools, ...homeRest } = homeConfig;
  const { lark: envLark, tools: envTools, ...envRest } = envConfig;
  const { lark: workspaceLark, tools: workspaceTools, ...workspaceRest } = workspaceConfig;
  
  // 合并非嵌套的基本字段（只合并非空值）
  const mergeBasicFields = () => {
    const result = {} as Record<string, any>;
    
    // 按优先级顺序合并：用户级 -> 环境变量 -> 工作区级
    [homeRest, envRest, workspaceRest].forEach((config) => {
      Object.entries(config).forEach(([key, value]) => {
        if (!isEmptyValue(value)) {
          result[key] = value;
        }
      });
    });
    
    return result;
  };
  
  const merged: KrakenConfig = {
    ...mergeBasicFields(),
    // 深度合并 lark 配置（只合并非空值）
    lark: mergeNested(homeLark, envLark, workspaceLark),
    // 深度合并 tools 配置
    tools: mergeNested(homeTools, envTools, workspaceTools)
  };
  

  merged.workspaceRoot = merged.workspaceRoot ?? cwd;

  return merged;
}
