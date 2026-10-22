// Planet Quiz panel. Renders the quiz state from features/quiz.js; holds no state of its own.
// Each screen marks one element with data-focus-target so the app can move keyboard and
// screen-reader focus to it (the new question, the feedback, or the results).
import { el } from './dom.js';
import { currentQuestion, lastResponse, progressLabel, score, feedbackAnnouncement, resultMessage, ROUND_SIZE } from '../features/quiz.js';

const worldName = body => (body.kind === 'star' ? 'the Sun' : body.name);
const capitalise = text => text[0].toUpperCase() + text.slice(1);

function focusHeading(level, attributes, ...children) {
  return el(level, { tabindex: '-1', 'data-focus-target': '', ...attributes }, ...children);
}

function sourceLinks(question, sourcesById) {
  const links = question.sourceIds.map(id => sourcesById[id]).filter(Boolean)
    .map(source => el('a', { href: source.url, target: '_blank', rel: 'noopener' }, source.title));
  return el('p', { className: 'quiz-source' }, links.length > 1 ? 'Sources: ' : 'Source: ', links.flatMap((link, i) => (i ? [', ', link] : [link])));
}

function idleScreen({ onStart }) {
  return [
    el('header', { className: 'panel__header' },
      focusHeading('h2', { id: 'quiz-title' }, 'Planet Quiz'),
      el('p', { className: 'panel__kind' }, 'How much do you remember?')),
    el('p', { className: 'panel__intro' }, `Answer ${ROUND_SIZE} questions about the Sun and the planets. Each question has three answers to choose from.`),
    el('ul', { className: 'quiz-rules' },
      el('li', {}, 'There is no timer, so take your time.'),
      el('li', {}, 'After each answer you’ll find out more and can explore that world.'),
      el('li', {}, 'Your progress is kept while you explore, but only for this visit.')),
    el('button', { type: 'button', className: 'primary-button', 'data-quiz-action': 'start', onClick: onStart }, 'Start the quiz'),
  ];
}

function questionHeading(state, question, focusable) {
  const children = [el('span', { className: 'quiz-progress' }, progressLabel(state)), ' ', el('span', { className: 'quiz-question' }, question.question)];
  return focusable ? focusHeading('h2', { id: 'quiz-title' }, ...children) : el('h2', { id: 'quiz-title' }, ...children);
}

function progressSteps(state) {
  return el('ol', { className: 'quiz-steps', 'aria-hidden': 'true' },
    state.questions.map((_, i) => el('li', { className: i < state.index ? 'is-done' : i === state.index ? 'is-current' : '' })));
}

function questionScreen(state, { onAnswer, onLeave }) {
  const question = currentQuestion(state);
  return [
    progressSteps(state),
    questionHeading(state, question, true),
    el('ul', { className: 'quiz-answers', 'aria-labelledby': 'quiz-title' },
      question.answers.map(answer => el('li', {},
        el('button', { type: 'button', className: 'quiz-answer', 'data-answer': answer.id, onClick: () => onAnswer(answer.id) }, answer.text)))),
    // A visible way out, so a child can look something up before answering (Escape does the same).
    el('div', { className: 'quiz-actions quiz-actions--leave' },
      el('button', { type: 'button', className: 'secondary-button', 'data-quiz-action': 'leave', 'aria-describedby': 'quiz-leave-hint', onClick: onLeave }, 'Back to exploring'),
      el('p', { id: 'quiz-leave-hint', className: 'quiz-hint' }, 'Your place in the quiz is saved, so you can look something up and come back.')),
  ];
}

