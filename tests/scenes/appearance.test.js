import { test } from 'node:test';
import assert from 'node:assert/strict';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import { APPEARANCE, appearanceFor } from '../../src/scenes/appearance.js';
import { mulberry32, ringProfile } from '../../src/scenes/proceduralTextures.js';

const bodies = [sun, ...planets];
const STYLES = ['star', 'cratered', 'clouds', 'earthlike', 'dusty', 'banded'];

test('every body has an appearance, and nothing else does', () => {
  assert.deepEqual(Object.keys(APPEARANCE).sort(), bodies.map(body => body.id).sort());
  assert.throws(() => appearanceFor('pluto'));
});

test('appearances use valid colours and known styles', () => {
  for (const [id, look] of Object.entries(APPEARANCE)) {
    assert.match(look.color, /^#[0-9a-f]{6}$/i, id);
    assert.ok(STYLES.includes(look.style), `${id} style`);
    assert.ok(look.palette.length >= 3, `${id} palette`);
    for (const colour of look.palette) assert.match(colour, /^#[0-9a-f]{6}$/i, id);
    assert.equal(typeof look.seed, 'number');
  }
});

test('rings are drawn exactly for the worlds that have them', () => {
  for (const body of bodies) {
    const ring = APPEARANCE[body.id].ring;
    assert.equal(Boolean(ring), body.hasRings, body.id);
    if (ring) {
      assert.ok(ring.inner > 1 && ring.outer > ring.inner, `${body.id} ring sizes`);
      assert.ok(ring.opacity > 0 && ring.opacity <= 1);
    }
  }
  assert.ok(APPEARANCE.saturn.ring.opacity > APPEARANCE.jupiter.ring.opacity, 'Saturn has the most visible rings');
});

test('the gas and ice giants use banded styles and the Sun uses the star style', () => {
  for (const body of bodies) {
    if (body.kind === 'gas-giant' || body.kind === 'ice-giant') assert.equal(APPEARANCE[body.id].style, 'banded', body.id);
  }
  assert.equal(APPEARANCE.sun.style, 'star');
});

test('procedural textures are deterministic', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 5; i++) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
  assert.deepEqual(ringProfile(APPEARANCE.saturn), ringProfile(APPEARANCE.saturn));
});

test('ring brightness stays between 0 and 1 and Saturn has a gap', () => {
  for (const id of ['jupiter', 'saturn', 'uranus', 'neptune']) {
    const profile = ringProfile(APPEARANCE[id]);
    assert.ok(profile.every(v => v >= 0 && v <= 1), id);
  }
  const saturn = ringProfile(APPEARANCE.saturn, 100);
  assert.ok(saturn[68] < 0.1, 'Cassini-style gap');
  assert.ok(Math.max(...saturn) > 0.5);
});
