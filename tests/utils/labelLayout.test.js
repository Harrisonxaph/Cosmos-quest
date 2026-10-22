import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeLabels, pickAt, isTap, MIN_TARGET } from '../../src/utils/labelLayout.js';

const bounds = { width: 400, height: 300 };
const label = (id, x, y, extra = {}) => ({ id, x, y, radius: 6, width: 60, height: 24, ...extra });
const touching = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test('labels go above their world when there is room, with a tap area of at least 44 × 44 px', () => {
  const placed = placeLabels([label('mars', 200, 150)], bounds).get('mars');
  assert.equal(placed.side, 'above');
  assert.ok(placed.target.width >= MIN_TARGET && placed.target.height >= MIN_TARGET);
  assert.ok(placed.text.bottom <= 150 - 6, 'the name sits above the world, not on it');
  // The visible name is centred in its tap area.
  assert.equal((placed.text.left + placed.text.right) / 2, (placed.target.left + placed.target.right) / 2);
});

test('crowded labels never overlap: later ones move to another side or are left out', () => {
  // Five worlds bunched together, like the inner planets on a phone.
  const items = ['sun', 'mercury', 'venus', 'earth', 'mars'].map((id, i) => label(id, 190 + i * 5, 150 + i * 3));
  const placed = placeLabels(items, bounds);
  const shown = [...placed.values()].filter(Boolean);
  assert.equal(placed.get('sun').side, 'above', 'the first in priority keeps the usual place');
  assert.ok(shown.length >= 2, `more than one name still fits (got ${shown.length})`);
  assert.ok(new Set(shown.map(p => p.side)).size === shown.length, 'each one shown uses a different side');
  assert.ok([...placed.values()].includes(null), 'with no room left, a label is left out rather than overlapping');
  for (let a = 0; a < shown.length; a++) {
    for (let b = a + 1; b < shown.length; b++) assert.ok(!touching(shown[a].text, shown[b].text), 'visible names must not overlap');
  }
});

test('labels whose name would leave the view try another side, or are left out', () => {
  assert.equal(placeLabels([label('top', 200, 10)], bounds).get('top').side, 'below');
  assert.equal(placeLabels([label('edge', 395, 150)], bounds).get('edge').side, 'left');
  assert.equal(placeLabels([label('huge', 200, 150, { width: 500 })], bounds).get('huge'), null);
});

test('a tap on a visible name picks that name, even over a world drawn behind it', () => {
  const placed = placeLabels([label('saturn', 100, 150), label('uranus', 300, 150)], bounds);
  const name = placed.get('uranus').text;
  const centre = { x: (name.left + name.right) / 2, y: (name.top + name.bottom) / 2 };
  assert.equal(pickAt(centre, placed, 'saturn'), 'uranus');
});

test('the world itself beats the enlarged tap area of a nearby name', () => {
  const placed = placeLabels([label('mars', 200, 150, { width: 20, height: 16 })], bounds);
  const { target, text } = placed.get('mars');
  const edge = { x: target.left + 2, y: (text.top + text.bottom) / 2 }; // inside the 44 px area, outside the name
  assert.ok(edge.x < text.left);
  assert.equal(pickAt(edge, placed, 'earth'), 'earth');
  assert.equal(pickAt(edge, placed, null), 'mars', 'with no world there, the enlarged area still counts');
});

test('overlapping tap areas go to the nearest name, and empty space picks nothing', () => {
  const placements = new Map([
    ['a', { target: { left: 0, right: 44, top: 0, bottom: 44 }, text: { left: 10, right: 34, top: 14, bottom: 30 } }],
    ['b', { target: { left: 30, right: 74, top: 0, bottom: 44 }, text: { left: 40, right: 64, top: 14, bottom: 30 } }],
    ['hidden', null],
  ]);
  assert.equal(pickAt({ x: 40, y: 5 }, placements), 'b');
  assert.equal(pickAt({ x: 8, y: 5 }, placements), 'a');
  assert.equal(pickAt({ x: 200, y: 200 }, placements), null);
});

test('only a short, still, one-finger press counts as a tap', () => {
  assert.equal(isTap({ moved: 2, durationMs: 120, pointers: 1 }), true);
  assert.equal(isTap({ moved: 30, durationMs: 120, pointers: 1 }), false, 'drag');
  assert.equal(isTap({ moved: 2, durationMs: 900, pointers: 1 }), false, 'long press');
  assert.equal(isTap({ moved: 0, durationMs: 120, pointers: 2 }), false, 'pinch');
});