function feedbackScreen(state, { bodiesById, sourcesById, onNext, onExplore }) {
  const question = currentQuestion(state);
  const response = lastResponse(state);
  const correctAnswer = question.answers.find(answer => answer.id === question.correctAnswerId);
  const body = bodiesById[question.planetId];
  const isLast = state.index + 1 >= state.questions.length;
  const announcement = feedbackAnnouncement(question, response, state.index);
  return [
    progressSteps(state),
    questionHeading(state, question, false),
    el('ul', { className: 'quiz-answers quiz-answers--answered' },
      question.answers.map(answer => {
        const isCorrect = answer.id === question.correctAnswerId;
        const isChosen = answer.id === response.answerId;
        const label = isCorrect && isChosen ? '✓ Your answer is correct' : isCorrect ? '✓ Correct answer' : isChosen ? 'Your answer' : null;
        return el('li', {
          className: `quiz-result${isCorrect ? ' is-correct' : ''}${isChosen ? ' is-chosen' : ''}`,
          'data-answer': answer.id,
        }, el('span', { className: 'quiz-result__text' }, answer.text), label ? el('span', { className: 'quiz-result__label' }, label) : null);
      })),
    el('div', { className: `quiz-feedback${response.correct ? ' is-correct' : ''}`, 'data-correct': String(response.correct) },
      // Focused after answering: its accessible name carries the verdict and the correct answer.
      focusHeading('h3', { id: 'quiz-feedback-title' }, announcement.heading, el('span', { className: 'visually-hidden' }, ` ${announcement.status}`)),
      // Shown for sighted readers; hidden from screen readers because the heading already says it.
      response.correct ? null : el('p', { className: 'quiz-feedback__answer', 'aria-hidden': 'true' }, 'The answer is: ', el('strong', {}, correctAnswer.text)),
      el('p', { id: 'quiz-explanation', className: 'quiz-feedback__explanation' }, question.explanation),
      sourceLinks(question, sourcesById)),
    el('div', { className: 'quiz-actions' },
      el('button', { type: 'button', className: 'primary-button', 'data-quiz-action': 'next', onClick: onNext }, isLast ? 'See my results' : 'Next question'),
      el('button', { type: 'button', className: 'secondary-button', 'data-quiz-action': 'explore', onClick: () => onExplore(question.planetId) }, `Explore ${worldName(body)}`)),
  ];
}

function resultsScreen(state, { onPlayAgain, onBackToExploring }) {
  const points = score(state);
  const total = state.questions.length;
  return [
    el('header', { className: 'panel__header' },
      focusHeading('h2', { id: 'quiz-title' }, `You got ${points} out of ${total}!`),
      el('p', { className: 'panel__kind' }, 'Planet Quiz results')),
    el('p', { className: 'panel__intro' }, resultMessage(points, total)),
    el('ol', { className: 'quiz-summary' },
      state.questions.map((question, i) => {
        const response = state.responses[i];
        const correctAnswer = question.answers.find(answer => answer.id === question.correctAnswerId);
        return el('li', { 'data-correct': String(response.correct) },
          el('span', { className: 'quiz-summary__question' }, question.question),
          el('span', { className: 'quiz-summary__outcome' }, response.correct ? `✓ You got it: ${correctAnswer.text}` : `The answer was: ${correctAnswer.text}`));
      })),
    el('div', { className: 'quiz-actions' },
      el('button', { type: 'button', className: 'primary-button', 'data-quiz-action': 'play-again', onClick: onPlayAgain }, 'Play again'),
      el('button', { type: 'button', className: 'secondary-button', 'data-quiz-action': 'back', onClick: onBackToExploring }, 'Back to exploring')),
  ];
}

export function renderQuizPanel(state, handlers) {
  const screens = { idle: idleScreen, question: questionScreen, feedback: feedbackScreen, results: resultsScreen };
  const content = state.status === 'idle' ? idleScreen(handlers) : screens[state.status](state, handlers);
  return el('article', { className: 'panel quiz', 'data-body': 'quiz', 'data-quiz-status': state.status, 'aria-labelledby': 'quiz-title' }, ...content);
}

/** Bar shown above the facts while a round is unfinished, so the child can carry on where they left off. */
export function renderQuizResume(state, onResume) {
  const where = state.status === 'results' ? 'see your results' : `carry on from ${progressLabel(state).toLowerCase()}`;
  return el('div', { className: 'quiz-resume', role: 'region', 'aria-label': 'Planet Quiz in progress' },
    el('p', {}, `Your Planet Quiz is waiting. You can ${where}.`),
    el('button', { type: 'button', className: 'primary-button', 'data-quiz-action': 'resume', onClick: onResume }, capitalise(state.status === 'results' ? 'Back to my results' : 'Back to the quiz')));
}
