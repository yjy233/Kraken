import type { ChatCompletionRequest, ChatCompletionResponse, LLMClient } from "./types";

export interface OpenAIClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class OpenAIClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: OpenAIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.timeoutMs = options.timeoutMs ?? 60_000;
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.2
      };

      if (request.max_tokens) {
        body.max_tokens = request.max_tokens;
      }

      if (request.tools && request.tools.length > 0) {
        body.tools = request.tools;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
      }

      const data = await response.json();
      const message = data?.choices?.[0]?.message;
      const content = message?.content ?? null;
      const tool_calls = message?.tool_calls;

      return { content, tool_calls, raw: data };
    } finally {
      clearTimeout(timeout);
    }
  }
}
