// Cosmos panel: the list of galaxies (the equivalent of the map, and the fallback if the map can't load) and
// one galaxy's picture and facts. Renders data from src/data/galaxies.json through utils/cosmosContent.js.
// Each screen marks its heading with data-focus-target.
import { el } from './dom.js';
import { modeToggle } from './infoPanel.js';
import { COSMOS_BANDS, COSMOS_SCALE_NOTES, bandFor } from '../utils/cosmosLayout.js';
import { galaxyContent, galaxyListLine, skyVersusDistanceExample, PICTURE_NOTES } from '../utils/cosmosContent.js';

// Detail pictures already downloaded this visit, so a re-render (such as Simple / Detailed) shows them straight away.
const loadedDetails = new Set();

function badge(text, kind) {
  return el('span', { className: `badge badge--${kind}` }, text);
}

function section(title, badgeNode, ...content) {
  return el('section', { className: 'panel-section' },
    el('h3', {}, title, badgeNode ? ' ' : null, badgeNode),
    ...content);
}

function link(href, text) {
  return el('a', { href, target: '_blank', rel: 'noopener' }, text);
}

function sourceLinks(sources) {
  const links = sources.filter(source => source.url).map(source => link(source.url, source.title));
  return links.flatMap((node, i) => (i ? [', ', node] : [node]));
}

const bandLabel = id => COSMOS_BANDS.find(band => band.id === id);

/** The galaxy list, grouped by distance band and nearest first. Every map marker has a matching button here. */
function galaxyList(galaxies, onSelect) {
  const groups = COSMOS_BANDS.map(band => ({ band, members: galaxies.filter(g => bandFor(g.distance?.valueLy ?? null) === band.id) }))
    .filter(group => group.members.length);
  return el('div', { className: 'cosmos-list' }, groups.map(({ band, members }) => el('section', { className: 'cosmos-list__group', 'aria-labelledby': `cosmos-band-${band.id}` },
    el('h4', { id: `cosmos-band-${band.id}` }, band.label, el('span', { className: 'cosmos-list__band-detail' }, ` · ${band.detail}`)),
    el('ul', {}, members.map(galaxy => el('li', {},
      el('button', { type: 'button', className: 'cosmos-list__button', 'data-galaxy': galaxy.id, onClick: () => onSelect(galaxy.id) },
        el('span', { className: 'cosmos-list__name' }, galaxy.name),
        el('span', { className: 'cosmos-list__line' }, galaxyListLine(galaxy)))))))));
}

function listScreen({ galaxies, sourcesById, mapAvailable, handlers }) {
  const example = skyVersusDistanceExample(galaxies);
  return el('article', { className: 'panel cosmos-panel', 'data-body': 'cosmos', 'data-cosmos-screen': 'list', 'aria-labelledby': 'panel-title-cosmos' },
    el('header', { className: 'panel__header' },
      el('h2', { id: 'panel-title-cosmos', tabindex: '-1', 'data-focus-target': '' }, 'Galaxies beyond our solar system'),
      el('p', { className: 'panel__kind' }, `${galaxies.length} galaxies, nearest first`)),
    el('p', { className: 'panel__intro' }, 'Choose a galaxy on the map or in the list below to see its picture, what kind of galaxy it is, about how far away it is, and where each fact comes from.'),
    mapAvailable ? null : el('p', { className: 'callout', role: 'note' }, 'The map is not showing, but every galaxy is in this list.'),

    section('How to read the map', badge('Illustration', 'model'),
      el('ul', { className: 'cosmos-notes' }, COSMOS_SCALE_NOTES.map(text => el('li', {}, text)))),

    section('In our sky, or out in space?', null,
      el('p', {}, 'Where a galaxy appears in our sky is not the same as how far away it is through space. This map shows only distance, not where to look in the sky.'),
      example ? el('p', {}, example.text) : null,
      example ? el('p', { className: 'panel__source' }, 'Sources: ', sourceLinks(example.sourceIds.map(id => ({ id, ...sourcesById[id] })))) : null),

    section('All galaxies', null, galaxyList(galaxies, handlers.onSelect)),
    el('p', {}, el('button', { type: 'button', className: 'secondary-button', 'data-cosmos-action': 'solar', onClick: handlers.onSolar }, 'Back to the solar system')));
}

