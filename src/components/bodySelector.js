// Row of buttons for the Sun and the eight planets. The current world is marked with aria-pressed.
import { el } from './dom.js';
import { appearanceFor } from '../scenes/appearance.js';

export function createBodySelector(bodies, onSelect) {
  const buttons = new Map();
  const list = el('ul', { className: 'body-selector__list' },
    bodies.map(body => {
      const button = el('button', {
        type: 'button',
        className: 'body-selector__button',
        'aria-pressed': 'false',
        'data-body': body.id,
        onClick: () => onSelect(body.id),
      },
      el('span', { className: 'body-selector__dot', 'aria-hidden': 'true', style: `--dot: ${appearanceFor(body.id).color}` }),
      body.name);
      buttons.set(body.id, button);
      return el('li', {}, button);
    }));

  return {
    element: list,
    setActive(id) {
      for (const [bodyId, button] of buttons) button.setAttribute('aria-pressed', String(bodyId === id));
      buttons.get(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    },
  };
}
