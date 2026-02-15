/**
 * Configuration loader for Kraken
 *
 * Loads configuration from Kraken.json and applies environment variable overrides
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { KrakenConfig, DEFAULT_CONFIG } from "./types";
import * as dotenv from "dotenv";

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue === undefined) continue;

    if (
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      result[key] = sourceValue as any;
    }
  }

  return result;
}

/**
 * Substitute environment variables in string values
 * Supports ${VAR_NAME} syntax
 */
function substituteEnvVars(value: any): any {
  if (typeof value === "string") {
    // Handle special variables
    if (value === "${CWD}") {
      return process.cwd();
    }
    if (value === "${HOME}") {
      return process.env.HOME || process.env.USERPROFILE || "";
    }

    // Replace ${VAR} with env value
    return value.replace(/\$\{(\w+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
  }

  if (Array.isArray(value)) {
    return value.map(substituteEnvVars);
  }

  if (typeof value === "object" && value !== null) {
    const result: any = {};
    for (const key in value) {
      // Skip _examples and comments
      if (key.startsWith("_") || key === "//") continue;
      result[key] = substituteEnvVars(value[key]);
    }
    return result;
  }

  return value;
}

/**
 * Get value at a dot-separated path in an object
 * Example: "agent.maxIterations" returns config.agent.maxIterations
 */
function getValueAtPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    // Handle array indices like "sources[1]"
    const match = part.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      const [, key, index] = match;
      current = current[key];
      if (!Array.isArray(current)) return undefined;
      current = current[parseInt(index, 10)];
    } else {
      current = current[part];
    }

    if (current === undefined) return undefined;
  }

  return current;
}

/**
 * Set value at a dot-separated path in an object
 * Example: "agent.maxIterations", 10 sets config.agent.maxIterations = 10
 */
function setValueAtPath(obj: any, path: string, value: any): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Handle array indices
    const match = part.match(/^(\w+)\[(\d+)\]$/);
    if (match) {
      const [, key, index] = match;
      if (!current[key]) current[key] = [];
      current = current[key][parseInt(index, 10)];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  const match = lastPart.match(/^(\w+)\[(\d+)\]$/);
  if (match) {
    const [, key, index] = match;
    if (!current[key]) current[key] = [];
    current[key][parseInt(index, 10)] = value;
  } else {
    current[lastPart] = value;
  }
}

/**
 * Apply environment variable overrides based on mapping
 */
function applyEnvOverrides(config: KrakenConfig): KrakenConfig {
  const result = { ...config };

  if (!config.env?.overrideWithEnv || !config.env?.mapping) {
    return result;
  }

  for (const [envVar, configPath] of Object.entries(config.env.mapping)) {
    const envValue = process.env[envVar];
    if (envValue !== undefined) {
      let parsedValue: any = envValue;

      // Try to parse as JSON for numbers, booleans, arrays
      try {
        if (envValue === "true") parsedValue = true;
        else if (envValue === "false") parsedValue = false;
        else if (!isNaN(Number(envValue))) parsedValue = Number(envValue);
        else if (envValue.startsWith("[") || envValue.startsWith("{")) {
          parsedValue = JSON.parse(envValue);
        }
      } catch {
        // Keep as string if parsing fails
      }

      setValueAtPath(result, configPath, parsedValue);
    }
  }

  return result;
}

/**
 * Load configuration from file
 */
export function loadConfig(configPath: string = "./Kraken.json"): KrakenConfig {
  // Load .env file if requested
  const shouldLoadDotenv = process.env.KRAKEN_LOAD_DOTENV !== "false";
  if (shouldLoadDotenv) {
    dotenv.config();
  }

  let fileConfig: Partial<KrakenConfig> = {};

  try {
    const absolutePath = resolve(configPath);
    const fileContent = readFileSync(absolutePath, "utf-8");
    fileConfig = JSON.parse(fileContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Failed to load config from ${configPath}:`, error);
    }
    // Use defaults if file doesn't exist
  }

  // Merge with defaults
  let config = deepMerge(DEFAULT_CONFIG, fileConfig);

  // Substitute environment variables
  config = substituteEnvVars(config);

  // Apply environment variable overrides
  config = applyEnvOverrides(config);

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: KrakenConfig): string[] {
  const errors: string[] = [];

  // Validate required fields
  if (!config.llm.apiKey || config.llm.apiKey.includes("${")) {
    errors.push("llm.apiKey is required and must be set");
  }

  if (config.agent.maxIterations < 1 || config.agent.maxIterations > 20) {
    errors.push("agent.maxIterations must be between 1 and 20");
  }

  if (config.agent.temperature < 0 || config.agent.temperature > 2) {
    errors.push("agent.temperature must be between 0 and 2");
  }

  if (config.sandbox.maxFileSizeBytes < 1024) {
    errors.push("sandbox.maxFileSizeBytes must be at least 1024 bytes");
  }

  if (config.session.maxTokens < 100) {
    errors.push("session.maxTokens must be at least 100");
  }

  if (config.session.compressionTargetTokens >= config.session.maxTokens) {
    errors.push("session.compressionTargetTokens must be less than session.maxTokens");
  }

  // Validate web search if enabled
  const webSearchEnabled = config.tools.enabled.includes("web_search");
  if (webSearchEnabled) {
    if (!config.tools.webSearch.endpoint || config.tools.webSearch.endpoint.includes("${")) {
      errors.push("tools.webSearch.endpoint is required when web_search tool is enabled");
    }
    if (!config.tools.webSearch.apiKey || config.tools.webSearch.apiKey.includes("${")) {
      errors.push("tools.webSearch.apiKey is required when web_search tool is enabled");
    }
  }

  return errors;
}

/**
 * Get a specific config value by path
 */
export function getConfigValue(config: KrakenConfig, path: string): any {
  return getValueAtPath(config, path);
}

/**
 * Global config instance (lazily loaded)
 */
let globalConfig: KrakenConfig | null = null;

/**
 * Get or load global config
 */
export function getGlobalConfig(configPath?: string): KrakenConfig {
  if (!globalConfig) {
    globalConfig = loadConfig(configPath);
  }
  return globalConfig;
}

/**
 * Reset global config (useful for testing)
 */
export function resetGlobalConfig(): void {
  globalConfig = null;
}
