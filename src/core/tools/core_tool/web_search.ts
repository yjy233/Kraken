import type { ToolDefinition } from "../types";
import { networkDisabled } from "./web_fetch";
import { tavily } from "@tavily/core";

/**
 * Web搜索工具的输入参数接口
 */
export interface WebSearchInput {
  /** 搜索查询字符串 */
  query: string;
  /** 搜索深度：basic 为快速搜索，advanced 为深度搜索 */
  searchDepth?: "basic" | "advanced";
}

/**
 * 创建基于 Tavily API 的 Web 搜索工具
 *
 * Tavily 是一个专为 AI 应用优化的搜索 API，提供结构化的搜索结果
 * 包括标题、URL、内容摘要、相关性评分等信息
 *
 * @returns ToolDefinition 工具定义对象
 */
export function createWebSearchTool(): ToolDefinition<WebSearchInput> {
  return {
    name: "web_search",
    description: "Run a web search using Tavily API. Supports basic and advanced search depth.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        },
        searchDepth: {
          type: "string",
          enum: ["basic", "advanced"],
          description: "Search depth: 'basic' for quick results, 'advanced' for comprehensive search",
          default: "basic"
        }
      },
      required: ["query"]
    },
    async run(input) {
      // 检查是否允许网络访问
      if (process.env.ALLOW_NETWORK !== "true") return networkDisabled;

      // 获取 Tavily API Key
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return {
          ok: false,
          content: "web_search not configured. Set TAVILY_API_KEY in .env file."
        };
      }

      try {
        // 创建 Tavily 客户端
        const client = tavily({ apiKey });

        // 执行搜索
        // searchDepth 参数:
        // - "basic": 快速搜索，返回基本结果
        // - "advanced": 深度搜索，返回更全面的结果，但速度较慢
        const results = await client.search(input.query, {
          searchDepth: input.searchDepth || "basic"
        });

        // 返回搜索结果
        // results 包含:
        // - query: 原始查询
        // - results: 搜索结果数组 (title, url, content, score)
        // - images: 相关图片 (如果有)
        // - answer: AI 生成的答案摘要 (如果有)
        // - responseTime: 响应时间
        return {
          ok: true,
          content: JSON.stringify(results, null, 2),
          data: results
        };
      } catch (error) {
        // 捕获并返回错误信息
        return { ok: false, content: `web_search error: ${(error as Error).message}` };
      }
    }
  };
}
