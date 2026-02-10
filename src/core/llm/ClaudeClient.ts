import type { ChatCompletionRequest, ChatCompletionResponse, LLMClient, ToolCall } from "./types";

export interface ClaudeClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  anthropicVersion?: string;
}

interface ClaudeTextBlock {
  type: "text";
  text: string;
}

interface ClaudeToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ClaudeToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

type ClaudeContentBlock = ClaudeTextBlock | ClaudeToolUseBlock | ClaudeToolResultBlock;

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContentBlock[];
}

function safeParseArgs(value: string): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
  return {};
}

export class ClaudeClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private anthropicVersion: string;

  constructor(options: ClaudeClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.anthropic.com/v1").replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.anthropicVersion = options.anthropicVersion ?? "2023-06-01";
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const systemParts: string[] = [];
      const messages: ClaudeMessage[] = [];
      const toolNameById = new Map<string, string>();

      for (const message of request.messages) {
        if (message.role === "system") {
          if (message.content) systemParts.push(message.content);
          continue;
        }

        if (message.role === "assistant" && message.tool_calls && message.tool_calls.length > 0) {
          const content: ClaudeContentBlock[] = [];
          if (message.content) {
            content.push({ type: "text", text: message.content });
          }
          for (const toolCall of message.tool_calls) {
            toolNameById.set(toolCall.id, toolCall.function.name);
            content.push({
              type: "tool_use",
              id: toolCall.id,
              name: toolCall.function.name,
              input: safeParseArgs(toolCall.function.arguments)
            });
          }
          messages.push({ role: "assistant", content });
          continue;
        }

        if (message.role === "tool") {
          const toolUseId = message.tool_call_id ?? "";
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUseId,
                content: message.content ?? ""
              }
            ]
          });
          continue;
        }

        if (message.role === "user") {
          messages.push({ role: "user", content: message.content ?? "" });
        } else if (message.role === "assistant") {
          messages.push({ role: "assistant", content: message.content ?? "" });
        }
      }

      const body: Record<string, unknown> = {
        model: request.model,
        max_tokens: request.max_tokens ?? 1024,
        temperature: request.temperature ?? 0.2,
        messages
      };

      if (systemParts.length > 0) {
        body.system = systemParts.join("\n");
      }

      if (request.tools && request.tools.length > 0) {
        body.tools = request.tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters
        }));
      }

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": this.anthropicVersion
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Claude API error: ${response.status} ${errorBody}`);
      }

      const data = await response.json();
      const blocks = data?.content;
      const toolCalls: ToolCall[] = [];
      const textChunks: string[] = [];

      if (Array.isArray(blocks)) {
        for (const block of blocks) {
          if (block?.type === "text" && typeof block.text === "string") {
            textChunks.push(block.text);
          }
          if (block?.type === "tool_use") {
            const argumentsString = JSON.stringify(block.input ?? {});
            toolCalls.push({
              id: block.id,
              type: "function",
              function: {
                name: block.name,
                arguments: argumentsString
              }
            });
          }
        }
      } else if (typeof blocks === "string") {
        textChunks.push(blocks);
      }

      if (toolCalls.length > 0) {
        return { content: null, tool_calls: toolCalls, raw: data };
      }

      return { content: textChunks.join(""), raw: data };
    } finally {
      clearTimeout(timeout);
    }
  }
}
