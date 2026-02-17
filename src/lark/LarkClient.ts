/**
 * 飞书机器人 WebSocket 客户端
 * 基于 @larksuiteoapi/node-sdk 实现
 */

import * as Lark from "@larksuiteoapi/node-sdk";
import type {
  LarkClientConfig,
  SendMessageConfig,
  EventHandlers,
  MessageReceiveEvent,
  CardActionEvent,
  CardActionResponse,
  LarkApiResponse,
  SendMessageResponse,
} from "./types";

export { LarkClientConfig, SendMessageConfig, MessageReceiveEvent, CardActionEvent };

/**
 * 飞书机器人客户端
 * 支持 WebSocket 连接、消息接收和发送
 */
export class LarkClient {
  private config: LarkClientConfig;
  private wsClient: Lark.WSClient | null = null;
  private eventDispatcher: Lark.EventDispatcher | null = null;
  private client: Lark.Client | null = null;
  private eventHandlers: EventHandlers = {};
  private debug: boolean;
  
  // 消息去重机制
  private processedMessageIds: Set<string> = new Set();
  private lastCleanupTime: number = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟清理一次
  private readonly MAX_CACHE_SIZE = 1000; // 最大缓存消息数

  constructor(config: LarkClientConfig) {
    this.config = {
      debug: false,
      ...config,
    };
    this.debug = this.config.debug ?? false;
    this.validateConfig();
  }
  
  /**
   * 检查消息是否已处理过
   */
  private isDuplicate(messageId: string): boolean {
    // 清理过期缓存
    this.cleanupIfNeeded();
    
    if (this.processedMessageIds.has(messageId)) {
      return true;
    }
    
    // 记录新消息
    this.processedMessageIds.add(messageId);
    
    // 防止内存无限增长
    if (this.processedMessageIds.size > this.MAX_CACHE_SIZE) {
      // 删除最早的 20% 数据
      const toDelete = Math.floor(this.MAX_CACHE_SIZE * 0.2);
      const iterator = this.processedMessageIds.values();
      for (let i = 0; i < toDelete; i++) {
        const value = iterator.next().value;
        if (value) {
          this.processedMessageIds.delete(value);
        }
      }
    }
    
    return false;
  }
  
  /**
   * 定期清理缓存
   */
  private cleanupIfNeeded(): void {
    const now = Date.now();
    if (now - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
      this.processedMessageIds.clear();
      this.lastCleanupTime = now;
      this.log("已清理消息去重缓存");
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.appId) {
      throw new Error("LarkClient: appId 不能为空");
    }
    if (!this.config.appSecret) {
      throw new Error("LarkClient: appSecret 不能为空");
    }
  }

  /**
   * 初始化 HTTP 客户端（用于发送消息等 API 调用）
   */
  private initHttpClient(): void {
    this.client = new Lark.Client({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      appType: Lark.AppType.SelfBuild,
    });
  }

  /**
   * 创建事件分发器
   */
  private createEventDispatcher(): void {
    const handlers: Record<string, any> = {};

    // 获取所有已注册的事件类型
    const eventTypes = Object.keys(this.eventHandlers);

    // 为每个事件类型创建包装处理器
    eventTypes.forEach((eventType) => {
      const handler = this.eventHandlers[eventType];
      if (!handler) return;

      handlers[eventType] = async (rawData: any) => {
        // 提取 event 数据（飞书 SDK 包装格式）
        const eventData = rawData.event || rawData;
        
        // 消息去重检查（仅针对消息事件）
        const messageId = eventData.message_id || eventData.message?.message_id || eventData.open_message_id || eventData.openMessageId;
        if (messageId) {
          if (this.isDuplicate(messageId)) {
            this.log(`[去重] 忽略重复消息: ${messageId}`);
            return;
          }
        }
        
        // 统一打印所有收到的事件
        const header = eventType === "im.message.receive_v1" 
          ? "📨 [im.message.receive_v1]" 
          : eventType === "card.action.trigger"
          ? "🎴 [card.action.trigger]"
          : `📡 [${eventType}]`;
        
        console.log(`\n${header} 收到事件:`);
        
        // 打印关键信息
        if (eventType === "im.message.receive_v1") {
          console.log(`   消息ID: ${eventData.message_id || eventData.message?.message_id}`);
          console.log(`   聊天ID: ${eventData.chat_id || eventData.message?.chat_id}`);
          console.log(`   发送者: ${eventData.sender?.sender_id?.open_id || eventData.sender?.id?.open_id}`);
          console.log(`   消息类型: ${eventData.message_type || eventData.message?.message_type}`);
          // 尝试解析文本
          let text = "";
          const content = eventData.content || eventData.message?.content;
          try {
            const parsed = JSON.parse(content);
            text = parsed.text || "";
          } catch {
            text = content || "";
          }
          if (text) {
            console.log(`   内容: ${text.substring(0, 200)}${text.length > 200 ? "..." : ""}`);
          }
        } else if (eventType === "card.action.trigger") {
          console.log(`   用户ID: ${eventData.open_id || eventData.openId}`);
          console.log(`   消息ID: ${eventData.open_message_id || eventData.openMessageId}`);
          console.log(`   操作标签: ${eventData.action_tag || eventData.actionTag}`);
          console.log(`   操作值:`, eventData.action_value || eventData.actionValue);
        } else {
          // 其他事件类型，打印关键字段
          const keyFields = ["user_id", "open_id", "chat_id", "message_id", "action"];
          keyFields.forEach((field) => {
            if (eventData[field] !== undefined) {
              console.log(`   ${field}: ${eventData[field]}`);
            }
          });
        }
        
        // 调试模式下打印完整数据
        if (this.debug) {
          console.log("   完整数据:", JSON.stringify(rawData, null, 2).substring(0, 500));
        }
        
        console.log("");

        // 调用实际处理器
        if (eventType === "im.message.receive_v1") {
          const parsedData = this.parseMessageEvent(rawData);
          await handler(parsedData);
        } else if (eventType === "card.action.trigger") {
          const parsedData = this.parseCardActionEvent(rawData);
          const result = await handler(parsedData);
          if (result) {
            return this.buildCardResponse(result as CardActionResponse);
          }
        } else {
          await handler(rawData);
        }
      };
    });

    this.eventDispatcher = new Lark.EventDispatcher({}).register(handlers);
  }

