import { test } from 'node:test';
import assert from 'node:assert/strict';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import {
  BODY_ORDER, initialState, reduce, createNavigator, parseHash, formatHash, keyToAction, shouldIgnoreKey, actionAllowedInView, SHORTCUTS,
} from '../../src/features/navigation.js';

test('navigation order is the Sun then the planets in order from the Sun', () => {
  assert.deepEqual(BODY_ORDER, [sun, ...planets].map(body => body.id));
});

test('starts on the solar system overview, unpaused, in simple mode', () => {
  assert.deepEqual(initialState(), { view: 'overview', selectedId: null, paused: false, mode: 'simple' });
});

test('selecting a world, and ignoring unknown ones', () => {
  const state = reduce(initialState(), { type: 'select', id: 'jupiter' });
  assert.equal(state.view, 'body');
  assert.equal(state.selectedId, 'jupiter');
  const same = reduce(state, { type: 'select', id: 'pluto' });
  assert.equal(same, state, 'Pluto is not one of the explorer worlds');
});

test('returning to the overview clears the selection', () => {
  const state = reduce(reduce(initialState(), { type: 'select', id: 'mars' }), { type: 'overview' });
  assert.equal(state.view, 'overview');
  assert.equal(state.selectedId, null);
});

test('next and previous step through every world and wrap around', () => {
  let state = initialState();
  const visited = [];
  for (let i = 0; i < BODY_ORDER.length; i++) {
    state = reduce(state, { type: 'next' });
    visited.push(state.selectedId);
  }
  assert.deepEqual(visited, BODY_ORDER);
  assert.equal(reduce(state, { type: 'next' }).selectedId, 'sun', 'wraps from Neptune to the Sun');
  assert.equal(reduce(initialState(), { type: 'previous' }).selectedId, 'neptune', 'previous from overview goes to Neptune');
  assert.equal(reduce(reduce(initialState(), { type: 'select', id: 'sun' }), { type: 'previous' }).selectedId, 'neptune');
});

test('pausing and info modes', () => {
  const paused = reduce(initialState(), { type: 'togglePause' });
  assert.equal(paused.paused, true);
  assert.equal(reduce(paused, { type: 'togglePause' }).paused, false);
  assert.equal(reduce(paused, { type: 'setPaused', paused: false }).paused, false);
  const detailed = reduce(initialState(), { type: 'setMode', mode: 'detailed' });
  assert.equal(detailed.mode, 'detailed');
  assert.equal(reduce(detailed, { type: 'setMode', mode: 'expert' }), detailed);
  assert.equal(reduce(detailed, { type: 'toggleMode' }).mode, 'simple');
});

test('pausing or changing mode keeps the selected world', () => {
  const state = reduce(initialState(), { type: 'select', id: 'saturn' });
  assert.equal(reduce(state, { type: 'togglePause' }).selectedId, 'saturn');
  assert.equal(reduce(state, { type: 'toggleMode' }).selectedId, 'saturn');
});

test('the navigator notifies listeners only when state changes', () => {
  const nav = createNavigator();
  const seen = [];
  const unsubscribe = nav.subscribe((state, previous) => seen.push([previous.selectedId, state.selectedId]));
  nav.dispatch({ type: 'select', id: 'earth' });
  nav.dispatch({ type: 'select', id: 'not-a-world' });
  nav.dispatch({ type: 'next' });
  unsubscribe();
  nav.dispatch({ type: 'overview' });
  assert.deepEqual(seen, [[null, 'earth'], ['earth', 'mars']]);
  assert.equal(nav.getState().view, 'overview');
});

test('links: the URL hash selects a world and round-trips', () => {
  assert.deepEqual(parseHash('#/saturn'), { view: 'body', selectedId: 'saturn' });
  assert.deepEqual(parseHash('#/SUN'), { view: 'body', selectedId: 'sun' });
  assert.deepEqual(parseHash('#/pluto'), { view: 'overview', selectedId: null });
  assert.deepEqual(parseHash(''), { view: 'overview', selectedId: null });
  for (const id of BODY_ORDER) assert.equal(parseHash(formatHash({ view: 'body', selectedId: id })).selectedId, id);
  assert.equal(formatHash(initialState()), '#/');
});

