#!/usr/bin/env node

import { MessageBus } from "../core/messagebus";
import { createLLMClient, type LLMProtocol } from "../core/llm/LLMClientFactory";
import { Sandbox } from "../core/sandbox/Sandbox";
import { SessionStore } from "../core/session/SessionStore";
import { createBuiltinTools } from "../core/tools/core_tool";
import { ToolRegistry } from "../core/tools/ToolRegistry";
import { ReActAgent } from "../core/agent/ReActAgent";
import { createLogger } from "../core/utils/logger";
import { CLI } from "./CLI";

export interface CLIConfig {
  protocol?: LLMProtocol;
  apiKey: string;
  model?: string;
  summaryModel?: string;
  baseUrl?: string;
  timeoutMs?: number;
  anthropicVersion?: string;
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

export function createCLI(config: CLIConfig): CLI {
  const logger = createLogger((config.logLevel as any) ?? "info");
  const messageBus = new MessageBus();

  const model = config.model ?? "gpt-4o-mini";
  const summaryModel = config.summaryModel ?? model;

  const protocol = config.protocol ?? "openai";
  const llm =
    protocol === "claude"
      ? createLLMClient({
          protocol,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          timeoutMs: config.timeoutMs,
          anthropicVersion: config.anthropicVersion
        })
      : createLLMClient({
          protocol,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          timeoutMs: config.timeoutMs
        });

  const workspaceRoot = config.workspaceRoot ?? config.sandboxRoot ?? process.cwd();
  const sandbox = new Sandbox({
    rootDir: workspaceRoot,
    allowedDirs: config.sandboxAllowedDirs,
    maxFileSizeBytes: config.sandboxMaxFileBytes ?? 1024 * 1024
  });

  const sessions = new SessionStore(
    {
      maxTokens: config.maxSessionTokens ?? 4000,
      compressionTargetTokens: config.summaryTargetTokens ?? 600,
      summaryModel
    },
    llm
  );

  const tools = new ToolRegistry(createBuiltinTools());

  const agent = new ReActAgent({
    llm,
    tools,
    sessions,
    sandbox,
    logger,
    options: {
      model,
      maxIterations: config.maxIterations ?? 6,
      temperature: config.temperature ?? 0.2
    },
    messageBus
  });

  return new CLI({ messageBus, agent });
}
