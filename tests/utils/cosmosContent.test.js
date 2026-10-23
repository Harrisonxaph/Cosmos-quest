import { test } from 'node:test';
import assert from 'node:assert/strict';
import galaxies from '../../src/data/galaxies.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import { imageLabel, galaxyContent, galaxyListLine, galaxySourceIds, nameInSentence, skyVersusDistanceExample, PICTURE_NOTES } from '../../src/utils/cosmosContent.js';
import { galaxySourceIds as everyCitedId } from '../data/galaxy-checks.js';
import { GALAXY_KEY } from '../data/galaxy-key.js';

const sourcesById = Object.fromEntries(sources.map(s => [s.id, s]));
const byId = Object.fromEntries(galaxies.map(g => [g.id, g]));
const content = id => galaxyContent(byId[id], sourcesById);

test('picture labels say what kind of picture it is, in words', () => {
  assert.equal(content('milky-way').image.label, "Artist's illustration · not a photograph");
  assert.equal(content('messier-87').image.label.split(' · ')[0], 'Photograph');
  assert.match(content('large-magellanic-cloud').image.label, /^Composite image · .+ · made with ultraviolet light$/);
  assert.match(content('ngc-1300').image.label, /^Composite image · .* · made with visible light, infrared light and light from glowing hydrogen$/);
  for (const [id, key] of Object.entries(GALAXY_KEY)) {
    const label = content(id).image.label;
    const expected = { 'artist-concept': /^Artist's illustration/, composite: /^Composite image/, photograph: /^Photograph/ }[key.imageKind];
    assert.match(label, expected, id);
  }
  assert.equal(imageLabel({ kind: 'photograph', telescope: null, wavelengths: [] }), 'Photograph');
});

test('the Milky Way is shown from inside: no distance, no sky position, and an illustration note', () => {
  const milkyWay = content('milky-way');
  assert.equal(milkyWay.inside, true);
  assert.equal(milkyWay.distance, null);
  assert.equal(milkyWay.sky, null);
  assert.match(milkyWay.image.note, /not a photograph/);
  assert.equal(galaxyListLine(byId['milky-way']), 'Barred spiral galaxy · We live inside it');
});

test('every other galaxy shows its NASA distance with "about", the estimate note, and other NASA estimates', () => {
  for (const [id, key] of Object.entries(GALAXY_KEY)) {
    if (key.distanceLy === null) continue;
    const { distance } = content(id);
    assert.match(distance.text, /^About .* light-years away$/, id);
    assert.equal(distance.note, byId[id].distance.estimateNote, id);
    assert.equal(distance.others.length, byId[id].distance.otherEstimates.length, id);
    assert.match(galaxyListLine(byId[id]), /· About /, id);
  }
  assert.deepEqual(content('pinwheel').distance.others, ['Another NASA page says about 25 million light-years.']);
});

test('pictures show the full credit, the source and terms links, and the changes made', () => {
  for (const galaxy of galaxies) {
    const { image } = content(galaxy.id);
    assert.equal(image.credit, galaxy.image.credit, galaxy.id);
    assert.equal(image.sourcePage, galaxy.image.original.sourcePage, galaxy.id);
    assert.equal(image.termsUrl, galaxy.image.permission.policyUrl, galaxy.id);
    assert.equal(image.changes, galaxy.image.permission.modifications, galaxy.id);
    assert.equal(image.licenceUrl, galaxy.image.permission.licenceUrl ?? null, galaxy.id);
    assert.ok(image.thumbnail.file.endsWith('-thumb.webp') && image.detail.file.endsWith('.webp'), galaxy.id);
    assert.ok(image.alt.length > 20, galaxy.id);
  }
  assert.ok(content('triangulum').image.licenceUrl, 'Triangulum keeps its CC BY licence link');
  assert.equal(content('large-magellanic-cloud').image.note, byId['large-magellanic-cloud'].image.childCaption, 'UV caption shown');
});

test('facts are shown word for word with their sources, and every cited source is listed', () => {
  for (const galaxy of galaxies) {
    const shown = content(galaxy.id);
    assert.deepEqual(shown.facts.map(f => f.text), galaxy.facts.map(f => f.text), galaxy.id);
    for (const fact of shown.facts) assert.ok(fact.source.url, `${galaxy.id} fact source has a link`);
    assert.deepEqual(new Set(galaxySourceIds(galaxy)), new Set(everyCitedId(galaxy)), `${galaxy.id} lists every cited source`);
    for (const source of shown.sources) assert.ok(sourcesById[source.id], `${source.id} is in sources.json`);
  }
});

test('the sky-versus-distance example names two galaxies in the same constellation at very different distances', () => {
  const example = skyVersusDistanceExample(galaxies);
  const [far, near] = example.ids.map(id => byId[id]);
  assert.equal(far.sky.constellation, example.constellation);
  assert.equal(near.sky.constellation, example.constellation);
  assert.ok(GALAXY_KEY[far.id].distanceLy > 1.5 * GALAXY_KEY[near.id].distanceLy);
  assert.ok(example.text.includes(far.distance.display) && example.text.includes(near.distance.display));
  for (const id of example.sourceIds) assert.ok(sourcesById[id]);
  assert.equal(skyVersusDistanceExample([byId.andromeda]), null);
});

test('names read naturally in sentences', () => {
  assert.equal(nameInSentence(byId.andromeda), 'the Andromeda Galaxy');
  assert.equal(nameInSentence(byId['large-magellanic-cloud']), 'the Large Magellanic Cloud');
  assert.equal(nameInSentence(byId['messier-87']), 'Messier 87');
});

test('picture notes say pictures are not to the same scale and that a bigger picture is not getting closer', () => {
  const text = PICTURE_NOTES.join(' ');
  assert.match(text, /not to the same scale/);
  assert.match(text, /not necessarily bigger/);
  assert.match(text, /does not mean we are any closer/);
});

test('the sky example says its comparison is worked out, not quoted', () => {
  assert.match(skyVersusDistanceExample(galaxies).text, /working from those distances/);
});

