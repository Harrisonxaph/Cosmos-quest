# Cosmos: feasibility of a galaxy explorer

Status: **assessment only**. Nothing here is implemented or agreed. AGENTS.md says not to add new activities until they are agreed, so this document is the basis for that decision.

Prepared 2026-10-22.

## Summary

- **Feasible, as a small, separate view.** A "Cosmos" view beside the solar system can show 12 galaxies, each with an image and a few short facts that cite their sources. It doesn't need to change the explorer, quiz, missions or experiments.
- **Recommended first version: an illustrative 2D map** that groups galaxies into labelled distance bands, plus a list of the same galaxies as plain buttons. It is clearly marked "not to scale". It supports pinch-to-zoom, drag-to-pan and keyboard use, needs no Three.js and is light on an iPad.
- **Prepare everything ahead of time.** None of the services below should be called from the child's browser. Values and images are collected once, checked by hand, committed with a retrieval date and tested, in the same way as the planet facts.
- **Cite NASA pages for what the child sees.** Use NED (and optionally SIMBAD) only as a background cross-check of identifiers, coordinates and distance spread. Use MAST only to find out where an image came from. That keeps the existing "NASA or ESA primary source" rule intact.
- **Biggest risks:** image licences (each image needs its own check), NASA pages disagreeing on distances, and the Milky Way, which has no photograph from outside.
- **Verification gap:** I could not open any of the services or pages listed here. See the next section.

## How this was checked, and what could not be

This assessment was written in a sandbox whose network policy blocks the relevant hosts:

- Direct requests from the sandbox to `ned.ipac.caltech.edu`, `mast.stsci.edu`, `archive.stsci.edu`, `simbad.cds.unistra.fr`, `alasky.cds.unistra.fr`, `registry.euro-vo.org`, `science.nasa.gov`, `images-api.nasa.gov` and `hips.astron.nl` were refused by the proxy with HTTP 403.
- The web page fetcher failed DNS lookup (`ENOTFOUND`) for every host it tried: NED, MAST, STScI, HubbleSite, webbtelescope.org, IVOA, NAVO/HEASARC, CDS, NASA, ESA, esahubble.org and esawebb.org.
- Web search worked. It returns a search engine's summary of each page, not the page itself.

So **no live API request succeeded, and no page was read in full.** Each claim below carries one of these labels:

| Label | Meaning |
| --- | --- |
| **[S]** | Appeared in a web-search summary of the linked page. The page itself was not opened. Re-check against the page before relying on it. |
| **[N]** | Not verified at all. Stated as an open question, never as a finding. |

No claim is labelled as fetched or tested, because nothing could be. **No example API response appears in this document**: I didn't get any, and I haven't made any up. The first implementation task is to re-run every check in "Verification still needed" from a machine with normal internet access, and to record the actual responses.

## Sources investigated

### NASA/IPAC Extragalactic Database (NED)

NED is a NASA-funded database of galaxies outside the Milky Way, run at Caltech/IPAC.

