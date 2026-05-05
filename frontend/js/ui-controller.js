/**
 * ui-controller.js – Modal management, button wiring, palette filtering,
 * code copy/download, and general UI interactions.
 */

'use strict';

const UIController = (() => {

  /* ── MODAL HELPERS ───────────────────────────────────────── */

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('visible');
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('visible');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.visible').forEach(m => m.classList.remove('visible'));
  }

  /* ── CLOSE BUTTONS ───────────────────────────────────────── */

  function initModalCloseButtons() {
    // data-modal="<id>" on close buttons and Cancel buttons
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });

    // Click on overlay backdrop closes it
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    // Escape key closes topmost modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const visible = document.querySelectorAll('.modal-overlay.visible');
        if (visible.length) closeModal(visible[visible.length - 1].id);
      }
    });
  }

  /* ── TOOLBAR BUTTONS ─────────────────────────────────────── */

  function initToolbarButtons() {
    // New Project
    document.getElementById('btnNew')?.addEventListener('click', () => {
      if (ProjectManager.isDirty()) {
        document.getElementById('newProjectWarning')?.classList.add('visible');
      }
      document.getElementById('newProjectName').value = 'My Robot Program';
      document.getElementById('newProjectDesc').value  = '';
      openModal('modalNew');
    });

    document.getElementById('btnConfirmNew')?.addEventListener('click', () => {
      const name = document.getElementById('newProjectName').value.trim() || 'Untitled Project';
      const desc = document.getElementById('newProjectDesc').value.trim();
      ProjectManager.newProject(name, desc);
      closeModal('modalNew');
    });

    // Open Project
    document.getElementById('btnOpen')?.addEventListener('click', () => {
      ProjectManager.renderProjectList('projectList');
      openModal('modalOpen');
    });

    // Save
    document.getElementById('btnSave')?.addEventListener('click', () => {
      ProjectManager.save();
    });

    // Compile
    document.getElementById('btnCompile')?.addEventListener('click', async () => {
      const code = CodeGenerator.getCurrentCode();
      Utils.setStatus('Compiling…');
      Utils.showToast('Compiling…', 'info');

      const result = await ApiClient.compileCode(code);

      const outputEl = document.getElementById('compileOutput');
      if (outputEl) {
        outputEl.textContent = result.output ||
          (result.success ? 'Compilation successful!' : 'Unknown error');
        outputEl.style.color = result.success ? '#3fb950' : '#f85149';
      }
      openModal('modalCompile');
      Utils.setStatus(result.success ? 'Compiled OK' : 'Compile error');
      Utils.showToast(result.success ? 'Compiled successfully!' : 'Compile error', result.success ? 'success' : 'error');
    });

    // Run (stub – requires backend integration)
    document.getElementById('btnRun')?.addEventListener('click', () => {
      Utils.showToast('Run requires backend compilation support', 'info');
    });

    // Project name change
    document.getElementById('projectName')?.addEventListener('input', () => {
      ProjectManager.markDirty();
    });

    // Copy code
    document.getElementById('btnCopyCode')?.addEventListener('click', async () => {
      const code = CodeGenerator.getCurrentCode();
      try {
        await Utils.copyToClipboard(code);
        Utils.showToast('Code copied to clipboard!', 'success');
      } catch {
        Utils.showToast('Failed to copy code', 'error');
      }
    });

    // Download .c file
    document.getElementById('btnDownloadCode')?.addEventListener('click', () => {
      const code     = CodeGenerator.getCurrentCode();
      const projName = document.getElementById('projectName')?.value.replace(' •', '').trim() || 'program';
      const filename = projName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase() + '.c';
      Utils.downloadFile(filename, code, 'text/x-csrc');
      Utils.showToast(`Downloaded ${filename}`, 'success');
    });
  }

  /* ── PALETTE CATEGORY TABS ───────────────────────────────── */

  function initCategoryTabs() {
    const tabs = document.querySelectorAll('.cat-tab');
    const searchInput = document.getElementById('blockSearch');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (searchInput) searchInput.value = '';
        BlockSystem.renderPalette(tab.dataset.category, '');
      });
    });

    // Block search
    searchInput?.addEventListener('input', Utils.debounce(e => {
      const activeTab = document.querySelector('.cat-tab.active');
      const category  = activeTab?.dataset.category || 'all';
      BlockSystem.renderPalette(category, e.target.value);
    }, 200));
  }

  /* ── EDIT BLOCK MODAL ────────────────────────────────────── */

  let _editTarget = null;

  function openEditBlockModal(blockEl) {
    const def = BlockSystem.getById(blockEl.dataset.blockId);
    if (!def || !def.params?.length) {
      Utils.showToast('No editable parameters', 'info');
      return;
    }

    _editTarget = blockEl;
    document.getElementById('editBlockTitle').textContent = 'Edit: ' + def.name;

    const body = document.getElementById('editBlockBody');
    body.innerHTML = '';

    def.params.forEach(param => {
      const currentInput = blockEl.querySelector(`[data-param="${param.name}"]`);
      const currentValue = currentInput ? currentInput.value : (param.default ?? '');

      const label = document.createElement('label');
      label.textContent = param.label;
      label.style.display       = 'flex';
      label.style.flexDirection = 'column';
      label.style.gap           = '6px';
      label.style.fontSize      = '13px';
      label.style.color         = 'var(--text-secondary)';

      let input;
      if (param.type === 'select' && param.options) {
        input = document.createElement('select');
        input.className = 'modal-input';
        param.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (opt === String(currentValue)) o.selected = true;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.className   = 'modal-input';
        input.type        = param.type === 'number' ? 'number' : 'text';
        input.value       = currentValue;
        input.placeholder = param.default || '';
      }
      input.dataset.param = param.name;
      label.appendChild(input);
      body.appendChild(label);
    });

    openModal('modalEditBlock');

    document.getElementById('btnSaveBlockParams').onclick = () => {
      body.querySelectorAll('[data-param]').forEach(input => {
        const target = _editTarget.querySelector(`[data-param="${input.dataset.param}"]`);
        if (target) target.value = input.value;
      });
      closeModal('modalEditBlock');
      Workspace.triggerCodeUpdate();
      Utils.showToast('Parameters updated', 'success');
    };
  }

  /* ── KEYBOARD SHORTCUTS ──────────────────────────────────── */

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 's') { e.preventDefault(); ProjectManager.save(); }
      if (ctrl && e.key === 'z') { e.preventDefault(); Workspace.undo(); }
      if (ctrl && e.key === 'y') { e.preventDefault(); Workspace.redo(); }
      if (ctrl && e.shiftKey && e.key === 'Z') { e.preventDefault(); Workspace.redo(); }
      if (ctrl && e.key === 'n') { e.preventDefault(); document.getElementById('btnNew')?.click(); }
      if (ctrl && e.key === 'o') { e.preventDefault(); document.getElementById('btnOpen')?.click(); }
    });
  }

  /* ── CONNECTION STATUS ───────────────────────────────────── */

  async function updateConnectionStatus() {
    const dot = document.querySelector('.status-dot');
    const span = document.getElementById('statusConnection');
    const available = await ApiClient.checkConnection();

    if (dot) dot.className = `status-dot ${available ? 'online' : ''}`;
    if (span) span.innerHTML = `<span class="status-dot ${available ? 'online' : ''}"></span> ${available ? 'Connected' : 'Offline (local mode)'}`;
  }

  /* ── MAIN INIT ───────────────────────────────────────────── */

  function init() {
    initModalCloseButtons();
    initToolbarButtons();
    initCategoryTabs();
    initKeyboardShortcuts();
    updateConnectionStatus();

    // Periodic connection check
    setInterval(updateConnectionStatus, 30_000);
  }

  return {
    init,
    openModal,
    closeModal,
    closeAllModals,
    openEditBlockModal,
    updateConnectionStatus,
  };
})();
