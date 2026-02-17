/**
 * 飞书机器人类型定义
 */

/** 飞书客户端配置 */
export interface LarkClientConfig {
  /** App ID */
  appId: string;
  /** App Secret */
  appSecret: string;
  /** 是否启用调试日志，默认 false */
  debug?: boolean;
}

/** 消息发送配置 */
export interface SendMessageConfig {
  /** 接收者 ID */
  receiveId: string;
  /** 消息内容 */
  content: string;
  /** 接收者 ID 类型，默认 open_id */
  receiveIdType?: "open_id" | "union_id" | "user_id" | "email" | "chat_id";
  /** 消息类型，默认 text */
  msgType?: "text" | "post" | "image" | "file" | "interactive";
}

/** 消息内容 */
export interface MessageContent {
  /** 文本内容 */
  text?: string;
  /** 富文本内容（JSON 字符串） */
  post?: string;
  /** 图片 key */
  image?: string;
  /** 文件 key */
  file?: string;
  /** 卡片内容（JSON 字符串） */
  card?: string;
}

/** 接收到的消息事件数据 */
export interface MessageReceiveEvent {
  /** 消息 ID */
  messageId: string;
  /** 消息根 ID */
  rootId?: string;
  /** 父消息 ID */
  parentId?: string;
  /** 创建时间（毫秒时间戳） */
  createTime: string;
  /** 聊天 ID */
  chatId: string;
  /** 聊天类型 */
  chatType: "p2p" | "group";
  /** 消息类型 */
  messageType: string;
  /** 消息内容 */
  content: string;
  /** 发送者信息 */
  sender: {
    senderId: {
      open_id: string;
      union_id?: string;
      user_id?: string;
    };
    senderType: string;
    tenantKey: string;
  };
  /**  mentions 信息 */
  mentions?: Array<{
    key: string;
    id: {
      open_id: string;
      union_id?: string;
      user_id?: string;
    };
    name: string;
    tenantKey: string;
  }>;
}

/** 卡片交互事件数据 */
export interface CardActionEvent {
  /** 操作触发时间 */
  actionTime: string;
  /** 操作值 */
  actionValue: Record<string, any>;
  /** 操作标签 */
  actionTag: string;
  /** 用户 ID */
  openId: string;
  /** 用户 ID（union_id） */
  unionId: string;
  /** 租户 Key */
  tenantKey: string;
  /** 消息 ID */
  openMessageId: string;
  /** 卡片内容 */
  cardContent: string;
  /** 触发操作的表单值 */
  formValue?: Record<string, any>;
}

/** 卡片响应 Toast */
export interface CardToast {
  type: "success" | "error" | "info" | "warning";
  content: string;
  i18n?: {
    zh_cn?: string;
    en_us?: string;
    ja_jp?: string;
  };
}

/** 卡片响应 */
export interface CardActionResponse {
  toast?: CardToast;
  /** 是否关闭卡片 */
  closeCard?: boolean;
  /** 更新后的卡片内容 */
  card?: Record<string, any>;
}

/** 事件处理器 */
export type EventHandler<T = any, R = any> = (data: T) => Promise<R> | R;

/** 事件处理器映射 */
export interface EventHandlers {
  /** 接收消息事件 */
  "im.message.receive_v1"?: EventHandler<MessageReceiveEvent, void>;
  /** 卡片交互事件 */
  "card.action.trigger"?: EventHandler<CardActionEvent, CardActionResponse | void>;
  /** 其他自定义事件 */
  [eventType: string]: EventHandler<any, any> | undefined;
}

/** 飞书 API 响应 */
export interface LarkApiResponse<T = any> {
  code: number;
  msg: string;
  data?: T;
}

/** 发送消息响应 */
export interface SendMessageResponse {
  messageId: string;
  rootId?: string;
  parentId?: string;
  chatId: string;
  chatType: string;
  messageType: string;
  content: string;
  createTime: string;
  updateTime: string;
  deleted: boolean;
  updated: boolean;
  sender: {
    id: string;
    idType: string;
    senderType: string;
    tenantKey: string;
  };
}
