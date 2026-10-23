# Science references

Every piece of displayed science has a `sourceId` (facts) or `sourceIds` (text blocks, measurements, moon counts) that matches a heading below and an entry in [src/data/sources.json](../src/data/sources.json). Text is paraphrased from NASA pages, not quoted. Review the meaning against the linked page before changing wording. Automated tests check structure, citations, that this file matches the data, and some wording rules. They do not check scientific truth, so a human review against the sources is still needed.

All sources were retrieved on 2026-10-22.

## Measured values used in the app

These come from the NASA NSSDCA fact sheets ([planets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/), last updated 18 March 2025; [Sun](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html), last updated 9 May 2024). Volumetric mean radii come from each planet's own fact sheet (listed below). Tests check every value in this table against `src/data/`.

| Body | Diameter (km) | Volumetric mean radius (km) | Mass (10^24 kg) | Gravity (m/s²) | Distance from Sun (10^6 km) | Rotation period (h) | Length of day (h) | Orbital period (days) | Obliquity (°) | Temperature (°C) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sun | 1391400 | 695700 | 1988400 | 274 | — | 609.12 | — | — | — | 5499 |
| Mercury | 4879 | 2439.7 | 0.33 | 3.7 | 57.9 | 1407.6 | 4222.6 | 88 | 0.034 | 167 |
| Venus | 12104 | 6051.8 | 4.87 | 8.9 | 108.2 | -5832.5 | 2802 | 224.7 | 177.4 | 464 |
| Earth | 12756 | 6371 | 5.97 | 9.8 | 149.6 | 23.9 | 24 | 365.2 | 23.4 | 15 |
| Mars | 6792 | 3389.5 | 0.642 | 3.7 | 228 | 24.6 | 24.7 | 687 | 25.2 | -65 |
| Jupiter | 142984 | 69911 | 1898 | 23.1 | 778.5 | 9.9 | 9.9 | 4331 | 3.1 | -110 |
| Saturn | 120536 | 58232 | 568 | 9 | 1432 | 10.7 | 10.7 | 10747 | 26.7 | -140 |
| Uranus | 51118 | 25362 | 86.8 | 8.7 | 2867 | -17.2 | 17.2 | 30589 | 97.8 | -195 |
| Neptune | 49528 | 24622 | 102 | 11 | 4515 | 16.1 | 16.1 | 59800 | 28.3 | -200 |

How to read these values:

- **Diameter:** equatorial for planets. The Sun's is twice its volumetric mean radius of 695,700 km.
- **Volumetric mean radius:** the radius of a perfect ball with the same volume as the planet. The giant planets are flattened by their fast spin, so cubing their equatorial diameters would overstate their volumes (Jupiter would come out at about 1,408 Earths instead of NASA's 1,321). Volume comparisons use this radius.
- **Gravity:** at the surface for the rocky planets. Jupiter, Saturn, Uranus and Neptune have no solid surface, so the fact sheet gives gravity at the **1-bar level** in the atmosphere, where the pressure is about the same as Earth's air at sea level. The Sun's value is at the photosphere, its visible layer of glowing gas.
- **Rotation period vs length of day:** rotation is one spin relative to the distant stars. Length of day is sunrise to sunrise. Negative rotation values (Venus, Uranus) mean the planet spins backwards (retrograde) compared with Earth. The Sun's rotation is measured at 16° latitude, because different latitudes spin at different speeds.
- **Orbital period:** one year on that planet, in Earth days.
- **Temperature:** average over the whole surface for rocky planets, and at the 1-bar level for the giant planets. The Sun's value is its effective temperature of 5,772 K converted to °C (5,498.85, shown as 5,499).
- **Mass:** in units of 10^24 kg, so Earth's 5.97 means 5.97 × 10^24 kg.

## Moon counts

Moon counts change as new moons are confirmed, so every count is dated and the app shows the date. NASA pages sometimes disagree while discoveries are being confirmed; the app uses the newest dated NASA count and explains any difference in a note.

| Body | Count | As of | Note |
| --- | --- | --- | --- |
| Sun | 0 | 2026-10-22 | The Sun has no moons. Instead, the planets and their moons travel around it. |
| Mercury | 0 | 2026-07-31 | Mercury has no moons and no rings. |
| Venus | 0 | 2026-07-31 | Venus and Mercury are the only planets without a moon. Venus does have a quasi-satellite, an asteroid called Zoozve that stays near it. |
| Earth | 1 | 2026-07-31 | Our Moon. Earth is the only planet in our solar system with only one moon. |
| Mars | 2 | 2026-07-31 | Phobos and Deimos, two small moons that may be captured asteroids. |
| Jupiter | 115 | 2026-04 | NASA's fact sheet still lists 95 (last updated March 2025). The count keeps growing as new moons are confirmed. |
| Saturn | 293 | 2026-06 | NASA's Saturn facts page gave 274 confirmed moons as of March 2025. Saturn has more known moons than any other planet. |
| Uranus | 29 | 2026-07-31 | NASA's Uranus facts page lists 28 known moons. Counts can differ between pages while new discoveries are being confirmed. |
| Neptune | 16 | 2026-07-31 | Its largest moon, Triton, orbits in the opposite direction to Neptune's spin. |

## Sources and the facts they support

Each heading below is a `sourceId`. Facts shown in the app must appear word for word under their source; tests enforce this.

## nasa-fact-sheet

- Source: [NASA NSSDCA — Planetary Fact Sheet (metric)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- Page last updated: 2025-03-18
- Used for: Mercury temperature context; Mercury measurements; Venus temperature context; Venus measurements; Earth temperature context; Earth measurements; Mars temperature context; Mars measurements; Jupiter temperature context; Jupiter measurements; Saturn temperature context; Saturn measurements; Uranus summary; Uranus temperature context; Uranus measurements; Neptune temperature context; Neptune measurements

## nasa-fact-sheet-notes

- Source: [NASA NSSDCA — Planetary Fact Sheet notes](https://nssdc.gsfc.nasa.gov/planetary/factsheet/planetfact_notes.html)
- Page last updated: 2021-12-20
- Used for: Jupiter temperature context; Jupiter measurements; Saturn temperature context; Saturn measurements; Uranus temperature context; Uranus measurements; Neptune temperature context; Neptune measurements

## nasa-sun-fact-sheet

- Source: [NASA NSSDCA — Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html)
- Page last updated: 2024-05-09
- Used for: Sun temperature context; Sun composition; Sun measurements

## nasa-mercury-fact-sheet

- Source: [NASA NSSDCA — Mercury Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html)
- Page last updated: 2024-01-11
- Used for: Mercury volumetric mean radius (2439.7 km)

## nasa-venus-fact-sheet

- Source: [NASA NSSDCA — Venus Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html)
- Page last updated: 2024-01-11
- Used for: Venus volumetric mean radius (6051.8 km)

## nasa-earth-fact-sheet

- Source: [NASA NSSDCA — Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)
- Page last updated: 2024-11-15
- Used for: Earth volumetric mean radius (6371 km)

## nasa-mars-fact-sheet

- Source: [NASA NSSDCA — Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)
- Page last updated: 2025-05-19
- Used for: Mars volumetric mean radius (3389.5 km)

## nasa-jupiter-fact-sheet

- Source: [NASA NSSDCA — Jupiter Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html)
- Page last updated: 2024-10-02
- Used for: Jupiter volumetric mean radius (69911 km)

## nasa-saturn-fact-sheet

- Source: [NASA NSSDCA — Saturn Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html)
- Page last updated: 2025-03-18
- Used for: Saturn volumetric mean radius (58232 km)

## nasa-uranus-fact-sheet

- Source: [NASA NSSDCA — Uranus Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html)
- Page last updated: 2024-10-02
- Used for: Uranus volumetric mean radius (25362 km)

## nasa-neptune-fact-sheet

- Source: [NASA NSSDCA — Neptune Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html)
- Page last updated: 2024-10-03
- Used for: Neptune volumetric mean radius (24622 km)

## nasa-moon-counts

- Source: [NASA Space Place — How Many Moons Does Each Planet Have?](https://spaceplace.nasa.gov/how-many-moons/en/)
- Page last updated: 2026-07-31
- Used for: Mercury moon count; Venus moon count; Earth moon count; Mars moon count; Jupiter moon count; Saturn moon count; Uranus moon count; Neptune moon count

## nasa-sun

- Source: [NASA Science — The Sun](https://science.nasa.gov/sun/)
- Used for: Sun summary
- Fact: The Sun's connection with Earth drives our seasons, ocean currents, weather and climate.

## nasa-sun-facts

- Source: [NASA Science — Sun: Facts](https://science.nasa.gov/sun/facts/)
- Used for: Sun summary; Sun temperature context; Sun composition; Sun moon count
- Fact: The Sun is about 100 times wider than Earth and about 10 times wider than Jupiter.
- Fact: It would take about 1.3 million Earths to fill the Sun.
- Fact: Solar flares are by far the most powerful explosions in the solar system.

## nasa-mercury

- Source: [NASA Science — Mercury](https://science.nasa.gov/mercury/)
- Used for: Mercury summary
- Fact: Mercury is the smallest planet in our solar system.

## nasa-mercury-facts

- Source: [NASA Science — Mercury: Facts](https://science.nasa.gov/mercury/facts/)
- Used for: Mercury summary; Mercury temperature context; Mercury composition; Mercury moon count
- Fact: One solar day on Mercury, from one sunrise to the next, lasts 176 Earth days: just over two Mercury years.
- Fact: From Mercury, the Sun would look more than three times as large as it does from Earth.
- Fact: Mercury is the second densest planet, after Earth.

## nasa-venus

- Source: [NASA Science — Venus](https://science.nasa.gov/venus/)
- Used for: Venus summary
- Fact: Venus is the hottest planet in our solar system.

## nasa-venus-facts

- Source: [NASA Science — Venus: Facts](https://science.nasa.gov/venus/venus-facts/)
- Used for: Venus summary; Venus temperature context; Venus composition; Venus moon count
- Fact: Venus spins backwards compared with Earth.
- Fact: Venus takes 243 Earth days to spin around once, which is longer than its whole year of 225 Earth days.
- Fact: The air on Venus presses down as hard as being more than 900 metres (3,000 feet) underwater on Earth.

## nasa-earth

- Source: [NASA Science — Earth](https://science.nasa.gov/earth/)
- Used for: Earth summary
- Fact: Earth is the only planet known to support life.

## nasa-earth-facts

- Source: [NASA Science — Facts About Earth](https://science.nasa.gov/earth/facts/)
- Used for: Earth summary; Earth temperature context; Earth composition; Earth moon count
- Fact: Earth's global ocean covers about 71% of the planet's surface.
- Fact: Earth is the only planet in our solar system with only one moon.
- Fact: Earth's air is 78% nitrogen, 21% oxygen and 1% other gases.

## nasa-mars

- Source: [NASA Science — Mars](https://science.nasa.gov/mars/)
- Fact: Mars has two small moons, Phobos and Deimos.

## nasa-mars-facts

- Source: [NASA Science — Mars: Facts](https://science.nasa.gov/mars/facts/)
- Used for: Mars summary; Mars temperature context; Mars composition; Mars moon count
- Fact: Olympus Mons on Mars is more than 40 km tall from base to summit, dwarfing Mount Everest.
- Fact: Mars is the only planet we know of inhabited entirely by robots.
- Fact: A day on Mars is called a sol, short for solar day.

## nasa-jupiter

- Source: [NASA Science — Jupiter](https://science.nasa.gov/jupiter/)
- Used for: Jupiter summary
- Fact: Jupiter is the largest planet in our solar system.

## nasa-jupiter-facts

- Source: [NASA Science — Jupiter Facts](https://science.nasa.gov/jupiter/jupiter-facts/)
- Used for: Jupiter summary; Jupiter composition; Jupiter moon count
- Fact: Jupiter has the shortest day in the solar system: about 9.9 hours.
- Fact: The Great Red Spot is a giant storm about twice as wide as Earth.
- Fact: If Earth were the size of a grape, Jupiter would be about as big as a basketball.

## nasa-saturn

- Source: [NASA Science — Saturn](https://science.nasa.gov/saturn/)
- Used for: Saturn summary; Saturn moon count
- Fact: Saturn is a gas giant with a spectacular system of rings.
- Fact: Saturn's largest moon, Titan, is bigger than the planet Mercury.

## nasa-saturn-facts

- Source: [NASA Science — Saturn: Facts](https://science.nasa.gov/saturn/facts/)
- Used for: Saturn summary; Saturn composition
- Fact: Saturn is the only planet in our solar system with an average density less than water.
- Fact: Saturn's rings are made of billions of small chunks of ice and rock.

## nasa-uranus

- Source: [NASA Science — Uranus](https://science.nasa.gov/uranus/)
- Fact: Uranus rotates on its side.
- Fact: Only one spacecraft, Voyager 2, has explored Uranus, with a close approach in January 1986.

## nasa-uranus-facts

- Source: [NASA Science — Uranus: Facts](https://science.nasa.gov/uranus/facts/)
- Used for: Uranus summary; Uranus temperature context; Uranus composition
- Fact: Uranus was the first planet found with a telescope, discovered by William Herschel in 1781.
- Fact: Uranus's moons are named after characters from the works of William Shakespeare and Alexander Pope.

## nasa-neptune

- Source: [NASA Science — Neptune](https://science.nasa.gov/neptune/)
- Used for: Neptune summary
- Fact: Neptune is the eighth and most distant planet from the Sun.
- Fact: Neptune was the first planet located through mathematical predictions rather than through observations of the sky.

## nasa-neptune-facts

- Source: [NASA Science — Neptune: Facts](https://science.nasa.gov/neptune/neptune-facts/)
- Used for: Neptune summary; Neptune composition; Neptune moon count
- Fact: Neptune is the only planet in our solar system not visible to the naked eye.
- Fact: Neptune's winds can blow at more than 2,000 km/h, about three times as fast as Jupiter's strongest winds.

## Quiz questions

The Planet Quiz (`src/data/quiz.json`) adds no new science. Each question's `basis` points at a fact, panel text, measurement or ranking already in the data above, and its `sourceIds` are sources the information panels already cite. Tests enforce both. Questions avoid moon counts, which change, and comparisons that could be argued either way.

## Measurements vs models

The app separates two kinds of information, and labels them in the interface:

- **Measured by scientists:** the facts and numbers in the information panels come from the NASA sources above. Comparisons with Earth (for example "about 11 times as wide") are calculated in code from those measured values and are tested.
- **Illustrative model:** the 3D scene is not to scale. Planet sizes are enlarged compared with their distances, distances are compressed, the Sun is shrunk, orbit and spin speeds are sped up, orbits are drawn as circles, and planet positions are not where the planets are today. Surface colours and patterns are generated by code as an artist's impression, not NASA imagery, and the background stars are decorative. The direction each planet spins and its axis tilt do follow the fact sheet.

## Editorial rules

Use NASA or ESA primary sources. Cite the specific page for each new fact, add it to `src/data/sources.json` and add a heading here. Give units and distinguish solar days from rotation periods. Date volatile claims such as moon counts. Never describe Jupiter, Saturn, Uranus, Neptune or the Sun as having a solid surface or ground to stand on; give gravity and temperature at the 1-bar level (or photosphere for the Sun) and say so. Label compressed distances, exaggerated sizes and sped-up motion as illustrative. Pluto is a dwarf planet, not one of the eight planets.

## Discovery Missions

Discovery Missions (`src/data/missions.json`) add no new science. Each step's `basis` points at a fact, panel text, a world's kind or surface flag, the order from the Sun, a true-scale comparison the overview already calculates (the Sun about 1.1 metres wide, Neptune about 3.5 km away), or the app's own note that the 3D view is not to scale. Step sources are ones the information panels already cite, and tests check that mission text introduces no other numbers apart from clearly wrong quiz-style distractors.

## Science Experiments

The Science Experiments (`src/data/experiments.json`, calculations in `src/utils/experiments.js`) are illustrative learning models, not realistic physics simulations. They add no new measurements: every input value comes from the measured values table above.

### Gravity lab

- **Formula:** force = mass × gravity, **F = m × g**. Mass *m* is in kilograms (kg), gravity *g* in metres per second squared (m/s²), and the force *F* in newtons (N). Worked examples used by the tests: 10 kg × 9.8 m/s² = 98 N (Earth) and 10 kg × 3.7 m/s² = 37 N (Mars).
- **Gravity values:** the fact sheet's gravity for each planet (`gravityMs2`, source `nasa-fact-sheet`). For Jupiter, Saturn, Uranus and Neptune this is at the **1-bar level** in the atmosphere (definition from `nasa-fact-sheet-notes`), and the app says there is no solid surface and nobody could stand there. The Sun is not offered.
- **Mass and weight:** the mass the child chooses never changes. Weight is the force from gravity on that mass, so only the force in newtons changes from planet to planet. The app never gives weight in kilograms.
- **Comparison:** the ratio is the planet's gravity ÷ Earth's 9.8 m/s². Within ±3% counts as "about the same", matching the Earth comparisons in the information panels. Less than that is shown as a percentage, and more as "about N times".
- **Inputs:** a mass from 0.1 to 1,000 kg. Empty, non-numeric, zero, negative and out-of-range values are refused with a message saying what to type.
- **Assumptions:** one gravity value per planet. Real gravity varies slightly with latitude, height and spin, which this model ignores.

### Build a tiny solar system

- **Formula:** model size = real size × (model Earth diameter ÷ Earth's real diameter of 12,756 km). It reuses `trueScaleModel` in `src/utils/scale.js`, the same calculation as the overview's "The real size of space".
- **Measurements used:** planet diameters are the fact sheet's **equatorial** diameters. The Sun's diameter is **twice its volumetric mean radius** (2 × 695,700 = 1,391,400 km). Distances are each planet's **mean distance from the Sun**. Sources: `nasa-fact-sheet` and `nasa-sun-fact-sheet`.
- **Averages:** orbits are not perfect circles, so each planet's real distance changes as it moves, and the planets are almost never lined up. The app says so beside the results.
- **Inputs:** a model Earth diameter from 0.5 to 5 cm with up to 2 decimal places, typed or chosen with a slider. The slider moves in 0.01 cm steps (arrow keys move 0.1 cm), so it can show every value the field accepts and the two always match. A third decimal place is refused with a message.
- **Prediction:** an optional, unscored guess of Neptune's model distance: under 5 km, 5–10 km or over 10 km. Neptune is 3,539.5 m away per centimetre of model Earth, so the answer changes across the allowed sizes (about 1.8 km at 0.5 cm, 5 km at about 1.41 cm, 10 km at about 2.83 cm and 17.7 km at 5 cm).
- **No same-scale picture:** results are cards, not a diagram, because a drawing at one scale would not fit on screen.
- **Worked examples used by the tests:** with Earth 1 cm wide, the Sun is 109.08 cm wide and Neptune is 3,539.5 m away. With Earth 2 cm, Jupiter is 22.42 cm. With Earth 0.5 cm, Mercury is 22.70 m away. With Earth 5 cm, Neptune is 17,697.6 m away.

### Rounding

Calculations keep full precision. Inputs are always shown exactly as entered: the mass in every heading and equation, and the model Earth's width. Only results are rounded for display: forces to two decimal places below 10 N and one above (45.6765 N shows as 45.7 N, 0.98 N stays 0.98 N), gravity to one decimal place (as in the fact sheet), model sizes to one decimal place in millimetres below 1 cm, centimetres below 1 m and metres above, and model distances to whole metres below 1 km and to 0.1 km above. Equations use “=” when the shown result is exact and “≈” when it has been rounded, so a child can repeat them by hand: 10 kg × 3.7 m/s² = 37 N, but 0.1049 kg × 23.1 m/s² ≈ 2.42 N (exactly 2.42319 N).


## Galaxies (Cosmos collection)

Data for the planned Cosmos view lives in [src/data/galaxies.json](../src/data/galaxies.json), validated by `galaxies.schema.json`. How it is prepared and updated is in [docs/COSMOS_DATA.md](COSMOS_DATA.md). NASA pages were retrieved on 2026-10-22; the NED cross-check on 2026-10-23. Every fact below appears under its source with the exact sentence from the NASA page that supports it, checked word for word against a saved copy of the page when the data was prepared. Tests check structure and consistency only; a person still needs to review the meaning against each page.

### How to read galaxy values

- **Apparent size, physical size and distance are different things.** Apparent size is how big a galaxy looks in our sky (Andromeda looks six times as wide as the full Moon). Physical size is how big it really is (the Pinwheel is about 170,000 light-years across). Distance is how far away it is. A big galaxy far away can look smaller than a small galaxy nearby.
- **Distances are estimates.** Each galaxy shows one NASA value, rounded and introduced with "about". Where NASA pages disagree, the other values are kept in `otherEstimates` and the choice is explained in `selection`. NED lists many published estimates for each galaxy (from 21 for M82 to 824 for the Large Magellanic Cloud), and they spread widely; NED says its summary statistics are original published values with no homogenisation.
- **Selection rule.** Use the NASA page cited for the galaxy. If NASA pages disagree, use the NASA value closest to the median of the published estimates in NED. NED itself is never shown or cited in the app; it is a cross-check.
- **Redshift is not used as a distance.** For nearby galaxies, a galaxy's own motion can outweigh the stretching of light by the expanding universe. In the NED cross-check, the Andromeda Galaxy, the Triangulum Galaxy and Messier 81 all have negative redshifts (they are moving towards us), so their redshifts say nothing useful about their distances. No distance here is worked out from a redshift.
- **The Milky Way is different.** We live inside it, so it has no distance from us and no single position in the sky, and nobody has photographed the whole galaxy from outside. Its picture is an artist's concept and is labelled that way; its size and our distance from its centre come from NASA's Imagine the Universe page.
- **Sky positions** are NED J2000 equatorial coordinates, recorded only as a cross-check. The approved first map arranges galaxies by distance band and does not use them.

### Galaxy distances

Tests check this table against `src/data/galaxies.json`. Distances are in light-years; NED values are in megaparsecs (1 Mpc is about 3.26 million light-years).

| Galaxy | Distance used (ly) | Source | Other NASA estimates (ly) | NED estimates | NED median (Mpc) | NED range (Mpc) |
| --- | --- | --- | --- | --- | --- | --- |
| Milky Way | — | — | — | — | — | — |
| Large Magellanic Cloud | 163,000 | nasa-swift-magellanic-clouds | 179,000 | 824 | 0.05 | 0.033–0.071 |
| Small Magellanic Cloud | 200,000 | nasa-swift-magellanic-clouds | 210,000 | 294 | 0.061 | 0.039–0.098 |
| Andromeda Galaxy | 2,500,000 | nasa-messier-31 | — | 407 | 0.779 | 0.44–2.8 |
| Triangulum Galaxy | 3,000,000 | nasa-messier-33 | — | 137 | 0.859 | 0.6–3.05 |
| Messier 81 | 11,600,000 | nasa-messier-81 | — | 99 | 3.63 | 1.4–5.0 |
| Cigar Galaxy | 12,000,000 | nasa-messier-82 | — | 21 | 3.7 | 2.4–5.5 |
| Pinwheel Galaxy | 21,800,000 | nasa-hubble-messier-101-image | 25,000,000 | 116 | 6.73 | 2.6–8.99 |
| Sombrero Galaxy | 28,000,000 | nasa-messier-104 | — | 31 | 9.95 | 6.22–21.7 |
| Whirlpool Galaxy | 31,000,000 | nasa-messier-51 | — | 53 | 7.8 | 2.45–12.2 |
| Messier 87 | 54,000,000 | nasa-messier-87 | — | 118 | 16.4 | 9.2–29.1 |
| NGC 1300 | 69,000,000 | nasa-hubble-ngc-1300 | — | 27 | 14.5 | 8.67–22.6 |

Open scientific questions (also listed in the pull request): NGC 1300 (NASA 69 million light-years; NED median about 47 million), the Whirlpool Galaxy (NASA 31 million; NED median about 25 million) and the Sombrero Galaxy (NASA 28 million; NED median about 32 million).

## nasa-hubble-galaxies

- Source: [NASA Science — Hubble's Galaxies](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-galaxies/)
- Used for: Milky Way type; Whirlpool Galaxy distance
- Milky Way classification, page says: "Our Milky Way is thought to be a barred spiral galaxy."
- Whirlpool distance, page says: "The Whirlpool Galaxy is a spiral galaxy located 31 million light-years away."

## nasa-milky-way

- Source: [NASA Imagine the Universe — The Milky Way Galaxy](https://imagine.gsfc.nasa.gov/science/featured_science/milkyway/)
- Used for: Milky Way summary; Milky Way size
- Milky Way summary, page says: "When you look up at the night sky, most of the stars you see are in one of the Milky Way arms."
- Fact: The Milky Way is about 100,000 light-years across.
  - Page says: "The Milky Way is approximately 100,000 light-years in diameter."
- Fact: Our solar system is about 26,000 light-years from the centre of the Milky Way.
  - Page says: "Our solar system is 26,000 light-years from the center of the Galaxy."
- Fact: Our Sun, with Earth, takes about 250 million years to travel once around the centre of the Milky Way.
  - Page says: "It takes 250 million years for our Sun (and the Earth with it) to make one revolution around the center of the Milky Way."

## nasa-nearest-galaxies

- Source: [NASA Imagine the Universe — The Nearest Galaxies](https://imagine.gsfc.nasa.gov/features/cosmic/nearest_galaxy_info.html)
- Used for: Large Magellanic Cloud type; Large Magellanic Cloud summary; Large Magellanic Cloud other distance estimate; Large Magellanic Cloud distance context; Small Magellanic Cloud type; Small Magellanic Cloud summary; Small Magellanic Cloud other distance estimate; Small Magellanic Cloud distance context
- Magellanic Cloud distance methods, page says: "Astronomers primarily use Cepheid and/or RR Lyrae Variables to measure distances to the LMC, the SMC, and the Dwarf Galaxies."
- Magellanic Cloud classification, page says: "The Magellanic Clouds are irregular dwarf galaxies orbiting our Milky Way galaxy."
- LMC and SMC distances, page says: "The LMC is 179,000 light years away from the Milky Way. The SMC is further out, at 210,000 light years."
- Fact: It may once have been a barred disk, pulled out of shape by the gravity of the Milky Way and the Large Magellanic Cloud.
  - Page says: "The SMC, also an irregular galaxy, may be a distorted barred disk, deformed by the tidal forces of Milky Way and LMC."

## nasa-swift-magellanic-clouds

- Source: [NASA Scientific Visualization Studio — NASA's Swift Mosaics of the Magellanic Clouds](https://svs.gsfc.nasa.gov/11293)
- Used for: Large Magellanic Cloud summary; Large Magellanic Cloud size; Large Magellanic Cloud distance; Large Magellanic Cloud constellation; Large Magellanic Cloud image description; Small Magellanic Cloud summary; Small Magellanic Cloud distance; Small Magellanic Cloud constellation; Small Magellanic Cloud image description
- LMC summary, page says: "The Large and Small Magellanic Clouds are readily visible from the Southern Hemisphere as faint, glowing patches in the night sky."
- Fact: The Large and Small Magellanic Clouds orbit each other as well as our Milky Way.
  - Page says: "orbit each other as well as our own Milky Way galaxy."
- Fact: The Large Magellanic Cloud is about one-tenth the size of the Milky Way, with only 1 percent of its mass.
  - Page says: "Compared to the Milky Way, the LMC has about one-tenth its physical size and only 1 percent of its mass."
- Fact: The Magellanic Clouds are named after Ferdinand Magellan, who led an expedition to sail around the world in 1519.
  - Page says: "The galaxies are named after Ferdinand Magellan, the Portuguese explorer who in 1519 led an expedition to sail around the world."
- LMC size, page says: "The LMC is about 14,000 light-years across."
- LMC and SMC distances, page says: "The Large and Small Magellanic Clouds, or LMC and SMC for short, lie about 163,000 and 200,000 light-years away, respectively"
- Fact: The Small Magellanic Cloud is only half the size of the Large Magellanic Cloud.
  - Page says: "The SMC is only half the size of the LMC and contains about two-thirds of its mass."

## nasa-messier-31

- Source: [NASA Science — Messier 31 (The Andromeda Galaxy)](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/)
- Used for: Milky Way summary; Andromeda Galaxy type; Andromeda Galaxy summary; Andromeda Galaxy distance; Andromeda Galaxy constellation; Andromeda Galaxy image description
- Milky Way summary, page says: "That's because we are embedded inside the Milky Way."
- Andromeda summary, page says: "M31, also well-known as the Andromeda Galaxy, is the nearest major galaxy to our own, the Milky Way."
- Andromeda summary, page says: "It is easily visible with the unaided eye from a dark sky site."
- Fact: In our sky, the Andromeda Galaxy looks six times as wide as the full Moon.
  - Page says: "in angular size it is six times the apparent diameter of the full Moon."
- Fact: Hubble's 2025 picture of Andromeda shows the glow of 200 million stars, and that is still only part of the galaxy.
  - Page says: "This stunning, colorful mosaic captures the glow of 200 million stars. That's still a fraction of Andromeda's population."
- Fact: The first known written report of the Andromeda Galaxy is in a book from the year 964 by the Persian astronomer al-Sufi.
  - Page says: "However, Persian astronomer Abd al-rahman al-Sufi's The Book of Fixed Stars from the year 964 contains the first known report of the object."

## nasa-messier-33

- Source: [NASA Science — Messier 33 (The Triangulum Galaxy)](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-33/)
- Used for: Triangulum Galaxy type; Triangulum Galaxy summary; Triangulum Galaxy distance; Triangulum Galaxy constellation; Triangulum Galaxy image description
- Triangulum summary, page says: "About half the size of our Milky Way galaxy, M33 is the third-largest member of our Local Group of galaxies following the Andromeda galaxy (M31) and the Milky Way."
- Fact: On average, new stars are forming in the Triangulum Galaxy ten times faster than in the Andromeda Galaxy.
  - Page says: "Hubble's observations reveal that the Triangulum galaxy's star formation rate is ten times higher than the average found in the Andromeda galaxy"
- Fact: In the 1920s, Edwin Hubble studied stars that change in brightness in this galaxy, and proved it is a separate galaxy outside our own.
  - Page says: "In the 1920s, astronomer Edwin Hubble studied dozens of variable stars (those that periodically change brightness) in M33, which helped him to estimate the object's distance and prove that M33 is not a nebula within our own galaxy, as previously suspected, but actually a separate galaxy outside our own."
- Fact: Under very clear, dark skies, keen-eyed people can just see it without a telescope.
  - Page says: "one of the most distant objects that keen-eyed observers can view with the unaided eye (under exceptionally clear and dark skies)."

## nasa-messier-51

- Source: [NASA Science — Messier 51 (The Whirlpool Galaxy)](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-51/)
- Used for: Whirlpool Galaxy type; Whirlpool Galaxy summary; Whirlpool Galaxy distance; Whirlpool Galaxy constellation; Whirlpool Galaxy image description
- Whirlpool summary, page says: "It highlights the attributes of a typical spiral galaxy, including graceful, curving arms, pink star-forming regions, and brilliant blue strands of star clusters."
- Fact: A small galaxy called NGC 5195 has been gliding past the Whirlpool for hundreds of millions of years.
  - Page says: "The small galaxy has been gliding past the Whirlpool for hundreds of millions of years."
- Fact: The Whirlpool's spiral arms are star-making factories: they squeeze hydrogen gas and create clusters of new stars.
  - Page says: "they are star-formation factories, compressing hydrogen gas and creating clusters of new stars."
- Fact: Charles Messier discovered it in 1773.
  - Page says: "Discovered by Charles Messier in 1773"

## nasa-messier-81

- Source: [NASA Science — Messier 81](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-81/)
- Used for: Messier 81 type; Messier 81 summary; Messier 81 distance; Messier 81 constellation; Messier 81 image description
- M81 summary, page says: "The galaxy's spiral arms, which wind all the way down into its nucleus, are made up of young, bluish, hot stars formed in the past few million years."
- Fact: M81 is one of the brightest galaxies in the night sky.
  - Page says: "M81 is one of the brightest galaxies in the night sky."
- Fact: Through binoculars, M81 and its neighbour M82 can be seen together in the same view.
  - Page says: "Through a pair of binoculars, the galaxy appears as a faint patch of light in the same field of view as M82."
- Fact: A black hole with the mass of 70 million Suns sits at the centre of M81.
  - Page says: "A black hole of 70 million solar masses resides at the center of M81"

## nasa-messier-82

- Source: [NASA Science — Messier 82 (The Cigar Galaxy)](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-82/)
- Used for: Cigar Galaxy type; Cigar Galaxy summary; Cigar Galaxy distance; Cigar Galaxy constellation; Cigar Galaxy image description; Cigar Galaxy type note
- Cigar Galaxy summary, page says: "The Cigar galaxy experiences gravitational interactions with its galactic neighbor, M81, causing it to have an extraordinarily high rate of star formation — a starburst."
- Fact: Around its centre, young stars are being born 10 times faster than in our whole Milky Way.
  - Page says: "Around the galaxy's center, young stars are being born 10 times faster than they are inside our entire Milky Way galaxy."
- Fact: This burst of star formation will probably die down in a few tens of millions of years.
  - Page says: "The starburst will then subside, probably in a few tens of millions of years."
- Fact: The Cigar Galaxy shines brightly in infrared light.
  - Page says: "M82 or the Cigar galaxy, shines brightly at infrared wavelengths and is remarkable for its star formation activity."

## nasa-messier-87

- Source: [NASA Science — Messier 87](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/)
- Used for: Messier 87 type; Messier 87 summary; Messier 87 distance; Messier 87 constellation
- M87 summary, page says: "The monstrous M87 is the dominant member of the neighboring Virgo cluster of galaxies, which contains some 2,000 galaxies."
- Fact: M87 is home to several trillion stars, a supermassive black hole and about 15,000 globular star clusters.
  - Page says: "The elliptical galaxy M87 is the home of several trillion stars, a supermassive black hole and a family of roughly 15,000 globular star clusters."
- Fact: Our Milky Way has only a few hundred billion stars and about 150 globular clusters.
  - Page says: "For comparison, our Milky Way galaxy contains only a few hundred billion stars and about 150 globular clusters."
- Fact: A jet of tiny particles, powered by a black hole, streams out of its centre at nearly the speed of light.
  - Page says: "a black-hole-powered jet of subatomic particles traveling at nearly the speed of light."

## nasa-messier-101

- Source: [NASA Science — Messier 101 (The Pinwheel Galaxy)](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-101/)
- Used for: Pinwheel Galaxy type; Pinwheel Galaxy summary; Pinwheel Galaxy size; Pinwheel Galaxy other distance estimate; Pinwheel Galaxy constellation
- Fact: The Pinwheel Galaxy is about 170,000 light-years across, nearly twice as wide as our Milky Way.
  - Page says: "The giant spiral disk of stars, dust, and gas is 170,000 light-years across — nearly twice the diameter of our galaxy, the Milky Way."
- Fact: Astronomers estimate that it contains at least one trillion stars.
  - Page says: "Astronomers estimate that M101 contains at least one trillion stars."
- Fact: Pierre Méchain, one of Charles Messier's colleagues, discovered it in 1781.
  - Page says: "Pierre Méchain, one of Charles Messier's colleagues, discovered the Pinwheel galaxy in 1781."
- Pinwheel distance, page says: "Located 25 million light-years away from Earth in the constellation Ursa Major"

## nasa-hubble-messier-101-image

- Source: [NASA Science — Hubble Image of M101](https://science.nasa.gov/asset/hubble/hubble-image-of-m101/)
- Used for: Pinwheel Galaxy summary; Pinwheel Galaxy distance; Pinwheel Galaxy image description
- Pinwheel summary and NGC number, page says: "Messier 101 (also known as NGC 5457) is a stunning face-on spiral galaxy about 22 million light-years away in the direction of the constellation Ursa Major."
- Pinwheel distance, page says: "21.8 million light-years (6.7 megaparsecs)"
- Pinwheel image filters, page says: "F435W (B), F555W (V)), and F814W (I)"

## nasa-messier-104

- Source: [NASA Science — Messier 104 (The Sombrero Galaxy)](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-104/)
- Used for: Sombrero Galaxy type; Sombrero Galaxy summary; Sombrero Galaxy distance; Sombrero Galaxy constellation; Sombrero Galaxy image description; Sombrero Galaxy type note
- Sombrero summary, page says: "Looking like a broad-brimmed Mexican hat, the "Sombrero" Galaxy, M104, is a spiral galaxy seen nearly edge-on."
- Fact: It has nearly 2,000 globular star clusters, about 10 times as many as our Milky Way.
  - Page says: "Hubble easily resolves the Sombrero Galaxy's rich system of globular clusters, estimated to be nearly 2,000 in number — 10 times more than the number of globular clusters in our Milky Way Galaxy."
- Fact: Its mass is equal to about 800 billion Suns.
  - Page says: "with a mass equal to 800 billion suns"
- Fact: A massive black hole is thought to sit in its bright centre.
  - Page says: "The center of M104 is thought to be home to a massive black hole."
- Sombrero image, page says: "is one of the largest mosaics ever assembled from Hubble observations."

## nasa-hubble-ngc-1300

- Source: [NASA Science — Barred Spiral Galaxy NGC 1300](https://science.nasa.gov/asset/hubble/barred-spiral-galaxy-ngc-1300/)
- Used for: NGC 1300 type; NGC 1300 summary; NGC 1300 distance; NGC 1300 constellation; NGC 1300 image description
- NGC 1300 summary, page says: "Barred spirals differ from normal spiral galaxies in that the arms of the galaxy do not spiral all the way into the center, but are connected to the two ends of a straight bar of stars containing the nucleus at its center."
- Fact: Astronomers see NGC 1300 as a classic example of a barred spiral galaxy.
  - Page says: "NGC 1300 is considered to be prototypical of barred spiral galaxies."
- Fact: In its centre is a small spiral inside the big spiral, about 3,300 light-years long.
  - Page says: "extraordinary and distinct "grand-design" spiral structure that is about 3,300 light-years (1 kiloparsec) long."
- Fact: The galaxy is so big that Hubble had to take two side-by-side pictures to cover all of its spiral arms.
  - Page says: "Due to the galaxy's large size, two adjacent pointings of the telescope were necessary to cover the extent of the spiral arms."

