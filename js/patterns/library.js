/**
 * Built-in pattern library for cellular automata.
 * Each pattern is a 2D array where:
 *   0 = dead cell
 *   1+ = colored/state value
 *
 * Patterns are designed for Conway's Game of Life rules.
 */

const patternLibrary = [
  // === Still Lifes ===
  {
    name: 'Block',
    category: 'still-life',
    pattern: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    name: 'Beehive',
    category: 'still-life',
    pattern: [
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [0, 1, 1, 0],
    ],
  },
  {
    name: 'Loaf',
    category: 'still-life',
    pattern: [
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [0, 1, 0, 1],
      [0, 0, 1, 0],
    ],
  },
  {
    name: 'Boat',
    category: 'still-life',
    pattern: [
      [1, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ],
  },
  {
    name: 'Tub',
    category: 'still-life',
    pattern: [
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ],
  },

  // === Oscillators ===
  {
    name: 'Blinker (Period 2)',
    category: 'oscillator',
    pattern: [
      [1, 1, 1],
    ],
  },
  {
    name: 'Toad (Period 2)',
    category: 'oscillator',
    pattern: [
      [0, 1, 1, 1],
      [1, 1, 1, 0],
    ],
  },
  {
    name: 'Beacon (Period 2)',
    category: 'oscillator',
    pattern: [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
    ],
  },
  {
    name: 'Pulsar (Period 3)',
    category: 'oscillator',
    pattern: [
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
    ],
  },
  {
    name: 'Pentadecathlon (P15)',
    category: 'oscillator',
    pattern: [
      [0,1,1,1,0,0,0,1,1,1,0],
      [1,0,0,0,1,0,1,0,0,0,1],
      [0,1,1,1,0,0,0,1,1,1,0],
    ],
  },

  // === Spaceships ===
  {
    name: 'Glider',
    category: 'spaceship',
    pattern: [
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  {
    name: 'Lightweight Spaceship',
    category: 'spaceship',
    pattern: [
      [1, 0, 0, 1, 0],
      [0, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [0, 1, 1, 1, 1],
      [0, 0, 0, 0, 0],
    ],
  },
  {
    name: 'Middleweight Spaceship',
    category: 'spaceship',
    pattern: [
      [0, 0, 1, 1, 1, 1],
      [1, 1, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [0, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0],
    ],
  },
  {
    name: 'Heavyweight Spaceship',
    category: 'spaceship',
    pattern: [
      [0, 0, 1, 1, 1, 0, 1],
      [1, 1, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [0, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0],
    ],
  },

  // === Methuselahs ===
  {
    name: 'R-pentomino',
    category: 'methuselah',
    pattern: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  },
  {
    name: 'Diehard',
    category: 'methuselah',
    pattern: [
      [0, 0, 0, 0, 0, 0, 1, 0],
      [1, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    name: 'Acorn',
    category: 'methuselah',
    pattern: [
      [0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 0, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0],
    ],
  },

  // === Guns ===
  {
    name: 'Gosper Glider Gun',
    category: 'gun',
    pattern: [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
      [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
      [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    ],
  },

  // === Random Fill ===
  {
    name: 'Random 30%',
    category: 'utility',
    pattern: null, // special - generates random
    randomize: true,
  },

  // === WireWorld Patterns ===
  {
    name: 'Wire: AND Gate',
    category: 'wireworld',
    pattern: [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ],
    forRule: 'WireWorld',
  },
  {
    name: 'Wire: Diode',
    category: 'wireworld',
    pattern: [
      [0, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    forRule: 'WireWorld',
  },

  // === Seeds Patterns ===
  {
    name: 'Seeds: Flower',
    category: 'seeds',
    pattern: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ],
    forRule: 'Seeds',
  },

  // === Brian's Brain Patterns ===
  {
    name: 'Brain: Dot',
    category: 'brians-brain',
    pattern: [
      [1],
    ],
    forRule: "Brian's Brain",
  },
];

// === Helper: Create pattern preview canvas ===
function renderPatternPreview(pattern, size = 40) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!pattern || pattern.length === 0) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  const h = pattern.length;
  const w = Math.max(...pattern.map(r => r.length));
  const cellSize = Math.floor(Math.min(size / w, size / h));

  // Background
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, size, size);

  // Cells
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a06cd5', '#6c5ce7', '#ff9ff3', '#54a0ff', '#5f27cd'];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < pattern[y].length; x++) {
      const val = pattern[y][x];
      if (val > 0) {
        ctx.fillStyle = colors[(val - 1) % colors.length];
        ctx.fillRect(
          (size - w * cellSize) / 2 + x * cellSize,
          (size - h * cellSize) / 2 + y * cellSize,
          cellSize,
          cellSize
        );
      }
    }
  }

  return canvas;
}

window.patternLibrary = patternLibrary;
window.renderPatternPreview = renderPatternPreview;
