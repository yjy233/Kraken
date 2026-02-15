/**
 * CLI UI utilities for beautiful console output
 * Uses ANSI escape codes for colors and formatting
 */

export const colors = {
  // Basic colors
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Text colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};

export const symbols = {
  success: "✓",
  error: "✗",
  info: "ℹ",
  warning: "⚠",
  thinking: "🤔",
  tool: "🔧",
  response: "💬",
  arrow: "→",
  bullet: "•",
};

/**
 * Create a colored card box
 */
export function createCard(options: {
  title: string;
  content: string;
  color?: "yellow" | "green" | "red" | "blue" | "cyan" | "magenta";
  icon?: string;
  maxWidth?: number;
}): string {
  const { title, content, color = "yellow", icon = "", maxWidth = 80 } = options;

  // Select color scheme
  let borderColor: string;
  let titleColor: string;

  switch (color) {
    case "yellow":
      borderColor = colors.yellow;
      titleColor = colors.yellow + colors.bright;
      break;
    case "green":
      borderColor = colors.green;
      titleColor = colors.green + colors.bright;
      break;
    case "red":
      borderColor = colors.red;
      titleColor = colors.red + colors.bright;
      break;
    case "blue":
      borderColor = colors.blue;
      titleColor = colors.blue + colors.bright;
      break;
    case "cyan":
      borderColor = colors.cyan;
      titleColor = colors.cyan + colors.bright;
      break;
    case "magenta":
      borderColor = colors.magenta;
      titleColor = colors.magenta + colors.bright;
      break;
  }

  const width = maxWidth - 4;
  const topBorder = borderColor + "┌" + "─".repeat(width - 2) + "┐" + colors.reset;
  const bottomBorder = borderColor + "└" + "─".repeat(width - 2) + "┘" + colors.reset;

  // Format title with icon
  const titleText = icon ? `${icon} ${title}` : title;
  const titleLine = borderColor + "│" + colors.reset + " " + titleColor + titleText + colors.reset;
  const titlePadding = width - 4 - titleText.length;
  const fullTitleLine = titleLine + " ".repeat(Math.max(0, titlePadding)) + " " + borderColor + "│" + colors.reset;

  // Format content lines
  const contentLines = content.split("\n");
  const formattedContent = contentLines.map(line => {
    // Truncate long lines
    const displayLine = line.length > width - 4 ? line.slice(0, width - 7) + "..." : line;
    const padding = width - 4 - displayLine.length;
    return borderColor + "│" + colors.reset + " " + displayLine + " ".repeat(Math.max(0, padding)) + " " + borderColor + "│" + colors.reset;
  });

  // Separator line
  const separator = borderColor + "├" + "─".repeat(width - 2) + "┤" + colors.reset;

  return [
    topBorder,
    fullTitleLine,
    separator,
    ...formattedContent,
    bottomBorder
  ].join("\n");
}

/**
 * Create a compact info box
 */
export function createInfoBox(text: string, icon?: string): string {
  const prefix = icon ? `${icon} ` : "";
  return colors.cyan + prefix + text + colors.reset;
}

/**
 * Format tool input/output in a readable way
 */
export function formatToolData(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  try {
    const json = JSON.stringify(data, null, 2);
    const lines = json.split("\n");

    // Truncate very long output
    if (lines.length > 15) {
      const truncated = lines.slice(0, 15).join("\n");
      return truncated + "\n" + colors.gray + `... (${lines.length - 15} more lines)` + colors.reset;
    }

    return json;
  } catch {
    return String(data);
  }
}

/**
 * Create a status badge
 */
export function createBadge(text: string, status: "success" | "error" | "info" | "warning"): string {
  let color: string;
  let icon: string;

  switch (status) {
    case "success":
      color = colors.green;
      icon = symbols.success;
      break;
    case "error":
      color = colors.red;
      icon = symbols.error;
      break;
    case "info":
      color = colors.blue;
      icon = symbols.info;
      break;
    case "warning":
      color = colors.yellow;
      icon = symbols.warning;
      break;
  }

  return color + colors.bright + icon + " " + text + colors.reset;
}

/**
 * Create a section divider
 */
export function createDivider(char: string = "─", width: number = 60): string {
  return colors.gray + char.repeat(width) + colors.reset;
}

/**
 * Format a heading
 */
export function createHeading(text: string, level: 1 | 2 | 3 = 1): string {
  switch (level) {
    case 1:
      return colors.bright + colors.cyan + "\n" + text + colors.reset + "\n" + createDivider("═");
    case 2:
      return colors.bright + colors.blue + text + colors.reset;
    case 3:
      return colors.cyan + text + colors.reset;
  }
}

/**
 * Format a list item
 */
export function createListItem(text: string, bullet: string = symbols.bullet): string {
  return colors.gray + bullet + colors.reset + " " + text;
}

/**
 * Clear the current line
 */
export function clearLine(): void {
  process.stdout.write("\r\x1b[K");
}

/**
 * Show a spinner (simple animation)
 */
export function createSpinner(text: string): { update: (text: string) => void; stop: () => void } {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let current = 0;
  let intervalId: NodeJS.Timeout | null = null;

  const render = (message: string) => {
    clearLine();
    process.stdout.write(colors.cyan + frames[current] + colors.reset + " " + message);
    current = (current + 1) % frames.length;
  };

  intervalId = setInterval(() => render(text), 80);

  return {
    update: (newText: string) => {
      text = newText;
    },
    stop: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      clearLine();
    }
  };
}

/**
 * Create an input prompt box
 */
export function createInputPrompt(): string {
  const icon = "💭";
  const label = "You";
  const prompt = colors.bright + colors.blue + icon + " " + label + colors.reset +
                 colors.gray + " │ " + colors.reset;
  return prompt;
}

/**
 * Create an input box frame
 */
export function createInputBox(maxWidth: number = 80): string {
  const width = maxWidth - 4;
  const borderColor = colors.blue;

  const topBorder = borderColor + "┌" + "─".repeat(width - 2) + "┐" + colors.reset;
  const inputLine = borderColor + "│" + colors.reset + " " +
                    colors.bright + colors.blue + "💭 You" + colors.reset +
                    colors.gray + " » " + colors.reset;
  const bottomBorder = borderColor + "└" + "─".repeat(width - 2) + "┘" + colors.reset;

  return topBorder + "\n" + inputLine;
}
