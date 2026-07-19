// Local API server for interstitial journal
// Usage: node api-server.js
// Listens on http://localhost:3456
// Provides REST API for all journal data

const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = 3456;

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading data file:', e.message);
  }
  return { entries: [], stickies: [], dumps: [], blocks: [], pomo: null };
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function sendError(res, status, msg) {
  sendJSON(res, status, { error: msg });
}

function getPath(req) {
  return req.url.split('?')[0].replace(/\/+$/, '') || '/';
}

const routes = {
  'GET': {},
  'POST': {},
  'PUT': {},
  'DELETE': {},
};

function route(method, pattern, handler) {
  routes[method][pattern] = handler;
}

// ===== ROUTES =====

// GET / - health check
route('GET', '/', (req, res) => {
  sendJSON(res, 200, { status: 'ok', app: 'interstitial-journal', version: '1.0.0' });
});

// GET /api/data - get all data
route('GET', '/api/data', (req, res) => {
  const data = readData();
  sendJSON(res, 200, data);
});

// POST /api/data - set all data
route('POST', '/api/data', async (req, res) => {
  try {
    const body = await parseBody(req);
    writeData(body);
    sendJSON(res, 200, { ok: true });
  } catch (e) {
    sendError(res, 400, e.message);
  }
});

// GET /api/data/:type - get specific data type
route('GET', '/api/data/entries', (req, res) => {
  const data = readData();
  sendJSON(res, 200, data.entries || []);
});

route('GET', '/api/data/stickies', (req, res) => {
  const data = readData();
  sendJSON(res, 200, data.stickies || []);
});

route('GET', '/api/data/dumps', (req, res) => {
  const data = readData();
  sendJSON(res, 200, data.dumps || []);
});

route('GET', '/api/data/blocks', (req, res) => {
  const data = readData();
  sendJSON(res, 200, data.blocks || []);
});

route('GET', '/api/data/pomo', (req, res) => {
  const data = readData();
  sendJSON(res, 200, data.pomo || null);
});

// POST /api/data/:type - add item to specific type
route('POST', '/api/data/entries', async (req, res) => {
  try {
    const body = await parseBody(req);
    const data = readData();
    data.entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: body.text,
      timestamp: Date.now(),
    });
    writeData(data);
    sendJSON(res, 201, data.entries[data.entries.length - 1]);
  } catch (e) { sendError(res, 400, e.message); }
});

route('POST', '/api/data/stickies', async (req, res) => {
  try {
    const body = await parseBody(req);
    const data = readData();
    const sticky = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: body.text || 'new thought...',
      color: body.color || '#FFEAA7',
      x: body.x || 20,
      y: body.y || 20,
      z: (data.stickies?.length || 0) + 10,
      timestamp: Date.now(),
    };
    data.stickies.push(sticky);
    writeData(data);
    sendJSON(res, 201, sticky);
  } catch (e) { sendError(res, 400, e.message); }
});

route('POST', '/api/data/dumps', async (req, res) => {
  try {
    const body = await parseBody(req);
    const data = readData();
    const dump = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: body.text,
      timestamp: Date.now(),
    };
    data.dumps.push(dump);
    writeData(data);
    sendJSON(res, 201, dump);
  } catch (e) { sendError(res, 400, e.message); }
});

route('POST', '/api/data/blocks', async (req, res) => {
  try {
    const body = await parseBody(req);
    const data = readData();
    const block = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: body.title,
      date: body.date,
      start: body.start,
      end: body.end,
      color: body.color || '#4a90d9',
    };
    data.blocks.push(block);
    writeData(data);
    sendJSON(res, 201, block);
  } catch (e) { sendError(res, 400, e.message); }
});

// DELETE /api/data/:type/:id - delete item
route('DELETE', '/api/data/entries/:id', (req, res, params) => {
  const data = readData();
  data.entries = data.entries.filter(e => e.id !== params.id);
  writeData(data);
  sendJSON(res, 200, { ok: true });
});

route('DELETE', '/api/data/stickies/:id', (req, res, params) => {
  const data = readData();
  data.stickies = data.stickies.filter(s => s.id !== params.id);
  writeData(data);
  sendJSON(res, 200, { ok: true });
});

route('DELETE', '/api/data/dumps/:id', (req, res, params) => {
  const data = readData();
  data.dumps = data.dumps.filter(d => d.id !== params.id);
  writeData(data);
  sendJSON(res, 200, { ok: true });
});

route('DELETE', '/api/data/blocks/:id', (req, res, params) => {
  const data = readData();
  data.blocks = data.blocks.filter(b => b.id !== params.id);
  writeData(data);
  sendJSON(res, 200, { ok: true });
});

// ===== SERVER =====
const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const methodRoutes = routes[req.method];
  if (!methodRoutes) {
    return sendError(res, 405, 'Method not allowed');
  }

  const urlPath = getPath(req);

  // Match routes from most specific to least
  const sortedPatterns = Object.keys(methodRoutes).sort((a, b) => b.length - a.length);

  for (const pattern of sortedPatterns) {
    const regexPattern = pattern
      .replace(/:(\w+)/g, '(?<$1>[^/]+)')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    const match = urlPath.match(regex);
    if (match) {
      const params = match.groups || {};
      return methodRoutes[pattern](req, res, params);
    }
  }

  sendError(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log(`\n  interstitial journal API server running`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  endpoints:`);
  console.log(`    GET    /                health check`);
  console.log(`    GET    /api/data        all data`);
  console.log(`    POST   /api/data        set all data`);
  console.log(`    GET    /api/data/:type  entries|stickies|dumps|blocks|pomo`);
  console.log(`    POST   /api/data/:type  add item`);
  console.log(`    DELETE /api/data/:type/:id  delete item\n`);
});
