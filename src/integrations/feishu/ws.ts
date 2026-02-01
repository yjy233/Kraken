import WebSocket from "ws";
import type { Logger } from "../../utils/logger";

export interface FeishuWsOptions {
  url: string;
  headers?: Record<string, string>;
  logger: Logger;
  onEvent: (event: unknown) => Promise<void> | void;
}

export class FeishuWsClient {
  private options: FeishuWsOptions;
  private ws?: WebSocket;

  constructor(options: FeishuWsOptions) {
    this.options = options;
  }

  connect(): void {
    this.options.logger.info("Connecting to Feishu WS", { url: this.options.url });
    this.ws = new WebSocket(this.options.url, { headers: this.options.headers });

    this.ws.on("open", () => {
      this.options.logger.info("Feishu WS connected");
    });

    this.ws.on("message", async (data) => {
      try {
        const raw = data.toString();
        const message = JSON.parse(raw);
        if (message?.type === "ping") {
          this.ws?.send(JSON.stringify({ type: "pong", ts: Date.now() }));
          return;
        }

        if (message?.challenge) {
          this.ws?.send(JSON.stringify({ challenge: message.challenge }));
        }

        await this.options.onEvent(message);
      } catch (error) {
        this.options.logger.warn("Feishu WS message handling error", {
          error: (error as Error).message
        });
      }
    });

    this.ws.on("close", (code, reason) => {
      this.options.logger.warn("Feishu WS closed", { code, reason: reason.toString() });
    });

    this.ws.on("error", (error) => {
      this.options.logger.error("Feishu WS error", { error: (error as Error).message });
    });
  }

  disconnect(): void {
    this.ws?.close();
  }
}
