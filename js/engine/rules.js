/**
 * Cellular automata rule definitions and step-function generators.
 *
 * This module provides:
 *   - The {@link RuleRegistry} class for storing and looking up named rules.
 *   - 17 built-in rules covering 2-state B/S rules, multi-state CAs
 *     (Brian's Brain, WireWorld), and 1D elementary rules.
 *   - Factory functions that create optimised step closures:
 *     {@link createBspaceStep}, {@link createBriansBrainStep},
 *     {@link createWireWorldStep}, {@link create1DStep}.
 *   - {@link createCustomBspaceRule} for interactive rule creation.
 *
 * Each rule object conforms to:
 *   { name, type, states, neighborhood, description, step(grid) }
 */

// ============================================================
// Rule Registry
// ============================================================

/**
 * A simple registry that stores named rules and allows lookup by name.
 * Rules are indexed on insertion; registering a rule with an existing name
 * silently replaces the previous entry.
 */
class RuleRegistry {
  constructor() {
    /** @type {import('./rules').Rule[]} */
    this.rules = [];
  }

  /**
   * Register a rule. If a rule with the same name already exists it is
   * replaced (useful for live-edited custom rules).
   * @param {import('./rules').Rule} rule
   */
  register(rule) {
    const idx = this.rules.findIndex(r => r.name === rule.name);
    if (idx >= 0) {
      this.rules[idx] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  /**
   * Look up a rule by name.
   * @param {string} name
   * @returns {import('./rules').Rule|undefined}
   */
  get(name) {
    return this.rules.find(r => r.name === name);
  }

  /**
   * Return all registered rules.
   * @returns {import('./rules').Rule[]}
   */
  getAll() {
    return this.rules;
  }

  /**
   * Remove a rule by name.
   * @param {string} name
   */
  remove(name) {
    this.rules = this.rules.filter(r => r.name !== name);
  }

  /**
   * Return just the names of all registered rules.
   * @returns {string[]}
   */
  getNames() {
    return this.rules.map(r => r.name);
  }
}

// ============================================================
// Built-in Rules
// ============================================================

/** @type {import('./rules').Rule[]} */
const builtinRules = [
  // --- Conway's Game of Life ---
  {
    name: "Conway's Game of Life",
    type: 'bspace',
    birth: [3],
    survive: [2, 3],
    states: 2,
    neighborhood: 'moore',
    description: 'B3/S23 - The classic',
    step: createBspaceStep([3], [2, 3], 'moore'),
  },

  // --- HighLife ---
  {
    name: 'HighLife',
    type: 'bspace',
    birth: [3, 6],
    survive: [2, 3],
    states: 2,
    neighborhood: 'moore',
    description: 'B36/S23 - Like Life but with a self-replicating pattern',
    step: createBspaceStep([3, 6], [2, 3], 'moore'),
  },

  // --- Seeds ---
  {
    name: 'Seeds',
    type: 'bspace',
    birth: [2],
    survive: [],
    states: 2,
    neighborhood: 'moore',
    description: 'B2/S - Explosive growth pattern',
    step: createBspaceStep([2], [], 'moore'),
  },

  // --- Brian's Brain ---
  {
    name: "Brian's Brain",
    type: 'generations',
    states: 3,
    neighborhood: 'moore',
    description: '3-state CA with excitation, refractory, resting',
    step: createBriansBrainStep(),
  },

  // --- WireWorld ---
  {
    name: 'WireWorld',
    type: 'generations',
    states: 4,
    neighborhood: 'moore',
    description: '4-state CA simulating digital circuits',
    step: createWireWorldStep(),
  },

  // --- Day & Night ---
  {
    name: 'Day & Night',
    type: 'bspace',
    birth: [3, 6, 7, 8],
    survive: [3, 4, 6, 7, 8],
    states: 2,
    neighborhood: 'moore',
    description: 'B3678/S34678 - Symmetric rule',
    step: createBspaceStep([3, 6, 7, 8], [3, 4, 6, 7, 8], 'moore'),
  },

  // --- Life Without Death ---
  {
    name: 'Life Without Death',
    type: 'bspace',
    birth: [3],
    survive: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    states: 2,
    neighborhood: 'moore',
    description: 'B3/S012345678 - Cells never die!',
    step: createBspaceStep([3], [0, 1, 2, 3, 4, 5, 6, 7, 8], 'moore'),
  },

  // --- 2x2 ---
  {
    name: '2x2',
    type: 'bspace',
    birth: [3],
    survive: [1, 2, 5],
    states: 2,
    neighborhood: 'moore',
    description: 'B3/S125 - Blocks of 2x2 are stable',
    step: createBspaceStep([3], [1, 2, 5], 'moore'),
  },

  // --- Coral ---
  {
    name: 'Coral',
    type: 'bspace',
    birth: [3],
    survive: [4, 5, 6, 7, 8],
    states: 2,
    neighborhood: 'moore',
    description: 'B3/S45678 - Dense coral-like growth',
    step: createBspaceStep([3], [4, 5, 6, 7, 8], 'moore'),
  },

  // --- Move ---
  {
    name: 'Move',
    type: 'bspace',
    birth: [3, 6, 8],
    survive: [2, 4, 5],
    states: 2,
    neighborhood: 'moore',
    description: 'B368/S245 - Interesting moving patterns',
    step: createBspaceStep([3, 6, 8], [2, 4, 5], 'moore'),
  },

  // --- Rule 30 (1D) ---
  {
    name: 'Rule 30 (1D)',
    type: '1d',
    states: 2,
    neighborhood: '1d',
    description: 'Wolfram Rule 30 - Chaotic 1D CA',
    step: create1DStep(30),
  },

  // --- Rule 90 (1D) ---
  {
    name: 'Rule 90 (1D)',
    type: '1d',
    states: 2,
    neighborhood: '1d',
    description: 'Wolfram Rule 90 - Sierpinski triangle',
    step: create1DStep(90),
  },

  // --- Rule 110 (1D) ---
  {
    name: 'Rule 110 (1D)',
    type: '1d',
    states: 2,
    neighborhood: '1d',
    description: 'Wolfram Rule 110 - Turing complete',
    step: create1DStep(110),
  },

  // --- Von Neumann Life (using von Neumann neighborhood) ---
  {
    name: 'Von Neumann Life',
    type: 'bspace',
    birth: [3],
    survive: [2, 3],
    states: 2,
    neighborhood: 'von-neumann',
    description: 'B3/S23 with von Neumann neighborhood',
    step: createBspaceStep([3], [2, 3], 'von-neumann'),
  },

  // --- Star Wars ---
  {
    name: 'Star Wars',
    type: 'bspace',
    birth: [2],
    survive: [3, 4, 5],
    states: 2,
    neighborhood: 'moore',
    description: 'B2/S345 - Long-lived chaotic patterns',
    step: createBspaceStep([2], [3, 4, 5], 'moore'),
  },

  // --- Diamoeba ---
  {
    name: 'Diamoeba',
    type: 'bspace',
    birth: [3, 5, 6, 7, 8],
    survive: [5, 6, 7, 8],
    states: 2,
    neighborhood: 'moore',
    description: 'B35678/S5678 - Forms diamond-like blobs',
    step: createBspaceStep([3, 5, 6, 7, 8], [5, 6, 7, 8], 'moore'),
  },
];

// ============================================================
// Step Generators
// ============================================================

/**
 * Create a step function for a B/S-notation rule.
 *
 * Each cell is evaluated against the birth and survive sets using
 * the specified neighborhood. The returned function mutates the grid
 * in-place after calling `grid.snapshot()`.
 *
 * @param {number[]} birth   - Neighbour counts that cause birth (0→1)
 * @param {number[]} survive - Neighbour counts that let a cell survive
 * @param {'moore'|'von-neumann'} neighborhood - Neighbourhood shape
 * @returns {(grid: import('./grid').Grid) => void} Step function
 */
function createBspaceStep(birth, survive, neighborhood) {
  const birthSet = new Set(birth);
  const surviveSet = new Set(survive);

  return function (grid) {
    grid.snapshot();
    const { width, height, cells, prevCells } = grid;
    const wrap = grid.wrap || false;

    // Determine neighbourhood function
    const countFn = neighborhood === 'von-neumann'
      ? (x, y) => grid.countNeighborsVonNeumann(x, y, wrap)
      : (x, y) => grid.countNeighbors(x, y, wrap);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const state = prevCells[idx];
        const neighbors = countFn(x, y);

        if (state === 0) {
          // Dead cell → birth if neighbour count is in birth set
          cells[idx] = birthSet.has(neighbors) ? 1 : 0;
        } else {
          // Live cell → survive if neighbour count is in survive set
          cells[idx] = surviveSet.has(neighbors) ? 1 : 0;
        }
      }
    }
  };
}

