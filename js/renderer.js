/**
 * Main renderer — bootstraps the application.
 *
 * Runs as an IIFE that waits for the DOM to be ready, then:
 *   1. Creates the {@link Grid}, {@link Simulation}, and
 *      {@link CanvasRenderer}.
 *   2. Registers IPC callbacks from the Electron preload bridge.
 *   3. Creates {@link ToolbarUI}, {@link StorageManager},
 *      {@link RuleEditor}, and pattern library.
 *   4. Wires up the simulation event system and direct callbacks.
 *   5. Performs the initial render.
 */
(function () {
  'use strict';

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /** Main initialisation — called once the DOM is ready. */
  function init() {
    // Create grid (120 × 80 cells)
    const grid = new Grid(120, 80);

    // Create simulation
    const simulation = new Simulation(grid);
    grid.syncPrev();

    // Register IPC event handlers from the Electron preload bridge
    if (window.api) {
      window.api.onSimToggle(() => simulation.toggle());
      window.api.onSimStep(() => { simulation.step(); canvas.render(); });
      window.api.onSimReset(() => { simulation.reset(); canvas.render(); });
      window.api.onSimToggleWrap(() => {
        grid.wrap = !grid.wrap;
        document.getElementById('wrapToggle').checked = grid.wrap;
      });
      window.api.onViewResetZoom(() => {
        canvas.setZoom(8);
        // Reset pan to centre the grid
        canvas.panX = canvas.grid.width / 2;
        canvas.panY = canvas.grid.height / 2;
        canvas.render();
      });
      window.api.onViewZoomIn(() => canvas.setZoom(canvas.zoom * 1.5));
      window.api.onViewZoomOut(() => canvas.setZoom(canvas.zoom / 1.5));
    }

    // Create canvas renderer
    const canvas = new CanvasRenderer(document.getElementById('gridCanvas'), grid);

    // Wire up coordinate indicator
    canvas.onCoordChange = (x, y) => {
      const el = document.getElementById('coord-indicator');
      if (el) {
        el.textContent = (x !== null && y !== null) ? `x:${x} y:${y}` : '';
      }
    };

    // Wire up zoom indicator
    canvas.onZoomChange = (zoom) => {
      const el = document.getElementById('zoom-indicator');
      if (el) el.textContent = `${Math.round(zoom * 100 / 8)}%`;
    };

    // Wire up colour picking — highlight the matching swatch
    canvas.onPickColor = (state) => {
      const swatches = document.querySelectorAll('.color-swatch');
      swatches.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.index) === state);
      });
    };

    // Wire up draw callback → update status
    canvas.onDraw = () => {
      updateStatus(simulation, canvas);
    };

    // Create toolbar UI
    const toolbar = new ToolbarUI(canvas, simulation);

    // Add status bar overlay to the canvas container
    addStatusBar();

    // Create storage manager (save/load)
    const storage = new StorageManager(simulation, canvas);

    // Create rule editor
    const ruleEditor = new RuleEditor(simulation, canvas);

    // Initialise pattern library
    initPatternLibrary();

    // Initial render
    canvas.render();
    updateStatus(simulation, canvas);

    // --- Simulation event wiring ---

    // Event system — re-render on every step
    simulation.on('step', () => {
      canvas.render();
      updateStatus(simulation, canvas);
    });

    // Direct render callback — fires on every successful step
    // (belt-and-suspenders: runs even if the event system has issues)
    let tickCount = 0;
    simulation.onStep = (gen, pop) => {
      tickCount++;
      canvas.render();
      const genEl = document.getElementById('stat-generation');
      const popEl = document.getElementById('stat-population');
      const tickEl = document.getElementById('stat-tick');
      if (genEl) genEl.textContent = gen;
      if (popEl) popEl.textContent = pop;
      if (tickEl) tickEl.textContent = String(tickCount);
    };

    // Visible error display — catches silent throws from simulation.step()
    simulation.onError = (err) => {
      const el = document.getElementById('status-error');
      if (el) {
        el.textContent = '⚠ Error: ' + (err.message || err);
        el.style.display = 'block';
      }
    };

    // Play button sync when toggled from menu
    simulation.on('stateChange', (state) => {
      const playBtn = document.getElementById('playBtn');
      if (playBtn) {
        playBtn.classList.toggle('active', state.running);
        playBtn.textContent = state.running ? '⏸' : '▶';
      }
    });

    // Wrap toggle — on by default
    document.getElementById('wrapToggle').checked = true;
    grid.wrap = true;

    console.log('Cellular Playground initialised!');
    console.log('  Grid:', grid.width, 'x', grid.height);
    console.log('  Rules available:', window.ruleRegistry.getNames().length);
    console.log('  Patterns available:', window.patternLibrary.length);
    console.log('');
    console.log('Keyboard shortcuts:');
    console.log('  Space    - Play/Pause');
    console.log('  1-9      - Brush size');
    console.log('  Scroll   - Zoom');
    console.log('  Drag     - Draw (left-click), Pan (middle/right-click)');
    console.log('  Cmd+S    - Save');
    console.log('  Cmd+O    - Open');
    console.log('  Cmd+Z    - Undo');
    console.log('  Cmd+R    - Randomise');
  }

  /**
   * Inject the status bar overlay into the canvas container.
   * Includes rule name, generation count, population, tick counter,
   * step-called indicator, and an error display element.
   */
  function addStatusBar() {
    const container = document.getElementById('canvas-container');
    const existing = document.getElementById('status-overlay');
    if (existing) return;

    const status = document.createElement('div');
    status.id = 'status-overlay';
    status.innerHTML = `
      <span class="stat"><span class="stat-label">Rule:</span> <span id="stat-rule" class="stat-value">-</span></span>
      <span class="stat"><span class="stat-label">Gen:</span> <span id="stat-generation" class="stat-value">0</span></span>
      <span class="stat"><span class="stat-label">Pop:</span> <span id="stat-population" class="stat-value">0</span></span>
      <span class="stat"><span class="stat-label">Tick:</span> <span id="stat-tick" class="stat-value">-</span></span>
      <span class="stat"><span class="stat-label">Step:</span> <span id="stat-step-called" class="stat-value">-</span></span>
      <span id="status-error" class="stat" style="display:none;color:#ff6b6b;"></span>
    `;
    container.appendChild(status);
  }

  /**
   * Refresh the population and generation counters in the status bar.
   * @param {Simulation} simulation
   * @param {CanvasRenderer} canvas
   */
  function updateStatus(simulation, canvas) {
    const pop = document.getElementById('stat-population');
    const gen = document.getElementById('stat-generation');
    if (pop) pop.textContent = simulation.grid.getPopulation();
    if (gen) gen.textContent = simulation.generation;
  }
})();