| Question | Finding |
| --- | --- |
| Access methods | **TAP** (the Virtual Observatory's table-query protocol) with ADQL queries. The synchronous endpoint is `https://ned.ipac.caltech.edu/tap/sync`, with parameters `QUERY`, `LANG`, `REQUEST`, `FORMAT`, `PHASE`, `EXECUTIONDURATION` and `MAXREC`. It supports cone, box and polygon searches, and output as VOTable, FITS, JSON and others. The main table is `NEDTAP.objdir` ("Object Directory"). [S] [NED TAP guide](https://ned.ipac.caltech.edu/Documents/Guides/Interface/TAP); the table name was confirmed in [gnuastro's NED client](https://fossies.org/linux/gnuastro/bin/query/ned.c) [S]. |
| | **ObjectLookup** name resolver over HTTPS. It replaces the older `nedsrv`. A third-party script sends a POST with a form field `json` holding `{"name":{"v":"M31"}}`, and reads a `Preferred` block with position, name, object type and redshift. [S] [NED ObjectLookup guide](https://ned.ipac.caltech.edu/Documents/Guides/Interface/ObjectLookup), [example script](https://sites.astro.caltech.edu/~srk/Unix/Programs/objNED). The official request and response format is [N]. |
| | **Important change:** a NASA notice dated 15 June 2026 says NED has new APIs, and that "the legacy APIs are deprecated and cannot access data ingested after January 2026". [S] [NASA community notice](https://science.nasa.gov/astrophysics/programs/physics-of-the-cosmos/community/nasa-ipac-ned-new-apis-and-survey). Which interfaces count as "legacy" (TAP? ObjectLookup?) is [N]. Read the new API specification first. |
| Identifiers, coordinates, classifications | The objdir table holds a preferred name, object type, RA/Dec and redshift [S, from the script and TAP guide summaries]. The exact column names, and whether a morphological type (such as "SA(s)b") is in TAP or only on the object web pages, are [N]. |
| Distances | **NED-D** collects redshift-independent distances. Version 17.1.0 has 272,573 distances for 147,363 galaxies, compiled by Steer, Madore and the NED team. NED's distance page said Andromeda had "407 distances based on 23 redshift-independent methods" (as of that version, May 2020). [S] [NED-D](https://vo.ned.ipac.caltech.edu/Library/Distances/), [Steer et al. 2017](https://ipac.caltech.edu/publication/2017AJ....153...37S). This is the best evidence that **distance estimates are many and spread out**. |
| Authentication | None mentioned in the summaries seen. [N] |
| Rate limits, usage restrictions | None found. [N] |
| Browser use (CORS) | Not found. [N] It doesn't matter for this plan, because the browser never calls NED. |
| Acknowledgement | NED asks publications to acknowledge "the NASA/IPAC Extragalactic Database (NED), which is operated by the Jet Propulsion Laboratory, California Institute of Technology, under contract with the National Aeronautics and Space Administration". A 2026 page gives newer funding wording (NASA award 80NSSC21M0037, operated by Caltech). [S] [NED intro](https://ned.ipac.caltech.edu/help/intro.html). Use the wording current on the day of retrieval. |
| Images | NED links images from many surveys. Its copyright page for the STScI Digitized Sky Survey shows that rights depend on the survey. [S] [NED DSS copyright](https://ned.ipac.caltech.edu/help/dss_copyright.html). **Don't take images from NED for redistribution.** |
| Static preparation | Yes. A one-off script, run by a person, can query names, coordinates, types and the NED-D distance spread, and save the results with the date. The app never calls NED. |

### MAST (Mikulski Archive for Space Telescopes, STScI)

| Question | Finding |
| --- | --- |
| Access methods | The MAST API is documented at `https://mast.stsci.edu/api` [S] ([MAST services page](https://archive.stsci.edu/vo/mast_services.html)). Its services include `Mast.Name.Lookup`, which turns an object name into a sky position [S] ([mast-api npm package](https://www.npmjs.com/package/mast-api), [astroquery `resolve_object`](https://astroquery.readthedocs.io/en/stable/api/astroquery.mast.MastClass.html)). Observation searches (CAOM cone search) are also listed [S]. The exact request payload and response fields are [N]. |
| Authentication | Public data needs no login. Tokens are needed only for exclusive-access (not yet public) data. Tokens "expire after 10 days of inactivity or 60 days after creation". [S] [Using MAST APIs](https://outerspace.stsci.edu/display/MASTDOCS/Using+MAST+APIs), [MAST accounts](https://outerspace.stsci.edu/spaces/MASTDOCS/pages/136481910/MAST+Accounts). |
| Rate limits | None found. [N] |
| Usage policy | Retrieving data is free, and an acknowledgement of MAST and STScI (under NASA contract) is requested in publications. Most data is public domain. [S] [MAST data use policy](https://archive.stsci.edu/data_use.html). |
| Identifiers, coordinates | Name-to-position only. **MAST doesn't provide galaxy classifications or distances.** It is an archive of observations. |
| Images | MAST holds calibrated science files (FITS). These are greyscale, per-filter data that need expert processing, so they aren't child-ready pictures. The colour pictures the public sees are made by outreach teams and published on science.nasa.gov, HubbleSite/webbtelescope.org and esahubble.org/esawebb.org (see "Image licence findings"). |
| Static preparation | Possible but unnecessary for the first version. MAST is useful only to trace where an outreach image came from. |

### Virtual Observatory (VO) services and standards

The Virtual Observatory is not one database. It is a set of **standards** published by the IVOA, and many independent **services** that implement them.

| Standard | Purpose here |
| --- | --- |
| TAP and ADQL | Table queries, used by NED and SIMBAD. |
| Simple Cone Search, SIA | Search for objects or images around a sky position. |
| HiPS | Tiled all-sky image surveys that can be panned and zoomed. |
| VOTable | The standard XML table format for responses. |
| RegTAP | Searching the registry of VO services. |

[IVOA document list](https://www.ivoa.net/documents/) and [HiPS standard](https://www.ivoa.net/documents/HiPS/): pages could not be opened. Current versions are [N]. NASA's VO portal, [NAVO](https://heasarc.gsfc.nasa.gov/navo/), could not be opened either [N].

Services checked:

| Service | Findings |
| --- | --- |
| **SIMBAD (CDS, Strasbourg)** TAP | Identifiers, coordinates, object type and morphological type for many galaxies (columns [N]). Usage limit: "no more than 6 queries per second from the same IP"; going over gets the IP blocked for a minute. [S] [CDS notice, 2015](https://cds.unistra.fr/news/2015/08/24-limitation-burst-queries). astroquery's docs describe a stricter penalty of up to an hour [S] ([astroquery SIMBAD](https://astroquery.readthedocs.io/en/stable/simbad/simbad.html)), so check the current SIMBAD help page. Requested acknowledgement: "This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France". [S] [CDS acknowledgement](https://cdsxmatch.cds.unistra.fr/xmatch/doc/simbad-ack.html). SIMBAD is run by CDS in France: **not a NASA or ESA source**, so use it only as a cross-check. |
| **Sesame (CDS)** | A name resolver that combines SIMBAD, NED and VizieR. Response format [N]. |
| **hips2fits (CDS)** | Cuts out an image from a HiPS survey. Parameters include `hips`, `width`, `height`, `fov`, `ra`, `dec` and `projection`. `format` can be `fits`, `jpg` or `png`. `min_cut`, `max_cut` and `stretch` apply to jpg and png. There are two endpoints: alasky and alaskybis. [S] [hips2fits](https://alasky.cds.unistra.fr/hips-image-services/hips2fits), [astroquery hips2fits](https://astroquery.readthedocs.io/en/stable/hips2fits/hips2fits.html). Whether a request returns an image is [N]. |
| **DSS2 colour (a HiPS often used for cutouts)** | **Rights are complicated.** Copyright varies by plate survey (Anglo-Australian Observatory, UK SERC/PPARC, Caltech/Palomar), the notice in each file's header applies, and anything else is copyright AURA. [S] [STScI DSS acknowledgement](https://archive.stsci.edu/dss/acknowledging.html), [ESO DSS copyright](https://archive.eso.org/dss/dss-copyrights.html), [STScI data copyrights](https://gsss.stsci.edu/Acknowledgements/DataCopyrights.htm). **Don't bundle DSS cutouts.** |
| **NASA Image and Video Library** | `https://images-api.nasa.gov` with `/search`, `/asset/{nasa_id}` and `/metadata/{nasa_id}`. Every response is JSON. The documentation is release v1.22.0 (January 2023). Third-party listings say no API key is needed. [S] [API docs PDF](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf), [Jentic listing](https://jentic.com/apis/nasa.gov/nasa). Not a VO service, but a practical way to find NASA images with their credits. Sample responses for galaxy searches are [N]. |
| **RegTAP (registry search)** | Not reached. [N] |

**Conclusion for the VO:** VO services are good for researchers, and for an offline script that checks identifiers and coordinates. They add nothing the child needs at runtime. Their image services mostly serve survey data whose redistribution rights are unclear.

## Recommended starting collection: 12 galaxies

Distances are those on NASA pages as seen in search summaries [S]. Each must be re-read on the page itself before use. Where NASA pages disagree, the alternatives are listed, which is itself evidence for the uncertainty explanation.

| # | Galaxy | Type for the app (NASA wording to confirm) | Why include it | NASA distance (main) | Other published NASA values | Main NASA page |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Milky Way** | Barred spiral ("thought to be") | Our home; needs special treatment | — (we are inside it). About 100,000 ly across; Sun about 26,000 ly from the centre | Sun–centre about 28,000 ly elsewhere | [Imagine: Milky Way](https://imagine.gsfc.nasa.gov/science/featured_science/milkyway), [Hubble's Galaxies](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-galaxies/) |
| 2 | **Large Magellanic Cloud** | Irregular (dwarf) | Nearest well-known neighbour; seen from the southern sky | about 163,000 ly | 179,000; 160,000; 180,000 | [NASA SVS](https://svs.gsfc.nasa.gov/11293), [Imagine: nearest galaxies](https://imagine.gsfc.nasa.gov/features/cosmic/nearest_galaxy_info.html) |
| 3 | **Small Magellanic Cloud** | Irregular (dwarf) | Pairs with the LMC | about 200,000 ly | 210,000 | as above |
| 4 | **Andromeda (M31)** | Spiral | Nearest large galaxy; visible to the naked eye | 2.5 million ly | "over 2 million" | [Messier 31](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/) |
| 5 | **Triangulum (M33)** | Spiral | Third-largest in the Local Group | 3 million ly | 2.7 million; 2.9 million | [Messier 33](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-33/) |
| 6 | **Bode's Galaxy (M81)** | Spiral | Classic "grand design" spiral; partner of M82 | 11.6 million ly | 11.8 million; about 12 million | [Messier 81](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-81/) |
| 7 | **Cigar Galaxy (M82)** | Starburst (classification to confirm) | Very fast star formation, stirred up by M81 | 12 million ly | — | [Messier 82](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-82/) |
| 8 | **Pinwheel (M101)** | Spiral (face-on) | Large face-on spiral | 25 million ly | 21.8 million (6.7 Mpc) | [Messier 101](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-101/), [Hubble image data](https://science.nasa.gov/asset/hubble/hubble-image-of-m101/) |
| 9 | **Sombrero (M104)** | Spiral; some sources call it lenticular-like (confirm wording) | Unusual hat shape, edge-on dust lane | 28 million ly | 29 million; 30 million | [Messier 104](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-104/) |
| 10 | **Whirlpool (M51)** | Spiral, interacting | Spiral with a companion galaxy | 31 million ly | 23 million; 25 million | [Messier 51](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-51/) |
| 11 | **Messier 87** | Elliptical (giant) | Elliptical type; home of the first black hole ever imaged (to confirm on the page) | 54 million ly | 50 million; 55 million | [Messier 87](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/) |
| 12 | **NGC 1300** | Barred spiral | A clear bar, to compare with the Milky Way | 69 million ly | 70 million; 75 million (older) | [NGC 1300](https://science.nasa.gov/asset/hubble/barred-spiral-galaxy-ngc-1300/) |

Types covered: barred spiral (2), spiral (5, one interacting), irregular dwarf (2), elliptical (1), starburst (1) and the Sombrero's ambiguous case (1). There is no clean **lenticular** example. If one is wanted, swap in a NASA-documented lenticular galaxy (none was checked here). Leave the Sombrero's type out of the quiz and missions, because sources disagree.

Possible later swaps: Centaurus A (peculiar, with a dust lane), the Antennae (merging pair) and the Cartwheel (ring galaxy). Each would need the same checks.

The LMC and SMC are best seen from the southern hemisphere, and M81 and M82 from the northern. A short "Can I see it from where I live?" note would be accurate, and is cheap if coordinates are prepared ahead of time.

## Comparing the three map options

| | 1. Map from observed sky coordinates | 2. Illustrative gallery or map | 3. 3D map from sourced distances |
| --- | --- | --- | --- |
| What it shows truthfully | **Direction** in our sky (RA/Dec). Says nothing about distance or size. | Membership in distance bands and the order of distances, labelled "not to scale". | Direction and distance together. |
| Accuracy risks | A child may read "near on the map" as "near in space". M81 and M82 overlap; M87 and M104 sit close together in the sky but are tens of millions of ly apart. The Milky Way fills the whole sky, so it can't be one dot. | Must keep the real order and never imply exact positions. That is easy to test, like `SCALE_CHANGES`. | The distance range is about 160,000 ly to about 70 million ly, more than 400 times. On a linear scale everything outside the Local Group looks empty; a log scale distorts space and must be explained. Every distance is uncertain, so 3D positions look more exact than they are. |
| Data needed | Coordinates (NED/SIMBAD cross-check, NASA pages for any displayed text) | One NASA distance per galaxy, plus band rules in `utils/` | Coordinates and distances, plus a coordinate transform |
| Touch (pinch, pan) | Needs a custom 2D sky projection. Medium effort. | SVG with pointer events, plus ± buttons. Low effort. | OrbitControls already exist, but it would be a second Three.js scene. High effort. |
| Keyboard | Must add a list anyway, because dots aren't focusable meaningfully | A list of real buttons in a logical order (nearest first). Natural. | Must add a list anyway |
| iPad performance | Fine | Best: about 12 SVG elements, and images load only when chosen | Second WebGL context or scene swapping; more memory and heat |
| 2D fallback | Is 2D | Is 2D | Needs its own fallback |
| Effort | Medium | **Low** | High |

**Recommendation: option 2**, an illustrative distance-band map with a matching list. It is the simplest option that supports accurate explanations, touch, keyboard and good iPad performance. Option 1 can be added later as a per-galaxy "Where is it in our sky?" panel (constellation and hemisphere), which is accurate without implying distance. Option 3 should wait until options 1 and 2 have been used.

Proposed bands (log-like, labelled on screen, generated in `src/utils/`):

1. **Home**: the Milky Way. We are inside it.
2. **Our closest neighbours** (under 1 million ly): LMC, SMC.
3. **The Local Group** (1–5 million ly): Andromeda, Triangulum.
4. **Nearby groups** (10–35 million ly): M81, M82, M101, M104, M51.
5. **Much farther** (over 50 million ly): M87, NGC 1300.

Within a band, galaxies are placed in order of their cited distance. Band edges are presentation choices, recorded with the scale notes, and tests check that the order of distances is kept.

## Explanations the feature must give

These are plain-language drafts. Each must be rewritten from, and cited to, the NASA pages before use.

**Apparent size, physical size and distance are different things.**
- *Apparent size* is how big something looks in our sky. Andromeda looks wider than the full Moon. NASA pages give between about 3 and 7 Moon-widths, depending on how much of its faint outer disk is counted [S] ([Hubble M31 mosaic](https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/), [Messier 31](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/)). That spread is another reason to say "about".
- *Physical size* is how big it really is, for example "about 100,000 light-years across".
- *Distance* is how far away it is. A big galaxy far away can look smaller than a small galaxy nearby. The map must never draw galaxies at their apparent or physical sizes without saying which.

**Distance estimates are uncertain and can disagree.**
- NASA's own pages give M51 as 23, 25 and 31 million ly, and M101 as 21.8 and 25 million ly [S]. NED-D lists 407 separate distance estimates for Andromeda, from 23 methods [S].
- The app should say "about", name the page it used, date the value (as it already does for moon counts), and show "other estimates" in Detailed mode.

**Redshift is not a direct distance measurement for every galaxy.**
- For distant galaxies, the stretching of light by the expanding universe (redshift) tracks distance well. Nearby galaxies also move through space on their own (a "peculiar velocity", typically hundreds of km/s), which can swamp that effect. Andromeda is moving *towards* us, so its light is blueshifted, not redshifted. [S] ([Penn State Astro 801](https://courses.ems.psu.edu/astro801/book/export/html/1967), [NASA StarChild](https://starchild.gsfc.nasa.gov/docs/StarChild/questions/redshift.html), [NASA: Andromeda collision](https://science.nasa.gov/missions/hubble/nasas-hubble-shows-milky-way-is-destined-for-head-on-collision/))
- Nearby distances come from other methods, such as pulsating Cepheid stars. Hubble first proved Andromeda was a separate galaxy this way [S].
- Rule for the app: never compute a distance from redshift. Never call a redshift a distance.
- Child version: *"Light from far-away galaxies is stretched by the expanding universe, which helps astronomers tell how far they are. Nearby galaxies also move by themselves, so astronomers measure them in other ways."*

**The Milky Way needs special treatment.**
- We are inside it, about 26,000 ly from its centre [S], so nobody has ever photographed it from outside. Every "whole Milky Way" picture is an **artist's concept** or a map built from measurements, and the app must say so.
- From Earth we see it edge-on as a band of light across the sky. A real photograph or all-sky map of that band is honest, if labelled "from inside".
- It has no distance from us and no single sky position, so its data entry uses a different shape (see the data contract).
- At the centre of the map it is "home", not the centre of the universe. Say so.
- Its structure is partly inferred. NASA says it is "thought to be" a barred spiral [S], and the app should keep that hedge.

## Proposed data contract

This follows the patterns already in `src/data/`. Science goes in data; layout is derived in `utils/`; looks go in presentation code.

**Files**
- `src/data/galaxies.json` and `galaxies.schema.json`
- Reuse `sources.json` and `docs/SCIENCE.md`, adding a heading per new source.
- `src/utils/cosmosLayout.js`: a pure function from distances to bands and order. No DOM.
- Images in `public/assets/galaxies/`, each with a row in `docs/ASSET_CREDITS.md`.

**One galaxy (sketch)**

```jsonc
{
  "id": "andromeda",                      // stable, kebab-case
  "name": "Andromeda Galaxy",
  "otherNames": ["Messier 31", "M31", "NGC 224"],
  "viewpoint": "outside",                 // "inside" only for the Milky Way
  "type": {                               // enum: barred-spiral | spiral | elliptical | lenticular | irregular | starburst | unclear
    "value": "spiral",
    "sourceIds": ["nasa-messier-31"]
  },
  "sky": {                                // null for the Milky Way
    "raDeg": 0, "decDeg": 0,              // filled from the preparation script, ICRS J2000
    "constellation": "Andromeda",
    "hemisphere": "northern",
    "sourceIds": ["nasa-messier-31"],
    "crossCheck": { "service": "NED", "retrieved": "YYYY-MM-DD" }  // provenance only, not shown
  },
  "distance": {                           // null for the Milky Way
    "valueLy": 2500000,
    "display": { "simple": "about 2.5 million light-years", "detailed": "about 2.5 million light-years (NASA Hubble Messier catalogue)" },
    "method": "unspecified",              // only name a method if the cited page names it
    "asOf": "YYYY-MM-DD",
    "sourceIds": ["nasa-messier-31"],
    "otherEstimates": [ { "valueLy": 0, "sourceIds": [] } ],
    "note": "NASA pages round this differently."
  },
  "physicalSize": { "diameterLy": null, "sourceIds": [] },  // optional; only if a cited page gives it
  "summary": { "simple": "...", "detailed": "...", "sourceIds": [] },
  "facts": [ { "text": "...", "sourceId": "nasa-messier-31" } ],
  "image": {
    "file": "assets/galaxies/andromeda.webp",
    "kind": "photograph",                 // photograph | composite | artist-concept | all-sky-map
    "light": "visible",                   // visible | infrared | ultraviolet | x-ray | combined
    "alt": "...",
    "credit": "exact credit line from the source page",
    "licence": "public-domain-us | cc-by-4.0 | cc-by-sa-3.0-igo",
    "sourceUrl": "https://...",
    "verified": "YYYY-MM-DD"
  }
}
```

**Rules for tests (new, in `tests/data/`)**
- The schema is valid, ids are unique and stable, and every source id exists in `sources.json` and SCIENCE.md.
- A **hand-written key** (`tests/data/galaxy-key.js`) lists each galaxy's expected distance, type and viewpoint. It never reads `galaxies.json`, matching the existing answer-key rule.
- The Milky Way has `viewpoint: "inside"`, `distance: null`, `sky: null`, and an image `kind` that is not `photograph` (or a photograph explicitly described as "from inside").
- `cosmosLayout` keeps the real order of distances. Band boundaries are listed in a `COSMOS_SCALE_NOTES` export, like `SCALE_CHANGES`, and shown on screen.
- Wording checks: no text derives a distance from redshift, every distance display contains "about", and Detailed mode lists other estimates where they exist.
- Every `image.file` has a row in ASSET_CREDITS.md, and the credit shown matches it word for word.
- Facts appear word for word under their source heading in SCIENCE.md, as today.

**Source ids:** the current pattern `^nasa-[a-z]+(-[a-z]+)*$` doesn't accept digits, so ids like `nasa-messier-31` or `nasa-ngc-1300` need the pattern extended. ESA sources (for example a Gaia map) would also need the pattern, schema and tests extended together, as AGENTS.md requires.

## Image licence findings

| Image source | Terms found | Use in Cosmos |
| --- | --- | --- |
| NASA-created imagery | "Generally are not subject to copyright in the United States." Educational web use is fine; NASA should be credited as the source. The NASA logo and insignia need permission, endorsement must not be implied, and **third-party material marked with a copyright holder needs that holder's permission**. [S] [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) | Yes, after a per-image check of the credit line |
| Hubble images credited to STScI | A mirror of HubbleSite's notice: images whose credit lists STScI "may be freely used as in the public domain". Credit NASA and STScI. Other institutions in a credit line may claim copyright. [S] (the mirror, not hubblesite.org itself; [HubbleSite copyright](https://hubblesite.org/copyright) [N]) | Yes, after a per-image check |
| ESA/Hubble (esahubble.org) and ESA/Webb | **CC BY 4.0**: reuse is free if credited "clearly and visibly", with the credit wording unchanged (for example "ESA/Hubble"). The logo is excluded, and endorsement must not be implied. [S] [ESA/Hubble usage](https://esahubble.org/copyright/); [ESA/Webb](https://esawebb.org/copyright/) [N] | Yes, with the credit visible beside the image, not hidden in a details section |
| Joint "NASA, ESA, …" credits | Which terms apply depends on where the file is downloaded from and the full credit line. Named individual processors or observatories may add conditions. [N] in general. | Check each image; prefer copies whose terms are explicit |
| ESA Gaia all-sky map (Milky Way from inside) | "ESA/Gaia/DPAC, CC BY-SA 3.0 IGO" [S] [ESA Gaia sky in colour](https://sci.esa.int/web/gaia/-/60196-gaia-s-sky-in-colour-equirectangular-projection) | Possible for the Milky Way, but the ShareAlike terms must be understood first (the derivative image is licensed the same way; the app code stays MIT). Needs an ESA source id. |
| Astronomy Picture of the Day (APOD) | Many APOD images belong to third parties, despite being on NASA sites [S]. | **Avoid.** |
| DSS and other survey cutouts (via NED, hips2fits) | Copyright varies by survey and file header; AURA claims the rest [S]. | **Avoid.** |
| MAST science files (FITS) | Mostly public domain, with acknowledgement requested [S]. | Not child-ready without processing; out of scope |

Practical rules, consistent with docs/ASSET_CREDITS.md:
1. For each galaxy, choose one image from a page that states its credit, and record the file, URL, exact credit, licence, any changes (resizing, WebP conversion) and the date checked.
2. Show the credit beside the image whenever it is visible.
3. Resize to about 800 px wide WebP (roughly 100–200 KB each), and load an image only when its galaxy is selected.
4. Never use NASA or ESA logos. Never imply endorsement.
5. Label each picture's `kind` and `light` in words, such as "Photograph · Hubble · visible and infrared light" or "Artist's concept".

## Fitting it into the app

- **Navigation:** add a `cosmos` view (`#/cosmos`, `#/cosmos/andromeda`) to the pure navigation store, and a "Solar system | Cosmos" switch in the explorer. Existing hashes, keyboard shortcuts and views stay as they are; in Cosmos, the planet shortcuts are paused as in the quiz, and Esc returns.
- **Folders:** data in `src/data/`, layout in `src/utils/cosmosLayout.js`, state in `src/features/cosmos.js`, rendering in `src/components/cosmosMap.js` and `cosmosPanel.js`. **No Three.js**, so `scenes/` is untouched. Load the module only when Cosmos is opened, so the first page load stays small.
- **Interaction:** pinch and drag on the SVG map with pointer events (no page scroll or zoom while dragging), ± and reset buttons, a list of 44 px buttons in distance order, and focus moving to the panel heading on selection, with a single announcement. With reduced motion, map moves are instant.
- **Without 3D:** works the same, because it is 2D.
- **Tests:** unit tests for the data, layout and state; browser tests (Chromium, plus one critical journey in WebKit) for choosing a galaxy by tap, keyboard and list, pinch and pan not scrolling the page, 44 px targets, 200% text without sideways scrolling, and the existing activities still passing unchanged.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Hosts couldn't be reached during this assessment | Findings may be out of date or wrong | Re-run every check below before implementing. Treat every [S] as provisional. |
| NED's legacy APIs are deprecated (post-January 2026 data) | A preparation script may use the wrong interface | Read the new NED API specification first |
| NASA pages disagree on distances | A child, parent or test may see conflicting numbers | Pick one page per galaxy, date it, show the other estimates, and say "about" |
| Image licences | Redistribution without permission | One verified ASSET_CREDITS row per file; avoid APOD and DSS |
| Map misread as to scale | Wrong mental model | Bands labelled "not to scale", explanation text and tests on order |
| Milky Way shown as a photo from outside | Scientifically false | `kind: "artist-concept"` enforced by tests, with visible labelling |
| Type labels disputed (M82, M104, LMC) | Wrong or ambiguous answers | Use NASA's wording; keep disputed types out of the quiz and missions |
| Scope creep (3D, live data, many galaxies) | Delays and performance cost | The bounded MVP below |
| Bundle size from images | Slow load on iPad | Lazy-load about 12 WebP images, none on first load |
| AGENTS.md says no new activities until agreed | Process | This document is the proposal; implement only after explicit agreement |

## Bounded MVP recommendation

**In scope**
1. A Cosmos view beside the solar system, with an illustrative distance-band map (option 2) and an equivalent list.
2. The 12 galaxies above. Each has a name, other names, type, viewpoint, a dated NASA distance with other estimates (Detailed mode), a 1–2 sentence summary, 2–3 facts, and one licensed image with a visible credit and kind label.
3. A short "How far is far?" explainer covering apparent versus physical size versus distance, uncertainty, redshift and the Milky Way from inside.
4. Pinch, drag and ± zoom; keyboard and screen-reader support; 44 px targets; reduced motion; works at 200% text; no Three.js.
5. Data prepared offline. A documented, manually run script (or a manual procedure) records NED cross-checks with dates. The app makes no runtime calls to external services.
6. Tests as listed above, and docs (SCIENCE.md sections, ASSET_CREDITS rows, ARCHITECTURE, README, RELEASE_CHECKLIST lines).

**Out of scope for the MVP:** the 3D galaxy map, a real sky-coordinate map, live API calls, HiPS or DSS imagery, galaxy quiz questions or missions, more than 12 galaxies, offline caching, and anything stored between visits.

**Decisions needed from the owner**
1. Agree to add Cosmos as a new view (required by AGENTS.md).
2. Should NED count as a "NASA primary source" that the app can cite, or stay as a cross-check only? (Recommended: cross-check only.)
3. For the Milky Way picture: a NASA artist's concept, or the ESA Gaia all-sky map? The Gaia map is CC BY-SA 3.0 IGO and needs ESA source ids added.
4. Keep the Sombrero's and M82's types as "NASA describes it as …", or swap them for galaxies with uncontested types?

## Verification still needed

Re-run these from a machine with normal internet access, and paste the actual responses (or the error) into this document or the PR:

1. The NED new API specification: which endpoints are current, and whether TAP and ObjectLookup are affected by the legacy deprecation.
2. A NED TAP query for `NEDTAP.objdir` for M31: column names and one example row. Also the ObjectLookup response for M31, and NED's rate limits and terms.
3. The NED-D distances for each of the 12 galaxies: count, methods, range, median.
4. The MAST `Mast.Name.Lookup` request and response for M31. The MAST rate-limit policy.
5. The SIMBAD TAP `basic` table for M31: `main_id`, `ra`, `dec`, `otype`, `morph_type`. The current SIMBAD usage limits.
6. Whether the hips2fits example returns an image; the DSS2 colour HiPS licence note. Current IVOA standard versions.
7. NASA Image and Video Library search results for each galaxy, with `nasa_id`, title, centre and credit fields.
8. Each galaxy's NASA page: distance, type wording, facts and image credit, read on the page itself.
9. The current HubbleSite, webbtelescope.org, esahubble.org, esawebb.org and ESA multimedia terms pages.
10. CORS headers, but only if a later version ever calls a service from the browser. The MVP doesn't.
