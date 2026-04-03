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

## Installation

```bash
npm install -g astrochat-mcp
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "astrochat": {
      "command": "astrochat-mcp",
      "env": {
        "ASTROCHAT_API_URL": "https://astrochat-api.onrender.com",
        "ASTROCHAT_API_TOKEN": "your_jwt_token_here"
      }
    }
  }
}
```

Get your JWT token by running the `login` tool once or by calling:
```bash
curl -X POST https://astrochat-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@email.com","password":"yourpassword"}'
```

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

## Links

- **Live API**: https://astrochat-api.onrender.com
- **Web portal**: https://astrochat-web.vercel.app
- **GitHub**: https://github.com/kalai296/astrochat

## License

MIT
