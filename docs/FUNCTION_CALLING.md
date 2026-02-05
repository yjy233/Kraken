# OpenAI Standard Function Calling

Kraken uses OpenAI's standard function calling format for tool execution.

## Tool Definition Format

Tools are defined with JSON Schema:

```typescript
{
  name: "read_file",
  description: "Read a file from the sandbox.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path relative to sandbox root"
      }
    },
    required: ["path"]
  }
}
```

## API Request Format

When calling the LLM, tools are registered in the `tools` parameter:

```typescript
await llm.chatCompletion({
  model: "gpt-4o-mini",
  messages: [...],
  tools: [
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read a file from the sandbox.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "..." }
          },
          required: ["path"]
        }
      }
    }
  ]
});
```

## LLM Response Format

### Text Response (No Tool Call)

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Here is my answer..."
    }
  }]
}
```

### Tool Call Response

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "read_file",
          "arguments": "{\"path\": \"todo.md\"}"
        }
      }]
    }
  }]
}
```

## Message Flow

### 1. User Message
```json
{
  "role": "user",
  "content": "Read todo.md"
}
```

### 2. Assistant with Tool Calls
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [{
    "id": "call_abc123",
    "type": "function",
    "function": {
      "name": "read_file",
      "arguments": "{\"path\": \"todo.md\"}"
    }
  }]
}
```

### 3. Tool Result
```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "- Task 1\n- Task 2"
}
```

### 4. Final Assistant Response
```json
{
  "role": "assistant",
  "content": "Here are your todos: Task 1, Task 2"
}
```

## Benefits

1. **Standard Format**: Compatible with all OpenAI-compatible APIs
2. **Parallel Tool Calls**: LLM can call multiple tools in one response
3. **Better Tracking**: `tool_call_id` links results to specific calls
4. **Type Safety**: JSON Schema validation for tool inputs
5. **Provider Support**: Works with OpenAI, Anthropic (Claude), and other providers

## Implementation in Kraken

- **Tool Registry**: Stores tools with JSON Schema definitions
- **ReActAgent**: Converts tools to OpenAI format and handles `tool_calls`
- **OpenAIClient**: Sends `tools` parameter and returns typed `tool_calls`
- **SessionStore**: Handles messages with `tool_calls` and `tool_call_id`

## Example Tool Definition

```typescript
const readFile: ToolDefinition<ReadFileInput> = {
  name: "read_file",
  description: "Read a file from the sandbox.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path relative to sandbox root or absolute path within allowlist."
      }
    },
    required: ["path"]
  },
  async run(input, context) {
    try {
      const content = await context.sandbox.readFile(input.path);
      return { ok: true, content };
    } catch (error) {
      return { ok: false, content: `read_file error: ${error.message}` };
    }
  }
};
```

## References

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/chat/create)
