// Structure and consistency of the galaxy collection. These tests do not check scientific truth: a person
// reviews the meaning against the NASA pages listed in docs/SCIENCE.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import Ajv from 'ajv';
import galaxies from '../../src/data/galaxies.json' with { type: 'json' };
import schema from '../../src/data/galaxies.schema.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import { GALAXY_KEY, OTHER_NASA_ESTIMATES } from './galaxy-key.js';
import { galaxySourceIds, displayedLightYears, webpSize, LIGHT_YEARS_PER_MPC } from './galaxy-checks.js';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url));
const science = read('docs/SCIENCE.md').toString();
const credits = read('docs/ASSET_CREDITS.md').toString();
const sourcesById = Object.fromEntries(sources.map(source => [source.id, source]));
const sectionFor = id => science.split(`\n## ${id}\n`)[1]?.split('\n## ')[0];
const byId = Object.fromEntries(galaxies.map(galaxy => [galaxy.id, galaxy]));
const outside = galaxies.filter(galaxy => galaxy.viewpoint === 'outside');

test('the collection matches its schema', () => {
  const validate = new Ajv({ allErrors: true }).compile(schema);
  assert.ok(validate(galaxies), JSON.stringify(validate.errors, null, 2));
});

test('it holds exactly the approved galaxies, matching the hand-written key', () => {
  assert.deepEqual(galaxies.map(g => g.id).sort(), Object.keys(GALAXY_KEY).sort());
  for (const [id, expected] of Object.entries(GALAXY_KEY)) {
    const galaxy = byId[id];
    assert.equal(galaxy.name, expected.name, id);
    assert.equal(galaxy.classification.value, expected.classification, `${id} classification`);
    assert.equal(galaxy.viewpoint, expected.viewpoint, `${id} viewpoint`);
    assert.equal(galaxy.distance?.valueLy ?? null, expected.distanceLy, `${id} distance`);
    assert.equal(galaxy.catalogue.messier, expected.messier, `${id} Messier number`);
    assert.equal(galaxy.image.kind, expected.imageKind, `${id} image kind`);
  }
  for (const required of ['milky-way', 'andromeda', 'triangulum']) assert.ok(byId[required], required);
  assert.ok(new Set(galaxies.map(g => g.classification.value)).size >= 4, 'several galaxy types');
});

test('identities are unique: ids, names, aliases and catalogue numbers', () => {
  const seen = new Map();
  const claim = (label, owner) => {
    const key = label.toLowerCase();
    assert.ok(!seen.has(key) || seen.get(key) === owner, `"${label}" is used by ${seen.get(key)} and ${owner}`);
    seen.set(key, owner);
  };
  assert.equal(new Set(galaxies.map(g => g.id)).size, galaxies.length);
  for (const galaxy of galaxies) {
    claim(galaxy.id, galaxy.id);
    claim(galaxy.name, galaxy.id);
    for (const alias of galaxy.aliases) claim(alias, galaxy.id);
    for (const value of Object.values(galaxy.catalogue).filter(Boolean)) claim(value, galaxy.id);
    if (galaxy.catalogue.messier) assert.ok(galaxy.aliases.includes(galaxy.catalogue.messier), `${galaxy.id} lists ${galaxy.catalogue.messier} as an alias`);
    if (galaxy.catalogue.ngc && galaxy.name !== galaxy.catalogue.ngc) assert.ok(galaxy.aliases.includes(galaxy.catalogue.ngc), `${galaxy.id} lists its NGC number`);
  }
});

test('every source id exists, is a NASA page, and has a SCIENCE.md section with its link', () => {
  for (const galaxy of galaxies) {
    for (const id of galaxySourceIds(galaxy)) {
      const source = sourcesById[id];
      assert.ok(source, `${galaxy.id} cites unknown source ${id}`);
      assert.match(new URL(source.url).hostname, /(^|\.)nasa\.gov$/);
      assert.ok(sectionFor(id)?.includes(`](${source.url})`), `SCIENCE.md section for ${id}`);
    }
  }
});

test('each galaxy has a short description and 2–3 different facts, each word for word under its source', () => {
  for (const galaxy of galaxies) {
    assert.ok(galaxy.facts.length >= 2 && galaxy.facts.length <= 3, galaxy.id);
    assert.equal(new Set(galaxy.facts.map(f => f.text)).size, galaxy.facts.length, `${galaxy.id} repeats a fact`);
    for (const fact of galaxy.facts) {
      assert.ok(sectionFor(fact.sourceId).includes(`- Fact: ${fact.text}\n  - Page says: "`), `${galaxy.id}: "${fact.text}" with its supporting quote`);
    }
  }
});

