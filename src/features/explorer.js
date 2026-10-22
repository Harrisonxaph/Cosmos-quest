// Planet Explorer: connects navigation state, the information panel, controls and the 3D scene.
// The panel, selector and list work on their own; the 3D scene is an enhancement loaded on demand.
import { clear } from '../components/dom.js';
import { renderBodyPanel, renderOverviewPanel } from '../components/infoPanel.js';
import { createBodySelector } from '../components/bodySelector.js';
import { createPlanetList } from '../components/planetList.js';
import { createNavigator, initialState, parseHash, formatHash, keyToAction, shouldIgnoreKey, MODES } from './navigation.js';

const PREFS_KEY = 'cosmos-quest-prefs';

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be blocked (private browsing); preferences then last for this visit only.
  }
}

export function detectQuality() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const small = Math.min(window.screen?.width ?? 1024, window.screen?.height ?? 768) < 700;
  const saveData = navigator.connection?.saveData === true;
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2;
  const mobile = coarse || small;
  return {
    mobile,
    antialias: !mobile,
    maxPixelRatio: mobile ? 1.5 : 2,
    sphereSegments: mobile ? 32 : 48,
    textureWidth: mobile ? 512 : 1024,
    starCount: mobile ? 700 : 1500,
    texturesByDefault: !(saveData || lowMemory),
  };
}

