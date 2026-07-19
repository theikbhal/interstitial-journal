# Interstitial Journal

ADHD-friendly interstitial journaling app — mobile-first, local storage, one idea per note.

## Architecture

```
interstitial-journal/
  index.html       — complete single-page app (no build step)
  api-server.js    — local REST API (port 3456)
  mcp-server.js    — MCP server for AI tool integration
  data.json        — auto-created by API/MCP servers
```

Open `index.html` directly in a browser. All data saves to `localStorage`.

## Features

| Tab   | Feature        | Description                                      |
|-------|----------------|--------------------------------------------------|
| 1     | Journal        | Log what you're doing, one entry at a time       |
| 2     | Sticky Notes   | Draggable, color-coded notes on a canvas         |
| 3     | Brain Dump     | Rapid-fire thought capture, one per line         |
| 4     | Timeblocks     | Schedule your day/week with a timeline           |
| 5     | Pomodoro       | Auto-continuing 25/5 timer with session notes    |

## Keyboard Shortcuts

- `1`–`5` — switch tabs
- `h` — toggle help overlay
- `Enter` — submit current input (journal, dump, pomo notes)

## Local API Server

Start the REST API to persist data to `data.json` instead of localStorage:

```bash
node api-server.js
```

### Endpoints

| Method   | Path               | Description         |
|----------|--------------------|---------------------|
| `GET`    | `/api/data`        | all data            |
| `POST`   | `/api/data`        | set all data        |
| `GET`    | `/api/data/entries`| journal entries     |
| `POST`   | `/api/data/entries`| add entry           |
| `DELETE` | `/api/data/entries/:id` | delete entry    |
| `POST`   | `/api/data/stickies`| add sticky note     |
| `DELETE` | `/api/data/stickies/:id` | delete sticky  |
| `POST`   | `/api/data/dumps`  | add dump item       |
| `DELETE` | `/api/data/dumps/:id` | delete dump item |
| `POST`   | `/api/data/blocks` | add time block      |
| `DELETE` | `/api/data/blocks/:id` | delete block    |

## MCP Server

For AI tool integration (used by opencode and other MCP clients):

```bash
node mcp-server.js
```

### Tools

| Tool               | Description                        |
|--------------------|------------------------------------|
| `create_entry`     | Add a journal entry                |
| `get_entries`      | List entries (filter: `today`)     |
| `create_sticky`    | Add a sticky note                  |
| `get_stickies`     | List all stickies                  |
| `create_dump`      | Add brain dump item                |
| `get_dumps`        | List all dump items                |
| `create_block`     | Add a time block                   |
| `get_blocks`       | List blocks (filter: `date`)       |
| `get_pomo`        | Get current pomodoro state         |
| `reset_pomo`       | Reset the pomodoro timer           |
| `create_pomo_note` | Add note to current pomo session   |

## Data Model

```json
{
  "entries": [{ "id", "text", "timestamp" }],
  "stickies": [{ "id", "text", "color", "x", "y", "z", "timestamp" }],
  "dumps": [{ "id", "text", "timestamp" }],
  "blocks": [{ "id", "title", "date", "start", "end", "color" }],
  "pomo": { "phase", "startedAt", "sessionCount", "notes" }
}
```

## Development

No build tools needed. Edit `index.html` and reload the browser.

To switch from localStorage to the API server, replace `saveState`/`loadState` calls with `fetch` to `http://localhost:3456/api/data`.
