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

/** The mass exactly as entered (no rounding), so the workings can be repeated by hand. */
export const formatKg = kg => `${formatNumber(kg, 10)} kg`;
/** Decimal places shown for a force: two below 10 N (so 0.98 N stays 0.98 N), otherwise one. */
const newtonDecimals = n => (n < 10 ? 2 : 1);
export const formatNewtons = n => `${formatNumber(n, newtonDecimals(n))} N`;
/** "=" when the displayed force is exact, "≈" when it has been rounded for display. */
export function resultSign(n) {
  const factor = 10 ** newtonDecimals(n);
  return Math.abs(Math.round(n * factor) / factor - n) < 1e-9 ? '=' : '≈';
}
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
    calculation: `${kg} × ${formatGravity(result.gravityMs2)} ${resultSign(result.forceN)} ${formatNewtons(result.forceN)}`,
    earthCalculation: `${kg} × ${formatGravity(result.earthGravityMs2)} ${resultSign(result.earthForceN)} ${formatNewtons(result.earthForceN)} on Earth`,
    placeNote: gravityPlaceNote(body),
  };
}

// ----- Build a tiny solar system -----

/** Prediction band for Neptune's model distance (about 1.8 to 17.7 km across the allowed Earth sizes). */
export function distanceCategory(metres) {
  if (metres < 5000) return 'under-5-km';
  if (metres <= 10000) return '5-to-10-km';
  return 'over-10-km';
}

/** The model Earth's width exactly as entered (inputs allow up to 2 decimal places). */
export const formatEarthCm = cm => `${formatNumber(cm, 2)} cm`;

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
    `With Earth ${formatEarthCm(model.earthCm)} wide, the Sun would be a ball about ${formatModelSize(model.sunDiameterCm)} wide.`,
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
  const decimals = (normalised.split('.')[1] ?? '').length;
  if (input.decimals !== undefined && decimals > input.decimals) {
    return { ok: false, code: 'too-precise', message: `Use at most ${input.decimals} decimal places, for example ${formatNumber(Number(((input.min + input.max) / 2).toFixed(input.decimals)), input.decimals)}.` };
  }
  return { ok: true, value };
}
