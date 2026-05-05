/**
 * workspace.js – Handles block placement, dragging, deletion,
 * and ordering within the workspace canvas.
 */

'use strict';

const Workspace = (() => {

  /* ── STATE ──────────────────────────────────────────────── */
  let _blockInstances = [];   // array of { instanceId, blockId, x, y, params }
  let _undoStack      = [];
  let _redoStack      = [];

  let _dragging       = null; // { el, startX, startY, origX, origY }
  let _contextTarget  = null; // block element targeted by right-click

  const MAX_UNDO = 50;

  /* ── DOM REFS ───────────────────────────────────────────── */
  const canvas    = () => document.getElementById('workspaceCanvas');
  const hint      = () => document.getElementById('workspaceHint');
  const blockCount= () => document.getElementById('blockCount');
  const statusBlocks = () => document.getElementById('statusBlocks');

  /* ── INIT ───────────────────────────────────────────────── */

  function init() {
    const cv = canvas();
    if (!cv) return;

    // HTML5 Drop target
    cv.addEventListener('dragover',  handleDragOver);
    cv.addEventListener('dragleave', handleDragLeave);
    cv.addEventListener('drop',      handleDrop);

    // Click outside to close context menu
    document.addEventListener('click', () => closeContextMenu());

    // Workspace-level pointer events (block move)
    cv.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);

    // Touch support
    cv.addEventListener('touchend', onTouchEnd, { passive: false });

    // Undo/Redo/Clear buttons
    document.getElementById('btnUndo')?.addEventListener('click', undo);
    document.getElementById('btnRedo')?.addEventListener('click', redo);
    document.getElementById('btnClear')?.addEventListener('click', clearWorkspace);

    updateHint();
  }

  /* ── DROP HANDLING (from palette) ──────────────────────── */

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    canvas().classList.add('drag-over');

    // Show drop indicator near cursor
    const indicator = document.getElementById('dropIndicator');
    if (indicator) {
      const pos = Utils.getRelativePos(e, canvas());
      indicator.style.left   = `${pos.x - 90}px`;
      indicator.style.top    = `${pos.y - 22}px`;
      indicator.style.width  = '180px';
      indicator.style.height = '44px';
      indicator.style.display = 'block';
    }
  }

  function handleDragLeave(e) {
    if (!canvas().contains(e.relatedTarget)) {
      canvas().classList.remove('drag-over');
      hideDropIndicator();
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    canvas().classList.remove('drag-over');
    hideDropIndicator();

    const blockId = e.dataTransfer.getData('text/plain') || window._draggedBlockId;
    if (!blockId) return;

    const pos = Utils.getRelativePos(e, canvas());
    addBlock(blockId, pos.x - 90, pos.y - 22);
  }

  function hideDropIndicator() {
    const indicator = document.getElementById('dropIndicator');
    if (indicator) indicator.style.display = 'none';
  }

  /* ── TOUCH DRAG FROM PALETTE ────────────────────────────── */

  function onTouchEnd(e) {
    const blockId = window._touchDragBlockId;
    if (!blockId) return;
    const touch = e.changedTouches[0];
    const cvEl  = canvas();
    const rect  = cvEl.getBoundingClientRect();
    if (
      touch.clientX >= rect.left && touch.clientX <= rect.right &&
      touch.clientY >= rect.top  && touch.clientY <= rect.bottom
    ) {
      const x = touch.clientX - rect.left + cvEl.scrollLeft - 90;
      const y = touch.clientY - rect.top  + cvEl.scrollTop  - 22;
      addBlock(blockId, x, y);
    }
    window._touchDragBlockId = null;
  }

  /* ── BLOCK CREATION ─────────────────────────────────────── */

  function addBlock(blockId, x, y) {
    const def = BlockSystem.getById(blockId);
    if (!def) { Utils.showToast('Unknown block: ' + blockId, 'error'); return; }

    saveUndoState();

    const instanceId = Utils.uid('blk');
    const params = {};
    (def.params || []).forEach(p => { params[p.name] = p.default ?? ''; });

    const instance = { instanceId, blockId, x: Math.max(0, x), y: Math.max(0, y), params };
    _blockInstances.push(instance);

    const el = BlockSystem.createWorkspaceBlock(instance);
    if (!el) return;

    // Attach block-level events
    attachBlockEvents(el);

    canvas().appendChild(el);
    updateHint();
    updateCounters();
    triggerCodeUpdate();

    // Animate in
    requestAnimationFrame(() => el.style.animation = 'none');
  }

  /* ── BLOCK EVENTS ───────────────────────────────────────── */

  function attachBlockEvents(el) {
    // Delete button inside block header
    el.querySelector('.ws-block-delete')?.addEventListener('click', e => {
      e.stopPropagation();
      deleteBlock(el.id);
    });

    // Right-click context menu
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      _contextTarget = el;
      showContextMenu(e.clientX, e.clientY);
    });

    // Param changes → code update
    el.querySelectorAll('[data-param]').forEach(input => {
      input.addEventListener('input',  Utils.debounce(triggerCodeUpdate, 250));
      input.addEventListener('change', triggerCodeUpdate);
    });
  }

  /* ── DRAG (within workspace) ────────────────────────────── */

  function onMouseDown(e) {
    const blockEl = e.target.closest('.workspace-block');
    if (!blockEl) return;
    // Ignore clicks on inputs/selects/delete buttons
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT' ||
      e.target.tagName === 'BUTTON'
    ) return;

    e.preventDefault();
    _dragging = {
      el:    blockEl,
      startX: e.clientX,
      startY: e.clientY,
      origX:  parseInt(blockEl.style.left, 10) || 0,
      origY:  parseInt(blockEl.style.top,  10) || 0,
    };
    blockEl.classList.add('dragging-ws');
    blockEl.style.zIndex = '200';
  }

  function onMouseMove(e) {
    if (!_dragging) return;
    const dx = e.clientX - _dragging.startX;
    const dy = e.clientY - _dragging.startY;
    const newX = Math.max(0, _dragging.origX + dx);
    const newY = Math.max(0, _dragging.origY + dy);
    _dragging.el.style.left = `${newX}px`;
    _dragging.el.style.top  = `${newY}px`;
  }

  function onMouseUp() {
    if (!_dragging) return;
    const el = _dragging.el;
    el.classList.remove('dragging-ws');
    el.style.zIndex = '';

    // Persist position back to instance state
    const inst = _blockInstances.find(i => i.instanceId === el.id);
    if (inst) {
      inst.x = parseInt(el.style.left, 10) || 0;
      inst.y = parseInt(el.style.top,  10) || 0;
    }

    _dragging = null;
    triggerCodeUpdate();
  }

  /* ── DELETE BLOCK ───────────────────────────────────────── */

  function deleteBlock(instanceId) {
    saveUndoState();
    _blockInstances = _blockInstances.filter(i => i.instanceId !== instanceId);
    document.getElementById(instanceId)?.remove();
    updateHint();
    updateCounters();
    triggerCodeUpdate();
    Utils.showToast('Block removed', 'info', 1500);
  }

  /* ── CONTEXT MENU ───────────────────────────────────────── */

  function showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    if (!menu) return;
    menu.style.left    = `${x}px`;
    menu.style.top     = `${y}px`;
    menu.classList.add('visible');

    // Keep within viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth)
      menu.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight)
      menu.style.top  = `${y - rect.height}px`;
  }

  function closeContextMenu() {
    document.getElementById('contextMenu')?.classList.remove('visible');
  }

  /* ── CONTEXT MENU ACTIONS ───────────────────────────────── */

  function initContextMenu() {
    document.getElementById('ctxDelete')?.addEventListener('click', () => {
      if (_contextTarget) {
        deleteBlock(_contextTarget.id);
        _contextTarget = null;
      }
      closeContextMenu();
    });

    document.getElementById('ctxDuplicate')?.addEventListener('click', () => {
      if (_contextTarget) duplicateBlock(_contextTarget);
      closeContextMenu();
    });

    document.getElementById('ctxEdit')?.addEventListener('click', () => {
      if (_contextTarget) UIController.openEditBlockModal(_contextTarget);
      closeContextMenu();
    });
  }

  function duplicateBlock(el) {
    const inst = _blockInstances.find(i => i.instanceId === el.id);
    if (!inst) return;
    const copy = Utils.deepClone(inst);
    copy.instanceId = Utils.uid('blk');
    copy.x += 20;
    copy.y += 20;
    _blockInstances.push(copy);

    const newEl = BlockSystem.createWorkspaceBlock(copy);
    if (!newEl) return;
    attachBlockEvents(newEl);
    canvas().appendChild(newEl);
    updateCounters();
    triggerCodeUpdate();
  }

  /* ── UNDO / REDO ─────────────────────────────────────────── */

  function saveUndoState() {
    const snapshot = serializeBlocks();
    _undoStack.push(snapshot);
    if (_undoStack.length > MAX_UNDO) _undoStack.shift();
    _redoStack = [];
    updateUndoButtons();
  }

  function undo() {
    if (!_undoStack.length) return;
    _redoStack.push(serializeBlocks());
    deserializeBlocks(_undoStack.pop());
    updateUndoButtons();
  }

  function redo() {
    if (!_redoStack.length) return;
    _undoStack.push(serializeBlocks());
    deserializeBlocks(_redoStack.pop());
    updateUndoButtons();
  }

  function updateUndoButtons() {
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    if (btnUndo) btnUndo.disabled = _undoStack.length === 0;
    if (btnRedo) btnRedo.disabled = _redoStack.length === 0;
  }

  /* ── SERIALISE / DESERIALISE ────────────────────────────── */

  function serializeBlocks() {
    const cv = canvas();
    return _blockInstances.map(inst => {
      const el = document.getElementById(inst.instanceId);
      const params = {};
      el?.querySelectorAll('[data-param]').forEach(i => {
        params[i.dataset.param] = i.value;
      });
      return {
        ...inst,
        x: parseInt(el?.style.left, 10) || inst.x,
        y: parseInt(el?.style.top,  10) || inst.y,
        params,
      };
    });
  }

  function deserializeBlocks(instances) {
    // Remove all current block elements
    canvas().querySelectorAll('.workspace-block').forEach(e => e.remove());
    _blockInstances = [];

    instances.forEach(inst => {
      _blockInstances.push(inst);
      const el = BlockSystem.createWorkspaceBlock(inst);
      if (el) {
        attachBlockEvents(el);
        canvas().appendChild(el);
      }
    });

    updateHint();
    updateCounters();
    triggerCodeUpdate();
  }

  /* ── CLEAR WORKSPACE ─────────────────────────────────────── */

  function clearWorkspace() {
    if (_blockInstances.length === 0) return;
    if (!confirm('Clear all blocks from the workspace?')) return;
    saveUndoState();
    canvas().querySelectorAll('.workspace-block').forEach(e => e.remove());
    _blockInstances = [];
    updateHint();
    updateCounters();
    triggerCodeUpdate();
  }

  /* ── HELPERS ─────────────────────────────────────────────── */

  function updateHint() {
    const h = hint();
    if (!h) return;
    h.classList.toggle('hidden', _blockInstances.length > 0);
  }

  function updateCounters() {
    const n = _blockInstances.length;
    const bc = blockCount();
    const sb = statusBlocks();
    if (bc) bc.textContent = `${n} block${n !== 1 ? 's' : ''}`;
    if (sb) sb.textContent = `Blocks: ${n}`;
  }

  function triggerCodeUpdate() {
    const ids = _blockInstances.map(i => i.instanceId);
    CodeGenerator.updatePreview(ids);
  }

  function getOrderedInstances() {
    return serializeBlocks().sort((a, b) => a.y - b.y);
  }

  function loadInstances(instances) {
    deserializeBlocks(instances);
  }

  function getInstances() { return serializeBlocks(); }

  return {
    init,
    initContextMenu,
    addBlock,
    deleteBlock,
    clearWorkspace,
    undo,
    redo,
    loadInstances,
    getInstances,
    getOrderedInstances,
    triggerCodeUpdate,
  };
})();
