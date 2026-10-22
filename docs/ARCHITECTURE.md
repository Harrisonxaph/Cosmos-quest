# Architecture

Cosmos Quest is a static Vite app written in plain JavaScript modules, with no framework, server or accounts. GitHub Pages hosts the built `dist/` folder.

## Rendering library

Stage 2 adopted **Three.js 0.180.0** (MIT licence), pinned exactly in `package.json`. It is the standard WebGL library, works in mobile browsers and is already used in the owner's other projects. `OrbitControls` from the Three.js add-ons provides drag-to-rotate and pinch or scroll zoom.

## Folders

| Folder | Owns | Rules |
| --- | --- | --- |
| `src/data/` | Scientific content: `planets.json`, `sun.json`, `sources.json`, `quiz.json` and their schemas | Every value cites a source listed in `sources.json` and `docs/SCIENCE.md`. No presentation settings. |
| `src/utils/` | Pure helpers: formatting, Earth comparisons (`compare.js`), illustrative scale (`scale.js`), panel content (`panelContent.js`) | No DOM, no Three.js, so everything can be tested in Node. |
| `src/features/` | User capabilities: `navigation.js` (pure state machine, URL hash and keyboard map), `quiz.js` (pure quiz state, round picking and scoring) and `explorer.js` (wires state, panels, quiz, controls and the scene) | Navigation rules live in `navigation.js`, not in event handlers. |
| `src/components/` | Reusable UI: information panel, quiz panel, world selector, Stage 1 planet list, DOM helper | Text is set with `textContent` only. Components do not import Three.js. |
| `src/scenes/` | 3D: `solarSystemScene.js` (scene, camera flights, picking, labels, cleanup), `proceduralTextures.js`, `appearance.js` | Only this folder imports Three.js. `appearance.js` holds illustrative looks, never science. |
| `src/hooks/` | Reserved for a future hook-based UI framework | None is used yet. |

## How it fits together

