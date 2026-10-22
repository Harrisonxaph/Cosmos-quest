import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import questions from '../../src/data/quiz.json' with { type: 'json' };
import schema from '../../src/data/quiz.schema.json' with { type: 'json' };
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import { bodySourceIds } from '../../src/utils/panelContent.js';
import { ROUND_SIZE } from '../../src/features/quiz.js';
import { ANSWER_KEY } from './quiz-answer-key.js';
import { answerProblems } from './quiz-checks.js';

const validate = new Ajv({ allErrors: true }).compile(schema);
const bodies = [sun, ...planets];
const bodiesById = Object.fromEntries(bodies.map(body => [body.id, body]));
const sourceIds = new Set(sources.map(source => source.id));
const correctText = q => q.answers.find(answer => answer.id === q.correctAnswerId)?.text;

test('every question is schema-valid', () => {
  assert.ok(validate(questions), JSON.stringify(validate.errors, null, 2));
});

test('every required field is enforced by the schema', () => {
  for (const field of schema.definitions.question.required) {
    const invalid = structuredClone(questions);
    delete invalid[0][field];
    assert.equal(validate(invalid), false, field);
  }
  for (const field of schema.definitions.answer.required) {
    const invalid = structuredClone(questions);
    delete invalid[0].answers[0][field];
    assert.equal(validate(invalid), false, `answers.${field}`);
  }
  const twoAnswers = structuredClone(questions);
  twoAnswers[0].answers.pop();
  assert.equal(validate(twoAnswers), false, 'exactly three answers');
  const fourAnswers = structuredClone(questions);
  fourAnswers[0].answers.push({ id: 'extra', text: 'Extra' });
  assert.equal(validate(fourAnswers), false, 'exactly three answers');
});

test('question ids and texts are unique, and answer ids and texts are unique within a question', () => {
  assert.equal(new Set(questions.map(q => q.id)).size, questions.length, 'duplicate question id');
  assert.equal(new Set(questions.map(q => q.question)).size, questions.length, 'duplicate question text');
  for (const q of questions) {
    assert.equal(new Set(q.answers.map(a => a.id)).size, 3, `${q.id} answer ids`);
    assert.equal(new Set(q.answers.map(a => a.text.toLowerCase())).size, 3, `${q.id} answer texts`);
  }
});

test('every correct answer refers to one of the question’s own answer ids', () => {
  for (const q of questions) {
    assert.equal(q.answers.filter(a => a.id === q.correctAnswerId).length, 1, q.id);
  }
});

test('the pool covers every world and is big enough for varied rounds', () => {
  for (const body of bodies) {
    assert.ok(questions.filter(q => q.planetId === body.id).length >= 2, `${body.id} needs at least two questions`);
  }
  assert.ok(questions.length >= ROUND_SIZE * 3, 'enough for three rounds without repeats');
});

test('every cited source exists and is already used by that world’s information panel', () => {
  for (const q of questions) {
    const panelSources = new Set(bodySourceIds(bodiesById[q.planetId]));
    for (const id of q.sourceIds) {
      assert.ok(sourceIds.has(id), `${q.id}: unknown source ${id}`);
      const usedSomewhere = bodies.some(body => bodySourceIds(body).includes(id));
      assert.ok(usedSomewhere, `${q.id}: ${id} is not used by any panel`);
    }
    assert.ok(q.sourceIds.some(id => panelSources.has(id)), `${q.id}: no source from ${q.planetId}'s panel`);
  }
});

test('each correct answer is supported by content the app already shows', () => {
  for (const q of questions) {
    const body = bodiesById[q.planetId];
    const { basis } = q;
    if (basis.kind === 'fact') {
      const fact = body.facts.find(f => f.text === basis.text);
      assert.ok(fact, `${q.id}: fact not found on ${body.name}`);
      assert.ok(q.sourceIds.includes(fact.sourceId), `${q.id}: must cite ${fact.sourceId}`);
    } else if (basis.kind === 'text') {
      const block = body[basis.field];
      assert.ok(block.simple.includes(basis.contains) || block.detailed.includes(basis.contains), `${q.id}: "${basis.contains}" not in ${basis.field}`);
      assert.ok(block.sourceIds.some(id => q.sourceIds.includes(id)), `${q.id}: must cite a ${basis.field} source`);
    } else if (basis.kind === 'measurement') {
      assert.equal(body.measurements[basis.field], basis.value, `${q.id}: ${basis.field}`);
      assert.ok(body.measurements.sourceIds.some(id => q.sourceIds.includes(id)), `${q.id}: must cite the fact sheet`);
    } else if (basis.kind === 'rank') {
      const ranked = [...planets].sort((a, b) => a.measurements[basis.field] - b.measurements[basis.field]);
      const winner = basis.order === 'min' ? ranked[0] : ranked.at(-1);
      assert.equal(q.planetId, winner.id, `${q.id}: ${basis.order} ${basis.field} is ${winner.id}`);
      assert.equal(q.correctAnswerId, winner.id, `${q.id}: correct answer`);
      for (const answer of q.answers) assert.ok(bodiesById[answer.id], `${q.id}: rank answers must be world ids`);
      assert.ok(q.sourceIds.includes('nasa-fact-sheet'), `${q.id}: must cite the fact sheet`);
    }
  }
});

