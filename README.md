# Container Packing Calculator

A 3D bin-packing tool that estimates how many boxes of one or more sizes fit inside a single container, with a live Three.js visualization of the packed result.

The packing algorithm runs in a Web Worker so the UI stays responsive while you type, and the viewer is code-split so the initial JS payload is small.

## Features

- Multi-size 3D bin packing with all 6 rotations tested per free space
- Interactive 3D viewport: drag to rotate, scroll or pinch to zoom
- Per-box-type quantity stepper (`−` / value / `+`)
- "Doesn't fit" prompt when any requested box can't be placed, with a per-type shortfall list
- Slice slider to peel back layers and inspect packing density
- Unit toggle (cm / mm / m / in) that converts every dimension in place
- Persists `unit`, container dimensions, and box types to `localStorage`
- Responsive layout: side-by-side on desktop, stacked with the viewport on top on mobile
- Graceful WebGL fallback: if the renderer fails, the pack still runs and the UI explains what happened

## Tech stack

- React 18 + Vite 5
- Tailwind CSS 3
- Three.js for the 3D viewport
- Web Worker for the packing computation
- Vitest for unit tests

## Getting started

Requires Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # preview the production build
npm test           # run Vitest once
npm run test:watch # watch mode
```

## Project structure

```
src/
  App.jsx                  Composition + state (no business logic)
  PackingViewer.jsx        Three.js scene, lazy-loaded
  packing.js               Pure bin-packing functions (rotations,
                           fits, splitSpace, packBoxes)
  packing.test.js          16 Vitest unit tests
  packing.worker.js        Worker shell that calls packBoxes
  usePacking.js            React hook: owns the worker, debounces
                           input, drops stale responses by reqId
  colors.js                Per-type colour palette
  index.css                Tailwind directives
  main.jsx                 React entry
  components/
    NumField.jsx           Generic numeric input
    QtyStepper.jsx         − / value / + control
    FieldWithLabel.jsx     Container dimension field (with unit)
    Stat.jsx               Output stat tile
  utils/
    format.js              formatVolume helper
    useNumericInput.js     Hook: raw string state, parse-on-commit
```

## How the packing works

`packBoxes(container, boxTypes)` implements first-fit decreasing:

1. Materialize every requested box (qty copies of each type) and sort by volume, largest first.
2. Maintain a list of free axis-aligned cuboid spaces, starting with the whole container.
3. For each box, try all 6 rotations against every free space and pick the placement with the lowest total slack (tightest fit).
4. After placement, split the used space into up to 3 axis-aligned remainders.
5. Prune any free space fully contained in another.
6. If no rotation fits in any space, record the box type as skipped.

3D bin packing is NP-hard, so this is a heuristic — strong in practice for the volumetric question "how many can I fit", but it does not model gravity, load-bearing, fragility, or "this side up" constraints.

## Architecture notes

- The pack runs in a Web Worker (`packing.worker.js`). The `usePacking` hook debounces input changes (200 ms) and drops responses whose `reqId` is stale, so rapid typing doesn't stack up worker jobs or flicker the viewport with intermediate results.
- The 3D viewer is loaded via `React.lazy(() => import('./PackingViewer'))`. Three.js (~117 kB gz) is not in the initial bundle; the app shell paints first and the viewer chunk streams in.
- Numeric inputs use `useNumericInput`, which keeps a raw string in local state and only commits a parsed value when it parses cleanly. Clearing a field mid-edit doesn't snap the underlying value to 0 or fire a pack with a zero dimension.
- Box-type rows use stable per-type ids (`bt-N`) as React keys, so editing or deleting a box doesn't move input focus between rows.
- `localStorage` persistence is wrapped in try/catch and skips silently if quota or storage is unavailable.

## Bundle sizes

After `npm run build`:

```
index.js              ~51 kB gz    app shell + React, loads immediately
PackingViewer.js     ~117 kB gz    Three.js, loads on demand
packing.worker.js     ~1.8 kB      pure algorithm
index.css             ~3.9 kB gz
```

## Testing

The packing logic is pure, exported from `src/packing.js`, and covered by 16 Vitest cases including:

- Unique rotation counts for cubes, square-prisms, and fully distinct dims
- `fits` exact-match, axis-exceed, and floating-point tolerance
- `splitSpace` remainder count and geometry
- Full pack at 100% utilization
- Skipped-type detection
- `qty: 0` means none packed (not unlimited)
- Forced rotation to fit a tight slot
- Utilization math against `containerVol` / `usedVol`

Run with `npm test`.

## Known limitations

- The algorithm is volumetric only — no gravity or load-bearing constraints. Boxes can rest in mid-air relative to other boxes.
- All 6 rotations are always allowed; there's no "this side up" lock.
- No weight, fragility, or stacking-limit modelling.
- Result is a single heuristic; it is not guaranteed optimal.

## License

See repository for license details.
