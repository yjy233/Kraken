import { htmlToText } from "../utils/text";
import type { ToolDefinition, ToolResult, ToolContext } from "./types";

interface ReadFileInput {
  path: string;
}

interface WriteTodoInput {
  text: string;
  path?: string;
}

interface WebFetchInput {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface WebSearchInput {
  query: string;
}

const networkDisabled: ToolResult = {
  ok: false,
  content: "Network access disabled. Set ALLOW_NETWORK=true to enable."
};

export function createBuiltinTools(): ToolDefinition[] {
  const readFile: ToolDefinition<ReadFileInput> = {
    name: "read_file",
    description: "Read a file from the sandbox.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to sandbox root or absolute path within allowlist." }
      },
      required: ["path"]
    },
    async run(input, context) {
      try {
        const content = await context.sandbox.readFile(input.path);
        return { ok: true, content };
      } catch (error) {
        return { ok: false, content: `read_file error: ${(error as Error).message}` };
      }
    }
  };

  const writeTodo: ToolDefinition<WriteTodoInput> = {
    name: "write_todo",
    description: "Append a line to a todo list file in the sandbox.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Todo text to append." },
        path: { type: "string", description: "Optional path to todo file." }
      },
      required: ["text"]
    },
    async run(input, context) {
      const targetPath = input.path ?? "data/todo.md";
      try {
        await context.sandbox.appendFile(targetPath, `- ${input.text}\n`);
        return { ok: true, content: `Todo appended to ${targetPath}` };
      } catch (error) {
        return { ok: false, content: `write_todo error: ${(error as Error).message}` };
      }
    }
  };

  const webFetch: ToolDefinition<WebFetchInput> = {
    name: "web_fetch",
    description: "Fetch a URL over HTTP(S) if network access is enabled.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        method: { type: "string" },
        headers: { type: "object" },
        body: { type: "string" }
      },
      required: ["url"]
    },
    async run(input, context) {
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
  };

  const browser: ToolDefinition<WebFetchInput> = {
    name: "browser",
    description: "Fetch a URL and return visible text (simple HTML stripping).",
    inputSchema: webFetch.inputSchema,
    async run(input, context) {
      const result = await webFetch.run(input, context);
      if (!result.ok) return result;
      return { ok: true, content: htmlToText(result.content) };
    }
  };

  const webSearch: ToolDefinition<WebSearchInput> = {
    name: "web_search",
    description: "Run a web search via a configured provider.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    },
    async run(input, context) {
      if (process.env.ALLOW_NETWORK !== "true") return networkDisabled;
      const endpoint = process.env.WEB_SEARCH_ENDPOINT;
      const apiKey = process.env.WEB_SEARCH_API_KEY;
      if (!endpoint || !apiKey) {
        return { ok: false, content: "web_search not configured. Set WEB_SEARCH_ENDPOINT and WEB_SEARCH_API_KEY." };
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

  return []
}
