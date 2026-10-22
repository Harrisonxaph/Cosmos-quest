// Science Experiments panel. Renders state from features/experiments.js; the maths lives in utils/experiments.js.
// Typing, sliding or choosing updates the state without re-rendering the panel (so the cursor never jumps);
// the panel only hides an out-of-date result locally. Each screen marks one element with data-focus-target.
import { el } from './dom.js';
import { formatNumber, formatDistanceE6Km } from '../utils/format.js';
import {
  gravityResult, gravityText, tinySolarSystem, tinySummary, formatModelSize, formatModelDistance, formatEarthCm,
} from '../utils/experiments.js';

function badge(text, kind) {
  return el('span', { className: `badge badge--${kind}` }, text);
}

function sourceLinks(ids, sourcesById) {
  const links = ids.map(id => sourcesById[id]).filter(Boolean)
    .map(source => el('a', { href: source.url, target: '_blank', rel: 'noopener' }, source.title));
  return el('p', { className: 'quiz-source' }, links.length > 1 ? 'Sources: ' : 'Source: ', links.flatMap((link, i) => (i ? [', ', link] : [link])));
}

const lowerFirst = text => `${text[0].toLowerCase()}${text.slice(1)}`;
const optionText = (experiment, id) => experiment.prediction.options.find(option => option.id === id)?.text;

/** Calculated result for what is revealed, or null. Pure apart from reading the definitions. */
function resultFor(experiment, activity, { bodies, bodiesById, earth }) {
  if (!activity.revealed) return null;
  if (experiment.id === 'gravity-lab') {
    const body = bodiesById[activity.revealed.worldId];
    return { body, result: gravityResult(activity.revealed.value, body, earth) };
  }
  return { model: tinySolarSystem(bodies, earth, activity.revealed.value) };
}

/** What screen readers hear after a deliberate "show the result" action. */
export function experimentAnnouncement(experiment, activity, context) {
  const outcome = resultFor(experiment, activity, context);
  if (!outcome) return null;
  if (outcome.result) {
    const text = gravityText(outcome.result, outcome.body);
    return `${text.headline} ${text.comparison}`;
  }
  return tinySummary(outcome.model).join(' ');
}

function predictionLine(experiment, prediction, actualId, extra = '') {
  if (!prediction) return null;
  return el('p', { className: 'experiment-prediction' },
    el('strong', {}, 'Your guess: '), `${optionText(experiment, prediction)}. `,
    el('strong', {}, 'The calculation shows: '), `${lowerFirst(optionText(experiment, actualId))}${extra}.`);
}

function gravityResultSection(experiment, activity, { body, result }, sourcesById) {
  const text = gravityText(result, body);
  const sources = body.hasSolidSurface ? experiment.sourceIds : [...experiment.sourceIds, ...experiment.noSurfaceSourceIds];
  return [
    el('h3', { id: 'experiment-result-title', tabindex: '-1', 'data-focus-target': '' }, el('span', { className: 'visually-hidden' }, 'Result: '), text.heading),
    el('p', { className: 'experiment-headline' }, text.headline),
    el('p', {}, text.comparison),
    predictionLine(experiment, activity.revealed.prediction, result.category),
    body.hasSolidSurface
      ? el('p', { className: 'experiment-place' }, text.placeNote)
      : el('p', { className: 'callout callout--no-surface', role: 'note' }, el('strong', {}, 'No solid surface. '), text.placeNote),
    el('h4', {}, 'How it was worked out'),
    el('dl', { className: 'experiment-workings' },
      el('dt', {}, badge('Measured · NASA', 'measured')), el('dd', {}, text.measured),
      el('dt', {}, badge('Calculated', 'calculated')), el('dd', {}, `Force = mass × gravity: ${text.calculation}`), el('dd', {}, text.earthCalculation)),
    sourceLinks(sources, sourcesById),
  ];
}

