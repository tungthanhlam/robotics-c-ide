/**
 * editor.js – Core editor logic: integrates all sub-systems and
 * provides the high-level Editor API consumed by main.js.
 */

'use strict';

const Editor = (() => {

  let _initialized = false;

  /**
   * Full initialisation sequence. Called once on DOMContentLoaded.
   */
  async function init() {
    if (_initialized) return;
    _initialized = true;

    // 1. Boot UI interactions first (modals, buttons, shortcuts)
    UIController.init();

    // 2. Init workspace (drag/drop canvas, undo, context menu)
    Workspace.init();
    Workspace.initContextMenu();

    // 3. Load block definitions and populate palette
    await BlockSystem.init();

    // 4. Check backend connectivity
    await UIController.updateConnectionStatus();

    // 5. Trigger initial code preview (empty)
    CodeGenerator.updatePreview([]);

    // 6. Auto-load last session from localStorage
    _restoreSession();

    Utils.setStatus('Ready');
    Utils.showToast('Robotics C IDE ready!', 'success', 2000);
  }

  /**
   * Restore the last unsaved session from localStorage on page load.
   */
  function _restoreSession() {
    const session = Utils.localGet('_lastSession');
    if (session && session.blocks && session.blocks.length > 0) {
      try {
        Workspace.loadInstances(session.blocks);
        if (session.projectName) {
          const nameInput = document.getElementById('projectName');
          if (nameInput) nameInput.value = session.projectName;
        }
        Utils.setStatus('Restored last session');
      } catch { /* ignore corrupt session */ }
    }

    // Auto-save session every 15 seconds
    setInterval(_saveSession, 15_000);

    // Save on page unload
    window.addEventListener('beforeunload', _saveSession);
  }

  function _saveSession() {
    try {
      const blocks      = Workspace.getInstances();
      const projectName = document.getElementById('projectName')?.value.replace(' •', '').trim() || '';
      Utils.localSet('_lastSession', { blocks, projectName, savedAt: new Date().toISOString() });
    } catch { /* ignore */ }
  }

  return { init };
})();
