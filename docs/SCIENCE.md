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
