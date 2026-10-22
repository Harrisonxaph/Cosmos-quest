// Discovery Missions panel and the "mission in progress" bar. Renders state from features/missions.js.
// Each screen marks exactly one element with data-focus-target, so the app can move focus there.
import { el } from './dom.js';
import { missionStatus, missionProgress, stepLabel, completionCriteria, stepAnnouncement } from '../features/missions.js';

export function placeName(target, bodiesById) {
  if (target === 'overview') return 'the whole solar system view';
  const body = bodiesById[target];
  return body.kind === 'star' ? 'the Sun' : body.name;
}

function exploreLabel(target, bodiesById) {
  return target === 'overview' ? 'Explore the solar system view' : `Explore ${placeName(target, bodiesById)}`;
}

function focusHeading(level, attributes, ...children) {
  return el(level, { tabindex: '-1', 'data-focus-target': '', ...attributes }, ...children);
}

function sourceLinks(step, sourcesById) {
  const links = step.sourceIds.map(id => sourcesById[id]).filter(Boolean)
    .map(source => el('a', { href: source.url, target: '_blank', rel: 'noopener' }, source.title));
  return el('p', { className: 'quiz-source' }, links.length > 1 ? 'Sources: ' : 'Source: ', links.flatMap((link, i) => (i ? [', ', link] : [link])));
}

function stepList(mission, progress) {
  return el('ol', { className: 'mission-steps', 'aria-label': 'Mission steps' },
    mission.steps.map((step, i) => {
      const done = progress.steps[step.id].done;
      const current = progress.status === 'active' && i === progress.stepIndex;
      return el('li', { className: `mission-step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`, 'aria-current': current ? 'step' : null },
        el('span', { className: 'mission-step__title' }, step.title),
        done ? el('span', { className: 'mission-step__label' }, '✓ Done') : current ? el('span', { className: 'mission-step__label' }, 'You are here') : null);
    }));
}

function leaveActions(handlers) {
  return el('div', { className: 'quiz-actions quiz-actions--leave' },
    el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'leave', 'aria-describedby': 'mission-leave-hint', onClick: handlers.onLeave }, 'Back to exploring'),
    el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'list', onClick: () => handlers.onOpen(null) }, 'All missions'),
    el('p', { id: 'mission-leave-hint', className: 'quiz-hint' }, 'Your progress is saved for this visit, so you can come back any time.'));
}

function listScreen(state, { missions, handlers }) {
  return [
    el('header', { className: 'panel__header' },
      focusHeading('h2', { id: 'missions-title' }, 'Discovery Missions'),
      el('p', { className: 'panel__kind' }, 'Explore with a purpose')),
    el('p', { className: 'panel__intro' }, 'Each mission takes you to a few worlds with something to discover. Take your time: there’s no timer, and you can leave and come back.'),
    el('ul', { className: 'mission-list' },
      missions.map(mission => {
        const status = missionStatus(state, mission.id);
        const progress = missionProgress(state, mission.id);
        const statusText = status === 'complete' ? '✓ Completed' : status === 'in-progress' ? `In progress: ${stepLabel(progress.stepIndex, mission.steps.length).toLowerCase()}` : `${mission.steps.length} steps`;
        const action = status === 'complete' ? 'Play again' : status === 'in-progress' ? 'Continue mission' : 'Start mission';
        return el('li', { className: 'mission-card', 'data-mission': mission.id },
          el('h3', {}, mission.title),
          el('p', {}, mission.summary),
          el('p', { className: 'mission-card__status' }, statusText),
          el('button', {
            type: 'button',
            className: 'primary-button',
            'data-mission-action': 'choose',
            onClick: () => (status === 'complete' ? handlers.onRestart(mission.id) : handlers.onOpen(mission.id)),
          }, action, el('span', { className: 'visually-hidden' }, `: ${mission.title}`)));
      })),
  ];
}

function introScreen(mission, progress, { handlers }) {
  return [
    el('header', { className: 'panel__header' },
      el('p', { className: 'quiz-progress' }, 'Discovery Mission'),
      focusHeading('h2', { id: 'missions-title' }, mission.title)),
    el('p', { className: 'panel__intro' }, mission.intro),
    el('h3', {}, `${mission.steps.length} steps`),
    stepList(mission, progress),
    el('div', { className: 'quiz-actions' },
      el('button', { type: 'button', className: 'primary-button', 'data-mission-action': 'start', onClick: () => handlers.onStart(mission.id) }, 'Start the mission'),
      el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'list', onClick: () => handlers.onOpen(null) }, 'All missions')),
  ];
}

