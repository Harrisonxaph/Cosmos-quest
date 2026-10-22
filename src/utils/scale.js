// Illustrative scale for the 3D scene, and true-scale explanations for the panels.
// The scene cannot be drawn to scale: at true scale every planet would be smaller than a pixel.
// These functions keep the ORDER of sizes and distances correct while compressing the range.

export const SUN_SCENE_RADIUS = 3.2;
const PLANET_SIZE_FACTOR = 0.32;
const PLANET_SIZE_EXPONENT = 0.45;
const ORBIT_OFFSET = 6;
const ORBIT_FACTOR = 8.5;
const ORBIT_SPEED_FACTOR = 0.35;
const SPIN_SPEED_FACTOR = 1.2;

/** Scene radius in scene units. Planet sizes are compressed; the Sun is shrunk a lot more. */
export function sceneRadius(body, earth) {
  if (body.kind === 'star') return SUN_SCENE_RADIUS;
  const ratio = body.measurements.diameterKm / earth.measurements.diameterKm;
  return PLANET_SIZE_FACTOR * ratio ** PLANET_SIZE_EXPONENT;
}

/** Orbit radius in scene units from the real average distance (compressed with a square root). */
export function orbitRadius(body, earth) {
  if (body.kind === 'star') return 0;
  const au = body.measurements.meanDistanceFromSunE6Km / earth.measurements.meanDistanceFromSunE6Km;
  return ORBIT_OFFSET + ORBIT_FACTOR * Math.sqrt(au);
}

/** Radians per second of scene time. Inner planets still go round faster, but the range is squeezed. */
export function orbitAngularSpeed(body, earth) {
  if (body.kind === 'star') return 0;
  return ORBIT_SPEED_FACTOR * Math.sqrt(earth.measurements.orbitalPeriodDays / body.measurements.orbitalPeriodDays);
}

/**
 * Spin speed in radians per second of scene time. Always positive: direction comes from the axis tilt,
 * because the fact sheet's obliquity above 90° (Venus, Uranus) already describes a backwards spin.
 */
export function spinAngularSpeed(body, earth) {
  const hours = Math.abs(body.measurements.rotationPeriodHours);
  return SPIN_SPEED_FACTOR * (earth.measurements.rotationPeriodHours / hours) ** 0.35;
}

/** Axis tilt in degrees for the scene. The Sun's tilt is not part of the data set, so it is drawn upright. */
export function axisTiltDegrees(body) {
  return body.measurements.obliquityDeg ?? 0;
}

/**
 * True-scale model: if Earth were a bead `earthCm` wide, how big and how far would things be?
 * Returns sizes in centimetres and distances in metres.
 */
export function trueScaleModel(bodies, earth, earthCm = 1) {
  const cmPerKm = earthCm / earth.measurements.diameterKm;
  return bodies.map(body => ({
    id: body.id,
    name: body.name,
    diameterCm: body.measurements.diameterKm * cmPerKm,
    distanceM: body.measurements.meanDistanceFromSunE6Km === null ? 0 : (body.measurements.meanDistanceFromSunE6Km * 1e6 * cmPerKm) / 100,
  }));
}

function lengthText(metres) {
  if (metres >= 1000) return `${(Math.round(metres / 100) / 10).toLocaleString('en-GB')} km`;
  return `${Math.round(metres).toLocaleString('en-GB')} metres`;
}

/** Sentences explaining true scale, used in the overview panel. */
export function trueScaleSentences(bodies, earth) {
  const model = trueScaleModel(bodies, earth, 1);
  const byId = Object.fromEntries(model.map(entry => [entry.id, entry]));
  const sunWidthM = byId.sun.diameterCm / 100;
  return [
    `If Earth were a bead 1 cm wide, the Sun would be a ball about ${(Math.round(sunWidthM * 10) / 10).toLocaleString('en-GB')} metres wide.`,
    `Earth would be about ${lengthText(byId.earth.distanceM)} from that Sun, and Neptune would be about ${lengthText(byId.neptune.distanceM)} away.`,
    `Jupiter, the biggest planet, would be about ${(Math.round(byId.jupiter.diameterCm * 10) / 10).toLocaleString('en-GB')} cm wide.`,
  ];
}

/** Why the 3D view can't be to scale, and what stays true. Shown in the overview and used by missions. */
export const SCALE_INTRO = 'Space is so big that a true-scale picture would show only tiny dots.';
export const SCALE_MEASUREMENTS_NOTE = 'The numbers in the information panels are real measurements.';

/** What the 3D view changes compared with reality. Shown wherever the scene is visible. */
export const SCALE_CHANGES = [
  'Planet sizes are enlarged compared with the distances between them.',
  'Distances are squeezed so the outer planets fit on screen.',
  'The Sun is shown much smaller than it really is.',
  'Orbits and spins are sped up, and orbits are drawn as circles.',
  'Planet positions are not where the planets are today.',
  'Colours and patterns are an artist’s impression made by code, not NASA photos.',
  'The background stars are decorative.',
];