/**
 * Create a step function for Brian's Brain (3-state CA).
 *
 * States:
 *   0 = resting (off)
 *   1 = excited (on)
 *   2 = refractory (dying)
 *
 * A resting cell becomes excited iff it has exactly 2 excited neighbours.
 * Excited → refractory; refractory → resting; unconditionally.
 *
 * @returns {(grid: import('./grid').Grid) => void} Step function
 */
function createBriansBrainStep() {
  return function (grid) {
    grid.snapshot();
    const { width, height, cells, prevCells } = grid;
    const wrap = grid.wrap || false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const state = prevCells[idx];

        if (state === 0) {
          // Resting → count exactly 2 excited neighbours (state 1)
          let excited = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = wrap ? (((x + dx) % width) + width) % width : x + dx;
              const ny = wrap ? (((y + dy) % height) + height) % height : y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              if (prevCells[ny * width + nx] === 1) excited++;
            }
          }
          cells[idx] = excited === 2 ? 1 : 0;
        } else if (state === 1) {
          cells[idx] = 2; // Excited → Refractory
        } else {
          cells[idx] = 0; // Refractory → Resting
        }
      }
    }
  };
}

/**
 * Create a step function for WireWorld (4-state CA simulating digital
 * circuits).
 *
 * States:
 *   0 = empty / background (stays empty)
 *   1 = wire (conductor)
 *   2 = electron head
 *   3 = electron tail
 *
 * Wire becomes head if it has 1 or 2 head neighbours.
 * Head → tail → wire (propagation cycle).
 *
 * @returns {(grid: import('./grid').Grid) => void} Step function
 */
