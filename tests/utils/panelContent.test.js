import { test } from 'node:test';
import assert from 'node:assert/strict';
import planets from '../../src/data/planets.json' with { type: 'json' };
import sun from '../../src/data/sun.json' with { type: 'json' };
import sources from '../../src/data/sources.json' with { type: 'json' };
import { measurementRows, noSurfaceNotice, bodyHeadline, bodySourceIds, modelNote } from '../../src/utils/panelContent.js';

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
