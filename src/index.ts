import "dotenv/config";
import { createCLI } from "./cli";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const cli = createCLI({
    apiKey: requireEnv("OPENAI_API_KEY"),
    model: process.env.OPENAI_MODEL,
    summaryModel: process.env.OPENAI_SUMMARY_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL,
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
