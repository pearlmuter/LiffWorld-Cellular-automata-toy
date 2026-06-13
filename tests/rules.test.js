/**
 * Tests for the CA rule step functions.
 *
 * Loads Grid and Rules modules via eval in beforeAll.
 * Access classes and registry via window.* references.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dir, '..');

beforeAll(() => {
  globalThis.window = globalThis.window || {};
  eval(readFileSync(join(root, 'js/engine/grid.js'), 'utf-8'));
  eval(readFileSync(join(root, 'js/engine/rules.js'), 'utf-8'));
});

// ---- Helpers ----

/**
 * Set up a Grid, apply a rule, run one step, return the grid.
 */
function stepRule(rule, setupGrid, width = 10, height = 10) {
  const g = new window.Grid(width, height);
  setupGrid(g);
  g.syncPrev();
  rule.step(g);
  return g;
}

// ---- Conway's Game of Life (B3/S23) ----

describe("Conway's Game of Life", () => {
  const conway = () => window.ruleRegistry.get("Conway's Game of Life");

  test('is registered', () => {
    const r = conway();
    expect(r).toBeDefined();
    expect(r.name).toBe("Conway's Game of Life");
  });

  test('block (2x2) is stable across 5 generations', () => {
    const c = conway();
    let g = new window.Grid(5, 5);
    g.set(0, 0, 1); g.set(1, 0, 1);
    g.set(0, 1, 1); g.set(1, 1, 1);
    g.syncPrev();
    for (let i = 0; i < 5; i++) {
      c.step(g);
    }
    expect(g.get(0, 0)).toBe(1);
    expect(g.get(1, 0)).toBe(1);
    expect(g.get(0, 1)).toBe(1);
    expect(g.get(1, 1)).toBe(1);
    expect(g.getPopulation()).toBe(4);
  });

  test('blinker oscillates correctly', () => {
    const c = conway();
    const g = stepRule(c, (grid) => {
      grid.set(4, 5, 1);
      grid.set(5, 5, 1);
      grid.set(6, 5, 1);
    }, 20, 20);

    expect(g.get(4, 5)).toBe(0);
    expect(g.get(6, 5)).toBe(0);
    expect(g.get(5, 5)).toBe(1);
    expect(g.get(5, 4)).toBe(1);
    expect(g.get(5, 6)).toBe(1);
    expect(g.getPopulation()).toBe(3);
  });
});

// ---- Seeds (B2/S) ----

describe('Seeds (B2/S)', () => {
  const seeds = () => window.ruleRegistry.get('Seeds');

  test('is registered', () => {
    expect(seeds()).toBeDefined();
  });

  test('single cell dies (no survive)', () => {
    const g = stepRule(seeds(), (grid) => {
      grid.set(5, 5, 1);
    }, 10, 10);
    expect(g.get(5, 5)).toBe(0);
  });

  test('two adjacent cells produce births at shared neighbours', () => {
    const g = stepRule(seeds(), (grid) => {
      grid.set(5, 5, 1);
      grid.set(6, 5, 1);
    }, 10, 10);

    expect(g.get(5, 5)).toBe(0);
    expect(g.get(6, 5)).toBe(0);
    expect(g.get(5, 4)).toBe(1);
    expect(g.get(6, 4)).toBe(1);
    expect(g.get(5, 6)).toBe(1);
    expect(g.get(6, 6)).toBe(1);
  });
});

// ---- Brian's Brain ----

describe("Brian's Brain", () => {
  const bb = () => window.ruleRegistry.get("Brian's Brain");

  test('is registered', () => {
    expect(bb()).toBeDefined();
  });

  test('excited cell transitions to refractory', () => {
    const b = bb();
    const g = new window.Grid(10, 10);
    g.set(5, 5, 1);
    g.syncPrev();
    b.step(g);
    expect(g.get(5, 5)).toBe(2);
  });

  test('refractory cell transitions to resting', () => {
    const b = bb();
    const g = new window.Grid(10, 10);
    g.set(5, 5, 2);
    g.syncPrev();
    b.step(g);
    expect(g.get(5, 5)).toBe(0);
  });

  test('excited → refractory → resting cycle', () => {
    const b = bb();
    const g = new window.Grid(10, 10);
    g.set(5, 5, 1);
    g.syncPrev();
    b.step(g);
    expect(g.get(5, 5)).toBe(2);
    g.syncPrev();
    b.step(g);
    expect(g.get(5, 5)).toBe(0);
  });
});

// ---- WireWorld ----

