// Zoom and pan for the Cosmos map. Pure functions over plain numbers (no DOM), so limits can be tested in Node.
// A view is { zoom, x, y }: the zoom factor and the pan offset in CSS pixels. A map point is given as fractions
// (u, v) of the full map, from 0 to 1. Zooming spreads the points apart; markers keep their size.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.5;
/** Narrow screens show part of the map at the smallest zoom and pan sideways, so names have room.
 * A size may give its own minWidth (the map scales it with the text size, so large text gets more room). */
export const MIN_MAP_WIDTH = 720;

export const initialView = () => ({ zoom: MIN_ZOOM, x: 0, y: 0 });

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Full size of the map in CSS pixels at a zoom, for a viewport of size { width, height, minWidth? }. */
export function mapSize(size, zoom) {
  return { width: Math.max(size.width, size.minWidth ?? MIN_MAP_WIDTH) * zoom, height: size.height * zoom };
}

/** Keeps the zoom within its limits and the map covering the viewport (no empty space beyond its edges). */
export function clampView(view, size) {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  const map = mapSize(size, zoom);
  return {
    zoom,
    x: clamp(view.x, Math.min(0, size.width - map.width), 0),
    y: clamp(view.y, Math.min(0, size.height - map.height), 0),
  };
}

/** Screen position (CSS pixels inside the viewport) of a map point. */
export function toScreen(u, v, view, size) {
  const map = mapSize(size, view.zoom);
  return { x: view.x + u * map.width, y: view.y + v * map.height };
}

/** Zooms by a factor while keeping the given screen point still (a pinch centre, or the middle for buttons). */
export function zoomAt(view, factor, point, size) {
  const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const ratio = zoom / view.zoom;
  return clampView({ zoom, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio }, size);
}

export function panBy(view, dx, dy, size) {
  return clampView({ ...view, x: view.x + dx, y: view.y + dy }, size);
}

/** Pans just enough to bring a map point at least `margin` pixels inside the viewport (used when focus moves). */
export function ensureVisible(view, u, v, size, margin = 60) {
  const point = toScreen(u, v, view, size);
  const mx = Math.min(margin, size.width / 2);
  const my = Math.min(margin, size.height / 2);
  let { x, y } = view;
  if (point.x < mx) x += mx - point.x;
  if (point.x > size.width - mx) x -= point.x - (size.width - mx);
  if (point.y < my) y += my - point.y;
  if (point.y > size.height - my) y -= point.y - (size.height - my);
  return clampView({ ...view, x, y }, size);
}

export const canZoomIn = view => view.zoom < MAX_ZOOM - 1e-9;
export const canZoomOut = view => view.zoom > MIN_ZOOM + 1e-9;
export const isInitial = view => view.zoom === MIN_ZOOM && view.x === 0 && view.y === 0;
