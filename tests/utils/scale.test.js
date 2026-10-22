import { test } from 'node:test';
import assert from 'node:assert/strict';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import { APPEARANCE } from '../../src/scenes/appearance.js';
import {
  sceneRadius, orbitRadius, orbitAngularSpeed, spinAngularSpeed, axisTiltDegrees,
  trueScaleModel, trueScaleSentences, SCALE_CHANGES, SUN_SCENE_RADIUS,
} from '../../src/utils/scale.js';

const earth = planets.find(planet => planet.id === 'earth');
const sortedIds = (list, key) => [...list].sort((a, b) => key(a) - key(b)).map(body => body.id);

test('illustrative sizes keep the real order of planet sizes', () => {
  assert.deepEqual(sortedIds(planets, p => sceneRadius(p, earth)), sortedIds(planets, p => p.measurements.diameterKm));
});

test('the Sun is still the biggest thing in the scene, but shrunk', () => {
  const jupiter = planets.find(planet => planet.id === 'jupiter');
  assert.equal(sceneRadius(sun, earth), SUN_SCENE_RADIUS);
  assert.ok(sceneRadius(sun, earth) > sceneRadius(jupiter, earth));
  const realRatio = sun.measurements.diameterKm / jupiter.measurements.diameterKm;
  assert.ok(sceneRadius(sun, earth) / sceneRadius(jupiter, earth) < realRatio, 'Sun is shrunk relative to Jupiter');
});

test('orbits keep the real order and never overlap, including rings', () => {
  assert.deepEqual(sortedIds(planets, p => orbitRadius(p, earth)), planets.map(p => p.id));
  const extent = planet => sceneRadius(planet, earth) * (APPEARANCE[planet.id].ring?.outer ?? 1);
  assert.ok(orbitRadius(planets[0], earth) - extent(planets[0]) > SUN_SCENE_RADIUS * 1.5, 'Mercury clears the Sun');
  for (let i = 1; i < planets.length; i++) {
    const gap = orbitRadius(planets[i], earth) - orbitRadius(planets[i - 1], earth);
    assert.ok(gap > extent(planets[i]) + extent(planets[i - 1]), `${planets[i - 1].id} and ${planets[i].id} overlap`);
  }
});

test('inner planets orbit faster, and slow spinners spin slower', () => {
  const speeds = planets.map(p => orbitAngularSpeed(p, earth));
  for (let i = 1; i < speeds.length; i++) assert.ok(speeds[i] < speeds[i - 1]);
  const venus = planets.find(p => p.id === 'venus');
  const jupiter = planets.find(p => p.id === 'jupiter');
  assert.ok(spinAngularSpeed(venus, earth) < spinAngularSpeed(earth, earth));
  assert.ok(spinAngularSpeed(jupiter, earth) > spinAngularSpeed(earth, earth));
  for (const body of [sun, ...planets]) assert.ok(spinAngularSpeed(body, earth) > 0, 'direction comes from tilt, not sign');
});

test('axis tilt comes from the fact sheet, so Venus and Uranus spin backwards in the scene', () => {
  assert.equal(axisTiltDegrees(planets.find(p => p.id === 'uranus')), 97.8);
  assert.equal(axisTiltDegrees(planets.find(p => p.id === 'venus')), 177.4);
  assert.equal(axisTiltDegrees(sun), 0);
});

test('true-scale model: Earth as a 1 cm bead', () => {
  const model = Object.fromEntries(trueScaleModel([sun, ...planets], earth, 1).map(entry => [entry.id, entry]));
  assert.ok(Math.abs(model.sun.diameterCm - 109.08) < 0.01);
  assert.ok(Math.abs(model.earth.distanceM - 117.28) < 0.01);
  assert.ok(Math.abs(model.neptune.distanceM - 3539.5) < 0.1);
  const sentences = trueScaleSentences([sun, ...planets], earth);
  assert.match(sentences[0], /about 1\.1 metres wide/);
  assert.match(sentences[1], /117 metres.*3\.5 km/);
  assert.match(sentences[2], /11\.2 cm/);
});

test('the list of scale changes covers sizes, distances, speeds, positions and colours', () => {
  const text = SCALE_CHANGES.join(' ');
  for (const word of ['sizes', 'Distances', 'Sun', 'sped up', 'positions', 'artist', 'stars']) assert.ok(text.includes(word), word);
});
