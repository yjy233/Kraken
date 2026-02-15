import readline from "node:readline";
import type { MessageBus } from "../core/messagebus";
import type { ReActAgent } from "../core/agent/ReActAgent";
import {
  createCard,
  createBadge,
  createHeading,
  createDivider,
  createListItem,
  createInputPrompt,
  renderMarkdown,
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
  private availableCommands = ["/clear", "/exit", "/quit", "/help"];
  private commandHintShown = false;

  constructor(params: { messageBus: MessageBus; agent: ReActAgent; sessionId?: string }) {
    this.messageBus = params.messageBus;
    this.agent = params.agent;
    this.sessionId = params.sessionId ?? generateSessionId();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: createInputPrompt(),
      completer: this.completer.bind(this)
    });

    this.setupMessageBusListeners();
    this.setupInputMonitor();
  }

  /**
   * Monitor input and show command hints when / is typed
   */
  private setupInputMonitor(): void {
    // Poll the readline line buffer periodically
    const checkInterval = setInterval(() => {
      const line = (this.rl as any).line || '';

      if (line === '/' && !this.commandHintShown) {
        // User just typed /
        this.showCommandHint();
        this.commandHintShown = true;
      } else if (line !== '/' && this.commandHintShown) {
        // User typed more or deleted /
        this.clearCommandHint();
        this.commandHintShown = false;
      }
    }, 50); // Check every 50ms

    // Clear interval when readline closes
    this.rl.on('close', () => {
      clearInterval(checkInterval);
    });
  }

  /**
   * Show command hint below the input line
   */
  private showCommandHint(): void {
    // Save cursor position
    const cursorPos = (this.rl as any).cursor || 0;

    // Clear from cursor to end of screen
    process.stdout.write('\x1b[J');

    // Show hint on next line
    process.stdout.write('\n' + colors.gray + '  💡 ' + colors.reset);
    this.availableCommands.forEach((cmd, index) => {
      if (index > 0) process.stdout.write(colors.gray + '  ' + colors.reset);
      process.stdout.write(colors.yellow + cmd + colors.reset);
    });
    process.stdout.write(colors.gray + '  (Press Tab for autocomplete)' + colors.reset);

    // Move cursor back to input line
    process.stdout.write('\r\x1b[1A');

    // Restore the line with prompt
    const prompt = createInputPrompt();
    const line = (this.rl as any).line || '';
    process.stdout.write('\r' + prompt + line);
  }

  /**
   * Clear command hint
   */
  private clearCommandHint(): void {
    // Clear the hint line below
    process.stdout.write('\x1b[J');
  }

  /**
   * Autocomplete function for slash commands
   */
  private completer(line: string): [string[], string] {
    const trimmed = line.trim();

    // Only complete if line starts with /
    if (!trimmed.startsWith("/")) {
      return [[], line];
    }

    // Find matching commands
    const hits = this.availableCommands.filter((cmd) => cmd.startsWith(trimmed));

    // If typing just "/", show all commands
    if (trimmed === "/") {
      return [this.availableCommands, line];
    }

    // Show matching commands
    return [hits.length > 0 ? hits : this.availableCommands, line];
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
      console.log("\n" + renderMarkdown(data.content) + "\n");
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

  /**
   * Handle slash commands
   * Returns true if command was handled, false otherwise
   */
  private handleSlashCommand(command: string): boolean {
    const trimmed = command.trim();

    // Show help if user types just "/"
    if (trimmed === "/") {
      this.showCommandHelp();
      return true;
    }

    if (trimmed === "/help") {
      this.showCommandHelp();
      return true;
    }

    if (trimmed === "/clear") {
      // Clear current session
      this.agent.clearSession(this.sessionId);

      // Generate new session ID
      const oldSessionId = this.sessionId;
      this.sessionId = generateSessionId();

      // Clear screen and show message
      console.clear();
      console.log(createHeading("🐙 Kraken AI Assistant", 1));
      console.log(colors.gray + "Powered by ReAct Agent with Advanced Reasoning\n" + colors.reset);
      console.log(createListItem("Type your message and press Enter", symbols.info));
      console.log(createListItem("Press Ctrl+C or type /exit to exit", symbols.info));
      console.log(createListItem("Type /help to see available commands", symbols.info));
      console.log(createListItem(`Session ID: ${this.sessionId}`, symbols.info));
      console.log("\n" + createDivider("─", 80) + "\n");

      console.log(colors.green + "✓ Session cleared!" + colors.reset);
      console.log(colors.gray + `  Old session: ${oldSessionId}` + colors.reset);
      console.log(colors.gray + `  New session: ${this.sessionId}` + colors.reset);
      console.log("");

      return true;
    }

    if (trimmed === "/exit" || trimmed === "/quit") {
      console.log("\n" + createHeading("👋 Goodbye!", 2));
      console.log(colors.gray + "Thanks for using Kraken!" + colors.reset);
      console.log(colors.cyan + `Session ID: ${this.sessionId}` + colors.reset);
      console.log("");
      process.exit(0);
    }

    // Unknown command
    if (trimmed.startsWith("/")) {
      console.log(colors.red + "✗ Unknown command: " + trimmed + colors.reset);
      console.log(colors.gray + "  Type /help to see available commands" + colors.reset);
      console.log("");
      return true;
    }

    return false;
  }

  /**
   * Show available slash commands
   */
  private showCommandHelp(): void {
    console.log("\n" + createHeading("Available Commands", 2));
    console.log("");

    const commands = [
      { cmd: "/clear", desc: "Clear conversation and start a new session" },
      { cmd: "/exit", alias: "/quit", desc: "Exit the CLI gracefully" },
      { cmd: "/help", desc: "Show this help message" }
    ];

    commands.forEach(({ cmd, alias, desc }) => {
      const cmdText = alias ? `${cmd} ${colors.gray}(or ${alias})${colors.reset}` : cmd;
      console.log(colors.yellow + "  " + cmdText.padEnd(30) + colors.reset + colors.gray + desc + colors.reset);
    });

    console.log("");
    console.log(colors.gray + "💡 Tip: Press Tab after typing / to see command suggestions" + colors.reset);
    console.log("");
  }

  async start() {
    // Display welcome banner
    console.clear();
    console.log(createHeading("🐙 Kraken AI Assistant", 1));
    console.log(colors.gray + "Powered by ReAct Agent with Advanced Reasoning\n" + colors.reset);
    console.log(createListItem("Type your message and press Enter", symbols.info));
    console.log(createListItem("Press Ctrl+C or type /exit to exit", symbols.info));
    console.log(createListItem("Type /help to see available commands", symbols.info));
    console.log(createListItem(`Session ID: ${this.sessionId}`, symbols.info));
    console.log("\n" + createDivider("─", 80) + "\n");

    // Show initial prompt
    this.rl.prompt();

    this.rl.on("line", async (line) => {
      if (!line.trim()) {
        this.rl.prompt();
        return;
      }

      // Handle slash commands
      if (this.handleSlashCommand(line)) {
        this.rl.prompt();
        return;
      }

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
      this.rl.prompt();
    });

    this.rl.on("close", () => {
      console.log("\n" + createHeading("👋 Goodbye!", 2));
      console.log(colors.gray + "Thanks for using Kraken!\n" + colors.reset);
      process.exit(0);
    });
  }
}
