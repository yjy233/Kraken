# VSCode Extension Build Notes

## Fixed Issues

### 1. @types/vscode Version Mismatch
**Problem:** @types/vscode ^1.109.0 was greater than engines.vscode ^1.80.0

**Solution:**
```bash
npm uninstall @types/vscode
npm install @types/vscode@1.80.0 --save-dev --save-exact
```

### 2. vsce Package Repository Error
**Problem:** vsce couldn't detect repository URL

**Solution:** Added repository field to package.json:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/kraken-ai/kraken"
}
```

## Build Commands

### Development
```bash
npm run build:vscode
```

### Package Extension
```bash
npm run package:vscode
```

This creates `kraken.vsix` (726KB, 203 files)

## Installation

```bash
code --install-extension kraken.vsix
```

Or in VSCode:
- Extensions → "..." menu → "Install from VSIX..."
- Select kraken.vsix

## Requirements

Before using:
1. Set `OPENAI_API_KEY` environment variable
2. Launch VSCode from terminal or add key to shell profile
3. Click Kraken icon in sidebar

## Notes

- Warning about missing LICENSE file is non-critical
- Extension uses --no-dependencies flag (includes dependencies in bundle)
- Total size: 726.77KB with 203 files
