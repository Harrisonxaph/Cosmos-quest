// Helpers shared by the galaxy collection tests.

/** Every source id a galaxy cites, in any field. */
export function galaxySourceIds(galaxy) {
  const ids = [
    ...galaxy.classification.sourceIds,
    ...(galaxy.classification.note?.sourceIds ?? []),
    ...galaxy.summary.sourceIds,
    ...galaxy.facts.map(fact => fact.sourceId),
    ...(galaxy.image.childCaptionSourceIds ?? []),
    ...(galaxy.size?.sourceIds ?? []),
    ...(galaxy.sky?.sourceIds ?? []),
  ];
  if (galaxy.distance) {
    ids.push(...galaxy.distance.sourceIds, ...(galaxy.distance.context?.sourceIds ?? []));
    for (const estimate of galaxy.distance.otherEstimates) ids.push(...estimate.sourceIds);
  }
  if (galaxy.image.colourNoteSourceId) ids.push(galaxy.image.colourNoteSourceId);
  return [...new Set(ids)];
}

/** "about 2.5 million light-years" → 2500000; "about 163,000 light-years" → 163000. */
export function displayedLightYears(display) {
  const match = /^about ([0-9.,]+)( million)? light-years$/.exec(display);
  if (!match) return null;
  return Number(match[1].replace(/,/g, '')) * (match[2] ? 1e6 : 1);
}

export const LIGHT_YEARS_PER_MPC = 3.2616e6;

/** Width and height of a WebP file, read from its RIFF header (lossy VP8, lossless VP8L or extended VP8X). */
export function webpSize(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') throw new Error('not a WebP file');
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  throw new Error(`unknown WebP chunk ${chunk}`);
}
