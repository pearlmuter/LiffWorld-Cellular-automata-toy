/**
 * Grid data structure for cellular automata.
 * Cells are stored as a flat Uint8Array for cache-friendly access.
 * Each cell holds a state index (0 = dead/empty, 1+ = alive/colored).
 *
 * Double-buffering: `cells` holds the current generation, `prevCells`
 * holds the state used for neighbor counting during stepping. Call
 * `snapshot()` before computing the next generation and `syncPrev()`
 * after mutations outside the step cycle.
 */
class Grid {
  /**
   * @param {number} width  - Number of columns (default 100)
   * @param {number} height - Number of rows (default 100)
   */
  constructor(width = 100, height = 100) {
    this.width = width;
    this.height = height;
    this.cells = new Uint8Array(width * height);
    this.prevCells = new Uint8Array(width * height);
  }

  /**
   * Convert grid coordinates to a flat array index.
   * @param {number} x - Column
   * @param {number} y - Row
   * @returns {number} Flat index, or -1 if out of bounds
   */
  getIndex(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
    return y * this.width + x;
  }

  /**
   * Read the current cell state.
   * @param {number} x - Column
   * @param {number} y - Row
   * @returns {number} State index (0 for out-of-bounds)
   */
  get(x, y) {
    const idx = this.getIndex(x, y);
    return idx >= 0 ? this.cells[idx] : 0;
  }

  /**
   * Read the previous-generation cell state.
   * @param {number} x - Column
   * @param {number} y - Row
   * @returns {number} State index (0 for out-of-bounds)
   */
  getPrev(x, y) {
    const idx = this.getIndex(x, y);
    return idx >= 0 ? this.prevCells[idx] : 0;
  }

  /**
   * Set a cell's state. Out-of-bounds coordinates are silently ignored.
   * @param {number} x     - Column
   * @param {number} y     - Row
   * @param {number} value - State index to write
   */
  set(x, y, value) {
    const idx = this.getIndex(x, y);
    if (idx >= 0) this.cells[idx] = value;
  }

  /**
   * Wrap coordinates toroidally so they stay within [0, width) × [0, height).
   * Handles negative values correctly via double-modulo.
   * @param {number} x
   * @param {number} y
   * @returns {{x: number, y: number}} Wrapped coordinates
   */
  wrapCoord(x, y) {
    return {
      x: ((x % this.width) + this.width) % this.width,
      y: ((y % this.height) + this.height) % this.height,
    };
  }

  /**
   * Read the current cell state with optional wrapping.
   * @param {number} x    - Column (may be out of bounds when wrap=true)
   * @param {number} y    - Row
   * @param {boolean} wrap - Whether to wrap edges toroidally
   * @returns {number} State index (0 for out-of-bounds when wrap=false)
   */
  getWrapped(x, y, wrap) {
    if (wrap) {
      const w = this.wrapCoord(x, y);
      return this.cells[w.y * this.width + w.x];
    }
    const idx = this.getIndex(x, y);
    return idx >= 0 ? this.cells[idx] : 0;
  }

  /**
   * Read the previous-generation cell state with optional wrapping.
   * Called by neighbor-counting functions during the step cycle.
   * @param {number} x    - Column
   * @param {number} y    - Row
   * @param {boolean} wrap - Whether to wrap edges toroidally
   * @returns {number} State index
   */
  getPrevWrapped(x, y, wrap) {
    if (wrap) {
      const w = this.wrapCoord(x, y);
      return this.prevCells[w.y * this.width + w.x];
    }
    const idx = this.getIndex(x, y);
    return idx >= 0 ? this.prevCells[idx] : 0;
  }

