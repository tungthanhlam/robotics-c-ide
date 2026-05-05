/**
 * code-generator.js – Converts workspace block instances to C code
 * and updates the code preview pane with syntax highlighting.
 */

'use strict';

const CodeGenerator = (() => {

  /* ── NEEDS / auto-includes tracking ────────────────────── */
  const HEADER_TRIGGERS = {
    'stdio.h':  ['printf', 'scanf', 'puts', 'fprintf'],
    'stdlib.h': ['malloc', 'free', 'atoi', 'exit'],
    'string.h': ['strlen', 'strcpy', 'strcat', 'strcmp', 'strstr'],
    'stdbool.h':['bool', 'true', 'false'],
    'unistd.h': ['usleep', 'sleep'],
    'math.h':   ['sqrt', 'pow', 'sin', 'cos', 'tan', 'abs'],
  };

  function detectHeaders(code) {
    const needed = new Set();
    Object.entries(HEADER_TRIGGERS).forEach(([header, symbols]) => {
      if (symbols.some(s => code.includes(s))) {
        needed.add(header);
      }
    });
    return [...needed];
  }

  /* ── TEMPLATE RENDERING ─────────────────────────────────── */

  /**
   * Render a block template string, substituting {{param}} tokens.
   * @param {string} template
   * @param {object} params
   * @returns {string}
   */
  function renderTemplate(template, params) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return Object.prototype.hasOwnProperty.call(params, key)
        ? params[key]
        : `/* ${key} */`;
    });
  }

  /* ── MAIN GENERATION FUNCTION ───────────────────────────── */

  /**
   * Generate C code from an ordered list of block instances.
   * Each instance: { instanceId, blockId, params:{name:value,...}, ... }
   * @returns {string} formatted C source code
   */
  function generate(instances) {
    if (!instances || instances.length === 0) {
      return '/* Add blocks to generate C code */\n';
    }

    const bodyLines = [];

    instances.forEach(inst => {
      const def = BlockSystem.getById(inst.blockId);
      if (!def) return;

      // Merge defaults with current params
      const params = {};
      (def.params || []).forEach(p => {
        params[p.name] = (inst.params && inst.params[p.name] != null)
          ? inst.params[p.name]
          : (p.default ?? '');
      });

      const rendered = renderTemplate(def.template || `/* ${def.name} */`, params);
      // Indent multi-line rendered snippets consistently
      rendered.split('\n').forEach(line => bodyLines.push(line));
      bodyLines.push(''); // blank line between blocks
    });

    // Remove trailing empty lines
    while (bodyLines.length && bodyLines[bodyLines.length - 1] === '') bodyLines.pop();

    const body = bodyLines.join('\n');

    // Auto-detect required headers
    const headers = detectHeaders(body);
    const headerSection = headers.map(h => `#include <${h}>`).join('\n');

    const fullCode = [
      headerSection,
      headerSection ? '' : null,
      body,
    ].filter(l => l !== null).join('\n');

    return fullCode + '\n';
  }

  /* ── SYNTAX HIGHLIGHTING ────────────────────────────────── */

  const C_KEYWORDS = new Set([
    'auto','break','case','char','const','continue','default','do','double',
    'else','enum','extern','float','for','goto','if','inline','int','long',
    'register','restrict','return','short','signed','sizeof','static','struct',
    'switch','typedef','union','unsigned','void','volatile','while',
    'bool','true','false','NULL',
  ]);

  /**
   * Apply simple C syntax highlighting to a code string.
   * Returns an HTML string.
   */
  function highlight(code) {
    let result = '';
    let i = 0;
    const n = code.length;

    while (i < n) {
      const ch = code[i];

      // ── Line comment //
      if (ch === '/' && code[i+1] === '/') {
        const end = code.indexOf('\n', i);
        const seg  = end === -1 ? code.slice(i) : code.slice(i, end);
        result += `<span class="cmt">${Utils.escapeHtml(seg)}</span>`;
        i += seg.length;
        continue;
      }

      // ── Block comment /* */
      if (ch === '/' && code[i+1] === '*') {
        const end = code.indexOf('*/', i + 2);
        const seg  = end === -1 ? code.slice(i) : code.slice(i, end + 2);
        result += `<span class="cmt">${Utils.escapeHtml(seg)}</span>`;
        i += seg.length;
        continue;
      }

      // ── Preprocessor directive
      if (ch === '#') {
        const end = code.indexOf('\n', i);
        const seg  = end === -1 ? code.slice(i) : code.slice(i, end);
        result += `<span class="pp">${Utils.escapeHtml(seg)}</span>`;
        i += seg.length;
        continue;
      }

      // ── String literal "..."
      if (ch === '"') {
        let j = i + 1;
        while (j < n && !(code[j] === '"' && code[j-1] !== '\\')) j++;
        j++; // include closing "
        const seg = code.slice(i, j);
        result += `<span class="str">${Utils.escapeHtml(seg)}</span>`;
        i = j;
        continue;
      }

      // ── Char literal '.'
      if (ch === "'") {
        let j = i + 1;
        while (j < n && !(code[j] === "'" && code[j-1] !== '\\')) j++;
        j++;
        const seg = code.slice(i, j);
        result += `<span class="str">${Utils.escapeHtml(seg)}</span>`;
        i = j;
        continue;
      }

      // ── Identifier or keyword
      if (/[A-Za-z_]/.test(ch)) {
        let j = i + 1;
        while (j < n && /\w/.test(code[j])) j++;
        const word = code.slice(i, j);

        if (C_KEYWORDS.has(word)) {
          result += `<span class="kw">${Utils.escapeHtml(word)}</span>`;
        } else if (code[j] === '(') {
          // Function call
          result += `<span class="fn">${Utils.escapeHtml(word)}</span>`;
        } else {
          result += Utils.escapeHtml(word);
        }
        i = j;
        continue;
      }

      // ── Number literal
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(code[i+1]))) {
        let j = i + 1;
        while (j < n && /[0-9A-Fa-fxX._]/.test(code[j])) j++;
        // trailing f/L/u/U suffixes
        while (j < n && /[fFuUlL]/.test(code[j])) j++;
        const seg = code.slice(i, j);
        result += `<span class="num">${Utils.escapeHtml(seg)}</span>`;
        i = j;
        continue;
      }

      // ── Operators
      if (/[+\-*/<>=!&|^~%]/.test(ch)) {
        result += `<span class="op">${Utils.escapeHtml(ch)}</span>`;
        i++;
        continue;
      }

      // ── Everything else (braces, whitespace, etc.)
      result += Utils.escapeHtml(ch);
      i++;
    }

    return result;
  }

  /* ── UPDATE PREVIEW PANE ─────────────────────────────────── */

  /**
   * Re-render the code preview pane from current workspace blocks.
   * @param {string[]} orderedInstanceIds – IDs in display order
   */
  function updatePreview(orderedInstanceIds) {
    const canvas    = document.getElementById('workspaceCanvas');
    const codeEl    = document.getElementById('codeContent');
    const lineNums  = document.getElementById('lineNumbers');
    const linesSpan = document.getElementById('codeLines');
    const statusEl  = document.getElementById('codeStatus');
    if (!codeEl) return;

    // Gather instances in order (top-to-bottom by y position)
    const instances = (orderedInstanceIds || [])
      .map(id => {
        const el = document.getElementById(id);
        if (!el) return null;
        const params = {};
        el.querySelectorAll('[data-param]').forEach(input => {
          params[input.dataset.param] = input.value;
        });
        return {
          instanceId: id,
          blockId: el.dataset.blockId,
          params,
          y: parseInt(el.style.top, 10) || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.y - b.y);

    const code = generate(instances);

    // Syntax-highlight
    codeEl.innerHTML = highlight(code);

    // Line numbers
    const lines = code.split('\n');
    lineNums.innerHTML = lines
      .map((_, i) => `<div>${i + 1}</div>`)
      .join('');

    if (linesSpan) {
      linesSpan.textContent = `${lines.length} line${lines.length !== 1 ? 's' : ''}`;
    }
    if (statusEl) {
      statusEl.className = 'code-status ok';
      statusEl.textContent = 'Ready';
    }

    return code;
  }

  /**
   * Return the currently displayed raw code string.
   */
  function getCurrentCode() {
    const el = document.getElementById('codeContent');
    return el ? el.innerText || el.textContent : '';
  }

  return {
    generate,
    highlight,
    renderTemplate,
    updatePreview,
    getCurrentCode,
    detectHeaders,
  };
})();
