# Cosmos galaxy collection: data and update process

The galaxy collection for the planned Cosmos view (see [COSMOS_FEASIBILITY.md](COSMOS_FEASIBILITY.md)). Only the data and images exist so far; the interactive map is not built yet.

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
- **Distances.** Use the value on the NASA page cited for the galaxy. Where NASA pages disagree, use the NASA value closest to NED's median of published estimates, keep the others in `otherEstimates`, and explain the choice in `selection`. Never combine values from different sources, and never use a redshift as a distance.
- **Milky Way.** No photograph of the whole Milky Way from outside can exist, because we are inside it. Its image is a NASA artist's concept (PIA10748). The data marks it as `kind: "artist-concept"` with an `illustrationNote`, and the tests require both.
- **Disputed types.** The Sombrero Galaxy and the Cigar Galaxy keep NASA's own wording: both pages list them as "Spiral Galaxy". The Cigar Galaxy has a note saying NASA calls its fast star formation a starburst. Leave both out of any quiz or mission.
- **Sky positions** are recorded (NED, J2000 equatorial) because they cost nothing to keep, but the approved first map uses distance bands, not the sky.

## Image choices

Each galaxy uses the image shown on the NASA page it cites, unless that image's credit includes outside photographers or ground-based data with unclear terms.

| Galaxy | Image | Why this one |
| --- | --- | --- |
| Milky Way | PIA10748, artist's concept (NASA/JPL-Caltech) | Agreed choice; clearly an illustration |
| Large and Small Magellanic Clouds | NASA Swift ultraviolet mosaics (SVS 11293) | NASA mission images. The visible-light pictures on the same page are by an outside photographer (Axel Mellinger) and were not used. NASA's Imagine page photos are credited to the Anglo-Australian Observatory and David Malin. |
| Andromeda | 2025 Hubble panorama (**pending**) | Credited to NASA, ESA, the science team and STScI processing. The page's 2015 mosaic credit includes R. Gendler, an outside astrophotographer. |
| Triangulum | ESA/Hubble heic1901a | The page's main image; CC BY 4.0 with a visible credit |
| Messier 81, Cigar, Sombrero, Whirlpool, Messier 87 | Each page's main Hubble Heritage image | NASA/ESA/STScI credits only |
| Pinwheel | Hubble-only image from NASA's "Hubble Image of M101" page (**pending**) | The Messier page's image also uses ground-based data credited to CFHT/Coelum and NOAO |
| NGC 1300 | Hubble Heritage image, via the NASA Image and Video Library (`GSFC_20171208_Archive_e002154`) | Same image and credit as NASA's NGC 1300 page (6637 × 3787 px) |

Where a source describes how an image was made (for example "The red in the image represents hydrogen and infrared light"), that sentence is kept in `colourNote`, and `composite` is true. Images made from ultraviolet or infrared light, or hydrogen-light filters, must have one, so the app can explain that their colours were assigned.

## Updating the collection

Run these steps by hand. They need network access to `science.nasa.gov`, `assets.science.nasa.gov`, `images-api.nasa.gov`, `images-assets.nasa.gov`, `svs.gsfc.nasa.gov`, `imagine.gsfc.nasa.gov`, `ned.ipac.caltech.edu` and `esahubble.org`, plus Python 3 with Pillow.

1. **Re-read the sources.** Open each page in `src/data/sources.json` that the galaxies cite. Check each fact, description, type, constellation and distance against the page, and check that each "Page says" sentence in SCIENCE.md is still on the page word for word. If a page changed, update the data, the quote and the source's `pageUpdated` and `retrieved` dates.
2. **Cross-check with NED.** Run `python3 scripts/galaxies/ned_crosscheck.py docs/cosmos/ned-crosscheck.json`. Copy any changed counts, medians, ranges or positions into the `crossCheck` and `sky.position` fields. If NASA pages now disagree, apply the selection rule above, and say so in `selection`.
3. **Images.** To replace an image, update `image.original` (URL, source page, pixel size), `credit`, `licence`, `kind`, `wavelengths`, `composite`, `colourNote` and `alt` from the image's own page. Then run `python3 scripts/galaxies/prepare_images.py --cache <folder> --download --only <id>`. The script checks the original's size, writes both WebP files and records their sizes and `status: "ready"`.
4. **Credits.** Run `python3 scripts/galaxies/asset_credit_rows.py` and paste its rows into ASSET_CREDITS.md. Re-read the permission pages it names.
5. **Docs and key.** Update the distance table and source sections in SCIENCE.md, and `tests/data/galaxy-key.js` **by hand** (never generate the key from the data).
6. **Check.** Run `npm run lint`, `npm test`, `npm run build` and `npm run test:e2e`.

### Finishing the two pending images

Andromeda and the Pinwheel are recorded with `status: "pending"`: their originals are only on `assets.science.nasa.gov`, which the build environment could not reach. With access, run:

```sh
python3 scripts/galaxies/prepare_images.py --cache <folder> --download --only andromeda --only pinwheel
python3 scripts/galaxies/asset_credit_rows.py   # then paste all rows into ASSET_CREDITS.md
npm test
```

The tests then require both files, their sizes and their credit rows.

## Open questions

**Licences**
- NASA's media usage guidelines (www.nasa.gov), the JPL image use policy and HubbleSite's copyright page could not be opened from the build environment. NASA's Hubble exhibit FAQ and the SVS help page, which were read, say NASA and Hubble images are generally public domain.
- Joint "NASA, ESA" credits: whether ESA's CC BY 4.0 terms also apply to NASA's copies is unconfirmed. Showing the full credit beside the image satisfies both.
- PIA10748's longer JPL Photojournal credit line could not be checked; the NASA Image and Video Library gives "NASA/JPL-Caltech".

**Science (for review)**
- **NGC 1300:** NASA gives 69 million light-years (21 Mpc). NED's 27 published estimates have a median of 14.5 Mpc, about 47 million light-years.
- **Whirlpool Galaxy:** two NASA pages give 31 million light-years. NED's estimates for NGC 5194 have a median of 7.8 Mpc (about 25 million) and range from 2.45 to 12.2 Mpc.
- **Sombrero Galaxy:** NASA gives 28 million light-years. NED's median is 9.95 Mpc, about 32 million.
- **Pinwheel Galaxy:** two NASA pages differ (21.8 and 25 million light-years). The data uses 21.8 million, the value closer to NED's median.
- **Magellanic Clouds:** NASA pages differ (163,000 or 179,000, and 200,000 or 210,000 light-years). The data uses the SVS values, which are closer to NED's medians.
- **Milky Way's orbit:** the cited page says the Sun takes 250 million years to circle the galaxy. A web search earlier in this work showed a NASA solar system page with about 230 million years; that page was not opened or checked.
- NED's preferred name for M81 is "SN 1993J HOST", and "M51" in NED is the galaxy pair. The data records NED's names exactly; reviewers may prefer a note.
