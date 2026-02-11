import type { ToolDefinition } from "../types";
import { createBrowserTool } from "./browser";
import { createReadFileTool } from "./read_file";
import { createWebFetchTool } from "./web_fetch";
import { createWebSearchTool } from "./web_search";
import { createWriteTodoTool } from "./write_todo";

export function createBuiltinTools(): ToolDefinition[] {
  return [
    createReadFileTool() as ToolDefinition,
    createWriteTodoTool() as ToolDefinition,
    createWebFetchTool() as ToolDefinition,
    createBrowserTool() as ToolDefinition,
    createWebSearchTool() as ToolDefinition
  ];
}
