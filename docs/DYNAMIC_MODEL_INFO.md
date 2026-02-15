# 从 URL 动态获取模型信息

## 问题

硬编码的模型信息可能过时，需要动态更新。

## 解决方案 ✅

我创建了 `modelInfoFetcher.ts` 模块，支持从多个源动态获取模型信息。

---

## 🎯 数据源选项

### 1️⃣ OpenAI Models API（有限）

只能获取模型列表，**没有**上下文窗口信息：

```typescript
import { fetchAvailableModels } from "./core/llm/modelInfoFetcher";

const apiKey = process.env.OPENAI_API_KEY;
const models = await fetchAvailableModels(apiKey);

console.log(models);
// ["gpt-4", "gpt-3.5-turbo", ...]
// ❌ 没有上下文窗口信息
```

### 2️⃣ GitHub 第三方数据（推荐）⭐

从 litellm 等项目获取完整的模型信息：

```typescript
import { fetchModelInfoFromGitHub } from "./core/llm/modelInfoFetcher";

const modelInfo = await fetchModelInfoFromGitHub();

console.log(modelInfo["gpt-4"]);
// {
//   name: "gpt-4",
//   contextWindow: 8192,
//   maxOutputTokens: 4096,
//   inputCost: 30.0,
//   outputCost: 60.0
// }
```

**数据源**：
- https://github.com/BerriAI/litellm (维护良好)
- https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json

### 3️⃣ 自定义 URL

从您自己的服务器获取：

```typescript
import { fetchModelInfoFromURL } from "./core/llm/modelInfoFetcher";

// 从自定义 URL 获取
const modelInfo = await fetchModelInfoFromURL(
  "https://your-server.com/models.json",
  "custom"
);

// 或使用 litellm 格式
const modelInfo2 = await fetchModelInfoFromURL(
  "https://your-server.com/litellm-models.json",
  "litellm"
);
```

---

## 📦 使用缓存管理器（推荐）

### 基础使用

```typescript
import { ModelInfoCache } from "./core/llm/modelInfoFetcher";

// 创建缓存实例
const cache = new ModelInfoCache();

// 从 GitHub 更新
await cache.updateFromGitHub();

// 获取模型信息
const contextWindow = cache.getContextWindow("gpt-4");
console.log(contextWindow); // 8192

const info = cache.getModelInfo("gpt-4-turbo");
console.log(info);
// {
//   name: "gpt-4-turbo",
//   contextWindow: 128000,
//   maxOutputTokens: 4096,
//   ...
// }
```

### 自动更新（推荐）

```typescript
import { ModelInfoCache } from "./core/llm/modelInfoFetcher";

const cache = new ModelInfoCache();

// 每天自动更新一次
await cache.autoUpdateIfExpired("github");

// 或从自定义 URL
await cache.autoUpdateIfExpired({
  url: "https://your-server.com/models.json"
});

// 正常使用
const contextWindow = cache.getContextWindow("gpt-4");
```

### 全局缓存实例

```typescript
import { globalModelCache } from "./core/llm/modelInfoFetcher";

// 初始化时更新一次
await globalModelCache.updateFromGitHub();

// 在应用中任何地方使用
const contextWindow = globalModelCache.getContextWindow("gpt-4");
```

---

## 🔄 完整工作流

### 方案 1: 启动时更新

```typescript
// index.ts
import { globalModelCache } from "./core/llm/modelInfoFetcher";

async function initializeApp() {
  console.log("Updating model information from GitHub...");

  try {
    await globalModelCache.updateFromGitHub();
    console.log("✓ Model information updated");
  } catch (error) {
    console.warn("Failed to update model info, using defaults");
  }

  // 启动应用...
}

initializeApp();
```

### 方案 2: 定期更新

```typescript
import { globalModelCache } from "./core/llm/modelInfoFetcher";

// 每 24 小时更新一次
setInterval(async () => {
  console.log("Refreshing model information...");
  await globalModelCache.updateFromGitHub();
}, 24 * 60 * 60 * 1000);

// 首次启动时更新
await globalModelCache.updateFromGitHub();
```