function tinyResultSection(experiment, activity, { model }, sourcesById) {
  const caption = `Model sizes and average distances with Earth ${formatEarthCm(model.earthCm)} wide`;
  return [
    el('h3', { id: 'experiment-result-title', tabindex: '-1', 'data-focus-target': '' }, el('span', { className: 'visually-hidden' }, 'Result: '), 'Your tiny solar system'),
    ...tinySummary(model).map(sentence => el('p', { className: 'experiment-headline' }, sentence)),
    predictionLine(experiment, activity.revealed.prediction, model.category, ` (about ${formatModelDistance(model.neptuneDistanceM)})`),
    el('h4', { id: 'experiment-model-title' }, caption),
    el('ul', { className: 'experiment-cards', 'aria-labelledby': 'experiment-model-title' }, model.rows.map(row => el('li', { className: 'experiment-card', 'data-row': row.id },
      el('h5', {}, row.name),
      el('dl', {},
        el('dt', {}, 'Real diameter ', badge('measured', 'measured')), el('dd', {}, `${formatNumber(row.diameterKm, 0)} km`),
        el('dt', {}, 'Model diameter ', badge('calculated', 'calculated')), el('dd', { 'data-value': 'model-diameter' }, row.id === 'earth' ? formatEarthCm(model.earthCm) : formatModelSize(row.modelDiameterCm)),
        el('dt', {}, 'Real average distance from the Sun ', badge('measured', 'measured')), el('dd', {}, row.distanceE6Km === null ? 'At the centre' : formatDistanceE6Km(row.distanceE6Km)),
        el('dt', {}, 'Model distance from the Sun ', badge('calculated', 'calculated')), el('dd', { 'data-value': 'model-distance' }, row.modelDistanceM === null ? 'At the centre' : formatModelDistance(row.modelDistanceM)))))),
    el('p', {}, badge('Measured · NASA', 'measured'), ' ', experiment.diameterNote),
    el('p', {}, experiment.distanceNote),
    el('p', {}, badge('Model', 'model'), ' ', experiment.pictureNote),
    sourceLinks(experiment.sourceIds, sourcesById),
  ];
}

function hideStaleResult(article) {
  article.querySelector('.experiment-result')?.remove();
  article.dataset.experimentScreen = 'form';
  for (const node of article.querySelectorAll('[aria-invalid="true"]')) node.removeAttribute('aria-invalid');
  article.querySelector('.field-error')?.remove();
}