function stepHeading(mission, progress, step, focusable) {
  const children = [el('span', { className: 'quiz-progress' }, `${mission.title} · ${stepLabel(progress.stepIndex, mission.steps.length)}`), ' ', el('span', { className: 'mission-step-title' }, step.title)];
  return focusable ? focusHeading('h2', { id: 'missions-title' }, ...children) : el('h2', { id: 'missions-title' }, ...children);
}

function feedbackBlock(step, stepProgress, progress, mission, extra) {
  const announcement = stepAnnouncement(step, stepProgress, progress.stepIndex, mission.steps.length);
  const positive = step.type === 'find' || stepProgress.last?.correct;
  return el('div', { className: `quiz-feedback${positive ? ' is-correct' : ''}`, 'data-correct': String(positive) },
    focusHeading('h3', { id: 'mission-feedback-title' }, announcement.heading, el('span', { className: 'visually-hidden' }, ` ${announcement.status}`)),
    el('p', { className: 'mission-feedback__detail' }, announcement.detail),
    ...extra);
}

function taskScreen(mission, progress, { bodiesById, handlers }) {
  const step = mission.steps[progress.stepIndex];
  const stepProgress = progress.steps[step.id];
  const triedWrong = step.type === 'question' && stepProgress.last && !stepProgress.last.correct;
  const content = [stepHeading(mission, progress, step, !triedWrong), stepList(mission, progress), el('p', { className: 'panel__intro' }, step.task)];

  if (step.type === 'find') {
    const place = placeName(step.target, bodiesById);
    content.push(el('p', { className: 'mission-criteria' }, completionCriteria(step, place)));
    if (stepProgress.visited) {
      content.push(
        el('p', { className: 'mission-visited' }, `✓ You’ve visited ${place}. Did you find ${step.lookFor}?`),
        el('div', { className: 'quiz-actions' },
          el('button', { type: 'button', className: 'primary-button', 'data-mission-action': 'found', onClick: () => handlers.onFound(mission.id) }, 'I’ve found it'),
          el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'explore', onClick: () => handlers.onExplore(step.target) }, `${exploreLabel(step.target, bodiesById)} again`)));
    } else {
      content.push(el('div', { className: 'quiz-actions' },
        el('button', { type: 'button', className: 'primary-button', 'data-mission-action': 'explore', onClick: () => handlers.onExplore(step.target) }, exploreLabel(step.target, bodiesById))));
    }
  } else {
    const place = step.explore ? placeName(step.explore, bodiesById) : null;
    const needsVisit = step.visitRequired && !stepProgress.visited;
    content.push(el('p', { className: 'mission-criteria' }, completionCriteria(step, place)));
    if (needsVisit) {
      // The answers appear after the world has been explored during this step.
      content.push(
        el('h3', { id: 'mission-question' }, step.question),
        el('p', { className: 'mission-locked' }, `Explore ${place} first. The answers appear when you come back.`),
        el('div', { className: 'quiz-actions' },
          el('button', { type: 'button', className: 'primary-button', 'data-mission-action': 'explore', onClick: () => handlers.onExplore(step.explore) }, exploreLabel(step.explore, bodiesById))));
    } else {
      content.push(
        step.visitRequired ? el('p', { className: 'mission-visited' }, `✓ You’ve visited ${place}.`) : null,
        triedWrong ? feedbackBlock(step, stepProgress, progress, mission, []) : null,
        el('h3', { id: 'mission-question', tabindex: '-1' }, step.question),
        el('ul', { className: 'quiz-answers', 'aria-labelledby': 'mission-question' },
          step.answers.map(answer => el('li', {},
            stepProgress.tried.includes(answer.id)
              ? el('div', { className: 'quiz-result is-chosen', 'data-answer': answer.id }, el('span', { className: 'quiz-result__text' }, answer.text), el('span', { className: 'quiz-result__label' }, 'You tried this'))
              : el('button', { type: 'button', className: 'quiz-answer', 'data-answer': answer.id, onClick: () => handlers.onAnswer(mission.id, answer.id) }, answer.text)))),
        step.explore ? el('div', { className: 'quiz-actions' },
          el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'explore', onClick: () => handlers.onExplore(step.explore) }, step.visitRequired ? `${exploreLabel(step.explore, bodiesById)} again` : exploreLabel(step.explore, bodiesById))) : null);
    }
  }
  content.push(leaveActions(handlers));
  return content;
}

