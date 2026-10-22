import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import schema from '../../src/data/planets.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true });
ajv.addSchema(schema, 'planets');
const validatePlanets = ajv.getSchema('planets');
const validateBody = ajv.compile({ $ref: 'planets#/definitions/body' });
const expected = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const science = readFileSync(new URL('../../docs/SCIENCE.md', import.meta.url), 'utf8');
const sourcesById = Object.fromEntries(sources.map(source => [source.id, source]));
const sectionFor = id => science.split(`\n## ${id}\n`)[1]?.split('\n## ')[0];

// Stage 1 facts must stay exactly as they were, as each planet's first fact.
const STAGE_1_FACTS = {
  mercury: 'Mercury is the smallest planet in our solar system.',
  venus: 'Venus is the hottest planet in our solar system.',
  earth: 'Earth is the only planet known to support life.',
  mars: 'Mars has two small moons, Phobos and Deimos.',
  jupiter: 'Jupiter is the largest planet in our solar system.',
  saturn: 'Saturn is a gas giant with a spectacular system of rings.',
  uranus: 'Uranus rotates on its side.',
  neptune: 'Neptune is the eighth and most distant planet from the Sun.',
};

test('all eight planets have schema-valid required fields and correct identities/order', () => {
  assert.ok(validatePlanets(planets), JSON.stringify(validatePlanets.errors));
  assert.deepEqual(planets.map(p => p.name), expected);
  assert.deepEqual(planets.map(p => p.id), expected.map(n => n.toLowerCase()));
  assert.deepEqual(planets.map(p => p.orderFromSun), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('the Sun is a valid body but can never appear in the planet list', () => {
  assert.ok(validateBody(sun), JSON.stringify(validateBody.errors));
  assert.equal(sun.orderFromSun, 0);
  assert.equal(sun.kind, 'star');
  assert.equal(validatePlanets([sun, ...planets.slice(1)]), false);
});

test('every required field is enforced by the schema', () => {
  const body = schema.definitions.body;
  for (const field of body.required) {
    const invalid = structuredClone(planets);
    delete invalid[0][field];
    assert.equal(validatePlanets(invalid), false, field);
  }
  for (const field of schema.definitions.measurements.required) {
    const invalid = structuredClone(planets);
    delete invalid[0].measurements[field];
    assert.equal(validatePlanets(invalid), false, `measurements.${field}`);
  }
  for (const field of schema.definitions.fact.required) {
    const invalid = structuredClone(planets);
    delete invalid[0].facts[0][field];
    assert.equal(validatePlanets(invalid), false, `facts.${field}`);
  }
  for (const field of ['moons', 'summary', 'composition', 'temperatureContext']) {
    const invalid = structuredClone(planets);
    delete invalid[0][field].sourceIds;
    assert.equal(validatePlanets(invalid), false, `${field}.sourceIds`);
  }
});

test('planets must have orbital values that the Sun does not', () => {
  for (const field of ['meanDistanceFromSunE6Km', 'dayLengthHours', 'orbitalPeriodDays', 'obliquityDeg']) {
    const invalid = structuredClone(planets);
    invalid[2].measurements[field] = null;
    assert.equal(validatePlanets(invalid), false, field);
  }
});

test('Stage 1 facts are preserved word for word as each planet’s first fact', () => {
  for (const planet of planets) {
    assert.equal(planet.facts[0].text, STAGE_1_FACTS[planet.id], planet.id);
    assert.equal(planet.facts[0].sourceId, `nasa-${planet.id}`);
    assert.ok(sectionFor(planet.facts[0].sourceId).includes(`https://science.nasa.gov/${planet.id}/`));
  }
});

test('every fact appears word for word under its own NASA reference in SCIENCE.md', () => {
  for (const body of [sun, ...planets]) {
    for (const fact of body.facts) {
      const section = sectionFor(fact.sourceId);
      assert.ok(section, `${body.id}: missing SCIENCE.md section ${fact.sourceId}`);
      assert.ok(section.includes(`- Fact: ${fact.text}`), `${body.id}: ${fact.text}`);
      assert.ok(section.includes(sourcesById[fact.sourceId].url), fact.sourceId);
    }
  }
});

test('kind, surface, gravity and temperature references agree', () => {
  for (const body of [sun, ...planets]) {
    const m = body.measurements;
    if (body.kind === 'rocky-planet') {
      assert.equal(body.hasSolidSurface, true, body.id);
      assert.equal(m.gravityReference, 'surface', body.id);
      assert.equal(m.temperatureReference, 'surface-mean', body.id);
    } else if (body.kind === 'star') {
      assert.equal(body.hasSolidSurface, false);
      assert.equal(m.gravityReference, 'photosphere');
      assert.equal(m.temperatureReference, 'photosphere-effective');
    } else {
      assert.equal(body.hasSolidSurface, false, `${body.id} must not have a solid surface`);
      assert.equal(m.gravityReference, '1-bar', body.id);
      assert.equal(m.temperatureReference, '1-bar-mean', body.id);
      assert.ok(m.sourceIds.includes('nasa-fact-sheet-notes'), `${body.id} must cite the 1-bar definition`);
    }
  }
});

test('only the giant planets have rings', () => {
  assert.deepEqual([sun, ...planets].filter(body => body.hasRings).map(body => body.id), ['jupiter', 'saturn', 'uranus', 'neptune']);
});

test('backwards spin and an axis tilt above 90° always go together', () => {
  for (const planet of planets) {
    const m = planet.measurements;
    assert.equal(m.rotationPeriodHours < 0, m.obliquityDeg > 90, planet.id);
  }
});

test('moon counts are dated, not in the future, and cite a source', () => {
  const retrieved = '2026-10-22';
  for (const body of [sun, ...planets]) {
    assert.ok(body.moons.asOf <= retrieved, `${body.id} asOf ${body.moons.asOf}`);
    assert.ok(body.moons.sourceIds.length > 0);
  }
  assert.equal(planets.find(p => p.id === 'earth').moons.count, 1);
  assert.equal(planets.find(p => p.id === 'mars').moons.count, 2);
  assert.equal(sun.moons.count, 0);
});

test('superlative facts agree with the measured numbers', () => {
  const by = id => planets.find(planet => planet.id === id).measurements;
  const extreme = (key, pick) => planets.reduce((best, planet) => (pick(planet.measurements[key], best.measurements[key]) ? planet : best)).id;
  assert.equal(extreme('diameterKm', (a, b) => a < b), 'mercury', 'smallest planet');
  assert.equal(extreme('diameterKm', (a, b) => a > b), 'jupiter', 'largest planet');
  assert.equal(extreme('temperatureC', (a, b) => a > b), 'venus', 'hottest planet');
  assert.equal(extreme('meanDistanceFromSunE6Km', (a, b) => a > b), 'neptune', 'most distant planet');
  assert.equal(extreme('dayLengthHours', (a, b) => a < b), 'jupiter', 'shortest day');
  assert.equal(extreme('orbitalPeriodDays', (a, b) => a < b), 'mercury', 'fastest orbit');

  const density = m => (m.massE24Kg * 1e24) / ((4 / 3) * Math.PI * ((m.diameterKm * 1000) / 2) ** 3);
  const densities = Object.fromEntries(planets.map(planet => [planet.id, density(planet.measurements)]));
  assert.ok(densities.saturn < 1000, 'Saturn is less dense than water');
  for (const planet of planets) if (planet.id !== 'saturn') assert.ok(densities[planet.id] > 1000, planet.id);
  const densest = Object.entries(densities).sort((a, b) => b[1] - a[1]).map(([id]) => id);
  assert.deepEqual(densest.slice(0, 2), ['earth', 'mercury'], 'Mercury is second densest after Earth');

  assert.ok(by('venus').rotationPeriodHours / -24 > by('venus').orbitalPeriodDays, 'Venus spins slower than it orbits');
});