test('questions whose answers are worlds use world ids, so the right world is credited', () => {
  for (const q of questions) {
    const names = q.answers.map(a => a.text);
    if (names.every(name => bodies.some(body => body.name === name))) {
      for (const answer of q.answers) assert.equal(bodiesById[answer.id]?.name, answer.text, `${q.id}: ${answer.id}`);
    }
  }
});

test('no questions about changing moon counts', () => {
  for (const q of questions) {
    assert.doesNotMatch(q.question, /how many (known )?moons|number of moons|moons does/i, q.id);
    for (const answer of q.answers) assert.doesNotMatch(answer.text, /^\d+( known)? moons?$/i, q.id);
  }
});

test('explanations and correct answers never give a gas world solid ground', () => {
  for (const q of questions.filter(item => !bodiesById[item.planetId].hasSolidSurface)) {
    for (const text of [q.explanation, correctText(q)]) {
      for (const match of text.matchAll(/surface|ground|land on|stand on/gi)) {
        const clause = text.slice(Math.max(0, match.index - 40), match.index).toLowerCase().split(/[.;!?]/).pop();
        assert.match(clause, /\b(no|not|never|without|nowhere)\b/, `${q.id}: "${text}"`);
      }
    }
  }
});

test('explanations restate the correct answer, so feedback teaches the fact', () => {
  for (const q of questions) {
    assert.ok(q.explanation.length > correctText(q).length, q.id);
    assert.ok(q.explanation.endsWith('.') || q.explanation.endsWith('!'), q.id);
  }
});

const context = { bodiesById, planets };
const withCorrect = (q, answerId) => ({ ...structuredClone(q), correctAnswerId: answerId });

test('the independent answer key covers exactly the questions in the quiz', () => {
  assert.deepEqual(Object.keys(ANSWER_KEY).sort(), questions.map(q => q.id).sort());
});

test('every designated answer agrees with the answer key, the data and its explanation', () => {
  for (const q of questions) assert.deepEqual(answerProblems(q, context), [], q.id);
});

for (const kind of ['fact', 'text', 'measurement', 'rank']) {
  test(`mutation: marking any wrong answer correct is caught (${kind} questions)`, () => {
    const ofKind = questions.filter(q => q.basis.kind === kind);
    assert.ok(ofKind.length > 0, `no ${kind} questions to mutate`);
    for (const q of ofKind) {
      for (const answer of q.answers.filter(a => a.id !== q.correctAnswerId)) {
        const problems = answerProblems(withCorrect(q, answer.id), context);
        assert.ok(problems.length > 0, `${q.id}: marking "${answer.text}" correct went unnoticed`);
      }
    }
  });
}

test('mutation: teaching oxygen as the main gas in Earth’s air is caught', () => {
  const earthAir = questions.find(q => q.id === 'earth-air');
  const problems = answerProblems(withCorrect(earthAir, 'oxygen'), context);
  assert.ok(problems.some(p => /answer key says "Nitrogen"/.test(p)), problems.join('\n'));
});

test('mutation: rewording the correct answer into a wrong one is caught', () => {
  for (const q of questions) {
    const mutated = structuredClone(q);
    const wrongText = q.answers.find(a => a.id !== q.correctAnswerId).text;
    const correct = mutated.answers.find(a => a.id === q.correctAnswerId);
    mutated.answers = mutated.answers.filter(a => a.text !== wrongText);
    correct.text = wrongText;
    mutated.answers.push({ id: 'replacement', text: `Not ${wrongText}` });
    assert.ok(answerProblems(mutated, context).length > 0, q.id);
  }
});

test('mutation: changed measurements or rankings in the data are caught', () => {
  const year = questions.find(q => q.id === 'mercury-year');
  const fastMercury = { ...bodiesById, mercury: { ...bodiesById.mercury, measurements: { ...bodiesById.mercury.measurements, orbitalPeriodDays: 90 } } };
  assert.ok(answerProblems(year, { bodiesById: fastMercury, planets }).length > 0, 'changed orbital period');
  const closest = questions.find(q => q.id === 'mercury-closest');
  const movedVenus = planets.map(p => (p.id === 'venus' ? { ...p, measurements: { ...p.measurements, meanDistanceFromSunE6Km: 10 } } : p));
  assert.ok(answerProblems(closest, { bodiesById, planets: movedVenus }).length > 0, 'changed ranking');
});

test('mutation: removing the supporting fact from the app is caught', () => {
  const earth = bodiesById.earth;
  const noAir = { ...bodiesById, earth: { ...earth, facts: earth.facts.filter(f => !/nitrogen/.test(f.text)), summary: { ...earth.summary, detailed: earth.summary.detailed.replace(/78% nitrogen/, 'mostly gas') } } };
  const problems = answerProblems(questions.find(q => q.id === 'earth-air'), { bodiesById: noAir, planets });
  assert.ok(problems.some(p => /evidence/.test(p)), problems.join('\n'));
});
