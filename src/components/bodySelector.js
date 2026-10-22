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
    },
    /**
     * Bring the selected button into view by scrolling the selector row sideways only.
     * Never scrolls the page, so someone reading the facts below is not pulled back up.
     */
    revealActive(id, { smooth = true } = {}) {
      const button = buttons.get(id);
      if (!button) return;
      const start = button.offsetLeft;
      const end = start + button.offsetWidth;
      if (start >= list.scrollLeft && end <= list.scrollLeft + list.clientWidth) return;
      const left = Math.max(0, start - (list.clientWidth - button.offsetWidth) / 2);
      if (typeof list.scrollTo === 'function') list.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
      else list.scrollLeft = left;
    },
  };
}
