import { test } from 'node:test';
import assert from 'node:assert/strict';
import experiments from '../../src/data/experiments.json' with { type: 'json' };
import missions from '../../src/data/missions.json' with { type: 'json' };
import quizQuestions from '../../src/data/quiz.json' with { type: 'json' };
import { initialExperimentState, reduceExperiments, createExperimentStore, experimentScreenKey } from '../../src/features/experiments.js';
import { createMissionStore } from '../../src/features/missions.js';
import { createQuizStore, currentQuestion } from '../../src/features/quiz.js';

const run = (state, ...actions) => actions.reduce((s, action) => reduceExperiments(s, action, experiments), state);
const start = () => initialExperimentState(experiments);
const gravity = state => state.activities['gravity-lab'];
const tiny = state => state.activities['tiny-solar-system'];

test('each activity starts with its default settings and nothing revealed', () => {
  const s = start();
  assert.equal(s.activeId, null);
  assert.deepEqual(gravity(s), { text: '10', worldId: 'mars', prediction: null, revealed: null, error: null });
  assert.deepEqual(tiny(s), { text: '1', worldId: null, prediction: null, revealed: null, error: null });
  assert.equal(experimentScreenKey(s), 'list');
});

test('a result appears only after the deliberate reveal action', () => {
  let s = run(start(), { type: 'open', id: 'gravity-lab' }, { type: 'input', id: 'gravity-lab', text: '25' }, { type: 'world', id: 'gravity-lab', worldId: 'jupiter' });
  assert.equal(gravity(s).revealed, null, 'changing settings does not reveal anything');
  s = run(s, { type: 'predict', id: 'gravity-lab', optionId: 'more' }, { type: 'reveal', id: 'gravity-lab' });
  assert.deepEqual(gravity(s).revealed, { value: 25, worldId: 'jupiter', prediction: 'more' });
  assert.equal(experimentScreenKey(s), 'gravity-lab|result');
});

test('changing anything after a result hides it, so a result never shows old values', () => {
  const revealed = run(start(), { type: 'open', id: 'gravity-lab' }, { type: 'reveal', id: 'gravity-lab' });
  assert.ok(gravity(revealed).revealed);
  assert.equal(gravity(run(revealed, { type: 'input', id: 'gravity-lab', text: '11' })).revealed, null);
  assert.equal(gravity(run(revealed, { type: 'world', id: 'gravity-lab', worldId: 'venus' })).revealed, null);
  assert.equal(gravity(run(revealed, { type: 'predict', id: 'gravity-lab', optionId: 'less' })).revealed, null);
  assert.equal(run(revealed, { type: 'input', id: 'gravity-lab', text: '10' }), revealed, 'the same text changes nothing');
});

test('invalid input shows a message instead of a result, and typing clears it', () => {
  for (const [text, code] of [['', 'empty'], ['abc', 'not-a-number'], ['0', 'not-positive'], ['-3', 'not-positive'], ['5000', 'too-big']]) {
    const s = run(start(), { type: 'open', id: 'gravity-lab' }, { type: 'input', id: 'gravity-lab', text }, { type: 'reveal', id: 'gravity-lab' });
    assert.equal(gravity(s).revealed, null, text);
    assert.equal(gravity(s).error.code, code, text);
    assert.equal(experimentScreenKey(s), 'gravity-lab|error');
    assert.equal(gravity(run(s, { type: 'input', id: 'gravity-lab', text: '12' })).error, null);
  }
  const small = run(start(), { type: 'open', id: 'tiny-solar-system' }, { type: 'input', id: 'tiny-solar-system', text: '0.2' }, { type: 'reveal', id: 'tiny-solar-system' });
  assert.equal(tiny(small).error.code, 'too-small');
});

test('the Sun and unknown options are refused', () => {
  const s = run(start(), { type: 'open', id: 'gravity-lab' });
  assert.equal(run(s, { type: 'world', id: 'gravity-lab', worldId: 'sun' }), s);
  assert.equal(run(s, { type: 'predict', id: 'gravity-lab', optionId: 'maybe' }), s);
  assert.equal(run(s, { type: 'world', id: 'tiny-solar-system', worldId: 'mars' }), s, 'the tiny solar system has no planet choice');
  assert.equal(run(s, { type: 'open', id: 'not-an-experiment' }), s);
  assert.equal(gravity(run(s, { type: 'predict', id: 'gravity-lab', optionId: 'less' }, { type: 'predict', id: 'gravity-lab', optionId: null })).prediction, null, 'a guess can be taken back');
});

test('reset restores the starting values for that activity only', () => {
  let s = run(start(), { type: 'input', id: 'gravity-lab', text: '3' }, { type: 'world', id: 'gravity-lab', worldId: 'saturn' }, { type: 'reveal', id: 'gravity-lab' });
  s = run(s, { type: 'input', id: 'tiny-solar-system', text: '4' });
  s = run(s, { type: 'reset', id: 'gravity-lab' });
  assert.deepEqual(gravity(s), gravity(start()));
  assert.equal(tiny(s).text, '4', 'the other activity keeps its settings');
});

test('settings are kept when leaving and switching activities', () => {
  let s = run(start(), { type: 'open', id: 'tiny-solar-system' }, { type: 'input', id: 'tiny-solar-system', text: '2.5' }, { type: 'reveal', id: 'tiny-solar-system' });
  s = run(s, { type: 'open', id: null }, { type: 'open', id: 'gravity-lab' }, { type: 'open', id: 'tiny-solar-system' });
  assert.equal(tiny(s).text, '2.5');
  assert.deepEqual(tiny(s).revealed, { value: 2.5, worldId: null, prediction: null });
  assert.equal(experimentScreenKey(s), 'tiny-solar-system|result');
});

test('experiments, missions and quiz progress are independent', () => {
  const store = createExperimentStore(experiments);
  const missionStore = createMissionStore(missions);
  const quiz = createQuizStore(quizQuestions);
  missionStore.dispatch({ type: 'start', missionId: 'rocky-neighbours' });
  quiz.startRound();
  quiz.dispatch({ type: 'answer', answerId: currentQuestion(quiz.getState()).correctAnswerId });
  const missionBefore = missionStore.getState();
  const quizBefore = quiz.getState();
  store.dispatch({ type: 'open', id: 'gravity-lab' });
  store.dispatch({ type: 'reveal', id: 'gravity-lab' });
  store.dispatch({ type: 'reset', id: 'gravity-lab' });
  assert.equal(missionStore.getState(), missionBefore);
  assert.equal(quiz.getState(), quizBefore);
  quiz.dispatch({ type: 'reset' });
  missionStore.dispatch({ type: 'restart', missionId: 'rocky-neighbours' });
  assert.equal(store.getState().activeId, 'gravity-lab');
});

test('the store only notifies real changes', () => {
  const store = createExperimentStore(experiments);
  const seen = [];
  store.subscribe((state, previous, action) => seen.push(action.type));
  store.dispatch({ type: 'open', id: 'gravity-lab' });
  store.dispatch({ type: 'open', id: 'gravity-lab' });
  store.dispatch({ type: 'input', id: 'gravity-lab', text: '10' });
  store.dispatch({ type: 'reveal', id: 'gravity-lab' });
  assert.deepEqual(seen, ['open', 'reveal']);
});
