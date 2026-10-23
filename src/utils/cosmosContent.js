// What the Cosmos panel says about a galaxy, as plain data (no DOM), so tests can check the wording.
// Everything comes from src/data/galaxies.json and src/data/sources.json; nothing here adds science.

const TYPE_LABELS = {
  spiral: 'Spiral galaxy',
  'barred-spiral': 'Barred spiral galaxy',
  elliptical: 'Elliptical galaxy',
  lenticular: 'Lenticular galaxy',
  irregular: 'Irregular galaxy',
};

const LIGHT_WORDS = { visible: 'visible light', infrared: 'infrared light', ultraviolet: 'ultraviolet light', hydrogen: 'light from glowing hydrogen' };

export const typeLabel = value => TYPE_LABELS[value] ?? value;

/** Shown under every galaxy picture: what picture size and sharpness do and don't mean. */
export const PICTURE_NOTES = [
  'Each picture is resized to fit here, so the pictures are not to the same scale as each other. A galaxy that fills its picture is not necessarily bigger than another.',
  'A bigger or sharper picture shows more detail. It does not mean we are any closer to the galaxy.',
];

const capitalise = text => text.charAt(0).toUpperCase() + text.slice(1);

function listWords(words) {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/** "Photograph · Hubble Space Telescope", "Composite image · … · made with ultraviolet light", "Artist's illustration · not a photograph". */
export function imageLabel(image) {
  if (image.kind === 'artist-concept') return "Artist's illustration · not a photograph";
  const parts = [image.kind === 'composite' ? 'Composite image' : 'Photograph'];
  if (image.telescope) parts.push(image.telescope);
  if (image.wavelengths.length) parts.push(`made with ${listWords(image.wavelengths.map(w => LIGHT_WORDS[w]))}`);
  return parts.join(' · ');
}

/** Every source id a galaxy cites, in a stable order without duplicates. */
export function galaxySourceIds(galaxy) {
  const ids = [
    ...galaxy.summary.sourceIds,
    ...galaxy.classification.sourceIds,
    ...(galaxy.classification.note?.sourceIds ?? []),
    ...(galaxy.distance ? [...galaxy.distance.sourceIds, ...galaxy.distance.otherEstimates.flatMap(e => e.sourceIds), ...(galaxy.distance.context?.sourceIds ?? [])] : []),
    ...(galaxy.size?.sourceIds ?? []),
    ...(galaxy.sky?.sourceIds ?? []),
    ...galaxy.facts.map(fact => fact.sourceId),
    ...(galaxy.image.childCaptionSourceIds ?? []),
    ...(galaxy.image.colourNoteSourceId ? [galaxy.image.colourNoteSourceId] : []),
  ];
  return [...new Set(ids)];
}

/** "the Andromeda Galaxy", "the Large Magellanic Cloud", but "Messier 87" and "NGC 1300". */
export function nameInSentence(galaxy) {
  return /(Galaxy|Cloud)$/.test(galaxy.name) ? `the ${galaxy.name}` : galaxy.name;
}

/**
 * An example from the collection of why sky position is not distance: the two galaxies in the same constellation
 * whose NASA distances differ the most (as a ratio). Returns null if no constellation has two galaxies.
 */
export function skyVersusDistanceExample(galaxies) {
  const byConstellation = new Map();
  for (const galaxy of galaxies) {
    const constellation = galaxy.sky?.constellation;
    if (!constellation || !galaxy.distance) continue;
    if (!byConstellation.has(constellation)) byConstellation.set(constellation, []);
    byConstellation.get(constellation).push(galaxy);
  }
  let best = null;
  for (const [constellation, members] of byConstellation) {
    if (members.length < 2) continue;
    const sorted = members.slice().sort((a, b) => b.distance.valueLy - a.distance.valueLy);
    const [far, near] = [sorted[0], sorted.at(-1)];
    const ratio = far.distance.valueLy / near.distance.valueLy;
    if (!best || ratio > best.ratio) best = { constellation, far, near, ratio };
  }
  if (!best) return null;
  const { constellation, far, near, ratio } = best;
  const times = Math.round(ratio);
  const howFar = times >= 3 ? `about ${times} times as far away as` : times === 2 ? 'about twice as far away as' : 'farther away than';
  return {
    constellation,
    ids: [far.id, near.id],
    sourceIds: [...new Set([...far.sky.sourceIds, ...near.sky.sourceIds, ...far.distance.sourceIds, ...near.distance.sourceIds])],
    text: `${capitalise(nameInSentence(far))} and ${nameInSentence(near)} are both in the constellation ${constellation} in our sky. `
      + `But NASA gives their distances as ${far.distance.display} and ${near.distance.display}, so, working from those distances, ${nameInSentence(far)} is ${howFar} ${nameInSentence(near)}.`,
  };
}

/** Short text for the galaxy list and map: type and distance. */
export function galaxyListLine(galaxy) {
  const distance = galaxy.distance ? capitalise(galaxy.distance.display) : 'We live inside it';
  return `${typeLabel(galaxy.classification.value)} · ${distance}`;
}

export function galaxyContent(galaxy, sourcesById) {
  const source = id => ({ id, title: sourcesById[id]?.title ?? id, url: sourcesById[id]?.url ?? null });
  const d = galaxy.distance;
  const { image } = galaxy;
  return {
    id: galaxy.id,
    name: galaxy.name,
    aliases: galaxy.aliases,
    type: typeLabel(galaxy.classification.value),
    nasaWording: galaxy.classification.nasaWording,
    typeNote: galaxy.classification.note?.text ?? null,
    summary: galaxy.summary.simple,
    inside: galaxy.viewpoint === 'inside',
    distance: d
      ? {
        text: `${capitalise(d.display)} away`,
        note: d.estimateNote,
        others: d.otherEstimates.map(e => `Another NASA page says ${e.display}.`),
        context: d.context?.text ?? null,
      }
      : null,
    size: galaxy.size ? `About ${galaxy.size.diameterLy.toLocaleString('en-GB')} light-years across` : null,
    sky: galaxy.sky?.constellation ? `In our sky, it is in the constellation ${galaxy.sky.constellation}.` : null,
    facts: galaxy.facts.map(fact => ({ text: fact.text, source: source(fact.sourceId) })),
    sources: galaxySourceIds(galaxy).map(source),
    image: {
      label: imageLabel(image),
      note: image.illustrationNote ?? image.childCaption ?? null,
      noteSources: (image.childCaptionSourceIds ?? []).map(source),
      colourNote: image.composite && image.colourNote ? image.colourNote : null,
      alt: image.alt,
      thumbnail: image.thumbnail,
      detail: image.detail,
      credit: image.credit,
      sourcePage: image.original.sourcePage,
      termsUrl: image.permission.policyUrl,
      licenceUrl: image.permission.licenceUrl ?? null,
      changes: image.permission.modifications,
    },
  };
}
