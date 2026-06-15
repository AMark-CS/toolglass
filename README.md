<p align="center">
  <h1 align="center">toolglass</h1>
  <p align="center"><em>Looking glass for your AI tools.</em></p>
</p>

<p align="center">
  <a href="https://pypi.org/project/toolglass/"><img src="https://img.shields.io/badge/python-3.10+-blue?logo=python" alt="Python"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-black" alt="License"></a>
</p>

---

## What is toolglass?

toolglass is the **`strace` for AI agents**. It sits between your agent and
MCP servers, recording every tool call so you can see exactly what happened,
how long it took, and where your token budget is going.

No code changes. Just point your MCP clients at toolglass.

```bash
pip install toolglass
toolglass proxy --port 4317
# Open http://localhost:8080
```

## Quick Start

### 1. Install

```bash
pip install toolglass
# or: uv tool install toolglass
```

### 2. Start the proxy

```bash
toolglass proxy --port 4317

╭─────────────────────────────────────────────────────╮
│              toolglass                              │
│      "Looking glass for your AI tools"              │
├─────────────────────────────────────────────────────┤
│  Proxy:     http://localhost:4317                   │
│  Dashboard: http://localhost:8080                   │
│  Database:  ~/.toolglass/traces.db                  │
│                                                     │
│  Ready. Point your MCP clients to localhost:4317    │
╰─────────────────────────────────────────────────────╯
```

### 3. Point your MCP clients here

```json
{
  "mcpServers": {
    "github": {
      "url": "http://localhost:4317/github?backend=https://api.github.com/mcp"
    }
  }
}
```

### 4. Open the dashboard

Visit `http://localhost:8080` and see every MCP tool call in real time.

## Features

- **Waterfall traces** — See every MCP tool call with timing and context
- **MCP-native** — Understands `tools/call`, `tools/list`, `prompts/get`, and more
- **Zero config** — One command, SQLite on disk, no Docker, no cloud
- **Cost visibility** — Know which tool is generating the most data
- **Local-first** — All data stays on your machine in `~/.toolglass/traces.db`

## Why toolglass?

| | Langfuse | Phoenix | MCP Inspector | toolglass |
|---|---|---|---|---|
| LLM traces | ✅ | ✅ | ❌ | ✅ |
| MCP-native spans | ❌ | ❌ | ✅ (manual) | ✅ (auto) |
| Protocol-aware | ❌ | ❌ | ✅ | ✅ |
| Zero-code proxy | ❌ | ❌ | ❌ | ✅ |
| Local-first, SQLite | ❌ | ❌ | ❌ | ✅ |
| Persistent trace history | ✅ | ✅ | ❌ | ✅ |

## Commands

```bash
# Start proxy + dashboard
toolglass proxy --port 4317

# Standalone dashboard (connect to remote DB)
toolglass dashboard --port 8080

# Analyze a specific trace
toolglass analyze <trace-id>

# Disable dashboard (proxy only)
toolglass proxy --no-dashboard
```

## Architecture

```
Agent ──▶ toolglass Proxy ──▶ MCP Server
              │
              ├── Intercepts JSON-RPC
              ├── Extracts tool name, args, latency
              ├── Writes to SQLite
              └── Serves Dashboard API
```

## Development

```bash
git clone git@github.com:AMark-CS/toolglass.git
cd toolglass
pip install -e ".[dev]"
pytest
```

## License

MIT
