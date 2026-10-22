// Regression tests for the first family release: navigation, guidance, layout, accessibility and reliability.
// Run after `npm run build`. Set DIST_DIR to test another build folder.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { startStaticServer } from './static-server.js';

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

// Records the timestamp of every animation-frame callback, and the number of document/window listeners.
function instrument() {
  window.__frames = [];
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => raf(time => { window.__frames.push(time); callback(time); });
  window.__listeners = 0;
  for (const target of [document, window]) {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (...args) => { window.__listeners++; return add(...args); };
    target.removeEventListener = (...args) => { window.__listeners--; return remove(...args); };
  }
}

async function openPage(path = '', contextOptions = {}, { init } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(instrument);
  if (init) await init(page);
  await page.goto(server.url + path);
  await page.waitForSelector('#info-panel article');
  return { page, context, errors };
}

const phone = { ...devices['iPhone 13'], defaultBrowserType: undefined };
const panelBody = page => page.locator('#info-panel article.panel').last().getAttribute('data-body');
const status = page => page.evaluate(() => document.getElementById('explorer-status').textContent);
const current = page => page.locator('.site-header__actions [aria-current="page"]').evaluateAll(nodes => nodes.map(n => n.id));
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** Largest number of animation-frame callbacks that ran for the same frame: more than 1 means two loops. */
const loopsPerFrame = async (page, ms = 800) => {
  await page.evaluate(() => { window.__frames = []; });
  await page.waitForTimeout(ms);
  return page.evaluate(() => {
    const counts = new Map();
    for (const time of window.__frames) counts.set(time, (counts.get(time) ?? 0) + 1);
    return { frames: window.__frames.length, most: Math.max(0, ...counts.values()) };
  });
};

test('the activity bar names all four activities and marks the current one', async () => {
  const { page, context, errors } = await openPage();
  const labels = await page.locator('nav[aria-label="Activities"] button').evaluateAll(nodes => nodes.map(n => n.textContent.replace(/\s+/g, ' ').trim()));
  assert.deepEqual(labels, ['✦ Explore', '◎ Discovery Missions', '⚗ Science Experiments', '★ Planet Quiz']);
  assert.deepEqual(await current(page), ['explore-entry'], 'exploring is the current activity at the start');
  await page.click('.body-selector__button[data-body="saturn"]');
  assert.deepEqual(await current(page), ['explore-entry']);
  for (const [id, view] of [['quiz-entry', 'quiz'], ['missions-entry', 'missions'], ['experiments-entry', 'experiments']]) {
    await page.click(`#${id}`);
    assert.deepEqual(await current(page), [id], view);
    assert.match(await page.locator(`#${id}`).evaluate(n => getComputedStyle(n).boxShadow), /inset/, 'current is shown by a bar as well as colour');
  }
  await page.click('#explore-entry');
  assert.equal(await panelBody(page), 'saturn', 'Explore returns to the world being explored');
  assert.deepEqual(await current(page), ['explore-entry']);
  await page.click('[data-control="overview"]');
  await page.click('#quiz-entry');
  await page.click('#explore-entry');
  assert.equal(await panelBody(page), 'overview', 'or to the whole solar system');
  assert.match(await page.locator('.site-header__note').textContent(), /kept until you close or reload this page/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('phones get a compact two-by-two activity bar, so the 3D view starts sooner', async () => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 664 }]) {
    const { page, context } = await openPage('', { viewport, isMobile: true, hasTouch: true });
    const boxes = await page.locator('nav[aria-label="Activities"] button').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect()).map(b => ({ top: Math.round(b.top), height: b.height, width: b.width })));
    assert.equal(new Set(boxes.map(b => b.top)).size, 2, `${viewport.width}px: two rows`);
    for (const box of boxes) assert.ok(box.width >= 44 && box.height >= 44);
    const sceneTop = await page.locator('#scene').evaluate(n => n.getBoundingClientRect().top);
    // Four activities and the progress note now fit in about the space three stacked buttons used to take.
    assert.ok(sceneTop < 330, `${viewport.width}px: the 3D view starts at ${Math.round(sceneTop)}px`);
    assert.equal(await overflow(page), 0);
    await context.close();
  }
});