function picture(image, saveData, onLoadDetail) {
  const useDetail = loadedDetails.has(image.detail.file);
  const img = el('img', {
    className: 'cosmos-figure__image',
    src: useDetail ? image.detail.file : image.thumbnail.file,
    width: image.thumbnail.width,
    height: image.thumbnail.height,
    alt: image.alt,
    decoding: 'async',
    'data-image-size': useDetail ? 'detail' : 'thumbnail',
  });
  let sharper = null;
  const frame = el('div', { className: 'cosmos-figure__frame' }, img);
  // If the picture can't be downloaded, say so in words (with its description) instead of leaving a broken box.
  // The credit and the link to the picture's source page stay below.
  img.addEventListener('error', () => {
    sharper?.remove();
    frame.replaceWith(el('div', { className: 'cosmos-figure__missing', 'data-image-size': 'missing' },
      el('p', {}, el('strong', {}, 'The picture could not load.'), ' It shows: ', image.alt),
      el('p', {}, 'You can still see it on the image source page linked below.')));
  }, { once: true });
  const loadDetail = () => {
    const detail = new Image();
    detail.decoding = 'async';
    detail.onload = () => {
      loadedDetails.add(image.detail.file);
      img.src = image.detail.file;
      img.dataset.imageSize = 'detail';
      sharper?.remove();
      onLoadDetail?.();
    };
    detail.src = image.detail.file; // if it fails, the thumbnail simply stays
  };
  if (!useDetail) {
    // The small picture shows first; the sharper one is fetched only for the galaxy being shown.
    // With Data Saver on, it waits for a tap instead.
    if (saveData) {
      sharper = el('button', { type: 'button', className: 'secondary-button', 'data-cosmos-action': 'sharper', onClick: loadDetail }, 'Load a sharper picture');
    } else {
      img.addEventListener('load', loadDetail, { once: true });
    }
  }
  return { frame, sharper };
}

