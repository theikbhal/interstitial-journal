#!/usr/bin/env node
// MCP server for interstitial journal
// Implements Model Context Protocol for journal tools
// Communicates over stdio using JSON-RPC 2.0
//
// Tools exposed:
//   create_entry     - add a journal entry
//   get_entries      - list today's entries
//   create_sticky    - add a sticky note
//   get_stickies     - list all stickies
//   create_dump      - add brain dump item
//   get_dumps        - list all dump items
//   create_block     - add a time block
//   get_blocks       - list blocks by date
//   get_pomo         - get current pomodoro state
//   create_pomo_note - add a pomodoro note

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const SERVER_NAME = 'interstitial-journal';
const SERVER_VERSION = '1.0.0';

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { entries: [], stickies: [], dumps: [], blocks: [], pomo: null };
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ===== MCP Protocol =====

function sendMessage(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function sendError(id, code, message) {
  sendMessage({ jsonrpc: '2.0', id, error: { code, message } });
}

function sendResult(id, result) {
  sendMessage({ jsonrpc: '2.0', id, result });
}

// ===== Tool Handlers =====

const tools = {
  create_entry: {
    description: 'Add a journal entry (one idea/activity)',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'What you are doing right now' },
      },
      required: ['text'],
    },
    handler: (args) => {
      const data = readData();
      const entry = { id: uid(), text: args.text, timestamp: Date.now() };
      data.entries.push(entry);
      writeData(data);
      return entry;
    },
  },

  get_entries: {
    description: 'Get journal entries, optionally filtered to today',
    inputSchema: {
      type: 'object',
      properties: {
        today: { type: 'boolean', description: 'Only return today\'s entries' },
      },
    },
    handler: (args) => {
      const data = readData();
      let entries = data.entries || [];
      if (args.today) {
        const today = new Date();
        entries = entries.filter(e => {
          const d = new Date(e.timestamp);
          return d.getDate() === today.getDate() &&
                 d.getMonth() === today.getMonth() &&
                 d.getFullYear() === today.getFullYear();
        });
      }
      return entries.sort((a, b) => b.timestamp - a.timestamp);
    },
  },

  create_sticky: {
    description: 'Add a sticky note with color',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Note content' },
        color: {
          type: 'string',
          description: 'Color hex (default: #FFEAA7)',
          enum: ['#FFEAA7', '#FFB8B8', '#B8E8B8', '#B8D4FF', '#E8B8FF', '#FFD4B8', '#B8FFF0', '#F0F0F0'],
        },
      },
    },
    handler: (args) => {
      const data = readData();
      const maxZ = (data.stickies || []).length + 10;
      const sticky = {
        id: uid(),
        text: args.text,
        color: args.color || '#FFEAA7',
        x: 20 + Math.floor(Math.random() * 100),
        y: 20 + Math.floor(Math.random() * 100),
        z: maxZ,
        timestamp: Date.now(),
      };
      data.stickies.push(sticky);
      writeData(data);
      return sticky;
    },
  },

  get_stickies: {
    description: 'Get all sticky notes',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      return (readData().stickies || []).sort((a, b) => a.timestamp - b.timestamp);
    },
  },

  create_dump: {
    description: 'Add a brain dump item (one uncensored thought)',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Thought content' },
      },
      required: ['text'],
    },
    handler: (args) => {
      const data = readData();
      const dump = { id: uid(), text: args.text, timestamp: Date.now() };
      data.dumps.push(dump);
      writeData(data);
      return dump;
    },
  },

  get_dumps: {
    description: 'Get all brain dump items',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      return (readData().dumps || []).sort((a, b) => b.timestamp - a.timestamp);
    },
  },

  create_block: {
    description: 'Add a time block for scheduling',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What you are doing' },
        date: { type: 'string', description: 'Date YYYY-MM-DD' },
        start: { type: 'string', description: 'Start time HH:MM' },
        end: { type: 'string', description: 'End time HH:MM' },
        color: { type: 'string', description: 'Block color hex' },
      },
      required: ['title', 'start', 'end'],
    },
    handler: (args) => {
      const data = readData();
      const today = new Date();
      const date = args.date || `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2,'0')}-${today.getDate().toString().padStart(2,'0')}`;
      const block = {
        id: uid(),
        title: args.title,
        date,
        start: args.start,
        end: args.end,
        color: args.color || '#4a90d9',
      };
      data.blocks.push(block);
      writeData(data);
      return block;
    },
  },

  get_blocks: {
    description: 'Get time blocks, optionally filtered by date',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date YYYY-MM-DD (default: today)' },
      },
    },
    handler: (args) => {
      const data = readData();
      let blocks = data.blocks || [];
      if (args.date) {
        blocks = blocks.filter(b => b.date === args.date);
      }
      return blocks.sort((a, b) => a.start.localeCompare(b.start));
    },
  },

  get_pomo: {
    description: 'Get current pomodoro timer state',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const data = readData();
      if (!data.pomo) return { phase: 'work', sessionCount: 0, running: false };
      const WORK_MS = 25 * 60 * 1000;
      const BREAK_MS = 5 * 60 * 1000;
      const elapsed = Date.now() - data.pomo.startedAt;
      const duration = data.pomo.phase === 'work' ? WORK_MS : BREAK_MS;
      const remaining = Math.max(0, duration - elapsed);
      return {
        phase: data.pomo.phase,
        sessionCount: data.pomo.sessionCount,
        running: true,
        remainingMs: remaining,
        elapsedMs: elapsed,
        totalMs: duration,
      };
    },
  },

  reset_pomo: {
    description: 'Reset the pomodoro timer to start fresh',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const data = readData();
      data.pomo = { phase: 'work', startedAt: Date.now(), sessionCount: 0, notes: [] };
      writeData(data);
      return { ok: true, phase: 'work', sessionCount: 0 };
    },
  },

  create_pomo_note: {
    description: 'Add a note to the current pomodoro session',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Note content' },
      },
      required: ['text'],
    },
    handler: (args) => {
      const data = readData();
      if (!data.pomo) {
        data.pomo = { phase: 'work', startedAt: Date.now(), sessionCount: 0, notes: [] };
      }
      const note = {
        id: uid(),
        text: args.text,
        phase: data.pomo.phase,
        session: data.pomo.sessionCount,
        timestamp: Date.now(),
      };
      data.pomo.notes.push(note);
      writeData(data);
      return note;
    },
  },
};

// ===== JSON-RPC Handler =====

function handleRequest(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return sendResult(id, {
      protocolVersion: '0.1.0',
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    });
  }

  if (method === 'tools/list') {
    const toolList = Object.entries(tools).map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    return sendResult(id, { tools: toolList });
  }

  if (method === 'tools/call') {
    const tool = tools[params.name];
    if (!tool) {
      return sendError(id, -32601, `Tool not found: ${params.name}`);
    }
    try {
      const result = tool.handler(params.arguments || {});
      return sendResult(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (e) {
      return sendError(id, -32603, `Tool error: ${e.message}`);
    }
  }

  if (method === 'notifications/initialized') {
    return; // no response needed
  }

  // Unknown method
  sendError(id, -32601, `Method not found: ${method}`);
}

// ===== Main Loop =====

process.stdin.setEncoding('utf-8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const msg = JSON.parse(trimmed);
      handleRequest(msg);
    } catch (e) {
      // ignore malformed messages
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Send startup message
sendMessage({
  jsonrpc: '2.0',
  method: 'log',
  params: { message: `${SERVER_NAME} v${SERVER_VERSION} MCP server ready` },
});
