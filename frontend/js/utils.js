/**
 * utils.js – Shared utility helpers used by all modules.
 */

'use strict';

const Utils = (() => {

  /** Generate a short random ID */
  function uid(prefix = 'id') {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /** Clamp a number between min and max */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /** Deep-clone a plain JS object */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** Debounce: returns a function that fires after `delay` ms of silence */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /** Escape HTML entities to prevent XSS in code preview */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Format ISO date string to readable form */
  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  }

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   * @param {number} duration ms
   */
  function showToast(message, type = 'info', duration = 2800) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  /**
   * Update the status bar left message.
   */
  function setStatus(message) {
    const el = document.getElementById('statusMessage');
    if (el) el.textContent = message;
  }

  /**
   * Get mouse/touch position relative to an element.
   */
  function getRelativePos(event, element) {
    const rect = element.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left + element.scrollLeft,
      y: clientY - rect.top  + element.scrollTop,
    };
  }

  /**
   * Read JSON from localStorage, with fallback.
   */
  function localGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Write JSON to localStorage.
   */
  function localSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove an item from localStorage.
   */
  function localRemove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  /**
   * Trigger a file download in the browser.
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  function downloadFile(filename, content, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy text to clipboard (async with graceful fallback).
   */
  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = Object.assign(document.createElement('textarea'), {
        value: text, style: 'position:fixed;opacity:0'
      });
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  return {
    uid,
    clamp,
    deepClone,
    debounce,
    escapeHtml,
    formatDate,
    showToast,
    setStatus,
    getRelativePos,
    localGet,
    localSet,
    localRemove,
    downloadFile,
    copyToClipboard,
  };
})();