test('distances: light-years, a rounded "about" display, and other NASA estimates kept, not merged', () => {
  for (const galaxy of outside) {
    const { distance } = galaxy;
    assert.ok(distance, `${galaxy.id} has a distance`);
    assert.equal(distance.unit, 'light-years');
    const shown = displayedLightYears(distance.display);
    assert.ok(Math.abs(shown - distance.valueLy) / distance.valueLy <= 0.05, `${galaxy.id}: "${distance.display}" rounds ${distance.valueLy}`);
    const expectedOthers = OTHER_NASA_ESTIMATES[galaxy.id] ?? [];
    assert.deepEqual(distance.otherEstimates.map(e => e.valueLy), expectedOthers, `${galaxy.id} other estimates`);
    for (const estimate of distance.otherEstimates) {
      assert.notEqual(estimate.valueLy, distance.valueLy, `${galaxy.id}: an "other" estimate equals the chosen one`);
      assert.ok(Math.abs(displayedLightYears(estimate.display) - estimate.valueLy) / estimate.valueLy <= 0.05, estimate.display);
    }
    if (expectedOthers.length) assert.match(distance.selection, /NASA pages differ/s, `${galaxy.id} explains the choice`);
  }
});

test('the NED cross-check passes a broad unit sanity check, without claiming scientific agreement', () => {
  for (const galaxy of outside) {
    const check = galaxy.distance.crossCheck;
    assert.equal(check.unit, 'Mpc');
    assert.ok(check.min <= check.median && check.median <= check.max, `${galaxy.id} median within range`);
    const ratio = (check.median * LIGHT_YEARS_PER_MPC) / galaxy.distance.valueLy;
    assert.ok(ratio > 0.6 && ratio < 1.6, `${galaxy.id}: NED median is ${ratio.toFixed(2)} × the NASA value`);
  }
});

test('distance disagreements are explicit without selecting a value from the NED median', () => {
  for (const galaxy of outside) {
    const d = galaxy.distance;
    assert.match(d.estimateNote, /NASA estimates this distance/);
    assert.doesNotMatch(d.selection, /closer to|closest to|nearer.*median/i);
    const difference = Math.abs(d.crossCheck.median * LIGHT_YEARS_PER_MPC - d.valueLy) / d.valueLy;
    const expected = difference > 0.15 ? 'discrepant-estimates' : d.otherEstimates.length ? 'multiple-estimates' : 'source-estimate';
    assert.equal(d.reviewStatus, expected, galaxy.id);
    assert.match(d.crossCheck.note, /not an uncertainty interval/);
  }
  for (const id of ['ngc-1300', 'whirlpool', 'sombrero']) {
    assert.equal(byId[id].distance.reviewStatus, 'discrepant-estimates');
  }
});

