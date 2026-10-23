// Cosmos map: zoom and pan state. No DOM here; components/cosmosMap.js renders it and sends gestures as actions.
// The state is kept in memory for this visit, separate from the quiz, missions and experiments, so the map is
// where the child left it when they come back to Cosmos.
import { initialView, clampView, zoomAt, panBy, ensureVisible, ZOOM_STEP } from '../utils/cosmosView.js';

export function initialCosmosMapState() {
  return { view: initialView(), size: null };
}

const centre = size => ({ x: size.width / 2, y: size.height / 2 });
const same = (a, b) => a.zoom === b.zoom && a.x === b.x && a.y === b.y;

/** Pure transition function. Until the map has been measured (`resize`), only `reset` changes anything. */
export function reduceCosmosMap(state, action) {
  const { size } = state;
  const next = view => (same(view, state.view) ? state : { ...state, view });
  switch (action.type) {
    case 'resize': {
      const width = Number(action.size?.width);
      const height = Number(action.size?.height);
      if (!(width > 0) || !(height > 0)) return state; // hidden maps measure 0 × 0; keep the last real size
      const newSize = { width, height, ...(action.size.minWidth > 0 ? { minWidth: action.size.minWidth } : {}) };
      if (size && size.width === width && size.height === height && size.minWidth === newSize.minWidth) return state;
      return { view: clampView(state.view, newSize), size: newSize };
    }
    case 'reset':
      return next(initialView());
    default:
      break;
  }
  if (!size) return state;
  switch (action.type) {
    case 'zoomIn':
      return next(zoomAt(state.view, ZOOM_STEP, action.point ?? centre(size), size));
    case 'zoomOut':
      return next(zoomAt(state.view, 1 / ZOOM_STEP, action.point ?? centre(size), size));
    case 'zoomBy':
      return Number.isFinite(action.factor) && action.factor > 0 ? next(zoomAt(state.view, action.factor, action.point ?? centre(size), size)) : state;
    case 'pan':
      return next(panBy(state.view, Number(action.dx) || 0, Number(action.dy) || 0, size));
    case 'reveal':
      return next(ensureVisible(state.view, action.u, action.v, size, action.margin));
    default:
      return state;
  }
}

export function createCosmosMapStore(initial = initialCosmosMapState()) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = reduceCosmosMap(state, action);
      if (state !== previous) for (const listener of listeners) listener(state, previous, action);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
