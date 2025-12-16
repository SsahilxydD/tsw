# Hostinger MCP Server Integration

This document explains how to integrate the Hostinger MCP server with Cursor IDE.

## Configuration

The MCP server configuration has been created in `cursor-mcp-config.json`.

## Setup Instructions

### Option 1: Cursor Workspace Settings (Recommended)

1. Open Cursor IDE
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the command palette
3. Type "Preferences: Open User Settings (JSON)" or "Preferences: Open Workspace Settings (JSON)"
4. Add the following configuration to your settings:

```json
{
  "mcpServers": {
    "hostinger-mcp": {
      "command": "npx",
      "args": [
        "hostinger-api-mcp@latest"
      ],
      "env": {
        "API_TOKEN": "X1VxK5LdOVvEZkinNJqYXX112dOdadTruAai1gx2cd6fb64e"
      }
    }
  }
}
```

### Option 2: Global Cursor Settings

For Windows:
- Navigate to: `%APPDATA%\Cursor\User\settings.json`
- Add the MCP configuration above

For macOS:
- Navigate to: `~/Library/Application Support/Cursor/User/settings.json`
- Add the MCP configuration above

For Linux:
- Navigate to: `~/.config/Cursor/User/settings.json`
- Add the MCP configuration above

### Option 3: Project-Specific Configuration

If Cursor supports project-specific MCP configuration, you can:
1. Create a `.cursor` directory in your project root
2. Copy the contents of `cursor-mcp-config.json` into `.cursor/mcp.json`
3. Restart Cursor IDE

## Verification

After adding the configuration:

1. Restart Cursor IDE completely
2. Check if the Hostinger MCP server appears in Cursor's MCP server list
3. You should be able to use Hostinger API functions through Cursor's AI assistant

## Security Note

⚠️ **Important**: The API token is stored in this configuration file. Make sure to:
- Add `cursor-mcp-config.json` to `.gitignore` if it contains sensitive information
- Never commit API tokens to version control
- Consider using environment variables for production use

## Troubleshooting

If the MCP server doesn't work:

1. Ensure `npx` is available in your PATH
2. Check that Node.js is installed and up to date
3. Verify the API token is correct
4. Check Cursor's developer console for any error messages
5. Try running the MCP server manually: `npx hostinger-api-mcp@latest`

## API Token

Your Hostinger API token: `X1VxK5LdOVvEZkinNJqYXX112dOdadTruAai1gx2cd6fb64e`

Keep this token secure and do not share it publicly.

