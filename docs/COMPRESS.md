#  tiktoken 估计上下文
估计上下文
```
npm install tiktoken

  import { encoding_for_model } from "tiktoken";

  function countTokens(text: string, model: string = "gpt-4"): number {
    const encoding = encoding_for_model(model);
    const tokens = encoding.encode(text);
    encoding.free();
    return tokens.length;
  }

  // 使用
  const text = "Hello, how are you?";
  const tokenCount = countTokens(text, "gpt-4");
  console.log(`Token count: ${tokenCount}`);
```