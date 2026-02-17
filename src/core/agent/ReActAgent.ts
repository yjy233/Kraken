import type { LLMClient, ChatMessage, ToolDefinition as OpenAIToolDef } from "../llm/types";
import type { ToolRegistry } from "../tools/ToolRegistry";
import type { SessionStore } from "../session/SessionStore";
import type { Sandbox } from "../sandbox/Sandbox";
import type { Logger } from "../utils/logger";
import type { MessageBus } from "../messagebus";
import { SYSTEM_PROMPT, buildWorkspaceContext } from "./prompts";
import { scanSkills } from "../skills/scanner";
import type { Skill } from "../skills/types";
import { createActivateSkillTool } from "../tools/core_tool/activate_skill";

/**
 *
 * A ReActAgent that uses a ReAct prompting strategy to interact with an LLM, execute tools, and manage sessions.
 * The agent will iterate through thinking, tool calling, and responding until it reaches a final answer or hits the iteration limit.
 */
export interface ReActAgentOptions {
  model: string;
  maxIterations?: number;
  temperature?: number;
  systemPrompt?: string; // Allow custom system prompt
  workspaceRoot?: string; // Workspace directory for context
}

/**
 * ReActAgent class that implements the ReAct prompting strategy.
 */
export class ReActAgent {
  private llm: LLMClient;
  private tools: ToolRegistry;
  private sessions: SessionStore;
  private sandbox: Sandbox;
  private logger: Logger;
  private options: ReActAgentOptions;
  private messageBus?: MessageBus;
  private workspaceContextCache?: string;
  private availableSkills: Skill[] = [];
  private skillsPrompt?: string;

  constructor(params: {
    llm: LLMClient;
    tools: ToolRegistry;
    sessions: SessionStore;
    sandbox: Sandbox;
    logger: Logger;
    options: ReActAgentOptions;
    messageBus?: MessageBus;
  }) {
    this.llm = params.llm;
    this.tools = params.tools;
    this.sessions = params.sessions;
    this.sandbox = params.sandbox;
    this.logger = params.logger;
    this.options = params.options;
    this.messageBus = params.messageBus;

    // Initialize skills if workspace is configured
    if (this.options.workspaceRoot) {
      this.initializeSkills().catch((error) => {
        this.logger.warn(`Failed to initialize skills: ${error}`);
      });
    }
  }