  /**
   * Count live (>0 state) neighbours using the Moore neighbourhood
   * (8-directional). Reads from prevCells so it is safe to call during
   * the step iteration that writes back to cells.
   * @param {number} x    - Column of centre cell
   * @param {number} y    - Row of centre cell
   * @param {boolean} wrap - Whether to wrap edges toroidally
   * @returns {number} Neighbour count (0-8)
   */
  countNeighbors(x, y, wrap) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (this.getPrevWrapped(x + dx, y + dy, wrap) > 0) count++;
      }
    }
    return count;
  }

  /**
   * Count live neighbours using the Von Neumann neighbourhood
   * (4-directional: N, S, E, W). Reads from prevCells.
   * @param {number} x    - Column of centre cell
   * @param {number} y    - Row of centre cell
   * @param {boolean} wrap - Whether to wrap edges toroidally
   * @returns {number} Neighbour count (0-4)
   */
  countNeighborsVonNeumann(x, y, wrap) {
    let count = 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
      if (this.getPrevWrapped(x + dx, y + dy, wrap) > 0) count++;
    }
    return count;
  }

  /**
   * Return the raw state values of the 8 Moore neighbours of a cell.
   * Useful for multi-state rules that inspect specific neighbour states.
   * @param {number} x    - Column
   * @param {number} y    - Row
   * @param {boolean} wrap - Whether to wrap edges
   * @returns {number[]} Array of 8 neighbour states
   */
  getNeighborStates(x, y, wrap) {
    const states = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        states.push(this.getPrevWrapped(x + dx, y + dy, wrap));
      }
    }
    return states;
  }

  /**
   * Save the current generation to the prev buffer.
   * MUST be called at the start of every step cycle so that
   * neighbour-counting reads from the pre-step state.
   */
  snapshot() {
    this.prevCells.set(this.cells);
  }

  /**
   * Resize the grid, preserving as much existing content as possible.
   * prevCells is reset and must be re-synced after resizing.
   * @param {number} newWidth  - New column count
   * @param {number} newHeight - New row count
   */
  resize(newWidth, newHeight) {
    const newCells = new Uint8Array(newWidth * newHeight);
    for (let y = 0; y < Math.min(this.height, newHeight); y++) {
      for (let x = 0; x < Math.min(this.width, newWidth); x++) {
        newCells[y * newWidth + x] = this.cells[y * this.width + x];
      }
    }
    this.width = newWidth;
    this.height = newHeight;
    this.cells = newCells;
    this.prevCells = new Uint8Array(newWidth * newHeight);
  }

  /**
   * Set every cell to the given state (default 0 = empty).
   * @param {number} value - State index to fill
   */
  fill(value = 0) {
    this.cells.fill(value);
  }

  /**
   * Randomly populate the grid.
   * Each cell has `density` chance of being set to a random non-zero state.
   * @param {number} density  - Probability of a cell being alive (0.0–1.0)
   * @param {number} maxStates - Number of states (states 1..maxStates-1 are used)
   */
  randomize(density = 0.3, maxStates = 2) {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = Math.random() < density ? (Math.floor(Math.random() * (maxStates - 1)) + 1) : 0;
    }
  }

  /**
   * Paint a brush stroke onto the grid.
   * @param {number} cx         - Centre column
   * @param {number} cy         - Centre row
   * @param {number} state      - State index to paint
   * @param {number} brushSize  - Diameter of brush (in cells)
   * @param {'square'|'circle'} brushShape - Shape of brush
   */
  paint(cx, cy, state, brushSize = 1, brushShape = 'square') {
    const half = Math.floor(brushSize / 2);
    const radius = brushSize / 2;

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        if (brushShape === 'circle') {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;
        }
        const x = Math.floor(cx) + dx;
        const y = Math.floor(cy) + dy;
        this.set(x, y, state);
      }
    }
  }

  /**
   * Paste a rectangular pattern (2-D array of state indices) at a position.
   * Cells with value 0 or undefined are skipped (transparent paste).
   * @param {number} x      - Top-left column
   * @param {number} y      - Top-left row
   * @param {number[][]} pattern - 2-D array of state indices
   */
  paste(x, y, pattern) {
    for (let py = 0; py < pattern.length; py++) {
      for (let px = 0; px < pattern[py].length; px++) {
        const val = pattern[py][px];
        if (val !== undefined && val !== 0) {
          this.set(x + px, y + py, val);
        }
      }
    }
  }

  /**
   * Extract a rectangular region from the grid.
   * @param {number} x - Left column
   * @param {number} y - Top row
   * @param {number} w - Width of region
   * @param {number} h - Height of region
   * @returns {number[][]} 2-D array of state indices
   */
  getRegion(x, y, w, h) {
    const region = [];
    for (let ry = 0; ry < h; ry++) {
      const row = [];
      for (let rx = 0; rx < w; rx++) {
        row.push(this.get(x + rx, y + ry));
      }
      region.push(row);
    }
    return region;
  }

  /**
   * Count the total number of live (non-zero) cells.
   * @returns {number}
   */
  getPopulation() {
    let count = 0;
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] > 0) count++;
    }
    return count;
  }

  /**
   * Serialise the grid state to a base-36 compact string.
   * Each cell (0–35) becomes a single character.
   * @returns {string}
   */
  serialize() {
    return Array.from(this.cells).map(v => v.toString(36)).join('');
  }

  /**
   * Deserialise a previously serialised grid state.
   * Resets prevCells — call syncPrev() afterwards if needed.
   * @param {string} str - Serialised string from serialize()
   * @param {number} w   - Width of the original grid
   * @param {number} h   - Height of the original grid
   */
  deserialize(str, w, h) {
    this.width = w;
    this.height = h;
    const arr = new Uint8Array(w * h);
    for (let i = 0; i < Math.min(str.length, w * h); i++) {
      arr[i] = parseInt(str[i], 36) || 0;
    }
    this.cells = arr;
    this.prevCells = new Uint8Array(w * h);
  }

  /**
   * Synchronise the prev buffer with the current cells.
   * Call this after manually mutating the grid (e.g. drawing, randomise)
   * so that the next step iteration sees the correct previous state.
   */
  syncPrev() {
    this.prevCells.set(this.cells);
  }
}

// Export for use in other scripts loaded via <script> tags
window.Grid = Grid;
