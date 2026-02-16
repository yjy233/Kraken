# Kraken VSCode Extension

AI-powered coding assistant with ReAct reasoning, integrated into VSCode.

## Features

- **Chat Interface**: Interactive chat panel in VSCode sidebar
- **ReAct Reasoning**: See the agent's thinking process in real-time
- **Tool Execution**: View tool calls and results as they happen
- **Skills Support**: Automatically discovers and uses skills in workspace/.skills
- **Session Management**: Clear session history and start fresh

## Commands

- `Kraken: Open Chat` - Open the Kraken chat panel
- `Kraken: Clear Session` - Clear the current conversation history
- `Kraken: Show Available Skills` - Display all available skills in the workspace

## Configuration

Open VSCode settings and search for "Kraken":

- `kraken.model` - OpenAI model to use (default: gpt-4o-mini)
- `kraken.maxIterations` - Maximum ReAct iterations (default: 6)
- `kraken.temperature` - Model temperature (default: 0.2)

## Environment Variables

Set these in your environment or `.env` file:

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `OPENAI_BASE_URL` - Custom API endpoint (optional)

## Usage

1. Click the Kraken icon in the sidebar
2. Type your question or request in the chat input
3. Watch the agent think, use tools, and provide an answer
4. Press Ctrl+Enter (Cmd+Enter on Mac) to send messages

## Skills

Place skills in `workspace/.skills/` directory:

```
.skills/
├── my-skill/
│   ├── readme.md  (with YAML frontmatter)
│   └── ... (other files)
```

The agent will automatically discover and load skills at startup.

## Development

Build the extension:

```bash
npm run build:vscode
```

Package the extension:

```bash
npm run package:vscode
```

Install the .vsix file in VSCode.
