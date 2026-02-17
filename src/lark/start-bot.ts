#!/usr/bin/env node
/**
 * 飞书机器人启动脚本 - 接入 Kraken ReAct Agent（流式输出版）
 * 
 * 支持通过飞书与 Kraken AI 进行对话，实时显示思考过程和工具调用
 * 
 * 启动方式:
 *   npm run bot
 *   DEBUG=lark npm run bot
 */

import "dotenv/config";
import { loadKrakenConfig } from "../core/config/loadConfig";
import { LarkClient } from "./LarkClient";
import type { MessageReceiveEvent, CardActionEvent, CardActionResponse } from "./types";

// Agent 相关导入
import { MessageBus } from "../core/messagebus";
import { createLLMClient, type LLMProtocol } from "../core/llm/LLMClientFactory";
import { Sandbox } from "../core/sandbox/Sandbox";
import { SessionStore } from "../core/session/SessionStore";
import { createBuiltinTools } from "../core/tools/core_tool";
import { ToolRegistry } from "../core/tools/ToolRegistry";
import { ReActAgent } from "../core/agent/ReActAgent";
import { createLogger } from "../core/utils/logger";
import { MCPManager } from "../core/mcp/MCPManager";

// 调试配置
const DEBUG = {
  enabled: process.env.DEBUG?.includes("lark") || process.env.DEBUG === "*",
  verbose: process.env.DEBUG === "lark:*" || process.env.DEBUG === "*",
};

function log(...args: any[]) {
  if (DEBUG.enabled) {
    console.log("[Lark]", ...args);
  }
}

// 活跃会话状态管理
interface SessionState {
  messageId: string;
  chatId: string;
  chatType: "p2p" | "group";
  senderOpenId: string;
  isProcessing: boolean;
  currentStep: number;
  totalSteps: number;
  toolCalls: string[];
  lastUpdateTime: number;
}

const activeSessions = new Map<string, SessionState>();

// 消息去重 - 确保同一条消息只处理一次
const processedMessageIds = new Set<string>();

function isMessageProcessed(messageId: string): boolean {
  if (processedMessageIds.has(messageId)) {
    return true;
  }
  processedMessageIds.add(messageId);
  
  // 防止内存无限增长，最多保留最近 1000 条消息
  if (processedMessageIds.size > 1000) {
    const iterator = processedMessageIds.values();
    const firstValue = iterator.next().value;
    if (firstValue) {
      processedMessageIds.delete(firstValue);
    }
  }
  
  return false;
}

