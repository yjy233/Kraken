import type { OpenAIClient, ChatMessage } from "../llm/OpenAIClient";
import type { ToolRegistry } from "../tools/ToolRegistry";
import type { SessionStore } from "../session/SessionStore";
import type { Sandbox } from "../sandbox/Sandbox";
import type { Logger } from "../utils/logger";
import { extractJson } from "../utils/text";

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

  constructor(params: {
    llm: OpenAIClient;
    tools: ToolRegistry;
    sessions: SessionStore;
    sandbox: Sandbox;
    logger: Logger;
    options: ReActAgentOptions;
  }) {
    this.llm = params.llm;
    this.tools = params.tools;
    this.sessions = params.sessions;
    this.sandbox = params.sandbox;
    this.logger = params.logger;
    this.options = params.options;
  }

  async run(sessionId: string, input: string): Promise<string> {
    this.sessions.append(sessionId, { role: "user", content: input });
    await this.sessions.compressIfNeeded(sessionId);

    const maxIterations = this.options.maxIterations ?? 6;

    for (let step = 0; step < maxIterations; step++) {
      const messages = this.buildMessages(sessionId);
      const response = await this.llm.chatCompletion({
        model: this.options.model,
        messages,
        temperature: this.options.temperature ?? 0.2
      });

      const parsed = this.parseResponse(response.content);

      if (parsed.type === "final") {
        this.sessions.append(sessionId, { role: "assistant", content: parsed.final });
        return parsed.final;
      }

      if (parsed.type === "tool") {
        const tool = this.tools.get(parsed.tool_name);
        if (!tool) {
          const error = `Unknown tool: ${parsed.tool_name}`;
          this.sessions.append(sessionId, { role: "assistant", content: error });
          return error;
        }

        const result = await tool.run(parsed.tool_input, {
          sandbox: this.sandbox,
          sessionId,
          logger: this.logger
        });

        this.sessions.append(sessionId, {
          role: "tool",
          name: parsed.tool_name,
          content: result.content
        });

        await this.sessions.compressIfNeeded(sessionId);
        continue;
      }

      const error = "Invalid model response."
      this.sessions.append(sessionId, { role: "assistant", content: error });
      return error;
    }

    const fallback = "I could not finish within the step limit.";
    this.sessions.append(sessionId, { role: "assistant", content: fallback });
    return fallback;
  }

  private buildMessages(sessionId: string): ChatMessage[] {
    const toolList = this.tools.list()
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join("\n");

    const systemMessage: ChatMessage = {
      role: "system",
      content:
        "You are an AI assistant using a ReAct loop. " +
        "Use tools when needed. " +
        "Respond ONLY with valid JSON. " +
        "Output schema: {\"type\":\"tool\",\"tool_name\":string,\"tool_input\":object} or {\"type\":\"final\",\"final\":string}. " +
        `Available tools:\n${toolList}`
    };

    return [systemMessage, ...this.sessions.get(sessionId)];
  }

  private parseResponse(content: string):
    | { type: "final"; final: string }
    | { type: "tool"; tool_name: string; tool_input: Record<string, unknown> }
    | { type: "error" } {
    const parsed = extractJson(content);
    if (!parsed || typeof parsed !== "object") return { type: "error" };

    const value = parsed as Record<string, unknown>;
    if (value.type === "final" && typeof value.final === "string") {
      return { type: "final", final: value.final };
    }

    if (value.type === "tool" && typeof value.tool_name === "string" && typeof value.tool_input === "object") {
      return { type: "tool", tool_name: value.tool_name, tool_input: value.tool_input as Record<string, unknown> };
    }

    return { type: "error" };
  }
}
