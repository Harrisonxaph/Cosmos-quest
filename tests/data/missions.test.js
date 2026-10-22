import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import missions from '../../src/data/missions.json' with { type: 'json' };
import schema from '../../src/data/missions.schema.json' with { type: 'json' };
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import { bodySourceIds } from '../../src/utils/panelContent.js';
import { MISSION_ANSWER_KEY } from './mission-answer-key.js';
import { stepProblems, trueScaleValues } from './mission-checks.js';

const validate = new Ajv({ allErrors: true }).compile(schema);
const bodies = [sun, ...planets];
const bodiesById = Object.fromEntries(bodies.map(body => [body.id, body]));
const earth = bodiesById.earth;
const context = { bodiesById, planets, earth };
const sourceIds = new Set(sources.map(source => source.id));
const allSteps = missions.flatMap(mission => mission.steps.map(step => ({ mission, step })));
const byId = id => missions.find(mission => mission.id === id);

test('missions are schema-valid', () => {
  assert.ok(validate(missions), JSON.stringify(validate.errors, null, 2));
});

test('required fields are enforced for missions and both step types', () => {
  for (const field of schema.definitions.mission.required) {
    const invalid = structuredClone(missions);
    delete invalid[0][field];
    assert.equal(validate(invalid), false, field);
  }
  for (const [definition, sample] of [['findStep', missions[0].steps[0]], ['questionStep', missions[0].steps[4]]]) {
    for (const field of schema.definitions[definition].required) {
      const invalid = structuredClone(missions);
      const step = invalid[0].steps.find(s => s.id === sample.id);
      delete step[field];
      assert.equal(validate(invalid), false, `${definition}.${field}`);
    }
  }
  const visitWithoutWorld = structuredClone(missions);
  delete visitWithoutWorld[1].steps.find(step => step.visitRequired).explore;
  assert.equal(validate(visitWithoutWorld), false, 'visitRequired needs a world to explore');
  const tooFew = structuredClone(missions);
  tooFew[0].steps = tooFew[0].steps.slice(0, 2);
  assert.equal(validate(tooFew), false, 'at least 3 steps');
  const tooMany = structuredClone(missions);
  tooMany[0].steps.push(structuredClone(tooMany[0].steps[0]));
  assert.equal(validate(tooMany), false, 'at most 5 steps');
});

test('the three agreed missions exist, with stable unique ids', () => {
  assert.deepEqual(missions.map(m => m.id), ['rocky-neighbours', 'giants-without-ground', 'understanding-space']);
  assert.deepEqual(missions.map(m => m.title), ['Meet our rocky neighbours', 'Giants without ground', 'Understanding space']);
  for (const mission of missions) {
    const ids = mission.steps.map(step => step.id);
    assert.equal(new Set(ids).size, ids.length, `${mission.id}: duplicate step id`);
    assert.ok(mission.steps.length >= 3 && mission.steps.length <= 5);
  }
});

test('every mission explores the worlds it promises', () => {
  const visits = id => byId(id).steps.flatMap(step => [step.target, step.explore]).filter(Boolean);
  for (const world of ['mercury', 'venus', 'earth', 'mars']) assert.ok(visits('rocky-neighbours').includes(world), world);
  for (const world of ['jupiter', 'saturn', 'uranus', 'neptune']) assert.ok(visits('giants-without-ground').includes(world), world);
  assert.ok(visits('understanding-space').includes('overview'), 'the true-scale comparisons live on the overview');
  // Every giant has to be explored: find steps by their target, question steps by a required visit.
  const required = byId('giants-without-ground').steps.map(step => (step.type === 'find' ? step.target : step.visitRequired ? step.explore : null)).filter(Boolean);
  assert.deepEqual([...required].sort(), ['jupiter', 'neptune', 'saturn', 'uranus']);
  assert.equal(byId('rocky-neighbours').steps.filter(s => s.type === 'find').length, 4, 'one sourced fact for each rocky planet');
  assert.equal(byId('rocky-neighbours').steps.at(-1).type, 'question', 'then a comparison question');
});

test('every mission has at least one task that needs a deliberate action', () => {
  for (const mission of missions) {
    for (const step of mission.steps) assert.ok(['find', 'question'].includes(step.type));
  }
});

test('every cited source exists and is already used by an information panel', () => {
  const panelSources = new Set(bodies.flatMap(body => bodySourceIds(body)));
  for (const { mission, step } of allSteps) {
    for (const id of step.sourceIds) {
      assert.ok(sourceIds.has(id), `${mission.id}/${step.id}: unknown source ${id}`);
      assert.ok(panelSources.has(id), `${mission.id}/${step.id}: ${id} is not used by any panel`);
    }
  }
});

test('step references point at real worlds and answers', () => {
  for (const { mission, step } of allSteps) {
    for (const target of [step.target, step.explore].filter(Boolean)) {
      assert.ok(target === 'overview' || bodiesById[target], `${mission.id}/${step.id}: unknown target ${target}`);
    }
    if (step.type === 'question') {
      assert.equal(new Set(step.answers.map(a => a.id)).size, 3, `${mission.id}/${step.id}: answer ids`);
      assert.equal(new Set(step.answers.map(a => a.text)).size, 3, `${mission.id}/${step.id}: answer texts`);
      assert.equal(step.answers.filter(a => a.id === step.correctAnswerId).length, 1, `${mission.id}/${step.id}: correct answer`);
    }
  }
});