export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function startExplorer({ elements, bodies, planets, earth, sourcesById }) {
  const bodiesById = Object.fromEntries(bodies.map(body => [body.id, body]));
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => reducedMotionQuery?.matches ?? false;
  const quality = detectQuality();
  const prefs = { mode: 'simple', textures: quality.texturesByDefault, labels: true, ...readPrefs() };
  const hash = parseHash(location.hash);

  const nav = createNavigator(initialState({
    ...hash,
    mode: MODES.includes(prefs.mode) ? prefs.mode : 'simple',
    paused: reducedMotion(),
  }));
  const dispatch = action => nav.dispatch(action);
  let scene = null;

  // ----- Panel, selector and Stage 1 list -----
  const selector = createBodySelector(bodies, id => dispatch({ type: 'select', id }));
  elements.selector.append(selector.element);
  elements.planetList.append(...createPlanetList(planets, id => {
    dispatch({ type: 'select', id });
    elements.stage.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }));

  function renderPanel(state) {
    const panel = state.view === 'body'
      ? renderBodyPanel(bodiesById[state.selectedId], {
        earth,
        mode: state.mode,
        sourcesById,
        onModeChange: mode => dispatch({ type: 'setMode', mode }),
      })
      : renderOverviewPanel({ bodies, earth, onSelect: id => dispatch({ type: 'select', id }) });
    clear(elements.panel).append(panel);
  }

  // ----- Controls bar -----
  const control = name => elements.controls.querySelector(`[data-control="${name}"]`);
  const pauseButton = control('pause');
  const texturesButton = control('textures');
  const labelsButton = control('labels');
  control('overview').addEventListener('click', () => dispatch({ type: 'overview' }));
  control('previous').addEventListener('click', () => dispatch({ type: 'previous' }));
  control('next').addEventListener('click', () => dispatch({ type: 'next' }));
  pauseButton.addEventListener('click', () => dispatch({ type: 'togglePause' }));
  for (const command of ['zoomIn', 'zoomOut', 'rotateLeft', 'rotateRight']) {
    control(command).addEventListener('click', () => scene?.cameraCommand(command));
  }
  texturesButton.addEventListener('click', () => {
    prefs.textures = !prefs.textures;
    writePrefs(prefs);
    updateToggles();
    scene?.setTexturesEnabled(prefs.textures);
  });
  labelsButton.addEventListener('click', () => {
    prefs.labels = !prefs.labels;
    writePrefs(prefs);
    updateToggles();
    scene?.setLabelsVisible(prefs.labels);
  });

  function updateToggles() {
    texturesButton.setAttribute('aria-pressed', String(prefs.textures));
    labelsButton.setAttribute('aria-pressed', String(prefs.labels));
  }

  function updateControls(state) {
    pauseButton.setAttribute('aria-pressed', String(state.paused));
    pauseButton.querySelector('.control__label').textContent = state.paused ? 'Play' : 'Pause';
    pauseButton.setAttribute('aria-label', state.paused ? 'Play planet motion' : 'Pause planet motion');
    control('overview').disabled = state.view === 'overview';
    selector.setActive(state.selectedId);
  }

  // ----- React to navigation -----
  function apply(state, previous) {
    const selectionChanged = !previous || state.view !== previous.view || state.selectedId !== previous.selectedId;
    if (selectionChanged || state.mode !== previous.mode) renderPanel(state);
    updateControls(state);
    if (selectionChanged) {
      const target = formatHash(state);
      if (location.hash !== target && !(target === '#/' && location.hash === '')) history.pushState(null, '', target);
      elements.status.textContent = state.view === 'body' ? `Now exploring ${bodiesById[state.selectedId].name}` : 'Showing the whole solar system';
      scene?.focus(state.selectedId);
      if (previous) elements.panel.scrollTop = 0;
    }
    if (!previous || state.paused !== previous.paused) scene?.setPaused(state.paused);
    if (previous && state.mode !== previous.mode) {
      prefs.mode = state.mode;
      writePrefs(prefs);
    }
  }
  nav.subscribe(apply);
  apply(nav.getState(), null);
  updateToggles();

  window.addEventListener('popstate', () => {
    const target = parseHash(location.hash);
    dispatch(target.view === 'body' ? { type: 'select', id: target.selectedId } : { type: 'overview' });
  });

  document.addEventListener('keydown', event => {
    const target = event.target;
    if (shouldIgnoreKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      targetTag: target?.tagName,
      targetIsEditable: target?.isContentEditable,
    })) return;
    const action = keyToAction(event.key);
    if (!action) return;
    event.preventDefault();
    if (action.type === 'camera') scene?.cameraCommand(action.command);
    else dispatch(action);
  });

  reducedMotionQuery?.addEventListener?.('change', () => {
    scene?.setReducedMotion(reducedMotion());
    if (reducedMotion()) dispatch({ type: 'setPaused', paused: true });
  });

  // ----- 3D scene (optional enhancement) -----
  function showFallback(message) {
    elements.sceneContainer.dataset.sceneState = 'fallback';
    elements.controls.querySelectorAll('[data-needs-3d]').forEach(button => { button.hidden = true; });
    elements.sceneStatus.hidden = false;
    elements.sceneStatus.textContent = message;
  }

  async function loadScene() {
    const forced2d = new URLSearchParams(location.search).get('view') === '2d';
    if (forced2d || !webglAvailable()) {
      showFallback(forced2d
        ? 'The 3D view is switched off. You can still explore every world with the buttons and read all the facts.'
        : 'Your device cannot show the 3D view, but you can still explore every world with the buttons and read all the facts.');
      return;
    }
    elements.sceneContainer.dataset.sceneState = 'loading';
    try {
      const { createSolarSystemScene } = await import('../scenes/solarSystemScene.js');
      const state = nav.getState();
      scene = createSolarSystemScene({
        canvas: elements.canvas,
        labelLayer: elements.labels,
        bodies,
        earth,
        quality,
        reducedMotion: reducedMotion(),
        paused: state.paused,
        onPick: id => dispatch({ type: 'select', id }),
        onContextLost: () => {
          scene?.dispose();
          scene = null;
          showFallback('The 3D view stopped working, but you can still explore every world with the buttons and read all the facts. Reload the page to try 3D again.');
        },
      });
      scene.setLabelsVisible(prefs.labels);
      scene.setPaused(state.paused);
      scene.focus(state.selectedId, { instant: true });
      elements.sceneStatus.hidden = true;
      if (prefs.textures) scene.setTexturesEnabled(true);
    } catch (error) {
      console.error(error);
      scene = null;
      showFallback('The 3D view could not load. You can still explore every world with the buttons and read all the facts.');
    }
  }

  loadScene();
  return { navigator: nav, getScene: () => scene };
}
