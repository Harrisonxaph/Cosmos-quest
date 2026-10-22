// Earth comparisons calculated from the measured values in src/data/.
// Pure functions: they take body objects and return plain text, so tests can check the maths.
import { formatNumber, formatFixed, roundSignificant, formatDuration, formatDays, formatTemperature } from './format.js';

export const SPEED_OF_LIGHT_KM_S = 299792.458;

const FRACTIONS = [
  [1 / 4, 'a quarter'],
  [1 / 3, 'a third'],
  [2 / 5, 'two-fifths'],
  [1 / 2, 'half'],
  [3 / 5, 'three-fifths'],
  [2 / 3, 'two-thirds'],
  [3 / 4, 'three-quarters'],
  [4 / 5, 'four-fifths'],
];

/** Closest simple fraction in words, for ratios below 1 (e.g. 0.38 → "two-fifths"). */
export function nearestFraction(ratio) {
  let best = FRACTIONS[0];
  for (const candidate of FRACTIONS) {
    if (Math.abs(candidate[0] - ratio) < Math.abs(best[0] - ratio)) best = candidate;
  }
  return best[1];
}

/** "2.4", "11", "1,320", "1.3 million" — readable multipliers for ratios above 1. */
export function formatTimes(ratio) {
  if (ratio >= 1e6) return `${formatNumber(roundSignificant(ratio / 1e6, 2), 1)} million`;
  if (ratio >= 100) return formatNumber(roundSignificant(ratio, 3), 0);
  if (ratio >= 10) return formatNumber(Math.round(ratio), 0);
  return formatNumber(Math.round(ratio * 10) / 10, 1);
}

/** Sentence subject: "The Sun" for the star, otherwise the planet's name. */
export function subject(body) {
  return body.kind === 'star' ? 'The Sun' : body.name;
}

function percent(ratio) {
  return `${formatNumber(Math.round(ratio * 100), 0)}%`;
}

function sizePhrase(ratio, adjective, what = 'Earth') {
  if (ratio >= 1.5) return `about ${formatTimes(ratio)} times as ${adjective} as ${what}`;
  if (ratio >= 1.03) return `a little ${adjective === 'wide' ? 'wider' : `more ${adjective}`} than ${what}`;
  if (ratio > 0.97) return `about as ${adjective} as ${what}`;
  if (ratio >= 0.85) return `almost as ${adjective} as ${what} (${percent(ratio)})`;
  return `about ${nearestFraction(ratio)} as ${adjective} as ${what}`;
}

export function ratios(body, earth) {
  const m = body.measurements;
  const e = earth.measurements;
  return {
    width: m.diameterKm / e.diameterKm,
    // Volumetric mean radius = radius of a sphere with the same volume, so flattened giants aren't overstated.
    volume: (m.volumetricMeanRadiusKm / e.volumetricMeanRadiusKm) ** 3,
    mass: m.massE24Kg / e.massE24Kg,
    gravity: m.gravityMs2 / e.gravityMs2,
    distance: m.meanDistanceFromSunE6Km === null ? null : m.meanDistanceFromSunE6Km / e.meanDistanceFromSunE6Km,
    year: m.orbitalPeriodDays === null ? null : m.orbitalPeriodDays / e.orbitalPeriodDays,
  };
}

/** Seconds for light to cross a distance given in millions of km. */
export function lightTravelSeconds(e6Km) {
  return (e6Km * 1e6) / SPEED_OF_LIGHT_KM_S;
}

export function formatMinutesSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds - minutes * 60);
  return `${minutes} minutes ${seconds} seconds`;
}

function weightComparison(body, ratio) {
  const feel = ratio >= 1.03
    ? `you would feel about ${formatTimes(ratio)} times as heavy as on Earth`
    : ratio > 0.97
      ? 'you would feel about as heavy as on Earth'
      : `you would weigh about ${percent(ratio)} of your Earth weight`;
  if (body.hasSolidSurface) {
    return { simple: `Standing on ${body.name}, ${feel}.`, detailed: `${feel[0].toUpperCase()}${feel.slice(1)}: surface gravity is ${formatFixed(body.measurements.gravityMs2, 1)} m/s² compared with Earth's 9.8 m/s².` };
  }
  const level = body.kind === 'star' ? 'at the photosphere (its visible layer of glowing gas)' : 'at the 1-bar level in its atmosphere';
  return {
    simple: `There is no ground to stand on. Floating ${level}, ${feel}.`,
    detailed: `${subject(body)} has no solid surface. Measured ${level}, gravity is ${formatFixed(body.measurements.gravityMs2, 1)} m/s² compared with Earth's 9.8 m/s², so ${feel}.`,
  };
}

function temperatureComparison(body, earth) {
  const t = body.measurements.temperatureC;
  const diff = t - earth.measurements.temperatureC;
  const word = Math.abs(diff) < 10 ? 'about the same as' : diff > 100 ? 'much hotter than' : diff > 0 ? 'hotter than' : diff < -100 ? 'much colder than' : 'colder than';
  const where = {
    'surface-mean': 'its average surface temperature',
    '1-bar-mean': 'its average temperature at the 1-bar level',
    'photosphere-effective': 'the temperature of its visible layer',
  }[body.measurements.temperatureReference];
  return {
    simple: `${formatTemperature(t)}: ${word} Earth's average of 15 °C.`,
    detailed: `${formatTemperature(t)} is ${where}, ${word} Earth's average surface temperature of 15 °C (a difference of ${formatNumber(Math.abs(diff), 0)} °C).`,
  };
}

