export interface OpenAIClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  raw: unknown;
}

export class OpenAIClient {
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.2,
          max_tokens: request.max_tokens
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      return { content, raw: data };
    } finally {
      clearTimeout(timeout);
    }
  }
}