async function main() {
  const cwd = process.cwd();
  console.log(`📁 工作目录: ${cwd}`);
  console.log(`📁 用户目录: ${require("os").homedir()}`);
  
  const config = await loadKrakenConfig(cwd);
  
  console.log("\n⚙️  配置加载情况:");
  console.log(`  - LLM Provider: ${config.protocol || "未设置"}`);
  console.log(`  - Model: ${config.model || "未设置"}`);
  console.log(`  - Workspace: ${config.workspaceRoot || "未设置"}`);
  console.log(`  - Lark Enabled: ${config.lark?.enabled ?? "未设置"}`);
  console.log(`  - Lark App ID: ${config.lark?.appId ? "已设置" : "未设置"}`);
  console.log(`  - Lark App Secret: ${config.lark?.appSecret ? "已设置" : "未设置"}`);
  console.log("");
  
  const larkConfig = config.lark;

  if (!larkConfig?.enabled) {
    console.error("❌ 飞书机器人未启用");
    console.error("请检查 ~/.Kraken/Kraken.json 或 ./.Kraken/Kraken.json 中的 lark.enabled");
    process.exit(1);
  }

  const appId = larkConfig.appId;
  const appSecret = larkConfig.appSecret;

  if (!appId || !appSecret) {
    console.error("❌ 缺少 App ID 或 App Secret");
    console.error("配置优先级: ./.Kraken/Kraken.json > 环境变量 > ~/.Kraken/Kraken.json");
    console.error("请检查上述配置文件中的 lark.appId 和 lark.appSecret");
    process.exit(1);
  }

  console.log("🤖 正在启动飞书机器人...\n");

  // 初始化 Kraken Agent
  console.log("⚙️  初始化 Kraken Agent...");

  const logger = createLogger((config.logLevel as any) ?? "info");
  const messageBus = new MessageBus();

  const model = config.model ?? "gpt-4o-mini";
  const summaryModel = config.summaryModel ?? model;
  const protocol = config.protocol ?? "openai";
  const apiKey = config.apiKey;

  if (!apiKey) {
    console.error("❌ 缺少 API Key");
    process.exit(1);
  }

  const llm =
    protocol === "claude"
      ? createLLMClient({
          protocol,
          apiKey,
          baseUrl: config.baseUrl,
          timeoutMs: config.timeoutMs,
          anthropicVersion: config.anthropicVersion,
        })
      : createLLMClient({
          protocol,
          apiKey,
          baseUrl: config.baseUrl,
          timeoutMs: config.timeoutMs,
        });

  const workspaceRoot = config.workspaceRoot ?? process.cwd();
  
  const sandbox = new Sandbox({
    rootDir: workspaceRoot,
    allowedDirs: config.sandboxAllowedDirs,
    maxFileSizeBytes: config.sandboxMaxFileBytes ?? 1024 * 1024,
  });

  const sessions = new SessionStore(
    {
      maxTokens: config.maxSessionTokens ?? 4000,
      compressionTargetTokens: config.summaryTargetTokens ?? 600,
      summaryModel,
      workspaceRoot,
    },
    llm
  );

  const tools = createBuiltinTools();

  let mcpManager: MCPManager | undefined;
  if (config.mcpServers && config.mcpServers.length > 0) {
    try {
      logger.info("Initializing MCP servers...");
      mcpManager = new MCPManager(config.mcpServers);
      await mcpManager.connectAll();
      const mcpTools = mcpManager.getAllTools();
      tools.push(...mcpTools);
      logger.info(`Loaded ${mcpTools.length} MCP tools`);
    } catch (error) {
      logger.error(`Failed to initialize MCP: ${error}`);
    }
  }

  const toolRegistry = new ToolRegistry(tools);

  const agent = new ReActAgent({
    llm,
    tools: toolRegistry,
    sessions,
    sandbox,
    logger,
    options: {
      model,
      maxIterations: config.maxIterations ?? 6,
      temperature: config.temperature ?? 0.2,
      workspaceRoot,
      config: { tools: config.tools }
    },
    messageBus,
  });

  if (mcpManager) {
    process.on("exit", () => {
      mcpManager?.disconnectAll().catch(console.error);
    });
  }

  console.log("✅ Kraken Agent 初始化完成\n");

  // 创建 Lark Client
  const client = new LarkClient({
    appId,
    appSecret,
    debug: larkConfig.debug ?? DEBUG.enabled,
  });

  const botKeywords = larkConfig.botKeywords || ["kraken", "机器人"];
  const autoReplyOnMention = larkConfig.autoReplyOnMention !== false;

  // MessageBus 事件监听
  messageBus.on("agent:thinking", async ({ content, sessionId }) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.currentStep++;
    console.log(`🤔 [${sessionId.slice(0, 8)}] ${content}`);
  });

  messageBus.on("agent:tool_call", async ({ toolName, input, sessionId }) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.toolCalls.push(toolName);
    console.log(`🔧 [${sessionId.slice(0, 8)}] 调用工具: ${toolName}`);
    
    if (DEBUG.verbose) {
      console.log(`   输入:`, JSON.stringify(input, null, 2));
    }

    // 发送工具调用卡片
    try {
      const toolCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: `🔧 ${toolName}` },
          template: "yellow",
        },
        elements: [
          {
            tag: "div",
            text: { 
              tag: "lark_md", 
              content: "```json\n" + JSON.stringify(input, null, 2).substring(0, 500) + "\n```"
            },
          },
        ],
      };

      await client.sendCardMessage(
        session.chatType === "p2p" ? session.senderOpenId : session.chatId,
        toolCard,
        session.chatType === "p2p" ? "open_id" : "chat_id"
      );
    } catch (error) {
      log("发送工具调用通知失败:", error);
    }
  });

  messageBus.on("agent:tool_result", async ({ toolName, result, sessionId }) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    console.log(`✅ [${sessionId.slice(0, 8)}] ${toolName} 完成`);
    
    const truncatedResult = result.length > 300 
      ? result.substring(0, 300) + "..." 
      : result;

    try {
      const resultCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: `✅ ${toolName}` },
          template: "green",
        },
        elements: [
          {
            tag: "div",
            text: { 
              tag: "lark_md", 
              content: "```\n" + truncatedResult + "\n```"
            },
          },
        ],
      };

      await client.sendCardMessage(
        session.chatType === "p2p" ? session.senderOpenId : session.chatId,
        resultCard,
        session.chatType === "p2p" ? "open_id" : "chat_id"
      );
    } catch (error) {
      log("发送工具结果失败:", error);
    }
  });

  messageBus.on("agent:error", async ({ error, sessionId }) => {
    console.error(`❌ [${sessionId.slice(0, 8)}] 错误:`, error);
  });

  messageBus.on("agent:response", async ({ content, sessionId }) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.isProcessing = false;
    console.log(`✅ [${sessionId.slice(0, 8)}] 完成 (${content.length} 字符)`);
    activeSessions.delete(sessionId);
  });

  // 处理收到的消息
  client.on("im.message.receive_v1", async (data: MessageReceiveEvent) => {
    try {
      const { sender, content, messageId, messageType, chatType, mentions } = data;

      // 严格去重 - 确保同一条消息只处理一次
      if (isMessageProcessed(messageId)) {
        console.log(`[去重] 忽略已处理的消息: ${messageId}`);
        return;
      }

      if (messageType !== "text") {
        log("忽略非文本消息:", messageType);
        return;
      }

      let text = "";
      try {
        const parsed = JSON.parse(content);
        text = parsed.text || "";
      } catch {
        text = content;
      }

      console.log(`\n📨 [${chatType}] ${sender.senderId.open_id.slice(0, 8)}: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`);

      // 检查是否被 @提及
      const isMentioned = mentions?.some((m) =>
        botKeywords.some((keyword) => m.name.toLowerCase().includes(keyword.toLowerCase()))
      ) ?? false;

      if (chatType === "group" && !isMentioned && autoReplyOnMention) {
        log("群聊消息未 @机器人，忽略");
        return;
      }

      // 去掉 @机器人的部分
      let cleanText = text;
      if (isMentioned && mentions) {
        for (const mention of mentions) {
          cleanText = cleanText.replace(`@${mention.name}`, "").trim();
        }
      }

      // 特殊命令
      const lowerText = cleanText.toLowerCase();
      const sessionId = sender.senderId.open_id;

      if (lowerText === "/clear" || lowerText === "清除") {
        agent.clearSession(sessionId);
        
        const clearCard = {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: "plain_text", content: "✅ 已清除" },
            template: "green",
          },
          elements: [
            {
              tag: "div",
              text: { 
                tag: "lark_md", 
                content: "对话历史已清除"
              },
            },
          ],
        };
        
        await client.replyMessage(messageId, JSON.stringify(clearCard), "interactive", chatType === "group");
        return;
      }

      if (lowerText === "/help" || lowerText === "帮助") {
        const helpCard = {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: "plain_text", content: "🤖 Kraken AI 助手" },
            template: "blue",
          },
          elements: [
            {
              tag: "div",
              text: { 
                tag: "lark_md", 
                content: `**我可以帮你：**
• 编写和调试代码
• 分析项目文件
• 执行命令行操作
• 搜索和获取网页内容

**命令：**
• /clear - 清除对话历史
• /help - 显示帮助

直接发送消息即可开始对话！`
              },
            },
          ],
        };
        
        await client.replyMessage(messageId, JSON.stringify(helpCard), "interactive", chatType === "group");
        return;
      }

      // 检查是否已有进行中的会话
      if (activeSessions.has(sessionId)) {
        const existing = activeSessions.get(sessionId)!;
        if (existing.isProcessing) {
          const busyCard = {
            config: { wide_screen_mode: true },
            header: {
              title: { tag: "plain_text", content: "⏳ 请稍等" },
              template: "grey",
            },
            elements: [
              {
                tag: "div",
                text: { 
                  tag: "lark_md", 
                  content: "正在处理上一条消息，请稍后再试..."
                },
              },
            ],
          };
          
          await client.replyMessage(messageId, JSON.stringify(busyCard), "interactive", chatType === "group");
          return;
        }
      }

      // 先发送 emoji 提示（群聊中使用话题回复）
      const replyInThread = chatType === "group";
      console.log(`📤 发送思考提示: chatType=${chatType}, replyInThread=${replyInThread}`);
      const thinkingMsg = await client.replyTextMessage(messageId, "🤔", replyInThread);
      console.log(`📨 思考消息已发送: messageId=${thinkingMsg.data?.messageId}`);
      const thinkingMessageId = thinkingMsg.data?.messageId;

      // 创建会话状态
      const sessionState: SessionState = {
        messageId: thinkingMessageId || messageId,  // 使用思考消息的ID以便后续编辑
        chatId: data.chatId,
        chatType,
        senderOpenId: sender.senderId.open_id,
        isProcessing: true,
        currentStep: 0,
        totalSteps: config.maxIterations ?? 6,
        toolCalls: [],
        lastUpdateTime: Date.now(),
      };
      activeSessions.set(sessionId, sessionState);

      // 调用 Agent
      const startTime = Date.now();
      let response: string;
      
      try {
        response = await agent.run(sessionId, cleanText);
      } catch (error) {
        console.error("Agent 执行失败:", error);
        response = "❌ 处理请求时出错，请稍后重试。";
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ 处理完成 (${elapsed}ms)`);

      // 构建 Markdown 卡片
      const responseCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "🤖 Kraken AI" },
          template: "blue",
        },
        elements: [
          {
            tag: "div",
            text: { 
              tag: "lark_md", 
              content: response
            },
          },
          {
            tag: "hr",
          },
          {
            tag: "note",
            elements: [
              {
                tag: "plain_text",
                content: `⏱️ ${elapsed}ms · 输入 /help 查看帮助`
              }
            ]
          }
        ],
      };

      // 编辑消息为 Markdown 卡片
      if (thinkingMessageId) {
        try {
          // 尝试编辑为卡片
          await client.editMessage(thinkingMessageId, JSON.stringify(responseCard), "interactive");
          console.log(`✏️  已编辑为卡片: ${thinkingMessageId}`);
        } catch (editError) {
          // 编辑失败，发送新卡片
          console.log(`⚠️  编辑失败，发送新卡片: ${editError}`);
          await client.replyMessage(messageId, JSON.stringify(responseCard), "interactive", replyInThread);
        }
      } else {
        // 没有思考消息ID，直接发送卡片
        await client.replyMessage(messageId, JSON.stringify(responseCard), "interactive", replyInThread);
      }
      
    } catch (error) {
      console.error("❌ 处理消息失败:", error);
      
      // 错误信息也用卡片发送
      const errorCard = {
        config: { wide_screen_mode: true },
        header: {
          title: { tag: "plain_text", content: "❌ 错误" },
          template: "red",
        },
        elements: [
          {
            tag: "div",
            text: { 
              tag: "lark_md", 
              content: "处理消息时出错，请稍后重试。"
            },
          },
        ],
      };
      
      await client.replyMessage(data.messageId, JSON.stringify(errorCard), "interactive", data.chatType === "group");
    }
  });

  // 处理卡片交互
  client.on("card.action.trigger", async (data: CardActionEvent): Promise<CardActionResponse> => {
    console.log("🎴 卡片交互:", data.actionValue);
    
    const action = data.actionValue?.action;
    
    if (action === "like") {
      return {
        toast: {
          type: "success",
          content: "Thanks!",
          i18n: { zh_cn: "感谢你的点赞！❤️", en_us: "Thanks for your like!" },
        },
      };
    }
    
    return {
      toast: {
        type: "success",
        content: "OK",
        i18n: { zh_cn: "操作成功", en_us: "Success" },
      },
    };
  });

  client.start();

  console.log("✅ 飞书机器人已启动!\n");
  console.log(`📋 配置:`);
  console.log(`  • App ID: ${appId.slice(0, 8)}...`);
  console.log(`  • LLM: ${protocol} / ${model}`);
  console.log(`  • 工作区: ${workspaceRoot}`);
  console.log(`  • 工具数: ${tools.length}`);
  console.log("\n按 Ctrl+C 停止\n");
}

main().catch((err) => {
  console.error("启动失败:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n👋 再见!");
  process.exit(0);
});
