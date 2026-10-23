import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import galaxies from '../../src/data/galaxies.json' with { type: 'json' };
import { galaxySourceIds } from './galaxy-checks.js';

const bodies = [sun, ...planets];
const science = readFileSync(new URL('../../docs/SCIENCE.md', import.meta.url), 'utf8');
const sourceIds = new Set(sources.map(source => source.id));

function citedIds(body) {
  return [
    ...body.summary.sourceIds,
    ...body.measurements.sourceIds,
    ...body.temperatureContext.sourceIds,
    ...body.moons.sourceIds,
    ...body.composition.sourceIds,
    ...body.facts.map(fact => fact.sourceId),
  ];
}

function tableRows(heading) {
  const section = science.split(`## ${heading}\n`)[1].split('\n## ')[0];
  return section.split('\n').filter(line => line.startsWith('| ') && !line.startsWith('| ---') && !line.startsWith('| Body'))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
}

const parse = cell => (cell === '—' ? null : Number(cell));

test('sources are unique NASA pages with retrieval dates', () => {
  assert.equal(sourceIds.size, sources.length, 'duplicate source id');
  for (const source of sources) {
    assert.match(source.id, /^nasa-[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.match(new URL(source.url).hostname, /(^|\.)nasa\.gov$/, source.url);
    assert.match(source.retrieved, /^\d{4}-\d{2}-\d{2}$/);
    if (source.pageUpdated) assert.ok(source.pageUpdated <= source.retrieved, source.id);
  }
});

test('every cited source exists, and every source is cited', () => {
  const used = new Set();
  for (const body of bodies) {
    for (const id of citedIds(body)) {
      assert.ok(sourceIds.has(id), `${body.id} cites unknown source ${id}`);
      used.add(id);
    }
  }
  for (const galaxy of galaxies) {
    for (const id of galaxySourceIds(galaxy)) {
      assert.ok(sourceIds.has(id), `${galaxy.id} cites unknown source ${id}`);
      used.add(id);
    }
  }
  for (const id of sourceIds) assert.ok(used.has(id), `${id} is never cited`);
});

test('SCIENCE.md has a section for every source, with its link', () => {
  for (const source of sources) {
    const section = science.split(`\n## ${source.id}\n`)[1]?.split('\n## ')[0];
    assert.ok(section, `missing section ${source.id}`);
    assert.ok(section.includes(`](${source.url})`), `${source.id} link`);
  }
});

test('the SCIENCE.md measurement table matches the data exactly', () => {
  const rows = tableRows('Measured values used in the app');
  assert.equal(rows.length, bodies.length);
  const keys = ['diameterKm', 'volumetricMeanRadiusKm', 'massE24Kg', 'gravityMs2', 'meanDistanceFromSunE6Km', 'rotationPeriodHours', 'dayLengthHours', 'orbitalPeriodDays', 'obliquityDeg', 'temperatureC'];
  for (const body of bodies) {
    const row = rows.find(cells => cells[0] === body.name);
    assert.ok(row, `no table row for ${body.name}`);
    keys.forEach((key, index) => assert.equal(parse(row[index + 1]), body.measurements[key], `${body.name} ${key}`));
  }
});

test('the SCIENCE.md moon table matches the data', () => {
  const rows = tableRows('Moon counts');
  for (const body of bodies) {
    const row = rows.find(cells => cells[0] === body.name);
    assert.ok(row, body.name);
    assert.equal(Number(row[1]), body.moons.count, `${body.name} count`);
    assert.equal(row[2], body.moons.asOf, `${body.name} date`);
  }
});

function displayedText(body) {
  return [
    body.summary.simple, body.summary.detailed,
    body.temperatureContext.simple, body.temperatureContext.detailed,
    body.composition.simple, body.composition.detailed,
    body.moons.note ?? '',
    ...body.facts.map(fact => fact.text),
  ];
}

test('worlds without solid ground are never described as having a surface to stand on', () => {
  for (const body of bodies.filter(b => !b.hasSolidSurface)) {
    for (const text of displayedText(body)) {
      for (const match of text.matchAll(/surface|ground|land on|stand on/gi)) {
        const before = text.slice(Math.max(0, match.index - 40), match.index).toLowerCase();
        const clause = before.split(/[.;:!?]/).pop();
        const negated = /\b(no|not|never|without|nowhere|doesn't|does not)\b/.test(clause);
        const visibleLayer = /visible ['‘]?$/.test(before);
        assert.ok(negated || visibleLayer, `${body.name}: "${text}" mentions "${match[0]}" without saying there is none`);
      }
    }
  }
});

test('giant planets explain the 1-bar level wherever temperature is described', () => {
  for (const body of planets.filter(planet => !planet.hasSolidSurface)) {
    assert.match(body.temperatureContext.detailed, /1-bar level/, body.name);
    assert.match(body.temperatureContext.simple, /clouds/, body.name);
  }
});

test('simple explanations are shorter than detailed ones', () => {
  for (const body of bodies) {
    for (const block of ['summary', 'temperatureContext', 'composition']) {
      assert.ok(body[block].simple.length < body[block].detailed.length, `${body.id} ${block}`);
    }
  }
});

test('Pluto is not presented as one of the eight planets', () => {
  assert.ok(!bodies.some(body => /pluto/i.test(body.id)));
});
