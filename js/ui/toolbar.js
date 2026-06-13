/**
 * Toolbar UI — manages tool selection, colour palette, brush controls,
 * simulation playback, rule selection, and pattern library interactions.
 *
 * Connects UI elements in the DOM to the {@link CanvasRenderer} and
 * {@link Simulation} instances. All wiring happens in the constructor.
 */
class ToolbarUI {
  /**
   * @param {CanvasRenderer} renderer
   * @param {Simulation} simulation
   */
  constructor(renderer, simulation) {
    this.renderer = renderer;
    this.simulation = simulation;
    /** @type {string[]} */
    this.colorPalette = [
      '#ff6b6b', '#4ecdc4', '#ffe66d', '#a06cd5',
      '#6c5ce7', '#ff9ff3', '#54a0ff', '#5f27cd',
      '#00d2d3', '#ff6348', '#7bed9f', '#eccc68',
      '#ff4757', '#3742fa', '#2ed573', '#f368e0',
    ];

    this._setupToolButtons();
    this._setupColorPalette();
    this._setupBrushControls();
    this._setupSimControls();
    this._setupRuleSelect();
    this._setupPatternListeners();
  }

  // ============================================================
  // Tool Buttons
  // ============================================================

  /** Wire up `.tool-btn` click handlers to switch the renderer tool. */
  _setupToolButtons() {
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderer.tool = btn.dataset.tool;
      });
    });
  }

  // ============================================================
  // Colour Palette
  // ============================================================

  /** Build the colour swatch UI and wire up click + custom colour add. */
  _setupColorPalette() {
    const palette = document.getElementById('colorPalette');
    palette.innerHTML = '';

    this.colorPalette.forEach((color, i) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (i === 0 ? ' active' : '');
      swatch.style.background = color;
      swatch.dataset.index = i + 1; // state 0 = empty, so state starts at 1
      swatch.dataset.color = color;

      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.renderer.currentColor = i + 1;
      });

      palette.appendChild(swatch);
    });

    // Custom colour picker
    document.getElementById('addColorBtn').addEventListener('click', () => {
      const colorInput = document.getElementById('customColor');
      const color = colorInput.value;
      const idx = this.colorPalette.length + 1;

      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.background = color;
      swatch.dataset.index = idx;
      swatch.dataset.color = color;

      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.renderer.currentColor = idx;
      });

      palette.appendChild(swatch);
      this.colorPalette.push(color);
      this.renderer.setStateColor(idx, color);
    });
  }

  // ============================================================
  // Brush Controls
  // ============================================================

  /** Wire up brush size slider and shape dropdown. */
  _setupBrushControls() {
    const brushSize = document.getElementById('brushSize');
    const brushLabel = document.getElementById('brushSizeLabel');
    const brushShape = document.getElementById('brushShape');

    brushSize.addEventListener('input', () => {
      const val = parseInt(brushSize.value);
      brushLabel.textContent = val;
      this.renderer.brushSize = val;
    });

    brushShape.addEventListener('change', () => {
      this.renderer.brushShape = brushShape.value;
    });
  }

  // ============================================================
  // Simulation Controls
  // ============================================================

  /** Wire up play, step, reset, randomise, clear, speed, and wrap toggle. */
  _setupSimControls() {
    const playBtn = document.getElementById('playBtn');
    const stepBtn = document.getElementById('stepBtn');
    const resetBtn = document.getElementById('resetBtn');
    const randomBtn = document.getElementById('randomBtn');
    const clearBtn = document.getElementById('clearBtn');
    const speedControl = document.getElementById('speedControl');
    const wrapToggle = document.getElementById('wrapToggle');

    playBtn.addEventListener('click', () => {
      this.simulation.toggle();
      // Run one step immediately on start for instant feedback
      if (this.simulation.running) {
        this.simulation.step();
      }
      playBtn.classList.toggle('active', this.simulation.running);
      playBtn.textContent = this.simulation.running ? '⏸' : '▶';
    });

    stepBtn.addEventListener('click', () => {
      this.simulation.step();
      this.renderer.render();
    });

    resetBtn.addEventListener('click', () => {
      this.simulation.reset();
      this.renderer.render();
    });

    randomBtn.addEventListener('click', () => {
      const maxStates = this.simulation.currentRule ? this.simulation.currentRule.states : 2;
      this.simulation.grid.randomize(0.3, maxStates);
      this.simulation.grid.syncPrev();
      this.simulation.generation = 0;
      this.renderer.render();
      this._updateStatusBar();
    });

    clearBtn.addEventListener('click', () => {
      this.simulation.reset();
      this.renderer.render();
    });

    speedControl.addEventListener('input', () => {
      this.simulation.setSpeed(parseInt(speedControl.value));
    });

    wrapToggle.addEventListener('change', () => {
      this.simulation.grid.wrap = wrapToggle.checked;
    });
  }

  // ============================================================
  // Rule Selection
  // ============================================================

  /** Populate the rule `<select>` and apply the first rule on load. */
  _setupRuleSelect() {
    const select = document.getElementById('ruleSelect');
    const display = document.getElementById('ruleDisplay');
    const rules = window.ruleRegistry.getAll();

    select.innerHTML = '';
    rules.forEach(rule => {
      const option = document.createElement('option');
      option.value = rule.name;
      option.textContent = rule.name;
      select.appendChild(option);
    });

    // Select first rule
    if (rules.length > 0) {
      select.value = rules[0].name;
      this._applyRule(rules[0]);
    }

    select.addEventListener('change', () => {
      const rule = window.ruleRegistry.get(select.value);
      if (rule) {
        this._applyRule(rule);
        display.textContent = rule.description || rule.name;
      }
    });

    display.textContent = rules[0] ? (rules[0].description || rules[0].name) : '';
  }

  /**
   * Apply a rule: stop simulation, reset grid, update status bar,
   * filter patterns, and re-render.
   * @param {import('../engine/rules').Rule} rule
   */
  _applyRule(rule) {
    if (this.simulation) {
      this.simulation.stop();
      const playBtn = document.getElementById('playBtn');
      if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.classList.remove('active');
      }
      this.simulation.setRule(rule);
      this.simulation.generation = 0;
      this.simulation.grid.fill(0);
      this.simulation.grid.syncPrev();

      // Update status bar
      this._updateStatusBar();
      const ruleEl = document.getElementById('stat-rule');
      if (ruleEl) ruleEl.textContent = rule ? rule.name : '-';

      // Update pattern library visibility based on rule
      this._filterPatternsByRule(rule.name);
      this.renderer.render();
    }
  }

  /**
   * Show/hide pattern items based on the current rule.
   * @param {string} ruleName
   */
  _filterPatternsByRule(ruleName) {
    const items = document.querySelectorAll('.pattern-item');
    items.forEach(item => {
      const forRule = item.dataset.forRule;
      if (forRule && forRule !== ruleName) {
        item.style.display = 'none';
      } else {
        item.style.display = '';
      }
    });
  }

  // ============================================================
  // Status Bar
  // ============================================================

  /** Refresh population and generation counters in the DOM. */
  _updateStatusBar() {
    const pop = document.getElementById('stat-population');
    const gen = document.getElementById('stat-generation');
    if (pop) pop.textContent = this.simulation.grid.getPopulation();
    if (gen) gen.textContent = this.simulation.generation;
  }

  // ============================================================
  // Pattern Listeners
  // ============================================================

  /** Wire up pattern library click events (paste pattern or randomise). */
  _setupPatternListeners() {
    const grid = document.getElementById('patternGrid');
    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.pattern-item');
      if (!item) return;

      const patternData = item.dataset;
      const patternName = patternData.name;

      if (patternName === 'Random 30%') {
        const maxStates = this.simulation.currentRule ? this.simulation.currentRule.states : 2;
        this.simulation.grid.randomize(0.3, maxStates);
        this.simulation.grid.syncPrev();
        this.simulation.generation = 0;
        this.renderer.render();
        this._updateStatusBar();
        return;
      }

      // Find the pattern in the shared pattern library
      const patternLib = window.patternLibrary;
      const pattern = patternLib.find(p => p.name === patternName);
      if (!pattern || !pattern.pattern) return;

      // Centre the pattern on the grid
      const gx = Math.floor((this.simulation.grid.width - pattern.pattern[0].length) / 2);
      const gy = Math.floor((this.simulation.grid.height - pattern.pattern.length) / 2);

      this.simulation.grid.paste(gx, gy, pattern.pattern);
      this.simulation.grid.syncPrev();
      this.simulation.generation = 0;
      this.renderer.render();
      this._updateStatusBar();
    });
  }
}

window.ToolbarUI = ToolbarUI;
