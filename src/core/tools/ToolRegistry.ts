import type { ToolDefinition } from "./types";

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<any>>();

  constructor(definitions: ToolDefinition<any>[]) {
    for (const tool of definitions) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Register a new tool
   */
  register<T = unknown>(tool: ToolDefinition<T>): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  list(): ToolDefinition<any>[] {
    return Array.from(this.tools.values());
  }

  get(name: string): ToolDefinition<any> | undefined {
    return this.tools.get(name);
  }
}