test('“waiting” bars appear only while exploring, never on top of another activity', async () => {
  const { page, context } = await openPage();
  await page.click('#missions-entry');
  await page.click('.mission-card[data-mission="rocky-neighbours"] [data-mission-action="choose"]');
  await page.click('[data-mission-action="start"]');
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  assert.equal(await page.locator('.mission-bar').count(), 0, 'no mission bar in the quiz');
  await page.click('#missions-entry');
  assert.equal(await page.locator('.quiz-resume').count(), 0, 'no quiz bar in the mission');
  await page.click('#experiments-entry');
  assert.equal(await page.locator('.quiz-resume, .mission-bar').count(), 0, 'no bars in the experiments');
  await page.click('#explore-entry');
  assert.equal(await page.locator('.mission-bar').count(), 1);
  assert.equal(await page.locator('.quiz-resume:not(.mission-bar)').count(), 1);
  await page.click('.body-selector__button[data-body="mercury"]');
  assert.equal(await page.locator('.mission-bar [data-mission-action="found-here"]').count(), 1, '“I’ve found it” still appears on the world');
  await context.close();
});

test('short help explains choosing, rotating, zooming and pausing, without the 3D lines in 2D', async () => {
  const { page, context } = await openPage();
  const help = page.locator('.explore-help');
  assert.equal(await help.locator('summary').textContent(), 'How to explore');
  assert.equal(await help.getAttribute('open'), null, 'closed by default, so it is not a long tour');
  await help.locator('summary').click();
  const text = await help.innerText();
  for (const phrase of [/tap it in the picture/, /Drag the picture to turn it/, /Pinch, scroll or use \+ and − to zoom/, /Press Pause/, /Esc shows the whole solar system/]) assert.match(text, phrase);
  const height = await help.locator('summary').evaluate(n => n.getBoundingClientRect().height);
  assert.ok(height >= 44);
  await context.close();

  const flat = await openPage('?view=2d');
  await flat.page.click('.explore-help summary');
  const flatText = await flat.page.locator('.explore-help').innerText();
  assert.match(flatText, /round buttons/);
  assert.doesNotMatch(flatText, /Drag the picture|Pause/, '3D-only help is hidden when there is no 3D view');
  await flat.context.close();
});

test('200% text: no sideways scrolling on a phone in any activity', async () => {
  const { page, context, errors } = await openPage('', phone);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const check = async label => assert.ok(await overflow(page) <= 1, `${label}: ${await overflow(page)}px of sideways scrolling`);
  await check('overview');
  await page.click('.body-selector__button[data-body="saturn"]');
  await check('Saturn facts');
  await page.click('.mode-toggle__option[data-mode="detailed"]');
  await check('Saturn detailed facts');
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  await check('quiz');
  await page.click('#missions-entry');
  await page.click('.mission-card[data-mission="understanding-space"] [data-mission-action="choose"]');
  await page.click('[data-mission-action="start"]');
  await check('mission');
  await page.click('#experiments-entry');
  await page.click('.mission-card[data-experiment="gravity-lab"] [data-experiment-action="choose"]');
  await page.click('[data-experiment-action="reveal"]');
  await check('gravity lab');
  await page.click('[data-experiment-action="list"]');
  await page.click('.mission-card[data-experiment="tiny-solar-system"] [data-experiment-action="choose"]');
  await page.click('[data-experiment-action="reveal"]');
  await check('tiny solar system');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the planet list’s source links are 44 pixels tall and say which planet they are for', async () => {
  const { page, context } = await openPage('', phone);
  const links = await page.locator('.planet-card__source').evaluateAll(nodes => nodes.map(n => ({ name: n.textContent.trim(), height: n.getBoundingClientRect().height })));
  assert.equal(links.length, 8);
  for (const link of links) assert.ok(link.height >= 44, `${link.name}: ${link.height}px`);
  assert.equal(new Set(links.map(l => l.name)).size, 8);
  assert.equal(links[0].name, 'Science source for Mercury');
  await context.close();
});

test('on/off toggles show their state with a check mark, not colour alone', async () => {
  const { page, context } = await openPage();
  const check = page.locator('[data-control="labels"] .control__check');
  assert.equal(await page.getAttribute('[data-control="labels"]', 'aria-pressed'), 'true');
  assert.equal(await check.isVisible(), true);
  await page.click('[data-control="labels"]');
  assert.equal(await page.getAttribute('[data-control="labels"]', 'aria-pressed'), 'false');
  assert.equal(await check.isVisible(), false);
  assert.equal(await page.locator('[data-control="labels"]').evaluate(n => n.textContent.replace(/\s+/g, ' ').trim()), '✓ Labels');
  await context.close();
});

