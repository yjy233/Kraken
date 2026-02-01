import "dotenv/config";
import readline from "node:readline";
import { createLogger } from "./utils/logger";
import { Sandbox } from "./sandbox/Sandbox";
import { OpenAIClient } from "./llm/OpenAIClient";
import { SessionStore } from "./session/SessionStore";
import { createBuiltinTools } from "./tools/builtin";
import { ToolRegistry } from "./tools/ToolRegistry";
import { ReActAgent } from "./agent/ReActAgent";
import { FeishuWsClient } from "./integrations/feishu/ws";

const logger = createLogger((process.env.LOG_LEVEL as any) ?? "info");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function createAgent() {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const summaryModel = process.env.OPENAI_SUMMARY_MODEL ?? model;

  const llm = new OpenAIClient({
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL
  });

  const sandbox = new Sandbox({
    rootDir: process.env.SANDBOX_ROOT ?? process.cwd(),
    allowedDirs: process.env.SANDBOX_ALLOWED_DIRS?.split(",").map((p) => p.trim()),
    maxFileSizeBytes: Number(process.env.SANDBOX_MAX_FILE_BYTES ?? 1024 * 1024)
  });

  const sessions = new SessionStore(
    {
      maxTokens: Number(process.env.MAX_SESSION_TOKENS ?? 4000),
      compressionTargetTokens: Number(process.env.SUMMARY_TARGET_TOKENS ?? 600),
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
      maxIterations: Number(process.env.REACT_MAX_STEPS ?? 6),
      temperature: Number(process.env.REACT_TEMPERATURE ?? 0.2)
    }
  });

  return { agent, sessions };
}

async function runCli(agent: ReActAgent) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  logger.info("CLI mode. Type messages and press Enter.");

  const sessionId = "cli";
  rl.on("line", async (line) => {
    const reply = await agent.run(sessionId, line);
    // eslint-disable-next-line no-console
    console.log(`Assistant: ${reply}`);
  });
}

async function runFeishu(agent: ReActAgent) {
  const url = process.env.FEISHU_WS_URL;
  if (!url) {
    logger.warn("FEISHU_WS_URL not set; skipping Feishu WS.");
    return;
  }

  let headers: Record<string, string> | undefined;
  if (process.env.FEISHU_WS_HEADERS) {
    try {
      headers = JSON.parse(process.env.FEISHU_WS_HEADERS);
    } catch (error) {
      logger.warn("Failed to parse FEISHU_WS_HEADERS JSON", { error: (error as Error).message });
    }
  }

  const client = new FeishuWsClient({
    url,
    headers,
    logger,
    onEvent: async (event) => {
      const sessionId = "feishu";
      const text = JSON.stringify(event);
      const reply = await agent.run(sessionId, text);
      logger.info("Feishu event handled", { reply });
    }
  });

  client.connect();
}

async function main() {
  const { agent } = createAgent();

  const mode = process.env.RUN_MODE ?? "feishu";
  if (mode === "cli") {
    await runCli(agent);
  } else {
    await runFeishu(agent);
  }
}

main().catch((error) => {
  logger.error("Fatal error", { error: (error as Error).message });
  process.exit(1);
});