/**
 * Comparisons between a body and Earth, each with a child-friendly and a detailed sentence.
 * Earth itself returns an empty list: it is the yardstick.
 */
export function earthComparisons(body, earth) {
  if (body.id === earth.id) return [];
  const r = ratios(body, earth);
  const m = body.measurements;
  const list = [];

  list.push({
    id: 'width',
    label: 'Width',
    ratio: r.width,
    simple: `${subject(body)} is ${sizePhrase(r.width, 'wide')}.`,
    detailed: `${formatNumber(m.diameterKm, 0)} km across, compared with Earth's ${formatNumber(earth.measurements.diameterKm, 0)} km (${formatNumber(r.width, 2)} × Earth).`,
  });

  const volumeText = r.volume >= 1
    ? `about ${formatTimes(r.volume)} times Earth's volume`
    : `about ${percent(r.volume)} of Earth's volume`;
  list.push({
    id: 'volume',
    label: 'Volume',
    ratio: r.volume,
    simple: `It has ${volumeText}.`,
    detailed: `${subject(body)} has ${volumeText}, calculated from its volumetric mean radius of ${formatNumber(m.volumetricMeanRadiusKm, 1)} km (the radius of a ball with the same volume).`,
  });

  const massText = r.mass >= 1 ? `about ${formatTimes(r.mass)} times as massive as Earth` : `about ${percent(r.mass)} of Earth's mass`;
  list.push({
    id: 'mass',
    label: 'Mass',
    ratio: r.mass,
    simple: `It is ${massText}.`,
    detailed: `${formatNumber(m.massE24Kg, 3)} × 10²⁴ kg: ${massText} (5.97 × 10²⁴ kg).`,
  });

  list.push({ id: 'weight', label: 'Weight', ratio: r.gravity, ...weightComparison(body, r.gravity) });

  if (m.dayLengthHours !== null) {
    const spin = `One spin takes ${formatDuration(m.rotationPeriodHours)}${m.rotationPeriodHours < 0 ? ', and it spins backwards compared with Earth' : ''}.`;
    list.push({
      id: 'day',
      label: 'Day',
      ratio: m.dayLengthHours / earth.measurements.dayLengthHours,
      simple: `A day, from sunrise to sunrise, lasts ${formatDuration(m.dayLengthHours)}. On Earth it is 24 hours.`,
      detailed: `Sunrise to sunrise takes ${formatDuration(m.dayLengthHours)}${Math.abs(m.dayLengthHours) >= 48 ? ` (${formatNumber(m.dayLengthHours, 1)} hours)` : ''}. ${spin}`,
    });
  } else {
    list.push({
      id: 'day',
      label: 'Spin',
      ratio: Math.abs(m.rotationPeriodHours) / earth.measurements.rotationPeriodHours,
      simple: `The Sun spins about once every ${formatDuration(m.rotationPeriodHours)}.`,
      detailed: `Near ${m.rotationLatitudeDeg}° latitude the Sun spins once every ${formatNumber(m.rotationPeriodHours, 2)} hours (${formatDuration(m.rotationPeriodHours)}). Different latitudes spin at different speeds.`,
    });
  }

  if (r.year !== null) {
    list.push({
      id: 'year',
      label: 'Year',
      ratio: r.year,
      simple: `One trip around the Sun takes ${formatDays(m.orbitalPeriodDays)}.`,
      detailed: `One orbit takes ${formatNumber(m.orbitalPeriodDays, 1)} Earth days (${formatNumber(r.year, 2)} Earth years).`,
    });
  }

  if (r.distance !== null) {
    const phrase = r.distance >= 1.5 ? `about ${formatTimes(r.distance)} times as far from the Sun as Earth` : `about ${nearestFraction(r.distance)} as far from the Sun as Earth`;
    list.push({
      id: 'distance',
      label: 'Distance',
      ratio: r.distance,
      simple: `It is ${phrase}.`,
      detailed: `On average ${formatNumber(m.meanDistanceFromSunE6Km, 1)} million km from the Sun: ${formatNumber(r.distance, 2)} AU, where 1 AU is Earth's average distance.`,
    });
  } else if (m.meanDistanceFromEarthE6Km) {
    const light = formatMinutesSeconds(lightTravelSeconds(m.meanDistanceFromEarthE6Km));
    list.push({
      id: 'distance',
      label: 'Distance',
      ratio: null,
      simple: `Sunlight takes about ${light} to reach Earth.`,
      detailed: `Earth is on average ${formatNumber(m.meanDistanceFromEarthE6Km, 1)} million km from the Sun, so sunlight takes about ${light} to arrive (calculated using the speed of light).`,
    });
  }

  list.push({ id: 'temperature', label: 'Temperature', ratio: null, ...temperatureComparison(body, earth) });
  return list;
}