  /**
   * 解析消息事件数据
   */
  private parseMessageEvent(data: any): MessageReceiveEvent {
    const event = data.event || data;
    return {
      messageId: event.message_id || event.message?.message_id,
      rootId: event.root_id || event.message?.root_id,
      parentId: event.parent_id || event.message?.parent_id,
      createTime: event.create_time || event.message?.create_time,
      chatId: event.chat_id || event.message?.chat_id,
      chatType: event.chat_type || event.message?.chat_type,
      messageType: event.message_type || event.message?.message_type,
      content: event.content || event.message?.content,
      sender: {
        senderId: {
          open_id: event.sender?.sender_id?.open_id || event.sender?.id?.open_id,
          union_id: event.sender?.sender_id?.union_id || event.sender?.id?.union_id,
          user_id: event.sender?.sender_id?.user_id || event.sender?.id?.user_id,
        },
        senderType: event.sender?.sender_type || event.sender?.type,
        tenantKey: event.sender?.tenant_key || event.sender?.tenantKey,
      },
      mentions: event.mentions?.map((m: any) => ({
        key: m.key,
        id: {
          open_id: m.id?.open_id || m.open_id,
          union_id: m.id?.union_id || m.union_id,
          user_id: m.id?.user_id || m.user_id,
        },
        name: m.name,
        tenantKey: m.tenant_key || m.tenantKey,
      })),
    };
  }

  /**
   * 解析卡片交互事件数据
   */
  private parseCardActionEvent(data: any): CardActionEvent {
    const event = data.event || data;
    return {
      actionTime: event.action_time || event.actionTime,
      actionValue: event.action_value || event.actionValue || {},
      actionTag: event.action_tag || event.actionTag,
      openId: event.open_id || event.openId,
      unionId: event.union_id || event.unionId,
      tenantKey: event.tenant_key || event.tenantKey,
      openMessageId: event.open_message_id || event.openMessageId,
      cardContent: event.card_content || event.cardContent,
      formValue: event.form_value || event.formValue || {},
    };
  }

  /**
   * 构建卡片响应
   */
  private buildCardResponse(response: CardActionResponse): any {
    const result: any = {};

    if (response.toast) {
      result.toast = {
        type: response.toast.type,
        content: response.toast.content,
        i18n: response.toast.i18n,
      };
    }

    if (response.closeCard !== undefined) {
      result.close_card = response.closeCard;
    }

    if (response.card) {
      result.card = response.card;
    }

    return result;
  }

  /**
   * 注册事件处理器
   */
  on<T extends keyof EventHandlers>(
    event: T,
    handler: EventHandlers[T]
  ): this {
    this.eventHandlers[event] = handler;
    return this;
  }

  /**
   * 批量注册事件处理器
   */
  registerHandlers(handlers: EventHandlers): this {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
    return this;
  }

  /**
   * 启动 WebSocket 客户端
   */
  start(): void {
    if (this.wsClient) {
      this.log("WebSocket 客户端已在运行");
      return;
    }

    // 初始化 HTTP 客户端
    this.initHttpClient();

    // 创建事件分发器
    this.createEventDispatcher();

    // 创建并启动 WebSocket 客户端
    this.wsClient = new Lark.WSClient({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
    });

    this.wsClient.start({
      eventDispatcher: this.eventDispatcher!,
    });

    this.log("飞书机器人 WebSocket 客户端已启动...");
  }

