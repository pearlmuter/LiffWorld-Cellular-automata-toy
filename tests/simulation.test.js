/**
 * Tests for the Simulation engine.
 *
 * Simulation is loaded via eval in beforeAll. Access via window.*.
 */

import { describe, test, expect, beforeAll, afterEach } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dir, '..');

// Minimal DOM mock — Simulation.step() calls document.getElementById
// for the debug indicator.
const mockEl = { textContent: '' };

beforeAll(() => {
  globalThis.window = globalThis.window || {};
  globalThis.document = {
    getElementById: () => mockEl,
    readyState: 'complete',
    addEventListener: () => {},
  };

  eval(readFileSync(join(root, 'js/engine/grid.js'), 'utf-8'));
  eval(readFileSync(join(root, 'js/engine/rules.js'), 'utf-8'));
  eval(readFileSync(join(root, 'js/engine/simulation.js'), 'utf-8'));
});

afterEach(() => {
  mockEl.textContent = '';
});

/** Dummy rule that does nothing. */
function createTestRule() {
  return {
    name: 'Test Rule',
    type: 'bspace',
    states: 2,
    neighborhood: 'moore',
    description: 'Test rule for simulation tests',
    step: (grid) => { grid.snapshot(); },
  };
}

/** Rule that always throws. */
function createErrorRule() {
  return {
    name: 'Error Rule',
    step: () => { throw new Error('step failure'); },
  };
}

// ---- Construction ----

describe('Simulation construction', () => {
  test('creates with grid and default values', () => {
    const sim = new window.Simulation(new window.Grid(10, 10));
    expect(sim.running).toBe(false);
    expect(sim.generation).toBe(0);
    expect(sim.speed).toBe(10);
    expect(sim.currentRule).toBeNull();
  });

  test('onStep and onError are null initially', () => {
    const sim = new window.Simulation(new window.Grid());
    expect(sim.onStep).toBeNull();
    expect(sim.onError).toBeNull();
  });
});

// ---- setRule ----

describe('setRule', () => {
  test('stores the rule reference', () => {
    const sim = new window.Simulation(new window.Grid());
    const rule = createTestRule();
    sim.setRule(rule);
    expect(sim.currentRule).toBe(rule);
  });
});

// ---- setSpeed ----

describe('setSpeed', () => {
  test('clamps speed to 1–30', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.setSpeed(0);
    expect(sim.speed).toBe(1);
    sim.setSpeed(100);
    expect(sim.speed).toBe(30);
    sim.setSpeed(15);
    expect(sim.speed).toBe(15);
  });
});

// ---- start / stop / toggle ----

describe('start, stop, toggle', () => {
  test('start sets running to true and emits event', () => {
    const sim = new window.Simulation(new window.Grid());
    let emitted = null;
    sim.on('stateChange', (s) => { emitted = s; });
    sim.start();
    expect(sim.running).toBe(true);
    expect(emitted).toEqual({ running: true });
  });

  test('start is idempotent (no-op if already running)', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.start();
    let count = 0;
    sim.on('stateChange', () => count++);
    sim.start();
    expect(count).toBe(0);
  });

  test('stop sets running to false and emits event', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.start();
    let emitted = null;
    sim.on('stateChange', (s) => { emitted = s; });
    sim.stop();
    expect(sim.running).toBe(false);
    expect(emitted).toEqual({ running: false });
  });

  test('toggle alternates running state', () => {
    const sim = new window.Simulation(new window.Grid());
    expect(sim.running).toBe(false);
    sim.toggle();
    expect(sim.running).toBe(true);
    sim.toggle();
    expect(sim.running).toBe(false);
  });
});

// ---- step ----

describe('step', () => {
  test('increments generation when rule is set', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.setRule(createTestRule());
    expect(sim.generation).toBe(0);
    sim.step();
    expect(sim.generation).toBe(1);
    sim.step();
    expect(sim.generation).toBe(2);
  });

  test('emits step event with correct data', () => {
    const sim = new window.Simulation(new window.Grid(10, 10));
    sim.setRule(createTestRule());
    let eventData = null;
    sim.on('step', (d) => { eventData = d; });
    sim.step();
    expect(eventData).toBeDefined();
    expect(eventData.generation).toBe(1);
    expect(typeof eventData.population).toBe('number');
  });

  test('calls onStep callback with generation and population', () => {
    const sim = new window.Simulation(new window.Grid(10, 10));
    sim.setRule(createTestRule());
    let called = false;
    sim.onStep = (gen, pop) => {
      called = true;
      expect(gen).toBe(1);
      expect(pop).toBe(0);
    };
    sim.step();
    expect(called).toBe(true);
  });

  test('handles missing rule gracefully', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.step();
    expect(sim.generation).toBe(0);
  });

  test('handles rule without step function gracefully', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.setRule({ name: 'Bad' });
    sim.step();
    expect(sim.generation).toBe(0);
  });

  test('catches and reports step errors', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.setRule(createErrorRule());
    let error = null;
    sim.onError = (e) => { error = e; };
    sim.step();
    expect(error).toBeDefined();
    expect(error.message).toBe('step failure');
    expect(sim.generation).toBe(0);
  });
});

// ---- reset ----

describe('reset', () => {
  test('clears grid and resets generation', () => {
    const sim = new window.Simulation(new window.Grid(10, 10));
    sim.setRule(createTestRule());
    sim.generation = 42;
    sim.grid.set(5, 5, 7);
    sim.reset();
    expect(sim.generation).toBe(0);
    expect(sim.grid.getPopulation()).toBe(0);
  });

  test('emits step event after reset', () => {
    const sim = new window.Simulation(new window.Grid());
    let eventData = null;
    sim.on('step', (d) => { eventData = d; });
    sim.reset();
    expect(eventData).toBeDefined();
    expect(eventData.generation).toBe(0);
    expect(eventData.population).toBe(0);
  });
});

// ---- setGridState ----

describe('setGridState', () => {
  test('replaces cells and resets generation', () => {
    const sim = new window.Simulation(new window.Grid(5, 5));
    const newCells = new Uint8Array(25);
    newCells[0] = 1;
    newCells[24] = 5;
    sim.setGridState(newCells);
    expect(sim.grid.cells[0]).toBe(1);
    expect(sim.grid.cells[24]).toBe(5);
    expect(sim.generation).toBe(0);
  });
});

// ---- destroy ----

describe('destroy', () => {
  test('stops simulation and clears listeners', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.start();
    sim.on('step', () => {});
    sim.destroy();
    expect(sim.running).toBe(false);
    expect(sim.listeners).toEqual({});
  });
});

// ---- Event system ----

describe('event system', () => {
  test('on registers and returns unsubscribe function', () => {
    const sim = new window.Simulation(new window.Grid());
    let count = 0;
    const unsub = sim.on('test', () => count++);
    sim._emit('test');
    expect(count).toBe(1);
    unsub();
    sim._emit('test');
    expect(count).toBe(1);
  });

  test('errors in handlers are caught (not thrown)', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.on('test', () => { throw new Error('handler error'); });
    sim._emit('test');
  });

  test('step event is emitted after successful step', () => {
    const sim = new window.Simulation(new window.Grid());
    sim.setRule(createTestRule());
    let emitted = false;
    sim.on('step', () => { emitted = true; });
    sim.step();
    expect(emitted).toBe(true);
  });
});
