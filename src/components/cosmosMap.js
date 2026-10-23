// Cosmos map: an illustrative chart of distance bands, drawn with HTML so every galaxy is a real button.
// Loaded only when Cosmos is opened. Everything it shows is also in the galaxy list in the panel, so if this
// module fails to load, nothing is lost. Zoom and pan live in features/cosmos.js; this file only draws them
// and turns gestures into actions. Markers keep their size: zooming spreads them apart, it never enlarges them.
import { el, clear } from './dom.js';
import { COSMOS_BANDS, bandEdges, separateMarkers } from '../utils/cosmosLayout.js';
import { toScreen, mapSize, canZoomIn, canZoomOut, isInitial, MIN_MAP_WIDTH } from '../utils/cosmosView.js';

const DRAG_THRESHOLD = 6; // pixels a finger or mouse must move before a press becomes a drag instead of a tap
const KEY_PAN = 80;
const WHEEL_ZOOM = 0.01;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function createCosmosMap({ container, galaxies, placements, store, onSelect }) {
  const placeById = Object.fromEntries(placements.map(place => [place.id, place]));
  const bandById = Object.fromEntries(COSMOS_BANDS.map(band => [band.id, band]));

  const control = (name, label, text) => el('button', { type: 'button', className: 'control cosmos-map__control', 'data-cosmos-control': name, 'aria-label': label }, text);
  const zoomInButton = control('zoomIn', 'Zoom in on the map', '+');
  const zoomOutButton = control('zoomOut', 'Zoom out on the map', '−');
  const resetButton = el('button', { type: 'button', className: 'control cosmos-map__control', 'data-cosmos-control': 'reset' }, 'Reset map');
  const zoomLabel = el('span', { className: 'cosmos-map__zoom' });

  const bandNodes = bandEdges().map(edge => el('div', { className: `cosmos-band cosmos-band--${edge.id}`, 'data-band': edge.id },
    el('span', { className: 'cosmos-band__label' }, bandById[edge.id].label),
    el('span', { className: 'cosmos-band__detail' }, bandById[edge.id].detail)));

  const markers = new Map();
  for (const galaxy of galaxies) {
    const place = placeById[galaxy.id];
    const band = bandById[place.band];
    const home = galaxy.viewpoint === 'inside';
    const where = home ? 'Home: we live inside it' : `${band.label}, ${galaxy.distance.display}`;
    const button = el('button', {
      type: 'button',
      className: `cosmos-marker${home ? ' cosmos-marker--home' : ''}`,
      'data-galaxy-marker': galaxy.id,
      'aria-pressed': 'false',
      'aria-label': `${galaxy.name}. ${where}`,
      onClick: () => onSelect(galaxy.id),
      // Keyboard focus pans a galaxy into view. A tap or click doesn't, so the marker never moves under the finger.
      onFocus: event => {
        if (event.currentTarget.matches(':focus-visible')) store.dispatch({ type: 'reveal', u: place.x, v: place.y });
      },
    },
    el('span', { className: 'cosmos-marker__dot', 'aria-hidden': 'true' }),
    el('span', { className: 'cosmos-marker__name' }, galaxy.name),
    home ? el('span', { className: 'cosmos-marker__home' }, 'You are here') : null);
    markers.set(galaxy.id, { button, place });
  }

  const plane = el('div', { className: 'cosmos-map__plane' },
    el('div', { className: 'cosmos-map__bands', 'aria-hidden': 'true' }, bandNodes),
    el('ul', { className: 'cosmos-map__markers', 'aria-label': 'Galaxies, nearest first' },
      [...markers.values()].map(({ button }) => el('li', {}, button))));
  const viewport = el('div', {
    className: 'cosmos-map__viewport',
    role: 'group',
    'aria-label': 'Galaxy map. Nearer on the left, farther on the right. Not to scale.',
    'aria-describedby': 'cosmos-map-hint',
  }, plane, el('p', { className: 'cosmos-map__axis', 'aria-hidden': 'true' }, el('span', {}, '← Nearer'), el('span', {}, 'Farther →')));

  const toolbar = el('div', { className: 'cosmos-map__toolbar', role: 'toolbar', 'aria-label': 'Map controls' },
    zoomInButton, zoomOutButton, resetButton, zoomLabel);
  const hint = el('p', { className: 'cosmos-map__hint', id: 'cosmos-map-hint' },
    'Drag to move the map and pinch or use + and − to zoom. Tab to a galaxy and press Enter to choose it. Arrow keys move the map.');

  clear(container).append(toolbar, viewport, hint);

  zoomInButton.addEventListener('click', () => store.dispatch({ type: 'zoomIn' }));
  zoomOutButton.addEventListener('click', () => store.dispatch({ type: 'zoomOut' }));
  resetButton.addEventListener('click', () => store.dispatch({ type: 'reset' }));

  // ----- Drawing -----
  function measure() {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return { width: viewport.clientWidth, height: viewport.clientHeight, minWidth: Math.max(MIN_MAP_WIDTH, rootFont * 45) };
  }

  function draw() {
    const { view, size } = store.getState();
    if (!size || !viewport.clientWidth) return; // hidden: markers can't be measured, so leave them where they are
    const map = mapSize(size, view.zoom);
    plane.style.width = `${size.width}px`;
    plane.style.height = `${size.height}px`;
    for (const node of bandNodes) {
      const edge = bandEdges().find(e => e.id === node.dataset.band);
      const left = view.x + edge.left * map.width;
      node.style.transform = `translate(${Math.round(left)}px, ${Math.round(view.y)}px)`;
      node.style.width = `${Math.round((edge.right - edge.left) * map.width)}px`;
      node.style.height = `${Math.round(map.height)}px`;
    }
    // Markers sit below the band names and above the Nearer / Farther line, and are nudged up or down so
    // none overlap. Left to right is never changed, so the order of distances is kept.
    const header = Math.max(...bandNodes.map(node => node.firstChild.offsetHeight + node.lastChild.offsetHeight)) + 16;
    const top = view.y + header;
    const bottom = view.y + map.height - 32;
    const boxes = [...markers.entries()].map(([id, { button, place }]) => {
      const width = button.offsetWidth;
      const height = button.offsetHeight;
      const x = toScreen(place.x, place.y, view, size).x;
      const y = top + place.y * Math.max(0, bottom - top);
      // Keep every marker inside the map's own edges, so none is cut off when the map is fully zoomed out.
      const left = clamp(x - width / 2, view.x + 4, view.x + map.width - width - 4);
      return { id, left, top: y - height / 2, width, height };
    });
    for (const box of separateMarkers(boxes, { top, bottom })) {
      markers.get(box.id).button.style.transform = `translate(${Math.round(box.left)}px, ${Math.round(box.top)}px)`;
    }
    zoomInButton.disabled = !canZoomIn(view);
    zoomOutButton.disabled = !canZoomOut(view);
    resetButton.disabled = isInitial(view);
    zoomLabel.textContent = `Zoom ×${Math.round(view.zoom * 10) / 10}`;
    container.dataset.zoom = String(view.zoom);
  }

  const unsubscribe = store.subscribe(draw);
  const resizeObserver = new ResizeObserver(() => {
    store.dispatch({ type: 'resize', size: measure() });
    draw();
  });
  resizeObserver.observe(viewport);
  resizeObserver.observe(document.documentElement); // text size changes alter the marker sizes

  // ----- Gestures (only on the map: the rest of the page scrolls and zooms as normal) -----
  const pointers = new Map();
  let gesture = null;
  let suppressClick = false;
  const local = event => {
    const box = viewport.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const pinchOf = () => {
    const [a, b] = [...pointers.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, local(event));
    if (pointers.size === 1) {
      gesture = { type: 'press', start: local(event), last: local(event) };
      suppressClick = false;
    } else if (pointers.size === 2) {
      for (const id of pointers.keys()) viewport.setPointerCapture?.(id);
      gesture = { type: 'pinch', ...pinchOf() };
      suppressClick = true;
    }
  }
  function onPointerMove(event) {
    if (!pointers.has(event.pointerId) || !gesture) return;
    const point = local(event);
    pointers.set(event.pointerId, point);
    if (gesture.type === 'press' && Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > DRAG_THRESHOLD) {
      viewport.setPointerCapture?.(event.pointerId);
      gesture = { type: 'pan', last: gesture.last };
      suppressClick = true;
      container.dataset.dragging = 'true';
    }
    if (gesture.type === 'pan') {
      store.dispatch({ type: 'pan', dx: point.x - gesture.last.x, dy: point.y - gesture.last.y });
      gesture.last = point;
    } else if (gesture.type === 'pinch' && pointers.size === 2) {
      const pinch = pinchOf();
      if (gesture.distance > 0) store.dispatch({ type: 'zoomBy', factor: pinch.distance / gesture.distance, point: pinch.centre });
      store.dispatch({ type: 'pan', dx: pinch.centre.x - gesture.centre.x, dy: pinch.centre.y - gesture.centre.y });
      Object.assign(gesture, pinch);
    }
  }
  function onPointerEnd(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size === 1) {
      // One finger lifted from a pinch: carry on dragging with the other, without a jump.
      gesture = { type: 'pan', last: [...pointers.values()][0] };
    } else if (pointers.size === 0) {
      gesture = null;
      delete container.dataset.dragging;
    }
  }
  function onClickCapture(event) {
    // A drag or pinch that ends over a galaxy must not choose it.
    if (!suppressClick) return;
    suppressClick = false;
    event.stopPropagation();
    event.preventDefault();
  }
  function onWheel(event) {
    // Plain scrolling is left to the page. A trackpad pinch (or Ctrl + scroll) zooms the map instead of the page.
    if (!event.ctrlKey) return;
    event.preventDefault();
    store.dispatch({ type: 'zoomBy', factor: Math.exp(-event.deltaY * WHEEL_ZOOM), point: local(event) });
  }
  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const pans = { ArrowLeft: [KEY_PAN, 0], ArrowRight: [-KEY_PAN, 0], ArrowUp: [0, KEY_PAN], ArrowDown: [0, -KEY_PAN] };
    let action = null;
    if (pans[event.key]) action = { type: 'pan', dx: pans[event.key][0], dy: pans[event.key][1] };
    else if (event.key === '+' || event.key === '=') action = { type: 'zoomIn' };
    else if (event.key === '-' || event.key === '_') action = { type: 'zoomOut' };
    if (!action) return;
    event.preventDefault();
    store.dispatch(action);
  }

  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerEnd);
  viewport.addEventListener('pointercancel', onPointerEnd);
  viewport.addEventListener('click', onClickCapture, true);
  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('keydown', onKeyDown);
  // Stop Safari's own page pinch starting on the map (touch-action covers other browsers).
  const onGesture = event => event.preventDefault();
  viewport.addEventListener('gesturestart', onGesture);

  container.dataset.mapState = 'ready';
  store.dispatch({ type: 'resize', size: measure() });
  draw();

  return {
    setSelected(id) {
      for (const [markerId, { button }] of markers) button.setAttribute('aria-pressed', String(markerId === id));
    },
    /** Pans just enough to show a galaxy (instantly: the map never animates). */
    reveal(id) {
      const marker = markers.get(id);
      if (marker) store.dispatch({ type: 'reveal', u: marker.place.x, v: marker.place.y });
    },
    focusMarker(id) {
      markers.get(id)?.button.focus({ preventScroll: true });
    },
    redraw() {
      store.dispatch({ type: 'resize', size: measure() });
      draw();
    },
    dispose() {
      unsubscribe();
      resizeObserver.disconnect();
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('gesturestart', onGesture);
    },
  };
}
