/**
 * project-manager.js – Create, save, load and delete projects.
 * Uses ApiClient (backend) with local-storage fallback.
 */

'use strict';

const ProjectManager = (() => {

  /* ── STATE ──────────────────────────────────────────────── */
  let _currentProject = {
    id:          null,
    name:        'Untitled Project',
    description: '',
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
    blocks:      [],   // serialised block instances
  };

  let _isDirty = false;

  /* ── ACCESSORS ──────────────────────────────────────────── */

  function getCurrent()     { return _currentProject; }
  function isDirty()        { return _isDirty; }
  function markDirty()      { _isDirty = true; updateTitle(); }
  function clearDirty()     { _isDirty = false; updateTitle(); }

  function updateTitle() {
    const input = document.getElementById('projectName');
    if (!input) return;
    const base = _currentProject.name || 'Untitled Project';
    input.value = _isDirty ? base + ' •' : base;
  }

  /* ── NEW PROJECT ─────────────────────────────────────────── */

  function newProject(name = 'Untitled Project', description = '') {
    _currentProject = {
      id:          null,
      name,
      description,
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      blocks:      [],
    };
    clearDirty();
    Workspace.clearWorkspace && Workspace.loadInstances([]);
    updateTitle();
    Utils.showToast('New project created', 'success');
    Utils.setStatus('New project');
  }

  /* ── SAVE PROJECT ────────────────────────────────────────── */

  async function save() {
    // Collect current block state
    _currentProject.name       = document.getElementById('projectName')?.value.replace(' •', '').trim()
                                  || _currentProject.name;
    _currentProject.blocks     = Workspace.getInstances();
    _currentProject.updatedAt  = new Date().toISOString();

    try {
      const saved = await ApiClient.saveProject(_currentProject);
      _currentProject.id = saved.id || _currentProject.id;
      clearDirty();
      Utils.showToast('Project saved ✓', 'success');
      Utils.setStatus('Saved: ' + _currentProject.name);
      return true;
    } catch (err) {
      Utils.showToast('Save failed: ' + err.message, 'error');
      return false;
    }
  }

  /* ── LOAD PROJECT ────────────────────────────────────────── */

  async function load(projectId) {
    try {
      const project = await ApiClient.getProject(projectId);
      if (!project) { Utils.showToast('Project not found', 'error'); return false; }

      _currentProject = project;
      Workspace.loadInstances(project.blocks || []);

      const input = document.getElementById('projectName');
      if (input) input.value = project.name;

      clearDirty();
      Utils.showToast(`Loaded: ${project.name}`, 'success');
      Utils.setStatus('Loaded: ' + project.name);
      return true;
    } catch (err) {
      Utils.showToast('Load failed: ' + err.message, 'error');
      return false;
    }
  }

  /* ── LIST PROJECTS ───────────────────────────────────────── */

  async function renderProjectList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="palette-loading"><div class="spinner"></div><span>Loading…</span></div>';

    try {
      const projects = await ApiClient.listProjects();

      if (!projects || !projects.length) {
        container.innerHTML = '<div class="project-list-empty">No saved projects yet.</div>';
        return;
      }

      container.innerHTML = '';
      projects.slice().reverse().forEach(p => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.innerHTML = `
          <div>
            <div class="project-item-name">${Utils.escapeHtml(p.name || 'Untitled')}</div>
            <div class="project-item-meta">
              ${p.description ? Utils.escapeHtml(p.description.slice(0, 60)) + ' · ' : ''}
              ${Utils.formatDate(p.updatedAt || p.createdAt)}
            </div>
          </div>
          <button class="project-item-delete" data-id="${p.id}" title="Delete project">🗑</button>
        `;
        item.addEventListener('click', async e => {
          if (e.target.dataset.id) return; // delete handled below
          UIController.closeAllModals();
          await load(p.id);
        });
        item.querySelector('.project-item-delete').addEventListener('click', async e => {
          e.stopPropagation();
          if (!confirm(`Delete "${p.name}"?`)) return;
          await ApiClient.deleteProject(p.id);
          item.remove();
          if (!container.children.length) {
            container.innerHTML = '<div class="project-list-empty">No saved projects yet.</div>';
          }
          Utils.showToast('Project deleted', 'info');
        });
        container.appendChild(item);
      });
    } catch (err) {
      container.innerHTML = `<div class="project-list-empty">Error: ${Utils.escapeHtml(err.message)}</div>`;
    }
  }

  return {
    getCurrent,
    isDirty,
    markDirty,
    clearDirty,
    newProject,
    save,
    load,
    renderProjectList,
    updateTitle,
  };
})();
