/**
 * Dynamic model information fetcher
 * 从 API 或远程源获取模型信息
 */

import { ModelInfo, MODEL_INFO } from "./modelInfo";
import { fetchAndConvertArkModels } from "./arkAPI";

export interface ModelAPIResponse {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ModelsListResponse {
  object: string;
  data: ModelAPIResponse[];
}

/**
 * 从 OpenAI Models API 获取可用模型列表
 * 注意：不包含上下文窗口信息！
 */
export async function fetchAvailableModels(apiKey: string, baseUrl: string = "https://api.openai.com/v1"): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ModelsListResponse = await response.json();
    return data.data.map(model => model.id);
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
}

/**
 * 从 GitHub 获取最新的模型信息（第三方维护）
 *
 * 数据源示例：
 * - litellm 的模型列表
 * - openai-community 的模型信息
 */
export async function fetchModelInfoFromGitHub(): Promise<Record<string, Partial<ModelInfo>>> {
  try {
    // litellm 维护的模型信息
    const url = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub fetch error: ${response.status}`);
    }

    const data = await response.json();
    return parseGitHubModelData(data);
  } catch (error) {
    console.error("Failed to fetch from GitHub:", error);
    return {};
  }
}

/**
 * 解析 GitHub 数据格式
 */
function parseGitHubModelData(data: any): Record<string, Partial<ModelInfo>> {
  const result: Record<string, Partial<ModelInfo>> = {};

  for (const [modelName, info] of Object.entries(data)) {
    const modelData = info as any;

    result[modelName] = {
      name: modelName,
      contextWindow: modelData.max_tokens || modelData.max_input_tokens,
      maxOutputTokens: modelData.max_output_tokens || 4096,
      inputCost: modelData.input_cost_per_token ? modelData.input_cost_per_token * 1_000_000 : undefined,
      outputCost: modelData.output_cost_per_token ? modelData.output_cost_per_token * 1_000_000 : undefined
    };
  }

  return result;
}

/**
 * 从自定义 URL 获取模型信息
 *
 * @param url - JSON 文件的 URL
 * @param format - 数据格式类型
 */
export async function fetchModelInfoFromURL(
  url: string,
  format: "litellm" | "custom" = "custom"
): Promise<Record<string, Partial<ModelInfo>>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch error: ${response.status}`);
    }

    const data = await response.json();

    if (format === "litellm") {
      return parseGitHubModelData(data);
    } else {
      // 自定义格式，直接返回
      return data;
    }
  } catch (error) {
    console.error(`Failed to fetch from ${url}:`, error);
    return {};
  }
}

/**
 * 合并远程数据和本地数据
 */
export function mergeModelInfo(
  local: Record<string, ModelInfo>,
  remote: Record<string, Partial<ModelInfo>>
): Record<string, ModelInfo> {
  const merged = { ...local };

  for (const [modelName, remoteInfo] of Object.entries(remote)) {
    if (merged[modelName]) {
      // 更新现有模型
      merged[modelName] = {
        ...merged[modelName],
        ...remoteInfo
      } as ModelInfo;
    } else {
      // 添加新模型（如果有完整信息）
      if (remoteInfo.contextWindow && remoteInfo.maxOutputTokens) {
        merged[modelName] = {
          name: modelName,
          contextWindow: remoteInfo.contextWindow,
          maxOutputTokens: remoteInfo.maxOutputTokens,
          inputCost: remoteInfo.inputCost,
          outputCost: remoteInfo.outputCost,
          provider: remoteInfo.provider || "unknown"
        };
      }
    }
  }

  return merged;
}

/**
 * 模型信息缓存管理器
 */
export class ModelInfoCache {
  private cache: Record<string, ModelInfo> = {};
  private lastUpdate: number = 0;
  private cacheExpiryMs: number = 24 * 60 * 60 * 1000; // 24 小时

  constructor(initialData: Record<string, ModelInfo> = MODEL_INFO) {
    this.cache = { ...initialData };
  }

  /**
   * 从 URL 更新缓存
   */
  async updateFromURL(url: string, format: "litellm" | "custom" = "custom"): Promise<void> {
    const remoteData = await fetchModelInfoFromURL(url, format);
    this.cache = mergeModelInfo(this.cache, remoteData);
    this.lastUpdate = Date.now();
  }

  /**
   * 从 GitHub 更新缓存
   */
  async updateFromGitHub(): Promise<void> {
    const remoteData = await fetchModelInfoFromGitHub();
    this.cache = mergeModelInfo(this.cache, remoteData);
    this.lastUpdate = Date.now();
  }

  /**
   * 从火山引擎 Ark API 更新缓存
   *
   * @param apiKey - Ark API Key (Bearer Token)
   * @param baseUrl - 可选的 API 基础 URL
   */
  async updateFromArk(apiKey: string, baseUrl?: string): Promise<void> {
    const remoteData = await fetchAndConvertArkModels(apiKey, baseUrl);
    this.cache = mergeModelInfo(this.cache, remoteData);
    this.lastUpdate = Date.now();
  }

  /**
   * 如果缓存过期，自动更新
   */
  async autoUpdateIfExpired(source: "github" | { url: string; format?: "litellm" | "custom" } | { ark: { apiKey: string; baseUrl?: string } }): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate > this.cacheExpiryMs) {
      if (source === "github") {
        await this.updateFromGitHub();
      } else if ("url" in source) {
        await this.updateFromURL(source.url, source.format);
      } else if ("ark" in source) {
        await this.updateFromArk(source.ark.apiKey, source.ark.baseUrl);
      }
    }
  }

  /**
   * 获取模型信息
   */
  getModelInfo(modelName: string): ModelInfo | null {
    return this.cache[modelName] || null;
  }

  /**
   * 获取上下文窗口
   */
  getContextWindow(modelName: string): number {
    const info = this.getModelInfo(modelName);
    if (info) return info.contextWindow;

    // 前缀匹配
    for (const [key, value] of Object.entries(this.cache)) {
      if (modelName.startsWith(key)) {
        return value.contextWindow;
      }
    }

    // 默认值
    console.warn(`Unknown model: ${modelName}, using default`);
    return 4096;
  }

  /**
   * 手动添加或更新模型
   */
  setModelInfo(modelName: string, info: ModelInfo): void {
    this.cache[modelName] = info;
  }

  /**
   * 获取所有缓存的模型
   */
  getAllModels(): Record<string, ModelInfo> {
    return { ...this.cache };
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache = {};
    this.lastUpdate = 0;
  }
}

/**
 * 全局缓存实例（可选）
 */
export const globalModelCache = new ModelInfoCache();
