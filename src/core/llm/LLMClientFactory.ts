
import { ClaudeClient } from "./ClaudeClient";
import { GeminiClient } from "./GeminiClient";
import { OpenAIClient } from "./OpenAIClient";
import type { LLMClient } from "./types";

export const OpenAIProc = "openai" as const;
export const GeminiProc = "gemini" as const;
export const ClaudeProc = "claude" as const;
export type LLMProtocol = typeof OpenAIProc | typeof GeminiProc | typeof ClaudeProc;

export interface BaseLLMClientConfig {
  protocol: LLMProtocol;
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface OpenAIClientConfig extends BaseLLMClientConfig {
  protocol: typeof OpenAIProc;
}

export interface GeminiClientConfig extends BaseLLMClientConfig {
  protocol: typeof GeminiProc;
}

export interface ClaudeClientConfig extends BaseLLMClientConfig {
  protocol: typeof ClaudeProc;
  anthropicVersion?: string;
}

export type LLMClientConfig = OpenAIClientConfig | GeminiClientConfig | ClaudeClientConfig;

export function createLLMClient(config: LLMClientConfig): LLMClient {
  switch (config.protocol) {
    case OpenAIProc:
      return new OpenAIClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs
      });
    case GeminiProc:
      return new GeminiClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs
      });
    case ClaudeProc:
      return new ClaudeClient({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
        anthropicVersion: config.anthropicVersion
      });
    default: {
      const exhaustiveCheck: never = config;
      return exhaustiveCheck;
    }
  }
}
