import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import planets from '../../src/data/planets.json' with { type: 'json' };
import schema from '../../src/data/planets.schema.json' with { type: 'json' };

const validate = new Ajv({ allErrors: true }).compile(schema);
const expected = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

test('all eight planets have schema-valid required fields and correct identities/order', () => {
  assert.ok(validate(planets), JSON.stringify(validate.errors));
  assert.deepEqual(planets.map(p => p.name), expected);
  assert.deepEqual(planets.map(p => p.id), expected.map(n => n.toLowerCase()));
  assert.deepEqual(planets.map(p => p.orderFromSun), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('every required field is enforced by the schema', () => {
  for (const field of schema.items.required) {
    const invalid = structuredClone(planets);
    delete invalid[0][field];
    assert.equal(validate(invalid), false, field);
  }
  for (const field of schema.items.properties.facts.items.required) {
    const invalid = structuredClone(planets);
    delete invalid[0].facts[0][field];
    assert.equal(validate(invalid), false, field);
  }
});

test('every fact links to its own NASA reference in SCIENCE.md', () => {
  const science = readFileSync(new URL('../../docs/SCIENCE.md', import.meta.url), 'utf8');
  for (const planet of planets) {
    for (const fact of planet.facts) {
      assert.equal(fact.sourceId, `nasa-${planet.id}`);
      const section = science.split(`## ${fact.sourceId}\n`)[1]?.split('\n## ')[0];
      assert.ok(section, fact.sourceId);
      assert.ok(section.includes(fact.text), fact.text);
      assert.ok(section.includes(`https://science.nasa.gov/${planet.id}/`));
    }
  }
});
