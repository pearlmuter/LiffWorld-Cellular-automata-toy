# Cellular Playground

A macOS desktop cellular automata playground built with **Electron**, **Canvas 2D**, and **vanilla JavaScript**. Explore classic rules like Conway's Game of Life, create your own, and watch patterns evolve in real time.

![Screenshot placeholder](docs/screenshot.png)

---

## Features

- **17 built-in rules** — Conway's Game of Life, HighLife, Seeds, Brian's Brain, WireWorld, Day & Night, Life Without Death, 2×2, Coral, Move, Star Wars, Diamoeba, Von Neumann Life, and 1-D elementary rules (30, 90, 110).
- **Visual rule editor** — design B/S-notation rules interactively and see results immediately.
- **30 built-in patterns** — gliders, oscillators, spaceships, and more filterable by rule.
- **Multi-colour cells** — 16 colour presets plus a custom colour picker; each alive state index maps to a distinct colour.
- **Zoom & pan** — scroll to zoom, middle-click or right-click to drag the view. Camera recenters on Cmd+R.
- **Brush controls** — adjustable brush size (1–20) and shape (square / circle) for drawing.
- **Save / Load** — `.cp` JSON files via native macOS dialogs (Cmd+S / Cmd+O).
- **PNG export** — export the current view as a PNG image.
- **Wrapping toggle** — enable/disable toroidal edge wrapping.
- **Speed control** — adjustable simulation speed from 1–30 steps/second.
- **Keyboard shortcuts** — full set listed below.

---

## Getting Started

### Prerequisites

- **Bun** (≥ 1.0) — [install guide](https://bun.sh/docs/installation)
- **macOS** (the app uses native Electron dialogs and menu bar)

### Install & Launch

```bash
# Clone the repository
git clone <repo-url> cellular-playground
cd cellular-playground

# Install dependencies
bun install

# Launch the app
bunx electron .
```

---

## Usage

### Drawing on the grid

1. Select the **Draw** tool (pencil icon) in the toolbar.
2. Choose a colour from the palette.
3. Click and drag on the grid to paint cells.
4. Adjust brush size with the slider or the **1–9** keys.

### Running a simulation

1. Select a rule from the dropdown.
2. Click **▶ Play** or press **Space**.
3. Use **Step** to advance one generation at a time.
4. Adjust speed with the slider.

### Panning & zooming

- **Scroll** — zoom in/out (zooms toward the cursor).
- **Middle-click drag** or **right-click drag** — pan the view.
- **Cmd+R** — reset zoom and recenter.

### Saving & loading

- **Cmd+S** — save the current grid and settings to a `.cp` file.
- **Cmd+O** — open a saved `.cp` file.
- **Cmd+E** — export the current view as PNG.

### Creating a custom rule

1. Click **Edit Rules** to open the rule editor.
2. Enter **Birth** and **Survive** digits (e.g. `3` and `23` for Life).
3. Choose Moore or Von Neumann neighbourhood.
4. Click **Apply** — the new rule appears in the dropdown.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `1`–`9` | Brush size |
| `Cmd+S` | Save |
| `Cmd+O` | Open |
| `Cmd+E` | Export PNG |
| `Cmd+Z` | Undo |
| `Cmd+R` | Randomize / Reset zoom |
| `Cmd+Shift+Z` | Redo |
| `Ctrl+G` | Toggle grid wrap |

---

## Architecture

```
cellular-playground/
├── main.js             # Electron main process (window, menus, IPC)
├── preload.js          # Context bridge (exposes safe IPC to renderer)
├── index.html          # App shell (layout, toolbar, canvas container)
├── styles.css          # All styling (dark theme, sidebar, overlays)
├── js/
│   ├── renderer.js     # Bootstrap: wires Grid, Simulation, Canvas, UI
│   ├── engine/
│   │   ├── grid.js     # Grid data structure (Uint8Array flat buffer)
│   │   ├── rules.js    # Rule definitions + step-function factories
│   │   └── simulation.js  # Game loop, timing, event system
│   └── ui/
│       ├── canvas.js   # Canvas renderer (zoom, pan, draw, paint)
│       ├── toolbar.js  # Toolbar UI wiring
│       └── rule-editor.js  # Visual rule editor modal
├── patterns.js         # Built-in pattern library (30+ patterns)
├── storage.js          # Save/load/persist manager
└── tests/              # Unit tests (bun test)
    ├── grid.test.js
    ├── rules.test.js
    └── simulation.test.js
```

### Key design decisions

| Decision | Rationale |
|---|---|
| **Uint8Array flat buffer** | Cache-friendly access, trivial serialisation, small memory footprint. A 120×80 grid = 9,600 bytes. |
| **Double buffering** | `cells` (current) + `prevCells` (snapshot). Neighbour counting reads from prev while step writes to cells. Prevents intra-step contamination. |
| **setInterval loop** | More predictable than `requestAnimationFrame` for CA stepping. Speed is controlled by adjusting the interval (33 ms – 1000 ms). |
| **Direct onStep callback** | By-passes the pub-sub event system on the render hot path for reliable canvas updates. |
| **B/S notation** | Compact, human-readable rule format (`B3/S23`). The number of digits is small, so simple `Set` lookups are fast. |

### How a step works

```
Simulation.step()
  └─ Rule.step(grid)
       └─ grid.snapshot()          // cells → prevCells
       └─ For each cell (x, y):
            └─ Read state from prevCells
            └─ Count neighbours via prevCells (Moore or Von Neumann)
            └─ Apply birth/survive logic → write to cells
  └─ generation++
  └─ _emit('step', ...)            // Event system subscribers
  └─ onStep(gen, pop)              // Direct callback (canvas render)
```

---

## Running Tests

```bash
bun test
```

Tests cover:
- **Grid** — construction, coordinate math, neighbour counting, paint, resize, serialisation
- **Rules** — Conway (block stability, blinker oscillation), Seeds (explosive birth), Brian's Brain (excitation cycle), WireWorld (head/tail/wire cycle), 1-D rules (Rule 90)
- **Simulation** — start/stop/toggle lifecycle, stepping, error handling, event system

The test suite requires no DOM or Electron runtime — pure logic tests running in `bun test`.

---

## Rule Notation

### B/S (Birth/Survive) rules

The standard notation for 2-state cellular automata:

- **B** = birth counts — number of live neighbours required for a dead cell to become alive
- **S** = survive counts — number of live neighbours required for a live cell to stay alive

Example: **B3/S23** (Conway's Game of Life):
- A dead cell with exactly 3 live neighbours is born.
- A live cell with 2 or 3 live neighbours survives; otherwise it dies.

### Multi-state rules

- **Brian's Brain** — 3 states (resting → excited → refractory)
- **WireWorld** — 4 states (empty, wire, electron head, electron tail)

### 1-D elementary rules (Wolfram codes)

- Rules 30, 90, and 110 are implemented. The grid acts as a space-time diagram: each row is the next generation of the row below it.

---

## License

MIT
