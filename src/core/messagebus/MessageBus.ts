import { EventEmitter } from "node:events";

export interface MessageBusEvents {
  "agent:thinking": { content: string };
  "agent:tool_call": { toolName: string; input: unknown };
  "agent:tool_result": { toolName: string; result: string; ok: boolean };
  "agent:response": { content: string };
  "agent:error": { error: string };
  "system:log": { level: string; message: string; data?: unknown };
}

export type MessageBusEventName = keyof MessageBusEvents;

export class MessageBus extends EventEmitter {
  emit<K extends MessageBusEventName>(
    event: K,
    data: MessageBusEvents[K]
  ): boolean {
    return super.emit(event, data);
  }

  on<K extends MessageBusEventName>(
    event: K,
    listener: (data: MessageBusEvents[K]) => void
  ): this {
    return super.on(event, listener);
  }

  once<K extends MessageBusEventName>(
    event: K,
    listener: (data: MessageBusEvents[K]) => void
  ): this {
    return super.once(event, listener);
  }

  off<K extends MessageBusEventName>(
    event: K,
    listener: (data: MessageBusEvents[K]) => void
  ): this {
    return super.off(event, listener);
  }
}
