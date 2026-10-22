// Planet Quiz state and scoring. No DOM here: the quiz panel renders whatever this state says.
// Correctness is decided by stable answer ids, so shuffling the answers can never change it.

export const ROUND_SIZE = 5;

/** Fisher–Yates shuffle into a new array. `random` returns a number in [0, 1). */
export function shuffle(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Choose questions for a round: never the same question twice, preferring questions not seen
 * recently (`avoidIds`) and then a different world for each question.
 */
export function pickQuestions(pool, { size = ROUND_SIZE, random = Math.random, avoidIds = [] } = {}) {
  if (pool.length < size) throw new Error(`Need at least ${size} questions, got ${pool.length}`);
  const avoid = new Set(avoidIds);
  const fresh = shuffle(pool.filter(q => !avoid.has(q.id)), random);
  const seen = shuffle(pool.filter(q => avoid.has(q.id)), random);
  const chosen = [];
  const worlds = new Set();
  const take = (candidates, distinctWorlds) => {
    for (const q of candidates) {
      if (chosen.length === size) return;
      if (chosen.includes(q) || (distinctWorlds && worlds.has(q.planetId))) continue;
      chosen.push(q);
      worlds.add(q.planetId);
    }
  };
  take(fresh, true);
  take(fresh, false);
  take(seen, true);
  take(seen, false);
  return chosen;
}

/** A round: chosen questions with their answers shuffled. */
export function createRound(pool, options = {}) {
  const random = options.random ?? Math.random;
  return pickQuestions(pool, { ...options, random }).map(q => ({ ...q, answers: shuffle(q.answers, random) }));
}

export function initialQuizState() {
  return { status: 'idle', questions: [], index: 0, responses: [], seenIds: [] };
}

/**
 * Pure transition function.
 * status: 'idle' → 'question' → 'feedback' → ('question' … | 'results'); 'reset' returns to 'idle'.
 */
export function reduceQuiz(state, action) {
  switch (action.type) {
    case 'start': {
      const ids = action.questions.map(q => q.id);
      if (new Set(ids).size !== ids.length) throw new Error('A round cannot repeat a question');
      return {
        status: 'question',
        questions: action.questions,
        index: 0,
        responses: [],
        seenIds: [...new Set([...state.seenIds, ...ids])],
      };
    }
    case 'answer': {
      if (state.status !== 'question') return state;
      const question = state.questions[state.index];
      if (!question.answers.some(answer => answer.id === action.answerId)) return state;
      const response = { questionId: question.id, answerId: action.answerId, correct: action.answerId === question.correctAnswerId };
      return { ...state, status: 'feedback', responses: [...state.responses, response] };
    }
    case 'next':
      if (state.status !== 'feedback') return state;
      if (state.index + 1 >= state.questions.length) return { ...state, status: 'results' };
      return { ...state, status: 'question', index: state.index + 1 };
    case 'reset':
      return { ...initialQuizState(), seenIds: state.seenIds };
    default:
      return state;
  }
}

export const currentQuestion = state => (state.status === 'question' || state.status === 'feedback' ? state.questions[state.index] : null);
export const lastResponse = state => (state.status === 'feedback' ? state.responses.at(-1) : null);
export const score = state => state.responses.filter(response => response.correct).length;
export const isInProgress = state => state.status === 'question' || state.status === 'feedback';
export const progress = state => ({ number: state.index + 1, total: state.questions.length });
export const progressLabel = state => `Question ${state.index + 1} of ${state.questions.length}`;

const CORRECT_HEADINGS = ['Brilliant!', 'Spot on!', 'You got it!', 'Fantastic!', 'Well done!'];
const TRY_HEADINGS = ['Good try!', 'Nice thinking!', 'Keep going!'];

/** Friendly feedback heading. Wrong answers are never called wrong: the explanation teaches instead. */
export function feedbackHeading(correct, index) {
  return correct ? CORRECT_HEADINGS[index % CORRECT_HEADINGS.length] : TRY_HEADINGS[index % TRY_HEADINGS.length];
}

/**
 * What assistive technology hears after an answer. `heading` is visible; `status` is added to the
 * heading's accessible name so correctness and the correct answer are announced together on focus;
 * `explanation` is announced through the page's live region straight afterwards.
 */
export function feedbackAnnouncement(question, response, index) {
  const chosen = question.answers.find(answer => answer.id === response.answerId);
  const correct = question.answers.find(answer => answer.id === question.correctAnswerId);
  const status = response.correct
    ? `You chose ${chosen.text}. That is correct.`
    : `You chose ${chosen.text}. The correct answer is ${correct.text}.`;
  return { heading: feedbackHeading(response.correct, index), status, explanation: question.explanation };
}

/** Encouraging end-of-round message for any score. */
export function resultMessage(points, total) {
  if (points === total) return 'A perfect score! You’re a true space explorer.';
  if (points >= Math.ceil(total / 2)) return 'Great exploring! You really know your planets.';
  return 'Every explorer learns something new. Visit a few worlds and try again whenever you like!';
}

/** Small store so the panel and the rest of the app can react to the same quiz state. */
export function createQuizStore(pool, { random = Math.random, size = ROUND_SIZE } = {}) {
  let state = initialQuizState();
  const listeners = new Set();
  const dispatch = action => {
    const previous = state;
    state = reduceQuiz(state, action);
    if (state !== previous) for (const listener of listeners) listener(state, previous, action);
    return state;
  };
  return {
    getState: () => state,
    dispatch,
    /** Start a new round, avoiding questions seen this visit while enough fresh ones remain. */
    startRound() {
      const fresh = pool.filter(q => !state.seenIds.includes(q.id)).length;
      const avoidIds = fresh >= size ? state.seenIds : state.questions.map(q => q.id);
      return dispatch({ type: 'start', questions: createRound(pool, { random, size, avoidIds }) });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
