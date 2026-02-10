import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { LLMProtocol } from "../llm/LLMClientFactory";

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
    logLevel: process.env.LOG_LEVEL
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
  if (typeof obj.apiKey === "string") config.apiKey = obj.apiKey;
  if (typeof obj.model === "string") config.model = obj.model;
  if (typeof obj.summaryModel === "string") config.summaryModel = obj.summaryModel;
  if (typeof obj.baseUrl === "string") config.baseUrl = obj.baseUrl;
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

  return config;
}

export async function loadKrakenConfig(cwd: string = process.cwd()): Promise<KrakenConfig> {
  const envConfig = loadEnvConfig();

  const homePath = path.join(os.homedir(), ".Kraken", "Kraken.json");
  const workspacePath = path.join(cwd, ".Kraken", "Kraken.json");

  const homeRaw = await readJsonFile(homePath);
  const workspaceRaw = await readJsonFile(workspacePath);

  const homeConfig = homeRaw ? normalizeConfig(homeRaw) : {};
  const workspaceConfig = workspaceRaw ? normalizeConfig(workspaceRaw) : {};

  const merged: KrakenConfig = {
    ...envConfig,
    ...homeConfig,
    ...workspaceConfig
  };

  merged.workspaceRoot = merged.workspaceRoot ?? cwd;

  return merged;
}
