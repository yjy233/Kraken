/**
 * Model information and context window management
 */

export interface ModelInfo {
  name: string;
  contextWindow: number;      // 总上下文窗口大小
  maxOutputTokens: number;    // 最大输出 token 数
  inputCost?: number;          // 输入成本 (per 1M tokens, USD)
  outputCost?: number;         // 输出成本 (per 1M tokens, USD)
  provider?: string;           // 提供商
}

/**
 * 模型信息数据库
 * 来源: OpenAI 官方文档和各提供商文档
 * 最后更新: 2024-01
 */
export const MODEL_INFO: Record<string, ModelInfo> = {
  // ========== OpenAI GPT-4 系列 ==========
  "gpt-4": {
    name: "gpt-4",
    contextWindow: 8192,
    maxOutputTokens: 4096,
    inputCost: 30.0,
    outputCost: 60.0,
    provider: "openai"
  },

  "gpt-4-32k": {
    name: "gpt-4-32k",
    contextWindow: 32768,
    maxOutputTokens: 4096,
    inputCost: 60.0,
    outputCost: 120.0,
    provider: "openai"
  },

  "gpt-4-turbo": {
    name: "gpt-4-turbo",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCost: 10.0,
    outputCost: 30.0,
    provider: "openai"
  },

  "gpt-4-turbo-preview": {
    name: "gpt-4-turbo-preview",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCost: 10.0,
    outputCost: 30.0,
    provider: "openai"
  },

  "gpt-4-1106-preview": {
    name: "gpt-4-1106-preview",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCost: 10.0,
    outputCost: 30.0,
    provider: "openai"
  },

  "gpt-4-0125-preview": {
    name: "gpt-4-0125-preview",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCost: 10.0,
    outputCost: 30.0,
    provider: "openai"
  },

  // ========== OpenAI GPT-4o 系列 ==========
  "gpt-4o": {
    name: "gpt-4o",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputCost: 5.0,
    outputCost: 15.0,
    provider: "openai"
  },

  "gpt-4o-mini": {
    name: "gpt-4o-mini",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    inputCost: 0.15,
    outputCost: 0.6,
    provider: "openai"
  },

  // ========== OpenAI GPT-3.5 系列 ==========
  "gpt-3.5-turbo": {
    name: "gpt-3.5-turbo",
    contextWindow: 16385,
    maxOutputTokens: 4096,
    inputCost: 0.5,
    outputCost: 1.5,
    provider: "openai"
  },

  "gpt-3.5-turbo-16k": {
    name: "gpt-3.5-turbo-16k",
    contextWindow: 16385,
    maxOutputTokens: 4096,
    inputCost: 3.0,
    outputCost: 4.0,
    provider: "openai"
  },

  "gpt-3.5-turbo-1106": {
    name: "gpt-3.5-turbo-1106",
    contextWindow: 16385,
    maxOutputTokens: 4096,
    inputCost: 1.0,
    outputCost: 2.0,
    provider: "openai"
  },

  // ========== Anthropic Claude 系列 ==========
  "claude-3-opus-20240229": {
    name: "claude-3-opus-20240229",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputCost: 15.0,
    outputCost: 75.0,
    provider: "anthropic"
  },

  "claude-3-sonnet-20240229": {
    name: "claude-3-sonnet-20240229",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputCost: 3.0,
    outputCost: 15.0,
    provider: "anthropic"
  },

  "claude-3-haiku-20240307": {
    name: "claude-3-haiku-20240307",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    inputCost: 0.25,
    outputCost: 1.25,
    provider: "anthropic"
  },

  // 简化别名
  "claude-3-opus": {
    name: "claude-3-opus",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    provider: "anthropic"
  },

  "claude-3-sonnet": {
    name: "claude-3-sonnet",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    provider: "anthropic"
  },

  "claude-3-haiku": {
    name: "claude-3-haiku",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    provider: "anthropic"
  }
};

/**
 * 获取模型的上下文窗口大小
 *
 * @param modelName - 模型名称
 * @returns 上下文窗口大小（tokens）
 */
