import "dotenv/config";
import { createCLI } from "./cli";
import type { LLMProtocol } from "./core/llm/LLMClientFactory";

function requireAnyEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing required env var: ${names.join(" or ")}`);
}

async function main() {
  const cli = createCLI({
    protocol: process.env.LLM_PROTOCOL as LLMProtocol | undefined,
    apiKey: requireAnyEnv(["LLM_API_KEY", "OPENAI_API_KEY"]),
    model: process.env.LLM_MODEL ?? process.env.OPENAI_MODEL,
    summaryModel: process.env.LLM_SUMMARY_MODEL ?? process.env.OPENAI_SUMMARY_MODEL,
    baseUrl: process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL,
    anthropicVersion: process.env.ANTHROPIC_VERSION,
    sandboxRoot: process.env.SANDBOX_ROOT,
    sandboxAllowedDirs: process.env.SANDBOX_ALLOWED_DIRS?.split(",").map((p) => p.trim()),
    sandboxMaxFileBytes: process.env.SANDBOX_MAX_FILE_BYTES
      ? Number(process.env.SANDBOX_MAX_FILE_BYTES)
      : undefined,
    maxSessionTokens: process.env.MAX_SESSION_TOKENS
      ? Number(process.env.MAX_SESSION_TOKENS)
      : undefined,
    summaryTargetTokens: process.env.SUMMARY_TARGET_TOKENS
      ? Number(process.env.SUMMARY_TARGET_TOKENS)
      : undefined,
    maxIterations: process.env.REACT_MAX_STEPS ? Number(process.env.REACT_MAX_STEPS) : undefined,
    temperature: process.env.REACT_TEMPERATURE ? Number(process.env.REACT_TEMPERATURE) : undefined,
    logLevel: process.env.LOG_LEVEL
  });

  await cli.start();
}

main().catch((error) => {
  console.error("Fatal error:", (error as Error).message);
  process.exit(1);
});
