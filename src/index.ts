import "dotenv/config";
import readline from "node:readline";
import { createLogger } from "./utils/logger";
import { Sandbox } from "./sandbox/Sandbox";
import { OpenAIClient } from "./llm/OpenAIClient";
import { SessionStore } from "./session/SessionStore";
import { createBuiltinTools } from "./tools/builtin";
import { ToolRegistry } from "./tools/ToolRegistry";
import { ReActAgent } from "./agent/ReActAgent";

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
  const model = process.env.OPENAI_MODEL;
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

async function main() {
  const { agent } = createAgent();
  await runCli(agent);
}

main().catch((error) => {
  logger.error("Fatal error", { error: (error as Error).message });
  process.exit(1);
});
