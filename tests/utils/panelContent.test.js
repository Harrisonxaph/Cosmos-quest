import { test } from 'node:test';
import assert from 'node:assert/strict';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import { measurementRows, noSurfaceNotice, bodyHeadline, bodySourceIds, modelNote, sceneCardContent, cardFeature } from '../../src/utils/panelContent.js';
import { earthComparisons } from '../../src/utils/compare.js';

const bodies = [sun, ...planets];
const byId = Object.fromEntries(bodies.map(body => [body.id, body]));
const row = (body, id, mode = 'simple') => measurementRows(body, mode).find(r => r.id === id);

test('every panel shows the required measurements in both modes', () => {
  for (const body of bodies) {
    for (const mode of ['simple', 'detailed']) {
      const ids = measurementRows(body, mode).map(r => r.id);
      for (const required of ['diameter', 'mass', 'gravity', 'distance', 'temperature', 'moons']) assert.ok(ids.includes(required), `${body.id} ${mode} ${required}`);
      if (body.kind !== 'star') for (const required of ['day', 'year']) assert.ok(ids.includes(required), `${body.id} ${mode} ${required}`);
      for (const r of measurementRows(body, mode)) assert.doesNotMatch(`${r.value} ${r.note ?? ''}`, /NaN|undefined|null/, `${body.id} ${r.id}`);
    }
  }
});

test('detailed mode adds rotation, tilt and rings', () => {
  const simple = measurementRows(byId.venus, 'simple').map(r => r.id);
  const detailed = measurementRows(byId.venus, 'detailed').map(r => r.id);
  for (const id of ['rotation', 'tilt', 'rings']) {
    assert.ok(!simple.includes(id), id);
    assert.ok(detailed.includes(id), id);
  }
  assert.match(row(byId.venus, 'rotation', 'detailed').note, /backwards/);
});

test('giant planets show gravity at the 1-bar level, never as surface gravity', () => {
  for (const body of planets.filter(p => !p.hasSolidSurface)) {
    for (const mode of ['simple', 'detailed']) {
      const gravity = row(body, 'gravity', mode);
      assert.equal(gravity.label, 'Gravity');
      assert.match(gravity.note, /1-bar level.*no solid surface/);
      assert.match(row(body, 'temperature', mode).note, /1-bar level/);
    }
  }
  assert.equal(row(byId.earth, 'gravity').label, 'Surface gravity');
  assert.match(row(sun, 'gravity').note, /photosphere/);
  assert.equal(row(byId.saturn, 'gravity').value, '9.0 m/s²');
});

test('moon counts show the date of the count', () => {
  assert.equal(row(byId.jupiter, 'moons').value, '115');
  assert.equal(row(byId.jupiter, 'moons').note, 'NASA count as of April 2026');
  assert.equal(row(byId.saturn, 'moons').note, 'NASA count as of June 2026');
});

test('the Sun shows distance from Earth and its spin instead of a day and year', () => {
  assert.equal(row(sun, 'distance').label, 'Average distance from Earth');
  assert.equal(row(sun, 'rotation').value, '25.4 Earth days');
  assert.match(row(sun, 'rotation').note, /16° latitude/);
  assert.equal(row(sun, 'day'), undefined);
  assert.equal(row(sun, 'year'), undefined);
  assert.equal(row(sun, 'moons').value, '0');
  assert.match(row(sun, 'moons').note, /planets and their moons travel around it/);
});

test('no-surface notices appear exactly for the Sun and the giant planets', () => {
  for (const body of bodies) {
    const notice = noSurfaceNotice(body);
    if (body.hasSolidSurface) assert.equal(notice, null, body.id);
    else assert.match(notice, /no solid surface/, body.id);
  }
});

