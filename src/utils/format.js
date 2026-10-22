// Pure formatting helpers shared by the information panels and tests.
// UK English: thousands separators, °C, and a true minus sign for negatives.

const MINUS = '−';

export function formatNumber(value, maximumFractionDigits = 1) {
  const text = new Intl.NumberFormat('en-GB', { maximumFractionDigits }).format(Math.abs(value));
  return value < 0 ? `${MINUS}${text}` : text;
}

/** Fixed decimals, for values the fact sheet gives with trailing zeros (e.g. gravity 9.0 m/s²). */
export function formatFixed(value, fractionDigits = 1) {
  const text = new Intl.NumberFormat('en-GB', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(Math.abs(value));
  return value < 0 ? `${MINUS}${text}` : text;
}

/** Round to a number of significant figures, e.g. 109.08 → 109, 1321.4 → 1,320. */
export function roundSignificant(value, figures = 2) {
  if (value === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (figures - 1 - magnitude);
  return Math.round(value * factor) / factor;
}

export function formatTemperature(celsius) {
  return `${formatNumber(celsius, 0)} °C`;
}

/** Human-friendly length of time from hours: hours, then Earth days, then Earth years. */
export function formatDuration(hours) {
  const value = Math.abs(hours);
  if (value < 48) return `${formatNumber(value, 1)} hours`;
  const days = value / 24;
  if (days < 730) return `${formatNumber(days, days < 100 ? 1 : 0)} Earth days`;
  const years = days / 365.25;
  return `${formatNumber(years, years < 20 ? 1 : 0)} Earth years`;
}

export function formatDays(days) {
  return formatDuration(days * 24);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-04" → "April 2026"; "2026-07-31" → "31 July 2026". */
export function formatAsOf(asOf) {
  const [year, month, day] = asOf.split('-').map(Number);
  const monthName = MONTHS[month - 1];
  if (!monthName) throw new Error(`Invalid date: ${asOf}`);
  return day ? `${day} ${monthName} ${year}` : `${monthName} ${year}`;
}

/** Mass stored in units of 10^24 kg, shown as "5.97 × 10²⁴ kg". */
export function formatMass(massE24Kg) {
  return `${formatNumber(massE24Kg, 3)} × 10²⁴ kg`;
}

export function formatDistanceE6Km(e6Km) {
  return `${formatNumber(e6Km, 1)} million km`;
}

const KIND_LABELS = {
  star: 'Star',
  'rocky-planet': 'Rocky planet',
  'gas-giant': 'Gas giant',
  'ice-giant': 'Ice giant',
};

export function kindLabel(kind) {
  return KIND_LABELS[kind] ?? kind;
}

export function ordinal(n) {
  const words = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
  return words[n] ?? `${n}th`;
}
