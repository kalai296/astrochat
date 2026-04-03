# astrochat-mcp

MCP (Model Context Protocol) server for **AstroChat** — the AI-powered astrology chat platform.

Use this server to let Claude (or any MCP-compatible AI) interact directly with your AstroChat backend: query users, manage sessions, read chat history, send messages and get live stats.

## Tools

| Tool | Description |
|------|-------------|
| `health_check` | Check if the AstroChat API is online |
| `get_stats` | Dashboard stats — users, sessions, messages by type/status |
| `get_users` | List all registered users |
| `get_astrologer` | Get the astrologer profile |
| `get_sessions` | List sessions, optionally filtered by status |
| `get_messages` | Get full chat history for a session |
| `create_user` | Register a new user or astrologer |
| `login` | Login and get a JWT token |
| `create_session` | Create a new chat/voice/video session |
| `update_session_status` | Accept (active) or end a session |
| `send_message` | Send a message into a session |

## Usage with Claude Desktop

No installation needed. Add this to your `claude_desktop_config.json` and Claude will automatically download the latest version each time:

```json
{
  "mcpServers": {
    "astrochat": {
      "command": "npx",
      "args": [
        "-y",
        "astrochat-mcp@latest"
      ],
      "env": {
        "ASTROCHAT_API_URL": "https://astrochat-api.onrender.com",
        "ASTROCHAT_API_TOKEN": "your_jwt_token_here"
      }
    }
  }
}
```

> **Tip:** Using `@latest` ensures you always get the newest version of the MCP server automatically whenever Claude Desktop restarts — no manual updates needed.

### Get your JWT token

Run this once to get your token:

```bash
curl -X POST https://astrochat-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@email.com","password":"yourpassword"}'
```

Copy the `token` value from the response and paste it as `ASTROCHAT_API_TOKEN`.

## Claude Desktop config file location

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

After editing the config, **restart Claude Desktop** to apply the changes.

## Alternative: Global install

If you prefer a one-time global install instead of `npx`:

```bash
npm install -g astrochat-mcp
```

Then use `"command": "astrochat-mcp"` (without `npx`) in your config. Note you will need to run `npm update -g astrochat-mcp` manually to get new versions.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASTROCHAT_API_URL` | No | Defaults to `https://astrochat-api.onrender.com` |
| `ASTROCHAT_API_TOKEN` | No* | JWT token for authenticated tools |

*Required for `get_sessions`, `get_messages`, `create_session`, `update_session_status`, `send_message`.

## Example prompts once connected

- *"Show me all pending sessions in AstroChat"*
- *"Get the chat history for session 69ce4b38..."*
- *"How many users have registered today?"*
- *"Accept the pending session from Kalai"*
- *"Register a new user named Priya from Mumbai born on 15 Aug 1992"*
- *"Send a message to session 69ce4b38 saying Jupiter is favourable this month"*
- *"Get AstroChat stats — total users, sessions and messages"*

## Links

- **npm package**: https://www.npmjs.com/package/astrochat-mcp
- **Live API**: https://astrochat-api.onrender.com
- **Web portal**: https://astrochat-web.vercel.app
- **GitHub**: https://github.com/kalai296/astrochat

## License

MIT
