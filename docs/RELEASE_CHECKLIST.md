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
- [ ] Answer a quiz question and finish a mission step. The result and explanation are read.
- [ ] In the tiny solar system, drag the slider. Nothing is announced until you tap **Calculate my model**.
- [ ] Settings → Accessibility → Motion → **Reduce Motion** on: the planets start paused and the camera moves without animation.

## Reliability
- [ ] Switch to another app for a minute, then come back. The 3D view continues smoothly and the iPad doesn't get warm.
- [ ] Add `?view=2d` to the address and repeat one quiz, one mission step and one experiment.
- [ ] Spot-check a few source links in the facts and results. They open the right NASA pages.

Note anything that fails, with the device and a screenshot, before merging to main.
