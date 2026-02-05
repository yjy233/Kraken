# MessageBus Architecture

## Overview

Kraken uses a MessageBus pattern to decouple the core agent logic from the user interface layer. This architecture makes it easy to add new interfaces (CLI, Web UI, API server) without modifying core logic.

## Components

### MessageBus (`src/core/messagebus/`)

Event-based communication system that provides typed event handling:

```typescript
import { MessageBus } from "./core/messagebus";

const messageBus = new MessageBus();

// Subscribe to events
messageBus.on("agent:thinking", (data) => {
  console.log(`Thinking: ${data.content}`);
});

messageBus.on("agent:tool_call", (data) => {
  console.log(`Tool: ${data.toolName}`, data.input);
});

messageBus.on("agent:tool_result", (data) => {
  console.log(`Result [${data.ok ? "✓" : "✗"}]: ${data.result}`);
});

messageBus.on("agent:response", (data) => {
  console.log(`Response: ${data.content}`);
});

messageBus.on("agent:error", (data) => {
  console.error(`Error: ${data.error}`);
});
```

### Event Types

| Event | Data | Description |
|-------|------|-------------|
| `agent:thinking` | `{ content: string }` | Agent is processing (includes step number) |
| `agent:tool_call` | `{ toolName: string, input: unknown }` | Agent is calling a tool |
| `agent:tool_result` | `{ toolName: string, result: string, ok: boolean }` | Tool execution completed |
| `agent:response` | `{ content: string }` | Agent has a final response |
| `agent:error` | `{ error: string }` | An error occurred |
| `system:log` | `{ level: string, message: string, data?: unknown }` | System log message |

## Creating the Agent with MessageBus

```typescript
import { MessageBus } from "./core/messagebus";
import { ReActAgent } from "./core/agent/ReActAgent";

const messageBus = new MessageBus();

const agent = new ReActAgent({
  llm,
  tools,
  sessions,
  sandbox,
  logger,
  options: {
    model: "gpt-4o-mini",
    maxIterations: 6,
    temperature: 0.2
  },
  messageBus // Optional - agent works without it too
});
```

## CLI Interface

The CLI package (`src/cli/`) demonstrates how to build an interface using MessageBus:

```typescript
import { createCLI } from "./cli";

const cli = createCLI({
  apiKey: "your-api-key",
  model: "gpt-4o-mini"
});

await cli.start();
```

The CLI class:
1. Creates a MessageBus
2. Subscribes to agent events
3. Displays real-time updates (thinking, tool calls, results)
4. Provides readline interface for user input

## Adding a New Interface

To create a new interface (e.g., Web API):

```typescript
// src/api/index.ts
import { MessageBus } from "../core/messagebus";
import { createAgent } from "./factory"; // Your agent factory

export function createAPI(config) {
  const messageBus = new MessageBus();
  const agent = createAgent(config, messageBus);

  // Subscribe to events
  messageBus.on("agent:thinking", (data) => {
    // Send via WebSocket/SSE to client
    ws.send(JSON.stringify({ type: "thinking", data }));
  });

  messageBus.on("agent:response", (data) => {
    // Send final response to client
    ws.send(JSON.stringify({ type: "response", data }));
  });

  return {
    handleMessage: async (text: string) => {
      return await agent.run("session-id", text);
    }
  };
}
```

## Benefits

1. **Decoupling**: Core logic doesn't know about UI implementation
2. **Real-time Updates**: UI can show progress as agent works
3. **Multiple Interfaces**: Easy to add web UI, API, or other interfaces
4. **Testing**: Can mock MessageBus to test agent behavior
5. **Debugging**: Can log all events for debugging

## Optional Usage

The MessageBus is optional - the agent works fine without it:

```typescript
const agent = new ReActAgent({
  llm,
  tools,
  sessions,
  sandbox,
  logger,
  options: { model: "gpt-4o-mini" }
  // No messageBus provided
});

// Agent works normally, just doesn't emit events
const response = await agent.run("session-id", "Hello");
```
