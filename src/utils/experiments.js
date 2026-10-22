// Science Experiments: pure calculations, input checking and display text. No DOM here.
// Calculations keep full precision; only the format* helpers round, for display.
import { trueScaleModel, lengthText } from './scale.js';
import { formatNumber, formatFixed } from './format.js';
import { formatTimes } from './compare.js';

// ----- Gravity lab -----

/** Force in newtons from F = m × g (mass in kg, gravity in m/s²). */
export function gravityForceN(massKg, gravityMs2) {
  return massKg * gravityMs2;
}

/** 'less' | 'same' | 'more' compared with Earth, using the same ±3% band as the Earth comparisons. */
export function comparisonCategory(ratio) {
  if (ratio >= 1.03) return 'more';
  if (ratio > 0.97) return 'same';
  return 'less';
}

/** Everything the result needs, unrounded. */
export function gravityResult(massKg, body, earth) {
  const gravityMs2 = body.measurements.gravityMs2;
  const earthGravityMs2 = earth.measurements.gravityMs2;
  const forceN = gravityForceN(massKg, gravityMs2);
  const earthForceN = gravityForceN(massKg, earthGravityMs2);
  const ratio = gravityMs2 / earthGravityMs2;
  return {
    massKg,
    worldId: body.id,
    gravityMs2,
    earthGravityMs2,
    forceN,
    earthForceN,
    ratio,
    category: comparisonCategory(ratio),
    reference: body.measurements.gravityReference,
    hasSolidSurface: body.hasSolidSurface,
  };
}

export const formatKg = kg => `${formatNumber(kg, 2)} kg`;
export const formatNewtons = n => `${formatNumber(n, 1)} N`;
export const formatGravity = g => `${formatFixed(g, 1)} m/s²`;

/** "about 38% of the pull on Earth" / "about the same as the pull on Earth" / "about 2.4 times the pull on Earth". */
export function pullComparison(result) {
  if (result.category === 'more') return `about ${formatTimes(result.ratio)} times the pull on Earth`;
  if (result.category === 'same') return 'about the same as the pull on Earth';
  return `about ${formatNumber(Math.round(result.ratio * 100), 0)}% of the pull on Earth`;
}

/** Where the gravity value applies. Giant planets have no ground: their value is at the 1-bar level. */
export function gravityPlaceNote(body) {
  if (body.hasSolidSurface) return `This uses gravity measured at the surface of ${body.name}.`;
  return `${body.name} has no solid surface, so nobody could stand there. This uses gravity measured at the 1-bar level in its atmosphere, where the pressure is about the same as Earth's air at sea level.`;
}

/** Display text for a gravity result. */
export function gravityText(result, body) {
  const kg = formatKg(result.massKg);
  const onWorld = body.id === 'earth' ? 'on Earth' : `on ${body.name}`;
  return {
    heading: `A ${kg} mass ${onWorld}`,
    headline: `Gravity ${onWorld} pulls on it with a force of about ${formatNewtons(result.forceN)}.`,
    comparison: body.id === 'earth'
      ? `This is the pull every other planet is compared with. Try another planet to see the difference: the mass stays ${kg} everywhere.`
      : `On Earth, the same ${kg} mass is pulled with about ${formatNewtons(result.earthForceN)}. On ${body.name} the pull is ${pullComparison(result)}. The mass is still ${kg}.`,
    measured: `Gravity ${body.hasSolidSurface ? `at the surface of ${body.name}` : `at the 1-bar level on ${body.name}`}: ${formatGravity(result.gravityMs2)}`,
    calculation: `${kg} × ${formatGravity(result.gravityMs2)} = ${formatNewtons(result.forceN)}`,
    earthCalculation: `${kg} × ${formatGravity(result.earthGravityMs2)} = ${formatNewtons(result.earthForceN)} on Earth`,
    placeNote: gravityPlaceNote(body),
  };
}

// ----- Build a tiny solar system -----

/** Prediction band for Neptune's model distance. */
export function distanceCategory(metres) {
  if (metres < 100) return 'under-100-m';
  if (metres <= 1000) return '100-m-to-1-km';
  return 'over-1-km';
}

