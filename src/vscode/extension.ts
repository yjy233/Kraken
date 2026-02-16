/**
 * VSCode Extension Entry Point
 * Registers Kraken AI chat sidebar
 */
import * as vscode from "vscode";
import { KrakenChatProvider } from "./chatProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Kraken AI Assistant is now active!");

  // Register webview provider for chat sidebar
  const chatProvider = new KrakenChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("kraken.chatView", chatProvider)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("kraken.chat", () => {
      vscode.commands.executeCommand("kraken.chatView.focus");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("kraken.clearSession", () => {
      vscode.window.showInformationMessage("Kraken: Session cleared");
    })
  );

  vscode.window.showInformationMessage("Kraken AI is ready!");
}

export function deactivate() {
  // Cleanup if needed
}
