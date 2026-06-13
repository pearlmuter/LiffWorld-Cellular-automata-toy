/**
 * Canvas renderer — handles drawing the CA grid, camera (zoom/pan),
 * and mouse interaction (draw, erase, pan, colour-pick).
 *
 * Uses a simple camera model:
 *   screenX = (gridX - panX) * zoom + canvasWidth / 2
 *   gridX   = (screenX - canvasWidth / 2) / zoom + panX
 *
 * Grid lines are drawn only when `zoom >= 6` and are clipped to the
 * cell area so they do not bleed into the surrounding canvas space.
 */
class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../engine/grid').Grid} grid
   */
  constructor(canvas, grid) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = grid;

    // --- Camera state ---
    /** @type {number} Zoom level (cells per screen pixel, clamped 1–64) */
    this.zoom = 8.0;
    /** @type {number} World-space X coordinate at canvas centre */
    this.panX = 0;
    /** @type {number} World-space Y coordinate at canvas centre */
    this.panY = 0;

    // --- Interaction state ---
    /** @type {boolean} Mid-click or move-tool dragging */
    this.isPanning = false;
    /** @type {boolean} Left-click dragging */
    this.isDrawing = false;
    /** @type {number} Last mouse X (screen-space) */
    this.lastMouseX = 0;
    /** @type {number} Last mouse Y (screen-space) */
    this.lastMouseY = 0;

    /** @type {'draw'|'erase'|'move'|'pick'} Active tool */
    this.tool = 'draw';
    /** @type {number} Brush diameter in cells (1–20) */
    this.brushSize = 3;
    /** @type {'square'|'circle'} Brush shape */
    this.brushShape = 'square';
    /** @type {number} Current colour state index (1-based) */
    this.currentColor = 1;

    // --- Callbacks ---
    /** @type {((x: number, y: number) => void)|null} Fired after a draw */
    this.onDraw = null;
    /** @type {((zoom: number) => void)|null} Fired when zoom changes */
    this.onZoomChange = null;
    /** @type {((x: number|null, y: number|null) => void)|null} Mouse coord indicator */
    this.onCoordChange = null;
    /** @type {((state: number) => void)|null} Fired when picking a colour */
    this.onPickColor = null;

    /** @type {string[]} Palette: index 0 = empty (background), 1..15 = colours */
    this.stateColors = [
      '#0f0f1a', // 0 = empty (dark background)
      '#ff6b6b', // 1 = red
      '#4ecdc4', // 2 = teal
      '#ffe66d', // 3 = yellow
      '#a06cd5', // 4 = purple
      '#6c5ce7', // 5 = indigo
      '#ff9ff3', // 6 = pink
      '#54a0ff', // 7 = blue
      '#5f27cd', // 8 = deep purple
      '#00d2d3', // 9 = cyan
      '#ff6348', // 10 = tomato
      '#7bed9f', // 11 = green
      '#eccc68', // 12 = gold
      '#ff4757', // 13 = red (bright)
      '#3742fa', // 14 = blue (bright)
      '#2ed573', // 15 = green (bright)
    ];

    this._setupEvents();
    this._setupResizeObserver();
    /** @type {boolean} Used to centre the grid on first resize */
    this._firstResize = true;
    this.resize();
  }

  /**
   * Set the colour for a specific state index.
   * @param {number} state - State index
   * @param {string} color - CSS colour string
   */
  setStateColor(state, color) {
    this.stateColors[state] = color;
  }

  /**
   * Get the colour for a state index.
   * @param {number} state
   * @returns {string} CSS colour string
   */
  getStateColor(state) {
    return this.stateColors[state] || '#ff6b6b';
  }

  /**
   * Resize the canvas to match its parent element's size.
   * Handles device-pixel ratio for sharp rendering on Retina displays.
   * On first resize the camera is centred on the grid.
   */
  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    // Reset transform before re-scaling (ctx.scale is additive)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;

    // On first resize, centre the grid in the canvas
    if (this._firstResize) {
      this._firstResize = false;
      this.panX = this.grid.width / 2;
      this.panY = this.grid.height / 2;
    }

    this.render();
  }

  /**
   * Set the zoom level, optionally zooming towards a screen-space point.
   * @param {number} zoom - New zoom level (clamped 1–64)
   * @param {number} [centerX] - Screen-space X to zoom towards
   * @param {number} [centerY] - Screen-space Y to zoom towards
   */
  setZoom(zoom, centerX, centerY) {
    const oldZoom = this.zoom;
    this.zoom = Math.max(1, Math.min(64, zoom));

    // Zoom towards cursor position
    if (centerX !== undefined && centerY !== undefined) {
      const worldX = (centerX - this.width / 2) / oldZoom + this.panX;
      const worldY = (centerY - this.height / 2) / oldZoom + this.panY;
      this.panX = worldX - (centerX - this.width / 2) / this.zoom;
      this.panY = worldY - (centerY - this.height / 2) / this.zoom;
    }

    this.render();
    if (this.onZoomChange) this.onZoomChange(this.zoom);
  }

  /**
   * Pan the camera by a delta in screen pixels.
   * @param {number} dx - Screen-space X delta
   * @param {number} dy - Screen-space Y delta
   */
  pan(dx, dy) {
    this.panX -= dx / this.zoom;
    this.panY -= dy / this.zoom;
    this.render();
  }

  /**
   * Convert screen coordinates to grid (world) coordinates.
   * @param {number} sx - Screen X
   * @param {number} sy - Screen Y
   * @returns {{x: number, y: number}}
   */
  screenToGrid(sx, sy) {
    return {
      x: (sx - this.width / 2) / this.zoom + this.panX,
      y: (sy - this.height / 2) / this.zoom + this.panY,
    };
  }

  /**
   * Convert grid (world) coordinates to screen coordinates.
   * @param {number} gx - Grid X
   * @param {number} gy - Grid Y
   * @returns {{x: number, y: number}}
   */
  gridToScreen(gx, gy) {
    return {
      x: (gx - this.panX) * this.zoom + this.width / 2,
      y: (gy - this.panY) * this.zoom + this.height / 2,
    };
  }

  /**
   * Render the entire visible portion of the grid to the canvas.
   *
   * Steps:
   *   1. Clear with the background colour.
   *   2. Determine the visible cell range from camera state.
   *   3. Draw each non-zero cell with its colour.
   *   4. If zoom ≥ 6, draw grid lines clipped to the cell area.
   */
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const cellSize = this.zoom;
    if (cellSize < 1) return;

    // Visible cell range (camera model: screenX = (gridX - panX)*zoom + w/2)
    const halfW = w / (2 * this.zoom);
    const halfH = h / (2 * this.zoom);
    const viewLeft = this.panX - halfW;
    const viewTop = this.panY - halfH;
    const viewRight = this.panX + halfW;
    const viewBottom = this.panY + halfH;

    const startX = Math.max(0, Math.floor(viewLeft));
    const startY = Math.max(0, Math.floor(viewTop));
    const endX = Math.min(this.grid.width, Math.ceil(viewRight));
    const endY = Math.min(this.grid.height, Math.ceil(viewBottom));

    // Grid boundary in screen space
    const cellLeft   = (0 - this.panX) * cellSize + w / 2;
    const cellTop    = (0 - this.panY) * cellSize + h / 2;
    const cellRight  = (this.grid.width - this.panX) * cellSize + w / 2;
    const cellBottom = (this.grid.height - this.panY) * cellSize + h / 2;

    // Clear outer area with a slightly distinct shade so the grid boundary is obvious
    ctx.fillStyle = '#090911';
    ctx.fillRect(0, 0, w, h);

    // Fill the grid rectangle with the proper grid background color
    const gx0 = Math.max(0, Math.floor(cellLeft));
    const gy0 = Math.max(0, Math.floor(cellTop));
    const gx1 = Math.min(w, Math.ceil(cellRight));
    const gy1 = Math.min(h, Math.ceil(cellBottom));
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);

    // Draw cells
    const cells = this.grid.cells;
    const gridW = this.grid.width;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = y * gridW + x;
        const state = cells[idx];
        if (state === 0) continue;

        const sx = (x - this.panX) * cellSize + w / 2;
        const sy = (y - this.panY) * cellSize + h / 2;

        ctx.fillStyle = this.getStateColor(state);

        if (cellSize >= 3) {
          ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(cellSize), Math.ceil(cellSize));
        } else {
          ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
        }
      }
    }

    // Draw grid lines at sufficient zoom, clipped to the cell area
    if (cellSize >= 6) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        Math.floor(cellLeft), Math.floor(cellTop),
        Math.ceil(cellRight - cellLeft), Math.ceil(cellBottom - cellTop)
      );
      ctx.clip();

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;

      // Batch all lines into a single path for performance
      ctx.beginPath();
      for (let x = startX; x <= endX; x++) {
        const sx = Math.floor((x - this.panX) * cellSize + w / 2) + 0.5;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
      }
      for (let y = startY; y <= endY; y++) {
        const sy = Math.floor((y - this.panY) * cellSize + h / 2) + 0.5;
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
      }
      ctx.stroke();

      ctx.restore();
    }

    // Draw a border around the grid so its boundary is always visible
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.floor(cellLeft) + 0.5, Math.floor(cellTop) + 0.5,
      Math.round(cellRight - cellLeft), Math.round(cellBottom - cellTop)
    );
  }

  /**
   * Draw or erase at a grid coordinate (called from mouse events).
   * Delegates to `grid.paint()` with the current tool, colour, brush
   * size, and brush shape, then re-renders.
   * @param {number} gridX
   * @param {number} gridY
   */
  drawAt(gridX, gridY) {
    const x = Math.floor(gridX);
    const y = Math.floor(gridY);

    if (this.tool === 'erase') {
      this.grid.paint(x, y, 0, this.brushSize, this.brushShape);
    } else if (this.tool === 'draw') {
      this.grid.paint(x, y, this.currentColor, this.brushSize, this.brushShape);
    }

    this.render();
    if (this.onDraw) this.onDraw(x, y);
  }

  // ============================================================
  // Event Setup
  // ============================================================

  /** Wire up mouse, wheel, and keyboard events on the canvas. */
  _setupEvents() {
    const canvas = this.canvas;

    // Mouse wheel — zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const zoomFactor = 1 + delta;
      this.setZoom(this.zoom * zoomFactor, mx, my);
    }, { passive: false });

    // Mouse down
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.lastMouseX = mx;
      this.lastMouseY = my;

      if (e.button === 1 || (e.button === 0 && this.tool === 'move')) {
        // Middle click or move tool — pan
        this.isPanning = true;
        canvas.style.cursor = 'grabbing';
      } else if (e.button === 2) {
        // Right click — pick colour or pan
        if (this.tool === 'pick') {
          const gridPos = this.screenToGrid(mx, my);
          const gx = Math.floor(gridPos.x);
          const gy = Math.floor(gridPos.y);
          const state = this.grid.get(gx, gy);
          if (state > 0) {
            this.currentColor = state;
            if (this.onPickColor) this.onPickColor(state);
          }
        } else {
          this.isPanning = true;
          canvas.style.cursor = 'grabbing';
        }
      } else if (e.button === 0) {
        // Left click — draw
        this.isDrawing = true;
        const gridPos = this.screenToGrid(mx, my);
        this.drawAt(gridPos.x, gridPos.y);
      }
    });

    // Mouse move
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Coordinate indicator
      if (this.onCoordChange) {
        const gridPos = this.screenToGrid(mx, my);
        this.onCoordChange(Math.floor(gridPos.x), Math.floor(gridPos.y));
      }

      if (this.isPanning) {
        const dx = mx - this.lastMouseX;
        const dy = my - this.lastMouseY;
        this.pan(dx, dy);
      }

      if (this.isDrawing) {
        const gridPos = this.screenToGrid(mx, my);
        this.drawAt(gridPos.x, gridPos.y);
      }

      this.lastMouseX = mx;
      this.lastMouseY = my;
    });

    // Mouse up
    canvas.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.isDrawing = false;
      canvas.style.cursor = this.tool === 'move' ? 'grab' : 'crosshair';
    });

    // Mouse leave
    canvas.addEventListener('mouseleave', () => {
      this.isPanning = false;
      this.isDrawing = false;
      if (this.onCoordChange) this.onCoordChange(null, null);
    });

    // Context menu prevention
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard shortcuts — number keys for brush size
    document.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '9') {
        this.brushSize = parseInt(e.key);
        const brushInput = document.getElementById('brushSize');
        const brushLabel = document.getElementById('brushSizeLabel');
        if (brushInput) brushInput.value = this.brushSize;
        if (brushLabel) brushLabel.textContent = this.brushSize;
      }
    });
  }

  /** Observe parent element resizing and keep canvas size in sync. */
  _setupResizeObserver() {
    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.canvas.parentElement);
  }
}

window.CanvasRenderer = CanvasRenderer;
