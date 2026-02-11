import type { ToolDefinition } from "../types";
import { networkDisabled } from "./web_fetch";

export interface WebSearchInput {
  query: string;
}

export function createWebSearchTool(): ToolDefinition<WebSearchInput> {
  return {
    name: "web_search",
    description: "Run a web search via a configured provider.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    },
    async run(input) {
      if (process.env.ALLOW_NETWORK !== "true") return networkDisabled;
      const endpoint = process.env.WEB_SEARCH_ENDPOINT;
      const apiKey = process.env.WEB_SEARCH_API_KEY;
      if (!endpoint || !apiKey) {
        return {
          ok: false,
          content: "web_search not configured. Set WEB_SEARCH_ENDPOINT and WEB_SEARCH_API_KEY."
        };
      }
      try {
        const url = new URL(endpoint);
        url.searchParams.set("q", input.query);
        url.searchParams.set("api_key", apiKey);
        const response = await fetch(url.toString(), { method: "GET" });
        const data = await response.json();
        return { ok: response.ok, content: JSON.stringify(data) };
      } catch (error) {
        return { ok: false, content: `web_search error: ${(error as Error).message}` };
      }
    }
  };
}
