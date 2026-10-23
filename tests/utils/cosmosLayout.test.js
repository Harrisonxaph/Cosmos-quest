import { test } from 'node:test';
import assert from 'node:assert/strict';
import galaxies from '../../src/data/galaxies.json' with { type: 'json' };
import { COSMOS_BANDS, BAND_WIDTHS, COSMOS_SCALE_NOTES, bandFor, bandEdges, placeGalaxies, separateMarkers } from '../../src/utils/cosmosLayout.js';
import { GALAXY_KEY } from '../data/galaxy-key.js';

// Expected bands, typed in by hand from the band rules and the NASA distances in the galaxy key.
const EXPECTED_BANDS = {
  'milky-way': 'home',
  'large-magellanic-cloud': 'neighbours',
  'small-magellanic-cloud': 'neighbours',
  andromeda: 'local-group',
  triangulum: 'local-group',
  'messier-81': 'nearby-groups',
  cigar: 'nearby-groups',
  pinwheel: 'nearby-groups',
  sombrero: 'nearby-groups',
  whirlpool: 'nearby-groups',
  'messier-87': 'farther',
  'ngc-1300': 'farther',
};

const placements = placeGalaxies(galaxies);
const placeOf = id => placements.find(place => place.id === id);

test('bands run nearest to farthest, fill the map width, and say what they cover', () => {
  assert.deepEqual(COSMOS_BANDS.map(b => b.id), ['home', 'neighbours', 'local-group', 'nearby-groups', 'farther']);
  const edges = bandEdges();
  assert.equal(edges[0].left, 0);
  assert.ok(Math.abs(edges.at(-1).right - 1) < 1e-9, 'the bands fill the whole map');
  edges.slice(1).forEach((edge, i) => assert.equal(edge.left, edges[i].right));
  const limits = COSMOS_BANDS.filter(b => b.maxLy !== null).map(b => b.maxLy);
  assert.deepEqual(limits, [...limits].sort((a, b) => a - b));
  for (const band of COSMOS_BANDS) assert.ok(BAND_WIDTHS[band.id] > 0 && band.label && band.detail, band.id);
});

test('each galaxy goes in the right band, using the distances in the hand-written key', () => {
  for (const [id, expected] of Object.entries(EXPECTED_BANDS)) {
    assert.equal(bandFor(GALAXY_KEY[id].distanceLy), expected, id);
    assert.equal(placeOf(id).band, expected, `${id} placement`);
  }
  assert.equal(bandFor(1e6), 'neighbours', 'band tops are inclusive');
  assert.equal(bandFor(1e6 + 1), 'local-group');
  assert.throws(() => bandFor(1e9), /No Cosmos band/);
});

test('left to right keeps the real order of distances, with the Milky Way (home) first', () => {
  const external = Object.entries(GALAXY_KEY).filter(([, g]) => g.distanceLy !== null).sort((a, b) => a[1].distanceLy - b[1].distanceLy);
  const xs = external.map(([id]) => placeOf(id).x);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], `${external[i][0]} is right of ${external[i - 1][0]}`);
  assert.ok(placeOf('milky-way').x < xs[0]);
});

test('every galaxy sits inside its band, away from the edges, on its own row in the band', () => {
  const edges = Object.fromEntries(bandEdges().map(e => [e.id, e]));
  for (const place of placements) {
    const { left, right } = edges[place.band];
    assert.ok(place.x > left && place.x < right, place.id);
    assert.ok(place.y > 0 && place.y < 1, place.id);
  }
  for (const band of COSMOS_BANDS) {
    const ys = placements.filter(p => p.band === band.id).map(p => p.y);
    assert.equal(new Set(ys).size, ys.length, `${band.id} rows are distinct`);
  }
});

test('placement ignores the order of the input', () => {
  const shuffled = placeGalaxies(galaxies.slice().reverse());
  for (const place of shuffled) assert.deepEqual(place, placeOf(place.id));
});

test('the scale notes say the map is not to scale, not a sky map, and that zoom does not move you closer', () => {
  const text = COSMOS_SCALE_NOTES.join(' ');
  assert.match(text, /not to scale/);
  assert.match(text, /not a map of the sky/);
  assert.match(text, /same size/);
  assert.match(text, /does not take you closer/);
});

test('separateMarkers removes overlaps without moving anything sideways', () => {
  const box = (id, left, top) => ({ id, left, top, width: 120, height: 44 });
  const boxes = [box('a', 0, 100), box('b', 60, 100), box('c', 30, 110), box('d', 500, 100)];
  const result = separateMarkers(boxes, { top: 0, bottom: 400 });
  result.forEach((r, i) => assert.equal(r.left, boxes[i].left));
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const [a, b] = [result[i], result[j]];
      const overlap = a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
      assert.equal(overlap, false, `${a.id} and ${b.id}`);
    }
  }
  assert.equal(result[0].top, 100, 'the first marker keeps its place');
  assert.equal(result[3].top, 100, 'a marker with room keeps its place');
  for (const r of result) assert.ok(r.top >= 0 && r.top + r.height <= 400, `${r.id} stays inside`);
});
