# Cosmos Quest

A child-friendly solar system explorer. Fly around the Sun and the eight planets in 3D and find out what each world is like, with facts and measurements from NASA.

## Release status

First family release candidate (Release 1): the explorer, Planet Quiz, Discovery Missions and Science Experiments, checked for iPad use. Automated tests cover Chromium, WebKit (iPad emulation) and the 2D view. Testing on a real iPad, in Safari and with VoiceOver is done by hand with [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) before each release. Progress and settings last only until the page is closed or reloaded. Nothing is stored, and there are no accounts or tracking.

## What you can do

The activity bar at the top switches between **Explore**, **Discovery Missions**, **Science Experiments** and **Planet Quiz**, and highlights the one you are in. Each activity has a visible way back to exploring, and its progress waits for you. **How to explore**, under the 3D view, gives short tips for choosing, turning, zooming and pausing.


- **Explore in 3D:** choose the Sun or any planet with the buttons, by tapping it in the picture, or from the planet list. The camera flies there smoothly. Drag to turn the view, pinch or scroll to zoom, or use the on-screen zoom and rotate buttons.
- **Learn about each world:** size, mass, gravity, distance from the Sun, length of day and year, temperature, dated moon counts, what it is made of and amazing facts, each linked to its NASA source.
- **Simple or detailed:** switch between short child-friendly explanations and fuller detail. The choice is remembered.
- **Compare with Earth:** how wide, how heavy you would feel, how long a day and year last, and how far from the Sun.
- **Stay in control:** go back to the whole solar system, step to the next or previous world, pause the planets, and turn surface detail or labels on and off.
- **Discovery Missions:** three short guided missions: *Meet our rocky neighbours*, *Giants without ground* and *Understanding space*. Each has an introduction, 3–5 numbered steps shown one at a time, and a recap. A step asks you to explore a world and press “I’ve found it” when you spot something (just opening the world doesn’t count), or to choose an answer (for Saturn and Uranus, after exploring that planet). Every discovery shows a short explanation with its NASA source. You can leave any time with “Back to exploring”, and a “Back to the mission” bar keeps your place for this visit, returning you to the same spot on the page. Missions and the quiz keep separate progress.
- **Science Experiments:** two hands-on learning models. In the **Gravity lab**, choose a mass in kilograms and a planet, make an optional guess, then see the pull of gravity in newtons worked out with F = m × g, compared with Earth. Your mass stays the same, and the giant planets are measured at the 1-bar level because they have no ground. In **Build a tiny solar system**, choose a model Earth from 0.5 to 5 cm wide and see how big the Sun and planets would be, and how far apart, at that scale. Results show which numbers are NASA measurements and which are calculated. Settings are kept for this visit.
- **Planet Quiz:** five friendly multiple-choice questions per round, with three answers each. Every answer gets a short explanation and a NASA source link. "Explore this planet", or "Back to exploring" before answering, keeps your place in the quiz so you can look something up and come back. There is no timer and no penalty, and progress is only kept for this visit.
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

Each world has its own link, such as `#/saturn`, the quiz is at `#/quiz`, missions are at `#/missions`, experiments are at `#/experiments`, and the browser Back button works. During the quiz and missions, answer with Tab and Enter or Space; the explorer shortcuts pause so a stray key can't jump away mid-question (Esc still goes back to exploring, and the quiz or mission waits).

## Development

Use Node.js 24.

```sh
npm ci
npm run dev
```

Before submitting a change:

```sh
npm run lint
npm test            # unit tests: data, citations, quiz questions and scoring, missions and their completion rules, experiment calculations and input checks, comparisons, scale, navigation
npm run build
npx playwright install chromium   # first time only
npm run test:e2e    # browser tests against the build in dist/
npx playwright install webkit     # optional, first time only
npm run test:e2e:webkit           # critical journeys in WebKit with iPad emulation (CI runs this too)
```

`npm run preview` serves the production build locally.

## Repository guide

- [AGENTS.md](AGENTS.md): contributor rules; agent.md is a pointer.
- `src/data/`: planet and Sun JSON, quiz questions, mission and experiment definitions, the source list and the JSON Schemas. Every value, question and mission step cites a NASA source.
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
