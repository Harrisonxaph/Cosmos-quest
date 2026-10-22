// Information panel: one reusable renderer for each body, plus the solar-system overview.
// Works with or without the 3D scene.
import { el } from './dom.js';
import { earthComparisons } from '../utils/compare.js';
import { bodyHeadline, noSurfaceNotice, measurementRows, bodySourceIds, modelNote } from '../utils/panelContent.js';
import { trueScaleSentences, SCALE_CHANGES, SCALE_INTRO, SCALE_MEASUREMENTS_NOTE } from '../utils/scale.js';
import { SHORTCUTS } from '../features/navigation.js';

export const SCIENCE_PAGE = 'https://github.com/Harrisonxaph/Cosmos-quest/blob/main/docs/SCIENCE.md';
const SIMPLE_COMPARISONS = ['width', 'weight', 'day', 'year', 'distance'];

function badge(text, kind) {
  return el('span', { className: `badge badge--${kind}` }, text);
}

function sourceLink(source) {
  return el('a', { href: source.url, target: '_blank', rel: 'noopener' }, source.title);
}

export function modeToggle(mode, onChange) {
  const option = (value, label) => el('button', {
    type: 'button',
    className: 'mode-toggle__option',
    'data-mode': value,
    'aria-pressed': String(mode === value),
    onClick: () => onChange(value),
  }, label);
  return el('div', { className: 'mode-toggle', role: 'group', 'aria-label': 'How much detail' },
    option('simple', 'Simple'),
    option('detailed', 'Detailed'));
}

function section(title, badgeNode, ...content) {
  return el('section', { className: 'panel-section' },
    el('h3', {}, title, badgeNode ? ' ' : null, badgeNode),
    ...content);
}

export function renderBodyPanel(body, { earth, mode, sourcesById, onModeChange }) {
  const notice = noSurfaceNotice(body);
  const rows = measurementRows(body, mode);
  const comparisons = earthComparisons(body, earth).filter(item => mode === 'detailed' || SIMPLE_COMPARISONS.includes(item.id));
  const factSheet = sourcesById[body.measurements.sourceIds[0]];

  return el('article', { className: 'panel', 'data-body': body.id, 'data-mode': mode, 'aria-labelledby': `panel-title-${body.id}` },
    el('header', { className: 'panel__header' },
      el('h2', { id: `panel-title-${body.id}` }, body.name),
      el('p', { className: 'panel__kind' }, bodyHeadline(body))),
    modeToggle(mode, onModeChange),
    notice ? el('p', { className: 'callout callout--no-surface', role: 'note' }, el('strong', {}, 'No solid surface. '), notice) : null,
    el('p', { className: 'panel__intro' }, body.summary[mode]),

    section('Measured by scientists', badge('Measured · NASA', 'measured'),
      el('dl', { className: 'stats' },
        rows.map(row => el('div', { className: 'stats__row', 'data-stat': row.id },
          el('dt', {}, row.label),
          el('dd', {}, row.value, row.note ? el('span', { className: 'stats__note' }, row.note) : null)))),
      el('p', { className: 'panel__context' }, body.temperatureContext[mode]),
      mode === 'detailed' && body.moons.note ? el('p', { className: 'panel__context' }, body.moons.note) : null,
      factSheet ? el('p', { className: 'panel__source' }, 'Numbers from ', sourceLink(factSheet), factSheet.pageUpdated ? ` (updated ${factSheet.pageUpdated})` : null, '.') : null),

    section('Compared with Earth', badge('Calculated', 'calculated'),
      comparisons.length === 0
        ? el('p', {}, 'Earth is our yardstick: every comparison in Cosmos Quest is measured against Earth.')
        : el('ul', { className: 'comparisons' },
          comparisons.map(item => el('li', { 'data-comparison': item.id }, el('strong', {}, `${item.label}: `), item[mode])))),

    section('What it is made of', null, el('p', {}, body.composition[mode])),

    section('Amazing facts', null,
      el('ul', { className: 'facts' },
        body.facts.map(fact => el('li', {},
          fact.text, ' ',
          sourcesById[fact.sourceId] ? el('a', { className: 'facts__source', href: sourcesById[fact.sourceId].url, target: '_blank', rel: 'noopener' }, 'Source') : null)))),

    section('About this 3D view', badge('Model', 'model'),
      el('p', {}, modelNote(body)),
      el('details', {},
        el('summary', {}, 'Everything that is not to scale'),
        el('ul', {}, SCALE_CHANGES.map(text => el('li', {}, text))))),

    el('footer', { className: 'panel__sources' },
      el('h3', {}, 'Sources'),
      el('ul', {}, bodySourceIds(body).map(id => sourcesById[id]).filter(Boolean).map(source => el('li', {}, sourceLink(source)))),
      el('p', {}, el('a', { href: SCIENCE_PAGE, target: '_blank', rel: 'noopener' }, 'How we check our facts'))));
}

export function renderOverviewPanel({ bodies, earth, onSelect, onQuiz, onMissions }) {
  return el('article', { className: 'panel', 'data-body': 'overview', 'aria-labelledby': 'panel-title-overview' },
    el('header', { className: 'panel__header' },
      el('h2', { id: 'panel-title-overview' }, 'Our solar system'),
      el('p', { className: 'panel__kind' }, 'The Sun and eight planets')),
    el('p', { className: 'panel__intro' }, 'Choose a world with the buttons, or tap it in the picture, to fly there and find out what it is like. Drag to turn the view and pinch or scroll to zoom.'),
    el('button', { type: 'button', className: 'primary-button', onClick: () => onSelect('sun') }, 'Start with the Sun'),

    onMissions ? section('Discovery Missions', null,
      el('p', {}, 'Explore with a purpose: three short missions take you to the worlds with something to discover.'),
      el('button', { type: 'button', className: 'secondary-button', 'data-mission-action': 'open', onClick: onMissions }, 'Choose a mission')) : null,
    onQuiz ? section('Planet Quiz', null,
      el('p', {}, 'Explored a few worlds? Try five friendly questions to see what you remember.'),
      el('button', { type: 'button', className: 'secondary-button', 'data-quiz-action': 'open', onClick: onQuiz }, 'Play the Planet Quiz')) : null,

    section('The real size of space', badge('Calculated', 'calculated'),
      trueScaleSentences(bodies, earth).map(text => el('p', {}, text))),

    section('This picture is not to scale', badge('Model', 'model'),
      el('p', {}, `${SCALE_INTRO} To help you explore, this view changes some things:`),
      el('ul', {}, SCALE_CHANGES.map(text => el('li', {}, text))),
      el('p', {}, SCALE_MEASUREMENTS_NOTE)),

    el('details', { className: 'shortcuts' },
      el('summary', {}, 'Keyboard shortcuts'),
      el('dl', {}, SHORTCUTS.map(([keys, action]) => el('div', {}, el('dt', {}, keys), el('dd', {}, action))))));
}
