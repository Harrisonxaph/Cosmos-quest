# Contributor and agent instructions

Build a child-friendly solar system explorer with accurate, traceable facts.

- This file is authoritative; agent.md only points here.
- Keep planet content in src/data/planets.json and validate it against planets.schema.json. Every fact needs a sourceId and a matching NASA or ESA reference in docs/SCIENCE.md. Extend the sourceId schema/test together if adding ESA sources.
- Keep tests under tests/, mirroring src/. Do not mix in colocated tests.
- Record every bundled asset file and its verified licence in docs/ASSET_CREDITS.md. Never assume NASA or ESA credit implies permission.
- Keep shared UI in components/, 3D orchestration in scenes/, user capabilities in features/, reusable hooks in hooks/ when a hook-based framework is introduced, and pure helpers in utils/.
- Preserve keyboard access, readable text, reduced-motion support, and touch controls as features are added. Label illustrative scale.
- Use Node 24 and npm ci. Before submitting changes run npm run lint, npm test, and npm run build. Commit package-lock.json.
- Do not commit credentials or add analytics, accounts, or paid services without an explicit requirement.
