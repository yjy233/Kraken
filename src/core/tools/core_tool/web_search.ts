import type { ToolDefinition, ToolContext } from "../types";
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
 * 从环境变量或配置中获取 Tavily API Key
 */
function getTavilyApiKey(context?: ToolContext): string | undefined {
  // 优先级1: 环境变量
  const envKey = process.env.TAVILY_API_KEY;
  if (envKey) return envKey;
  
  // 优先级2: Kraken.json 配置
  if (context?.config?.tools?.tavily?.apiKey) {
    return context.config.tools.tavily.apiKey;
  }

  return undefined;
}

function isAllowNetwork(context?: ToolContext): boolean {
  if (process.env.ALLOW_NETWORK === "true") {
    return true;
  }

  if (context?.config?.tools?.allowNetwork === true) {
    return true;
  }

  return false;
}

/**
 * 检查 Tavily 是否启用
 */
function isTavilyEnabled(context?: ToolContext): boolean {
  // 环境变量控制
  if (!isAllowNetwork(context)) return false;
  
  // 配置控制（默认启用）
  if (context?.config?.tools?.tavily?.enabled === false) return false;
  
  return true;
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
    async run(input, context) {
      // 检查是否允许网络访问
      if (!isAllowNetwork(context)) return networkDisabled;
      
      // 检查 Tavily 是否启用
      if (!isTavilyEnabled(context)) {
        return {
          ok: false,
          content: "web_search is disabled. Enable it in Kraken.json or set TAVILY_ENABLED=true."
        };
      }

      // 获取 Tavily API Key（支持环境变量或 Kraken.json）
      const apiKey = getTavilyApiKey(context);
      if (!apiKey) {
        return {
          ok: false,
          content: "web_search not configured. Set TAVILY_API_KEY in .env file or add tools.tavily.apiKey to Kraken.json."
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
