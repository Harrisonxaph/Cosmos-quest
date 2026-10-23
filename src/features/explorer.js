// Planet Explorer: connects navigation state, the information panel, controls and the 3D scene.
// The panel, selector and list work on their own; the 3D scene is an enhancement loaded on demand.
import { el, clear } from '../components/dom.js';
import { renderBodyPanel, renderOverviewPanel } from '../components/infoPanel.js';
import { createBodySelector } from '../components/bodySelector.js';
import { createPlanetList } from '../components/planetList.js';
import { renderQuizPanel, renderQuizResume } from '../components/quizPanel.js';
import { renderMissionsPanel, renderMissionBar } from '../components/missionPanel.js';
import { renderExperimentsPanel, experimentAnnouncement } from '../components/experimentPanel.js';
import { renderSceneCard } from '../components/sceneCard.js';
import { renderCosmosPanel } from '../components/cosmosPanel.js';
import { createNavigator, initialState, parseHash, formatHash, keyToAction, shouldIgnoreKey, actionAllowedInView, MODES } from './navigation.js';
import { createQuizStore, progressLabel, feedbackAnnouncement, resultMessage, score } from './quiz.js';
import { createMissionStore, resumableMission, screenKey, stepAnnouncement, stepLabel } from './missions.js';
import { createExperimentStore, experimentScreenKey } from './experiments.js';
import { createCosmosMapStore } from './cosmos.js';
import { placeGalaxies } from '../utils/cosmosLayout.js';
import { galaxyListLine, nameInSentence } from '../utils/cosmosContent.js';

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

const loadCosmosMapModule = () => import('../components/cosmosMap.js');

