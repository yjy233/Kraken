#!/usr/bin/env node
import "dotenv/config";
import { createCLI } from "./cli";
import { loadKrakenConfig } from "./core/config/loadConfig";

async function main() {
  const workspaceRoot = process.cwd();
  const config = await loadKrakenConfig(workspaceRoot);
  if (!config.apiKey) {
    throw new Error(
      "Missing API key. Set LLM_API_KEY or OPENAI_API_KEY, or add apiKey to ~/.Kraken/Kraken.json or ./.Kraken/Kraken.json."
    );
  }
  const cli = createCLI({
    protocol: config.protocol,
    apiKey: config.apiKey,
    model: config.model,
    summaryModel: config.summaryModel,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    anthropicVersion: config.anthropicVersion,
    workspaceRoot,
    sandboxRoot: config.sandboxRoot,
    sandboxAllowedDirs: config.sandboxAllowedDirs,
    sandboxMaxFileBytes: config.sandboxMaxFileBytes,
    maxSessionTokens: config.maxSessionTokens,
    summaryTargetTokens: config.summaryTargetTokens,
    maxIterations: config.maxIterations,
    temperature: config.temperature,
    logLevel: config.logLevel
  });

  await cli.start();
}

main().catch((error) => {
  console.error("Fatal error:", (error as Error).message);
  process.exit(1);
});
