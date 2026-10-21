# Cosmos Quest

A child-friendly solar system explorer. This repository starts with a sourced eight-planet facts page; interactive 3D exploration is planned in [the roadmap](docs/ROADMAP.md).

## Development

Use Node.js 24.

```sh
npm ci
npm run dev
```

Before submitting a change:

```sh
npm run lint
npm test
npm run build
```

`npm run preview` serves the production build locally.

## Repository guide

- [AGENTS.md](AGENTS.md): contributor rules; agent.md is a pointer.
- src/data/: planet JSON and its JSON Schema; each fact cites a source.
- src/components/, scenes/, features/, hooks/, utils/: reserved application boundaries.
- public/assets/: bundled assets only after licence review.
- tests/: mirrors src/; no colocated tests.
- [Science references](docs/SCIENCE.md), [asset credits](docs/ASSET_CREDITS.md), [architecture](docs/ARCHITECTURE.md).

## GitHub Actions and Pages

Every PR runs one CI job: install, lint, test, build. Pushes to main run the same checks and a dependent Pages deployment. In Settings → Pages → Build and deployment, choose **GitHub Actions**. Repository/environment policies may require approval before the first deployment. No Vercel account or deployment secret is needed.