function createWireWorldStep() {
  return function (grid) {
    grid.snapshot();
    const { width, height, cells, prevCells } = grid;
    const wrap = grid.wrap || false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const state = prevCells[idx];

        if (state === 0) {
          cells[idx] = 0; // Empty stays empty
        } else if (state === 1) {
          // Wire → count neighbouring electron heads (state 2)
          let heads = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = wrap ? ((x + dx % width) + width) % width : x + dx;
              const ny = wrap ? ((y + dy % height) + height) % height : y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              if (prevCells[ny * width + nx] === 2) heads++;
            }
          }
          cells[idx] = (heads === 1 || heads === 2) ? 2 : 1;
        } else if (state === 2) {
          cells[idx] = 3; // Head → Tail
        } else {
          cells[idx] = 1; // Tail → Wire
        }
      }
    }
  };
}

/**
 * Create a step function for a 1-D elementary cellular automaton
 * (Wolfram code style).
 *
 * The grid is interpreted as rows of a space-time diagram. Each step:
 *   1. Shift all rows up by one (discarding the top row).
 *   2. Compute the new bottom row from the old bottom row using the
 *      Wolfram rule table (3-cell neighbourhood: left, centre, right).
 *
 * @param {number} wolframCode - Wolfram rule number (0–255), e.g. 30, 90, 110
 * @returns {(grid: import('./grid').Grid) => void} Step function
 */
function create1DStep(wolframCode) {
  // Convert Wolfram code to rule table (8 entries, index = 3-bit pattern)
  const ruleTable = [];
  for (let i = 0; i < 8; i++) {
    ruleTable[i] = (wolframCode >> i) & 1;
  }

  return function (grid) {
    grid.snapshot();
    const { width, height, cells, prevCells } = grid;

    // Shift all rows up by 1 (discard row 0, shift rows 1..height-1 up)
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width; x++) {
        cells[y * width + x] = prevCells[(y + 1) * width + x];
      }
    }

    // Compute the new bottom row from the last original row
    const lastRow = height - 1;
    for (let x = 0; x < width; x++) {
      const left   = prevCells[lastRow * width + ((x - 1 + width) % width)];
      const center = prevCells[lastRow * width + x];
      const right  = prevCells[lastRow * width + ((x + 1) % width)];
      const ruleIdx = (left << 2) | (center << 1) | right;
      cells[lastRow * width + x] = ruleTable[ruleIdx];
    }
  };
}

// ============================================================
// Create custom rule from B/S notation
// ============================================================

/**
 * Create a full rule object from B/S notation strings.
 *
 * Designed for the interactive rule editor — parses birth and survive
 * digit strings (e.g. `"3"`, `"23"`, `"3678"`) and produces a rule
 * object with an optimised step closure, ready for registration.
 *
 * @param {string} name - Display name for the rule
 * @param {string} birthStr - Digits for birth counts, e.g. `"3"`
 * @param {string} surviveStr - Digits for survive counts, e.g. `"23"`
 * @param {'moore'|'von-neumann'} [neighborhood='moore'] - Neighbourhood shape
 * @returns {import('./rules').Rule} Complete rule object
 */
function createCustomBspaceRule(name, birthStr, surviveStr, neighborhood = 'moore') {
  const birth = birthStr.split('').filter(c => c >= '0' && c <= '8').map(Number);
  const survive = surviveStr.split('').filter(c => c >= '0' && c <= '8').map(Number);
  const birthSet = new Set(birth);
  const surviveSet = new Set(survive);

  return {
    name,
    type: 'bspace',
    birth,
    survive,
    states: 2,
    neighborhood,
    description: `B${birthStr}/S${surviveStr}`,
    step: function (grid) {
      grid.snapshot();
      const { width, height, cells, prevCells } = grid;
      const wrap = grid.wrap || false;

      const countFn = neighborhood === 'von-neumann'
        ? (x, y) => grid.countNeighborsVonNeumann(x, y, wrap)
        : (x, y) => grid.countNeighbors(x, y, wrap);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const state = prevCells[idx];
          const neighbors = countFn(x, y);

          if (state === 0) {
            cells[idx] = birthSet.has(neighbors) ? 1 : 0;
          } else {
            cells[idx] = surviveSet.has(neighbors) ? 1 : 0;
          }
        }
      }
    },
  };
}

// ============================================================
// Initialise registry with built-in rules
// ============================================================

/** @type {RuleRegistry} */
const ruleRegistry = new RuleRegistry();
builtinRules.forEach(r => ruleRegistry.register(r));

// Export to window for <script> tag consumption
window.ruleRegistry = ruleRegistry;
window.RuleRegistryClass = RuleRegistry;
window.createCustomBspaceRule = createCustomBspaceRule;
window.builtinRules = builtinRules;
