# Contributor and agent instructions

Build a child-friendly solar system explorer with accurate, traceable facts.

- This file is authoritative; agent.md only points here.
- Keep scientific content in `src/data/`: planets in `planets.json`, the Sun in `sun.json`, both validated against `planets.schema.json` (the Sun uses `definitions/body`). Every fact, text block, measurement and moon count cites source ids listed in `src/data/sources.json`, each with a matching heading and link in `docs/SCIENCE.md`. Facts must appear word for word under their source, and the SCIENCE.md tables must match the data; tests enforce both.
- Use NASA or ESA primary sources. Date volatile values such as moon counts and say when NASA pages disagree. Extend the sourceId pattern, schema and tests together if adding ESA sources.
- Never describe Jupiter, Saturn, Uranus, Neptune or the Sun as having a solid surface or ground to stand on. Give their gravity and temperature at the 1-bar level (photosphere for the Sun) and say so.
- Keep measurements, calculated comparisons and the illustrative 3D model clearly separated and labelled. All scale changes go through `src/utils/scale.js` and must be listed in `SCALE_CHANGES`. Keep the real order of sizes and distances.
- Keep the Stage 1 planet facts unchanged as each planet's first fact.
- Keep tests under `tests/`, mirroring `src/`. Browser tests go in `tests/e2e/`. Do not mix in colocated tests.
- Record every bundled asset file and its verified licence in docs/ASSET_CREDITS.md. Never assume NASA or ESA credit implies permission. Procedural textures are generated in code and are not NASA imagery.
- Keep shared UI in components/, 3D orchestration in scenes/ (the only folder that imports Three.js), user capabilities and navigation in features/, reusable hooks in hooks/ when a hook-based framework is introduced, and pure helpers in utils/. `scenes/appearance.js` holds illustrative looks, never science.
- Preserve keyboard access, readable text, reduced-motion support, 44-pixel touch targets, the 2D fallback and mobile performance settings as features are added.
- Use Node 24 and npm ci. Before submitting changes run npm run lint, npm test, npm run build and npm run test:e2e. Commit package-lock.json. Three.js is pinned to an exact version.
- Stage 2 is complete. Do not add quizzes, missions or experiments until stage 3 is agreed.
- Do not commit credentials or add analytics, accounts, or paid services without an explicit requirement.
