import type { ToolContext, ToolDefinition, ToolResult } from "../types";

export interface WebFetchInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export const webFetchInputSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    url: { type: "string" },
    method: { type: "string" },
    headers: { type: "object" },
    body: { type: "string" }
  },
  required: ["url"]
};

export const networkDisabled: ToolResult = {
  ok: false,
  content: "Network access disabled. Set ALLOW_NETWORK=true to enable."
};

export async function runWebFetch(
  input: WebFetchInput,
  _context: ToolContext
): Promise<ToolResult> {
  if (process.env.ALLOW_NETWORK !== "true") return networkDisabled;
  try {
    const response = await fetch(input.url, {
      method: input.method ?? "GET",
      headers: input.headers,
      body: input.body
    });
    const text = await response.text();
    return {
      ok: response.ok,
      content: text,
      data: { status: response.status, headers: Object.fromEntries(response.headers.entries()) }
    };
  } catch (error) {
    return { ok: false, content: `web_fetch error: ${(error as Error).message}` };
  }
}

export function createWebFetchTool(): ToolDefinition<WebFetchInput> {
  return {
    name: "web_fetch",
    description: "Fetch a URL over HTTP(S) if network access is enabled.",
    inputSchema: webFetchInputSchema,
    run: runWebFetch
  };
}
