# 获取模型上下文窗口大小

## 问题

OpenAI API **没有**直接接口返回模型的上下文窗口大小。

## 解决方案

### ✅ 推荐方法：硬编码映射表

我已经创建了完整的模型信息模块：`src/core/llm/modelInfo.ts`

---

## 使用方法

### 1. 获取上下文窗口大小

```typescript
import { getModelContextWindow } from "./core/llm/modelInfo";

const contextWindow = getModelContextWindow("gpt-4");
console.log(contextWindow);  // 8192

const contextWindow2 = getModelContextWindow("gpt-4-turbo");
console.log(contextWindow2);  // 128000

const contextWindow3 = getModelContextWindow("claude-3-opus");
console.log(contextWindow3);  // 200000
```

### 2. 获取最大输出 Token 数

```typescript
import { getModelMaxOutputTokens } from "./core/llm/modelInfo";

const maxOutput = getModelMaxOutputTokens("gpt-4");
console.log(maxOutput);  // 4096

const maxOutput2 = getModelMaxOutputTokens("gpt-4o-mini");
console.log(maxOutput2);  // 16384
```

### 3. 获取完整模型信息

```typescript
import { getModelInfo } from "./core/llm/modelInfo";

const info = getModelInfo("gpt-4-turbo");
console.log(info);
/*
{
  name: "gpt-4-turbo",
  contextWindow: 128000,
  maxOutputTokens: 4096,
  inputCost: 10.0,
  outputCost: 30.0,
  provider: "openai"
}
*/
```

### 4. 计算可用输入空间

```typescript
import { getAvailableInputTokens } from "./core/llm/modelInfo";

// 为输出预留 1000 tokens
const available = getAvailableInputTokens("gpt-4", 1000);
console.log(available);  // 7192 (8192 - 1000)
```

### 5. 估算成本

```typescript
import { estimateCost } from "./core/llm/modelInfo";

const cost = estimateCost("gpt-4", 1000, 500);
console.log(cost);  // $0.06 (输入 $0.03 + 输出 $0.03)
```

### 6. 检查是否超出上下文

```typescript
import { willExceedContextWindow } from "./core/llm/modelInfo";

const willExceed = willExceedContextWindow("gpt-4", 10000);
console.log(willExceed);  // true (10000 + 4096 > 8192)
```

### 7. 列出所有支持的模型

```typescript
import { listSupportedModels } from "./core/llm/modelInfo";

const models = listSupportedModels();
console.log(models);
// ["gpt-4", "gpt-4-32k", "gpt-4-turbo", ...]
```

### 8. 按提供商筛选

```typescript
import { getModelsByProvider } from "./core/llm/modelInfo";

const openaiModels = getModelsByProvider("openai");
const claudeModels = getModelsByProvider("anthropic");
```

---

## 集成到 OpenAIClient

### 在客户端中使用

```typescript
import { OpenAIClient } from "./core/llm/OpenAIClient";
import { getModelContextWindow, getAvailableInputTokens } from "./core/llm/modelInfo";

class SmartOpenAIClient extends OpenAIClient {
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const model = request.model;

    // 获取模型上下文窗口
    const contextWindow = getModelContextWindow(model);
    console.log(`Model ${model} context window: ${contextWindow}`);

    // 获取可用输入空间
    const availableTokens = getAvailableInputTokens(model, request.max_tokens || 1000);
    console.log(`Available input tokens: ${availableTokens}`);

    // 调用原始方法
    return super.chatCompletion(request);
  }
}
```

---

## 支持的模型

### OpenAI GPT-4 系列

| 模型 | 上下文窗口 | 最大输出 |
|------|-----------|---------|
| gpt-4 | 8,192 | 4,096 |
| gpt-4-32k | 32,768 | 4,096 |
| gpt-4-turbo | 128,000 | 4,096 |
| gpt-4o | 128,000 | 4,096 |
| gpt-4o-mini | 128,000 | 16,384 |

