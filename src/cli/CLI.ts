import readline from "node:readline";
import type { MessageBus } from "../core/messagebus";
import type { ReActAgent } from "../core/agent/ReActAgent";
import {
  createCard,
  createBadge,
  createHeading,
  createDivider,
  createListItem,
  formatToolData,
  colors,
  symbols
} from "./ui";
import { generateSessionId } from "./sessionUtils";

export class CLI {
  private messageBus: MessageBus;
  private agent: ReActAgent;
  private sessionId: string;
  private rl: readline.Interface;

  constructor(params: { messageBus: MessageBus; agent: ReActAgent; sessionId?: string }) {
    this.messageBus = params.messageBus;
    this.agent = params.agent;
    this.sessionId = params.sessionId ?? generateSessionId();
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    this.setupMessageBusListeners();
  }

  private setupMessageBusListeners() {
    this.messageBus.on("agent:thinking", (data) => {
      console.log("\n" + createCard({
        title: "Thinking",
        content: data.content,
        color: "cyan",
        icon: symbols.thinking
      }));
    });

    this.messageBus.on("agent:tool_call", (data) => {
      const inputStr = formatToolData(data.input);
      console.log("\n" + createCard({
        title: `Tool Call: ${data.toolName}`,
        content: `Input:\n${inputStr}`,
        color: "yellow",
        icon: symbols.tool
      }));
    });

    this.messageBus.on("agent:tool_result", (data) => {
      const status = data.ok ? "success" : "error";
      const statusBadge = createBadge(data.ok ? "Success" : "Failed", status);

      // Truncate very long results
      let resultContent = data.result;
      if (resultContent.length > 500) {
        resultContent = resultContent.slice(0, 500) + "\n" + colors.gray + "... (output truncated)" + colors.reset;
      }

      console.log("\n" + createCard({
        title: `Tool Result: ${data.toolName} ${statusBadge}`,
        content: resultContent,
        color: data.ok ? "green" : "red",
        icon: data.ok ? symbols.success : symbols.error
      }));
    });

    this.messageBus.on("agent:response", (data) => {
      console.log("\n" + createHeading("Assistant Response", 1));
      console.log("\n" + colors.white + data.content + colors.reset + "\n");
      console.log(createDivider("─", 80) + "\n");
    });

    this.messageBus.on("agent:error", (data) => {
      console.log("\n" + createCard({
        title: "Error",
        content: data.error,
        color: "red",
        icon: symbols.error
      }));
    });

    this.messageBus.on("system:log", (data) => {
      if (data.level === "error" || data.level === "warn") {
        const badge = createBadge(data.level.toUpperCase(), data.level === "error" ? "error" : "warning");
        console.error(`\n${badge} ${data.message}`, data.data || "");
      }
    });
  }

  async start() {
    // Display welcome banner
    console.clear();
    console.log(createHeading("🐙 Kraken AI Assistant", 1));
    console.log(colors.gray + "Powered by ReAct Agent with Advanced Reasoning\n" + colors.reset);
    console.log(createListItem("Type your message and press Enter", symbols.info));
    console.log(createListItem("Press Ctrl+C to exit", symbols.info));
    console.log(createListItem(`Session ID: ${this.sessionId}`, symbols.info));
    console.log("\n" + createDivider("─", 80) + "\n");

    this.rl.on("line", async (line) => {
      if (!line.trim()) return;

      // Display user message
      console.log("\n" + createHeading("You", 2));
      console.log(colors.white + line + colors.reset + "\n");
      console.log(createDivider("─", 80));

      try {
        await this.agent.run(this.sessionId, line);
      } catch (error) {
        console.log("\n" + createCard({
          title: "Fatal Error",
          content: (error as Error).message,
          color: "red",
          icon: symbols.error
        }));
      }

      // Show prompt again
      console.log();
    });

    this.rl.on("close", () => {
      console.log("\n" + createHeading("👋 Goodbye!", 2));
      console.log(colors.gray + "Thanks for using Kraken!\n" + colors.reset);
      process.exit(0);
    });
  }
}
