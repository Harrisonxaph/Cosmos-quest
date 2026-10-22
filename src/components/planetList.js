// The Stage 1 list: each planet in order with its first sourced fact and a link to the science notes.
// Kept unchanged in content, with an added button to open the planet in the explorer.
import { el } from './dom.js';
import { SCIENCE_PAGE } from './infoPanel.js';

export function createPlanetList(planets, onExplore) {
  return planets.map(planet => {
    const fact = planet.facts[0];
    return el('article', { className: 'planet-card', 'data-body': planet.id },
      el('h3', {}, `${planet.orderFromSun}. ${planet.name}`),
      el('p', {}, fact.text),
      el('a', { className: 'planet-card__source', href: `${SCIENCE_PAGE}#${fact.sourceId}` }, 'Science source', el('span', { className: 'visually-hidden' }, ` for ${planet.name}`)),
      el('button', { type: 'button', className: 'planet-card__explore', onClick: () => onExplore(planet.id) }, `Explore ${planet.name}`));
  });
}