test('the quiz restores focus and reading position when resumed, like missions and experiments', async () => {
  const { page, context } = await openPage('', { viewport: { width: 1280, height: 560 } });
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  await page.locator('.quiz-answer').first().click();
  const next = page.locator('[data-quiz-action="next"]');
  await next.scrollIntoViewIfNeeded();
  await page.evaluate(() => { const panel = document.getElementById('info-panel'); panel.scrollTop = panel.scrollHeight; });
  await next.focus({ preventScroll: true });
  const before = await page.evaluate(() => Math.round(document.getElementById('info-panel').scrollTop));
  assert.ok(before > 0);
  await page.keyboard.press('Escape');
  assert.equal(await panelBody(page), 'overview');
  await page.click('.quiz-resume [data-quiz-action="resume"]');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.quizAction), 'next', 'focus returns to Next');
  const after = await page.evaluate(() => Math.round(document.getElementById('info-panel').scrollTop));
  assert.ok(Math.abs(after - before) <= 2, `panel scroll ${before} → ${after}`);
  await page.waitForFunction(() => document.getElementById('explorer-status').textContent === 'Back to Planet Quiz');
  await context.close();
});

test('entering an activity is announced once, by its focused heading', async () => {
  const { page, context } = await openPage();
  await page.click('#missions-entry');
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Discovery Missions');
  await page.waitForTimeout(400);
  assert.equal(await status(page), '', 'the live region does not repeat the heading');
  await page.click('.body-selector__button[data-body="mars"]');
  assert.equal(await status(page), 'Now exploring Mars', 'worlds are still announced, because focus stays put');
  await context.close();
});

test('3D animation never runs twice after the page is hidden and shown again', async () => {
  const { page, context } = await openPage();
  await page.waitForSelector('#scene[data-scene-state="ready"]');
  assert.equal((await loopsPerFrame(page)).most, 1, 'one loop to start with');
  const setHidden = hidden => page.evaluate(value => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await setHidden(true);
  assert.equal((await loopsPerFrame(page)).frames, 0, 'nothing animates while hidden');
  await setHidden(false);
  await setHidden(false); // some browsers report "visible" more than once
  const shown = await loopsPerFrame(page);
  assert.ok(shown.frames > 0, 'animation resumes');
  assert.equal(shown.most, 1, 'still only one loop');
  await context.close();
});

test('lost graphics: the app switches to 2D, stops animating and every activity still works', async () => {
  const { page, context, errors } = await openPage();
  await page.waitForSelector('#scene[data-scene-state="ready"]');
  await page.evaluate(() => document.getElementById('scene-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.match(await page.textContent('#scene-status'), /3D view stopped working.*still explore every world/);
  assert.equal(await page.locator('.scene-label').count(), 0, 'labels are removed');
  assert.equal(await page.locator('#controls [data-needs-3d]:visible').count(), 0, '3D-only controls are hidden');
  assert.equal((await loopsPerFrame(page)).frames, 0, 'no animation is left running');
  await page.click('.body-selector__button[data-body="mars"]');
  assert.equal(await panelBody(page), 'mars');
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  assert.equal(await page.locator('.quiz-answer').count(), 3);
  await page.click('#experiments-entry');
  await page.click('.mission-card[data-experiment="gravity-lab"] [data-experiment-action="choose"]');
  await page.click('[data-experiment-action="reveal"]');
  assert.equal(await page.locator('.experiment-result').count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a failed 3D download or no 3D support falls back to the 2D view', async () => {
  const failed = await openPage('', {}, { init: page => page.route(/solarSystemScene/, route => route.abort()) });
  await failed.page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.match(await failed.page.textContent('#scene-status'), /3D view could not load/);
  await failed.page.click('#missions-entry');
  assert.equal(await failed.page.locator('.mission-card').count(), 3);
  await failed.context.close();

  const noWebgl = await openPage('', {}, {
    init: page => page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return /webgl/.test(type) ? null : getContext.call(this, type, ...args); };
    }),
  });
  await noWebgl.page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.match(await noWebgl.page.textContent('#scene-status'), /cannot show the 3D view/);
  assert.deepEqual(noWebgl.errors, []);
  await noWebgl.context.close();
});

test('moving between activities does not pile up listeners', async () => {
  const { page, context } = await openPage();
  await page.waitForSelector('#scene[data-scene-state="ready"]');
  const before = await page.evaluate(() => window.__listeners);
  for (let round = 0; round < 5; round++) {
    await page.click('#quiz-entry');
    await page.click('#missions-entry');
    await page.click('#experiments-entry');
    await page.click('#explore-entry');
    await page.click('.body-selector__button[data-body="jupiter"]');
    await page.click('[data-control="overview"]');
  }
  assert.equal(await page.evaluate(() => window.__listeners), before);
  await context.close();
});