### OpenAI GPT-3.5 系列

| 模型 | 上下文窗口 | 最大输出 |
|------|-----------|---------|
| gpt-3.5-turbo | 16,385 | 4,096 |
| gpt-3.5-turbo-16k | 16,385 | 4,096 |

### Anthropic Claude 系列

| 模型 | 上下文窗口 | 最大输出 |
|------|-----------|---------|
| claude-3-opus | 200,000 | 4,096 |
| claude-3-sonnet | 200,000 | 4,096 |
| claude-3-haiku | 200,000 | 4,096 |

---

## 智能匹配

模块支持智能匹配：

```typescript
// 精确匹配
getModelContextWindow("gpt-4");  // 8192

// 前缀匹配（处理版本号）
getModelContextWindow("gpt-4-0613");  // 8192
getModelContextWindow("gpt-4-turbo-2024-04-09");  // 128000

// 模糊匹配
getModelContextWindow("gpt-4-something-new");  // 8192（降级到 gpt-4）

// 未知模型（返回默认值并警告）
getModelContextWindow("unknown-model");  // 4096 + 警告
```

---

## 更新模型信息

当有新模型发布时，在 `modelInfo.ts` 中添加：

```typescript
export const MODEL_INFO: Record<string, ModelInfo> = {
  // ... 现有模型 ...

  // 添加新模型
  "gpt-5": {
    name: "gpt-5",
    contextWindow: 256000,
    maxOutputTokens: 8192,
    inputCost: 5.0,
    outputCost: 15.0,
    provider: "openai"
  }
};
```

---

## 为什么 OpenAI 不提供这个接口？

1. **模型信息相对固定** - 不需要频繁查询
2. **避免额外 API 调用** - 减少延迟和成本
3. **官方文档已公开** - 开发者可以查阅
4. **硬编码更可靠** - 不依赖网络

---

## 其他获取方式（不推荐）

### ❌ Models API（无上下文信息）

```typescript
const response = await fetch("https://api.openai.com/v1/models/gpt-4", {
  headers: { "Authorization": `Bearer ${apiKey}` }
});

const data = await response.json();
// 返回: { id, object, created, owned_by }
// ❌ 没有 contextWindow 字段
```

### ❌ 从错误推断（不实用）

```typescript
// 当超出上下文时会报错
// Error: This model's maximum context length is 8192 tokens...
// 但这不是获取信息的好方法
```

---

## 总结

**最佳实践**：
1. ✅ 使用 `modelInfo.ts` 模块（已实现）
2. ✅ 定期更新模型信息
3. ✅ 使用智能匹配处理版本号
4. ✅ 为未知模型提供默认值

**不要**：
1. ❌ 依赖 Models API（不返回上下文信息）
2. ❌ 从错误消息解析
3. ❌ 硬编码在多个地方（集中管理）

---

## 完整示例

```typescript
import {
  getModelContextWindow,
  getModelInfo,
  estimateCost,
  willExceedContextWindow
} from "./core/llm/modelInfo";

// 1. 检查模型能力
const model = "gpt-4-turbo";
const info = getModelInfo(model);
console.log(`Model: ${info?.name}`);
console.log(`Context: ${info?.contextWindow} tokens`);
console.log(`Max output: ${info?.maxOutputTokens} tokens`);

// 2. 计算成本
const inputTokens = 5000;
const outputTokens = 1000;
const cost = estimateCost(model, inputTokens, outputTokens);
console.log(`Estimated cost: $${cost.toFixed(4)}`);

// 3. 验证请求
const totalTokens = inputTokens + outputTokens;
if (willExceedContextWindow(model, inputTokens, true)) {
  console.warn("Warning: May exceed context window!");
} else {
  console.log("✓ Request within limits");
}
```

**文件位置**: `src/core/llm/modelInfo.ts`
**状态**: ✅ 可用
