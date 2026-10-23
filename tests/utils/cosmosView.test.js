import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, MIN_MAP_WIDTH, initialView, mapSize, clampView, toScreen, zoomAt, panBy, ensureVisible, canZoomIn, canZoomOut, isInitial,
} from '../../src/utils/cosmosView.js';

const wide = { width: 1000, height: 500 };
const phone = { width: 360, height: 400 };
const close = (a, b) => Math.abs(a - b) < 1e-6;

test('starts fully zoomed out, at the top left', () => {
  assert.deepEqual(initialView(), { zoom: 1, x: 0, y: 0 });
  assert.equal(isInitial(initialView()), true);
  assert.equal(canZoomOut(initialView()), false);
  assert.equal(canZoomIn(initialView()), true);
});

test('coordinate mapping: map fractions to screen pixels, with zoom and pan', () => {
  assert.deepEqual(toScreen(0, 0, initialView(), wide), { x: 0, y: 0 });
  assert.deepEqual(toScreen(1, 1, initialView(), wide), { x: 1000, y: 500 });
  assert.deepEqual(toScreen(0.5, 0.5, { zoom: 2, x: -100, y: -50 }, wide), { x: 900, y: 450 });
  // A narrow screen still gets a map at least MIN_MAP_WIDTH wide, so names have room; it pans sideways.
  assert.equal(mapSize(phone, 1).width, MIN_MAP_WIDTH);
  assert.equal(toScreen(1, 0, initialView(), phone).x, MIN_MAP_WIDTH);
  assert.equal(mapSize({ ...phone, minWidth: 1440 }, 1).width, 1440, 'large text asks for a wider map');
});

test('zoom stays between its limits', () => {
  let view = initialView();
  for (let i = 0; i < 20; i++) view = zoomAt(view, ZOOM_STEP, { x: 500, y: 250 }, wide);
  assert.equal(view.zoom, MAX_ZOOM);
  assert.equal(canZoomIn(view), false);
  for (let i = 0; i < 20; i++) view = zoomAt(view, 1 / ZOOM_STEP, { x: 500, y: 250 }, wide);
  assert.equal(view.zoom, MIN_ZOOM);
  assert.deepEqual(view, { zoom: 1, x: 0, y: 0 }, 'fully zoomed out, the map fits exactly again');
  assert.equal(clampView({ zoom: 99, x: 0, y: 0 }, wide).zoom, MAX_ZOOM);
  assert.equal(clampView({ zoom: 0.1, x: 0, y: 0 }, wide).zoom, MIN_ZOOM);
});

test('zooming keeps the point under the fingers (or the centre) still', () => {
  const point = { x: 300, y: 200 };
  const before = initialView();
  const after = zoomAt(before, 2, point, wide);
  // The map point that was under `point` is still there.
  const u = (point.x - before.x) / mapSize(wide, before.zoom).width;
  const v = (point.y - before.y) / mapSize(wide, before.zoom).height;
  const screen = toScreen(u, v, after, wide);
  assert.ok(close(screen.x, point.x) && close(screen.y, point.y));
});

test('panning never shows empty space beyond the map edges', () => {
  const zoomed = zoomAt(initialView(), 2, { x: 500, y: 250 }, wide);
  const farLeft = panBy(zoomed, 10000, 10000, wide);
  assert.deepEqual([farLeft.x, farLeft.y], [0, 0]);
  const farRight = panBy(zoomed, -10000, -10000, wide);
  assert.equal(farRight.x, wide.width - mapSize(wide, 2).width);
  assert.equal(farRight.y, wide.height - mapSize(wide, 2).height);
  assert.deepEqual(panBy(initialView(), 50, 50, wide), initialView(), 'nothing to pan when the whole map fits');
  assert.equal(panBy(initialView(), -10000, 0, phone).x, phone.width - MIN_MAP_WIDTH, 'a phone can pan along the wider map');
});

test('ensureVisible pans just enough to bring a galaxy into view', () => {
  const view = initialView();
  const shown = ensureVisible(view, 0.8, 0.5, phone);
  const point = toScreen(0.8, 0.5, shown, phone);
  assert.ok(close(point.x, phone.width - 60), 'brought 60 px inside the right edge');
  // Near the map's own edge the view stops at the edge, but the galaxy is still on screen.
  const edge = toScreen(0.95, 0.5, ensureVisible(view, 0.95, 0.5, phone), phone);
  assert.ok(edge.x > 0 && edge.x < phone.width);
  assert.deepEqual(ensureVisible(view, 0.1, 0.5, phone), view, 'already visible: no change');
});
