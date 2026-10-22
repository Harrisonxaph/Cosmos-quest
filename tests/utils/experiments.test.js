// Experiment calculations, checked against examples worked out independently by hand (not with the app's code).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import experiments from '../../src/data/experiments.json' with { type: 'json' };
import {
  gravityForceN, gravityResult, comparisonCategory, pullComparison, gravityPlaceNote, gravityText,
  formatNewtons, formatKg, resultSign, tinySolarSystem, tinySummary, formatModelSize, formatModelDistance, distanceCategory, formatEarthCm,
  parseMeasurement,
} from '../../src/utils/experiments.js';

const bodies = [sun, ...planets];
const byId = Object.fromEntries(bodies.map(body => [body.id, body]));
const earth = byId.earth;
const close = (actual, expected, tolerance, message) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ''} expected ${expected}, got ${actual}`);
const massInput = experiments.find(e => e.id === 'gravity-lab').input;
const earthInput = experiments.find(e => e.id === 'tiny-solar-system').input;

test('F = m × g matches the worked examples', () => {
  close(gravityForceN(10, 9.8), 98, 1e-9, '10 kg at 9.8 m/s²');
  close(gravityForceN(10, 3.7), 37, 1e-9, '10 kg at 3.7 m/s²');
  close(gravityForceN(2.5, 23.1), 57.75, 1e-9, '2.5 kg at 23.1 m/s²');
  assert.equal(gravityForceN(0.1, 9.8).toFixed(2), '0.98');
});

test('the gravity lab uses the sourced values: 10 kg is 98 N on Earth and 37 N on Mars', () => {
  // Independent expectations: NASA's fact sheet gives 9.8 m/s² for Earth and 3.7 m/s² for Mars.
  const mars = gravityResult(10, byId.mars, earth);
  close(mars.forceN, 37, 1e-9);
  close(mars.earthForceN, 98, 1e-9);
  assert.equal(mars.massKg, 10, 'the mass never changes');
  assert.equal(mars.category, 'less');
  assert.equal(formatNewtons(mars.forceN), '37 N');
  assert.equal(formatNewtons(mars.earthForceN), '98 N');
  const jupiter = gravityResult(10, byId.jupiter, earth);
  close(jupiter.forceN, 231, 1e-9, 'Jupiter 23.1 m/s²');
  assert.equal(jupiter.category, 'more');
  assert.equal(gravityResult(10, earth, earth).category, 'same');
});

test('precision is kept internally and only display text is rounded', () => {
  const result = gravityResult(12.345, byId.mars, earth);
  assert.equal(result.forceN, 12.345 * 3.7, 'unrounded');
  close(result.forceN, 45.6765, 1e-9);
  assert.equal(formatNewtons(result.forceN), '45.7 N');
  assert.equal(formatKg(12.345), '12.345 kg', 'the mass is shown exactly as entered');
  assert.equal(formatNewtons(1000 * 23.1), '23,100 N');
});

test('the workings can be repeated by hand: entered mass kept, ≈ when the result is rounded', () => {
  // 0.1049 × 23.1 = 2.42319, shown as 2.4 N, so the sign must be ≈ and the mass must stay 0.1049.
  const tiny = gravityText(gravityResult(0.1049, byId.jupiter, earth), byId.jupiter);
  assert.equal(tiny.calculation, '0.1049 kg × 23.1 m/s² ≈ 2.42 N');
  assert.equal(tiny.earthCalculation, '0.1049 kg × 9.8 m/s² ≈ 1.03 N on Earth'); // 1.02802
  assert.equal(tiny.heading, 'A 0.1049 kg mass on Jupiter');
  // Exact results keep "=": 10 × 3.7 = 37 and 2.5 × 23.1 = 57.75 (rounded, so ≈).
  assert.equal(gravityText(gravityResult(10, byId.mars, earth), byId.mars).calculation, '10 kg × 3.7 m/s² = 37 N');
  assert.equal(gravityText(gravityResult(10, byId.mars, earth), byId.mars).earthCalculation, '10 kg × 9.8 m/s² = 98 N on Earth');
  assert.equal(gravityText(gravityResult(2.5, byId.jupiter, earth), byId.jupiter).calculation, '2.5 kg × 23.1 m/s² ≈ 57.8 N');
  assert.equal(resultSign(0.98), '=');
  assert.equal(gravityText(gravityResult(0.1, earth, earth), earth).calculation, '0.1 kg × 9.8 m/s² = 0.98 N');
  assert.equal(resultSign(2.42319), '≈');
  assert.equal(resultSign(10 * 3.7), '=', 'floating-point noise is not treated as rounding');
});

test('comparison bands and wording', () => {
  assert.equal(comparisonCategory(0.969), 'less');
  assert.equal(comparisonCategory(0.98), 'same');
  assert.equal(comparisonCategory(1.02), 'same');
  assert.equal(comparisonCategory(1.03), 'more');
  assert.equal(pullComparison(gravityResult(10, byId.mars, earth)), 'about 38% of the pull on Earth'); // 3.7 / 9.8 = 0.3776
  assert.equal(pullComparison(gravityResult(10, byId.jupiter, earth)), 'about 2.4 times the pull on Earth'); // 23.1 / 9.8 = 2.357
  assert.equal(pullComparison(gravityResult(10, byId.neptune, earth)), 'about 1.1 times the pull on Earth'); // 11.0 / 9.8 = 1.122
});

test('giant planets: the 1-bar level is named and nobody is told they could stand there', () => {
  for (const planet of planets) {
    const note = gravityPlaceNote(planet);
    if (planet.hasSolidSurface) {
      assert.equal(note, `This uses gravity measured at the surface of ${planet.name}.`);
    } else {
      assert.match(note, /no solid surface/);
      assert.match(note, /nobody could stand there/);
      assert.match(note, /1-bar level/);
      const text = gravityText(gravityResult(10, planet, earth), planet);
      assert.match(text.measured, /1-bar level/);
      assert.doesNotMatch(Object.values(text).join(' '), /surface of|on the ground|standing on/i);
    }
  }
});

test('result text never treats kilograms as a force or says the mass changes', () => {
  for (const planet of planets) {
    for (const mass of [0.1, 10, 72.5, 1000]) {
      const text = Object.values(gravityText(gravityResult(mass, planet, earth), planet)).join(' ');
      assert.doesNotMatch(text, /weighs?\s+[\d.,]+\s*(kg|kilograms)|kilograms? of force|\bkgf\b|gains? mass|loses? mass|more mass|less mass/i, `${planet.id} ${mass}`);
      assert.match(text, /\bN\b/, 'force in newtons');
    }
  }
});

test('the tiny solar system matches independently calculated examples', () => {
  // Worked by hand: model size = real size × (Earth model cm ÷ 12,756 km).
  const one = tinySolarSystem(bodies, earth, 1);
  const row = (model, id) => model.rows.find(r => r.id === id);
  close(one.sunDiameterCm, 109.0781, 1e-4, 'Sun 1,391,400 ÷ 12,756');
  close(row(one, 'earth').modelDistanceM, 117.2781, 1e-4, 'Earth 149.6 million km');
  close(one.neptuneDistanceM, 3539.5108, 1e-4, 'Neptune 4,515 million km');
  close(row(tinySolarSystem(bodies, earth, 2), 'jupiter').modelDiameterCm, 22.4183, 1e-4, 'Jupiter at 2 cm');
  close(row(tinySolarSystem(bodies, earth, 0.5), 'mercury').modelDistanceM, 22.6952, 1e-4, 'Mercury at 0.5 cm');
  close(tinySolarSystem(bodies, earth, 5).neptuneDistanceM, 17697.554, 1e-3, 'Neptune at 5 cm');
  assert.equal(row(one, 'earth').modelDiameterCm, 1, 'Earth is the size chosen');
  assert.equal(row(one, 'sun').modelDistanceM, null, 'the Sun is the centre');
  assert.equal(one.rows.length, 9);
  assert.deepEqual(one.rows.map(r => r.id), ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
});

test('model sizes and distances are rounded only for display', () => {
  assert.equal(formatModelSize(109.0781), '1.1 m');
  assert.equal(formatModelSize(22.4183), '22.4 cm');
  assert.equal(formatModelSize(0.3825), '3.8 mm'); // Mercury at 1 cm
  assert.equal(formatModelDistance(3539.5108), '3.5 km');
  assert.equal(formatModelDistance(117.2781), '117 metres');
  assert.equal(formatModelDistance(22.6952), '23 metres');
  assert.deepEqual(tinySummary(tinySolarSystem(bodies, earth, 1)), [
    'With Earth 1 cm wide, the Sun would be a ball about 1.1 m wide.',
    'Neptune, the farthest planet, would be about 3.5 km from that Sun on average.',
  ]);
  assert.equal(formatEarthCm(2.25), '2.25 cm', 'the chosen Earth width is never rounded');
});

test('Neptune’s prediction band changes with the model size', () => {
  assert.equal(distanceCategory(4999.9), 'under-5-km');
  assert.equal(distanceCategory(5000), '5-to-10-km');
  assert.equal(distanceCategory(10000), '5-to-10-km');
  assert.equal(distanceCategory(10000.1), 'over-10-km');
  // Neptune is 3,539.51 m away per cm of model Earth (4,515 million km ÷ 12,756 km ÷ 100).
  const band = cm => tinySolarSystem(bodies, earth, cm).category;
  assert.equal(band(0.5), 'under-5-km'); // 1.77 km
  assert.equal(band(1.41), 'under-5-km'); // 4.99 km
  assert.equal(band(1.42), '5-to-10-km'); // 5.03 km
  assert.equal(band(2.82), '5-to-10-km'); // 9.98 km
  assert.equal(band(2.83), 'over-10-km'); // 10.02 km
  assert.equal(band(5), 'over-10-km'); // 17.70 km
  assert.deepEqual(new Set([0.5, 2, 5].map(band)).size, 3, 'all three answers are reachable');
});

test('valid inputs are accepted with full precision', () => {
  assert.deepEqual(parseMeasurement('10', massInput), { ok: true, value: 10 });
  assert.deepEqual(parseMeasurement('  72.55 ', massInput), { ok: true, value: 72.55 });
  assert.deepEqual(parseMeasurement('1,000', massInput), { ok: true, value: 1000 });
  assert.deepEqual(parseMeasurement('0.1', massInput), { ok: true, value: 0.1 });
  assert.deepEqual(parseMeasurement('.5', earthInput), { ok: true, value: 0.5 });
  assert.deepEqual(parseMeasurement('5', earthInput), { ok: true, value: 5 });
  assert.deepEqual(parseMeasurement('2.25', earthInput), { ok: true, value: 2.25 });
  assert.deepEqual(parseMeasurement('0.1049', massInput), { ok: true, value: 0.1049 }, 'masses keep every decimal typed');
});

test('invalid, empty, zero, negative and out-of-range inputs get clear messages', () => {
  const cases = [
    ['', massInput, 'empty', /Please type the mass: any number from 0.1 to 1,000 kilograms/],
    ['   ', earthInput, 'empty', /Please type the model Earth's diameter: any number from 0.5 to 5 centimetres/],
    ['abc', massInput, 'not-a-number', /“abc” isn’t a number\. Type digits, for example 10/],
    ['10 kg', massInput, 'not-a-number', /isn’t a number/],
    ['1e3', massInput, 'not-a-number', /isn’t a number/],
    ['Infinity', massInput, 'not-a-number', /isn’t a number/],
    ['2,5', earthInput, 'not-a-number', /isn’t a number/],
    ['0', massInput, 'not-positive', /must be more than 0 kg/],
    ['0.0', earthInput, 'not-positive', /must be more than 0 cm/],
    ['-5', massInput, 'not-positive', /must be more than 0 kg/],
    ['-0', massInput, 'not-positive', /must be more than 0 kg/],
    ['0.05', massInput, 'too-small', /0.05 kg is too small\. Choose a number from 0.1 to 1,000 kilograms/],
    ['0.4', earthInput, 'too-small', /0.4 cm is too small/],
    ['1001', massInput, 'too-big', /1,001 kg is too big/],
    ['5.1', earthInput, 'too-big', /5.1 cm is too big\. Choose a number from 0.5 to 5 centimetres/],
    ['2.255', earthInput, 'too-precise', /Use at most 2 decimal places, for example 2.75/],
  ];
  for (const [text, input, code, message] of cases) {
    const result = parseMeasurement(text, input);
    assert.equal(result.ok, false, JSON.stringify(text));
    assert.equal(result.code, code, JSON.stringify(text));
    assert.match(result.message, message, JSON.stringify(text));
  }
  assert.equal(parseMeasurement(undefined, massInput).code, 'empty');
});
