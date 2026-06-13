/**
 * Tests for the Grid data structure.
 *
 * Grid is loaded from js/engine/grid.js via eval in beforeAll.
 * Access via window.Grid since class declarations in eval() are
 * local to the beforeAll callback scope.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dir, '..');

beforeAll(() => {
  globalThis.window = globalThis.window || {};
  eval(readFileSync(join(root, 'js/engine/grid.js'), 'utf-8'));
});

// ---- Construction ----

describe('Grid construction', () => {
  test('default dimensions are 100x100', () => {
    const g = new window.Grid();
    expect(g.width).toBe(100);
    expect(g.height).toBe(100);
    expect(g.cells.length).toBe(10000);
  });

  test('custom dimensions', () => {
    const g = new window.Grid(20, 15);
    expect(g.width).toBe(20);
    expect(g.height).toBe(15);
    expect(g.cells.length).toBe(300);
  });

  test('all cells start at state 0', () => {
    const g = new window.Grid(10, 10);
    for (let i = 0; i < g.cells.length; i++) {
      expect(g.cells[i]).toBe(0);
    }
  });
});

// ---- getIndex ----

describe('getIndex', () => {
  test('returns flat index for valid coordinates', () => {
    const g = new window.Grid(10, 10);
    expect(g.getIndex(0, 0)).toBe(0);
    expect(g.getIndex(9, 0)).toBe(9);
    expect(g.getIndex(0, 1)).toBe(10);
    expect(g.getIndex(5, 7)).toBe(75);
  });

  test('returns -1 for out-of-bounds', () => {
    const g = new window.Grid(10, 10);
    expect(g.getIndex(-1, 0)).toBe(-1);
    expect(g.getIndex(0, -1)).toBe(-1);
    expect(g.getIndex(10, 0)).toBe(-1);
    expect(g.getIndex(0, 10)).toBe(-1);
  });
});

// ---- get / set ----

describe('get and set', () => {
  test('set and get a cell value', () => {
    const g = new window.Grid(10, 10);
    g.set(3, 4, 5);
    expect(g.get(3, 4)).toBe(5);
  });

  test('set outside bounds does nothing', () => {
    const g = new window.Grid(10, 10);
    g.set(20, 20, 5);
    expect(g.get(20, 20)).toBe(0);
  });

  test('get outside bounds returns 0', () => {
    const g = new window.Grid(10, 10);
    expect(g.get(-1, 0)).toBe(0);
  });
});

// ---- wrapCoord ----

describe('wrapCoord', () => {
  test('wraps positive overflow', () => {
    const g = new window.Grid(10, 10);
    expect(g.wrapCoord(10, 5)).toEqual({ x: 0, y: 5 });
    expect(g.wrapCoord(5, 10)).toEqual({ x: 5, y: 0 });
  });

  test('wraps negative values', () => {
    const g = new window.Grid(10, 10);
    expect(g.wrapCoord(-1, 0)).toEqual({ x: 9, y: 0 });
    expect(g.wrapCoord(0, -1)).toEqual({ x: 0, y: 9 });
  });

  test('identity for in-bounds', () => {
    const g = new window.Grid(10, 10);
    expect(g.wrapCoord(5, 5)).toEqual({ x: 5, y: 5 });
  });
});

// ---- getWrapped / getPrevWrapped ----

describe('getWrapped', () => {
  test('returns cell value with wrapping enabled', () => {
    const g = new window.Grid(10, 10);
    g.set(9, 0, 7);
    expect(g.getWrapped(9, 0, true)).toBe(7);
    expect(g.getWrapped(-1, 0, true)).toBe(7); // wraps to (9, 0)
  });

  test('returns 0 for out-of-bounds when wrap is false', () => {
    const g = new window.Grid(10, 10);
    expect(g.getWrapped(-1, 0, false)).toBe(0);
  });
});

describe('getPrevWrapped', () => {
  test('reads from prevCells, not cells', () => {
    const g = new window.Grid(10, 10);
    g.set(3, 3, 5);
    // prevCells is still 0 (we haven't snapshot)
    expect(g.getPrevWrapped(3, 3, false)).toBe(0);
    // After snapshot prevCells gets the value
    g.snapshot();
    expect(g.getPrevWrapped(3, 3, false)).toBe(5);
    // Now change cells but not prev
    g.set(3, 3, 9);
    expect(g.getPrevWrapped(3, 3, false)).toBe(5); // still old value
    expect(g.get(3, 3)).toBe(9); // current is new
  });

  test('wrapping works on prevCells', () => {
    const g = new window.Grid(10, 10);
    g.set(0, 0, 3);
    g.snapshot();
    expect(g.getPrevWrapped(10, 0, true)).toBe(3);
    expect(g.getPrevWrapped(0, 10, true)).toBe(3);
  });
});

// ---- countNeighbors (Moore) ----

describe('countNeighbors (Moore)', () => {
  test('empty cell has 0 neighbours', () => {
    const g = new window.Grid(10, 10);
    g.snapshot();
    expect(g.countNeighbors(5, 5, false)).toBe(0);
  });

  test('counts 8 neighbours in a full block', () => {
    const g = new window.Grid(10, 10);
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        g.set(x, y, 1);
      }
    }
    g.snapshot();
    expect(g.countNeighbors(2, 2, false)).toBe(8);
  });

  test('counts 3 neighbours for a corner cell', () => {
    const g = new window.Grid(10, 10);
    g.set(0, 0, 1);
    g.set(1, 0, 1);
    g.set(0, 1, 1);
    g.snapshot();
    expect(g.countNeighbors(1, 1, false)).toBe(3);
  });

  test('counts neighbours across wrapped edge', () => {
    const g = new window.Grid(10, 10);
    g.set(9, 9, 1);
    g.set(0, 9, 1);
    g.set(9, 0, 1);
    g.snapshot();
    expect(g.countNeighbors(0, 0, true)).toBe(3);
  });
});

// ---- countNeighborsVonNeumann ----

describe('countNeighborsVonNeumann', () => {
  test('0 neighbours in empty grid', () => {
    const g = new window.Grid(10, 10);
    g.snapshot();
    expect(g.countNeighborsVonNeumann(5, 5, false)).toBe(0);
  });

  test('counts N, S, E, W only', () => {
    const g = new window.Grid(10, 10);
    g.set(4, 5, 1); // W
    g.set(6, 5, 1); // E
    g.set(5, 4, 1); // N
    g.set(5, 6, 1); // S
    g.set(4, 4, 1); // diagonal — should NOT count
    g.snapshot();
    expect(g.countNeighborsVonNeumann(5, 5, false)).toBe(4);
  });
});

// ---- getNeighborStates ----

describe('getNeighborStates', () => {
  test('returns 8 values in Moore order', () => {
    const g = new window.Grid(10, 10);
    g.set(0, 0, 1);
    g.set(1, 0, 2);
    g.set(2, 0, 3);
    g.snapshot();
    const states = g.getNeighborStates(1, 1, true);
    expect(states.length).toBe(8);
    expect(states[0]).toBe(1); // (-1,-1)
    expect(states[1]).toBe(2); // (0,-1)
    expect(states[2]).toBe(3); // (1,-1)
  });
});

// ---- snapshot / syncPrev ----

describe('snapshot and syncPrev', () => {
  test('snapshot copies cells to prevCells', () => {
    const g = new window.Grid(10, 10);
    g.set(0, 0, 5);
    g.snapshot();
    expect(g.prevCells[0]).toBe(5);
  });

  test('syncPrev copies cells to prevCells', () => {
    const g = new window.Grid(10, 10);
    g.set(0, 0, 3);
    g.syncPrev();
    expect(g.prevCells[0]).toBe(3);
  });
});

// ---- resize ----

describe('resize', () => {
  test('smaller grid retains overlapping content', () => {
    const g = new window.Grid(10, 10);
    g.set(0, 0, 1);
    g.set(9, 9, 2);
    g.resize(5, 5);
    expect(g.width).toBe(5);
    expect(g.height).toBe(5);
    expect(g.get(0, 0)).toBe(1);
    expect(g.get(4, 4)).toBe(0);
  });

  test('larger grid pads with zeros', () => {
    const g = new window.Grid(5, 5);
    g.fill(1);
    g.resize(10, 10);
    expect(g.get(0, 0)).toBe(1);
    expect(g.get(9, 9)).toBe(0);
  });

  test('resets prevCells', () => {
    const g = new window.Grid(5, 5);
    g.set(0, 0, 1);
    g.snapshot();
    g.resize(10, 10);
    expect(g.prevCells[0]).toBe(0);
  });
});

// ---- fill ----

describe('fill', () => {
  test('fills entire grid with given value', () => {
    const g = new window.Grid(5, 5);
    g.fill(3);
    for (let i = 0; i < g.cells.length; i++) {
      expect(g.cells[i]).toBe(3);
    }
  });

  test('fill(0) clears the grid', () => {
    const g = new window.Grid(5, 5);
    g.fill(1);
    g.fill(0);
    for (let i = 0; i < g.cells.length; i++) {
      expect(g.cells[i]).toBe(0);
    }
  });
});

// ---- randomize ----

describe('randomize', () => {
  test('density=0 produces no live cells', () => {
    const g = new window.Grid(50, 50);
    g.randomize(0);
    expect(g.getPopulation()).toBe(0);
  });

  test('density=1 fills all cells', () => {
    const g = new window.Grid(50, 50);
    g.randomize(1);
    expect(g.getPopulation()).toBe(2500);
  });

  test('uses correct number of states', () => {
    const g = new window.Grid(100, 1);
    g.randomize(1, 4);
    let hasState3 = false;
    for (let i = 0; i < g.cells.length; i++) {
      const v = g.cells[i];
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(3);
      if (v === 3) hasState3 = true;
    }
    expect(hasState3).toBe(true);
  });
});

// ---- paint ----

describe('paint', () => {
  test('paints a single cell (brushSize=1)', () => {
    const g = new window.Grid(10, 10);
    g.paint(5, 5, 2, 1, 'square');
    expect(g.get(5, 5)).toBe(2);
  });

  test('paints a 3x3 square', () => {
    const g = new window.Grid(10, 10);
    g.paint(5, 5, 1, 3, 'square');
    for (let y = 4; y <= 6; y++) {
      for (let x = 4; x <= 6; x++) {
        expect(g.get(x, y)).toBe(1);
      }
    }
    expect(g.get(3, 3)).toBe(0);
  });

  test('circular brush excludes corners', () => {
    const g = new window.Grid(10, 10);
    g.paint(5, 5, 1, 5, 'circle');
    expect(g.get(3, 3)).toBe(0);
    expect(g.get(5, 5)).toBe(1);
  });
});

// ---- paste ----

describe('paste', () => {
  test('pastes a 2D pattern', () => {
    const g = new window.Grid(10, 10);
    const pattern = [
      [1, 0, 1],
      [0, 1, 0],
      [1, 0, 1],
    ];
    g.paste(2, 2, pattern);
    expect(g.get(2, 2)).toBe(1);
    expect(g.get(3, 2)).toBe(0);
    expect(g.get(4, 2)).toBe(1);
    expect(g.get(3, 3)).toBe(1);
    expect(g.get(2, 4)).toBe(1);
  });

  test('skips zero and undefined values', () => {
    const g = new window.Grid(10, 10);
    const pattern = [
      [0, 1],
      [undefined, 2],
    ];
    g.paste(0, 0, pattern);
    expect(g.get(0, 0)).toBe(0);
    expect(g.get(1, 0)).toBe(1);
    expect(g.get(0, 1)).toBe(0);
    expect(g.get(1, 1)).toBe(2);
  });
});

// ---- getRegion ----

describe('getRegion', () => {
  test('returns rectangular subgrid', () => {
    const g = new window.Grid(10, 10);
    g.set(1, 1, 3);
    g.set(2, 1, 4);
    const region = g.getRegion(1, 1, 2, 2);
    expect(region).toEqual([
      [3, 4],
      [0, 0],
    ]);
  });
});

// ---- getPopulation ----

describe('getPopulation', () => {
  test('empty grid has population 0', () => {
    const g = new window.Grid(10, 10);
    expect(g.getPopulation()).toBe(0);
  });

  test('counts non-zero cells', () => {
    const g = new window.Grid(10, 10);
    g.set(0, 0, 1);
    g.set(5, 5, 2);
    g.set(5, 5, 0); // overwrite back to 0
    expect(g.getPopulation()).toBe(1);
  });
});

// ---- serialize / deserialize ----

describe('serialize / deserialize', () => {
  test('roundtrip produces identical grid', () => {
    const g = new window.Grid(5, 5);
    g.set(0, 0, 1);
    g.set(2, 3, 9);
    g.set(4, 4, 15);
    const str = g.serialize();

    const g2 = new window.Grid();
    g2.deserialize(str, 5, 5);
    expect(g2.width).toBe(5);
    expect(g2.height).toBe(5);
    expect(g2.get(0, 0)).toBe(1);
    expect(g2.get(2, 3)).toBe(9);
    expect(g2.get(4, 4)).toBe(15);
    expect(g2.get(4, 0)).toBe(0);
  });
});
