// Floating labels for the 3D view: where each name goes so names never overlap, and which world a tap means.
// Pure functions over plain numbers and rectangles (no DOM, no Three.js), so the rules can be tested in Node.

export const MIN_TARGET = 44; // smallest tap area, in CSS pixels
const GAP = 4; // space kept between neighbouring names

const overlaps = (a, b) => a.left < b.right + GAP && b.left < a.right + GAP && a.top < b.bottom + GAP && b.top < a.bottom + GAP;
const within = (r, bounds) => r.left >= 0 && r.top >= 0 && r.right <= bounds.width && r.bottom <= bounds.height;
const inside = (p, r) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
const rect = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

/**
 * Places labels in priority order. Each tries above, below, right and left of its world, and takes the first
 * place where its visible name stays inside the view without touching a name already placed. A label with no
 * free place is left out for this frame (its world can still be tapped or chosen with the buttons).
 *
 * items: [{ id, x, y, radius, width, height }]: the world's centre and on-screen radius, and the size of its name.
 * Returns a Map of id → { side, target, text } (target is the tap area, at least 44 × 44 px), or null if left out.
 */
export function placeLabels(items, bounds) {
  const placed = new Map();
  const taken = [];
  for (const item of items) {
    const w = Math.max(MIN_TARGET, item.width);
    const h = Math.max(MIN_TARGET, item.height);
    const r = item.radius;
    const candidates = [
      ['above', item.x - w / 2, item.y - r - h],
      ['below', item.x - w / 2, item.y + r],
      ['right', item.x + r, item.y - h / 2],
      ['left', item.x - r - w, item.y - h / 2],
    ];
    let result = null;
    for (const [side, left, top] of candidates) {
      const target = rect(left, top, w, h);
      const text = rect(left + (w - item.width) / 2, top + (h - item.height) / 2, item.width, item.height);
      if (!within(text, bounds) || taken.some(other => overlaps(text, other))) continue;
      result = { side, target, text };
      break;
    }
    if (result) taken.push(result.text);
    placed.set(item.id, result);
  }
  return placed;
}

function nearest(point, placements, key) {
  let best = null;
  for (const [id, placement] of placements) {
    if (!placement || !inside(point, placement[key])) continue;
    const box = placement[key];
    const distance = Math.hypot(point.x - (box.left + box.right) / 2, point.y - (box.top + box.bottom) / 2);
    if (!best || distance < best.distance) best = { id, distance };
  }
  return best?.id ?? null;
}

/**
 * Which world a tap selects: a visible name first, then the world drawn in 3D (worldId, or null), then the
 * nearest enlarged tap area. Names never overlap, so a name can't catch a tap meant for another name.
 */
export function pickAt(point, placements, worldId = null) {
  return nearest(point, placements, 'text') ?? worldId ?? nearest(point, placements, 'target');
}

/** A tap is a short press that barely moves and uses one finger; anything else is a drag or a pinch. */
export function isTap({ moved, durationMs, pointers }) {
  return pointers === 1 && moved < 8 && durationMs < 600;
}
