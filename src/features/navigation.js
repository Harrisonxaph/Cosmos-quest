// Explorer navigation state: which view is showing, which body is selected, pause and info mode.
// No DOM or Three.js here, so every rule can be tested in Node.

export const BODY_ORDER = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const MODES = ['simple', 'detailed'];

export function initialState(overrides = {}) {
  return { view: 'overview', selectedId: null, galaxyId: null, paused: false, mode: 'simple', ...overrides };
}

const GALAXY_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A galaxy id is accepted if it is a well-formed id and, once the collection has loaded, one of its galaxies. */
export function validGalaxyId(id, galaxyIds = null) {
  if (typeof id !== 'string' || !GALAXY_ID.test(id)) return false;
  return !galaxyIds || galaxyIds.length === 0 || galaxyIds.includes(id);
}

/**
 * Pure transition function: (state, action) → new state. Unknown or invalid actions return the same state.
 * galaxyIds (optional) limits which galaxies can be chosen once the Cosmos collection has loaded.
 */
export function reduce(state, action, order = BODY_ORDER, galaxyIds = null) {
  switch (action.type) {
    case 'select':
      if (!order.includes(action.id)) return state;
      return { ...state, view: 'body', selectedId: action.id, galaxyId: null };
    case 'overview':
      return { ...state, view: 'overview', selectedId: null, galaxyId: null };
    case 'openQuiz':
      return { ...state, view: 'quiz', selectedId: null, galaxyId: null };
    case 'openMissions':
      return { ...state, view: 'missions', selectedId: null, galaxyId: null };
    case 'openExperiments':
      return { ...state, view: 'experiments', selectedId: null, galaxyId: null };
    case 'openCosmos': {
      // The Cosmos view: the galaxy list, or one galaxy. An unknown galaxy opens the list instead.
      const galaxyId = validGalaxyId(action.galaxyId, galaxyIds) ? action.galaxyId : null;
      return { ...state, view: 'cosmos', selectedId: null, galaxyId };
    }
    case 'next':
    case 'previous': {
      const step = action.type === 'next' ? 1 : -1;
      const index = state.selectedId === null ? (step === 1 ? -1 : 0) : order.indexOf(state.selectedId);
      const nextIndex = (index + step + order.length) % order.length;
      return { ...state, view: 'body', selectedId: order[nextIndex], galaxyId: null };
    }
    case 'togglePause':
      return { ...state, paused: !state.paused };
    case 'setPaused':
      return { ...state, paused: Boolean(action.paused) };
    case 'setMode':
      return MODES.includes(action.mode) ? { ...state, mode: action.mode } : state;
    case 'toggleMode':
      return { ...state, mode: state.mode === 'simple' ? 'detailed' : 'simple' };
    default:
      return state;
  }
}

/** Small store around `reduce` so the UI and the 3D scene can react to the same state. */
export function createNavigator(initial = initialState(), order = BODY_ORDER, galaxyIds = null) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = reduce(state, action, order, galaxyIds);
      if (state !== previous) for (const listener of listeners) listener(state, previous);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** "#/jupiter" → { view: 'body', selectedId: 'jupiter' }; "#/quiz" → quiz; "#/cosmos/andromeda" → a galaxy; anything else → overview. */
export function parseHash(hash, order = BODY_ORDER, galaxyIds = null) {
  const id = String(hash ?? '').replace(/^#\/?/, '').trim().toLowerCase();
  if (id === 'cosmos' || id.startsWith('cosmos/')) {
    const galaxyId = id.slice('cosmos/'.length);
    return { view: 'cosmos', selectedId: null, galaxyId: validGalaxyId(galaxyId, galaxyIds) ? galaxyId : null };
  }
  if (id === 'quiz') return { view: 'quiz', selectedId: null };
  if (id === 'missions') return { view: 'missions', selectedId: null };
  if (id === 'experiments') return { view: 'experiments', selectedId: null };
  return order.includes(id) ? { view: 'body', selectedId: id } : { view: 'overview', selectedId: null };
}

export function formatHash(state) {
  if (state.view === 'cosmos') return state.galaxyId ? `#/cosmos/${state.galaxyId}` : '#/cosmos';
  if (state.view === 'quiz') return '#/quiz';
  if (state.view === 'missions') return '#/missions';
  if (state.view === 'experiments') return '#/experiments';
  return state.view === 'body' && state.selectedId ? `#/${state.selectedId}` : '#/';
}

/**
 * During the quiz, missions, experiments and Cosmos, explorer shortcuts are switched off so a number or arrow key can't
 * jump away mid-task. Escape still returns to exploring (progress is kept).
 */
export function actionAllowedInView(action, view) {
  if (!['quiz', 'missions', 'experiments', 'cosmos'].includes(view)) return true;
  return action.type === 'overview';
}

/**
 * Keyboard shortcuts. Returns an action (or a camera command) for a key, or null.
 * Camera commands are { type: 'camera', command } and are handled by the scene, not the reducer.
 */
export function keyToAction(key, order = BODY_ORDER) {
  if (/^[0-8]$/.test(key)) return { type: 'select', id: order[Number(key)] };
  switch (key) {
    case 'ArrowRight':
    case 'n':
    case 'N':
      return { type: 'next' };
    case 'ArrowLeft':
    case 'b':
    case 'B':
      return { type: 'previous' };
    case 'Escape':
    case 'o':
    case 'O':
      return { type: 'overview' };
    case ' ':
    case 'p':
    case 'P':
      return { type: 'togglePause' };
    case 'm':
    case 'M':
      return { type: 'toggleMode' };
    case '+':
    case '=':
      return { type: 'camera', command: 'zoomIn' };
    case '-':
    case '_':
      return { type: 'camera', command: 'zoomOut' };
    case 'a':
    case 'A':
      return { type: 'camera', command: 'rotateLeft' };
    case 'd':
    case 'D':
      return { type: 'camera', command: 'rotateRight' };
    default:
      return null;
  }
}

/** Keyboard help shown in the interface; kept beside keyToAction so they stay in step. */
export const SHORTCUTS = [
  ['0', 'The Sun'],
  ['1 to 8', 'Mercury to Neptune'],
  ['← →  or  B N', 'Previous / next world'],
  ['Esc  or  O', 'Back to the solar system'],
  ['Space  or  P', 'Pause / play'],
  ['+  −', 'Zoom in / out'],
  ['A  D', 'Rotate the view'],
  ['M', 'Simple / detailed facts'],
];

/** Whether a keyboard event should be left to the focused element instead of the explorer. */
export function shouldIgnoreKey({ key, ctrlKey, metaKey, altKey, targetTag, targetIsEditable }) {
  if (ctrlKey || metaKey || altKey) return true;
  if (targetIsEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag)) return true;
  // Let focused buttons and links handle their own activation keys.
  if ((key === ' ' || key === 'Enter') && ['BUTTON', 'A', 'SUMMARY'].includes(targetTag)) return true;
  return false;
}
