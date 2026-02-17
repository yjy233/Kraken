# Kraken VSCode Extension - Quick Start

## Installation

1. **Build the extension:**
   ```bash
   npm run build:vscode
   ```

2. **Package the extension:**
   ```bash
   npm run package:vscode
   ```
   This creates `kraken.vsix` file.

3. **Install in VSCode:**
   ```bash
   code --install-extension kraken.vsix
   ```

   Or in VSCode:
   - Open Extensions panel (Ctrl+Shift+X)
   - Click "..." menu → "Install from VSIX..."
   - Select the `kraken.vsix` file

## Setup

1. **Set your OpenAI API key:**
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   ```

2. **Launch VSCode:**
   ```bash
   code /path/to/your/project
   ```

3. **Open Kraken chat:**
   - Click the Kraken icon (🐙) in the sidebar
   - Or use Command Palette: `Kraken: Open Chat`

## Usage

### Basic Chat

1. Type your question in the input box
2. Press `Ctrl+Enter` (or `Cmd+Enter` on Mac) or click "Send"
3. Watch the agent think, use tools, and respond

### Example Queries

```
"Read the README.md file"
"Find all TypeScript files in src/"
"Search for 'TODO' comments in the codebase"
"Write a hello world function in utils/hello.ts"
"Run npm test and show me the results"
```

### Commands

**From Command Palette (Ctrl+Shift+P):**

- `Kraken: Open Chat` - Open the chat panel
- `Kraken: Clear Session` - Clear conversation history
- `Kraken: Show Available Skills` - List workspace skills

### Configuration

**VSCode Settings (File → Preferences → Settings):**

Search for "Kraken":

- **Model**: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, etc.
- **Max Iterations**: How many ReAct steps (default: 6)
- **Temperature**: 0.0 (deterministic) to 1.0 (creative)

### Skills

Add custom skills to extend capabilities:

```
your-project/
└── .skills/
    └── my-skill/
        ├── readme.md  (with YAML frontmatter)
        └── ... (other files)
```

The agent will automatically discover and use them!

## Tips

1. **Be specific**: Instead of "fix the bug", say "fix the bug in src/auth.ts:42"
2. **Use commands**: The agent can run bash commands, read files, edit code
3. **Iterative**: Start with simple tasks, then build on the results
4. **Clear session**: Use "Clear Session" button to start fresh

## Troubleshooting

### Extension doesn't activate
- Check: `OPENAI_API_KEY` is set
- Check: VSCode output panel for errors

### Agent can't access files
- The agent is sandboxed to your workspace directory
- Make sure your workspace is opened in VSCode

### Tools not working
- Check VSCode output panel for error messages
- Verify file paths are relative to workspace root

## Uninstall

```bash
code --uninstall-extension kraken.kraken-vscode
```

Or in VSCode Extensions panel, find Kraken and click "Uninstall".

---

Enjoy using Kraken in VSCode! 🐙✨
