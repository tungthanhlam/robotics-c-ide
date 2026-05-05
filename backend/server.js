/**
 * server.js – Express.js backend for Robotics C IDE
 *
 * Endpoints:
 *   GET  /api/health            – Health check
 *   GET  /api/blocks            – Return block definitions
 *   GET  /api/projects          – List all projects
 *   POST /api/projects          – Create a new project
 *   GET  /api/projects/:id      – Get a project by id
 *   PUT  /api/projects/:id      – Update a project
 *   DELETE /api/projects/:id    – Delete a project
 *   POST /api/compile           – Compile C code (requires gcc)
 *
 * Also serves the frontend statically at / when run standalone.
 */

'use strict';

const express  = require('express');
const cors     = require('cors');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');
const os       = require('os');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── RATE LIMITING (simple in-memory) ─────────────────────── */
const rateLimitMap = new Map();

/**
 * Simple rate-limiter middleware factory.
 * @param {number} maxRequests – max calls per window
 * @param {number} windowMs    – rolling window in ms
 */
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, reset: now + windowMs };

    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + windowMs;
    }
    entry.count += 1;
    rateLimitMap.set(key, entry);

    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
    next();
  };
}

// Periodically purge stale rate-limit entries to avoid memory growth
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((v, k) => { if (now > v.reset) rateLimitMap.delete(k); });
}, 60_000);

/* ── MIDDLEWARE ────────────────────────────────────────────── */
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve frontend from /frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ── IN-MEMORY PROJECT STORE ────────────────────────────────── */
// In production, swap with a real database.
let projects = [];

// ── Persist projects to a JSON file ──────────────────────────
const DATA_DIR  = path.join(__dirname, 'data');
const PROJ_FILE = path.join(DATA_DIR, 'projects.json');

function loadProjectsFromDisk() {
  try {
    if (fs.existsSync(PROJ_FILE)) {
      const raw = fs.readFileSync(PROJ_FILE, 'utf8');
      projects = JSON.parse(raw);
      console.log(`Loaded ${projects.length} project(s) from disk.`);
    }
  } catch (err) {
    console.warn('Could not load projects:', err.message);
  }
}

function saveProjectsToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PROJ_FILE, JSON.stringify(projects, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not save projects:', err.message);
  }
}

loadProjectsFromDisk();

/* ── BLOCK DEFINITIONS ─────────────────────────────────────── */
const BLOCKS_FILE = path.join(DATA_DIR, 'blocks.json');

function getBlocks() {
  try {
    if (fs.existsSync(BLOCKS_FILE)) {
      return JSON.parse(fs.readFileSync(BLOCKS_FILE, 'utf8'));
    }
  } catch { /* fall through */ }
  return null; // Frontend will use built-ins
}

/* ══════════════════════════════════════════════════════════════
   ROUTES
══════════════════════════════════════════════════════════════ */

/* ── Health check ──────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

/* ── Blocks ────────────────────────────────────────────────── */
app.get('/api/blocks', (_req, res) => {
  const blocks = getBlocks();
  if (blocks) {
    return res.json(blocks);
  }
  // Tell the frontend to use its built-in definitions
  res.status(204).end();
});

/* ── Projects ──────────────────────────────────────────────── */
app.get('/api/projects', (_req, res) => {
  res.json(projects);
});

// Rate-limited writes: max 30 project saves per minute per IP
app.post('/api/projects', rateLimit(30, 60_000), (req, res) => {
  const { name, description, blocks } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const project = {
    id:          uuidv4(),
    name:        String(name).slice(0, 100),
    description: String(description || '').slice(0, 500),
    blocks:      Array.isArray(blocks) ? blocks : [],
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };
  projects.push(project);
  saveProjectsToDisk();
  res.status(201).json(project);
});

app.get('/api/projects/:id', (req, res) => {
  const p = projects.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json(p);
});

app.put('/api/projects/:id', (req, res) => {
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Project not found' });

  const { name, description, blocks } = req.body || {};
  projects[idx] = {
    ...projects[idx],
    name:        name != null ? String(name).slice(0, 100) : projects[idx].name,
    description: description != null ? String(description).slice(0, 500) : projects[idx].description,
    blocks:      Array.isArray(blocks) ? blocks : projects[idx].blocks,
    updatedAt:   new Date().toISOString(),
  };
  saveProjectsToDisk();
  res.json(projects[idx]);
});

app.delete('/api/projects/:id', (req, res) => {
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Project not found' });
  projects.splice(idx, 1);
  saveProjectsToDisk();
  res.json({ success: true });
});

/* ── Compile ───────────────────────────────────────────────── */
// Rate-limited: max 10 compile requests per minute per IP
app.post('/api/compile', rateLimit(10, 60_000), (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'No code provided' });

  // Use a cryptographically random filename to avoid race conditions
  const randomId = crypto.randomUUID();
  const tmpDir   = os.tmpdir();
  const srcFile  = path.join(tmpDir, `prog_${randomId}.c`);
  const outFile  = path.join(tmpDir, `prog_${randomId}.out`);

  try {
    fs.writeFileSync(srcFile, code, 'utf8');
  } catch (err) {
    return res.status(500).json({ success: false, output: 'Failed to write temp file: ' + err.message });
  }

  execFile('gcc', [srcFile, '-o', outFile, '-Wall', '-lm'], { timeout: 15_000 }, (err, stdout, stderr) => {
    // Clean up temp files
    try { fs.unlinkSync(srcFile); } catch { /* ignore */ }
    try { fs.unlinkSync(outFile); } catch { /* ignore */ }

    if (err) {
      return res.json({
        success: false,
        output:  (stderr || err.message || 'Compilation failed'),
      });
    }
    res.json({
      success: true,
      output:  stdout || 'Compilation successful! No warnings.',
    });
  });
});

/* ── SPA fallback (serve index.html for non-API routes) ──── */
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  res.status(404).json({ error: 'Not found' });
});

/* ── ERROR HANDLER ─────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

/* ── START ─────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 Robotics C IDE server running at http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}/`);
  console.log(`   API:      http://localhost:${PORT}/api/health\n`);
});
