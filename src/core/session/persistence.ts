/**
 * Session persistence utilities
 *
 * Save and load session history to/from disk
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { ChatMessage } from "../llm/types";

export interface SessionHistoryMetadata {
  sessionId: string;
  savedAt: string;
  messageCount: number;
  lastMessageRole: string;
}

export interface SessionHistory {
  metadata: SessionHistoryMetadata;
  messages: ChatMessage[];
}

/**
 * Save session history to disk
 *
 * @param workspaceRoot - Workspace root directory
 * @param sessionId - Session ID
 * @param messages - Chat messages to save
 */
export async function saveSessionHistory(
  workspaceRoot: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  const sessionDir = path.join(workspaceRoot, ".Kraken", "sessions", sessionId);
  const historyFile = path.join(sessionDir, "history.json");

  // Create directory if it doesn't exist
  await fs.mkdir(sessionDir, { recursive: true });

  // Build history object
  const history: SessionHistory = {
    metadata: {
      sessionId,
      savedAt: new Date().toISOString(),
      messageCount: messages.length,
      lastMessageRole: messages.length > 0 ? messages[messages.length - 1].role : "none"
    },
    messages
  };

  // Write to file (overwrites existing)
  await fs.writeFile(historyFile, JSON.stringify(history, null, 2), "utf-8");
}

/**
 * Load session history from disk
 *
 * @param workspaceRoot - Workspace root directory
 * @param sessionId - Session ID
 * @returns Session history or null if not found
 */
export async function loadSessionHistory(
  workspaceRoot: string,
  sessionId: string
): Promise<SessionHistory | null> {
  const historyFile = path.join(workspaceRoot, ".Kraken", "sessions", sessionId, "history.json");

  try {
    const content = await fs.readFile(historyFile, "utf-8");
    const history: SessionHistory = JSON.parse(content);
    return history;
  } catch (error) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Delete session history from disk
 *
 * @param workspaceRoot - Workspace root directory
 * @param sessionId - Session ID
 */
export async function deleteSessionHistory(
  workspaceRoot: string,
  sessionId: string
): Promise<void> {
  const sessionDir = path.join(workspaceRoot, ".Kraken", "sessions", sessionId);

  try {
    await fs.rm(sessionDir, { recursive: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
}

/**
 * List all saved session IDs
 *
 * @param workspaceRoot - Workspace root directory
 * @returns Array of session IDs
 */
export async function listSessions(workspaceRoot: string): Promise<string[]> {
  const sessionsDir = path.join(workspaceRoot, ".Kraken", "sessions");

  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    return [];
  }
}
