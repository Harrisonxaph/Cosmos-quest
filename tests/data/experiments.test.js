import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import experiments from '../../src/data/experiments.json' with { type: 'json' };
import schema from '../../src/data/experiments.schema.json' with { type: 'json' };
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import { bodySourceIds } from '../../src/utils/panelContent.js';
import { comparisonCategory, distanceCategory } from '../../src/utils/experiments.js';

const validate = new Ajv({ allErrors: true }).compile(schema);
const byId = id => experiments.find(e => e.id === id);
const gravity = byId('gravity-lab');
const tiny = byId('tiny-solar-system');
const allText = experiment => [experiment.title, experiment.summary, experiment.intro, experiment.modelNote, experiment.input.hint,
  experiment.prediction.question, ...experiment.prediction.options.map(o => o.text), ...(experiment.explanations ?? []),
  experiment.diameterNote, experiment.distanceNote, experiment.pictureNote].filter(Boolean);

test('experiments are schema-valid, with the two agreed activities', () => {
  assert.ok(validate(experiments), JSON.stringify(validate.errors, null, 2));
  assert.deepEqual(experiments.map(e => e.id), ['gravity-lab', 'tiny-solar-system']);
});

test('the schema enforces required fields for each activity', () => {
  for (const field of schema.definitions.experiment.required) {
    const invalid = structuredClone(experiments);
    delete invalid[0][field];
    assert.equal(validate(invalid), false, field);
  }
  for (const field of ['worlds', 'defaultWorld', 'explanations', 'noSurfaceSourceIds']) {
    const invalid = structuredClone(experiments);
    delete invalid[0][field];
    assert.equal(validate(invalid), false, `gravity-lab.${field}`);
  }
  for (const field of ['diameterNote', 'distanceNote', 'pictureNote']) {
    const invalid = structuredClone(experiments);
    delete invalid[1][field];
    assert.equal(validate(invalid), false, `tiny-solar-system.${field}`);
  }
  const withSun = structuredClone(experiments);
  withSun[0].worlds.push('sun');
  assert.equal(validate(withSun), false, 'the Sun cannot be added to the gravity lab');
});

test('the gravity lab offers every planet and never the Sun', () => {
  assert.deepEqual(gravity.worlds, planets.map(p => p.id));
  assert.ok(!gravity.worlds.includes(sun.id));
  assert.ok(gravity.worlds.includes(gravity.defaultWorld));
});

test('input ranges match the brief, and defaults sit inside them', () => {
  assert.deepEqual([tiny.input.min, tiny.input.max, tiny.input.unit], [0.5, 5, 'cm']);
  assert.equal(tiny.input.slider, true, 'the slider comes with a numeric input');
  assert.equal(gravity.input.unit, 'kg');
  for (const { input } of experiments) {
    assert.ok(input.min > 0 && input.min < input.max);
    assert.ok(input.default >= input.min && input.default <= input.max);
  }
});

test('prediction options match the categories the calculations produce', () => {
  assert.deepEqual(gravity.prediction.options.map(o => o.id).sort(), [...new Set([0.5, 1, 2].map(comparisonCategory))].sort());
  assert.deepEqual(tiny.prediction.options.map(o => o.id).sort(), [...new Set([50, 500, 5000].map(distanceCategory))].sort());
});

test('cited sources exist and are the ones the information panels use for these measurements', () => {
  const sourceIds = new Set(sources.map(s => s.id));
  const panelSources = new Set([sun, ...planets].flatMap(body => bodySourceIds(body)));
  for (const experiment of experiments) {
    for (const id of [...experiment.sourceIds, ...(experiment.noSurfaceSourceIds ?? [])]) {
      assert.ok(sourceIds.has(id), `${experiment.id}: unknown source ${id}`);
      assert.ok(panelSources.has(id), `${experiment.id}: ${id} is not used by any panel`);
    }
  }
  // Gravity values come from every planet's measurements; the 1-bar note from the giants' measurements.
  for (const planet of planets) assert.ok(gravity.sourceIds.every(id => planet.measurements.sourceIds.includes(id)), planet.id);
  for (const planet of planets.filter(p => !p.hasSolidSurface)) assert.ok(gravity.noSurfaceSourceIds.every(id => planet.measurements.sourceIds.includes(id)), planet.id);
  assert.ok(tiny.sourceIds.includes(sun.measurements.sourceIds[0]), 'the Sun’s diameter source');
  assert.ok(tiny.sourceIds.includes('nasa-fact-sheet'), 'planet diameters and distances');
});

test('wording: mass stays the same, weight is a force in newtons', () => {
  const text = allText(gravity).join(' ');
  assert.match(text, /stays the same on every planet/);
  assert.match(text, /Weight is a force/);
  assert.match(text, /newtons \(N\)/);
  assert.match(text, /F = m × g/);
  for (const experiment of experiments) {
    assert.doesNotMatch(allText(experiment).join(' '), /weighs?\s+[\d.,]+\s*(kg|kilograms)|kilograms? of force|gains? mass|loses? mass|stand on (Jupiter|Saturn|Uranus|Neptune|the Sun)/i, experiment.id);
  }
  assert.match(gravity.modelNote, /not a realistic physics simulation/);
});

test('the tiny solar system states which diameters are used and that distances are averages', () => {
  assert.match(tiny.diameterNote, /equatorial diameters for the planets/);
  assert.match(tiny.diameterNote, /twice NASA's volumetric mean radius/);
  assert.match(tiny.distanceNote, /Distances are averages/);
  assert.match(tiny.distanceNote, /changes as it moves/);
  assert.equal(sun.measurements.diameterKm, 2 * sun.measurements.volumetricMeanRadiusKm, 'the Sun’s diameter really is twice its mean radius');
  assert.ok(planets.every(p => p.measurements.diameterType === 'equatorial'), 'planet diameters really are equatorial');
});

test('no new numerical claims: texts only mention the input limits and prediction bands', () => {
  const allowed = new Set(['0.1', '1,000', '10', '0.5', '5', '100', '1']);
  for (const experiment of experiments) {
    for (const number of allText(experiment).join(' ').match(/\d[\d,]*(\.\d+)?/g) ?? []) {
      assert.ok(allowed.has(number), `${experiment.id}: unexpected number ${number}`);
    }
  }
});

test('SCIENCE.md documents the formulas, assumptions, units and rounding', async () => {
  const { readFileSync } = await import('node:fs');
  const science = readFileSync(new URL('../../docs/SCIENCE.md', import.meta.url), 'utf8');
  const section = science.slice(science.indexOf('## Science Experiments'));
  assert.ok(section.length > 100, 'there is a Science Experiments section');
  for (const phrase of ['F = m × g', 'newtons (N)', 'metres per second squared', '1-bar level', 'equatorial', 'twice its volumetric mean radius', 'mean distance from the Sun', 'Assumptions', 'Rounding', 'full precision', '10 kg × 9.8 m/s² = 98 N', '10 kg × 3.7 m/s² = 37 N']) {
    assert.ok(section.includes(phrase), `SCIENCE.md mentions "${phrase}"`);
  }
});
