// What the information panel says about a body, as plain data (no DOM), so tests can check it.
import {
  formatNumber,
  formatFixed,
  formatTemperature,
  formatDuration,
  formatDays,
  formatAsOf,
  formatMass,
  formatDistanceE6Km,
  kindLabel,
  ordinal,
} from './format.js';
import { earthComparisons } from './compare.js';

const GRAVITY_NOTES = {
  surface: 'At the surface',
  '1-bar': 'At the 1-bar level in the atmosphere. There is no solid surface.',
  photosphere: 'At the photosphere, the visible layer of glowing gas',
};

const TEMPERATURE_NOTES = {
  'surface-mean': 'Average over the surface',
  '1-bar-mean': 'Average at the 1-bar level in the atmosphere',
  'photosphere-effective': 'At the visible layer (photosphere)',
};

export function bodyHeadline(body) {
  if (body.kind === 'star') return 'Star · the centre of our solar system';
  return `${kindLabel(body.kind)} · ${ordinal(body.orderFromSun)} planet from the Sun`;
}

/** A clear warning for worlds without solid ground, or null for rocky planets. */
export function noSurfaceNotice(body) {
  if (body.hasSolidSurface) return null;
  if (body.kind === 'star') return 'The Sun is a ball of glowing gas with no solid surface.';
  return `${body.name} has no solid surface. Its gravity and temperature are measured at the 1-bar level in its atmosphere, where the pressure is about the same as Earth's air at sea level.`;
}

/** Rows for the "Measured by scientists" list. Detailed mode adds extra rows and notes. */
export function measurementRows(body, mode = 'simple') {
  const m = body.measurements;
  const detailed = mode === 'detailed';
  const rows = [];
  const row = (id, label, value, note = null) => rows.push({ id, label, value, note });

  row('diameter', 'Diameter', `${formatNumber(m.diameterKm, 0)} km`, detailed ? (m.diameterType === 'equatorial' ? 'Measured across the equator' : 'Average (mean) diameter') : null);
  row('mass', 'Mass', formatMass(m.massE24Kg), detailed ? '10²⁴ means a 1 followed by 24 zeros' : null);
  row(
    'gravity',
    body.hasSolidSurface ? 'Surface gravity' : 'Gravity',
    `${formatFixed(m.gravityMs2, 1)} m/s²`,
    body.hasSolidSurface && !detailed ? null : GRAVITY_NOTES[m.gravityReference],
  );

  if (m.meanDistanceFromSunE6Km !== null) {
    const au = m.meanDistanceFromSunE6Km / 149.6;
    row('distance', 'Average distance from the Sun', formatDistanceE6Km(m.meanDistanceFromSunE6Km), detailed ? `${formatNumber(au, 2)} AU (1 AU is Earth's average distance)` : null);
  } else if (m.meanDistanceFromEarthE6Km) {
    row('distance', 'Average distance from Earth', formatDistanceE6Km(m.meanDistanceFromEarthE6Km));
  }

  if (m.dayLengthHours !== null) {
    row('day', 'Length of day', formatDuration(m.dayLengthHours), detailed ? 'Sunrise to sunrise' : null);
  }
  if (detailed || m.dayLengthHours === null) {
    const notes = [];
    if (m.rotationPeriodHours < 0) notes.push('Spins backwards (retrograde) compared with Earth');
    if (m.rotationLatitudeDeg !== undefined) notes.push(`Measured at ${m.rotationLatitudeDeg}° latitude`);
    if (detailed) notes.push('One spin relative to the distant stars');
    row('rotation', 'Spin (rotation period)', formatDuration(m.rotationPeriodHours), notes.join('. ') || null);
  }
  if (m.orbitalPeriodDays !== null) {
    row('year', 'Length of year', formatDays(m.orbitalPeriodDays), detailed ? `${formatNumber(m.orbitalPeriodDays, 1)} Earth days for one orbit` : null);
  }

  row('temperature', 'Temperature', formatTemperature(m.temperatureC), TEMPERATURE_NOTES[m.temperatureReference]);
  row('moons', 'Known moons', formatNumber(body.moons.count, 0), body.kind === 'star' ? body.moons.note : `NASA count as of ${formatAsOf(body.moons.asOf)}`);

  if (detailed && m.obliquityDeg !== null) {
    row('tilt', 'Axis tilt', `${formatNumber(m.obliquityDeg, 3)}°`, m.obliquityDeg > 90 ? 'More than 90°, so it spins backwards' : null);
  }
  if (detailed && body.kind !== 'star') row('rings', 'Rings', body.hasRings ? 'Yes' : 'No');
  return rows;
}

/** Every source a body's panel relies on, in first-use order, without duplicates. */
export function bodySourceIds(body) {
  const ids = [
    ...body.summary.sourceIds,
    ...body.measurements.sourceIds,
    ...body.temperatureContext.sourceIds,
    ...body.moons.sourceIds,
    ...body.composition.sourceIds,
    ...body.facts.map(fact => fact.sourceId),
  ];
  return [...new Set(ids)];
}

/** How the 3D view differs from reality for this body. */
export function modelNote(body) {
  if (body.kind === 'star') {
    return 'In the 3D view the Sun is drawn much smaller than it really is, so the planets can fit beside it.';
  }
  return `In the 3D view, ${body.name} is drawn much bigger compared with its distance from the Sun, and its orbit is squeezed closer to the Sun. Its colours are an artist's impression.`;
}

// The card's third fact: the first of the body's facts that doesn't mention moons (their counts change) and
// doesn't repeat the card's own size or order lines.
const REPEATS_CARD = /\bmoons?\b|\bwider?\b|planet from the Sun\.$/i;
export function cardFeature(body) {
  return body.facts.find(fact => !REPEATS_CARD.test(fact.text)) ?? body.facts[0];
}

/**
 * The compact facts card shown over the 3D view: name, kind, place in the solar system and three short facts.
 * Everything is derived from the same data and wording as the information panel, so the two never disagree.
 * Moon counts are left out because they change as new moons are confirmed.
 */
export function sceneCardContent(body, earth) {
  const comparisons = Object.fromEntries(earthComparisons(body, earth).map(item => [item.id, item]));
  const m = body.measurements;
  const size = body.id === earth.id
    ? { id: 'size', kind: 'measured', text: `Earth is ${formatNumber(m.diameterKm, 0)} km wide. Every size here is compared with Earth.` }
    : { id: 'size', kind: 'calculated', text: comparisons.width.simple };
  const time = body.kind === 'star'
    ? { id: 'spin', kind: 'measured', text: comparisons.day.simple }
    : { id: 'year', kind: 'measured', text: comparisons.year?.simple ?? `One trip around the Sun takes ${formatDays(m.orbitalPeriodDays)}.` };
  const feature = cardFeature(body);
  const notice = noSurfaceNotice(body);
  return {
    id: body.id,
    name: body.name,
    classification: kindLabel(body.kind),
    place: body.kind === 'star' ? 'The centre of our solar system' : `${ordinal(body.orderFromSun)[0].toUpperCase()}${ordinal(body.orderFromSun).slice(1)} planet from the Sun`,
    // Only the first sentence of the panel's warning, e.g. "Saturn has no solid surface."
    noSurface: notice ? notice.split('. ')[0].replace(/\.?$/, '.') : null,
    facts: [size, time, { id: 'feature', kind: 'fact', text: feature.text, sourceId: feature.sourceId }],
  };
}
