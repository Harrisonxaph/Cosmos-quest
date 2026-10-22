import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatFixed, roundSignificant, formatTemperature, formatDuration, formatAsOf, formatMass, ordinal, kindLabel } from '../../src/utils/format.js';

test('numbers use UK grouping and a true minus sign', () => {
  assert.equal(formatNumber(142984, 0), '142,984');
  assert.equal(formatNumber(0.33, 2), '0.33');
  assert.equal(formatNumber(-65, 0), '−65');
  assert.equal(formatFixed(9, 1), '9.0');
  assert.equal(formatFixed(274, 1), '274.0');
});

test('significant-figure rounding', () => {
  assert.equal(roundSignificant(109.08, 3), 109);
  assert.equal(roundSignificant(1321.4, 3), 1320);
  assert.equal(roundSignificant(0.0553, 2), 0.055);
});

test('temperatures, durations and dates', () => {
  assert.equal(formatTemperature(-200), '−200 °C');
  assert.equal(formatDuration(9.9), '9.9 hours');
  assert.equal(formatDuration(-17.2), '17.2 hours');
  assert.equal(formatDuration(609.12), '25.4 Earth days');
  assert.equal(formatDuration(4222.6), '176 Earth days');
  assert.equal(formatDuration(4331 * 24), '11.9 Earth years');
  assert.equal(formatDuration(59800 * 24), '164 Earth years');
  assert.equal(formatAsOf('2026-04'), 'April 2026');
  assert.equal(formatAsOf('2026-07-31'), '31 July 2026');
  assert.throws(() => formatAsOf('2026-13'));
});

test('mass, ordinals and kinds', () => {
  assert.equal(formatMass(5.97), '5.97 × 10²⁴ kg');
  assert.equal(ordinal(3), 'third');
  assert.equal(ordinal(8), 'eighth');
  assert.equal(kindLabel('ice-giant'), 'Ice giant');
});
