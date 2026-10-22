# Asset credits

No external images, textures, audio or fonts are bundled. The app uses CSS and the device's system font; no font file is distributed. This is an inventory statement, not a blanket licence for future assets.

## Generated in code (no files)

Planet and Sun surface patterns, ring textures, the Sun's glow and the background stars are drawn at runtime by `src/scenes/proceduralTextures.js` and `src/scenes/solarSystemScene.js`, using colours from `src/scenes/appearance.js`. They are original artist's impressions written for this project (MIT, like the rest of the code). They are not NASA imagery, and the app says so.

## Libraries (not assets, listed for completeness)

| Library | Version | Licence | Used for |
| --- | --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | 0.180.0 | MIT | 3D rendering and OrbitControls |
| [Playwright](https://github.com/microsoft/playwright) | 1.56.0 | Apache-2.0 | Browser tests only; not shipped to users |

## Adding real assets later

Add one row per actual file before committing it:

| Repository file | Creator / owner | Original source URL | Exact licence / permission URL | Required attribution | Modifications | Verification date |
| --- | --- | --- | --- | --- | --- | --- |

Do not use a placeholder row as evidence of permission. Retain licence files alongside assets where required. For generated assets, record the tool, applicable terms, date and edits.

NASA material is often public domain in the United States, but logos, identifiable people and third-party credited material need individual checks. See [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). ESA content is not automatically public domain: consult the individual credit line and [ESA terms](https://www.esa.int/ESA_Multimedia/Terms_and_Conditions). Check textures and font files individually, including redistribution and modification rights.
