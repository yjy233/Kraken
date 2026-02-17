/**
 * 飞书机器人 SDK 入口
 * 
 * 提供 WebSocket 连接、消息接收和发送功能
 * 
 * @example
 * ```typescript
 * import { LarkClient } from "./lark";
 * 
 * const client = new LarkClient({
 *   appId: process.env.LARK_APP_ID || "",
 *   appSecret: process.env.LARK_APP_SECRET || "",
 *   debug: true,
 * });
 * 
 * // 注册事件处理器
 * client.on("im.message.receive_v1", async (data) => {
 *   console.log("收到消息:", data);
 *   
 *   // 回复消息
 *   await client.replyTextMessage(
 *     data.messageId,
 *     `收到你的消息: ${data.content}`
 *   );
 * });
 * 
 * client.on("card.action.trigger", async (data) => {
 *   console.log("卡片交互:", data);
 *   return {
 *     toast: {
 *       type: "success",
 *       content: "操作成功",
 *       i18n: { zh_cn: "操作成功", en_us: "Success" },
 *     },
 *   };
 * });
 * 
 * // 启动客户端
 * client.start();
 * ```
 */

export { LarkClient } from "./LarkClient";
export type {
  LarkClientConfig,
  SendMessageConfig,
  MessageReceiveEvent,
  CardActionEvent,
  CardActionResponse,
  CardToast,
  EventHandlers,
  EventHandler,
  LarkApiResponse,
  SendMessageResponse,
} from "./types";

import type {
  MessageReceiveEvent,
  CardActionEvent,
  CardActionResponse,
} from "./types";
import type { LarkClient } from "./LarkClient";

// 便捷的工厂函数

/**
 * 创建飞书客户端
 */
export function createLarkClient(options: {
  appId?: string;
  appSecret?: string;
  debug?: boolean;
}): LarkClient {
  const appId = options.appId || process.env.LARK_APP_ID || process.env.APP_ID;
  const appSecret = options.appSecret || process.env.LARK_APP_SECRET || process.env.APP_SECRET;

  if (!appId) {
    throw new Error(
      "缺少 App ID，请通过 options.appId 或环境变量 LARK_APP_ID / APP_ID 设置"
    );
  }

  if (!appSecret) {
    throw new Error(
      "缺少 App Secret，请通过 options.appSecret 或环境变量 LARK_APP_SECRET / APP_SECRET 设置"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LarkClient: Client } = require("./LarkClient");
  return new Client({
    appId,
    appSecret,
    debug: options.debug,
  });
}

/**
 * 快速启动飞书机器人
 */
export async function startLarkBot(options: {
  appId?: string;
  appSecret?: string;
  debug?: boolean;
  onMessage?: (data: MessageReceiveEvent, client: LarkClient) => Promise<void> | void;
  onCardAction?: (data: CardActionEvent, client: LarkClient) => Promise<CardActionResponse | void> | CardActionResponse | void;
  onCustomEvent?: Record<string, (data: any, client: LarkClient) => Promise<any> | any>;
}): Promise<LarkClient> {
  const client = createLarkClient(options);

  
  if (options.onMessage) {
    client.on("im.message.receive_v1", (data: MessageReceiveEvent) => options.onMessage!(data, client));
  }

  if (options.onCardAction) {
    client.on("card.action.trigger", (data: CardActionEvent) => options.onCardAction!(data, client));
  }

  //if (options.onCustomEvent) {
  //  Object.entries(options.onCustomEvent).forEach(([event, handler]) => {
  //    client.on(event as any, (data: any) => handler(data, client));
  //  });
  //}

  client.start();
  return client;
}