describe('WireWorld', () => {
  const ww = () => window.ruleRegistry.get('WireWorld');

  test('is registered', () => {
    expect(ww()).toBeDefined();
  });

  test('head → tail → wire cycle', () => {
    const w = ww();
    const g = new window.Grid(10, 10);
    g.set(5, 5, 2);
    g.syncPrev();
    w.step(g);
    expect(g.get(5, 5)).toBe(3);

    g.syncPrev();
    w.step(g);
    expect(g.get(5, 5)).toBe(1);
  });

  test('empty stays empty, wire stays wire without heads', () => {
    const w = ww();
    const g = new window.Grid(10, 10);
    g.set(5, 5, 1);
    g.syncPrev();
    w.step(g);
    expect(g.get(5, 5)).toBe(1);
    expect(g.get(0, 0)).toBe(0);
  });

  test('wire becomes head with 1 neighbouring head', () => {
    const w = ww();
    const g = new window.Grid(10, 10);
    g.set(5, 5, 1);
    g.set(6, 5, 2);
    g.syncPrev();
    w.step(g);
    expect(g.get(5, 5)).toBe(2);
  });
});

// ---- 1D Rules ----

describe('1D rules', () => {
  test('Rule 30 is registered', () => {
    expect(window.ruleRegistry.get('Rule 30 (1D)')).toBeDefined();
  });

  test('Rule 90 is registered', () => {
    expect(window.ruleRegistry.get('Rule 90 (1D)')).toBeDefined();
  });

  test('Rule 110 is registered', () => {
    expect(window.ruleRegistry.get('Rule 110 (1D)')).toBeDefined();
  });

  test('Rule 90: single cell produces Sierpinski triangle', () => {
    // The 1D step shifts all rows up and computes a new bottom row
    // from the old bottom row. Place the seed at the bottom (row 4).
    const r90 = window.ruleRegistry.get('Rule 90 (1D)');
    const g = new window.Grid(10, 5);
    g.set(5, 4, 1); // seed at bottom row
    g.syncPrev();

    // Step 1: seed shifts up to row 3, bottom row computed via XOR
    r90.step(g);
    expect(g.get(5, 3)).toBe(1); // seed shifted up
    expect(g.get(5, 4)).toBe(0); // centre: 1 XOR 1 = 0
    expect(g.get(4, 4)).toBe(1); // left born
    expect(g.get(6, 4)).toBe(1); // right born

    // Step 2: pattern propagates further
    g.syncPrev();
    r90.step(g);
    expect(g.get(5, 2)).toBe(1); // seed shifted up again
    expect(g.get(4, 3)).toBe(1); // left branch shifted up
    expect(g.get(6, 3)).toBe(1); // right branch shifted up
    expect(g.get(3, 4)).toBe(1); // new left expansion
    expect(g.get(7, 4)).toBe(1); // new right expansion
    expect(g.get(5, 4)).toBe(0); // centre stays dead
  });
});

// ---- Rule Registry ----

describe('RuleRegistry', () => {
  test('getAll returns all rules', () => {
    const rules = window.ruleRegistry.getAll();
    expect(rules.length).toBe(16);
  });

  test('getNames returns all names', () => {
    const names = window.ruleRegistry.getNames();
    expect(names).toContain("Conway's Game of Life");
    expect(names).toContain('Seeds');
    expect(names).toContain('WireWorld');
    expect(names).toContain('Rule 110 (1D)');
  });

  test('remove works', () => {
    const reg = new window.RuleRegistryClass();
    reg.register({ name: 'test', step: () => {} });
    expect(reg.get('test')).toBeDefined();
    reg.remove('test');
    expect(reg.get('test')).toBeUndefined();
  });

  test('register replaces existing rule with same name', () => {
    const reg = new window.RuleRegistryClass();
    reg.register({ name: 'test', step: () => 1 });
    reg.register({ name: 'test', step: () => 2 });
    expect(reg.getAll().length).toBe(1);
  });
});

// ---- Custom B/S Rule ----

describe('createCustomBspaceRule', () => {
  test('creates a working rule from B/S string', () => {
    const rule = window.createCustomBspaceRule('Custom', '3', '23', 'moore');
    expect(rule.name).toBe('Custom');
    expect(rule.type).toBe('bspace');
    expect(rule.birth).toEqual([3]);
    expect(rule.survive).toEqual([2, 3]);
    expect(typeof rule.step).toBe('function');

    const g = new window.Grid(5, 5);
    g.set(2, 2, 1);
    g.syncPrev();
    rule.step(g);
  });

  test('parses multi-digit strings', () => {
    const rule = window.createCustomBspaceRule('Test', '36', '245', 'moore');
    expect(rule.birth).toEqual([3, 6]);
    expect(rule.survive).toEqual([2, 4, 5]);
    expect(rule.description).toBe('B36/S245');
  });

  test('von Neumann neighbourhood', () => {
    const rule = window.createCustomBspaceRule('Von', '3', '23', 'von-neumann');
    expect(rule.neighborhood).toBe('von-neumann');
  });

  test('filters invalid characters', () => {
    const rule = window.createCustomBspaceRule('Filter', '3a7', '2b3', 'moore');
    expect(rule.birth).toEqual([3, 7]);
    expect(rule.survive).toEqual([2, 3]);
  });
});
