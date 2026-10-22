// Browser tests for Discovery Missions (run after `npm run build`). Set DIST_DIR to test another build folder.
// Correct answers come from the independent answer key (by answer text), never from missions.json.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import { startStaticServer } from './static-server.js';
import { MISSION_ANSWER_KEY } from '../data/mission-answer-key.js';

const missions = JSON.parse(readFileSync(new URL('../../src/data/missions.json', import.meta.url), 'utf8'));
const sources = JSON.parse(readFileSync(new URL('../../src/data/sources.json', import.meta.url), 'utf8'));
const sourceUrls = new Set(sources.map(source => source.url));
const byId = id => missions.find(mission => mission.id === id);
let server;
let browser;

before(async () => {
  server = await startStaticServer(process.env.DIST_DIR ?? 'dist');
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

async function openPage(path = '', contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(server.url + path);
  await page.waitForSelector('#info-panel article');
  return { page, context, errors };
}

const screen = page => page.locator('#info-panel article.missions').getAttribute('data-mission-screen');
const panelBody = page => page.locator('#info-panel article.panel').last().getAttribute('data-body');
const hash = page => page.evaluate(() => location.hash);
const activeElement = page => page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el.tagName, text: el.textContent.replace(/\s+/g, ' ').trim(), action: el.dataset.missionAction ?? null, answer: el.dataset.answer ?? null };
});
const stepHeading = page => page.locator('#missions-title').textContent().then(text => text.replace(/\s+/g, ' ').trim());

async function openMission(page, missionId) {
  await page.click('#missions-entry');
  assert.equal(await hash(page), '#/missions');
  assert.equal(await screen(page), 'list');
  await page.click(`.mission-card[data-mission="${missionId}"] [data-mission-action="choose"]`);
  assert.equal(await screen(page), 'intro');
  await page.click('[data-mission-action="start"]');
}

/** Checks the feedback screen for a completed step and moves on. */
async function finishStep(page, mission, step, index) {
  assert.equal(await screen(page), 'feedback');
  assert.equal(await page.locator('.quiz-feedback').getAttribute('data-correct'), 'true');
  const detail = (await page.locator('.mission-feedback__detail').textContent()).trim();
  assert.equal(detail, step.type === 'find' ? step.reveal : step.explanation);
  assert.ok(detail.includes(MISSION_ANSWER_KEY[mission.id][step.id].learn ?? ''), 'teaches what the key expects');
  assert.match(await page.locator('#mission-feedback-title').textContent(), new RegExp(`Step ${index + 1} of ${mission.steps.length} complete\\.`));
  const links = await page.locator('.quiz-source a').evaluateAll(as => as.map(a => a.href));
  assert.ok(links.length >= 1 && links.every(href => sourceUrls.has(href)), 'sources link to the cited NASA/ESA pages');
  assert.equal(await page.locator(`.mission-step:nth-child(${index + 1}) .mission-step__label`).textContent(), '✓ Done', 'done is shown in words');
  await page.click('[data-mission-action="next"]');
}

/**
 * Complete one step the way a child would. Find steps: explore the world, check that opening it
 * did not complete anything, then press "I've found it" (on the world's page or back in the mission).
 * Question steps: one wrong answer, then the answer from the independent key.
 */
