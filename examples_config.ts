/**
 * Example: Using the Kraken Configuration System
 *
 * This file demonstrates how to use the new configuration system
 * to configure the ReAct agent and all components.
 */

import { loadConfig, validateConfig, getGlobalConfig } from "./src/config";
import { ReActAgent } from "./src/core/agent/ReActAgent";
import { OpenAIClient } from "./src/core/llm/OpenAIClient";
import { ToolRegistry } from "./src/core/tools/ToolRegistry";
import { SessionStore } from "./src/core/session/SessionStore";
import { Sandbox } from "./src/core/sandbox/Sandbox";
import { Logger } from "./src/core/utils/logger";
import { MessageBus } from "./src/core/messagebus";
import { createBuiltinTools } from "./src/core/tools/core_tool";

/**
 * Example 1: Load and validate configuration
 */
async function example1_LoadConfig() {
  console.log("=== Example 1: Load and Validate ===\n");

  // Load config from Kraken.json
  const config = loadConfig("./Kraken.json");

  console.log("Loaded configuration:");
  console.log(`- Model: ${config.agent.model}`);
  console.log(`- Max Iterations: ${config.agent.maxIterations}`);
  console.log(`- Temperature: ${config.agent.temperature}`);
  console.log(`- LLM Provider: ${config.llm.provider}`);
  console.log(`- Base URL: ${config.llm.baseUrl}`);

  // Validate
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error("\n❌ Configuration errors:");
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  } else {
    console.log("\n✅ Configuration is valid");
  }
}

/**
 * Example 2: Use global config singleton
 */
async function example2_GlobalConfig() {
  console.log("\n=== Example 2: Global Config ===\n");

  const config = getGlobalConfig();

  console.log("Agent settings:");
  console.log(JSON.stringify(config.agent, null, 2));

  console.log("\nSession settings:");
  console.log(JSON.stringify(config.session, null, 2));
}

/**
 * Example 3: Create ReAct Agent with config
 */
async function example3_CreateAgent() {
  console.log("\n=== Example 3: Create Agent from Config ===\n");

  const config = getGlobalConfig();

  // Create components using config
  const llm = new OpenAIClient({
    apiKey: config.llm.apiKey,
    baseUrl: config.llm.baseUrl,
    timeoutMs: config.llm.timeoutMs,
  });

  const sandbox = new Sandbox({
    allowedDirs: config.sandbox.allowedDirs,
    maxFileSize: config.sandbox.maxFileSizeBytes,
  });

  const tools = new ToolRegistry();
  const builtinTools = createBuiltinTools(config.tools.network.enabled);
  builtinTools.forEach((tool) => tools.register(tool.name, tool));

  const sessions = new SessionStore({
    llm,
    maxTokens: config.session.maxTokens,
    compressionTargetTokens: config.session.compressionTargetTokens,
  });

  const logger = new Logger();
  const messageBus = config.advanced.enableMessageBus ? new MessageBus() : undefined;

  // Create agent
  const agent = new ReActAgent({
    llm,
    tools,
    sessions,
    sandbox,
    logger,
    options: {
      model: config.agent.model,
      maxIterations: config.agent.maxIterations,
      temperature: config.agent.temperature,
      systemPrompt: config.agent.systemPrompt || undefined,
    },
    messageBus,
  });

  console.log("✅ Agent created successfully");
  console.log(`Model: ${config.agent.model}`);
  console.log(`Max iterations: ${config.agent.maxIterations}`);
  console.log(`Temperature: ${config.agent.temperature}`);

  return agent;
}

/**
 * Example 4: Different configs for different environments
 */
async function example4_EnvironmentConfigs() {
  console.log("\n=== Example 4: Environment Configs ===\n");

  const env = process.env.NODE_ENV || "development";

  let configPath = "./Kraken.json";
  if (env === "production") {
    configPath = "./Kraken.prod.json";
  } else if (env === "development") {
    configPath = "./Kraken.dev.json";
  }

  console.log(`Environment: ${env}`);
  console.log(`Config path: ${configPath}`);

  try {
    const config = loadConfig(configPath);
    console.log(`✅ Loaded config for ${env}`);
    return config;
  } catch (error) {
    console.log(`⚠️  Config not found, using default`);
    return loadConfig("./Kraken.json");
  }
}

/**
 * Example 5: Override config with environment variables
 */
async function example5_EnvOverrides() {
  console.log("\n=== Example 5: Environment Overrides ===\n");

  // Set environment variable
  process.env.REACT_MAX_STEPS = "10";
  process.env.REACT_TEMPERATURE = "0.1";

  const config = loadConfig();

  console.log("Config values (overridden by env vars):");
  console.log(`- Max Iterations: ${config.agent.maxIterations} (from REACT_MAX_STEPS)`);
  console.log(`- Temperature: ${config.agent.temperature} (from REACT_TEMPERATURE)`);
}

/**
 * Example 6: Minimal config file
 */
async function example6_MinimalConfig() {
  console.log("\n=== Example 6: Minimal Config ===\n");

  // Minimal config only needs required fields
  const minimalConfig = {
    version: "1.0.0",
    agent: {
      model: "gpt-4o-mini",
    },
    llm: {
      apiKey: process.env.OPENAI_API_KEY || "",
    },
  };

  console.log("Minimal config:");
  console.log(JSON.stringify(minimalConfig, null, 2));
  console.log("\n✅ All other values will use defaults");
}

/**
 * Example 7: Tool configuration
 */
async function example7_ToolConfig() {
  console.log("\n=== Example 7: Tool Configuration ===\n");

  const config = getGlobalConfig();

  console.log("Tool settings:");
  console.log(`- Enabled tools: ${config.tools.enabled.length > 0 ? config.tools.enabled.join(", ") : "all"}`);
  console.log(`- Network enabled: ${config.tools.network.enabled}`);
  console.log(`- Bash enabled: ${config.tools.bash.enabled}`);
  console.log(`- Bash default timeout: ${config.tools.bash.defaultTimeout}ms`);

  if (config.tools.network.allowedDomains.length > 0) {
    console.log(`- Allowed domains: ${config.tools.network.allowedDomains.join(", ")}`);
  }

  if (config.tools.bash.allowedCommands.length > 0) {
    console.log(`- Allowed commands: ${config.tools.bash.allowedCommands.join(", ")}`);
  }

  if (config.tools.bash.blockedCommands.length > 0) {
    console.log(`- Blocked commands: ${config.tools.bash.blockedCommands.join(", ")}`);
  }
}

/**
 * Run all examples
 */
async function main() {
  console.log("🚀 Kraken Configuration System Examples\n");
  console.log("=" .repeat(50));

  try {
    await example1_LoadConfig();
    await example2_GlobalConfig();
    await example3_CreateAgent();
    await example4_EnvironmentConfigs();
    await example5_EnvOverrides();
    await example6_MinimalConfig();
    await example7_ToolConfig();

    console.log("\n" + "=".repeat(50));
    console.log("\n✅ All examples completed successfully!");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_LoadConfig,
  example2_GlobalConfig,
  example3_CreateAgent,
  example4_EnvironmentConfigs,
  example5_EnvOverrides,
  example6_MinimalConfig,
  example7_ToolConfig,
};