1. `main.js` loads the data and calls `startExplorer`.
2. `explorer.js` creates the navigation store and renders the panel, selector and planet list straight away, so facts appear before any 3D code downloads.
3. If WebGL is available (and the URL doesn't say `?view=2d`), `explorer.js` dynamically imports `scenes/solarSystemScene.js`. Vite puts Three.js in that separate chunk, so the first page load needs well under 100 kB of app code and the facts appear before the 3D scene arrives.
4. Every user action (button, keyboard shortcut, tap in the scene, Stage 1 "Explore" button, browser Back) dispatches an action to the navigation store. One listener updates the panel, controls, URL hash and scene, so they never disagree.
5. The Planet Quiz is a third panel view (`#/quiz`) beside the overview and world panels, so it needs no 3D. See "Planet Quiz" below.
6. If WebGL is missing, the scene fails to load or the graphics context is lost, the scene area shows a message and the 3D-only controls hide. The panels, selector and planet list keep working.

## Planet Quiz

- **Questions** (`src/data/quiz.json`): each has an id, the world it is about, three answers with stable ids, the correct answer id, an explanation and source ids. A `basis` names what supports the answer: an exact fact, a phrase in a panel's summary or composition, a measured value, or a ranking across the planets (for example the smallest distance from the Sun). Tests check each basis against `src/data/` and require the sources to be ones the information panels already cite.
- **Independent answer key** (`tests/data/quiz-answer-key.js`): a hand-written list of the right answer for every question, with the evidence the app must show. It never reads `quiz.json`, so changing a correct answer in the data fails the tests. `tests/data/quiz-checks.js` compares each designated answer with the key, the measured data or ranking, its supporting text and its explanation; mutation tests mark every wrong answer correct, for every question type, and expect a failure. Browser tests also pick answers from the key and check the app's verdict.
- **State and scoring** (`src/features/quiz.js`): a pure reducer with `idle → question → feedback → … → results`. A round picks five different questions, preferring a different world for each and avoiding questions already seen this visit while fresh ones remain. Answers are shuffled, but correctness compares answer ids, so shuffling cannot change it. A second answer or skipping ahead is ignored. Feedback headings and result messages are always encouraging.
- **Panel** (`src/components/quizPanel.js`): renders the state only. Correct and chosen answers are labelled in words and with ✓ symbols, plus border style, not colour alone. Each screen marks one heading with `data-focus-target`; after starting, answering, moving on or finishing, `explorer.js` moves focus there. After an answer, the focused heading's accessible name includes the verdict and the correct answer ("Good try! You chose Oxygen. The correct answer is Nitrogen."), and the explanation is then read through the page's polite live region. The results message is announced the same way.
- **Exploring mid-quiz:** every unanswered question has a visible "Back to exploring" button (as well as Escape) that keeps the child's place. "Explore this planet" selects that world in the normal explorer. The quiz store keeps its state in memory, and every other panel shows a "Back to the quiz" bar until the round is finished or reset. The header button also shows the current question. While the quiz is showing, explorer keyboard shortcuts are switched off (`actionAllowedInView`) except Escape.

## Scientific integrity in code

- **Measurements vs models:** panels label NASA measurements ("Measured · NASA"), values worked out from them ("Calculated") and the 3D view ("Model"). All scale changes are produced by `utils/scale.js` and listed in `SCALE_CHANGES`, which the panels display.
- **No solid surface:** bodies with `hasSolidSurface: false` show a warning, and their gravity and temperature are labelled with the 1-bar level (or photosphere for the Sun). A test fails if any text describes them as having a surface or ground to stand on.
- **Volumes:** Earth comparisons of volume use each planet's volumetric mean radius from its NASA fact sheet, because the giant planets are flattened and cubing their equatorial diameters overstates their volume.
- **Spin direction:** Venus and Uranus spin backwards in the scene because their fact-sheet axis tilt (above 90°) is applied directly. Spin speeds are always positive so the backwards spin is not cancelled out.

## Mobile performance

Touch or small-screen devices get fewer sphere segments, smaller textures (512 × 256), fewer stars, no antialiasing and a pixel ratio capped at 1.5. Textures are drawn by code (no image downloads) one world at a time, and can be turned off with the "Surface detail" button; they start off when the browser asks to save data or the device reports 2 GB of memory or less. The scene only re-renders when something moves, pauses its loop when the tab is hidden, and frees GPU memory on cleanup.

## Accessibility

Every control, including the Simple/Detailed buttons and expandable sections, is a real button or summary with a 44 × 44 pixel minimum target, a visible focus outline and an accessible name. Keyboard shortcuts are listed in the overview panel and ignored while typing or when a focused button should handle Space or Enter. Selection changes are announced through a polite live region. When the panel re-renders, keyboard focus returns to the same Simple/Detailed button (or to the panel), and the world selector only scrolls sideways within its own row, so the page never jumps while someone is reading. `prefers-reduced-motion` starts the explorer paused and makes camera moves instant. A skip link jumps to the facts.

## Tests and CI

Tests live only under `tests/` and mirror `src/`:

- `tests/data/`: schema, Stage 1 facts preserved, citations, SCIENCE.md tables matching the data, wording rules, superlatives agreeing with the numbers, and quiz questions (schema, unique ids and texts, valid answers, supported and cited answers, no moon counts).
- `tests/utils/`, `tests/features/`, `tests/scenes/`: comparisons, formatting, scale, panel content, navigation, quiz rounds and scoring (uniqueness, shuffling, restart and play again) and appearance.
- `tests/e2e/`: browser tests with Playwright and Chromium against the built app (navigation, panels, picking, controls, keyboard, Back button, focus kept on mode change, no unexpected page scrolling, 2D fallback, reduced motion, phone tap-target sizes). `tests/e2e/quiz.e2e.js` plays complete rounds by mouse and keyboard, explores mid-quiz and resumes, checks 44 × 44 pixel targets on a phone, and plays without 3D.

The single CI job runs install → lint → unit tests → build → browser tests on every pull request and push to `main`. A dependent job deploys `dist/` to GitHub Pages from `main` only. Vite uses a relative asset base for the Pages repository path.
