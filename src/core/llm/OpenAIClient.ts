import type { ChatCompletionRequest, ChatCompletionResponse, LLMClient } from "./types";
import { MessageCompressor } from "./MessageCompressor";
import { globalModelCache } from "./modelInfoFetcher";

export interface OpenAIClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Enable automatic message compression (default: true) */
  enableCompression?: boolean;
  /** Compression model (if not specified, uses main model) */
  compressionModel?: string;
  /** Compression threshold as percentage of context window (default: 0.5 = 50%) */
  compressionThreshold?: number;
  /** Maximum allowed percentage after compression (default: 0.9 = 90%) */
  maxAllowedPercentage?: number;
}

export class OpenAIClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private enableCompression: boolean;
  private compressionModel?: string;
  private compressionThreshold: number;
  private maxAllowedPercentage: number;
  private compressors: Map<string, MessageCompressor>;

  constructor(options: OpenAIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.enableCompression = options.enableCompression ?? true;
    this.compressionModel = options.compressionModel;
    this.compressionThreshold = options.compressionThreshold ?? 0.5;
    this.maxAllowedPercentage = options.maxAllowedPercentage ?? 0.9;
    this.compressors = new Map();
  }

  /**
   * Get or create compressor for a model
   */
  private getCompressor(model: string): MessageCompressor | null {
    if (!this.enableCompression) {
      return null;
    }

    if (!this.compressors.has(model)) {
      // Get model context window from model info cache
      const modelInfo = globalModelCache.getModelInfo(model);
      const contextWindow = modelInfo?.contextWindow ?? globalModelCache.getContextWindow(model);

      if (contextWindow <= 0) {
        console.warn(`[OpenAIClient] Could not determine context window for model ${model}, compression disabled`);
        return null;
      }

      // Use compression model or fallback to main model
      const compressionModel = this.compressionModel ?? model;

      const compressor = new MessageCompressor(this, {
        contextWindow,
        compressionModel,
        compressionThreshold: this.compressionThreshold,
        maxAllowedPercentage: this.maxAllowedPercentage
      });

      this.compressors.set(model, compressor);
    }

    return this.compressors.get(model)!;
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    let messages = request.messages;

    // Compress messages if needed
    if (this.enableCompression) {
      const compressor = this.getCompressor(request.model);
      if (compressor) {
        const compressionResult = await compressor.compressIfNeeded(messages);
        messages = compressionResult.messages;

        // Log compression details if it occurred
        if (compressionResult.compressed || compressionResult.truncated) {
          const actions: string[] = [];
          if (compressionResult.compressed) actions.push("compressed");
          if (compressionResult.truncated) actions.push("truncated");

          console.log(
            `[OpenAIClient] Messages ${actions.join(" and ")}: ` +
            `${compressionResult.originalTokens} → ${compressionResult.finalTokens} tokens`
          );
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: request.model,
        messages: messages, // Use potentially compressed messages
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