  /**
   * 停止 WebSocket 客户端
   */
  stop(): void {
    if (this.wsClient) {
      // @ts-ignore - WSClient 可能有 stop 方法
      if (typeof this.wsClient.stop === "function") {
        // @ts-ignore
        this.wsClient.stop();
      }
      this.wsClient = null;
      this.log("飞书机器人 WebSocket 客户端已停止");
    }
  }

  /**
   * 发送文本消息
   */
  async sendTextMessage(
    receiveId: string,
    text: string,
    receiveIdType: SendMessageConfig["receiveIdType"] = "open_id"
  ): Promise<LarkApiResponse<SendMessageResponse>> {
    return this.sendMessage({
      receiveId,
      content: JSON.stringify({ text }),
      receiveIdType,
      msgType: "text",
    });
  }

  /**
   * 发送富文本消息
   */
  async sendRichTextMessage(
    receiveId: string,
    post: Record<string, any>,
    receiveIdType: SendMessageConfig["receiveIdType"] = "open_id"
  ): Promise<LarkApiResponse<SendMessageResponse>> {
    return this.sendMessage({
      receiveId,
      content: JSON.stringify(post),
      receiveIdType,
      msgType: "post",
    });
  }

  /**
   * 发送卡片消息
   */
  async sendCardMessage(
    receiveId: string,
    card: Record<string, any>,
    receiveIdType: SendMessageConfig["receiveIdType"] = "open_id"
  ): Promise<LarkApiResponse<SendMessageResponse>> {
    return this.sendMessage({
      receiveId,
      content: JSON.stringify(card),
      receiveIdType,
      msgType: "interactive",
    });
  }

  /**
   * 发送消息（通用方法）
   */
  async sendMessage(config: SendMessageConfig): Promise<LarkApiResponse<SendMessageResponse>> {
    if (!this.client) {
      throw new Error("LarkClient 未启动，请先调用 start() 方法");
    }

    const { receiveId, content, receiveIdType = "open_id", msgType = "text" } = config;

    this.log(`发送消息: type=${msgType}, receiveIdType=${receiveIdType}`);

    try {
      const response = await this.client.im.message.create({
        params: {
          receive_id_type: receiveIdType as "open_id" | "union_id" | "user_id" | "email" | "chat_id",
        },
        data: {
          receive_id: receiveId,
          content,
          msg_type: msgType as string,
        },
      });

      return response as LarkApiResponse<SendMessageResponse>;
    } catch (error) {
      this.log("发送消息失败:", error);
      throw error;
    }
  }

  /**
   * 回复消息
   */
  async replyMessage(
    messageId: string,
    content: string,
    msgType: SendMessageConfig["msgType"] = "text",
    replyInThread: boolean = false
  ): Promise<LarkApiResponse<SendMessageResponse>> {
    if (!this.client) {
      throw new Error("LarkClient 未启动，请先调用 start() 方法");
    }

    this.log(`回复消息: messageId=${messageId}, type=${msgType}`);

    try {
      const response = await this.client.im.message.reply({
        path: {
          message_id: messageId,
        },
        data: {
          content: msgType === "text" ? JSON.stringify({ text: content }) : content,
          msg_type: msgType!,
          reply_in_thread: replyInThread,
        },
      });

      return response as LarkApiResponse<SendMessageResponse>;
    } catch (error) {
      this.log("回复消息失败:", error);
      throw error;
    }
  }

  /**
   * 回复文本消息
   */
  async replyTextMessage(
    messageId: string,
    text: string,
    replyInThread: boolean = false
  ): Promise<LarkApiResponse<SendMessageResponse>> {
    return this.replyMessage(messageId, text, "text", replyInThread);
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string, userIdType: "open_id" | "union_id" | "user_id" = "open_id"): Promise<LarkApiResponse<any>> {
    if (!this.client) {
      throw new Error("LarkClient 未启动，请先调用 start() 方法");
    }

    try {
      const response = await this.client.contact.user.get({
        path: {
          user_id: userId,
        },
        params: {
          user_id_type: userIdType,
        },
      });

      return response as LarkApiResponse<any>;
    } catch (error) {
      this.log("获取用户信息失败:", error);
      throw error;
    }
  }

  /**
   * 获取群信息
   */
  async getChatInfo(chatId: string): Promise<LarkApiResponse<any>> {
    if (!this.client) {
      throw new Error("LarkClient 未启动，请先调用 start() 方法");
    }

    try {
      const response = await this.client.im.chat.get({
        path: {
          chat_id: chatId,
        },
      });

      return response as LarkApiResponse<any>;
    } catch (error) {
      this.log("获取群信息失败:", error);
      throw error;
    }
  }

  /**
   * 调试日志
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[LarkClient]", ...args);
    }
  }
}
