import { randomUUID } from "crypto";
import type { ChatCompletionRequest, ChatCompletionResponse, LLMClient, ToolCall } from "./types";

export interface GeminiClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown> | string;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
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

function createToolCallId(): string {
  try {
    return randomUUID();
  } catch {
    return `gemini_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export class GeminiClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: GeminiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta").replace(
      /\/+$/,
      ""
    );
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const systemParts: string[] = [];
      const contents: GeminiContent[] = [];
      const toolNameById = new Map<string, string>();

      for (const message of request.messages) {
        if (message.role === "system") {
          if (message.content) systemParts.push(message.content);
          continue;
        }

        if (message.role === "assistant" && message.tool_calls && message.tool_calls.length > 0) {
          const parts: GeminiPart[] = [];
          if (message.content) {
            parts.push({ text: message.content });
          }
          for (const toolCall of message.tool_calls) {
            toolNameById.set(toolCall.id, toolCall.function.name);
            const args = safeParseArgs(toolCall.function.arguments);
            parts.push({
              functionCall: {
                name: toolCall.function.name,
                args
              }
            });
          }
          contents.push({ role: "model", parts });
          continue;
        }

        if (message.role === "tool") {
          const toolName = message.tool_call_id
            ? toolNameById.get(message.tool_call_id) ?? "tool"
            : "tool";
          contents.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: toolName,
                  response: { content: message.content ?? "" }
                }
              }
            ]
          });
          continue;
        }

        const textContent = message.content ?? "";
        if (message.role === "user") {
          contents.push({ role: "user", parts: [{ text: textContent }] });
        } else if (message.role === "assistant") {
          contents.push({ role: "model", parts: [{ text: textContent }] });
        }
      }

      const body: Record<string, unknown> = {
        contents
      };

      if (systemParts.length > 0) {
        body.systemInstruction = {
          role: "system",
          parts: [{ text: systemParts.join("\n") }]
        };
      }

      if (request.tools && request.tools.length > 0) {
        body.tools = [
          {
            functionDeclarations: request.tools.map((tool) => ({
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters
            }))
          }
        ];
      }

      if (request.temperature !== undefined || request.max_tokens !== undefined) {
        body.generationConfig = {
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
          ...(request.max_tokens !== undefined ? { maxOutputTokens: request.max_tokens } : {})
        };
      }

      const modelPath = request.model.startsWith("models/")
        ? request.model
        : `models/${request.model}`;
      const url = `${this.baseUrl}/${modelPath}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorBody}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];
      const toolCalls: ToolCall[] = [];
      const textChunks: string[] = [];

      for (const part of parts) {
        if (part.text) {
          textChunks.push(part.text);
        }
        if (part.functionCall) {
          const args = part.functionCall.args ?? {};
          const argumentsString =
            typeof args === "string" ? args : JSON.stringify(args ?? {});
          toolCalls.push({
            id: createToolCallId(),
            type: "function",
            function: {
              name: part.functionCall.name,
              arguments: argumentsString
            }
          });
        }
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