export function startExplorer({
  elements, bodies, planets, earth, sourcesById, quizQuestions, missions: missionDefinitions, experiments: experimentDefinitions,
  loadGalaxies = () => Promise.resolve([]), loadCosmosMap = loadCosmosMapModule,
}) {
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

  // Quiz progress lives only in memory for this visit: no storage, accounts or tracking.
  const quiz = createQuizStore(quizQuestions);
  const quizHandlers = {
    bodiesById,
    sourcesById,
    onStart: () => quiz.startRound(),
    onAnswer: answerId => quiz.dispatch({ type: 'answer', answerId }),
    onNext: () => quiz.dispatch({ type: 'next' }),
    onExplore: id => dispatch({ type: 'select', id }),
    onLeave: () => dispatch({ type: 'overview' }), // keeps quiz progress; the panel shows "Back to the quiz"
    onPlayAgain: () => quiz.startRound(),
    onBackToExploring: () => {
      quiz.dispatch({ type: 'reset' });
      dispatch({ type: 'overview' });
    },
  };

  // Mission progress is separate from the quiz and also lives only in memory for this visit.
  const missions = createMissionStore(missionDefinitions);
  const missionContext = {
    missions: missionDefinitions,
    bodiesById,
    sourcesById,
    handlers: {
      onOpen: id => missions.dispatch({ type: 'open', missionId: id }),
      onStart: id => missions.dispatch({ type: 'start', missionId: id }),
      onRestart: id => missions.dispatch({ type: 'restart', missionId: id }),
      onFound: id => missions.dispatch({ type: 'found', missionId: id }),
      onAnswer: (id, answerId) => missions.dispatch({ type: 'answer', missionId: id, answerId }),
      onNext: id => missions.dispatch({ type: 'next', missionId: id }),
      onExplore: target => dispatch(target === 'overview' ? { type: 'overview' } : { type: 'select', id: target }),
      onLeave: () => dispatch({ type: 'overview' }), // keeps mission progress; panels show "Back to the mission"
      onExploreFreely: () => {
        missions.dispatch({ type: 'open', missionId: null });
        dispatch({ type: 'overview' });
      },
    },
  };
  // Science Experiments: settings are kept in memory for this visit, separate from the quiz and missions.
  const experiments = createExperimentStore(experimentDefinitions);
  const experimentContext = {
    experiments: experimentDefinitions,
    bodies,
    bodiesById,
    earth,
    sourcesById,
    handlers: {
      onOpen: id => experiments.dispatch({ type: 'open', id }),
      onInput: (id, text) => experiments.dispatch({ type: 'input', id, text }),
      onWorld: (id, worldId) => experiments.dispatch({ type: 'world', id, worldId }),
      onPredict: (id, optionId) => experiments.dispatch({ type: 'predict', id, optionId }),
      onReveal: id => experiments.dispatch({ type: 'reveal', id }),
      onReset: id => experiments.dispatch({ type: 'reset', id }),
      onLeave: () => dispatch({ type: 'overview' }), // keeps the settings for this visit
    },
  };

  // Where the child was reading a mission or experiment screen when they left. Restored only when
  // they come back to that same screen; advancing to another step or screen starts at the top.
  // Cosmos keeps one position per screen (the list or a galaxy), and switching from Cosmos back to the
  // solar system returns to where the child was reading there.
  const readingViews = {
    quiz: () => `${quiz.getState().status}|${quiz.getState().index}`,
    missions: () => screenKey(missions.getState()),
    experiments: () => experimentScreenKey(experiments.getState()),
    cosmos: state => state.galaxyId ?? 'list',
    solar: state => placeOf(state),
  };
  const readingGroup = view => (view === 'overview' || view === 'body' ? 'solar' : view);
  const readings = {};
  function saveReading(group, state) {
    const active = document.activeElement;
    let focus = null;
    if (active && elements.panel.contains(active) && active !== elements.panel) {
      if (active.dataset.missionAction) focus = `[data-mission-action="${active.dataset.missionAction}"]`;
      else if (active.dataset.experimentAction) focus = `[data-experiment-action="${active.dataset.experimentAction}"]`;
      else if (active.dataset.quizAction) focus = `[data-quiz-action="${active.dataset.quizAction}"]`;
      else if (active.dataset.cosmosAction) focus = `[data-cosmos-action="${active.dataset.cosmosAction}"]`;
      else if (active.dataset.answer) focus = `[data-answer="${active.dataset.answer}"]`;
      else if (active.dataset.galaxy) focus = `[data-galaxy="${active.dataset.galaxy}"]`;
      else if (active.dataset.mode) focus = `[data-mode="${active.dataset.mode}"]`;
      else if (active.id) focus = `#${active.id}`;
    }
    const locked = Boolean(elements.panel.querySelector('.mission-locked'));
    const body = elements.panel.querySelector('article.panel[data-body]:last-of-type')?.dataset.body ?? group;
    readings[group] = { key: readingViews[group](state), body, panelTop: elements.panel.scrollTop, pageY: window.scrollY, focus, locked };
  }
  function restoreReading(group, reading) {
    // If exploring unlocked a question's answers, start at the question so Tab reaches the answers next.
    const unlocked = reading.locked && !elements.panel.querySelector('.mission-locked') ? elements.panel.querySelector('#mission-question') : null;
    const saved = reading.focus && elements.panel.querySelector(`article[data-body="${reading.body}"] ${reading.focus}`);
    // Exploring views keep focus on the switch or button just used unless a panel control had it.
    const fallback = group === 'solar' || group === 'cosmos' ? null : elements.panel.querySelector('[data-focus-target]') ?? elements.panel;
    (unlocked ?? saved ?? fallback)?.focus({ preventScroll: true });
    elements.panel.scrollTop = reading.panelTop;
    window.scrollTo(0, reading.pageY);
  }

  const placeOf = state => (state.view === 'body' ? state.selectedId : state.view === 'overview' ? 'overview' : null);
  const isExploring = view => view === 'overview' || view === 'body' || view === 'cosmos';

  // ----- Cosmos: the galaxy collection and map load only when Cosmos is first opened -----
  const saveData = navigator.connection?.saveData === true;
  const cosmosMapStore = createCosmosMapStore(); // map zoom and pan, kept for this visit
  const cosmos = { galaxies: null, placements: null, loading: null, error: false, map: null, mapLoading: null, mapFailed: false };
  let cosmosFocus = null; // where focus goes after the next Cosmos screen change: 'heading', or { galaxy } in the list
  let replaceHistory = false;
  const galaxyName = id => cosmos.galaxies?.find(g => g.id === id)?.name ?? null;
  const galaxyInSentence = id => nameInSentence(cosmos.galaxies.find(g => g.id === id));
  const cosmosHandlers = {
    onSelect: id => {
      cosmosFocus = 'heading';
      dispatch({ type: 'openCosmos', galaxyId: id });
      cosmosFocus = null;
    },
    onList: fromId => {
      cosmosFocus = { galaxy: fromId };
      dispatch({ type: 'openCosmos', galaxyId: null });
      cosmosFocus = null;
    },
    onSolar: () => goSolar(),
    onModeChange: mode => dispatch({ type: 'setMode', mode }),
    onRetry: () => {
      cosmos.error = false;
      renderPanel(nav.getState(), { focusTarget: true });
      ensureGalaxies();
    },
  };

  function ensureGalaxies() {
    if (cosmos.galaxies || cosmos.loading) return;
    cosmos.loading = Promise.resolve().then(loadGalaxies).then(list => {
      cosmos.galaxies = list;
      cosmos.placements = placeGalaxies(list);
    }).catch(error => {
      console.error(error);
      cosmos.error = true;
    }).finally(() => {
      cosmos.loading = null;
      const state = nav.getState();
      if (state.view !== 'cosmos') return;
      // An address naming a galaxy that isn't in the collection opens the list instead.
      if (state.galaxyId && cosmos.galaxies && !galaxyName(state.galaxyId)) {
        replaceHistory = true;
        dispatch({ type: 'openCosmos', galaxyId: null });
        replaceHistory = false;
        return;
      }
      const focusWasOnHeading = document.activeElement?.id === 'panel-title-cosmos';
      renderPanel(state, { focusTarget: focusWasOnHeading });
      if (state.galaxyId && previousStatus === 'loading') elements.status.textContent = `Now showing ${galaxyInSentence(state.galaxyId)}`;
      ensureMap();
      updateCosmosSection(state);
    });
  }

  function ensureMap() {
    if (cosmos.map || cosmos.mapLoading || cosmos.mapFailed || !cosmos.galaxies) return;
    cosmos.mapLoading = Promise.resolve().then(loadCosmosMap).then(({ createCosmosMap }) => {
      cosmos.map = createCosmosMap({
        container: elements.cosmosMap,
        galaxies: cosmos.galaxies,
        placements: cosmos.placements,
        store: cosmosMapStore,
        onSelect: id => {
          // Chosen on the map: focus stays on the galaxy, and the live region says what is now showing.
          dispatch({ type: 'openCosmos', galaxyId: id });
        },
      });
      updateCosmosSection(nav.getState());
    }).catch(error => {
      console.error(error);
      cosmos.mapFailed = true;
      showMapFallback();
      if (nav.getState().view === 'cosmos') renderPanel(nav.getState());
    }).finally(() => {
      cosmos.mapLoading = null;
    });
  }

  function showMapFallback() {
    elements.cosmosMap.dataset.mapState = 'fallback';
    clear(elements.cosmosMap).append(
      el('p', { className: 'cosmos-map__status' }, 'The map could not load, but every galaxy is in the list of galaxies, with the same pictures and facts.'),
      el('button', { type: 'button', className: 'secondary-button', 'data-cosmos-action': 'to-list', onClick: () => focusPanelHeading() }, 'Go to the list of galaxies'));
  }

  function focusPanelHeading() {
    const heading = elements.panel.querySelector('[data-focus-target]');
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  // The strip under the map names the galaxy being shown and links to its picture and facts in the panel,
  // which is below the map on phones.
  function updateCosmosSection(state) {
    const on = state.view === 'cosmos';
    elements.stage.dataset.showing = on ? 'cosmos' : 'solar';
    elements.stage.setAttribute('aria-label', on ? 'Galaxy explorer' : 'Planet explorer');
    const wasHidden = elements.cosmos.hidden;
    elements.cosmos.hidden = !on;
    if (!on) return;
    if (wasHidden) cosmos.map?.redraw(); // draw straight away, not a frame later
    cosmos.map?.setSelected(state.galaxyId);
    const galaxy = state.galaxyId ? cosmos.galaxies?.find(g => g.id === state.galaxyId) : null;
    clear(elements.cosmosSelected);
    elements.cosmosSelected.hidden = !galaxy;
    if (galaxy) {
      elements.cosmosSelected.append(
        el('p', {}, el('strong', {}, galaxy.name), ` · ${galaxyListLine(galaxy)}`),
        el('button', { type: 'button', className: 'secondary-button', 'data-cosmos-action': 'facts', onClick: () => focusPanelHeading() }, 'Picture and facts'));
    }
  }

  // ----- Panel, selector and Stage 1 list -----
  const selector = createBodySelector(bodies, id => dispatch({ type: 'select', id }));
  elements.selector.append(selector.element);
  elements.planetList.append(...createPlanetList(planets, id => {
    dispatch({ type: 'select', id });
    elements.stage.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }));

  function renderPanel(state, { focusTarget = false } = {}) {
    const quizState = quiz.getState();
    let panel;
    if (state.view === 'quiz') panel = renderQuizPanel(quizState, quizHandlers);
    else if (state.view === 'missions') panel = renderMissionsPanel(missions.getState(), missionContext);
    else if (state.view === 'experiments') panel = renderExperimentsPanel(experiments.getState(), experimentContext);
    else if (state.view === 'cosmos') {
      panel = renderCosmosPanel({
        galaxies: cosmos.galaxies,
        galaxyId: state.galaxyId,
        mode: state.mode,
        sourcesById,
        mapAvailable: !cosmos.mapFailed,
        error: cosmos.error,
        saveData,
        handlers: cosmosHandlers,
      });
    }
    else if (state.view === 'body') {
      panel = renderBodyPanel(bodiesById[state.selectedId], {
        earth,
        mode: state.mode,
        sourcesById,
        onModeChange: mode => dispatch({ type: 'setMode', mode }),
      });
    } else {
      panel = renderOverviewPanel({
        bodies,
        earth,
        onSelect: id => dispatch({ type: 'select', id }),
        onQuiz: () => dispatch({ type: 'openQuiz' }),
        onMissions: () => dispatch({ type: 'openMissions' }),
        onExperiments: () => dispatch({ type: 'openExperiments' }),
      });
    }
    // "Waiting" bars appear only while exploring, so they never crowd another activity; the activity bar shows progress too.
    const exploring = isExploring(state.view);
    const resume = exploring && quizState.status !== 'idle' ? renderQuizResume(quizState, () => dispatch({ type: 'openQuiz' })) : null;
    const activeMission = exploring ? resumableMission(missions.getState(), missionDefinitions) : null;
    const missionBar = activeMission ? renderMissionBar(missions.getState(), activeMission, {
      place: placeOf(state),
      bodiesById,
      onFound: id => {
        // Open the mission first, so the "Great find!" feedback is focused and announced there.
        dispatch({ type: 'openMissions' });
        missions.dispatch({ type: 'found', missionId: id });
      },
      onResume: () => dispatch({ type: 'openMissions' }),
    }) : null;
    // Re-rendering replaces the focused element, so remember where keyboard focus was and put it back.
    const active = document.activeElement;
    const focusWasInPanel = active && active !== elements.panel && elements.panel.contains(active);
    const restoreSelector = focusWasInPanel && active.dataset.mode ? `.mode-toggle__option[data-mode="${active.dataset.mode}"]` : null;
    clear(elements.panel).append(...[missionBar, resume, panel].filter(Boolean));
    if (focusTarget) {
      // Quiz and mission screens: move focus to the new task, the feedback or the results so it is announced.
      (elements.panel.querySelector('[data-focus-target]') ?? elements.panel).focus();
    } else if (focusWasInPanel) {
      const target = (restoreSelector && elements.panel.querySelector(restoreSelector)) || elements.panel;
      target.focus({ preventScroll: true });
    }
  }

  // ----- Facts card over the 3D view -----
  // Shown while a world is selected. "Hide card" only hides it: the selection stays, and choosing a world
  // (another or the same one) shows it again. Its size is passed to the scene so the world isn't hidden behind it.
  const card = { hidden: false, expanded: false };
  function renderCard(state, { focus = null } = {}) {
    if (state.view !== 'body') {
      clear(elements.card);
      elements.card.hidden = true;
      updateCardInset();
      return;
    }
    const body = bodiesById[state.selectedId];
    clear(elements.card).append(renderSceneCard(body, {
      earth,
      hidden: card.hidden,
      expanded: card.expanded,
      onMore: () => showMoreFacts(body.id),
      onHide: () => {
        card.hidden = true;
        renderCard(nav.getState(), { focus: '[data-card-action="show"]' });
      },
      onShow: () => {
        card.hidden = false;
        renderCard(nav.getState(), { focus: '.scene-card__title' });
      },
      onToggle: () => {
        card.expanded = !card.expanded;
        renderCard(nav.getState(), { focus: '[data-card-action="toggle"]' });
      },
      onOverview: () => {
        dispatch({ type: 'overview' });
        // The card has gone, so keep keyboard focus nearby: on the overview's heading, without scrolling away.
        const heading = elements.panel.querySelector('#panel-title-overview');
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      },
    }));
    elements.card.hidden = false;
    if (focus) elements.card.querySelector(focus)?.focus({ preventScroll: true });
    updateCardInset();
  }
  function updateCardInset() {
    const node = elements.card.querySelector('.scene-card:not(.scene-card--hidden)');
    if (!scene) return;
    if (!node || elements.sceneContainer.dataset.sceneState === 'fallback') {
      scene.setFrameInset({ right: 0, bottom: 0 });
      return;
    }
    // A strip along the bottom on small screens, a column on the right otherwise (see style.css).
    const container = elements.sceneContainer.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const strip = box.width > container.width * 0.6;
    scene.setFrameInset(strip
      ? { right: 0, bottom: Math.max(0, container.bottom - box.top) }
      : { right: Math.max(0, container.right - box.left), bottom: 0 });
  }
  new ResizeObserver(() => updateCardInset()).observe(elements.card);
  function showMoreFacts(id) {
    const heading = elements.panel.querySelector(`#panel-title-${id}`);
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
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
    if (isExploring(state.view)) elements.exploreEntry.setAttribute('aria-current', 'page');
    else elements.exploreEntry.removeAttribute('aria-current');
    for (const option of elements.exploreSwitch.querySelectorAll('[data-explore]')) {
      option.setAttribute('aria-pressed', String((option.dataset.explore === 'cosmos') === (state.view === 'cosmos')));
    }
    if (state.view === 'quiz') elements.quizEntry.setAttribute('aria-current', 'page');
    else elements.quizEntry.removeAttribute('aria-current');
    if (state.view === 'missions') elements.missionsEntry.setAttribute('aria-current', 'page');
    else elements.missionsEntry.removeAttribute('aria-current');
    if (state.view === 'experiments') elements.experimentsEntry.setAttribute('aria-current', 'page');
    else elements.experimentsEntry.removeAttribute('aria-current');
    const mission = resumableMission(missions.getState(), missionDefinitions);
    const missionProgress = mission ? missions.getState().progress[mission.id] : null;
    elements.missionsEntry.querySelector('.quiz-entry__progress').textContent = mission ? ` · ${stepLabel(missionProgress.stepIndex, mission.steps.length)}` : '';
    const quizState = quiz.getState();
    elements.quizEntry.querySelector('.quiz-entry__progress').textContent = quizState.status === 'question' || quizState.status === 'feedback' ? ` · ${progressLabel(quizState)}` : '';
  }

  // Read longer feedback aloud after focus has moved, through the existing polite live region.
  // The delay is cancelled whenever the screen changes, and `stillShown` re-checks at the last moment
  // that the screen the text belongs to is still displayed.
  let announceTimer = 0;
  function cancelAnnouncement() {
    clearTimeout(announceTimer);
    announceTimer = 0;
  }
  function announce(text, stillShown = () => true) {
    cancelAnnouncement();
    elements.status.textContent = '';
    announceTimer = setTimeout(() => {
      announceTimer = 0;
      if (stillShown()) elements.status.textContent = text;
    }, 300);
  }

  // ----- React to navigation -----
  let sceneFocusId; // the world the 3D camera was last sent to (undefined until the first time)
  let previousStatus = null;
  function apply(state, previous) {
    const selectionChanged = !previous || state.view !== previous.view || state.selectedId !== previous.selectedId || state.galaxyId !== previous.galaxyId;
    if (selectionChanged) cancelAnnouncement(); // feedback for the screen being left must not be read out later
    const group = readingGroup(state.view);
    const previousGroup = previous ? readingGroup(previous.view) : null;
    // The solar system's reading position is kept only for a round trip through Cosmos.
    const keepsReading = g => g !== 'solar' || (previous && (previous.view === 'cosmos' || state.view === 'cosmos'));
    if (previous && group !== previousGroup && readingViews[previousGroup] && keepsReading(previousGroup)) saveReading(previousGroup, previous);
    else if (previousGroup === 'solar' && group !== 'solar') delete readings.solar;
    const saved = previous && group !== previousGroup && readingViews[group] && keepsReading(group) ? readings[group] : null;
    const reading = saved && saved.key === readingViews[group](state) ? saved : null;
    // Opening a world records the visit for a mission "find" step. It never completes the step by itself.
    const place = placeOf(state);
    if (selectionChanged && place) missions.dispatch({ type: 'visit', target: place });
    if (selectionChanged || state.mode !== previous.mode) {
      renderPanel(state, { focusTarget: Boolean(previous) && selectionChanged && !reading && ['quiz', 'missions', 'experiments'].includes(state.view) });
    }
    updateControls(state);
    if (selectionChanged) {
      const target = formatHash(state);
      if (location.hash !== target && !(target === '#/' && location.hash === '')) history[replaceHistory ? 'replaceState' : 'pushState'](null, '', target);
      // Entering an activity moves focus to its heading, which is announced; saying the name in the live
      // region as well would be read twice. When a saved position is restored instead, say where they are.
      const activityName = { quiz: 'Planet Quiz', missions: 'Discovery Missions', experiments: 'Science Experiments' }[state.view];
      previousStatus = null;
      if (state.view === 'cosmos') elements.status.textContent = cosmosStatus(state, previous, reading);
      else {
        elements.status.textContent = state.view === 'body'
          ? `Now exploring ${bodiesById[state.selectedId].name}`
          : activityName ? (reading ? `Back to ${activityName}` : (previous ? '' : activityName)) : 'Showing the whole solar system';
      }
      updateCosmosSection(state);
      scene?.setSuspended(state.view === 'cosmos');
      if (state.view === 'cosmos') {
        ensureGalaxies();
        ensureMap();
        // Chosen from the list: pan the map just enough to show the galaxy. Coming back to Cosmos leaves the map as it was.
        if (state.galaxyId && previous?.view === 'cosmos' && previous.galaxyId !== state.galaxyId) cosmos.map?.reveal(state.galaxyId);
      } else {
        // Coming back from Cosmos to the same place leaves the camera (and a hidden card) as they were.
        const samePlace = state.selectedId === sceneFocusId;
        if (!samePlace || !scene) {
          scene?.focus(state.selectedId);
          card.hidden = false;
        }
        if (scene) sceneFocusId = state.selectedId;
        selector.revealActive(state.selectedId, { smooth: Boolean(previous) && !reducedMotion() && !samePlace });
      }
      renderCard(state);
      if (previous) elements.panel.scrollTop = 0;
      if (reading) restoreReading(group, reading);
      else if (state.view === 'cosmos' && previous) focusCosmos();
    }
    if (!previous || state.paused !== previous.paused) scene?.setPaused(state.paused);
    if (previous && state.mode !== previous.mode) {
      prefs.mode = state.mode;
      writePrefs(prefs);
    }
  }
  function cosmosStatus(state, previous, reading) {
    if (state.galaxyId) {
      if (!cosmos.galaxies) {
        previousStatus = 'loading';
        return 'Loading the galaxies';
      }
      // A galaxy chosen in the list moves focus to its heading, which is read out instead.
      return cosmosFocus === 'heading' ? '' : `Now showing ${galaxyInSentence(state.galaxyId)}`;
    }
    if (cosmosFocus?.galaxy) return '';
    if (reading) return 'Back to Cosmos';
    return previous?.view === 'cosmos' ? 'Showing all galaxies' : 'Showing galaxies beyond our solar system. The map is not to scale.';
  }
  function focusCosmos() {
    if (cosmosFocus === 'heading') {
      elements.panel.querySelector('[data-focus-target]')?.focus({ preventScroll: true });
      elements.panel.querySelector('[data-focus-target]')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    } else if (cosmosFocus?.galaxy) {
      const button = elements.panel.querySelector(`[data-galaxy="${cosmosFocus.galaxy}"]`);
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: 'nearest' });
    }
  }

  nav.subscribe(apply);
  apply(nav.getState(), null);
  updateToggles();

  elements.missionsEntry.addEventListener('click', () => {
    if (nav.getState().view === 'missions') renderPanel(nav.getState(), { focusTarget: true });
    else dispatch({ type: 'openMissions' });
  });
  missions.subscribe((missionState, previousMissionState, action) => {
    const state = nav.getState();
    if (state.view === 'missions') {
      if (action.type === 'visit') return;
      cancelAnnouncement();
      renderPanel(state, { focusTarget: true });
      // A new step or screen starts at the top (focusing its heading also scrolls it into view on phones).
      if (screenKey(missionState) !== screenKey(previousMissionState)) elements.panel.scrollTop = 0;
      const shownKey = screenKey(missionState);
      const stillShown = () => nav.getState().view === 'missions' && screenKey(missions.getState()) === shownKey;
      const mission = missionDefinitions.find(m => m.id === missionState.activeMissionId);
      const progress = mission ? missionState.progress[mission.id] : null;
      const step = progress?.status === 'active' ? mission.steps[progress.stepIndex] : null;
      const stepProgress = step ? progress.steps[step.id] : null;
      if (step && (progress.phase === 'feedback' || (action.type === 'answer' && stepProgress.last && !stepProgress.last.correct))) {
        announce(stepAnnouncement(step, stepProgress, progress.stepIndex, mission.steps.length).detail, stillShown);
      } else if (progress?.status === 'complete') {
        announce(mission.recap, stillShown);
      }
    }
    updateControls(state);
  });

  // Explore returns to wherever the child was last exploring: a world, the whole solar system, or Cosmos.
  // The solar system and Cosmos each remember their own place, so switching between them keeps both.
  const lastPlace = { solar: null, cosmos: null, kind: 'solar' };
  function rememberPlace(state) {
    if (state.view === 'body' || state.view === 'overview') Object.assign(lastPlace, { solar: state.selectedId, kind: 'solar' });
    else if (state.view === 'cosmos') Object.assign(lastPlace, { cosmos: state.galaxyId, kind: 'cosmos' });
  }
  nav.subscribe(rememberPlace);
  rememberPlace(nav.getState());
  const goSolar = () => dispatch(lastPlace.solar ? { type: 'select', id: lastPlace.solar } : { type: 'overview' });
  const goCosmos = () => dispatch({ type: 'openCosmos', galaxyId: lastPlace.cosmos });
  elements.exploreEntry.addEventListener('click', () => {
    const state = nav.getState();
    if (isExploring(state.view)) {
      elements.panel.focus({ preventScroll: true });
      return;
    }
    if (lastPlace.kind === 'cosmos') goCosmos();
    else goSolar();
  });
  elements.exploreSwitch.addEventListener('click', event => {
    const option = event.target.closest('[data-explore]');
    if (!option) return;
    const inCosmos = nav.getState().view === 'cosmos';
    if (option.dataset.explore === 'cosmos' && !inCosmos) goCosmos();
    else if (option.dataset.explore === 'solar' && (inCosmos || !isExploring(nav.getState().view))) goSolar();
  });
  elements.experimentsEntry.addEventListener('click', () => {
    if (nav.getState().view === 'experiments') renderPanel(nav.getState(), { focusTarget: true });
    else dispatch({ type: 'openExperiments' });
  });
  experiments.subscribe((experimentState, previousExperimentState, action) => {
    const state = nav.getState();
    // Typing, sliding, choosing a planet or a guess re-render nothing: the panel updates itself, and nothing is announced.
    if (state.view !== 'experiments' || !['open', 'reveal', 'reset'].includes(action.type)) return;
    cancelAnnouncement();
    renderPanel(state, { focusTarget: true });
    // A newly opened or reset activity starts at the top; a result is focused (and scrolled to) below the form.
    if (action.type !== 'reveal') elements.panel.scrollTop = 0;
    const shownKey = experimentScreenKey(experimentState);
    const stillShown = () => nav.getState().view === 'experiments' && experimentScreenKey(experiments.getState()) === shownKey;
    const experiment = experimentDefinitions.find(e => e.id === experimentState.activeId);
    if (action.type === 'reveal' && experiment) {
      const text = experimentAnnouncement(experiment, experimentState.activities[experiment.id], experimentContext);
      if (text) announce(text, stillShown);
    } else if (action.type === 'reset' && experiment) {
      announce(`${experiment.title} is back to its starting values.`, stillShown);
    }
  });

  elements.quizEntry.addEventListener('click', () => {
    if (nav.getState().view === 'quiz') renderPanel(nav.getState(), { focusTarget: true });
    else dispatch({ type: 'openQuiz' });
  });
  quiz.subscribe(quizState => {
    const state = nav.getState();
    if (state.view === 'quiz') {
      cancelAnnouncement();
      renderPanel(state, { focusTarget: true });
      const shown = `${quizState.status}|${quizState.index}`;
      const stillShown = () => nav.getState().view === 'quiz' && `${quiz.getState().status}|${quiz.getState().index}` === shown;
      if (quizState.status === 'feedback') {
        const response = quizState.responses.at(-1);
        announce(feedbackAnnouncement(quizState.questions[quizState.index], response, quizState.index).explanation, stillShown);
      } else if (quizState.status === 'results') {
        announce(resultMessage(score(quizState), quizState.questions.length), stillShown);
      }
    }
    updateControls(state);
  });

  window.addEventListener('popstate', () => {
    const target = parseHash(location.hash);
    if (target.view === 'body') dispatch({ type: 'select', id: target.selectedId });
    else if (target.view === 'quiz') dispatch({ type: 'openQuiz' });
    else if (target.view === 'missions') dispatch({ type: 'openMissions' });
    else if (target.view === 'experiments') dispatch({ type: 'openExperiments' });
    else if (target.view === 'cosmos') dispatch({ type: 'openCosmos', galaxyId: target.galaxyId });
    else dispatch({ type: 'overview' });
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
    if (!action || !actionAllowedInView(action, nav.getState().view)) return;
    event.preventDefault();
    if (action.type === 'camera') scene?.cameraCommand(action.command);
    else if (nav.getState().view === 'cosmos') goSolar(); // Esc in Cosmos goes back to the solar system, where the child was
    else dispatch(action);
  });

  reducedMotionQuery?.addEventListener?.('change', () => {
    scene?.setReducedMotion(reducedMotion());
    if (reducedMotion()) dispatch({ type: 'setPaused', paused: true });
  });

  // ----- 3D scene (optional enhancement) -----
  function showFallback(message) {
    elements.sceneContainer.dataset.sceneState = 'fallback';
    elements.stage.querySelectorAll('[data-needs-3d]').forEach(node => { node.hidden = true; });
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
        onPick: (id, { fromLabel = false } = {}) => {
          dispatch({ type: 'select', id });
          // A label chosen with the keyboard disappears as the camera flies, so focus moves to the new card.
          if (fromLabel) elements.card.querySelector('.scene-card__title')?.focus({ preventScroll: true });
        },
        onContextLost: () => {
          scene?.dispose();
          scene = null;
          showFallback('The 3D view stopped working, but you can still explore every world with the buttons and read all the facts. Reload the page to try 3D again.');
        },
      });
      scene.setLabelsVisible(prefs.labels);
      scene.setPaused(state.paused);
      // Opened straight into Cosmos: the camera starts where the solar system will be shown.
      const startId = state.view === 'cosmos' ? lastPlace.solar : state.selectedId;
      scene.focus(startId, { instant: true });
      sceneFocusId = startId;
      scene.setSuspended(state.view === 'cosmos');
      updateCardInset();
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