test('headlines, sources and model notes', () => {
  assert.equal(bodyHeadline(byId.saturn), 'Gas giant · sixth planet from the Sun');
  assert.equal(bodyHeadline(sun), 'Star · the centre of our solar system');
  const known = new Set(sources.map(s => s.id));
  for (const body of bodies) {
    const ids = bodySourceIds(body);
    assert.equal(new Set(ids).size, ids.length, `${body.id} duplicate sources`);
    for (const id of ids) assert.ok(known.has(id), id);
    assert.match(modelNote(body), /3D view/);
  }
});

// Hand-written expectations for the facts card (not read from the data being tested).
const CARD_KEY = {
  sun: { classification: 'Star', place: 'The centre of our solar system', noSurface: true, time: '25.4 Earth days' },
  mercury: { classification: 'Rocky planet', place: 'First planet from the Sun', noSurface: false, time: '88 Earth days' },
  earth: { classification: 'Rocky planet', place: 'Third planet from the Sun', noSurface: false, time: '365 Earth days' },
  mars: { classification: 'Rocky planet', place: 'Fourth planet from the Sun', noSurface: false, time: '687 Earth days' },
  saturn: { classification: 'Gas giant', place: 'Sixth planet from the Sun', noSurface: true, time: '29 Earth years' },
  neptune: { classification: 'Ice giant', place: 'Eighth planet from the Sun', noSurface: true, time: '164 Earth years' },
};

test('the facts card names each world, its kind and its place, with three short facts', () => {
  for (const [id, expected] of Object.entries(CARD_KEY)) {
    const card = sceneCardContent(byId[id], byId.earth);
    assert.equal(card.name, byId[id].name);
    assert.equal(card.classification, expected.classification, id);
    assert.equal(card.place, expected.place, id);
    assert.equal(card.facts.length, 3, id);
    assert.deepEqual(card.facts.map(f => f.id), ['size', id === 'sun' ? 'spin' : 'year', 'feature']);
    assert.ok(card.facts[1].text.includes(expected.time), `${id}: ${card.facts[1].text}`);
    assert.equal(Boolean(card.noSurface), expected.noSurface, id);
  }
});

test('giant planets and the Sun say they have no solid surface; nothing gives them ground', () => {
  for (const body of bodies.filter(b => !b.hasSolidSurface)) {
    const card = sceneCardContent(body, byId.earth);
    assert.match(card.noSurface, /no solid surface\.$/, body.id);
    const text = [card.noSurface, ...card.facts.map(f => f.text)].join(' ');
    assert.doesNotMatch(text, /stand(ing)? on|its (solid )?ground|on the surface/i, body.id);
  }
});

test('the card reuses the panel\'s sourced wording instead of new copies, and leaves out moon counts', () => {
  for (const body of bodies) {
    const card = sceneCardContent(body, byId.earth);
    const comparisons = Object.fromEntries(earthComparisons(body, byId.earth).map(c => [c.id, c.simple]));
    if (body.id !== 'earth') assert.equal(card.facts[0].text, comparisons.width, body.id);
    const time = card.facts[1].text;
    if (body.id !== 'earth') assert.equal(time, body.kind === 'star' ? comparisons.day : comparisons.year, body.id);
    const feature = card.facts[2];
    assert.ok(body.facts.some(f => f.text === feature.text && f.sourceId === feature.sourceId), `${body.id}: the feature is one of its sourced facts`);
    assert.ok(sources.some(s => s.id === feature.sourceId), feature.sourceId);
    for (const fact of card.facts) assert.doesNotMatch(fact.text, /\bmoons?\b/i, `${body.id}: no moon counts`);
    assert.deepEqual(card.facts.map(f => f.kind), [body.id === 'earth' ? 'measured' : 'calculated', 'measured', 'fact'], body.id);
  }
});

test('the card\'s feature skips facts that repeat its size or order lines', () => {
  assert.equal(cardFeature(byId.mars).text.includes('Olympus Mons'), true);
  assert.doesNotMatch(cardFeature(byId.sun).text, /wider/);
  assert.doesNotMatch(cardFeature(byId.neptune).text, /eighth/);
  assert.equal(cardFeature(byId.saturn), byId.saturn.facts[0], 'the Stage 1 fact is used when it fits');
});
