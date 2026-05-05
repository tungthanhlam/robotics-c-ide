/**
 * api-client.js – Communication with the backend REST API.
 * Falls back gracefully when the backend is unavailable.
 */

'use strict';

const ApiClient = (() => {

  const BASE_URL = (() => {
    // Auto-detect backend: same origin port 3000, or same origin
    const { protocol, hostname } = window.location;
    // If served from backend directly (port 3000), use same origin
    if (window.location.port === '3000') return '';
    return `${protocol}//${hostname}:3000`;
  })();

  let _backendAvailable = false;

  /**
   * Internal fetch wrapper with timeout and error handling.
   */
  async function _fetch(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timer);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Check if the backend server is reachable.
   */
  async function checkConnection() {
    try {
      await _fetch('/api/health');
      _backendAvailable = true;
    } catch {
      _backendAvailable = false;
    }
    return _backendAvailable;
  }

  function isAvailable() { return _backendAvailable; }

  /* ── BLOCK DEFINITIONS ────────────────────────────────── */

  /**
   * Fetch all block definitions from backend.
   * Returns built-in blocks if backend unreachable.
   */
  async function getBlocks() {
    if (_backendAvailable) {
      try {
        return await _fetch('/api/blocks');
      } catch { /* fallthrough */ }
    }
    // Return built-in block definitions (offline mode)
    return BlockSystem.getBuiltinBlocks();
  }

  /* ── PROJECTS ─────────────────────────────────────────── */

  async function listProjects() {
    if (_backendAvailable) {
      try { return await _fetch('/api/projects'); } catch { /* fallthrough */ }
    }
    return Utils.localGet('projects', []);
  }

  async function getProject(id) {
    if (_backendAvailable) {
      try { return await _fetch(`/api/projects/${id}`); } catch { /* fallthrough */ }
    }
    const projects = Utils.localGet('projects', []);
    return projects.find(p => p.id === id) || null;
  }

  async function saveProject(projectData) {
    if (_backendAvailable) {
      try {
        const method = projectData.id ? 'PUT' : 'POST';
        const path   = projectData.id
          ? `/api/projects/${projectData.id}`
          : '/api/projects';
        return await _fetch(path, { method, body: JSON.stringify(projectData) });
      } catch { /* fallthrough to local */ }
    }
    // Local storage fallback
    const projects = Utils.localGet('projects', []);
    if (!projectData.id) projectData.id = Utils.uid('proj');
    projectData.updatedAt = new Date().toISOString();
    const idx = projects.findIndex(p => p.id === projectData.id);
    if (idx >= 0) projects[idx] = projectData;
    else projects.push(projectData);
    Utils.localSet('projects', projects);
    return projectData;
  }

  async function deleteProject(id) {
    if (_backendAvailable) {
      try { return await _fetch(`/api/projects/${id}`, { method: 'DELETE' }); } catch { /* fallthrough */ }
    }
    const projects = Utils.localGet('projects', []).filter(p => p.id !== id);
    Utils.localSet('projects', projects);
    return { success: true };
  }

  /* ── COMPILER ─────────────────────────────────────────── */

  async function compileCode(cCode) {
    if (_backendAvailable) {
      try {
        return await _fetch('/api/compile', {
          method: 'POST',
          body: JSON.stringify({ code: cCode }),
        });
      } catch (err) {
        return { success: false, output: `Backend error: ${err.message}` };
      }
    }
    return {
      success: false,
      output: 'Backend server not connected.\nTo compile, start the backend:\n  cd backend && npm install && npm start',
    };
  }

  return {
    checkConnection,
    isAvailable,
    getBlocks,
    listProjects,
    getProject,
    saveProject,
    deleteProject,
    compileCode,
  };
})();
