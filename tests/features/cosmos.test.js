import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialCosmosMapState, reduceCosmosMap, createCosmosMapStore } from '../../src/features/cosmos.js';
import { MAX_ZOOM, MIN_ZOOM } from '../../src/utils/cosmosView.js';

const size = { width: 800, height: 400 };
const measured = () => reduceCosmosMap(initialCosmosMapState(), { type: 'resize', size });

test('nothing moves until the map has been measured; hidden maps (0 × 0) are ignored', () => {
  const state = initialCosmosMapState();
  assert.equal(reduceCosmosMap(state, { type: 'zoomIn' }), state);
  assert.equal(reduceCosmosMap(state, { type: 'pan', dx: -50, dy: 0 }), state);
  assert.equal(reduceCosmosMap(state, { type: 'resize', size: { width: 0, height: 0 } }), state);
  const real = measured();
  assert.equal(reduceCosmosMap(real, { type: 'resize', size: { width: 0, height: 0 } }), real, 'hiding the map keeps its last size');
});

test('zoom buttons stop at the limits, and reset returns to the start', () => {
  let state = measured();
  for (let i = 0; i < 10; i++) state = reduceCosmosMap(state, { type: 'zoomIn' });
  assert.equal(state.view.zoom, MAX_ZOOM);
  assert.equal(reduceCosmosMap(state, { type: 'zoomIn' }), state, 'zooming in at the limit changes nothing');
  state = reduceCosmosMap(state, { type: 'pan', dx: -200, dy: -100 });
  state = reduceCosmosMap(state, { type: 'reset' });
  assert.deepEqual(state.view, { zoom: 1, x: 0, y: 0 });
  assert.equal(reduceCosmosMap(state, { type: 'zoomOut' }), state, 'zooming out at the limit changes nothing');
  assert.equal(state.view.zoom, MIN_ZOOM);
});

test('pinch zoom (zoomBy) ignores nonsense factors', () => {
  const state = measured();
  assert.equal(reduceCosmosMap(state, { type: 'zoomBy', factor: 0 }), state);
  assert.equal(reduceCosmosMap(state, { type: 'zoomBy', factor: Number.NaN }), state);
  assert.equal(reduceCosmosMap(state, { type: 'zoomBy', factor: 2, point: { x: 0, y: 0 } }).view.zoom, 2);
});

test('a smaller screen keeps the view inside the map', () => {
  let state = measured();
  state = reduceCosmosMap(state, { type: 'zoomBy', factor: 4, point: { x: 800, y: 400 } });
  state = reduceCosmosMap(state, { type: 'resize', size: { width: 900, height: 400 } });
  assert.ok(state.view.x >= 900 - 900 * state.view.zoom);
});

test('the store keeps the map where it was left and tells listeners about changes only', () => {
  const store = createCosmosMapStore();
  const calls = [];
  store.subscribe((state, previous, action) => calls.push(action.type));
  store.dispatch({ type: 'resize', size });
  store.dispatch({ type: 'zoomIn' });
  store.dispatch({ type: 'reset' });
  store.dispatch({ type: 'reset' });
  assert.deepEqual(calls, ['resize', 'zoomIn', 'reset']);
});

test('reveal can bring a whole wide marker into view, not just its centre', () => {
  const state = reduceCosmosMap(initialCosmosMapState(), { type: 'resize', size: { width: 500, height: 400 } });
  // A point near the right of the 720 px-wide map, with a marker 160 px wide (half = 80, plus a gap).
  const shown = reduceCosmosMap(state, { type: 'reveal', u: 0.7, v: 0.5, margin: 92 });
  const x = shown.view.x + 0.7 * 720;
  assert.ok(x <= 500 - 92 + 1e-9, 'the centre is at least half a marker (plus a gap) inside the edge');
  assert.ok(x - 80 >= 0, 'and the left half is still in view');
});
