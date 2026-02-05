import { MessageBus } from "../core/messagebus";
import { OpenAIClient } from "../core/llm/OpenAIClient";
import { Sandbox } from "../core/sandbox/Sandbox";
import { SessionStore } from "../core/session/SessionStore";
import { createBuiltinTools } from "../core/tools/builtin";
import { ToolRegistry } from "../core/tools/ToolRegistry";
import { ReActAgent } from "../core/agent/ReActAgent";
import { createLogger } from "../core/utils/logger";
import { CLI } from "./CLI";

export interface CLIConfig {
  apiKey: string;
  model?: string;
  summaryModel?: string;
  baseUrl?: string;
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

  const llm = new OpenAIClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl
  });

  const sandbox = new Sandbox({
    rootDir: config.sandboxRoot ?? process.cwd(),
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
