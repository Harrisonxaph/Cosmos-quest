// Shared quiz validation used by quiz.test.js: once against the real questions (expecting no problems)
// and again against deliberately broken copies (expecting problems), so we know every check bites.
import { ANSWER_KEY } from './quiz-answer-key.js';

const STOPWORDS = new Set(['about', 'with', 'that', 'this', 'from', 'only', 'have', 'into', 'than', 'they', 'their', 'there', 'which', 'what', 'planet', 'planets']);
const words = text => (text.toLowerCase().match(/[a-z0-9%.]+/g) ?? []).map(w => w.replace(/\.$/, '')).filter(w => w.length >= 4 && !STOPWORDS.has(w));

/** All the text the app shows for a body, so evidence can be found wherever the panel shows it. */
function bodyText(body) {
  return [
    body.summary.simple, body.summary.detailed,
    body.composition.simple, body.composition.detailed,
    body.temperatureContext.simple, body.temperatureContext.detailed,
    body.moons.note ?? '',
    ...body.facts.map(fact => fact.text),
  ].join(' ');
}

function rankWinner(planets, field, order) {
  const ranked = [...planets].sort((a, b) => a.measurements[field] - b.measurements[field]);
  return order === 'min' ? ranked[0] : ranked.at(-1);
}

/**
 * Returns a list of problems for one question. Each check compares the designated correct answer
 * against something independent of it: the hand-written answer key, the measured data, or a ranking.
 */
export function answerProblems(question, { bodiesById, planets }) {
  const problems = [];
  const body = bodiesById[question.planetId];
  const correct = question.answers.find(answer => answer.id === question.correctAnswerId);
  const wrong = question.answers.filter(answer => answer.id !== question.correctAnswerId);
  if (!correct) return [`${question.id}: correct answer id does not match an answer`];

  // 1. Independent answer key.
  const key = ANSWER_KEY[question.id];
  if (!key) {
    problems.push(`${question.id}: missing from the independent answer key`);
  } else {
    if (correct.text !== key.answer) problems.push(`${question.id}: marks "${correct.text}" correct, but the answer key says "${key.answer}"`);
    if (typeof key.evidence === 'string' && !bodyText(body).toLowerCase().includes(key.evidence.toLowerCase())) {
      problems.push(`${question.id}: the app does not show the key's evidence "${key.evidence}"`);
    }
    if (key.evidence?.value !== undefined && body.measurements[key.evidence.field] !== key.evidence.value) {
      problems.push(`${question.id}: ${key.evidence.field} is ${body.measurements[key.evidence.field]}, not ${key.evidence.value}`);
    }
    if (key.evidence?.order && rankWinner(planets, key.evidence.field, key.evidence.order).name !== key.answer) {
      problems.push(`${question.id}: the ${key.evidence.order} ${key.evidence.field} is not ${key.answer}`);
    }
  }

  // 2. Agreement with the question's own basis, worked out from the data.
  const { basis } = question;
  if (basis.kind === 'rank') {
    const winner = rankWinner(planets, basis.field, basis.order);
    if (correct.id !== winner.id || correct.text !== winner.name) problems.push(`${question.id}: the ${basis.order} ${basis.field} is ${winner.name}, not ${correct.text}`);
  } else if (basis.kind === 'measurement') {
    const value = String(body.measurements[basis.field]);
    const mentions = answer => new RegExp(`(^|\\D)${value.replace('.', '\\.')}(\\D|$)`).test(answer.text);
    if (!mentions(correct)) problems.push(`${question.id}: correct answer does not state the measured ${basis.field} (${value})`);
    for (const answer of wrong) if (mentions(answer)) problems.push(`${question.id}: wrong answer "${answer.text}" states the measured value`);
  } else {
    const support = basis.kind === 'fact' ? basis.text : `${body[basis.field].simple} ${body[basis.field].detailed}`;
    // Compare simple stems (first five letters) so "predict" matches "predictions".
    const stem = w => w.slice(0, 5);
    const supportWords = new Set(words(support).map(stem));
    const correctWords = words(correct.text).map(stem);
    // Single-word answers that are world names are checked through the fact text itself.
    if (correctWords.length && !correctWords.some(w => supportWords.has(w)) && !support.toLowerCase().includes(correct.text.toLowerCase())) {
      problems.push(`${question.id}: correct answer "${correct.text}" shares nothing with its supporting text`);
    }
  }

  // 3. The explanation must teach the correct answer, not a wrong one.
  const explanation = question.explanation.toLowerCase();
  const keyTerms = words(correct.text);
  if (keyTerms.length && !keyTerms.some(w => explanation.includes(w)) && !explanation.includes(correct.text.toLowerCase())) {
    problems.push(`${question.id}: explanation never mentions the correct answer "${correct.text}"`);
  }
  return problems;
}
