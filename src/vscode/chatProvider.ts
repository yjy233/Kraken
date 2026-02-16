/**
 * Chat Webview Provider for VSCode
 */
import * as vscode from "vscode";

export class KrakenChatProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Get path to logo image
    const logoUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'resources', 'logo.png')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kraken AI</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .container {
      text-align: center;
      padding: 20px;
    }
    .logo {
      max-width: 200px;
      width: 100%;
      height: auto;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      margin: 10px 0;
      color: var(--vscode-foreground);
    }
    p {
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${logoUri}" alt="Kraken Logo" class="logo" />
    <h1>Kraken AI Assistant</h1>
    <p>AI-powered coding assistant with ReAct reasoning</p>
  </div>
</body>
</html>`;
  }
}