### 方案 3: 懒加载 + 自动更新

```typescript
import { ModelInfoCache } from "./core/llm/modelInfoFetcher";

class SmartModelCache extends ModelInfoCache {
  private updating: boolean = false;

  async getContextWindow(modelName: string): Promise<number> {
    // 后台自动更新（不阻塞）
    if (!this.updating) {
      this.updating = true;
      this.autoUpdateIfExpired("github")
        .then(() => console.log("Cache updated"))
        .catch(err => console.warn("Update failed:", err))
        .finally(() => this.updating = false);
    }

    return super.getContextWindow(modelName);
  }
}

const smartCache = new SmartModelCache();
```

---

## 📊 自定义 JSON 格式

### 格式 1: 标准格式（推荐）

```json
{
  "gpt-4": {
    "name": "gpt-4",
    "contextWindow": 8192,
    "maxOutputTokens": 4096,
    "inputCost": 30.0,
    "outputCost": 60.0,
    "provider": "openai"
  },
  "gpt-4-turbo": {
    "name": "gpt-4-turbo",
    "contextWindow": 128000,
    "maxOutputTokens": 4096,
    "inputCost": 10.0,
    "outputCost": 30.0,
    "provider": "openai"
  }
}
```

### 格式 2: litellm 格式

```json
{
  "gpt-4": {
    "max_tokens": 8192,
    "max_input_tokens": 8192,
    "max_output_tokens": 4096,
    "input_cost_per_token": 0.00003,
    "output_cost_per_token": 0.00006
  }
}
```

---

## 🛠️ 集成示例

### 在 ReActAgent 中使用

```typescript
import { globalModelCache } from "./core/llm/modelInfoFetcher";

export class ReActAgent {
  private modelCache = globalModelCache;

  async initialize() {
    // 启动时更新模型信息
    await this.modelCache.updateFromGitHub();
  }

  async run(sessionId: string, input: string) {
    const model = this.options.model;
    const contextWindow = this.modelCache.getContextWindow(model);

    console.log(`Using model ${model} with ${contextWindow} token context`);

    // 使用上下文窗口信息进行压缩判断...
  }
}
```

### 在 SessionStore 中使用

```typescript
import { globalModelCache } from "./core/llm/modelInfoFetcher";

export class SessionStore {
  async compressIfNeeded(sessionId: string) {
    const model = this.currentModel;
    const maxTokens = globalModelCache.getContextWindow(model);

    const currentTokens = this.estimateTokens(sessionId);

    if (currentTokens > maxTokens * 0.8) {
      await this.compress(sessionId);
    }
  }
}
```

---

## 🌐 部署自己的模型信息服务

### 简单的静态服务

```typescript
// server.ts
import express from "express";
import { MODEL_INFO } from "./core/llm/modelInfo";

const app = express();

app.get("/models.json", (req, res) => {
  res.json(MODEL_INFO);
});

app.listen(3000, () => {
  console.log("Model info server running on :3000");
});
```

然后客户端使用：

```typescript
const cache = new ModelInfoCache();
await cache.updateFromURL("https://your-server.com/models.json");
```

### 使用 GitHub Gist

1. 创建一个 Gist: https://gist.github.com/
2. 上传 `models.json`
3. 获取 raw URL
4. 使用：

```typescript
await cache.updateFromURL(
  "https://gist.githubusercontent.com/user/id/raw/models.json"
);
```

---

## ⚡ 性能优化

### 1. 设置合理的缓存过期时间

```typescript
const cache = new ModelInfoCache();
cache.cacheExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 天
```

### 2. 并行初始化

```typescript
async function initialize() {
  const [_, __] = await Promise.all([
    globalModelCache.updateFromGitHub(),
    initializeOtherServices()
  ]);
}
```

### 3. 失败降级

