# Cosmos galaxy collection: data and update process

The galaxy collection shown in Cosmos, the galaxy map beside the solar system (see [COSMOS_FEASIBILITY.md](COSMOS_FEASIBILITY.md) for the design and [ARCHITECTURE.md](ARCHITECTURE.md#cosmos-galaxy-map) for how it is built).

## What is here

| File | What it holds |
| --- | --- |
| `src/data/galaxies.json` | The 12 galaxies, nearest first, validated by `galaxies.schema.json` |
| `src/data/sources.json` | The NASA pages the data cites (shared with the planets) |
| `docs/SCIENCE.md` → "Galaxies (Cosmos collection)" | How to read the values, the distance table, and one section per source with each fact and the exact sentence on the page that supports it |
| `public/assets/galaxies/` | A detail image (fits 1600 × 1200 px) and a thumbnail (fits 400 × 300 px) per galaxy, WebP, original aspect ratio |
| `docs/ASSET_CREDITS.md` → "Galaxy images" | One row per image file: owner, source, permission page, required credit, changes, date |
| `docs/cosmos/ned-crosscheck.json` | The NED cross-check snapshot used for the distances' `crossCheck` fields |
| `scripts/galaxies/` | `ned_crosscheck.py`, `prepare_images.py` and `asset_credit_rows.py` (Python 3, run by hand) |
| `tests/data/galaxies.test.js`, `galaxy-key.js`, `galaxy-checks.js` | Structure and consistency tests, and the hand-written key |

The app needs no credentials and makes no calls to NASA, NED or any other service: images are bundled files, and every value is in `galaxies.json`. NED and the scripts are used only when a person prepares or reviews the data.

## Decisions applied

These were agreed before the collection was prepared:

- **Sources.** Displayed values, descriptions and facts cite NASA pages only (`nasa.gov` hosts). NED is a cross-check: its preferred names, positions and distance statistics are recorded as provenance and never shown.
- **Distances.** Retain the approximate value on the NASA release selected for the galaxy's image/science context, keep other NASA values in `otherEstimates`, and explain the source-consistent editorial choice in `selection`. This does not establish that one estimate is scientifically superior. Do not select values by proximity to NED's median: its non-homogenised compilation mixes measurement methods and dates. Inspect original publications and methods before replacing a value. Never average sources or treat NED's minimum–maximum range as an uncertainty interval. No distance here is calculated from redshift.
- **Distance review flags.** Every external galaxy has an `estimateNote`, shown beside its distance in the Cosmos panel: "NASA estimates this distance; other studies can give different values." `reviewStatus` is `source-estimate`, `multiple-estimates` (alternative NASA values), or `discrepant-estimates` (NED median differs by more than 15% of the retained NASA value). The 15% threshold is an editorial attention flag, not a scientific error bar or accuracy score. NGC 1300, Whirlpool and Sombrero are flagged. Original distance values are unchanged; the underlying papers have not been adjudicated.
- **Milky Way.** No photograph of the whole Milky Way from outside can exist, because we are inside it. Its image is a NASA artist's concept (PIA10748). The data marks it as `kind: "artist-concept"` with an `illustrationNote`, and the tests require both.
- **Disputed types.** The Sombrero Galaxy and the Cigar Galaxy keep NASA's own wording: both pages list them as "Spiral Galaxy". The Cigar Galaxy has a note saying NASA calls its fast star formation a starburst. Leave both out of any quiz or mission.
- **Sky positions** are recorded (NED, J2000 equatorial) because they cost nothing to keep, but the approved first map uses distance bands, not the sky.

## Image choices

Each galaxy uses the image shown on the NASA page it cites, unless that image's credit includes outside photographers or ground-based data with unclear terms.

| Galaxy | Image | Why this one |
| --- | --- | --- |
| Milky Way | PIA10748, artist's concept (NASA/JPL-Caltech) | Agreed choice; clearly an illustration |
| Large and Small Magellanic Clouds | NASA Swift ultraviolet mosaics (SVS 11293) | NASA mission images. The visible-light pictures on the same page are by an outside photographer (Axel Mellinger) and were not used. NASA's Imagine page photos are credited to the Anglo-Australian Observatory and David Malin. |
| Andromeda | 2025 Hubble panorama | Original downloaded on 2026-10-23; credited to NASA, ESA, the science team and STScI processing. Kept as a panorama without cropping. |
| Triangulum | ESA/Hubble heic1901a | The page's main image; CC BY 4.0 with a visible credit |
| Messier 81, Cigar, Sombrero, Whirlpool, Messier 87 | Each page's main Hubble Heritage image | NASA/ESA/STScI credits only |
| Pinwheel | Hubble-only image from NASA's "Hubble Image of M101" page | Original downloaded on 2026-10-23. The Messier page's different image also uses ground-based data credited to CFHT/Coelum and NOAO. |
| NGC 1300 | Hubble Heritage image, via the NASA Image and Video Library (`GSFC_20171208_Archive_e002154`) | Same image and credit as NASA's NGC 1300 page (6637 × 3787 px) |

Where a source describes how an image was made (for example "The red in the image represents hydrogen and infrared light"), that sentence is kept in `colourNote`, and `composite` is true. Images made from ultraviolet or infrared light, or hydrogen-light filters, must have one, so the app can explain that their colours were assigned.

The Magellanic Cloud UV mosaics remain the chosen images. Their `childCaption` explains that ultraviolet light is invisible to our eyes and the pictures help reveal the hottest stars. `childCaptionSourceIds` cites NASA’s Ultraviolet Waves explanation and the Swift release; both are linked beside the caption and documented with supporting quotes in SCIENCE.md. A visible-light replacement is optional: first verify its own permission and credit, that it depicts the whole galaxy rather than a star-forming region, and then update the provenance and captions. A NASA credit alone does not establish permission.

## Permission review (2026-10-23)

All twelve image pairs are now bundled (24 WebP files). File `status` and `permission.status` are separate: a file can be marked ready only after its permission is verified. The current review read the individual source captions plus these terms:

- [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/): educational/informational use without endorsement; separately copyrighted third-party content is excluded. Joint NASA/ESA credits alone do not establish a licence. The NASA-hosted Hubble images here use `licence: "nasa-media-guidelines"`, rather than an unconditional public-domain assertion. The reviewed captions list the recorded contributors without identifying a separate copyright restriction. This review covers the collection's educational use; re-check if the source or intended use changes.
- [JPL image-use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/): educational use with the credit specified in the caption. [PIA10748's current Photojournal page](https://science.nasa.gov/photojournal/our-milky-way-gets-a-makeover-artist-concept/) gives **NASA/JPL-Caltech**, with no additional caption credit or image-specific restriction. Use `jpl-image-use-policy`.
- [ESA/Hubble usage terms](https://esahubble.org/copyright/) and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): Triangulum heic1901a uses this specific release's licence. Its exact ESA credit includes the comma after **J. Dalcanton,**; preserve it. The visible unaltered credit must accompany the image, with active source and licence links and a notice of resizing/WebP conversion. Credit alone is not a substitute for the other conditions.
- [SVS help](https://svs.gsfc.nasa.gov/help/): content is public domain unless otherwise noted. The selected Swift UV mosaics carry the recorded NASA/Swift credit without an exception. The separately credited visible-light photos are not included.

NASA, JPL and ESA/Hubble terms were accessible for this review. HubbleSite's copyright URL redirects to NASA's guidelines; it is not independent permission evidence. Per-image evidence, policy URLs and review dates are in `image.permission`; the asset table records both derivatives separately. The Cosmos panel shows `permission.modifications` and the source/terms links with every picture, thumbnail or detailed. The map itself shows no pictures.

## Updating the collection

Run these steps by hand. They need network access to `science.nasa.gov`, `assets.science.nasa.gov`, `images-api.nasa.gov`, `images-assets.nasa.gov`, `svs.gsfc.nasa.gov`, `imagine.gsfc.nasa.gov`, `ned.ipac.caltech.edu` and `esahubble.org`, plus Python 3 with Pillow.

1. **Re-read the sources.** Open each page in `src/data/sources.json` that the galaxies cite. Check each fact, description, type, constellation and distance against the page, and check that each "Page says" sentence in SCIENCE.md is still on the page word for word. If a page changed, update the data, the quote and the source's `pageUpdated` and `retrieved` dates.
2. **Cross-check with NED.** Run `python3 scripts/galaxies/ned_crosscheck.py docs/cosmos/ned-crosscheck.json`. Copy changed counts, medians, ranges or positions into the `crossCheck` and `sky.position` fields. Re-evaluate the editorial review flag. Preserve alternative NASA estimates and investigate original measurement methods before changing a displayed number; do not choose it by NED-median proximity.
3. **Images.** To replace an image, update `image.original` (URL, source page, pixel size), `credit`, `licence`, `kind`, `wavelengths`, `composite`, `colourNote`, `childCaption` where needed, and `alt` from the image's own page. Re-read the caption and applicable terms, then update `permission` with the evidence and review date. The preparation script requires `permission.status: "verified"`. Run `python3 scripts/galaxies/prepare_images.py --cache <folder> --download --only <id>`; it checks original dimensions, writes both WebP files and records sizes and `status: "ready"`.
4. **Credits.** Run `python3 scripts/galaxies/asset_credit_rows.py` and paste its rows into ASSET_CREDITS.md. Re-read the permission pages it names.
5. **Docs and key.** Update the distance table and source sections in SCIENCE.md, and `tests/data/galaxy-key.js` **by hand** (never generate the key from the data).
6. **Check.** Run `npm run lint`, `npm test`, `npm run build` and `npm run test:e2e`.

### Reproducing the Andromeda and Pinwheel derivatives

Both originals are now available from the recorded `assets.science.nasa.gov` URLs. To rebuild the derivatives after checking permissions, run:

```sh
python3 scripts/galaxies/prepare_images.py --cache <folder> --download --only andromeda --only pinwheel
python3 scripts/galaxies/asset_credit_rows.py   # then paste all rows into ASSET_CREDITS.md
npm test
```

The tests require all twelve pairs, positive dimensions, verified permission metadata, and per-file credit rows with policy/licence links. A missing image or unverified permission fails the collection's readiness checks; do not add a broken-image placeholder to the map.

## Release review (2026-10-23)

Every galaxy source page and image page was fetched again and checked by script against the data and the quotes in SCIENCE.md:

- All 123 checks matched: every "page says" quote, each displayed distance and other estimate, NASA's type wording, constellations, sizes, image credits and that each image page names its galaxy. Two remaining script flags were formatting only (link markup inside the NGC 1300 credit; the LMC distance appears as "163,000 and 200,000 light-years").
- Fixed: the Magellanic Clouds' type was shown in quotation marks as "irregular dwarf galaxy", but the page says "irregular dwarf galaxies". The data now uses the exact words, and a test requires each type wording to appear word for word in a quote under its source.
- The Pinwheel and Sombrero picture notes are accurate paraphrases of their pages (filters F435W, F555W, F814W; "one of the largest mosaics ever assembled from Hubble observations"); they are shown as plain captions, not quotes.
- Pictures were checked by eye against their galaxies: all twelve match.
- Terms re-read: ESA/Hubble (CC BY 4.0, with a clear, visible credit) and NASA SVS (public domain unless noted). The NASA media guidelines, JPL image-use policy, Creative Commons licence and images.nasa.gov pages could not be reached from the review environment, so the earlier same-day permission review in `image.permission` stands for those; the Milky Way credit (NASA/JPL-Caltech, "Artist Concept") was re-confirmed through the NASA Images API.
- Catalogue identities: Messier numbers and NGC 1300/NGC 5457 match the image pages ("M101, NGC 5457, The Pinwheel Galaxy"). NED records M81 under the name "SN 1993J HOST"; its position (RA 148.89°, Dec +69.07°) is M81's, so the cross-check refers to the right galaxy. NGC numbers are recorded only where a cited page gives them.

## Open questions

**Source changes and future use**
- A new image, changed caption or different use needs a fresh permission review. Keep the source and licence/terms active links separate from visible attribution. Do not infer copyright status merely from a NASA/ESA credit.

**Science (for review)**
- **NGC 1300:** NASA gives 69 million light-years (21 Mpc). NED's 27 published estimates have a median of 14.5 Mpc, about 47 million light-years.
- **Whirlpool Galaxy:** two NASA pages give 31 million light-years. NED's estimates for NGC 5194 have a median of 7.8 Mpc (about 25 million) and range from 2.45 to 12.2 Mpc.
- **Sombrero Galaxy:** NASA gives 28 million light-years. NED's median is 9.95 Mpc, about 32 million.
- **Pinwheel Galaxy:** NASA pages differ (21.8 and 25 million light-years). Retain 21.8 million from the selected Hubble-only release, with the alternative preserved; no claim that this value is more accurate.
- **Magellanic Clouds:** NASA pages differ (163,000 or 179,000, and 200,000 or 210,000 light-years). Retain the Swift/SVS release values for source consistency, with alternatives preserved; no claim that they are more accurate.
- **Milky Way's orbit:** the cited page says the Sun takes 250 million years to circle the galaxy. A web search earlier in this work showed a NASA solar system page with about 230 million years; that page was not opened or checked.
- NED's preferred name for M81 is "SN 1993J HOST", and "M51" in NED is the galaxy pair. The data records NED's names exactly; reviewers may prefer a note.