async function completeStep(page, mission, step, index, { foundOnWorld = true } = {}) {
  assert.equal(await screen(page), 'task');
  assert.match(await stepHeading(page), new RegExp(`Step ${index + 1} of ${mission.steps.length} ${step.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  if (step.type === 'find') {
    assert.equal(await page.locator('[data-mission-action="found"]').count(), 0, 'nothing to claim before exploring');
    assert.match(await page.locator('.mission-criteria').textContent(), /Just opening .+ doesn’t count/);
    await page.click('[data-mission-action="explore"]');
    assert.equal(await panelBody(page), step.target);
    assert.match(await page.locator('.mission-bar').textContent(), new RegExp(`Step ${index + 1} of`));
    if (foundOnWorld) {
      await page.click('.mission-bar [data-mission-action="found-here"]');
    } else {
      await page.click('.mission-bar [data-mission-action="resume"]');
      assert.equal(await screen(page), 'task', 'opening the world did not complete the step');
      assert.match(await page.locator('.mission-visited').textContent(), /You’ve visited/);
      await page.click('[data-mission-action="found"]');
    }
  } else {
    if (step.visitRequired) {
      assert.equal(await page.locator('.quiz-answer').count(), 0, 'answers wait until the world has been explored');
      assert.match(await page.locator('.mission-locked').textContent(), /Explore .+ first/);
      await page.click('[data-mission-action="explore"]');
      assert.equal(await panelBody(page), step.explore);
      assert.match(await page.locator('.mission-bar').textContent(), /Go back to the mission to answer/);
      await page.click('.mission-bar [data-mission-action="resume"]');
      assert.equal(await screen(page), 'task', 'exploring did not complete the step');
      assert.match(await page.locator('.mission-visited').textContent(), /You’ve visited/);
    }
    const key = MISSION_ANSWER_KEY[mission.id][step.id].answer;
    const answers = await page.locator('.quiz-answer').evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.answer, text: node.textContent.trim() })));
    assert.equal(answers.length, 3);
    assert.equal(answers.filter(a => a.text === key).length, 1, `"${key}" is offered once`);
    const wrong = answers.find(a => a.text !== key);
    await page.click(`.quiz-answer[data-answer="${wrong.id}"]`);
    assert.equal(await screen(page), 'task', 'a wrong answer does not complete the step');
    assert.equal(await page.locator('.quiz-feedback').getAttribute('data-correct'), 'false');
    assert.match(await page.locator('#mission-feedback-title').textContent(), new RegExp(`Not quite yet You chose ${wrong.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`));
    assert.equal(await page.locator(`.quiz-result[data-answer="${wrong.id}"] .quiz-result__label`).textContent(), 'You tried this');
    await page.click(`.quiz-answer[data-answer="${answers.find(a => a.text === key).id}"]`);
  }
  await finishStep(page, mission, step, index);
}

async function completeMission(page, mission, options = {}) {
  for (const [index, step] of mission.steps.entries()) await completeStep(page, mission, step, index, { foundOnWorld: index % 2 === 0, ...options });
  assert.equal(await screen(page), 'recap');
  assert.equal(await stepHeading(page), `You completed “${mission.title}”!`);
}

test('each mission can be completed from start to recap, then replayed', async () => {
  const { page, context, errors } = await openPage();
  for (const mission of missions) {
    await openMission(page, mission.id);
    await completeMission(page, mission);
    assert.equal(await page.locator('.quiz-summary li').count(), mission.steps.length);
    await page.waitForFunction(recap => document.getElementById('explorer-status').textContent === recap, mission.recap);
    await page.click('[data-mission-action="list"]');
    assert.match(await page.locator(`.mission-card[data-mission="${mission.id}"]`).textContent(), /Completed/);
  }
  assert.match(await page.locator('.mission-card[data-mission="rocky-neighbours"] [data-mission-action="choose"]').textContent(), /^Play again/);
  await page.click(`.mission-card[data-mission="rocky-neighbours"] [data-mission-action="choose"]`);
  assert.match(await stepHeading(page), /Step 1 of 5/, 'replay starts at step 1');
  assert.equal(await page.locator('.mission-step__label', { hasText: '✓ Done' }).count(), 0);
  await page.click('[data-mission-action="leave"]');
  assert.equal(await panelBody(page), 'overview');
  assert.deepEqual(errors, []);
  await context.close();
});

test('leaving and resuming keeps mission and quiz progress separate', async () => {
  const { page, context } = await openPage();
  const rocky = byId('rocky-neighbours');
  await openMission(page, rocky.id);
  await completeStep(page, rocky, rocky.steps[0], 0);

  // Start the quiz and leave it mid-question.
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  const quizQuestion = (await page.locator('.quiz-question').textContent()).trim();
  await page.click('[data-quiz-action="leave"]');
  assert.equal(await panelBody(page), 'overview');
  assert.equal(await page.locator('.mission-bar').count(), 1, 'mission waits');
  assert.equal(await page.locator('.quiz-resume:not(.mission-bar)').count(), 1, 'quiz waits too');
  assert.match(await page.locator('#missions-entry').textContent(), /Step 2 of 5/);

  // Exploring other worlds does nothing to the mission.
  await page.click('.body-selector__button[data-body="mars"]');
  await page.click('.body-selector__button[data-body="venus"]');
  assert.equal(await page.locator('.mission-bar [data-mission-action="found-here"]').count(), 1, 'on Venus during step 2, “I’ve found it” is offered');
  await page.click('.mission-bar [data-mission-action="resume"]');
  assert.equal(await hash(page), '#/missions');
  assert.equal(await screen(page), 'task', 'opening Venus counted as a visit, not a completion');
  assert.match(await stepHeading(page), /Step 2 of 5 Explore Venus/);
  assert.match(await page.locator('.mission-visited').textContent(), /You’ve visited Venus/);

  // Browser Back and Forward keep the place.
  await page.goBack();
  assert.equal(await hash(page), '#/venus');
  await page.goForward();
  assert.match(await stepHeading(page), /Step 2 of 5/);

  // The quiz resumes exactly where it was.
  await page.click('[data-mission-action="leave"]');
  await page.click('.quiz-resume:not(.mission-bar) [data-quiz-action="resume"]');
  assert.equal((await page.locator('.quiz-question').textContent()).trim(), quizQuestion);
  assert.equal((await page.locator('.quiz-progress').textContent()).trim(), 'Question 1 of 5');
  await page.click('#missions-entry');
  assert.match(await stepHeading(page), /Step 2 of 5/, 'the mission was not affected by the quiz');
  await context.close();
});

test('keyboard only: focus and announcements follow each step', async () => {
  const { page, context, errors } = await openPage();
  const giants = byId('giants-without-ground');
  const tabTo = async (predicate, limit = 30) => {
    for (let i = 0; i < limit && !predicate(await activeElement(page)); i++) await page.keyboard.press('Tab');
    assert.ok(predicate(await activeElement(page)), `could not Tab to the control (on ${JSON.stringify(await activeElement(page))})`);
  };
  await page.locator('#missions-entry').focus();
  await page.keyboard.press('Enter');
  assert.match((await activeElement(page)).text, /Discovery Missions/, 'focus moves to the missions heading');
  await tabTo(el => el.action === 'choose' && el.text.includes(giants.title));
  await page.keyboard.press('Enter');
  assert.equal((await activeElement(page)).text, giants.title, 'intro heading is focused');
  await tabTo(el => el.action === 'start');
  await page.keyboard.press('Enter');

  for (const [index, step] of giants.steps.entries()) {
    const heading = await activeElement(page);
    assert.equal(heading.tag, 'H2');
    assert.match(heading.text, new RegExp(`Step ${index + 1} of 5`), 'the step heading is focused');
    if (step.type === 'find') {
      await tabTo(el => el.action === 'explore');
      await page.keyboard.press('Enter');
      assert.equal(await panelBody(page), step.target);
      if (index === 0) {
        // Explorer shortcuts still work while exploring, and don't complete the step.
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');
        assert.equal(await panelBody(page), step.target);
      }
      await page.locator('.mission-bar [data-mission-action="found-here"]').focus();
      await page.keyboard.press('Enter');
    } else {
      if (step.visitRequired) {
        assert.equal(await page.locator('.quiz-answer').count(), 0);
        await tabTo(el => el.action === 'explore');
        await page.keyboard.press('Enter');
        assert.equal(await panelBody(page), step.explore);
        await page.locator('.mission-bar [data-mission-action="resume"]').focus();
        await page.keyboard.press('Enter');
        const question = await activeElement(page);
        assert.equal(question.tag, 'H3', 'after exploring, focus starts at the question, just before the answers');
        assert.equal(question.text, step.question);
      }
      // Explorer shortcuts don't pull the child out of a question.
      await page.keyboard.press('5');
      assert.equal(await hash(page), '#/missions');
      const key = MISSION_ANSWER_KEY[giants.id][step.id].answer;
      await tabTo(el => el.answer && el.text === key);
      await page.keyboard.press('Space');
    }
    const feedback = await activeElement(page);
    assert.equal(feedback.tag, 'H3', 'feedback heading is focused');
    assert.match(await page.locator('#mission-feedback-title').ariaSnapshot(), new RegExp(`heading ".+Step ${index + 1} of 5 complete\\." \\[level=3\\]`));
    await page.waitForFunction(text => document.getElementById('explorer-status').textContent === text, step.type === 'find' ? step.reveal : step.explanation);
    await tabTo(el => el.action === 'next');
    await page.keyboard.press('Enter');
  }
  assert.equal((await activeElement(page)).text, `You completed “${giants.title}”!`, 'recap heading is focused');
  await tabTo(el => el.action === 'explore-freely');
  await page.keyboard.press('Enter');
  assert.equal(await panelBody(page), 'overview');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Escape and “Back to exploring” leave a mission, and focus returns to the step', async () => {
  const { page, context } = await openPage();
  const space = byId('understanding-space');
  await openMission(page, space.id);
  await page.keyboard.press('Escape');
  assert.equal(await panelBody(page), 'overview');
  assert.equal(await page.locator('.mission-bar').count(), 1);
  await page.locator('.mission-bar [data-mission-action="resume"]').focus();
  await page.keyboard.press('Enter');
  assert.match((await activeElement(page)).text, /Understanding space · Step 1 of 5/, 'focus returns to the step heading');
  await context.close();
});

test('phone and tablet layouts: every mission control is at least 44 × 44 pixels', async () => {
  for (const device of ['iPhone 13', 'iPad Mini']) {
    const { page, context, errors } = await openPage('', { ...devices[device], defaultBrowserType: undefined });
    const check = async selector => {
      const sizes = await page.locator(selector).evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => {
        const box = node.getBoundingClientRect();
        return { name: node.dataset.missionAction ?? node.dataset.answer ?? node.id, width: box.width, height: box.height };
      }));
      assert.ok(sizes.length > 0, `${device}: nothing matched ${selector}`);
      for (const size of sizes) assert.ok(size.width >= 44 && size.height >= 44, `${device} ${size.name}: ${size.width.toFixed(1)} × ${size.height.toFixed(1)}`);
    };
    const rocky = byId('rocky-neighbours');
    await check('#missions-entry');
    await page.click('[data-mission-action="open"]'); // the overview panel's entry point
    await check('[data-mission-action="choose"]');
    await page.click(`.mission-card[data-mission="${rocky.id}"] [data-mission-action="choose"]`);
    await check('[data-mission-action="start"], [data-mission-action="list"]');
    await page.click('[data-mission-action="start"]');
    await check('[data-mission-action="explore"], [data-mission-action="leave"], [data-mission-action="list"]');
    await page.tap('[data-mission-action="explore"]');
    await check('.mission-bar button');
    await page.tap('.mission-bar [data-mission-action="found-here"]');
    await check('[data-mission-action="next"]');
    for (const [index, step] of rocky.steps.entries()) {
      if (index === 0) { await page.tap('[data-mission-action="next"]'); continue; }
      if (step.type === 'question') await check('.quiz-answer');
      await completeStep(page, rocky, step, index);
    }
    await check('[data-mission-action="restart"], [data-mission-action="list"], [data-mission-action="explore-freely"]');
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test('a whole mission works without 3D', async () => {
  const { page, context, errors } = await openPage('?view=2d#/missions');
  await page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.equal(await screen(page), 'list', 'a #/missions link opens the missions');
  const space = byId('understanding-space');
  await page.click(`.mission-card[data-mission="${space.id}"] [data-mission-action="choose"]`);
  await page.click('[data-mission-action="start"]');
  await completeMission(page, space);
  await page.waitForFunction(recap => document.getElementById('explorer-status').textContent === recap, space.recap);
  assert.deepEqual(errors, []);
  await context.close();
});

/** Reading position: what is focused, how far the panel has scrolled, and how far the page has scrolled. */
const readingPosition = page => page.evaluate(() => ({
  action: document.activeElement.dataset.missionAction ?? null,
  tag: document.activeElement.tagName,
  panelTop: Math.round(document.getElementById('info-panel').scrollTop),
  pageY: Math.round(window.scrollY),
}));

for (const [label, options] of [['desktop', { viewport: { width: 1280, height: 560 } }], ['phone', { ...devices['iPhone 13'], defaultBrowserType: undefined }]]) {
  test(`${label}: returning to the same step restores focus and reading position; a new step starts at the top`, async () => {
    const { page, context, errors } = await openPage('', options);
    const rocky = byId('rocky-neighbours');
    await openMission(page, rocky.id);
    await completeStep(page, rocky, rocky.steps[0], 0);
    assert.match(await stepHeading(page), /Step 2 of 5/);

    // Scroll down to read the task, then use the keyboard to explore Venus.
    const explore = page.locator('[data-mission-action="explore"]');
    await explore.scrollIntoViewIfNeeded();
    if (label === 'desktop') await page.evaluate(() => { const panel = document.getElementById('info-panel'); panel.scrollTop = panel.scrollHeight; });
    else await page.evaluate(() => window.scrollBy(0, 120));
    await explore.focus({ preventScroll: true });
    const before = await readingPosition(page);
    if (label === 'desktop') assert.ok(before.panelTop > 0, 'the mission panel is scrolled on desktop');
    else assert.ok(before.pageY > 0, 'the page is scrolled on a phone');
    await page.keyboard.press('Enter');
    assert.equal(await panelBody(page), 'venus');

    // Come back from Venus, scrolling up to the bar first like a child would.
    await page.evaluate(() => { window.scrollTo(0, 0); document.getElementById('info-panel').scrollTop = 0; });
    await page.click('.mission-bar [data-mission-action="resume"]');
    assert.equal(await screen(page), 'task');
    const after = await readingPosition(page);
    assert.equal(after.action, 'explore', 'focus returns to the button the child used');
    assert.ok(Math.abs(after.panelTop - before.panelTop) <= 2, `panel scroll restored (${before.panelTop} → ${after.panelTop})`);
    assert.ok(Math.abs(after.pageY - before.pageY) <= 2, `page scroll restored (${before.pageY} → ${after.pageY})`);

    // Advancing resets focus and position to the top of the new screen.
    await page.click('[data-mission-action="found"]');
    let fresh = await readingPosition(page);
    assert.equal(fresh.tag, 'H3', 'feedback heading focused');
    assert.equal(fresh.panelTop, 0);
    await page.click('[data-mission-action="next"]');
    fresh = await readingPosition(page);
    assert.equal(fresh.tag, 'H2', 'the next step’s heading is focused');
    assert.equal(fresh.panelTop, 0);
    assert.match(await stepHeading(page), /Step 3 of 5/);
    const headingTop = await page.locator('#missions-title').evaluate(node => node.getBoundingClientRect().top);
    assert.ok(headingTop >= 0 && headingTop < (await page.evaluate(() => window.innerHeight)), 'the new step’s heading is on screen');

    // Leaving from one step and returning to a different screen does not restore the old position.
    await page.click('[data-mission-action="explore"]');
    await page.click('.mission-bar [data-mission-action="found-here"]');
    fresh = await readingPosition(page);
    assert.equal(fresh.tag, 'H3');
    assert.equal(fresh.panelTop, 0);
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('delayed feedback is not read out after moving on or leaving', async () => {
  const { page, context } = await openPage();
  const rocky = byId('rocky-neighbours');
  await openMission(page, rocky.id);
  await page.click('[data-mission-action="explore"]');
  // Press "I've found it" and then "Next step" straight away, well within the announcement delay.
  await page.evaluate(() => {
    document.querySelector('.mission-bar [data-mission-action="found-here"]').click();
    document.querySelector('[data-mission-action="next"]').click();
  });
  await page.waitForTimeout(700);
  assert.match(await stepHeading(page), /Step 2 of 5/);
  assert.notEqual(await page.evaluate(() => document.getElementById('explorer-status').textContent), rocky.steps[0].reveal, 'step 1 feedback was cancelled');

  await page.click('[data-mission-action="explore"]');
  await page.evaluate(() => {
    document.querySelector('.mission-bar [data-mission-action="found-here"]').click();
    document.querySelector('[data-mission-action="leave"]').click();
  });
  await page.waitForTimeout(700);
  assert.equal(await panelBody(page), 'overview');
  assert.equal(await page.evaluate(() => document.getElementById('explorer-status').textContent), 'Showing the whole solar system', 'leaving cancelled the feedback');

  // When the child stays on the screen, the feedback is still read.
  await page.click('.mission-bar [data-mission-action="resume"]');
  await page.click('[data-mission-action="next"]');
  await page.click('[data-mission-action="explore"]');
  await page.click('.mission-bar [data-mission-action="found-here"]');
  await page.waitForFunction(text => document.getElementById('explorer-status').textContent === text, rocky.steps[2].reveal);
  await context.close();
});

test('delayed quiz feedback is not read out after leaving the quiz', async () => {
  const { page, context } = await openPage();
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  await page.evaluate(() => {
    document.querySelector('.quiz-answer').click();
    document.querySelector('[data-quiz-action="next"]').click();
  });
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => document.getElementById('explorer-status').textContent), '', 'question 1 feedback was cancelled on moving to question 2');
  await page.evaluate(() => {
    document.querySelector('.quiz-answer').click();
    document.querySelector('[data-quiz-action="explore"]').click();
  });
  await page.waitForTimeout(700);
  assert.match(await page.evaluate(() => document.getElementById('explorer-status').textContent), /^Now exploring /);
  await context.close();
});
