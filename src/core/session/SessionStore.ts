import { approximateTokens } from "../utils/text";
import type { ChatMessage, LLMClient } from "../llm/types";
import { saveSessionHistory } from "./persistence";

export interface SessionOptions {
  maxTokens: number;
  compressionTargetTokens: number;
  summaryModel: string;
  workspaceRoot?: string; // Optional workspace root for saving history
}

export class SessionStore {
  private sessions = new Map<string, ChatMessage[]>();
  private options: SessionOptions;
  private llm: LLMClient;

  constructor(options: SessionOptions, llm: LLMClient) {
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

  /**
   * Save session history to disk
   * Saves to workspace/.Kraken/sessions/:sessionId/history.json
   */
  async saveHistory(sessionId: string): Promise<void> {
    if (!this.options.workspaceRoot) {
      return; // No workspace configured, skip saving
    }

    const messages = this.get(sessionId);
    try {
      await saveSessionHistory(this.options.workspaceRoot, sessionId, messages);
    } catch (error) {
      console.warn(`Failed to save session history for ${sessionId}:`, error);
    }
  }

  /**
   * Clear all messages for a session
   */
  clear(sessionId: string): void {
    this.sessions.set(sessionId, []);
  }

  async compressIfNeeded(sessionId: string): Promise<void> {
    const messages = this.get(sessionId);
    const totalTokens = messages.reduce((sum, msg) => {
      const content = msg.content || "";
      const toolCallsText = msg.tool_calls ? JSON.stringify(msg.tool_calls) : "";
      return sum + approximateTokens(content + toolCallsText);
    }, 0);

    if (totalTokens <= this.options.maxTokens) return;

    const keepTail = 6;
    const head = messages.slice(0, Math.max(0, messages.length - keepTail));
    const tail = messages.slice(Math.max(0, messages.length - keepTail));

    if (head.length === 0) return;

    const historyText = head
      .map((msg) => {
        let text = `${msg.role.toUpperCase()}: ${msg.content || ""}`;
        if (msg.tool_calls) {
          text += ` [Tool calls: ${msg.tool_calls.map((tc) => tc.function.name).join(", ")}]`;
        }
        return text;
      })
      .join("\n");

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
      content: `Summary of earlier conversation: ${summaryResponse.content?.trim() || ""}`
    };

    this.sessions.set(sessionId, [summaryMessage, ...tail]);
  }
}
