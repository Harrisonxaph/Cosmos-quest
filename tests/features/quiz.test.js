import { test } from 'node:test';
import assert from 'node:assert/strict';
import questions from '../../src/data/quiz.json' with { type: 'json' };
import { mulberry32 } from '../../src/scenes/proceduralTextures.js';
import {
  ROUND_SIZE, shuffle, pickQuestions, createRound, initialQuizState, reduceQuiz, createQuizStore,
  currentQuestion, lastResponse, score, isInProgress, progressLabel, feedbackHeading, resultMessage,
} from '../../src/features/quiz.js';

const seeded = seed => mulberry32(seed);
const ids = list => list.map(q => q.id);
const correctId = q => q.correctAnswerId;
const wrongId = q => q.answers.find(a => a.id !== q.correctAnswerId).id;

function playRound(state, chooseCorrect) {
  let s = state;
  for (let i = 0; i < s.questions.length; i++) {
    const q = currentQuestion(s);
    s = reduceQuiz(s, { type: 'answer', answerId: chooseCorrect(i) ? correctId(q) : wrongId(q) });
    s = reduceQuiz(s, { type: 'next' });
  }
  return s;
}

test('shuffle keeps every item and does not change the original', () => {
  const list = [1, 2, 3, 4, 5];
  const shuffled = shuffle(list, seeded(1));
  assert.deepEqual([...shuffled].sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5]);
});

test('a round has five different questions, each from a different world', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const round = pickQuestions(questions, { random: seeded(seed) });
    assert.equal(round.length, ROUND_SIZE);
    assert.equal(new Set(ids(round)).size, ROUND_SIZE, `seed ${seed}: repeated question`);
    assert.equal(new Set(round.map(q => q.planetId)).size, ROUND_SIZE, `seed ${seed}: repeated world`);
  }
});

test('rounds never repeat a question even when the pool is tiny', () => {
  const small = questions.filter(q => q.planetId === 'mars' || q.planetId === 'venus');
  const round = pickQuestions(small, { random: seeded(3) });
  assert.equal(new Set(ids(round)).size, ROUND_SIZE);
  assert.throws(() => pickQuestions(questions.slice(0, 4)), /at least 5/);
});

test('recently seen questions are avoided while fresh ones remain', () => {
  const first = pickQuestions(questions, { random: seeded(7) });
  const second = pickQuestions(questions, { random: seeded(8), avoidIds: ids(first) });
  assert.equal(ids(second).filter(id => ids(first).includes(id)).length, 0);
});

test('shuffling answers never changes which answer is correct', () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const q of createRound(questions, { random: seeded(seed) })) {
      const original = questions.find(item => item.id === q.id);
      assert.deepEqual([...q.answers].sort((a, b) => a.id.localeCompare(b.id)), [...original.answers].sort((a, b) => a.id.localeCompare(b.id)));
      assert.equal(q.correctAnswerId, original.correctAnswerId);
      const state = reduceQuiz(reduceQuiz(initialQuizState(), { type: 'start', questions: [q, ...questions.filter(x => x.id !== q.id).slice(0, 4)] }), { type: 'answer', answerId: original.correctAnswerId });
      assert.equal(lastResponse(state).correct, true);
    }
  }
});

test('answering, feedback, next and results', () => {
  const round = createRound(questions, { random: seeded(11) });
  let state = reduceQuiz(initialQuizState(), { type: 'start', questions: round });
  assert.equal(state.status, 'question');
  assert.equal(progressLabel(state), 'Question 1 of 5');
  assert.ok(isInProgress(state));
  state = reduceQuiz(state, { type: 'answer', answerId: correctId(round[0]) });
  assert.equal(state.status, 'feedback');
  assert.deepEqual(lastResponse(state), { questionId: round[0].id, answerId: round[0].correctAnswerId, correct: true });
  state = reduceQuiz(state, { type: 'next' });
  assert.equal(progressLabel(state), 'Question 2 of 5');
  assert.equal(currentQuestion(state).id, round[1].id);
});

