import type { ToolDefinition } from "../types";
import { createBrowserTool } from "./browser";
import { createReadFileTool } from "./read_file";
import { createWriteFileTool } from "./write_file";
import { createWebFetchTool } from "./web_fetch";
import { createWebSearchTool } from "./web_search";
import { createWriteTodoTool } from "./write_todo";
import { createGrepTool } from "./grep";
import { createGlobTool } from "./glob";
import { createBashTool } from "./bash";

export function createBuiltinTools(): ToolDefinition[] {
  return [
    createReadFileTool() as ToolDefinition,
    createWriteFileTool() as ToolDefinition,
    createWriteTodoTool() as ToolDefinition,
    createGrepTool() as ToolDefinition,
    createGlobTool() as ToolDefinition,
    createBashTool() as ToolDefinition,
    createWebFetchTool() as ToolDefinition,
    createBrowserTool() as ToolDefinition,
    createWebSearchTool() as ToolDefinition
  ];
}