function feedbackScreen(mission, progress, { sourcesById, handlers }) {
  const step = mission.steps[progress.stepIndex];
  const stepProgress = progress.steps[step.id];
  const isLast = progress.stepIndex + 1 >= mission.steps.length;
  const correctAnswer = step.type === 'question' ? step.answers.find(a => a.id === step.correctAnswerId) : null;
  return [
    stepHeading(mission, progress, step, false),
    stepList(mission, progress),
    correctAnswer ? el('p', { className: 'mission-answer', 'aria-hidden': 'true' }, '✓ ', el('strong', {}, correctAnswer.text)) : null,
    feedbackBlock(step, stepProgress, progress, mission, [sourceLinks(step, sourcesById)]),
    el('div', { className: 'quiz-actions' },
      el('button', { type: 'button', className: 'primary-button', 'data-mission-action': 'next', onClick: () => handlers.onNext(mission.id) }, isLast ? 'See my mission recap' : 'Next step')),
    leaveActions(handlers),
  ];
}

function recapScreen(mission, { handlers }) {
  return [
    el('header', { className: 'panel__header' },
      el('p', { className: 'quiz-progress' }, 'Mission complete'),
      focusHeading('h2', { id: 'missions-title' }, `You completed “${mission.title}”!`)),
    el('p', { className: 'panel__intro' }, mission.recap),
    el('h3', {}, 'What you discovered'),
    el('ol', { className: 'quiz-summary' }, mission.steps.map(step => el('li', {},
      el('span', { className: 'quiz-summary__question' }, step.title),
      el('span', { className: 'quiz-summary__outcome' }, step.type === 'find' ? step.reveal : step.explanation)))),
    el('div', { className: 'quiz-actions' },
      el('button', { type: 'button', className: 'primary-button', 'data-mission-action': 'restart', onClick: () => handlers.onRestart(mission.id) }, 'Play this mission again'),
      el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'list', onClick: () => handlers.onOpen(null) }, 'Choose another mission'),
      el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'explore-freely', onClick: handlers.onExploreFreely }, 'Explore freely')),
  ];
}

export function renderMissionsPanel(state, context) {
  const mission = context.missions.find(m => m.id === state.activeMissionId);
  const progress = mission ? missionProgress(state, mission.id) : null;
  let screen = 'list';
  let content;
  if (!mission) content = listScreen(state, context);
  else if (progress.status === 'intro') [screen, content] = ['intro', introScreen(mission, progress, context)];
  else if (progress.status === 'complete') [screen, content] = ['recap', recapScreen(mission, context)];
  else if (progress.phase === 'feedback') [screen, content] = ['feedback', feedbackScreen(mission, progress, context)];
  else [screen, content] = ['task', taskScreen(mission, progress, context)];
  return el('article', { className: 'panel quiz missions', 'data-body': 'missions', 'data-mission-screen': screen, 'data-mission': mission?.id ?? '', 'aria-labelledby': 'missions-title' }, ...content);
}

/**
 * Bar shown on world and overview panels while a mission is unfinished. On the world the current
 * step asks for, after it has been opened, it offers the deliberate "I've found it" action.
 */
export function renderMissionBar(state, mission, { place, bodiesById, onFound, onResume }) {
  const progress = missionProgress(state, mission.id);
  const step = mission.steps[progress.stepIndex];
  const canFind = progress.phase === 'task' && step.type === 'find' && step.target === place && progress.steps[step.id].visited;
  const where = `${stepLabel(progress.stepIndex, mission.steps.length)}: ${step.title}`;
  const explored = progress.phase === 'task' && step.type === 'question' && step.visitRequired && step.explore === place && progress.steps[step.id].visited;
  return el('div', { className: 'quiz-resume mission-bar', role: 'region', 'aria-label': 'Discovery Mission in progress', 'data-mission': mission.id },
    el('p', {}, el('strong', {}, mission.title), ` · ${where}`),
    canFind ? el('p', { className: 'mission-bar__task' }, `Look for ${step.lookFor} ${place === 'overview' ? 'in the solar system view' : `on ${placeName(place, bodiesById)}’s page`}, then press “I’ve found it”.`) : null,
    explored ? el('p', { className: 'mission-bar__task' }, `You’ve explored ${placeName(place, bodiesById)}. Go back to the mission to answer the question.`) : null,
    el('div', { className: 'quiz-actions' },
      canFind ? el('button', { type: 'button', className: 'primary-button', 'data-mission-action': 'found-here', onClick: () => onFound(mission.id) }, 'I’ve found it') : null,
      el('button', { type: 'button', className: canFind ? 'secondary-button' : 'primary-button', 'data-mission-action': 'resume', onClick: onResume }, 'Back to the mission')));
}