test('a second answer, an unknown answer, or skipping ahead is ignored', () => {
  const round = createRound(questions, { random: seeded(12) });
  const start = reduceQuiz(initialQuizState(), { type: 'start', questions: round });
  assert.equal(reduceQuiz(start, { type: 'answer', answerId: 'not-an-answer' }), start);
  assert.equal(reduceQuiz(start, { type: 'next' }), start, 'cannot skip a question without answering');
  const answered = reduceQuiz(start, { type: 'answer', answerId: wrongId(round[0]) });
  assert.equal(reduceQuiz(answered, { type: 'answer', answerId: correctId(round[0]) }), answered, 'first answer counts');
  assert.equal(score(answered), 0);
});

test('scoring counts correct answers only, with no penalty for wrong ones', () => {
  const round = createRound(questions, { random: seeded(13) });
  const start = reduceQuiz(initialQuizState(), { type: 'start', questions: round });
  const all = playRound(start, () => true);
  assert.equal(all.status, 'results');
  assert.equal(score(all), 5);
  assert.equal(score(playRound(start, () => false)), 0);
  assert.equal(score(playRound(start, i => i % 2 === 0)), 3);
  assert.equal(currentQuestion(all), null);
  assert.equal(isInProgress(all), false);
});

test('a round cannot be started with a repeated question', () => {
  const q = questions[0];
  assert.throws(() => reduceQuiz(initialQuizState(), { type: 'start', questions: [q, q, questions[1], questions[2], questions[3]] }), /repeat/);
});

test('reset clears the round but remembers which questions were seen', () => {
  const round = createRound(questions, { random: seeded(14) });
  const finished = playRound(reduceQuiz(initialQuizState(), { type: 'start', questions: round }), () => true);
  const reset = reduceQuiz(finished, { type: 'reset' });
  assert.equal(reset.status, 'idle');
  assert.deepEqual(reset.questions, []);
  assert.deepEqual(reset.responses, []);
  assert.deepEqual([...reset.seenIds].sort(), ids(round).sort());
});

test('play again starts fresh at question 1 with new questions while fresh ones remain', () => {
  const store = createQuizStore(questions, { random: seeded(21) });
  const seen = new Set();
  for (let round = 0; round < Math.floor(questions.length / ROUND_SIZE); round++) {
    const state = store.startRound();
    assert.equal(state.status, 'question');
    assert.equal(state.index, 0);
    assert.deepEqual(state.responses, []);
    for (const id of ids(state.questions)) {
      assert.ok(!seen.has(id), `round ${round + 1} repeated ${id}`);
      seen.add(id);
    }
  }
  // Once fresh questions run low, the next round still avoids the round just played.
  const previous = ids(store.getState().questions);
  const next = store.startRound();
  assert.equal(ids(next.questions).filter(id => previous.includes(id)).length, 0);
});

test('the store notifies listeners and supports unsubscribing', () => {
  const store = createQuizStore(questions, { random: seeded(22) });
  const statuses = [];
  const unsubscribe = store.subscribe(state => statuses.push(state.status));
  store.startRound();
  store.dispatch({ type: 'answer', answerId: correctId(currentQuestion(store.getState())) });
  store.dispatch({ type: 'answer', answerId: 'ignored' });
  unsubscribe();
  store.dispatch({ type: 'next' });
  assert.deepEqual(statuses, ['question', 'feedback']);
});

test('feedback and results are always encouraging', () => {
  for (let i = 0; i < 10; i++) {
    assert.doesNotMatch(feedbackHeading(false, i), /wrong|incorrect|bad|fail/i);
    assert.match(feedbackHeading(true, i), /!$/);
  }
  for (let points = 0; points <= 5; points++) {
    const message = resultMessage(points, 5);
    assert.ok(message.length > 10);
    assert.doesNotMatch(message, /wrong|bad|fail|poor|only/i);
  }
  assert.match(resultMessage(5, 5), /perfect/i);
});
