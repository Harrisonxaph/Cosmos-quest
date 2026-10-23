# Release checklist: iPad and Safari

Automated tests run in Chromium and in Playwright's WebKit with iPad emulation. That is not the same as Safari on a real iPad, so do these checks by hand on a real iPad (and ideally an iPhone) before each family release. It takes about 15 minutes.

Record the date, device, iPadOS version and the preview URL you tested.

## Getting started
- [ ] Open the preview in Safari. The 3D solar system appears, or a clear message says the 2D view is being used.
- [ ] The activity bar shows **Explore**, **Discovery Missions**, **Science Experiments** and **Planet Quiz**. Explore is highlighted, with a dark bar along its bottom edge.
- [ ] Open **How to explore** under the controls. The tips are short and match what the buttons do.

## Explore
- [ ] Tap a planet button, then tap a planet in the picture. The camera flies there and the facts change.
- [ ] Drag to rotate and pinch to zoom. The page itself does not scroll or zoom while you do this.
- [ ] Pause stops the planets moving, and pressing it again starts them. "Surface detail" and "Labels" show a ✓ when on.
- [ ] In the whole solar system, tap several planet names, including the crowded ones near the Sun. Each tap flies to the planet whose name you tapped. Names never sit on top of each other.
- [ ] Start a drag or a pinch on a name: the view turns or zooms, nothing is selected and the page doesn't scroll.
- [ ] The facts card shows the planet's kind, its place from the Sun and three facts, and the planet stays visible beside it. **Hide card** keeps the planet chosen, **More facts** jumps to the full facts, and **Solar system** goes back. On an iPhone it is a strip that opens with **Quick facts**.
- [ ] Turn Labels off: the names disappear and tapping where a name was selects nothing (unless you tap the planet itself), but the card still appears for a chosen planet.

## Cosmos
- [ ] At the top of Explore, tap **Cosmos**. The galaxy map appears with "Not to scale · illustrative map", and the panel lists 12 galaxies, nearest first.
- [ ] Tap several galaxies on the map, including the crowded Nearby groups. Each tap opens the right galaxy; names never sit on top of each other.
- [ ] Drag and pinch on the map: the map moves and zooms, nothing is chosen, and the page itself doesn't scroll or zoom. Outside the map, the page scrolls normally.
- [ ] **+**, **−** and **Reset map** work, and + and − turn grey at their limits.
- [ ] A galaxy shows a small picture first, then a sharper one. The credit, **Image source** and **Usage terms** links, the picture label and "Changes for this app" are visible under it. Triangulum also shows a CC BY 4.0 licence link.
- [ ] The Milky Way says "Artist's illustration · not a photograph" and "We live inside it", with no distance.
- [ ] Switch to **Solar system** and back: each is where you left it (same planet, same galaxy, same zoom). Esc in Cosmos (with a keyboard) returns to the solar system.
- [ ] VoiceOver: swipe to a galaxy on the map ("Andromeda Galaxy. The Local Group, about 2.5 million light-years") and double-tap; "Now showing the Andromeda Galaxy" is read once. Choose one in the list: its heading is read.

## Activities
- [ ] **Quiz:** answer a question, tap **Back to exploring**, visit a planet, then use **Back to the quiz**. You return to the same place on the page, and a round can be finished.
- [ ] **Missions:** complete *Meet our rocky neighbours*. Opening a planet alone never completes a step.
- [ ] **Experiments:** in the Gravity lab, 10 kg on Mars shows 37 N. In the tiny solar system, typing 2.25 moves the slider to exactly 2.25.
- [ ] While in one activity, the other activities' "waiting" bars are not shown. The activity bar still shows the progress, for example "Step 2 of 5".
- [ ] Reloading the page starts afresh, as the note under the activity bar says.

## Layout
- [ ] Rotate between portrait and landscape in every activity. Nothing is cut off, overlapped or hidden behind other content, and the page never scrolls sideways.
- [ ] Every button is easy to tap with a finger.
- [ ] Settings → Display & Brightness → Text Size, or Safari's **aA** → larger text: the page stays readable without sideways scrolling.

## Accessibility (VoiceOver)
- [ ] With VoiceOver on, open each activity. The heading is read once, not twice.
- [ ] With VoiceOver, swipe to a planet name in the 3D view ("Fly to Saturn") and double-tap. Saturn is chosen and its card is read. Swipe through the card: kind, place, no-solid-surface note and three facts.
- [ ] Answer a quiz question and finish a mission step. The result and explanation are read.
- [ ] In the tiny solar system, drag the slider. Nothing is announced until you tap **Calculate my model**.
- [ ] Settings → Accessibility → Motion → **Reduce Motion** on: the planets start paused and the camera moves without animation.

## Reliability
- [ ] Switch to another app for a minute, then come back. The 3D view continues smoothly and the iPad doesn't get warm.
- [ ] Add `?view=2d` to the address and repeat one quiz, one mission step and one experiment.
- [ ] Spot-check a few source links in the facts and results. They open the right NASA pages.

Note anything that fails, with the device and a screenshot, before merging to main.
