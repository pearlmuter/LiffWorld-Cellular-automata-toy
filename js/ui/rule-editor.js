/**
 * Rule Editor - Modal interface for creating and editing cellular automata rules.
 */
class RuleEditor {
  constructor(simulation, renderer) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.modal = document.getElementById('ruleEditorModal');
    this.overlay = document.getElementById('modalOverlay');
    this.isOpen = false;

    this._setupEvents();
  }

  _setupEvents() {
    // Open rule editor
    document.getElementById('editRuleBtn').addEventListener('click', () => this.open());

    // New rule
    document.getElementById('newRuleBtn').addEventListener('click', () => {
      this.open(true);
    });

    // Close
    document.getElementById('closeRuleEditor').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());

    // Rule type change
    document.getElementById('ruleType').addEventListener('change', (e) => {
      const isVisual = e.target.value === 'visual';
      document.getElementById('bspaceOptions').classList.toggle('hidden', isVisual);
      document.getElementById('visualOptions').classList.toggle('hidden', !isVisual);
    });

    // Save rule
    document.getElementById('saveRuleBtn').addEventListener('click', () => this._saveRule());

    // Delete rule
    document.getElementById('deleteRuleBtn').addEventListener('click', () => this._deleteRule());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  }

  open(isNew = false) {
    this.isOpen = true;
    this.modal.classList.remove('hidden');
    this.overlay.classList.remove('hidden');

    const ruleSelect = document.getElementById('ruleSelect');
    const rule = window.ruleRegistry.get(ruleSelect.value);

    if (isNew || !rule) {
      // Blank slate for new rule
      document.getElementById('ruleName').value = '';
      document.getElementById('ruleType').value = 'bspace';
      document.getElementById('bspaceOptions').classList.remove('hidden');
      document.getElementById('visualOptions').classList.add('hidden');
      document.getElementById('birthInput').value = '3';
      document.getElementById('surviveInput').value = '23';
      document.getElementById('neighborhoodSelect').value = 'moore';
      document.getElementById('statesInput').value = '2';
      this._editingRule = null;
    } else if (rule) {
      // Load existing rule
      document.getElementById('ruleName').value = rule.name;
      document.getElementById('ruleType').value = rule.type || 'bspace';

      if (rule.type === 'bspace') {
        document.getElementById('bspaceOptions').classList.remove('hidden');
        document.getElementById('visualOptions').classList.add('hidden');
        document.getElementById('birthInput').value = (rule.birth || []).join('');
        document.getElementById('surviveInput').value = (rule.survive || []).join('');
        document.getElementById('neighborhoodSelect').value = rule.neighborhood || 'moore';
        document.getElementById('statesInput').value = rule.states || 2;
      } else if (rule.type === 'generations') {
        document.getElementById('bspaceOptions').classList.remove('hidden');
        document.getElementById('visualOptions').classList.add('hidden');
        document.getElementById('birthInput').value = (rule.birth || []).join('');
        document.getElementById('surviveInput').value = (rule.survive || []).join('');
        document.getElementById('neighborhoodSelect').value = rule.neighborhood || 'moore';
        document.getElementById('statesInput').value = rule.states || 3;
      } else if (rule.type === '1d') {
        document.getElementById('bspaceOptions').classList.remove('hidden');
        document.getElementById('visualOptions').classList.add('hidden');
        document.getElementById('birthInput').value = '';
        document.getElementById('surviveInput').value = '';
        document.getElementById('statesInput').value = 2;
      }
      this._editingRule = rule;
    }
  }

  close() {
    this.isOpen = false;
    this.modal.classList.add('hidden');
    this.overlay.classList.add('hidden');
  }

  _saveRule() {
    const name = document.getElementById('ruleName').value.trim();
    if (!name) {
      alert('Please enter a rule name.');
      return;
    }

    const type = document.getElementById('ruleType').value;

    if (type === 'bspace') {
      const birthStr = document.getElementById('birthInput').value;
      const surviveStr = document.getElementById('surviveInput').value;
      const neighborhood = document.getElementById('neighborhoodSelect').value;

      const rule = window.createCustomBspaceRule(name, birthStr, surviveStr, neighborhood);
      window.ruleRegistry.register(rule);

      // Refresh rule select
      this._refreshRuleSelect(name);

      if (this.simulation.currentRule && this.simulation.currentRule.name === name) {
        this.simulation.setRule(rule);
        const display = document.getElementById('ruleDisplay');
        if (display) display.textContent = rule.description || rule.name;
      }
    } else if (type === 'generations') {
      const states = parseInt(document.getElementById('statesInput').value) || 3;
      // For generations rules, create a basic multi-state rule
      const birthStr = document.getElementById('birthInput').value;
      const surviveStr = document.getElementById('surviveInput').value;
      const birth = birthStr.split('').filter(c => c >= '0' && c <= '8').map(Number);
      const survive = surviveStr.split('').filter(c => c >= '0' && c <= '8').map(Number);
      const birthSet = new Set(birth);
      const surviveSet = new Set(survive);

      const rule = {
        name,
        type: 'generations',
        states: Math.max(2, states),
        birth,
        survive,
        neighborhood: document.getElementById('neighborhoodSelect').value,
        description: `Generations B${birthStr}/S${surviveStr}/${states}`,
        step: function(grid) {
          grid.snapshot();
          const { width, height, cells, prevCells } = grid;
          const wrap = grid.wrap || false;
          const maxState = this.states - 1;

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = y * width + x;
              const state = prevCells[idx];

              if (state === 0) {
                // Dead - check birth
                const neighbors = grid.countNeighbors(x, y, wrap);
                cells[idx] = birthSet.has(neighbors) ? 1 : 0;
              } else if (state >= maxState) {
                // Last state - die
                cells[idx] = 0;
              } else {
                // Survive or decay
                const neighbors = grid.countNeighbors(x, y, wrap);
                cells[idx] = surviveSet.has(neighbors) ? state : state + 1;
              }
            }
          }
        },
      };

      window.ruleRegistry.register(rule);
      this._refreshRuleSelect(name);

      if (this.simulation.currentRule && this.simulation.currentRule.name === name) {
        this.simulation.setRule(rule);
      }
    } else if (type === 'visual') {
      // Visual (CellPond-style) rules - create a simple rule for now
      const rule = window.createCustomBspaceRule(name, '3', '23', 'moore');
      rule.type = 'visual';
      rule.description = 'Visual rule (B3/S23)';
      window.ruleRegistry.register(rule);
      this._refreshRuleSelect(name);
    }

    this.close();
  }

  _deleteRule() {
    const name = document.getElementById('ruleName').value.trim();
    if (!name) return;

    // Don't allow deleting built-in rules
    const builtinNames = window.builtinRules.map(r => r.name);
    if (builtinNames.includes(name)) {
      alert('Cannot delete built-in rules.');
      return;
    }

    if (!confirm(`Delete rule "${name}"?`)) return;

    window.ruleRegistry.remove(name);
    this._refreshRuleSelect();

    // Switch to first available rule with full cleanup
    const rules = window.ruleRegistry.getAll();
    if (rules.length > 0) {
      this.simulation.stop();
      this.simulation.setRule(rules[0]);
      this.simulation.generation = 0;
      this.simulation.grid.fill(0);
      this.simulation.grid.syncPrev();

      const display = document.getElementById('ruleDisplay');
      if (display) display.textContent = rules[0].description || rules[0].name;

      const playBtn = document.getElementById('playBtn');
      if (playBtn) {
        playBtn.textContent = '▶';
        playBtn.classList.remove('active');
      }

      // Update pattern library filter
      this._updatePatternFilter(rules[0].name);
    }

    this._updateStatusBar();
    this.renderer.render();
    this.close();
  }

  _refreshRuleSelect(selectName) {
    const select = document.getElementById('ruleSelect');
    const currentValue = select.value;
    select.innerHTML = '';

    window.ruleRegistry.getAll().forEach(rule => {
      const option = document.createElement('option');
      option.value = rule.name;
      option.textContent = rule.name;
      select.appendChild(option);
    });

    if (selectName && window.ruleRegistry.get(selectName)) {
      select.value = selectName;
    }
  }

  _updatePatternFilter(ruleName) {
    const items = document.querySelectorAll('.pattern-item');
    items.forEach(item => {
      const forRule = item.dataset.forRule;
      item.style.display = (forRule && forRule !== ruleName) ? 'none' : '';
    });
  }

  _updateStatusBar() {
    const pop = document.getElementById('stat-population');
    const gen = document.getElementById('stat-generation');
    if (pop) pop.textContent = this.simulation.grid.getPopulation();
    if (gen) gen.textContent = this.simulation.generation;
  }
}

window.RuleEditor = RuleEditor;