test('all twelve image pairs are ready and permissions are reviewed separately from file readiness', () => {
  for (const galaxy of galaxies) {
    const image = galaxy.image;
    assert.equal(image.status, 'ready', galaxy.id);
    assert.equal(image.permission.status, 'verified', galaxy.id);
    assert.match(image.permission.reviewed, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(image.permission.policyUrl.startsWith('https://'));
    assert.equal(image.permission.creditMustBeVisible, true);
    assert.match(image.permission.modifications, /Resized.*WebP/);
    assert.ok(image.permission.evidence.length >= 40);
  }
  assert.equal(byId.triangulum.image.permission.licenceUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(byId['milky-way'].image.licence, 'jpl-image-use-policy');
  assert.equal(byId.andromeda.image.licence, 'nasa-media-guidelines');
  for (const id of ['large-magellanic-cloud', 'small-magellanic-cloud']) {
    assert.match(byId[id].image.childCaption, /Ultraviolet light.*our eyes cannot see/);
  }
});

test('the schema rejects unreviewed ready images and zero dimensions', () => {
  const validate = new Ajv({ allErrors: true }).compile(schema);
  for (const mutate of [
    image => { delete image.permission; },
    image => { image.permission.status = 'needs-review'; },
    image => { image.detail.width = 0; },
    image => { image.thumbnail.height = 0; },
  ]) {
    const invalid = structuredClone(galaxies);
    mutate(invalid[0].image);
    assert.equal(validate(invalid), false);
  }
});

test('the collection is listed nearest first, the Milky Way first of all', () => {
  assert.equal(galaxies[0].id, 'milky-way');
  const values = outside.map(g => g.distance.valueLy);
  assert.deepEqual(values, [...values].sort((a, b) => a - b));
});

test('the SCIENCE.md galaxy distance table matches the data', () => {
  const section = science.split('## Galaxy distances\n')[1].split('\n## ')[0];
  const rows = section.split('\n').filter(line => line.startsWith('| ') && !line.startsWith('| ---') && !line.startsWith('| Galaxy'))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
  assert.equal(rows.length, galaxies.length);
  const number = cell => (cell === '—' ? null : Number(cell.replace(/,/g, '')));
  for (const galaxy of galaxies) {
    const row = rows.find(cells => cells[0] === galaxy.name);
    assert.ok(row, galaxy.name);
    const d = galaxy.distance;
    assert.equal(number(row[1]), d?.valueLy ?? null, `${galaxy.name} distance`);
    assert.equal(row[2], d ? d.sourceIds[0] : '—');
    assert.equal(row[3], d?.otherEstimates.length ? d.otherEstimates.map(e => e.valueLy.toLocaleString('en-GB')).join(', ') : '—');
    assert.equal(number(row[4]), d?.crossCheck.estimates ?? null);
    assert.equal(number(row[5]), d?.crossCheck.median ?? null);
  }
});

test('sky positions: J2000 equatorial coordinates for every galaxy outside ours, none for the Milky Way', () => {
  for (const galaxy of outside) {
    const { position } = galaxy.sky;
    assert.equal(position.frame, 'equatorial');
    assert.equal(position.epoch, 'J2000');
    assert.ok(position.raDeg >= 0 && position.raDeg < 360 && Math.abs(position.decDeg) <= 90, galaxy.id);
    assert.equal(position.name, galaxy.catalogue.ned, `${galaxy.id} position belongs to the same NED object`);
  }
  // The two Magellanic Clouds are far south; the northern Messier galaxies here are well north of the equator.
  for (const id of ['large-magellanic-cloud', 'small-magellanic-cloud']) assert.ok(byId[id].sky.position.decDeg < -60, id);
  for (const id of ['andromeda', 'triangulum', 'messier-81', 'cigar', 'pinwheel', 'whirlpool']) assert.ok(byId[id].sky.position.decDeg > 20, id);
});

test('the Milky Way is treated as the galaxy we are inside', () => {
  const milkyWay = byId['milky-way'];
  assert.equal(galaxies.filter(g => g.viewpoint === 'inside').length, 1);
  assert.equal(milkyWay.distance, null);
  assert.equal(milkyWay.sky, null);
  assert.equal(milkyWay.image.kind, 'artist-concept');
  assert.match(milkyWay.image.illustrationNote, /not a photograph/);
  assert.match(milkyWay.image.illustrationNote, /inside the Milky Way/);
  assert.match(milkyWay.summary.simple, /inside it/);
  assert.match(milkyWay.image.alt, /^Artist's illustration/);
  for (const galaxy of outside) assert.ok(!galaxy.image.illustrationNote, `${galaxy.id} is not an illustration`);
});

test('no text works out a distance from redshift', () => {
  for (const galaxy of galaxies) {
    const text = [galaxy.summary.simple, ...galaxy.facts.map(f => f.text), galaxy.distance?.selection ?? '', galaxy.distance?.context?.text ?? ''].join(' ');
    assert.doesNotMatch(text, /redshift|red-shift/i, galaxy.id);
  }
});

test('composite and false-colour images say so, using the source\'s own description', () => {
  for (const galaxy of galaxies) {
    const { image } = galaxy;
    if (image.wavelengths.some(w => w !== 'visible')) {
      assert.ok(image.composite, `${galaxy.id}: light we cannot see means the colours were assigned`);
      assert.ok(image.colourNote && image.colourNoteSourceId, `${galaxy.id} explains its colours`);
    }
    if (image.composite) assert.ok(image.colourNote, `${galaxy.id} describes how it was put together`);
    assert.equal(image.kind === 'composite', image.composite, `${galaxy.id} kind and composite agree`);
    if (image.kind === 'artist-concept') assert.equal(image.telescope, null);
    if (image.licence === 'cc-by-4.0') assert.match(image.credit, /ESA/, `${galaxy.id}: CC BY 4.0 images here are ESA/Hubble releases`);
  }
});

test('bundled images exist, keep the original aspect ratio and fit their size limits', () => {
  for (const galaxy of galaxies) {
    const { image } = galaxy;
    const aspect = image.original.width / image.original.height;
    for (const [key, maxWidth, maxHeight, maxBytes] of [['thumbnail', 400, 300, 40_000], ['detail', 1600, 1200, 600_000]]) {
      const file = image[key];
      const path = new URL(`../../public/${file.file}`, import.meta.url);
      if (image.status === 'pending') {
        assert.ok(!existsSync(path), `${galaxy.id}: pending image must not have a file yet`);
        assert.equal(file.width, 0);
        continue;
      }
      const buffer = readFileSync(path);
      assert.deepEqual(webpSize(buffer), { width: file.width, height: file.height }, `${galaxy.id} ${key} size in the data`);
      assert.ok(file.width <= maxWidth && file.height <= maxHeight, `${galaxy.id} ${key} fits ${maxWidth}×${maxHeight}`);
      assert.ok(file.width === maxWidth || file.height === maxHeight || file.width === image.original.width, `${galaxy.id} ${key} uses the space available`);
      assert.ok(Math.abs(file.width / file.height - aspect) / aspect < 0.01, `${galaxy.id} ${key} keeps the aspect ratio`);
      assert.ok(buffer.length <= maxBytes, `${galaxy.id} ${key} is ${buffer.length} bytes`);
    }
  }
});

test('every bundled galaxy file has an ASSET_CREDITS.md row with its exact credit, and nothing else is bundled', () => {
  const rows = credits.split('\n').filter(line => line.startsWith('| `public/assets/galaxies/'));
  const expected = [];
  for (const galaxy of galaxies.filter(g => g.image.status === 'ready')) {
    for (const key of ['detail', 'thumbnail']) {
      const file = `public/${galaxy.image[key].file}`;
      expected.push(file);
      const row = rows.find(line => line.startsWith(`| \`${file}\` |`));
      assert.ok(row, `no credit row for ${file}`);
      const [, owner, source, , attribution] = row.split(' | ');
      assert.equal(owner, galaxy.image.credit, `${file}: creator must match the data's credit word for word`);
      assert.equal(attribution, galaxy.image.credit, `${file}: required attribution must match the data's credit word for word`);
      assert.ok(source.includes(galaxy.image.original.url), `${file}: original source URL`);
      assert.ok(row.includes(galaxy.image.permission.policyUrl), `${file}: reviewed usage terms`);
      if (galaxy.image.permission.licenceUrl) assert.ok(row.includes(galaxy.image.permission.licenceUrl), `${file}: licence link`);
      assert.match(row, /\| \d{4}-\d{2}-\d{2} \|$/, `${file}: verification date`);
    }
  }
  const folder = new URL('../../public/assets/galaxies/', import.meta.url);
  const bundled = existsSync(folder) ? readdirSync(folder).map(name => `public/assets/galaxies/${name}`) : [];
  assert.deepEqual(bundled.sort(), expected.sort(), 'every file in public/assets/galaxies is in the data and credited');
  assert.equal(rows.length, expected.length, 'no credit rows for files that are not bundled');
  for (const galaxy of galaxies.filter(g => g.image.status === 'pending')) {
    assert.ok(credits.includes(galaxy.image.original.url), `${galaxy.id}: pending image is listed in ASSET_CREDITS.md`);
  }
});

test('the NASA type wording shown in quotation marks is word for word from a quote under its source', () => {
  // The panel shows "NASA's words: “…”", so the wording must be copied exactly, not adapted (for example to the singular).
  for (const galaxy of galaxies) {
    const quotes = galaxy.classification.sourceIds.flatMap(id => [...sectionFor(id).matchAll(/says: "([^"]+)"/g)].map(m => m[1].toLowerCase()));
    assert.ok(quotes.some(quote => quote.includes(galaxy.classification.nasaWording.toLowerCase())), `${galaxy.id}: "${galaxy.classification.nasaWording}"`);
  }
});

test('recorded sky positions are valid J2000 coordinates and are never used to place galaxies on the map', () => {
  for (const galaxy of galaxies) {
    if (!galaxy.sky) continue;
    const { raDeg, decDeg, epoch, frame } = galaxy.sky.position;
    assert.ok(raDeg >= 0 && raDeg < 360, `${galaxy.id}: right ascension within 0–360°, no wraparound value`);
    assert.ok(decDeg >= -90 && decDeg <= 90, `${galaxy.id}: declination within ±90°`);
    assert.equal(epoch, 'J2000');
    assert.equal(frame, 'equatorial');
  }
  // The map is laid out from distances only (see src/utils/cosmosLayout.js), so sky coordinates cannot leak into it.
  const layout = readFileSync(new URL('../../src/utils/cosmosLayout.js', import.meta.url), 'utf8');
  assert.doesNotMatch(layout, /raDeg|decDeg|\.sky\b/);
});

