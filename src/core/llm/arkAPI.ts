/**
 * Volcengine Ark API integration
 * 获取字节跳动火山引擎模型列表
 */

export interface ArkModelInfo {
  model_id: string;
  model_name: string;
  endpoint_id?: string;
  endpoint_name?: string;
  endpoint_type?: number;
  owner_id?: string;
  status?: number;
  description?: string;
  // 可能包含的其他字段
  context_window?: number;
  max_tokens?: number;
}

export interface ArkModelsResponse {
  code?: number;
  message?: string;
  data?: {
    items?: ArkModelInfo[];
    total?: number;
  };
}

/**
 * 从火山引擎 Ark API 获取模型列表
 *
 * @param apiKey - Bearer Token
 * @param baseUrl - API 基础 URL（默认：https://ark.cn-beijing.volces.com）
 * @returns 模型列表
 */
export async function fetchArkModels(
  apiKey: string,
  baseUrl: string = "https://ark.cn-beijing.volces.com"
): Promise<ArkModelInfo[]> {
  try {
    const response = await fetch(`${baseUrl}/api/v3/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ark API error: ${response.status} - ${errorText}`);
    }

    const data: ArkModelsResponse = await response.json();

    if (data.code !== undefined && data.code !== 0) {
      throw new Error(`Ark API returned error: ${data.message || "Unknown error"}`);
    }

    return data.data?.items || [];
  } catch (error) {
    console.error("Failed to fetch Ark models:", error);
    throw error;
  }
}

/**
 * 从火山引擎 Ark API 获取模型详情
 *
 * @param modelId - 模型 ID
 * @param apiKey - Bearer Token
 * @param baseUrl - API 基础 URL
 * @returns 模型详情
 */
export async function fetchArkModelDetail(
  modelId: string,
  apiKey: string,
  baseUrl: string = "https://ark.cn-beijing.volces.com"
): Promise<ArkModelInfo | null> {
  try {
    const response = await fetch(`${baseUrl}/api/v3/detail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model_id: modelId
      })
    });

    if (!response.ok) {
      throw new Error(`Ark API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(data.message || "Unknown error");
    }

    return data.data || null;
  } catch (error) {
    console.error(`Failed to fetch Ark model detail for ${modelId}:`, error);
    return null;
  }
}

/**
 * 将 Ark 模型信息转换为标准 ModelInfo 格式
 */
export function convertArkModelToModelInfo(arkModel: ArkModelInfo): {
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  provider: string;
} {
  return {
    name: arkModel.model_id || arkModel.model_name,
    contextWindow: arkModel.context_window || 4096, // 默认值
    maxOutputTokens: arkModel.max_tokens || 2048,
    provider: "volcengine-ark"
  };
}

/**
 * 获取 Ark 模型并转换为标准格式
 */
export async function fetchAndConvertArkModels(
  apiKey: string,
  baseUrl?: string
): Promise<Record<string, any>> {
  const arkModels = await fetchArkModels(apiKey, baseUrl);
  const result: Record<string, any> = {};

  for (const arkModel of arkModels) {
    const modelInfo = convertArkModelToModelInfo(arkModel);
    result[modelInfo.name] = modelInfo;
  }

  return result;
}