```typescript
try {
  await cache.updateFromGitHub();
} catch (error) {
  console.warn("Using default model info");
  // 继续使用硬编码的默认值
}
```

---

## 📝 可用的第三方数据源

### 1. litellm (推荐)⭐

```
https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json
```

**优点**：
- ✅ 维护活跃
- ✅ 包含价格信息
- ✅ 支持多个提供商
- ✅ 定期更新

### 2. tiktoken

```
https://github.com/openai/tiktoken/blob/main/tiktoken/model.py
```

**优点**：
- ✅ OpenAI 官方
- ✅ 包含编码信息

**缺点**：
- ❌ Python 代码，需要解析
- ❌ 不包含价格

### 3. 自己维护的 JSON

最可控和可靠的方案。

---

## 🔒 安全考虑

### 1. 验证数据

```typescript
function validateModelInfo(data: any): boolean {
  if (!data.contextWindow || data.contextWindow <= 0) {
    return false;
  }
  if (!data.maxOutputTokens || data.maxOutputTokens <= 0) {
    return false;
  }
  return true;
}

// 使用
const info = await fetchModelInfoFromURL(url);
for (const [name, data] of Object.entries(info)) {
  if (!validateModelInfo(data)) {
    console.warn(`Invalid data for ${name}`);
    delete info[name];
  }
}
```

### 2. 超时控制

```typescript
async function fetchWithTimeout(url: string, timeoutMs: number = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}
```

### 3. HTTPS Only

```typescript
function validateURL(url: string): boolean {
  return url.startsWith("https://");
}
```

---

## 📊 对比各种方案

| 方案 | 数据完整性 | 更新频率 | 可靠性 | 推荐度 |
|------|----------|---------|--------|--------|
| 硬编码 | ★★★★★ | 手动 | ★★★★★ | ★★★★☆ |
| OpenAI API | ★☆☆☆☆ | 实时 | ★★★★★ | ★☆☆☆☆ |
| GitHub (litellm) | ★★★★★ | 自动 | ★★★★☆ | ★★★★★ |
| 自定义服务 | ★★★★★ | 可控 | ★★★☆☆ | ★★★★☆ |

---

## 🎯 最佳实践

### 推荐配置

```typescript
import { ModelInfoCache } from "./core/llm/modelInfoFetcher";
import { MODEL_INFO } from "./core/llm/modelInfo";

// 1. 使用硬编码作为默认值
const cache = new ModelInfoCache(MODEL_INFO);

// 2. 启动时尝试更新
async function initializeModelInfo() {
  try {
    await cache.updateFromGitHub();
    console.log("✓ Model info updated from GitHub");
  } catch (error) {
    console.warn("Using default model info:", error.message);
  }
}

// 3. 定期自动更新
setInterval(() => {
  cache.autoUpdateIfExpired("github").catch(console.warn);
}, 60 * 60 * 1000); // 每小时检查一次

export { cache as modelCache };
```

---

## 🚀 快速开始

```typescript
import { globalModelCache } from "./core/llm/modelInfoFetcher";

// 方法 1: 一次性更新
await globalModelCache.updateFromGitHub();

// 方法 2: 自动更新（推荐）
await globalModelCache.autoUpdateIfExpired("github");

// 使用
const contextWindow = globalModelCache.getContextWindow("gpt-4");
console.log(contextWindow); // 获取最新的上下文窗口大小
```

---

## 总结

### ✅ 可以从 URL 获取

- **GitHub**: `https://raw.githubusercontent.com/BerriAI/litellm/main/...`
- **自定义服务**: 部署自己的 JSON 服务
- **Gist**: 使用 GitHub Gist

### ❌ 不能从 OpenAI API 获取

- OpenAI Models API 不返回上下文窗口

### 🎯 推荐方案

1. **硬编码 + GitHub 更新** - 最佳平衡
2. **定期自动更新** - 保持最新
3. **失败降级** - 使用默认值

**文件**: `src/core/llm/modelInfoFetcher.ts`
**状态**: ✅ 可用