function measurementField(experiment, activity, handlers) {
  const { input } = experiment;
  const id = `experiment-${input.id}`;
  const error = activity.error;
  const describedBy = [`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(' ');
  const textInput = el('input', {
    id,
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    spellcheck: 'false',
    className: 'experiment-input',
    value: activity.text,
    'aria-describedby': describedBy,
    'aria-invalid': error ? 'true' : null,
    'data-focus-target': error ? '' : null,
  });
  const slider = input.slider ? el('input', {
    id: `${id}-slider`,
    type: 'range',
    className: 'experiment-slider',
    min: input.min,
    max: input.max,
    step: input.step,
    value: Math.min(input.max, Math.max(input.min, Number(activity.text) || input.default)),
    'aria-describedby': `${id}-hint`,
  }) : null;
  const sliderText = value => `${formatNumber(Number(value), 2)} ${input.unitName}`;
  if (slider) slider.setAttribute('aria-valuetext', sliderText(slider.value));

  textInput.addEventListener('input', () => {
    hideStaleResult(textInput.closest('article'));
    if (slider && Number.isFinite(Number(textInput.value)) && textInput.value.trim() !== '') {
      slider.value = String(Math.min(input.max, Math.max(input.min, Number(textInput.value))));
      slider.setAttribute('aria-valuetext', sliderText(slider.value));
    }
    handlers.onInput(experiment.id, textInput.value);
  });
  // The slider has the same precision as the number field (0.01 cm), so both always show the same value.
  // Arrow keys still move it in easy 0.1 cm steps.
  slider?.addEventListener('keydown', event => {
    const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    const next = Math.min(input.max, Math.max(input.min, Math.round((Number(slider.value) + direction * 0.1) * 100) / 100));
    slider.value = String(next);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  slider?.addEventListener('input', () => {
    // Moving the slider only updates the number; nothing is announced until the child asks for the result.
    hideStaleResult(slider.closest('article'));
    textInput.value = String(Number(slider.value));
    slider.setAttribute('aria-valuetext', sliderText(slider.value));
    handlers.onInput(experiment.id, textInput.value);
  });

  return el('div', { className: 'experiment-field' },
    el('label', { for: id }, `${input.label} (${input.unitName})`),
    el('div', { className: 'experiment-input-row' }, textInput, el('span', { className: 'experiment-unit', 'aria-hidden': 'true' }, input.unit)),
    slider ? el('label', { for: `${id}-slider`, className: 'experiment-slider-label' }, `Or slide to choose the ${lowerFirst(input.label)}`) : null,
    slider,
    el('p', { id: `${id}-hint`, className: 'experiment-hint' }, input.hint),
    error ? el('p', { id: `${id}-error`, className: 'field-error' }, el('span', { 'aria-hidden': 'true' }, '⚠ '), error.message) : null);
}

function worldField(experiment, activity, { bodiesById, handlers }) {
  const id = 'experiment-world';
  const select = el('select', { id, className: 'experiment-select' },
    experiment.worlds.map(worldId => el('option', { value: worldId, selected: worldId === activity.worldId }, bodiesById[worldId].name)));
  select.addEventListener('change', () => {
    hideStaleResult(select.closest('article'));
    handlers.onWorld(experiment.id, select.value);
  });
  return el('div', { className: 'experiment-field' }, el('label', { for: id }, experiment.worldLabel), select);
}

function predictionField(experiment, activity, handlers) {
  const name = `${experiment.id}-prediction`;
  const options = [...experiment.prediction.options, { id: '', text: 'No guess this time' }];
  return el('fieldset', { className: 'experiment-prediction-field' },
    el('legend', {}, experiment.prediction.question),
    el('p', { className: 'experiment-hint' }, 'Guessing is optional, and there is no score.'),
    options.map(option => {
      const radio = el('input', { type: 'radio', name, value: option.id, id: `${name}-${option.id || 'none'}`, checked: (activity.prediction ?? '') === option.id });
      radio.addEventListener('change', () => {
        hideStaleResult(radio.closest('article'));
        handlers.onPredict(experiment.id, option.id || null);
      });
      return el('label', { className: 'experiment-choice', for: radio.id }, radio, ' ', option.text);
    }));
}

function activityScreen(experiment, activity, context) {
  const { handlers, sourcesById } = context;
  const outcome = resultFor(experiment, activity, context);
  const form = el('form', { className: 'experiment-form', novalidate: true, 'aria-label': `${experiment.title} settings` },
    measurementField(experiment, activity, handlers),
    experiment.worlds ? worldField(experiment, activity, context) : null,
    predictionField(experiment, activity, handlers),
    el('div', { className: 'quiz-actions' },
      el('button', { type: 'submit', className: 'primary-button', 'data-experiment-action': 'reveal' }, experiment.revealLabel)));
  form.addEventListener('submit', event => {
    event.preventDefault();
    handlers.onReveal(experiment.id);
  });

  return [
    el('header', { className: 'panel__header' },
      el('p', { className: 'quiz-progress' }, 'Science Experiment'),
      el('h2', { id: 'experiments-title', tabindex: '-1', 'data-focus-target': activity.error || outcome ? null : '' }, experiment.title)),
    el('p', { className: 'panel__intro' }, experiment.intro),
    el('p', { className: 'experiment-model-note' }, badge('Learning model', 'model'), ' ', experiment.modelNote),
    experiment.explanations ? el('section', { className: 'panel-section' },
      el('h3', {}, 'Mass and weight'),
      el('ul', {}, experiment.explanations.map(text => el('li', {}, text)))) : null,
    form,
    outcome ? el('section', { className: 'experiment-result panel-section', 'aria-labelledby': 'experiment-result-title' },
      ...(outcome.result ? gravityResultSection(experiment, activity, outcome, sourcesById) : tinyResultSection(experiment, activity, outcome, sourcesById))) : null,
    el('div', { className: 'quiz-actions quiz-actions--leave' },
      el('button', { type: 'button', className: 'secondary-button', 'data-experiment-action': 'reset', onClick: () => handlers.onReset(experiment.id) }, 'Reset this experiment'),
      el('button', { type: 'button', className: 'secondary-button', 'data-experiment-action': 'leave', 'aria-describedby': 'experiment-leave-hint', onClick: handlers.onLeave }, 'Back to exploring'),
      el('button', { type: 'button', className: 'secondary-button', 'data-experiment-action': 'list', onClick: () => handlers.onOpen(null) }, 'All experiments')),
    el('p', { id: 'experiment-leave-hint', className: 'experiment-hint' }, 'Your settings are kept while this page stays open.'),
  ];
}

function listScreen(context) {
  const { experiments, handlers } = context;
  return [
    el('header', { className: 'panel__header' },
      el('h2', { id: 'experiments-title', tabindex: '-1', 'data-focus-target': '' }, 'Science Experiments'),
      el('p', { className: 'panel__kind' }, 'Change the numbers and see what happens')),
    el('p', { className: 'panel__intro' }, 'These are learning models, not realistic physics simulations. They use real NASA measurements and simple calculations.'),
    el('ul', { className: 'mission-list' }, experiments.map(experiment => el('li', { className: 'mission-card', 'data-experiment': experiment.id },
      el('h3', {}, experiment.title),
      el('p', {}, experiment.summary),
      el('button', { type: 'button', className: 'primary-button', 'data-experiment-action': 'choose', onClick: () => handlers.onOpen(experiment.id) },
        'Open', el('span', { className: 'visually-hidden' }, `: ${experiment.title}`))))),
    el('div', { className: 'quiz-actions quiz-actions--leave' },
      el('button', { type: 'button', className: 'secondary-button', 'data-experiment-action': 'leave', onClick: handlers.onLeave }, 'Back to exploring')),
  ];
}

export function renderExperimentsPanel(state, context) {
  const experiment = context.experiments.find(e => e.id === state.activeId);
  const activity = experiment ? state.activities[experiment.id] : null;
  const screen = !experiment ? 'list' : activity.revealed ? 'result' : activity.error ? 'error' : 'form';
  return el('article', { className: 'panel quiz experiments', 'data-body': 'experiments', 'data-experiment': experiment?.id ?? '', 'data-experiment-screen': screen, 'aria-labelledby': 'experiments-title' },
    ...(experiment ? activityScreen(experiment, activity, context) : listScreen(context)));
}
