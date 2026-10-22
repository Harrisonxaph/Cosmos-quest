# Cosmos Quest

A child-friendly solar system explorer. Fly around the Sun and the eight planets in 3D and find out what each world is like, with facts and measurements from NASA.

## What you can do

- **Explore in 3D:** choose the Sun or any planet with the buttons, by tapping it in the picture, or from the planet list. The camera flies there smoothly. Drag to turn the view, pinch or scroll to zoom, or use the on-screen zoom and rotate buttons.
- **Learn about each world:** size, mass, gravity, distance from the Sun, length of day and year, temperature, dated moon counts, what it is made of and amazing facts, each linked to its NASA source.
- **Simple or detailed:** switch between short child-friendly explanations and fuller detail. The choice is remembered.
- **Compare with Earth:** how wide, how heavy you would feel, how long a day and year last, and how far from the Sun.
- **Stay in control:** go back to the whole solar system, step to the next or previous world, pause the planets, and turn surface detail or labels on and off.
- **Planet Quiz:** five friendly multiple-choice questions per round, with three answers each. Every answer gets a short explanation and a NASA source link. "Explore this planet" takes you to that world and keeps your place in the quiz. There is no timer and no penalty, and progress is only kept for this visit.
- **Honest science:** the 3D picture is clearly labelled as not to scale, every scale change is explained, and the gas and ice giants are never shown as having ground to stand on.

It also works without 3D. On devices that can't show it, or with `?view=2d` added to the address, every world and fact is still available.

### Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `0` | The Sun |
| `1` to `8` | Mercury to Neptune |
| `←` `→` or `B` `N` | Previous / next world |
| `Esc` or `O` | Back to the solar system |
| `Space` or `P` | Pause / play |
| `+` `−` | Zoom in / out |
| `A` `D` | Rotate the view |
| `M` | Simple / detailed facts |

Each world has its own link, such as `#/saturn`, the quiz is at `#/quiz`, and the browser Back button works. During the quiz, answer with Tab and Enter or Space; the explorer shortcuts pause so a stray key can't jump away mid-question (Esc still goes back to exploring, and the quiz waits).

## Development

Use Node.js 24.

```sh
npm ci
npm run dev
```

Before submitting a change:

```sh
npm run lint
npm test            # unit tests: data, citations, quiz questions and scoring, comparisons, scale, navigation
npm run build
npx playwright install chromium   # first time only
npm run test:e2e    # browser tests against the build in dist/
```

`npm run preview` serves the production build locally.

## Repository guide

- [AGENTS.md](AGENTS.md): contributor rules; agent.md is a pointer.
- `src/data/`: planet and Sun JSON, quiz questions, the source list and the JSON Schemas. Every value and question cites a NASA source.
- `src/utils/`, `src/features/`, `src/components/`, `src/scenes/`: pure helpers, navigation and wiring, reusable UI, and the Three.js scene. See [architecture](docs/ARCHITECTURE.md).
- `public/assets/`: bundled assets only after licence review (none yet; surface patterns are drawn by code).
- `tests/`: mirrors `src/`; `tests/e2e/` holds the browser tests. No colocated tests.
- [Science references](docs/SCIENCE.md), [asset credits](docs/ASSET_CREDITS.md), [roadmap](docs/ROADMAP.md).

## Design principles

No accounts, analytics, adverts or external chat. Facts come from NASA and are cited. The app respects reduced-motion settings, works with keyboard and touch, and keeps working without 3D.

## GitHub Actions and Pages

Every PR runs one CI job: install, lint, unit tests, build, then browser tests. Pushes to main run the same checks and a dependent Pages deployment. In Settings → Pages → Build and deployment, choose **GitHub Actions**. Repository/environment policies may require approval before the first deployment. No Vercel account or deployment secret is needed.

## Licence

Code is released under the [MIT Licence](LICENSE). Three.js is MIT-licensed by its authors. Facts are paraphrased from NASA pages listed in [docs/SCIENCE.md](docs/SCIENCE.md).