/** Model width: millimetres below 1 cm, centimetres below 1 m, then metres. */
export function formatModelSize(cm) {
  if (cm < 1) return `${formatNumber(cm * 10, 1)} mm`;
  if (cm < 100) return `${formatNumber(cm, 1)} cm`;
  return `${formatNumber(cm / 100, 1)} m`;
}

/** Model distance, worded exactly like the overview's "The real size of space". */
export const formatModelDistance = metres => lengthText(metres);

/**
 * The tiny solar system for a model Earth `earthCm` wide. Reuses the overview's true-scale
 * calculation, adding the measured values each row comes from. Values are unrounded.
 */
export function tinySolarSystem(bodies, earth, earthCm) {
  const model = trueScaleModel(bodies, earth, earthCm);
  const byId = Object.fromEntries(bodies.map(body => [body.id, body]));
  const rows = model.map(entry => {
    const body = byId[entry.id];
    return {
      id: entry.id,
      name: body.kind === 'star' ? 'Sun' : body.name,
      kind: body.kind,
      diameterKm: body.measurements.diameterKm,
      diameterType: body.measurements.diameterType,
      distanceE6Km: body.measurements.meanDistanceFromSunE6Km,
      modelDiameterCm: entry.diameterCm,
      modelDistanceM: body.measurements.meanDistanceFromSunE6Km === null ? null : entry.distanceM,
    };
  });
  const sun = rows.find(row => row.id === 'sun');
  const neptune = rows.find(row => row.id === 'neptune');
  return { earthCm, rows, sunDiameterCm: sun.modelDiameterCm, neptuneDistanceM: neptune.modelDistanceM, category: distanceCategory(neptune.modelDistanceM) };
}

export function tinySummary(model) {
  return [
    `With Earth ${formatModelSize(model.earthCm)} wide, the Sun would be a ball about ${formatModelSize(model.sunDiameterCm)} wide.`,
    `Neptune, the farthest planet, would be about ${formatModelDistance(model.neptuneDistanceM)} from that Sun on average.`,
  ];
}

// ----- Input checking -----

const NUMBER = /^\+?(\d+(\.\d*)?|\.\d+)$/;
const THOUSANDS = /^\+?\d{1,3}(,\d{3})+(\.\d+)?$/;

/**
 * Check what the child typed against an input definition from experiments.json.
 * Returns { ok: true, value } or { ok: false, code, message } with a friendly message.
 */
export function parseMeasurement(text, input) {
  const trimmed = String(text ?? '').trim();
  const range = `from ${formatNumber(input.min, 2)} to ${formatNumber(input.max, 2)} ${input.unitName}`;
  const what = `${input.label[0].toLowerCase()}${input.label.slice(1)}`;
  if (trimmed === '') return { ok: false, code: 'empty', message: `Please type the ${what}: any number ${range}.` };
  const normalised = THOUSANDS.test(trimmed) ? trimmed.replaceAll(',', '') : trimmed;
  const value = Number(normalised);
  if (/^-/.test(normalised) && Number.isFinite(value)) {
    return { ok: false, code: 'not-positive', message: `The ${what} must be more than 0 ${input.unit}. Choose a number ${range}.` };
  }
  if (!NUMBER.test(normalised) || !Number.isFinite(value)) {
    return { ok: false, code: 'not-a-number', message: `“${trimmed}” isn’t a number. Type digits, for example ${formatNumber(input.default, 2)}.` };
  }
  if (value <= 0) return { ok: false, code: 'not-positive', message: `The ${what} must be more than 0 ${input.unit}. Choose a number ${range}.` };
  if (value < input.min) return { ok: false, code: 'too-small', message: `${formatNumber(value, 3)} ${input.unit} is too small. Choose a number ${range}.` };
  if (value > input.max) return { ok: false, code: 'too-big', message: `${formatNumber(value, 3)} ${input.unit} is too big. Choose a number ${range}.` };
  return { ok: true, value };
}