  /**
   * Initialize skills by scanning workspace/.skills directory
   */
  private async initializeSkills(): Promise<void> {
    if (!this.options.workspaceRoot) return;

    try {
      this.availableSkills = await scanSkills(this.options.workspaceRoot);

      if (this.availableSkills.length > 0) {
        // Register activate_skill tool
        const activateSkillTool = createActivateSkillTool(this.availableSkills);
        this.tools.register(activateSkillTool);

        // Build skills prompt
        this.skillsPrompt = this.buildSkillsPrompt();

        this.logger.info(`Loaded ${this.availableSkills.length} skills: ${this.availableSkills.map(s => s.name).join(", ")}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to scan skills: ${error}`);
    }
  }

  /**
   * Build skills prompt for system message
   */
  private buildSkillsPrompt(): string {
    if (this.availableSkills.length === 0) return "";

    const skillsInfo = this.availableSkills.map(skill => {
      return `- **${skill.name}**: ${skill.description}
  - Path: \`${skill.path}\`
  - Use \`activate_skill\` tool to get full documentation and file structure`;
    }).join("\n");

    return `
## Available Skills

You have access to the following skills in the workspace:

${skillsInfo}

To use a skill, first activate it using the \`activate_skill\` tool with the skill name as parameter. This will provide you with:
- Full documentation
- File structure
- Usage instructions

After activation, you can use the skill's resources to help the user.
`;
  }

  /**
   * Clear all messages for a session
   */
  clearSession(sessionId: string): void {
    this.sessions.clear(sessionId);
  }

  async run(sessionId: string, input: string): Promise<string> {
    this.sessions.append(sessionId, { role: "user", content: input });
    await this.sessions.compressIfNeeded(sessionId);

    // 构建初始消息（用于保存历史时包含 system、workspace、skills）
    const initialMessages = await this.buildInitialMessages();

    const maxIterations = this.options.maxIterations ?? 6;

    for (let step = 0; step < maxIterations; step++) {
      this.messageBus?.emit("agent:thinking", { content: `Step ${step + 1}/${maxIterations}`, sessionId });

      const messages = await this.buildMessages(sessionId);
      const toolDefinitions = this.buildToolDefinitions();

      const response = await this.llm.chatCompletion({
        model: this.options.model,
        messages,
        temperature: this.options.temperature ?? 0.2,
        tools: toolDefinitions
      });

      // If the model returns a text response (final answer)
      if (response.content && !response.tool_calls) {
        this.sessions.append(sessionId, { role: "assistant", content: response.content });
        this.messageBus?.emit("agent:response", { content: response.content, sessionId });

        // Save session history after each conversation turn (包含初始消息)
        await this.sessions.saveHistory(sessionId, initialMessages);

        return response.content;
      }

      // If the model wants to call tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Add assistant message with tool calls
        this.sessions.append(sessionId, {
          role: "assistant",
          content: null,
          tool_calls: response.tool_calls
        });

        // Execute each tool call
        for (const toolCall of response.tool_calls) {
          const toolName = toolCall.function.name;
          const tool = this.tools.get(toolName);

          if (!tool) {
            const errorMsg = `Unknown tool: ${toolName}`;
            this.messageBus?.emit("agent:error", { error: errorMsg, sessionId });
            this.sessions.append(sessionId, {
              role: "tool",
              tool_call_id: toolCall.id,
              content: errorMsg
            });
            continue;
          }

          let toolInput: Record<string, unknown>;
          try {
            toolInput = JSON.parse(toolCall.function.arguments);
          } catch (error) {
            const errorMsg = `Invalid tool arguments: ${(error as Error).message}`;
            this.messageBus?.emit("agent:error", { error: errorMsg, sessionId });
            this.sessions.append(sessionId, {
              role: "tool",
              tool_call_id: toolCall.id,
              content: errorMsg
            });
            continue;
          }

          this.messageBus?.emit("agent:tool_call", { toolName, input: toolInput, sessionId });

          const result = await tool.run(toolInput, {
            sandbox: this.sandbox,
            sessionId,
            logger: this.logger
          });

          this.messageBus?.emit("agent:tool_result", {
            toolName,
            result: result.content,
            ok: result.ok,
            sessionId,
          });

          this.sessions.append(sessionId, {
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.content
          });
        }

        // Save history after tool calls complete (before next iteration, 包含初始消息)
        await this.sessions.saveHistory(sessionId, initialMessages);

        await this.sessions.compressIfNeeded(sessionId);
        continue;
      }

      // No content and no tool calls - invalid response
      const error = "Invalid model response: no content or tool calls";
      this.sessions.append(sessionId, { role: "assistant", content: error });
      this.messageBus?.emit("agent:error", { error, sessionId });

      console.log("save history`, message", messages);
      // Save session history even on error (包含初始消息)
      await this.sessions.saveHistory(sessionId, initialMessages);

      return error;
    }

    const fallback = "I could not finish within the step limit.";
    this.sessions.append(sessionId, { role: "assistant", content: fallback });
    this.messageBus?.emit("agent:error", { error: fallback, sessionId });

    // Save session history on iteration limit (包含初始消息)
    await this.sessions.saveHistory(sessionId, initialMessages);

    return fallback;
  }

  /**
   * 构建初始消息（system prompt、workspace context、skills）
   * 这些消息在每个请求的开头，但不存储在 session 中
   */
  private async buildInitialMessages(): Promise<ChatMessage[]> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: this.options.systemPrompt ?? SYSTEM_PROMPT
    };

    // Build workspace context message if workspaceRoot is provided
    // Only build once and cache it
    if (this.options.workspaceRoot && !this.workspaceContextCache) {
      try {
        this.workspaceContextCache = await buildWorkspaceContext({
          workspaceRoot: this.options.workspaceRoot,
          maxDepth: 2,
          maxFiles: 100
        });
      } catch (error) {
        this.logger.warn(`Failed to build workspace context: ${error}`);
      }
    }

    const messages: ChatMessage[] = [systemMessage];

    // Add workspace context as a system message if available
    if (this.workspaceContextCache) {
      messages.push({
        role: "user",
        content: this.workspaceContextCache
      });
    }

    // Add skills prompt if skills are available
    if (this.skillsPrompt) {
      messages.push({
        role: "user",
        content: this.skillsPrompt
      });
    }

    return messages;
  }

  private async buildMessages(sessionId: string): Promise<ChatMessage[]> {
    const initialMessages = await this.buildInitialMessages();
    const sessionMessages = this.sessions.get(sessionId);
    return [...initialMessages, ...sessionMessages];
  }

  private buildToolDefinitions(): OpenAIToolDef[] {
    return this.tools.list().map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }
}
