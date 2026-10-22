// Compact facts card for the selected world, shown over the 3D view (and in the 2D view's place).
// It is plain HTML beside the canvas, not part of the 3D picture, so it follows text size, is read by screen
// readers, and taps on it never reach the scene behind. Content comes from sceneCardContent.
import { el } from './dom.js';
import { sceneCardContent } from '../utils/panelContent.js';

const KIND_TAGS = { measured: 'Measured · NASA', calculated: 'Calculated', fact: 'NASA fact' };

function action(name, label, onClick, extra = {}) {
  return el('button', { type: 'button', className: `scene-card__button scene-card__button--${name}`, 'data-card-action': name, onClick, ...extra }, label);
}

/**
 * hidden: the child chose "Hide card", so only a small "Show facts" button is left.
 * expanded: on small screens the card is a strip, and the facts show only when expanded.
 */
export function renderSceneCard(body, { earth, hidden, expanded, onMore, onHide, onShow, onOverview, onToggle }) {
  const content = sceneCardContent(body, earth);
  if (hidden) {
    return el('div', { className: 'scene-card scene-card--hidden', 'data-body': body.id },
      action('show', `Show facts about ${content.name}`, onShow));
  }
  return el('section', { className: 'scene-card', 'data-body': body.id, 'data-expanded': String(expanded), 'aria-labelledby': 'scene-card-title' },
    el('header', { className: 'scene-card__header' },
      el('h2', { className: 'scene-card__title', id: 'scene-card-title', tabindex: '-1' }, content.name),
      el('p', { className: 'scene-card__kind' }, `${content.classification} · ${content.place}`)),
    el('div', { className: 'scene-card__body', id: 'scene-card-body' },
      content.noSurface ? el('p', { className: 'scene-card__no-surface', role: 'note' }, content.noSurface) : null,
      el('ul', { className: 'scene-card__facts' },
        content.facts.map(fact => el('li', { 'data-fact': fact.id, 'data-kind': fact.kind },
          fact.text, ' ', el('span', { className: `scene-card__tag scene-card__tag--${fact.kind}` }, KIND_TAGS[fact.kind])))),
      el('p', { className: 'scene-card__model' }, 'Numbers from NASA. The 3D picture is a model, not to scale.')),
    el('div', { className: 'scene-card__actions' },
      action('toggle', expanded ? 'Fewer facts' : 'Quick facts', onToggle, { 'aria-expanded': String(expanded), 'aria-controls': 'scene-card-body' }),
      action('more', 'More facts', onMore),
      action('hide', 'Hide card', onHide),
      action('overview', 'Solar system', onOverview)));
}
