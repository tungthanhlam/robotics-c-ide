/**
 * main.js – Application entry point.
 * Boots the Editor as soon as the DOM is ready.
 */

'use strict';

(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Editor.init());
  } else {
    Editor.init();
  }
})();