test('the independent answer key covers exactly the mission steps', () => {
  for (const mission of missions) {
    assert.deepEqual(Object.keys(MISSION_ANSWER_KEY[mission.id] ?? {}).sort(), mission.steps.map(s => s.id).sort(), mission.id);
  }
  assert.deepEqual(Object.keys(MISSION_ANSWER_KEY).sort(), missions.map(m => m.id).sort());
});

test('every answer and every revealed fact agrees with the key and with the data', () => {
  for (const { mission, step } of allSteps) assert.deepEqual(stepProblems(mission, step, context), [], `${mission.id}/${step.id}`);
});

test('the true-scale answers match the overview’s own calculation', () => {
  const values = trueScaleValues(bodies, earth);
  assert.ok(Math.abs(values.sunWidthM - 1.0908) < 0.001);
  assert.ok(Math.abs(values.earthDistanceM - 117.28) < 0.01);
  assert.ok(Math.abs(values.neptuneDistanceKm - 3.5395) < 0.001);
});

for (const type of ['find', 'question']) {
  test(`mutation: broken ${type} steps are caught`, () => {
    for (const { mission, step } of allSteps.filter(item => item.step.type === type)) {
      if (type === 'question') {
        for (const answer of step.answers.filter(a => a.id !== step.correctAnswerId)) {
          const mutated = { ...structuredClone(step), correctAnswerId: answer.id };
          assert.ok(stepProblems(mission, mutated, context).length > 0, `${mission.id}/${step.id}: "${answer.text}" marked correct went unnoticed`);
        }
      } else {
        const swapped = allSteps.find(other => other.step.type === 'find' && other.step.id !== step.id).step;
        const mutated = { ...structuredClone(step), reveal: swapped.reveal };
        assert.ok(stepProblems(mission, mutated, context).length > 0, `${mission.id}/${step.id}: wrong reveal went unnoticed`);
      }
    }
  });
}

test('mutation: changed data behind an answer is caught', () => {
  const giants = byId('giants-without-ground');
  const saturnKind = giants.steps.find(s => s.id === 'saturn-kind');
  const icySaturn = { ...bodiesById, saturn: { ...bodiesById.saturn, kind: 'ice-giant' } };
  assert.ok(stepProblems(giants, saturnKind, { ...context, bodiesById: icySaturn }).length > 0, 'Saturn kind');

  const noGround = giants.steps.find(s => s.id === 'no-ground');
  const solidNeptune = { ...bodiesById, neptune: { ...bodiesById.neptune, hasSolidSurface: true } };
  assert.ok(stepProblems(giants, noGround, { ...context, bodiesById: solidNeptune }).length > 0, 'solid Neptune');

  const space = byId('understanding-space');
  const sunSize = space.steps.find(s => s.id === 'sun-size');
  const biggerSun = { ...bodiesById, sun: { ...bodiesById.sun, measurements: { ...bodiesById.sun.measurements, diameterKm: 2_000_000 } } };
  assert.ok(stepProblems(space, sunSize, { ...context, bodiesById: biggerSun }).length > 0, 'Sun size');

  const findJupiter = giants.steps.find(s => s.id === 'find-jupiter');
  const wrongKind = { ...structuredClone(findJupiter), reveal: findJupiter.reveal.replace('gas giant', 'ice giant') };
  assert.ok(stepProblems(giants, wrongKind, context).length > 0, 'Jupiter called an ice giant');
});

test('nothing gives a giant planet or the Sun solid ground', () => {
  const giantsMission = byId('giants-without-ground');
  for (const step of giantsMission.steps) {
    const texts = [step.task, step.type === 'find' ? step.reveal : step.explanation, step.type === 'question' ? step.answers.find(a => a.id === step.correctAnswerId).text : ''];
    for (const text of texts) {
      for (const match of text.matchAll(/surface|ground|land on|stand on/gi)) {
        const clause = text.slice(Math.max(0, match.index - 50), match.index).toLowerCase().split(/[.;!?]/).pop();
        assert.match(clause, /\b(no|none|not|never|without)\b|could you|anywhere to/, `${step.id}: "${text}"`);
      }
    }
  }
});

test('no new numbers are introduced beyond the app’s own data and comparisons', () => {
  // Every number either comes from data/comparisons the app already shows, or is a deliberate wrong-answer distractor.
  const fromApp = ['1', '1.1', '3.5', '40', '95', '100', '109', '117', '30'];
  const distractors = ['10', '11', '35'];
  const allowed = new Set([...fromApp, ...distractors]);
  for (const { mission, step } of allSteps) {
    const texts = [step.task, step.reveal, step.explanation, step.hint, step.question, ...(step.answers ?? []).map(a => a.text)].filter(Boolean);
    for (const number of texts.join(' ').match(/\d+(\.\d+)?(?![\dD])/g) ?? []) {
      assert.ok(allowed.has(number), `${mission.id}/${step.id}: unexpected number ${number}`);
    }
  }
});
