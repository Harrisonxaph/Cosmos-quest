// Shared mission validation used by missions.test.js against the real missions (expecting no problems)
// and against deliberately broken copies (expecting problems). Correct answers are compared with the
// independent answer key AND with values worked out from the data, never only with missions.json.
import { MISSION_ANSWER_KEY } from './mission-answer-key.js';
import { trueScaleModel, SCALE_CHANGES, SCALE_INTRO, SCALE_MEASUREMENTS_NOTE } from '../../src/utils/scale.js';

const MODEL_TEXT = [SCALE_INTRO, SCALE_MEASUREMENTS_NOTE, ...SCALE_CHANGES].join(' ');

/** True-scale values exactly as the overview's "The real size of space" works them out. */
export function trueScaleValues(bodies, earth) {
  const model = Object.fromEntries(trueScaleModel(bodies, earth, 1).map(entry => [entry.id, entry]));
  return {
    sunWidthM: model.sun.diameterCm / 100,
    earthDistanceM: model.earth.distanceM,
    neptuneDistanceKm: model.neptune.distanceM / 1000,
  };
}

const numbersIn = text => (text.match(/\d+(\.\d+)?/g) ?? []).map(Number);
const roundTo = (value, step) => Math.round(value / step) * step;

export function stepProblems(mission, step, { bodiesById, planets, earth }) {
  const where = `${mission.id}/${step.id}`;
  const problems = [];
  const key = MISSION_ANSWER_KEY[mission.id]?.[step.id];
  if (!key) problems.push(`${where}: missing from the independent answer key`);
  const { basis } = step;

  if (step.type === 'find') {
    if (key && !step.reveal.includes(key.learn)) problems.push(`${where}: reveal does not teach "${key.learn}"`);
    if (basis.kind === 'fact') {
      const fact = bodiesById[basis.worldId].facts.find(f => f.text === basis.text);
      if (!fact) problems.push(`${where}: fact not shown on ${basis.worldId}`);
      else if (!step.sourceIds.includes(fact.sourceId)) problems.push(`${where}: must cite ${fact.sourceId}`);
      if (!step.reveal.includes(basis.text)) problems.push(`${where}: reveal must state the fact`);
      if (step.target !== basis.worldId) problems.push(`${where}: target ${step.target} is not where the fact is`);
    } else if (basis.kind === 'text') {
      const body = bodiesById[basis.worldId];
      const block = body[basis.field];
      if (!`${block.simple} ${block.detailed}`.includes(basis.contains)) problems.push(`${where}: "${basis.contains}" not in ${basis.worldId} ${basis.field}`);
      if (!step.reveal.includes(basis.contains)) problems.push(`${where}: reveal must include "${basis.contains}"`);
      if (!block.sourceIds.some(id => step.sourceIds.includes(id))) problems.push(`${where}: must cite a ${basis.field} source`);
      if (step.target !== basis.worldId) problems.push(`${where}: target ${step.target} is not where the text is`);
      const kindWords = { 'gas-giant': 'gas giant', 'ice-giant': 'ice giant', 'rocky-planet': 'rocky planet' };
      for (const [kind, words] of Object.entries(kindWords)) {
        if (step.reveal.toLowerCase().includes(words) && body.kind !== kind) problems.push(`${where}: calls ${body.name} a ${words}, but it is a ${body.kind}`);
      }
    } else if (basis.kind === 'model') {
      if (!MODEL_TEXT.includes(basis.contains)) problems.push(`${where}: "${basis.contains}" is not something the app says`);
      if (step.target !== 'overview') problems.push(`${where}: model notes are on the overview`);
    } else {
      problems.push(`${where}: unsupported basis for a find step: ${basis.kind}`);
    }
    return problems;
  }

  // Question steps
  const correct = step.answers.find(a => a.id === step.correctAnswerId);
  if (!correct) return [...problems, `${where}: correct answer id does not match an answer`];
  const wrong = step.answers.filter(a => a !== correct);
  if (key && correct.text !== key.answer) problems.push(`${where}: marks "${correct.text}" correct, but the answer key says "${key.answer}"`);

  const worldAnswer = answer => bodiesById[answer.id];
  switch (basis.kind) {
    case 'text': {
      const body = bodiesById[basis.worldId];
      if (!`${body[basis.field].simple} ${body[basis.field].detailed}`.includes(basis.contains)) problems.push(`${where}: "${basis.contains}" not in ${body.name}`);
      if (correct.id !== basis.worldId) problems.push(`${where}: the supporting text is about ${body.name}, not ${correct.text}`);
      break;
    }
    case 'worldKind': {
      const actual = bodiesById[basis.worldId].kind;
      if (correct.id !== actual) problems.push(`${where}: ${basis.worldId} is a ${actual}, not ${correct.id}`);
      break;
    }
    case 'kindMatch': {
      const matching = step.answers.filter(a => worldAnswer(a)?.kind === basis.value);
      if (matching.length !== 1 || matching[0] !== correct) problems.push(`${where}: the ${basis.value} among the answers is ${matching.map(a => a.text).join(', ') || 'none'}`);
      break;
    }
    case 'noSolidSurface': {
      const solid = basis.worldIds.filter(id => bodiesById[id].hasSolidSurface);
      if (solid.length) problems.push(`${where}: ${solid.join(', ')} has a solid surface`);
      if (!/\b(no|none)\b/i.test(correct.text)) problems.push(`${where}: the correct answer must say none can be stood on`);
      for (const answer of wrong) if (/^\s*no\b/i.test(answer.text)) problems.push(`${where}: wrong answer "${answer.text}" also says no`);
      break;
    }
    case 'order': {
      const planet = planets.find(p => p.orderFromSun === basis.position);
      const byDistance = [...planets].sort((a, b) => a.measurements.meanDistanceFromSunE6Km - b.measurements.meanDistanceFromSunE6Km);
      if (byDistance[basis.position - 1].id !== planet.id) problems.push(`${where}: orderFromSun disagrees with distances`);
      if (correct.id !== planet.id) problems.push(`${where}: planet ${basis.position} is ${planet.name}, not ${correct.text}`);
      break;
    }
    case 'trueScale': {
      const values = trueScaleValues(Object.values(bodiesById), earth);
      const expected = { sunWidthM: roundTo(values.sunWidthM, 0.1), earthDistanceM: Math.round(values.earthDistanceM), neptuneDistanceKm: roundTo(values.neptuneDistanceKm, 0.1) }[basis.quantity];
      const states = answer => numbersIn(answer.text).some(n => Math.abs(n - expected) < 1e-9);
      if (!states(correct)) problems.push(`${where}: correct answer should state ${expected} (from the true-scale model)`);
      for (const answer of wrong) if (states(answer)) problems.push(`${where}: wrong answer "${answer.text}" states the true value`);
      break;
    }
    case 'model':
      if (!MODEL_TEXT.includes(basis.contains)) problems.push(`${where}: "${basis.contains}" is not something the app says`);
      break;
    default:
      problems.push(`${where}: unsupported basis ${basis.kind}`);
  }
  return problems;
}
