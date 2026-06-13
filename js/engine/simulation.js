/**
 * Simulation engine — manages the game loop, stepping, and timing.
 *
 * Owns a {@link Grid} and a rule object (with a `step(grid)` method).
 * Provides start/stop/toggle/reset lifecycle, an interval-based game loop,
 * and a pub-sub event system for UI updates.
 *
 * Two complementary notification mechanisms exist:
 *   1. **Event system** (`on('step', cb)`) — generic pub-sub.
 *   2. **Direct callbacks** (`this.onStep`, `this.onError`) — bypass the
 *      event dispatch for the hot path and error handling.
 */
class Simulation {
  /**
   * @param {import('./grid').Grid} grid - The grid to simulate on
   */
  constructor(grid) {
    this.grid = grid;
    /** @type {boolean} Whether the simulation is running */
    this.running = false;
    /** @type {number} Current generation (step) count */
    this.generation = 0;
    /** @type {number} Target steps per second (1–30, default 10) */
    this.speed = 10;
    /** @type {import('./rules').Rule|null} Current active rule */
    this.currentRule = null;
    /** @type {Object<string, Function[]>} Event listeners */
    this.listeners = {};
    /** @type {number|null} setInterval handle */
    this._intervalId = null;

    /**
     * Direct callback — fires on every successful step.
     * Bypasses the event system for the render hot path.
     * @type {((generation: number, population: number) => void)|null}
     */
    this.onStep = null;

    /**
     * Direct callback — fires when step() throws.
     * @type {((error: Error) => void)|null}
     */
    this.onError = null;
  }

  /**
   * Set the active rule. The rule object must have a `step(grid)` method.
   * @param {import('./rules').Rule} rule
   */
  setRule(rule) {
    this.currentRule = rule;
  }

  /**
   * Set the simulation speed.
   * The interval is recalculated immediately if the simulation is running.
   * @param {number} speed - Steps per second (clamped 1–30)
   */
  setSpeed(speed) {
    this.speed = Math.max(1, Math.min(30, speed));
    if (this.running) {
      this._startLoop();
    }
  }

  /** Start the simulation loop (no-op if already running). */
  start() {
    if (this.running) return;
    this.running = true;
    this._startLoop();
    this._emit('stateChange', { running: true });
  }

  /** Stop the simulation loop. */
  stop() {
    this.running = false;
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._emit('stateChange', { running: false });
  }

  /** Toggle between running and stopped. */
  toggle() {
    if (this.running) this.stop();
    else this.start();
  }

  /**
   * Perform a single step of the simulation.
   *
   * This method:
   *   1. Validates that a rule with a `.step` function is set.
   *   2. Calls `currentRule.step(grid)`.
   *   3. Increments the generation counter.
   *   4. Emits the `step` event.
   *   5. Fires the direct `onStep` callback.
   *
   * If an error is caught it logs it and fires the `onError` callback.
   */
  step() {
    // Nudge the debug indicator so the user can see the step is executing
    const callEl = document.getElementById('stat-step-called');
    if (callEl) callEl.textContent = 'YES';

    try {
      if (!this.currentRule) {
        console.warn('step: no currentRule set');
        if (callEl) callEl.textContent = 'NO_RULE';
        return;
      }
      if (typeof this.currentRule.step !== 'function') {
        console.warn('step: currentRule.step is not a function', this.currentRule);
        if (callEl) callEl.textContent = 'BAD_RULE';
        return;
      }
      this.currentRule.step(this.grid);
      this.generation++;
      this._emit('step', { generation: this.generation, population: this.grid.getPopulation() });
      if (this.onStep) this.onStep(this.generation, this.grid.getPopulation());
    } catch (e) {
      console.error('Simulation.step error:', e);
      if (callEl) callEl.textContent = 'ERROR:' + (e.message || e).toString().substring(0, 50);
      if (this.onError) this.onError(e);
    }
  }

  /**
   * Reset the simulation: clear the grid, reset generation counter.
   * Does NOT stop the simulation.
   */
  reset() {
    this.generation = 0;
    this.grid.fill(0);
    this.grid.syncPrev();
    this._emit('step', { generation: 0, population: 0 });
  }

  /**
   * Replace the entire grid state and reset generation.
   * @param {Uint8Array} cells - New cell buffer
   */
  setGridState(cells) {
    this.grid.cells.set(cells);
    this.grid.syncPrev();
    this.generation = 0;
    this._emit('step', { generation: 0, population: this.grid.getPopulation() });
  }

  /**
   * Tear down: stop the loop and clear all listeners.
   */
  destroy() {
    this.stop();
    this.listeners = {};
  }

  // ---- Event system ----

  /**
   * Subscribe to an event.
   * @param {string} event - Event name (`'step'`, `'stateChange'`)
   * @param {(data: any) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event
   * @param {any} data
   */
  _emit(event, data) {
    const cbs = this.listeners[event];
    if (cbs) {
      for (const cb of cbs) {
        try { cb(data); } catch (e) { console.error('event handler error:', e); }
      }
    }
  }

  /**
   * Start (or restart) the interval-based main loop.
   * The interval is clamped to a minimum of 33 ms (~30 fps).
   * Each tick calls this.step() if the simulation is still running.
   */
  _startLoop() {
    if (this._intervalId) clearInterval(this._intervalId);
    const interval = Math.max(33, Math.round(1000 / this.speed));
    this._intervalId = setInterval(() => {
      if (!this.running) return;
      try {
        this.step();
      } catch (e) {
        console.error('interval tick error:', e);
        if (this.onError) this.onError(e);
      }
    }, interval);
  }
}

window.Simulation = Simulation;
