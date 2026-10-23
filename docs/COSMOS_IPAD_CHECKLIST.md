# Cosmos on a real iPad: Safari checklist

**Physical-device release check: NOT TESTED.** Automated results do not complete this check. Before marking the family release final, record the test below and complete the checklist. Leave failed or untested items open.

| Test record | Result |
| --- | --- |
| Date and tester | Not recorded |
| iPad model and iPadOS/Safari version | Not recorded |
| Tested URL and commit | Not recorded |
| Pinch, drag and page scrolling | Not tested |
| VoiceOver navigation and announcements | Not tested |
| Largest system text size and picture readability | Not tested |
| Performance and switching views | Not tested |
| Remaining issues / release decision | Pending physical-device check |


Automated tests use Chromium and Playwright's WebKit with iPad emulation and synthetic touches. They are not a real iPad, Safari or VoiceOver. Do these checks by hand before a family release (about 10 minutes) and record the date, iPad model, iPadOS version and preview URL. Mark anything not done as **not tested**.

## Pinch and drag
- [ ] On the map, pinch out and in with two fingers. Only the map zooms; the page does not zoom, and markers stay the same size.
- [ ] Drag the map in every direction. Only the map moves, and it stops at its edges with no empty space beyond.
- [ ] Start a drag on a galaxy name and move your finger. The map moves and that galaxy is **not** chosen.
- [ ] Tap a galaxy once. It is chosen straight away (no double-tap needed).
- [ ] **+**, **−** and **Reset map** work, and turn grey at their limits.

## Page scrolling
- [ ] With a finger outside the map (header, panel, planet list), swipe up and down. The page scrolls normally.
- [ ] Pinch outside the map. Safari's page zoom works as usual.
- [ ] In landscape and portrait, the page never scrolls sideways.

## VoiceOver
- [ ] Swipe through the Solar system | Cosmos switch: each is read with its selected state.
- [ ] Swipe to a galaxy on the map ("Andromeda Galaxy. The Local Group, about 2.5 million light-years") and double-tap. "Now showing the Andromeda Galaxy" is read once.
- [ ] Choose a galaxy from the list: its heading is read once, then swipe through the picture description, label, credit and facts.
- [ ] "All galaxies" puts you back on the galaxy you left in the list.

## Picture readability
- [ ] Open several galaxies, including Andromeda (a long, thin picture) and Messier 87. Each picture is clear and fills the panel width without being cut off.
- [ ] The label, credit, Image source, Usage terms and "Changes for this app" are readable without zooming, also with Settings → Display & Brightness → Text Size at its largest.
- [ ] On a slow connection (for example a phone hotspot), open a galaxy: a small picture appears quickly and is then replaced by a sharper one, without the layout jumping. (Safari does not tell web pages about Low Data Mode, so the **Load a sharper picture** button only appears in browsers that report Data Saver.)

## Performance
- [ ] Switch between Solar system and Cosmos ten times. Each switch is instant, the planets resume where they were, and the iPad does not get warm.
- [ ] Zoom and drag the map quickly for 30 seconds. Movement keeps up with your finger.
- [ ] Settings → Accessibility → Motion → Reduce Motion on: map moves and jumps to a galaxy happen instantly.