test('keyboard shortcuts', () => {
  assert.deepEqual(keyToAction('0'), { type: 'select', id: 'sun' });
  assert.deepEqual(keyToAction('5'), { type: 'select', id: 'jupiter' });
  assert.deepEqual(keyToAction('8'), { type: 'select', id: 'neptune' });
  assert.equal(keyToAction('9'), null);
  assert.deepEqual(keyToAction('ArrowRight'), { type: 'next' });
  assert.deepEqual(keyToAction('ArrowLeft'), { type: 'previous' });
  assert.deepEqual(keyToAction('Escape'), { type: 'overview' });
  assert.deepEqual(keyToAction(' '), { type: 'togglePause' });
  assert.deepEqual(keyToAction('m'), { type: 'toggleMode' });
  assert.deepEqual(keyToAction('+'), { type: 'camera', command: 'zoomIn' });
  assert.deepEqual(keyToAction('-'), { type: 'camera', command: 'zoomOut' });
  assert.deepEqual(keyToAction('a'), { type: 'camera', command: 'rotateLeft' });
  assert.deepEqual(keyToAction('d'), { type: 'camera', command: 'rotateRight' });
  assert.equal(keyToAction('x'), null);
});

test('shortcuts leave typing, browser shortcuts and focused buttons alone', () => {
  const base = { key: 'n', ctrlKey: false, metaKey: false, altKey: false, targetTag: 'BODY', targetIsEditable: false };
  assert.equal(shouldIgnoreKey(base), false);
  assert.equal(shouldIgnoreKey({ ...base, ctrlKey: true }), true);
  assert.equal(shouldIgnoreKey({ ...base, metaKey: true }), true);
  assert.equal(shouldIgnoreKey({ ...base, targetTag: 'INPUT' }), true);
  assert.equal(shouldIgnoreKey({ ...base, targetIsEditable: true }), true);
  assert.equal(shouldIgnoreKey({ ...base, key: ' ', targetTag: 'BUTTON' }), true, 'Space activates the focused button');
  assert.equal(shouldIgnoreKey({ ...base, key: 'Enter', targetTag: 'A' }), true);
  assert.equal(shouldIgnoreKey({ ...base, key: 'ArrowRight', targetTag: 'BUTTON' }), false);
});

test('every documented shortcut works', () => {
  const keysByAction = { 'The Sun': ['0'], 'Mercury to Neptune': ['1', '8'], 'Previous / next world': ['ArrowLeft', 'ArrowRight', 'b', 'n'], 'Back to the solar system': ['Escape', 'o'], 'Pause / play': [' ', 'p'], 'Zoom in / out': ['+', '-'], 'Rotate the view': ['a', 'd'], 'Simple / detailed facts': ['m'] };
  assert.deepEqual(SHORTCUTS.map(([, action]) => action).sort(), Object.keys(keysByAction).sort());
  for (const keys of Object.values(keysByAction)) for (const key of keys) assert.ok(keyToAction(key), key);
});

test('the Planet Quiz has its own view and link, and leaving it keeps the selection rules', () => {
  const quiz = reduce(reduce(initialState(), { type: 'select', id: 'mars' }), { type: 'openQuiz' });
  assert.equal(quiz.view, 'quiz');
  assert.equal(quiz.selectedId, null);
  assert.equal(formatHash(quiz), '#/quiz');
  assert.deepEqual(parseHash('#/quiz'), { view: 'quiz', selectedId: null });
  assert.equal(reduce(quiz, { type: 'select', id: 'earth' }).view, 'body', 'Explore this planet');
  assert.equal(reduce(quiz, { type: 'overview' }).view, 'overview', 'Back to exploring');
});

test('explorer shortcuts pause during the quiz, except Escape', () => {
  for (const key of ['1', '5', 'ArrowRight', 'ArrowLeft', ' ', 'm', '+', 'a']) {
    assert.equal(actionAllowedInView(keyToAction(key), 'quiz'), false, key);
    assert.equal(actionAllowedInView(keyToAction(key), 'body'), true, key);
  }
  assert.equal(actionAllowedInView(keyToAction('Escape'), 'quiz'), true);
});

test('Discovery Missions have their own view and link, and pause explorer shortcuts like the quiz', () => {
  const state = reduce(reduce(initialState(), { type: 'select', id: 'venus' }), { type: 'openMissions' });
  assert.equal(state.view, 'missions');
  assert.equal(state.selectedId, null);
  assert.equal(formatHash(state), '#/missions');
  assert.deepEqual(parseHash('#/missions'), { view: 'missions', selectedId: null });
  assert.equal(actionAllowedInView(keyToAction('3'), 'missions'), false);
  assert.equal(actionAllowedInView(keyToAction('Escape'), 'missions'), true);
});

test('Science Experiments have their own view and link, and pause explorer shortcuts', () => {
  const state = reduce(reduce(initialState(), { type: 'select', id: 'mars' }), { type: 'openExperiments' });
  assert.equal(state.view, 'experiments');
  assert.equal(state.selectedId, null);
  assert.equal(formatHash(state), '#/experiments');
  assert.deepEqual(parseHash('#/experiments'), { view: 'experiments', selectedId: null });
  assert.equal(actionAllowedInView(keyToAction('4'), 'experiments'), false);
  assert.equal(actionAllowedInView(keyToAction('Escape'), 'experiments'), true);
});
