import type { ToolDefinition } from "./types";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor(definitions: ToolDefinition[]) {
    for (const tool of definitions) {
      this.tools.set(tool.name, tool);
    }
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
}
