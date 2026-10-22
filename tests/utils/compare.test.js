import { test } from 'node:test';
import assert from 'node:assert/strict';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import { earthComparisons, ratios, nearestFraction, formatTimes, lightTravelSeconds, formatMinutesSeconds } from '../../src/utils/compare.js';

const byId = Object.fromEntries([sun, ...planets].map(body => [body.id, body]));
const earth = byId.earth;
const find = (body, id) => earthComparisons(body, earth).find(item => item.id === id);

test('ratios are calculated from the measured values', () => {
  const jupiter = ratios(byId.jupiter, earth);
  assert.ok(Math.abs(jupiter.width - 142984 / 12756) < 1e-12);
  assert.ok(Math.abs(jupiter.mass - 1898 / 5.97) < 1e-12);
  assert.ok(Math.abs(jupiter.gravity - 23.1 / 9.8) < 1e-12);
  assert.ok(Math.abs(jupiter.distance - 778.5 / 149.6) < 1e-12);
  assert.equal(ratios(sun, earth).distance, null);
  assert.equal(ratios(sun, earth).year, null);
});

test('simple fractions and multipliers read naturally', () => {
  assert.equal(nearestFraction(4879 / 12756), 'two-fifths');
  assert.equal(nearestFraction(6792 / 12756), 'half');
  assert.equal(nearestFraction(0.26), 'a quarter');
  assert.equal(formatTimes(2.357), '2.4');
  assert.equal(formatTimes(11.21), '11');
  assert.equal(formatTimes(109.08), '109');
  assert.equal(formatTimes(1321.4), '1,320');
  assert.equal(formatTimes(1298000), '1.3 million');
});

test('Earth is the yardstick and has no comparisons with itself', () => {
  assert.deepEqual(earthComparisons(earth, earth), []);
});

test('width comparisons match NASA’s own descriptions', () => {
  assert.equal(find(byId.jupiter, 'width').simple, 'Jupiter is about 11 times as wide as Earth.');
  assert.equal(find(byId.mars, 'width').simple, 'Mars is about half as wide as Earth.');
  assert.equal(find(byId.venus, 'width').simple, 'Venus is almost as wide as Earth (95%).');
  assert.equal(find(byId.uranus, 'width').simple, 'Uranus is about 4 times as wide as Earth.');
  assert.equal(find(sun, 'width').simple, 'The Sun is about 109 times as wide as Earth.');
});

test('the Sun’s calculated volume agrees with NASA’s “1.3 million Earths”', () => {
  assert.equal(find(sun, 'volume').simple, 'It has about 1.3 million times Earth\'s volume.');
});

test('weight comparisons never suggest standing on a world without solid ground', () => {
  for (const body of [sun, ...planets].filter(b => b.id !== 'earth')) {
    const weight = find(body, 'weight');
    if (body.hasSolidSurface) {
      assert.match(weight.simple, new RegExp(`^Standing on ${body.name}`));
    } else {
      assert.match(weight.simple, /^There is no ground to stand on\./, body.name);
      assert.doesNotMatch(weight.simple, /Standing on/);
      assert.match(weight.detailed, /no solid surface/);
    }
  }
  assert.match(find(byId.jupiter, 'weight').simple, /1-bar level.*about 2\.4 times as heavy/);
  assert.match(find(byId.mars, 'weight').simple, /about 38% of your Earth weight/);
  assert.match(find(sun, 'weight').simple, /photosphere/);
  assert.match(find(sun, 'weight').detailed, /^The Sun has no solid surface/);
  assert.equal(find(sun, 'volume').detailed, 'The Sun has about 1.3 million times Earth\'s volume, calculated from its diameter.');
});

test('day and year comparisons use solar days and orbital periods', () => {
  assert.match(find(byId.mercury, 'day').simple, /176 Earth days/);
  assert.match(find(byId.venus, 'day').simple, /116\.8 Earth days|117 Earth days/);
  assert.match(find(byId.venus, 'day').detailed, /243 Earth days, and it spins backwards/);
  assert.match(find(byId.jupiter, 'day').simple, /9\.9 hours/);
  assert.doesNotMatch(find(byId.neptune, 'day').detailed, /\(16\.1 hours\)/, 'no repeated hours for short days');
  assert.match(find(byId.mercury, 'day').detailed, /176 Earth days \(4,222\.6 hours\)/);
  assert.match(find(byId.mercury, 'year').simple, /88 Earth days/);
  assert.match(find(byId.jupiter, 'year').simple, /11\.9 Earth years/);
  assert.match(find(byId.neptune, 'year').simple, /164 Earth years/);
  assert.match(find(sun, 'day').simple, /25\.4 Earth days/);
});

test('distance comparisons, and sunlight travel time for the Sun', () => {
  assert.equal(find(byId.neptune, 'distance').simple, 'It is about 30 times as far from the Sun as Earth.');
  assert.equal(find(byId.mercury, 'distance').simple, 'It is about two-fifths as far from the Sun as Earth.');
  assert.ok(Math.abs(lightTravelSeconds(149.6) - 499.0) < 0.1);
  assert.equal(formatMinutesSeconds(499.0), '8 minutes 19 seconds');
  assert.match(find(sun, 'distance').simple, /8 minutes 19 seconds/);
});

test('temperature comparisons name the measurement level', () => {
  assert.match(find(byId.venus, 'temperature').simple, /464 °C: much hotter than/);
  assert.match(find(byId.neptune, 'temperature').detailed, /1-bar level/);
  assert.match(find(sun, 'temperature').detailed, /^5,499 °C is the temperature of its visible layer/);
});

test('every comparison has both a simple and a detailed sentence', () => {
  for (const body of [sun, ...planets].filter(b => b.id !== 'earth')) {
    for (const item of earthComparisons(body, earth)) {
      assert.ok(item.simple.length > 10 && item.detailed.length > 10, `${body.id} ${item.id}`);
      assert.doesNotMatch(item.simple + item.detailed, /NaN|undefined|null|Infinity/, `${body.id} ${item.id}`);
    }
  }
});
