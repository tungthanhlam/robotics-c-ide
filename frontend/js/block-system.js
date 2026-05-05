/**
 * block-system.js – Block definitions, palette rendering, and block DOM creation.
 */

'use strict';

const BlockSystem = (() => {

  /* ── BUILT-IN BLOCK DEFINITIONS ────────────────────────── */

  const BUILTIN_BLOCKS = [
    /* ── CONTROL ──────────────────────────────────────────── */
    {
      id: 'ctrl_if',
      name: 'If Statement',
      category: 'control',
      icon: '↪',
      description: 'Conditional branch',
      params: [{ name: 'condition', label: 'Condition', type: 'text', default: 'x > 0' }],
      template: 'if ({{condition}}) {\n    // body\n}',
    },
    {
      id: 'ctrl_if_else',
      name: 'If / Else',
      category: 'control',
      icon: '⇆',
      description: 'If-else branch',
      params: [{ name: 'condition', label: 'Condition', type: 'text', default: 'x > 0' }],
      template: 'if ({{condition}}) {\n    // true\n} else {\n    // false\n}',
    },
    {
      id: 'ctrl_for',
      name: 'For Loop',
      category: 'control',
      icon: '🔁',
      description: 'Counted iteration',
      params: [
        { name: 'init',      label: 'Init',      type: 'text', default: 'i = 0' },
        { name: 'condition', label: 'Condition', type: 'text', default: 'i < 10' },
        { name: 'update',    label: 'Update',    type: 'text', default: 'i++' },
      ],
      template: 'for ({{init}}; {{condition}}; {{update}}) {\n    // body\n}',
    },
    {
      id: 'ctrl_while',
      name: 'While Loop',
      category: 'control',
      icon: '🔄',
      description: 'Loop while condition is true',
      params: [{ name: 'condition', label: 'Condition', type: 'text', default: '1' }],
      template: 'while ({{condition}}) {\n    // body\n}',
    },
    {
      id: 'ctrl_break',
      name: 'Break',
      category: 'control',
      icon: '⛔',
      description: 'Exit loop',
      params: [],
      template: 'break;',
    },
    {
      id: 'ctrl_continue',
      name: 'Continue',
      category: 'control',
      icon: '⏭',
      description: 'Skip to next iteration',
      params: [],
      template: 'continue;',
    },
    {
      id: 'ctrl_return',
      name: 'Return',
      category: 'control',
      icon: '↩',
      description: 'Return from function',
      params: [{ name: 'value', label: 'Value', type: 'text', default: '0' }],
      template: 'return {{value}};',
    },
    {
      id: 'ctrl_delay',
      name: 'Delay (ms)',
      category: 'control',
      icon: '⏱',
      description: 'Wait milliseconds',
      params: [{ name: 'ms', label: 'Milliseconds', type: 'number', default: '1000' }],
      template: 'usleep({{ms}} * 1000);',
    },

    /* ── VARIABLES ────────────────────────────────────────── */
    {
      id: 'var_int',
      name: 'Integer Variable',
      category: 'variables',
      icon: '🔢',
      description: 'Declare int variable',
      params: [
        { name: 'name',  label: 'Name',  type: 'text',   default: 'myVar' },
        { name: 'value', label: 'Value', type: 'number',  default: '0' },
      ],
      template: 'int {{name}} = {{value}};',
    },
    {
      id: 'var_float',
      name: 'Float Variable',
      category: 'variables',
      icon: '🔣',
      description: 'Declare float variable',
      params: [
        { name: 'name',  label: 'Name',  type: 'text',   default: 'myFloat' },
        { name: 'value', label: 'Value', type: 'text',   default: '0.0' },
      ],
      template: 'float {{name}} = {{value}}f;',
    },
    {
      id: 'var_string',
      name: 'String Variable',
      category: 'variables',
      icon: '📝',
      description: 'Declare char* string',
      params: [
        { name: 'name',  label: 'Name',  type: 'text', default: 'msg' },
        { name: 'value', label: 'Value', type: 'text', default: 'Hello' },
      ],
      template: 'char* {{name}} = "{{value}}";',
    },
    {
      id: 'var_bool',
      name: 'Boolean Variable',
      category: 'variables',
      icon: '☑',
      description: 'Declare bool variable',
      params: [
        { name: 'name',  label: 'Name',  type: 'text',   default: 'flag' },
        { name: 'value', label: 'Value', type: 'select',
          options: ['true', 'false'], default: 'false' },
      ],
      template: 'bool {{name}} = {{value}};',
    },
    {
      id: 'var_assign',
      name: 'Assign Variable',
      category: 'variables',
      icon: '✏️',
      description: 'Assign a value to a variable',
      params: [
        { name: 'name',  label: 'Name',  type: 'text', default: 'myVar' },
        { name: 'value', label: 'Value', type: 'text', default: '0' },
      ],
      template: '{{name}} = {{value}};',
    },
    {
      id: 'var_array',
      name: 'Array',
      category: 'variables',
      icon: '📊',
      description: 'Declare int array',
      params: [
        { name: 'name', label: 'Name', type: 'text',   default: 'arr' },
        { name: 'size', label: 'Size', type: 'number', default: '10' },
      ],
      template: 'int {{name}}[{{size}}];',
    },

    /* ── FUNCTIONS ────────────────────────────────────────── */
    {
      id: 'fn_define',
      name: 'Define Function',
      category: 'functions',
      icon: '⚙️',
      description: 'Create a function',
      params: [
        { name: 'returnType', label: 'Return Type', type: 'text', default: 'void' },
        { name: 'name',       label: 'Name',        type: 'text', default: 'myFunction' },
        { name: 'params',     label: 'Parameters',  type: 'text', default: '' },
      ],
      template: '{{returnType}} {{name}}({{params}}) {\n    // body\n}',
    },
    {
      id: 'fn_call',
      name: 'Call Function',
      category: 'functions',
      icon: '📞',
      description: 'Call a function',
      params: [
        { name: 'name',   label: 'Function', type: 'text', default: 'myFunction' },
        { name: 'args',   label: 'Arguments',type: 'text', default: '' },
      ],
      template: '{{name}}({{args}});',
    },
    {
      id: 'fn_main',
      name: 'Main Function',
      category: 'functions',
      icon: '🏁',
      description: 'Program entry point',
      params: [],
      template: 'int main() {\n    // program starts here\n    return 0;\n}',
    },

    /* ── I/O ──────────────────────────────────────────────── */
    {
      id: 'io_printf',
      name: 'Print Text',
      category: 'io',
      icon: '🖨️',
      description: 'printf to stdout',
      params: [
        { name: 'format', label: 'Format',    type: 'text', default: 'Hello, World!' },
        { name: 'args',   label: 'Arguments', type: 'text', default: '' },
      ],
      template: 'printf("{{format}}\\n"{{args}});',
    },
    {
      id: 'io_print_var',
      name: 'Print Variable',
      category: 'io',
      icon: '📤',
      description: 'Print an integer variable',
      params: [
        { name: 'label', label: 'Label', type: 'text', default: 'Value' },
        { name: 'var',   label: 'Var',   type: 'text', default: 'myVar' },
      ],
      template: 'printf("{{label}}: %d\\n", {{var}});',
    },
    {
      id: 'io_scanf',
      name: 'Read Input',
      category: 'io',
      icon: '📥',
      description: 'Read integer from stdin',
      params: [
        { name: 'var', label: 'Variable', type: 'text', default: 'myVar' },
      ],
      template: 'scanf("%d", &{{var}});',
    },
    {
      id: 'io_include',
      name: '#include Header',
      category: 'io',
      icon: '📎',
      description: 'Include a header file',
      params: [
        { name: 'header', label: 'Header', type: 'text', default: 'stdio.h' },
      ],
      template: '#include <{{header}}>',
    },

    /* ── ROBOTICS ─────────────────────────────────────────── */
    {
      id: 'rob_motor_set',
      name: 'Motor Set Power',
      category: 'robotics',
      icon: '⚡',
      description: 'Set motor power (-100 to 100)',
      params: [
        { name: 'port',  label: 'Port',  type: 'number', default: '1' },
        { name: 'power', label: 'Power', type: 'number', default: '100' },
      ],
      template: 'motor_set_power({{port}}, {{power}});',
    },
    {
      id: 'rob_motor_stop',
      name: 'Motor Stop',
      category: 'robotics',
      icon: '🛑',
      description: 'Stop a motor',
      params: [
        { name: 'port', label: 'Port', type: 'number', default: '1' },
      ],
      template: 'motor_stop({{port}});',
    },
    {
      id: 'rob_motor_speed',
      name: 'Motor Set Speed',
      category: 'robotics',
      icon: '🚀',
      description: 'Set motor velocity (RPM)',
      params: [
        { name: 'port',  label: 'Port',     type: 'number', default: '1' },
        { name: 'speed', label: 'Speed RPM',type: 'number', default: '200' },
      ],
      template: 'motor_set_velocity({{port}}, {{speed}});',
    },
    {
      id: 'rob_sensor_read',
      name: 'Read Sensor',
      category: 'robotics',
      icon: '📡',
      description: 'Read sensor value into variable',
      params: [
        { name: 'var',  label: 'Variable', type: 'text',   default: 'sensorVal' },
        { name: 'port', label: 'Port',     type: 'number', default: '1' },
      ],
      template: 'int {{var}} = sensor_read({{port}});',
    },
    {
      id: 'rob_drive_fwd',
      name: 'Drive Forward',
      category: 'robotics',
      icon: '⬆️',
      description: 'Drive robot forward',
      params: [
        { name: 'speed', label: 'Speed',    type: 'number', default: '80' },
        { name: 'time',  label: 'Time (ms)',type: 'number', default: '1000' },
      ],
      template: 'drive_forward({{speed}}, {{time}});',
    },
    {
      id: 'rob_drive_bwd',
      name: 'Drive Backward',
      category: 'robotics',
      icon: '⬇️',
      description: 'Drive robot backward',
      params: [
        { name: 'speed', label: 'Speed',    type: 'number', default: '80' },
        { name: 'time',  label: 'Time (ms)',type: 'number', default: '1000' },
      ],
      template: 'drive_backward({{speed}}, {{time}});',
    },
    {
      id: 'rob_turn',
      name: 'Turn Robot',
      category: 'robotics',
      icon: '↩',
      description: 'Turn robot left or right',
      params: [
        { name: 'direction', label: 'Direction', type: 'select',
          options: ['left', 'right'], default: 'left' },
        { name: 'degrees', label: 'Degrees', type: 'number', default: '90' },
      ],
      template: 'turn_{{direction}}({{degrees}});',
    },
    {
      id: 'rob_led',
      name: 'LED Control',
      category: 'robotics',
      icon: '💡',
      description: 'Toggle an LED',
      params: [
        { name: 'pin',   label: 'Pin',   type: 'number', default: '1' },
        { name: 'state', label: 'State', type: 'select',
          options: ['on', 'off'], default: 'on' },
      ],
      template: 'led_set({{pin}}, {{state}});',
    },

    /* ── LOGIC ────────────────────────────────────────────── */
    {
      id: 'logic_and',
      name: 'AND',
      category: 'logic',
      icon: '&&',
      description: 'Logical AND',
      params: [
        { name: 'a', label: 'A', type: 'text', default: 'expr1' },
        { name: 'b', label: 'B', type: 'text', default: 'expr2' },
      ],
      template: '({{a}} && {{b}})',
    },
    {
      id: 'logic_or',
      name: 'OR',
      category: 'logic',
      icon: '||',
      description: 'Logical OR',
      params: [
        { name: 'a', label: 'A', type: 'text', default: 'expr1' },
        { name: 'b', label: 'B', type: 'text', default: 'expr2' },
      ],
      template: '({{a}} || {{b}})',
    },
    {
      id: 'logic_not',
      name: 'NOT',
      category: 'logic',
      icon: '!',
      description: 'Logical NOT',
      params: [
        { name: 'expr', label: 'Expression', type: 'text', default: 'myVar' },
      ],
      template: '!({{expr}})',
    },
    {
      id: 'logic_compare',
      name: 'Compare',
      category: 'logic',
      icon: '⚖️',
      description: 'Compare two values',
      params: [
        { name: 'a',  label: 'A',        type: 'text',   default: 'x' },
        { name: 'op', label: 'Operator', type: 'select',
          options: ['==', '!=', '<', '>', '<=', '>='], default: '==' },
        { name: 'b',  label: 'B',        type: 'text',   default: '0' },
      ],
      template: '({{a}} {{op}} {{b}})',
    },
  ];

  /* ── STATE ──────────────────────────────────────────────── */
  let _allBlocks = [];

  /* ── PUBLIC API ─────────────────────────────────────────── */

  function getBuiltinBlocks() { return BUILTIN_BLOCKS; }

  function getAll() { return _allBlocks; }

  function getById(id) { return _allBlocks.find(b => b.id === id) || null; }

  function getByCategory(category) {
    if (!category || category === 'all') return _allBlocks;
    return _allBlocks.filter(b => b.category === category);
  }

  /**
   * Load block definitions (from API or built-ins) and populate the palette.
   */
  async function init() {
    try {
      const blocks = await ApiClient.getBlocks();
      _allBlocks = Array.isArray(blocks) ? blocks : BUILTIN_BLOCKS;
    } catch {
      _allBlocks = BUILTIN_BLOCKS;
    }
    renderPalette('all');
  }

  /**
   * Render the block palette filtered by category and optional search text.
   */
  function renderPalette(category = 'all', searchText = '') {
    const container = document.getElementById('paletteBlocks');
    if (!container) return;

    let blocks = getByCategory(category);
    if (searchText) {
      const q = searchText.toLowerCase();
      blocks = blocks.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q)
      );
    }

    container.innerHTML = '';

    if (!blocks.length) {
      container.innerHTML = '<div class="palette-empty">No blocks found.</div>';
      return;
    }

    // Group by category when showing 'all'
    if (!searchText && (category === 'all')) {
      const groups = {};
      blocks.forEach(b => {
        if (!groups[b.category]) groups[b.category] = [];
        groups[b.category].push(b);
      });

      const categoryOrder = ['control', 'variables', 'functions', 'io', 'robotics', 'logic'];
      const categoryNames  = {
        control: 'Control', variables: 'Variables', functions: 'Functions',
        io: 'I / O', robotics: 'Robotics', logic: 'Logic',
      };

      categoryOrder.forEach(cat => {
        if (!groups[cat] || !groups[cat].length) return;
        const label = document.createElement('div');
        label.className = 'palette-category-label';
        label.textContent = categoryNames[cat] || cat;
        container.appendChild(label);
        groups[cat].forEach(b => container.appendChild(createPaletteBlock(b)));
      });
    } else {
      blocks.forEach(b => container.appendChild(createPaletteBlock(b)));
    }
  }

  /**
   * Build a draggable palette block element.
   */
  function createPaletteBlock(blockDef) {
    const el = document.createElement('div');
    el.className = 'palette-block';
    el.dataset.blockId  = blockDef.id;
    el.dataset.category = blockDef.category;
    el.draggable        = true;
    el.title            = blockDef.description || blockDef.name;

    el.innerHTML = `
      <div class="palette-block-icon">${Utils.escapeHtml(blockDef.icon || '□')}</div>
      <div class="palette-block-info">
        <div class="palette-block-name">${Utils.escapeHtml(blockDef.name)}</div>
        <div class="palette-block-desc">${Utils.escapeHtml(blockDef.description || '')}</div>
      </div>
    `;

    // HTML5 Drag-and-Drop
    el.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', blockDef.id);
      el.classList.add('dragging');
      window._draggedBlockId = blockDef.id;
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      window._draggedBlockId = null;
    });

    // Touch support – start
    el.addEventListener('touchstart', e => {
      window._touchDragBlockId = blockDef.id;
      window._touchDragBlockEl = el;
    }, { passive: true });

    return el;
  }

  /**
   * Build a workspace block DOM element from a block instance.
   * @param {object} instance – { instanceId, blockId, params, x, y }
   */
  function createWorkspaceBlock(instance) {
    const def = getById(instance.blockId);
    if (!def) return null;

    const el = document.createElement('div');
    el.className        = 'workspace-block';
    el.id               = instance.instanceId;
    el.dataset.blockId  = def.id;
    el.dataset.category = def.category;
    el.style.left       = `${instance.x || 40}px`;
    el.style.top        = `${instance.y || 40}px`;

    // Params state
    el.dataset.params = JSON.stringify(instance.params || {});

    // Header
    const header = document.createElement('div');
    header.className = 'ws-block-header';
    header.innerHTML = `
      <span class="ws-block-icon">${Utils.escapeHtml(def.icon || '□')}</span>
      <span class="ws-block-title">${Utils.escapeHtml(def.name)}</span>
      <button class="ws-block-delete" title="Delete block" data-id="${instance.instanceId}">✕</button>
    `;

    // Body: parameters
    const body = document.createElement('div');
    body.className = 'ws-block-body';

    if (def.params && def.params.length > 0) {
      def.params.forEach(param => {
        const currentValue = (instance.params || {})[param.name] ?? param.default ?? '';
        const row = document.createElement('div');
        row.className = 'ws-block-param';

        const label = document.createElement('span');
        label.className = 'ws-block-param-label';
        label.textContent = param.label;

        let input;
        if (param.type === 'select' && param.options) {
          input = document.createElement('select');
          input.className = 'ws-block-param-select';
          param.options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (opt === String(currentValue)) o.selected = true;
            input.appendChild(o);
          });
        } else {
          input = document.createElement('input');
          input.className = 'ws-block-param-input';
          input.type  = param.type === 'number' ? 'number' : 'text';
          input.value = currentValue;
          input.placeholder = param.default || '';
        }
        input.dataset.param = param.name;

        row.appendChild(label);
        row.appendChild(input);
        body.appendChild(row);
      });
    } else {
      body.innerHTML = `<span style="color:var(--text-muted);font-size:11px;font-style:italic">
        ${Utils.escapeHtml(def.description || 'No parameters')}
      </span>`;
    }

    el.appendChild(header);
    el.appendChild(body);

    return el;
  }

  return {
    getBuiltinBlocks,
    getAll,
    getById,
    getByCategory,
    init,
    renderPalette,
    createPaletteBlock,
    createWorkspaceBlock,
  };
})();
