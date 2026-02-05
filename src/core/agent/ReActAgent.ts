import type { OpenAIClient, ChatMessage, ToolDefinition as OpenAIToolDef } from "../llm/OpenAIClient";
import type { ToolRegistry } from "../tools/ToolRegistry";
import type { SessionStore } from "../session/SessionStore";
import type { Sandbox } from "../sandbox/Sandbox";
import type { Logger } from "../utils/logger";
import type { MessageBus } from "../messagebus";

export interface ReActAgentOptions {
  model: string;
  maxIterations?: number;
  temperature?: number;
}

export class ReActAgent {
  private llm: OpenAIClient;
  private tools: ToolRegistry;
  private sessions: SessionStore;
  private sandbox: Sandbox;
  private logger: Logger;
  private options: ReActAgentOptions;
  private messageBus?: MessageBus;

  constructor(params: {
    llm: OpenAIClient;
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
  }

  async run(sessionId: string, input: string): Promise<string> {
    this.sessions.append(sessionId, { role: "user", content: input });
    await this.sessions.compressIfNeeded(sessionId);

    const maxIterations = this.options.maxIterations ?? 6;

    for (let step = 0; step < maxIterations; step++) {
      this.messageBus?.emit("agent:thinking", { content: `Step ${step + 1}/${maxIterations}` });

      const messages = this.buildMessages(sessionId);
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
        this.messageBus?.emit("agent:response", { content: response.content });
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
            this.messageBus?.emit("agent:error", { error: errorMsg });
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
            this.messageBus?.emit("agent:error", { error: errorMsg });
            this.sessions.append(sessionId, {
              role: "tool",
              tool_call_id: toolCall.id,
              content: errorMsg
            });
            continue;
          }

          this.messageBus?.emit("agent:tool_call", { toolName, input: toolInput });

          const result = await tool.run(toolInput, {
            sandbox: this.sandbox,
            sessionId,
            logger: this.logger
          });

          this.messageBus?.emit("agent:tool_result", {
            toolName,
            result: result.content,
            ok: result.ok
          });

          this.sessions.append(sessionId, {
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.content
          });
        }

        await this.sessions.compressIfNeeded(sessionId);
        continue;
      }

      // No content and no tool calls - invalid response
      const error = "Invalid model response: no content or tool calls";
      this.sessions.append(sessionId, { role: "assistant", content: error });
      this.messageBus?.emit("agent:error", { error });
      return error;
    }

    const fallback = "I could not finish within the step limit.";
    this.sessions.append(sessionId, { role: "assistant", content: fallback });
    this.messageBus?.emit("agent:error", { error: fallback });
    return fallback;
  }

  private buildMessages(sessionId: string): ChatMessage[] {
    const systemMessage: ChatMessage = {
      role: "system",
      content:
        "You are an AI assistant. " +
        "Use the available tools to help answer user questions. " +
        "Call tools when needed to gather information or perform actions."
    };

    return [systemMessage, ...this.sessions.get(sessionId)];
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
