/**
 * Kraken Agent for VSCode
 */
import * as vscode from "vscode";
import { config } from "dotenv";
import { ReActAgent } from "../core/agent/ReActAgent";
import { createLLMClient } from "../core/llm/LLMClientFactory";
import { ToolRegistry } from "../core/tools/ToolRegistry";
import { SessionStore } from "../core/session/SessionStore";
import { Sandbox } from "../core/sandbox/Sandbox";
import { createLogger, type Logger } from "../core/utils/logger";
import { MessageBus } from "../core/messagebus";
import { createBuiltinTools } from "../core/tools/core_tool";

// Load environment variables
config();

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
}

export class KrakenAgent {
  private agent: ReActAgent;
  private messageBus: MessageBus;
  private logger: Logger;

  constructor(context: vscode.ExtensionContext) {
    this.logger = createLogger("info");
    this.messageBus = new MessageBus();

    // Get configuration
    const config = vscode.workspace.getConfiguration("kraken");
    const model = config.get<string>("model", "gpt-4o-mini");
    const maxIterations = config.get<number>("maxIterations", 6);
    const temperature = config.get<number>("temperature", 0.2);

    // Get workspace root
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    // Initialize core components
    const llm = createLLMClient({
      protocol: "openai",
      apiKey: process.env.OPENAI_API_KEY || "",
      baseUrl: process.env.OPENAI_BASE_URL
    });

    const tools = createBuiltinTools();
    const toolRegistry = new ToolRegistry(tools);

    const sessions = new SessionStore(
      {
        maxTokens: 4000,
        compressionTargetTokens: 600,
        summaryModel: model,
        workspaceRoot
      },
      llm
    );

    const sandbox = new Sandbox({
      rootDir: workspaceRoot,
      allowedDirs: workspaceRoot ? [workspaceRoot] : [],
      maxFileSizeBytes: 1048576
    });

    // Create ReAct agent
    this.agent = new ReActAgent({
      llm,
      tools: toolRegistry,
      sessions,
      sandbox,
      logger: this.logger,
      options: {
        model,
        maxIterations,
        temperature,
        workspaceRoot
      },
      messageBus: this.messageBus
    });
  }

  /**
   * Get the message bus for event subscriptions
   */
  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  /**
   * Run the agent with user input
   */
  async run(sessionId: string, input: string): Promise<string> {
    return await this.agent.run(sessionId, input);
  }

  /**
   * Clear session history
   */
  clearSession(sessionId: string): void {
    this.agent.clearSession(sessionId);
  }

  /**
   * Get available skills (if any)
   */
  async getSkills(): Promise<SkillInfo[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return [];

    try {
      const { scanSkills } = await import("../core/skills/scanner");
      const skills = await scanSkills(workspaceRoot);
      return skills.map(s => ({
        name: s.name,
        description: s.description,
        path: s.path
      }));
    } catch (error) {
      this.logger.warn(`Failed to get skills: ${error}`);
      return [];
    }
  }
}
