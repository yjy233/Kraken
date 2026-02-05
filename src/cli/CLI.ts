import readline from "node:readline";
import type { MessageBus } from "../core/messagebus";
import type { ReActAgent } from "../core/agent/ReActAgent";

export class CLI {
  private messageBus: MessageBus;
  private agent: ReActAgent;
  private sessionId: string;
  private rl: readline.Interface;

  constructor(params: { messageBus: MessageBus; agent: ReActAgent; sessionId?: string }) {
    this.messageBus = params.messageBus;
    this.agent = params.agent;
    this.sessionId = params.sessionId ?? "cli";
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    this.setupMessageBusListeners();
  }

  private setupMessageBusListeners() {
    this.messageBus.on("agent:thinking", (data) => {
      console.log(`\n[Thinking] ${data.content}`);
    });

    this.messageBus.on("agent:tool_call", (data) => {
      console.log(`\n[Tool Call] ${data.toolName}`);
      console.log(`  Input: ${JSON.stringify(data.input, null, 2)}`);
    });

    this.messageBus.on("agent:tool_result", (data) => {
      const status = data.ok ? "✓" : "✗";
      console.log(`\n[Tool Result ${status}] ${data.toolName}`);
      const truncated = data.result.length > 200 ? data.result.slice(0, 200) + "..." : data.result;
      console.log(`  ${truncated}`);
    });

    this.messageBus.on("agent:response", (data) => {
      console.log(`\nAssistant: ${data.content}\n`);
    });

    this.messageBus.on("agent:error", (data) => {
      console.error(`\n[Error] ${data.error}\n`);
    });

    this.messageBus.on("system:log", (data) => {
      if (data.level === "error" || data.level === "warn") {
        console.error(`[${data.level.toUpperCase()}] ${data.message}`, data.data || "");
      }
    });
  }

  async start() {
    console.log("CLI mode. Type messages and press Enter. (Ctrl+C to exit)\n");

    this.rl.on("line", async (line) => {
      if (!line.trim()) return;

      try {
        await this.agent.run(this.sessionId, line);
      } catch (error) {
        console.error("\n[Fatal Error]", (error as Error).message);
      }
    });

    this.rl.on("close", () => {
      console.log("\nGoodbye!");
      process.exit(0);
    });
  }
}
