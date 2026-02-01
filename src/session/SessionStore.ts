import { approximateTokens } from "../utils/text";
import type { ChatMessage } from "../llm/OpenAIClient";
import type { OpenAIClient } from "../llm/OpenAIClient";

export interface SessionOptions {
  maxTokens: number;
  compressionTargetTokens: number;
  summaryModel: string;
}

export class SessionStore {
  private sessions = new Map<string, ChatMessage[]>();
  private options: SessionOptions;
  private llm: OpenAIClient;

  constructor(options: SessionOptions, llm: OpenAIClient) {
    this.options = options;
    this.llm = llm;
  }

  get(sessionId: string): ChatMessage[] {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    return this.sessions.get(sessionId)!;
  }

  append(sessionId: string, message: ChatMessage): void {
    const messages = this.get(sessionId);
    messages.push(message);
  }

  async compressIfNeeded(sessionId: string): Promise<void> {
    const messages = this.get(sessionId);
    const totalTokens = messages.reduce((sum, msg) => sum + approximateTokens(msg.content), 0);

    if (totalTokens <= this.options.maxTokens) return;

    const keepTail = 6;
    const head = messages.slice(0, Math.max(0, messages.length - keepTail));
    const tail = messages.slice(Math.max(0, messages.length - keepTail));

    if (head.length === 0) return;

    const historyText = head.map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n");

    const summaryResponse = await this.llm.chatCompletion({
      model: this.options.summaryModel,
      messages: [
        {
          role: "system",
          content:
            "Summarize the conversation briefly, preserving key facts, decisions, and open tasks."
        },
        {
          role: "user",
          content: historyText
        }
      ],
      temperature: 0.2,
      max_tokens: this.options.compressionTargetTokens
    });

    const summaryMessage: ChatMessage = {
      role: "system",
      content: `Summary of earlier conversation: ${summaryResponse.content.trim()}`
    };

    this.sessions.set(sessionId, [summaryMessage, ...tail]);
  }
}