export function getModelContextWindow(modelName: string): number {
  // 1. 精确匹配
  if (MODEL_INFO[modelName]) {
    return MODEL_INFO[modelName].contextWindow;
  }

  // 2. 前缀匹配（处理带版本号的模型名）
  for (const [key, info] of Object.entries(MODEL_INFO)) {
    if (modelName.startsWith(key)) {
      return info.contextWindow;
    }
  }

  // 3. 模糊匹配常见模式
  if (modelName.includes("gpt-4") && modelName.includes("32k")) {
    return 32768;
  }
  if (modelName.includes("gpt-4") && (modelName.includes("turbo") || modelName.includes("preview"))) {
    return 128000;
  }
  if (modelName.includes("gpt-4o")) {
    return 128000;
  }
  if (modelName.includes("gpt-4")) {
    return 8192;
  }
  if (modelName.includes("gpt-3.5")) {
    return 16385;
  }
  if (modelName.includes("claude")) {
    return 200000;
  }

  // 4. 默认值（保守估计）
  console.warn(`Unknown model: ${modelName}, using default context window of 4096`);
  return 4096;
}

/**
 * 获取模型的最大输出 token 数
 */
export function getModelMaxOutputTokens(modelName: string): number {
  const info = getModelInfo(modelName);
  return info?.maxOutputTokens || 4096;
}

/**
 * 获取模型完整信息
 */
export function getModelInfo(modelName: string): ModelInfo | null {
  // 精确匹配
  if (MODEL_INFO[modelName]) {
    return MODEL_INFO[modelName];
  }

  // 前缀匹配
  for (const [key, info] of Object.entries(MODEL_INFO)) {
    if (modelName.startsWith(key)) {
      return info;
    }
  }

  return null;
}

/**
 * 列出所有支持的模型
 */
export function listSupportedModels(): string[] {
  return Object.keys(MODEL_INFO);
}

/**
 * 按提供商筛选模型
 */
export function getModelsByProvider(provider: string): ModelInfo[] {
  return Object.values(MODEL_INFO).filter(
    info => info.provider === provider
  );
}

/**
 * 计算可用的输入 token 空间
 *
 * @param modelName - 模型名称
 * @param reservedOutputTokens - 为输出预留的 token 数
 * @returns 可用于输入的最大 token 数
 */
export function getAvailableInputTokens(
  modelName: string,
  reservedOutputTokens: number = 1000
): number {
  const contextWindow = getModelContextWindow(modelName);
  const maxOutput = getModelMaxOutputTokens(modelName);

  // 输出 token 不能超过模型的最大输出限制
  const actualReserved = Math.min(reservedOutputTokens, maxOutput);

  return contextWindow - actualReserved;
}

/**
 * 估算成本（基于 token 数）
 *
 * @param modelName - 模型名称
 * @param inputTokens - 输入 token 数
 * @param outputTokens - 输出 token 数
 * @returns 成本（美元）
 */
export function estimateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const info = getModelInfo(modelName);

  if (!info?.inputCost || !info?.outputCost) {
    return 0; // 无定价信息
  }

  // 价格是 per 1M tokens
  const inputCost = (inputTokens / 1_000_000) * info.inputCost;
  const outputCost = (outputTokens / 1_000_000) * info.outputCost;

  return inputCost + outputCost;
}

/**
 * 检查消息是否会超出上下文窗口
 *
 * @param modelName - 模型名称
 * @param estimatedTokens - 估计的 token 数
 * @param includeOutputBuffer - 是否包含输出缓冲区
 * @returns 是否会超出
 */
export function willExceedContextWindow(
  modelName: string,
  estimatedTokens: number,
  includeOutputBuffer: boolean = true
): boolean {
  const contextWindow = getModelContextWindow(modelName);

  if (includeOutputBuffer) {
    const maxOutput = getModelMaxOutputTokens(modelName);
    return estimatedTokens + maxOutput > contextWindow;
  }

  return estimatedTokens > contextWindow;
}
