import { htmlToText } from "../../utils/text";
import type { ToolDefinition } from "../types";
import { runWebFetch, webFetchInputSchema, type WebFetchInput } from "./web_fetch";

export function createBrowserTool(): ToolDefinition<WebFetchInput> {
  return {
    name: "browser",
    description: "Fetch a URL and return visible text (simple HTML stripping).",
    inputSchema: webFetchInputSchema,
    async run(input, context) {
      const result = await runWebFetch(input, context);
      if (!result.ok) return result;
      return { ok: true, content: htmlToText(result.content) };
    }
  };
}
