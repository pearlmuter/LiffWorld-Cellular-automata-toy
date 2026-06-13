/**
 * Save/Load management - handles project serialization, file I/O, and PNG export.
 */

class StorageManager {
  constructor(simulation, renderer) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.currentFilePath = null;

    this._setupMenuListeners();
  }

  _setupMenuListeners() {
    if (window.api) {
      window.api.onMenuNew(() => {
        this.simulation.reset();
        this.renderer.render();
        this.currentFilePath = null;
      });
      window.api.onFileSave(() => this.save());
      window.api.onFileSaveAs(() => this.saveAs());
      window.api.onFileLoad((data) => this.load(data));
      window.api.onFileExportPng(() => this.exportPNG());
      window.api.onEditUndo(() => this._restoreSnapshot());
      window.api.onEditClear(() => {
        this.simulation.reset();
        this.renderer.render();
      });
      window.api.onEditRandom(() => {
        const maxStates = this.simulation.currentRule ? this.simulation.currentRule.states : 2;
        this.simulation.grid.randomize(0.3, maxStates);
        this.simulation.grid.syncPrev();
        this.simulation.generation = 0;
        this.renderer.render();
      });
    }
  }

  // ============================================================
  // Project Serialization
  // ============================================================
  _serialize() {
    const grid = this.simulation.grid;
    const rule = this.simulation.currentRule;

    const data = {
      version: 1,
      name: 'Cellular Playground Project',
      createdAt: new Date().toISOString(),
      grid: {
        width: grid.width,
        height: grid.height,
        cells: grid.serialize(),
      },
      rule: null,
      settings: {
        generation: this.simulation.generation,
      },
    };

    if (rule) {
      data.rule = {
        name: rule.name,
        type: rule.type || 'bspace',
        birth: rule.birth || [],
        survive: rule.survive || [],
        states: rule.states || 2,
        neighborhood: rule.neighborhood || 'moore',
        description: rule.description || '',
      };
    }

    return JSON.stringify(data, null, 2);
  }

  _deserialize(jsonStr) {
    const data = JSON.parse(jsonStr);
    const grid = this.simulation.grid;

    // Restore grid
    if (data.grid) {
      grid.deserialize(data.grid.cells, data.grid.width, data.grid.height);
      grid.syncPrev();
    }

    // Restore rule
    if (data.rule) {
      const existingRule = window.ruleRegistry.get(data.rule.name);
      if (existingRule) {
        this.simulation.setRule(existingRule);
      } else {
        // Recreate custom rule from data
        const rule = window.createCustomBspaceRule(
          data.rule.name,
          (data.rule.birth || []).join(''),
          (data.rule.survive || []).join(''),
          data.rule.neighborhood || 'moore'
        );
        window.ruleRegistry.register(rule);
        this.simulation.setRule(rule);
      }

      // Update rule select dropdown
      const ruleSelect = document.getElementById('ruleSelect');
      if (ruleSelect) {
        ruleSelect.value = data.rule.name;
      }
      const display = document.getElementById('ruleDisplay');
      if (display && data.rule.description) {
        display.textContent = data.rule.description;
      }
    }

    // Restore generation
    this.simulation.generation = data.settings?.generation || 0;

    // Update UI
    this.renderer.render();
  }

  // ============================================================
  // Save / Load
  // ============================================================
  async save() {
    if (this.currentFilePath) {
      const data = this._serialize();
      await window.api.writeFile(this.currentFilePath, data);
    } else {
      await this.saveAs();
    }
  }

  async saveAs() {
    const result = await window.api.showSaveDialog();
    if (result.canceled) return;

    this.currentFilePath = result.filePath;
    const data = this._serialize();
    await window.api.writeFile(result.filePath, data);
  }

  load(jsonStr) {
    try {
      this._deserialize(jsonStr);
    } catch (e) {
      console.error('Failed to load project:', e);
    }
  }

  _restoreSnapshot() {
    // Simple undo: swap cells and prevCells
    const grid = this.simulation.grid;
    const temp = new Uint8Array(grid.cells);
    grid.cells.set(grid.prevCells);
    grid.prevCells.set(temp);
    this.renderer.render();
  }

  // ============================================================
  // PNG Export
  // ============================================================
  async exportPNG() {
    const grid = this.simulation.grid;

    // Create offscreen canvas at the grid resolution
    const canvas = document.createElement('canvas');
    const cellSize = Math.max(2, Math.min(20, 800 / Math.max(grid.width, grid.height)));
    canvas.width = grid.width * cellSize;
    canvas.height = grid.height * cellSize;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cells
    const stateColors = this.renderer.stateColors;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const state = grid.cells[y * grid.width + x];
        if (state === 0) continue;
        ctx.fillStyle = stateColors[state] || '#ff6b6b';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Convert to buffer and save
    canvas.toBlob(async (blob) => {
      const result = await window.api.showSavePngDialog();
      if (result.canceled) return;

      const buffer = await blob.arrayBuffer();
      await window.api.writeFileBuffer(result.filePath, buffer);
    }, 'image/png');
  }
}

window.StorageManager = StorageManager;
