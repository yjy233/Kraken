/**
 * Message Compressor
 *
 * Compresses chat messages when they exceed model context window limits
 * Based on requirements in 1.md:
 * - Compress if messages exceed 50% of model context window
 * - If still over limit after compression, truncate to 90% of window
 * - Uses separate compression model from config
 */

import { approximateTokens } from "../utils/text";
import type { ChatMessage, LLMClient } from "./types";

export interface MessageCompressorOptions {
  /** Model context window size (in tokens) */
  contextWindow: number;

  /** Compression model to use */
  compressionModel: string;

  /** Compression trigger threshold (default: 0.5 = 50%) */
  compressionThreshold?: number;

  /** Maximum allowed percentage after compression (default: 0.9 = 90%) */
  maxAllowedPercentage?: number;

  /** Target tokens after compression (default: 40% of context window) */
  compressionTargetTokens?: number;

  /** Number of recent messages to preserve (default: 6) */
  keepRecentMessages?: number;
}

export interface CompressionResult {
  /** Compressed messages */
  messages: ChatMessage[];

  /** Whether compression was performed */
  compressed: boolean;

  /** Whether truncation was performed */
  truncated: boolean;

  /** Original token count */
  originalTokens: number;

  /** Final token count */
  finalTokens: number;
}

export class MessageCompressor {
  private options: Required<MessageCompressorOptions>;
  private llm: LLMClient;

  constructor(llm: LLMClient, options: MessageCompressorOptions) {
    this.llm = llm;
    this.options = {
      contextWindow: options.contextWindow,
      compressionModel: options.compressionModel,
      compressionThreshold: options.compressionThreshold ?? 0.5,
      maxAllowedPercentage: options.maxAllowedPercentage ?? 0.9,
      compressionTargetTokens: options.compressionTargetTokens ?? Math.floor(options.contextWindow * 0.4),
      keepRecentMessages: options.keepRecentMessages ?? 6
    };
  }

  /**
   * Calculate total tokens in messages
   */
  private calculateTokens(messages: ChatMessage[]): number {
    return messages.reduce((sum, msg) => {
      const content = msg.content || "";
      const toolCallsText = msg.tool_calls ? JSON.stringify(msg.tool_calls) : "";
      return sum + approximateTokens(content + toolCallsText);
    }, 0);
  }

  /**
   * Check if messages need compression
   */
  needsCompression(messages: ChatMessage[]): boolean {
    const totalTokens = this.calculateTokens(messages);
    const threshold = this.options.contextWindow * this.options.compressionThreshold;
    return totalTokens > threshold;
  }

  /**
   * Compress messages using LLM summarization
   */
  private async compressMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
    if (messages.length === 0) {
      return messages;
    }

    // Keep recent messages, compress the rest
    const keepTail = this.options.keepRecentMessages;
    const head = messages.slice(0, Math.max(0, messages.length - keepTail));
    const tail = messages.slice(Math.max(0, messages.length - keepTail));

    // If nothing to compress, return original
    if (head.length === 0) {
      return messages;
    }

    // Create text representation of conversation history
    const historyText = head
      .map((msg) => {
        let text = `${msg.role.toUpperCase()}: ${msg.content || ""}`;
        if (msg.tool_calls) {
          text += ` [Tool calls: ${msg.tool_calls.map((tc) => tc.function.name).join(", ")}]`;
        }
        return text;
      })
      .join("\n");

    // Summarize using compression model
    const summaryResponse = await this.llm.chatCompletion({
      model: this.options.compressionModel,
      messages: [
        {
          role: "system",
          content:
            "Summarize the conversation briefly, preserving key facts, decisions, context, and open tasks. Be concise but complete."
        },
        {
          role: "user",
          content: historyText
        }
      ],
      temperature: 0.2,
      max_tokens: this.options.compressionTargetTokens
    });

    // Create summary message
    const summaryMessage: ChatMessage = {
      role: "system",
      content: `Summary of earlier conversation:\n${summaryResponse.content?.trim() || ""}`
    };

    // Return summary + recent messages
    return [summaryMessage, ...tail];
  }

  /**
   * Truncate messages to fit within limit
   */
  private truncateMessages(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    if (messages.length === 0) {
      return messages;
    }

    // Always keep system messages at the start
    const systemMessages = messages.filter(msg => msg.role === "system");
    const otherMessages = messages.filter(msg => msg.role !== "system");

    const result: ChatMessage[] = [...systemMessages];
    let currentTokens = this.calculateTokens(systemMessages);

    // Add messages from the end (most recent) until we hit the limit
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const msg = otherMessages[i];
      const msgTokens = approximateTokens((msg.content || "") + (msg.tool_calls ? JSON.stringify(msg.tool_calls) : ""));

      if (currentTokens + msgTokens <= maxTokens) {
        result.splice(systemMessages.length, 0, msg); // Insert after system messages
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Compress messages if needed
   *
   * Process:
   * 1. Check if messages exceed 50% of context window
   * 2. If yes, compress using LLM summarization
   * 3. If still over limit, truncate to 90% of window
   */
  async compressIfNeeded(messages: ChatMessage[]): Promise<CompressionResult> {
    const originalTokens = this.calculateTokens(messages);
    const threshold = this.options.contextWindow * this.options.compressionThreshold;
    const maxAllowed = Math.floor(this.options.contextWindow * this.options.maxAllowedPercentage);

    let result: ChatMessage[] = messages;
    let compressed = false;
    let truncated = false;

    // Step 1: Check if compression is needed (exceeds 50% threshold)
    if (originalTokens > threshold) {
      // Step 2: Compress using LLM
      result = await this.compressMessages(result);
      compressed = true;

      const tokensAfterCompression = this.calculateTokens(result);

      // Step 3: If still over limit, truncate to 90%
      if (tokensAfterCompression > maxAllowed) {
        result = this.truncateMessages(result, maxAllowed);
        truncated = true;
      }
    }

    const finalTokens = this.calculateTokens(result);

    return {
      messages: result,
      compressed,
      truncated,
      originalTokens,
      finalTokens
    };
  }

  /**
   * Update compressor options
   */
  updateOptions(options: Partial<MessageCompressorOptions>): void {
    if (options.contextWindow !== undefined) {
      this.options.contextWindow = options.contextWindow;
    }
    if (options.compressionModel !== undefined) {
      this.options.compressionModel = options.compressionModel;
    }
    if (options.compressionThreshold !== undefined) {
      this.options.compressionThreshold = options.compressionThreshold;
    }
    if (options.maxAllowedPercentage !== undefined) {
      this.options.maxAllowedPercentage = options.maxAllowedPercentage;
    }
    if (options.compressionTargetTokens !== undefined) {
      this.options.compressionTargetTokens = options.compressionTargetTokens;
    }
    if (options.keepRecentMessages !== undefined) {
      this.options.keepRecentMessages = options.keepRecentMessages;
    }
  }

  /**
   * Get current options
   */
  getOptions(): Readonly<Required<MessageCompressorOptions>> {
    return { ...this.options };
  }
}
