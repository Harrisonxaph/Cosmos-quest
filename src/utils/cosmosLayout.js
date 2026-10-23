// Where each galaxy goes on the Cosmos map: an illustrative chart of distance bands, not a map of the sky.
// Pure functions (no DOM), so the rules can be tested in Node. See docs/COSMOS_FEASIBILITY.md, option 2.
//
// Left to right means farther away. The bands are equal widths even though each covers a much bigger range of
// distances than the last, so the chart is not to scale. Inside a band, galaxies are placed in order of their
// NASA distance (spaced by the logarithm of the distance), so the real order is always kept. Up and down means
// nothing: each galaxy in a band gets its own row only so the names don't overlap.

/** The bands, nearest first. maxLy is the top of each band; the Milky Way has its own "home" band. */
export const COSMOS_BANDS = [
  { id: 'home', label: 'Home', detail: 'Our own galaxy', maxLy: null },
  { id: 'neighbours', label: 'Closest neighbours', detail: 'Less than 1 million light-years', maxLy: 1e6 },
  { id: 'local-group', label: '1–5 million light-years', detail: '1 to 5 million light-years', maxLy: 5e6 },
  { id: 'nearby-groups', label: '5–40 million light-years', detail: '5 to 40 million light-years', maxLy: 40e6 },
  { id: 'farther', label: 'Much farther', detail: '40 to 100 million light-years', maxLy: 100e6 },
];

/** Share of the map's width for each band (left to right). Equal widths for the four distance bands. */
export const BAND_WIDTHS = { home: 0.12, neighbours: 0.22, 'local-group': 0.22, 'nearby-groups': 0.22, farther: 0.22 };

/** Shown with the map. Tests check that the map and the panel keep to these. */
export const COSMOS_SCALE_NOTES = [
  'Left to right shows how far away each galaxy is: the farther right, the farther away.',
  'Each band covers a much bigger range of distances than the one before, so the map is not to scale.',
  'Up and down mean nothing. They only keep the names apart.',
  'This is not a map of the sky. Galaxies that look close together in our sky can be very far apart in space.',
  'Every marker is the same size. Markers do not show how big a galaxy is.',
  'Zooming spreads the map out so crowded names are easier to tap. It does not take you closer to a galaxy.',
];

/** Which band a distance (in light-years) belongs to; null for the Milky Way (no distance from us). */
export function bandFor(distanceLy) {
  if (distanceLy === null || distanceLy === undefined) return 'home';
  const band = COSMOS_BANDS.find(b => b.maxLy !== null && distanceLy <= b.maxLy);
  if (!band) throw new Error(`No Cosmos band for ${distanceLy} light-years`);
  return band.id;
}

/** Left and right edges of each band, as fractions of the map's width. */
export function bandEdges() {
  let left = 0;
  return COSMOS_BANDS.map(band => {
    const width = BAND_WIDTHS[band.id];
    const edge = { id: band.id, left, right: left + width };
    left += width;
    return edge;
  });
}

const MARGIN = 0.12; // keep markers away from band edges (fraction of the band's width)

/**
 * Positions for every galaxy, as fractions of the map (x from 0 at the left to 1 at the right, y from 0 at the top).
 * galaxies: [{ id, distance: { valueLy } | null }]. Returns [{ id, band, x, y, rank }], in the order given.
 */
export function placeGalaxies(galaxies) {
  const edges = Object.fromEntries(bandEdges().map(edge => [edge.id, edge]));
  const byBand = new Map();
  for (const galaxy of galaxies) {
    const band = bandFor(galaxy.distance?.valueLy ?? null);
    if (!byBand.has(band)) byBand.set(band, []);
    byBand.get(band).push(galaxy);
  }
  const placed = new Map();
  COSMOS_BANDS.forEach((band, index) => {
    const members = (byBand.get(band.id) ?? []).slice().sort((a, b) => (a.distance?.valueLy ?? 0) - (b.distance?.valueLy ?? 0));
    const { left, right } = edges[band.id];
    const width = right - left;
    const low = Math.log(index <= 1 ? 1e5 : COSMOS_BANDS[index - 1].maxLy); // the closest band starts at 100,000 ly
    const high = Math.log(band.maxLy ?? 1);
    members.forEach((galaxy, rank) => {
      const fraction = band.id === 'home' ? 0.5 : (Math.log(galaxy.distance.valueLy) - low) / (high - low);
      placed.set(galaxy.id, {
        id: galaxy.id,
        band: band.id,
        x: left + width * (MARGIN + (1 - 2 * MARGIN) * fraction),
        y: (rank + 1) / (members.length + 1),
        rank,
      });
    });
  });
  return galaxies.map(galaxy => placed.get(galaxy.id));
}

/**
 * Moves marker boxes up or down so none overlap, keeping each one's left-right position (so the order of
 * distances is kept). boxes: [{ id, left, top, width, height }] in screen pixels, in priority order (nearest
 * first). bounds: { top, bottom } the boxes must stay within. Returns new boxes in the same order.
 * Each box takes the free spot closest to where it wants to be; if there is none, the spot that overlaps
 * least (zooming in then gives it room).
 */
export function separateMarkers(boxes, bounds, gap = 4) {
  const placed = [];
  const overlapArea = (a, b) => {
    const w = Math.min(a.left + a.width + gap, b.left + b.width + gap) - Math.max(a.left, b.left);
    const h = Math.min(a.top + a.height + gap, b.top + b.height + gap) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };
  return boxes.map(box => {
    const low = bounds.top;
    const high = Math.max(low, bounds.bottom - box.height);
    const wanted = Math.min(Math.max(box.top, low), high);
    let best = null;
    for (let top = low; top <= high + 0.5; top += 2) {
      const candidate = { ...box, top: Math.min(top, high) };
      const cost = placed.reduce((sum, other) => sum + overlapArea(candidate, other), 0);
      const distance = Math.abs(candidate.top - wanted);
      if (!best || cost < best.cost || (cost === best.cost && distance < best.distance)) best = { candidate, cost, distance };
    }
    placed.push(best.candidate);
    return best.candidate;
  });
}