function detailScreen(galaxy, { mode, sourcesById, saveData, handlers }) {
  const content = galaxyContent(galaxy, sourcesById);
  const { image } = content;
  const { frame, sharper } = picture(image, saveData);
  const band = bandLabel(bandFor(galaxy.distance?.valueLy ?? null));
  const detailed = mode === 'detailed';

  return el('article', { className: 'panel cosmos-panel', 'data-body': 'cosmos', 'data-cosmos-screen': 'galaxy', 'data-galaxy-id': galaxy.id, 'aria-labelledby': `panel-title-galaxy-${galaxy.id}` },
    el('p', { className: 'cosmos-panel__back' },
      el('button', { type: 'button', className: 'secondary-button', 'data-cosmos-action': 'list', onClick: () => handlers.onList(galaxy.id) }, '‹ All galaxies')),
    el('header', { className: 'panel__header' },
      el('h2', { id: `panel-title-galaxy-${galaxy.id}`, tabindex: '-1', 'data-focus-target': '' }, content.name),
      el('p', { className: 'panel__kind' }, content.type, content.aliases.length ? ` · Also called ${content.aliases.join(' or ')}` : '')),

    el('figure', { className: 'cosmos-figure' },
      frame,
      el('figcaption', {},
        el('p', { className: 'cosmos-figure__label' }, badge(image.label, galaxy.image.kind === 'artist-concept' ? 'model' : 'measured')),
        image.note ? el('p', { className: 'cosmos-figure__note' }, image.note) : null,
        image.noteSources.length ? el('p', { className: 'panel__source' }, 'Caption sources: ', sourceLinks(image.noteSources)) : null,
        image.colourNote ? el('p', { className: 'cosmos-figure__note' }, image.colourNote) : null,
        PICTURE_NOTES.map(text => el('p', { className: 'cosmos-figure__note' }, text)),
        el('p', { className: 'cosmos-credit' }, el('strong', {}, 'Image credit: '), image.credit),
        el('p', { className: 'cosmos-links' },
          link(image.sourcePage, 'Image source'), ' · ', link(image.termsUrl, 'Usage terms'),
          image.licenceUrl ? [' · ', link(image.licenceUrl, 'Licence (CC BY 4.0)')] : null),
        el('p', { className: 'cosmos-changes' }, `Changes for this app: ${image.changes}`),
        sharper)),

    el('p', { className: 'panel__intro' }, content.summary),
    modeToggle(mode, handlers.onModeChange),

    section('What kind of galaxy?', badge('NASA', 'measured'),
      el('p', {}, content.type, '. ', `NASA's words: “${content.nasaWording}”.`),
      content.typeNote ? el('p', {}, content.typeNote) : null),

    section('How far away?', content.distance ? badge('NASA estimate', 'measured') : null,
      content.inside
        ? el('p', {}, el('strong', {}, 'We live inside it.'), ' The Milky Way is our home galaxy, so it has no distance from us. On the map it is “Home”, not the centre of the universe.')
        : [
          el('p', { className: 'cosmos-distance' }, el('strong', {}, content.distance.text)),
          el('p', {}, content.distance.note),
          content.distance.others.length && detailed ? el('ul', { className: 'cosmos-others' }, content.distance.others.map(text => el('li', {}, text))) : null,
          content.distance.others.length && !detailed ? el('p', { className: 'panel__context' }, 'NASA pages give more than one estimate for this galaxy. Choose Detailed to see them.') : null,
          content.distance.context && detailed ? el('p', { className: 'panel__context' }, content.distance.context) : null,
        ],
      el('p', { className: 'panel__context' }, `On the map: ${band.label}${content.inside ? '' : ` (${band.detail.toLowerCase()})`}. The map is not to scale.`)),

    content.size ? section('How big is it?', badge('NASA', 'measured'), el('p', {}, `${content.size}.`)) : null,
    content.sky ? section('Where is it in our sky?', null, el('p', {}, content.sky), el('p', { className: 'panel__context' }, 'That is the direction to look, not how far away it is.')) : null,

    section('Facts', null,
      el('ul', { className: 'facts' }, content.facts.map(fact => el('li', {},
        fact.text, ' ',
        el('span', { className: 'facts__source' }, '(', fact.source.url ? link(fact.source.url, fact.source.title) : fact.source.title, ')'))))),

    el('section', { className: 'panel__sources' },
      el('h3', {}, 'Sources'),
      el('ul', {}, content.sources.map(source => el('li', {}, source.url ? link(source.url, source.title) : source.title)))),

    el('p', {}, el('button', { type: 'button', className: 'secondary-button', 'data-cosmos-action': 'list', onClick: () => handlers.onList(galaxy.id) }, '‹ All galaxies')));
}

/**
 * galaxies: the collection (nearest first), or null while it is still loading. error: the collection could not load.
 * handlers: { onSelect(id), onList(fromId), onSolar(), onModeChange(mode), onRetry() }.
 */
export function renderCosmosPanel({ galaxies, galaxyId, mode, sourcesById, mapAvailable = true, error = false, saveData = false, handlers }) {
  if (!galaxies) {
    return el('article', { className: 'panel cosmos-panel', 'data-body': 'cosmos', 'data-cosmos-screen': error ? 'error' : 'loading', 'aria-labelledby': 'panel-title-cosmos' },
      el('header', { className: 'panel__header' },
        el('h2', { id: 'panel-title-cosmos', tabindex: '-1', 'data-focus-target': '' }, 'Galaxies beyond our solar system')),
      error
        ? [el('p', {}, 'The galaxies could not load. Check the connection, then try again.'),
          el('button', { type: 'button', className: 'primary-button', 'data-cosmos-action': 'retry', onClick: handlers.onRetry }, 'Try again'),
          el('p', {}, el('button', { type: 'button', className: 'secondary-button', 'data-cosmos-action': 'solar', onClick: handlers.onSolar }, 'Back to the solar system'))]
        : el('p', {}, 'Loading the galaxies…'));
  }
  const galaxy = galaxyId ? galaxies.find(g => g.id === galaxyId) : null;
  return galaxy
    ? detailScreen(galaxy, { mode, sourcesById, saveData, handlers })
    : listScreen({ galaxies, sourcesById, mapAvailable, handlers });
}
