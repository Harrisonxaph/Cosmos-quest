// Browser tests for the built app (run after `npm run build`): navigation, panels, controls and fallback.
// Run with `npm run test:e2e`. Set DIST_DIR to test a different build folder.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { startStaticServer } from './static-server.js';

const ORDER = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
let server;
let browser;

before(async () => {
  server = await startStaticServer(process.env.DIST_DIR ?? 'dist');
  // SwiftShader gives headless Chromium software WebGL, so the 3D scene really renders in CI.
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
  return { page, context, errors };
}

const sceneReady = page => page.waitForSelector('#scene[data-scene-state="ready"]', { timeout: 30000 });
const arrivedAt = (page, focus) => page.waitForSelector(`#scene[data-transition="idle"][data-focus="${focus}"]`, { timeout: 15000 });
const panelBody = page => page.locator('#info-panel article').getAttribute('data-body');
const hash = page => page.evaluate(() => location.hash);
const blurFocus = page => page.evaluate(() => document.activeElement?.blur());

test('the overview loads the 3D scene, every world button and the Stage 1 planet list', async () => {
  const { page, context, errors } = await openPage();
  await sceneReady(page);
  assert.equal(await panelBody(page), 'overview');
  assert.deepEqual(await page.locator('.body-selector__button').evaluateAll(buttons => buttons.map(b => b.dataset.body)), ORDER);
  assert.equal(await page.locator('.planet-card').count(), 8);
  assert.equal(await page.locator('.planet-card a', { hasText: 'Science source' }).count(), 8);
  assert.match(await page.locator('.planet-card h3').first().textContent(), /^1\. Mercury$/);
  assert.match(await page.locator('.scale-badge').textContent(), /Not to scale/);
  assert.match(await page.locator('#info-panel').textContent(), /This picture is not to scale/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('choosing a world flies the camera there and shows its panel and link', async () => {
  const { page, context, errors } = await openPage();
  await sceneReady(page);
  await page.click('.body-selector__button[data-body="saturn"]');
  assert.equal(await page.locator('#scene').getAttribute('data-transition'), 'flying');
  await arrivedAt(page, 'saturn');
  assert.equal(await panelBody(page), 'saturn');
  assert.equal(await hash(page), '#/saturn');
  assert.equal(await page.locator('.body-selector__button[data-body="saturn"]').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#explorer-status').textContent(), /Now exploring Saturn/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('tapping a world in the 3D picture selects it', async () => {
  const { page, context } = await openPage('', { viewport: { width: 1280, height: 860 } });
  await sceneReady(page);
  await page.click('[data-control="pause"]'); // keep planets still
  const box = await page.locator('#scene-canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); // the Sun is at the centre of the overview
  await arrivedAt(page, 'sun');
  assert.equal(await panelBody(page), 'sun');
  await context.close();
});

test('controls: next, previous, overview, pause, zoom and rotate', async () => {
  const { page, context } = await openPage('#/earth');
  await sceneReady(page);
  await arrivedAt(page, 'earth');
  await page.click('[data-control="next"]');
  await arrivedAt(page, 'mars');
  await page.click('[data-control="previous"]');
  await arrivedAt(page, 'earth');
  await page.click('[data-control="pause"]');
  assert.equal(await page.locator('#scene').getAttribute('data-paused'), 'true');
  assert.equal(await page.locator('[data-control="pause"] .control__label').textContent(), 'Play');
  for (const control of ['zoomIn', 'zoomOut', 'rotateLeft', 'rotateRight']) await page.click(`[data-control="${control}"]`);
  await page.click('[data-control="overview"]');
  await arrivedAt(page, 'overview');
  assert.equal(await panelBody(page), 'overview');
  assert.equal(await page.locator('[data-control="overview"]').isDisabled(), true);
  await context.close();
});

test('keyboard shortcuts and the browser Back button', async () => {
  const { page, context } = await openPage();
  await sceneReady(page);
  await blurFocus(page);
  await page.keyboard.press('5');
  await arrivedAt(page, 'jupiter');
  await page.keyboard.press('ArrowRight');
  await arrivedAt(page, 'saturn');
  await page.keyboard.press('Escape');
  await arrivedAt(page, 'overview');
  assert.equal(await hash(page), '#/');
  await page.goBack();
  await arrivedAt(page, 'saturn');
  await page.keyboard.press('p');
  assert.equal(await page.locator('#scene').getAttribute('data-paused'), 'true');
  await page.keyboard.press('m');
  assert.equal(await page.locator('#info-panel article').getAttribute('data-mode'), 'detailed');
  await context.close();
});

test('panels: no-surface warning for giants, Earth comparisons, detailed mode remembered', async () => {
  const { page, context } = await openPage('#/jupiter');
  await sceneReady(page);
  assert.match(await page.locator('.callout--no-surface').textContent(), /no solid surface.*1-bar level/i);
  assert.match(await page.locator('[data-stat="gravity"]').textContent(), /23\.1 m\/s².*1-bar level/);
  assert.match(await page.locator('[data-stat="moons"]').textContent(), /115.*April 2026/);
  assert.match(await page.locator('[data-comparison="width"]').textContent(), /about 11 times as wide as Earth/);
  assert.equal(await page.locator('[data-stat="rotation"]').count(), 0, 'simple mode hides rotation period');
  await page.click('.mode-toggle__option:has-text("Detailed")');
  assert.equal(await page.locator('[data-stat="rotation"]').count(), 1);
  await page.reload();
  await sceneReady(page);
  assert.equal(await page.locator('#info-panel article').getAttribute('data-mode'), 'detailed', 'mode is remembered');
  await page.click('.body-selector__button[data-body="earth"]');
  assert.equal(await page.locator('.callout--no-surface').count(), 0);
  assert.match(await page.locator('#info-panel').textContent(), /Earth is our yardstick/);
  await context.close();
});

test('the Stage 1 list opens a planet in the explorer', async () => {
  const { page, context } = await openPage();
  await sceneReady(page);
  await page.click('.planet-card[data-body="mars"] .planet-card__explore');
  await arrivedAt(page, 'mars');
  assert.equal(await panelBody(page), 'mars');
  await context.close();
});

test('without 3D, every world and fact is still available', async () => {
  const { page, context, errors } = await openPage('?view=2d#/neptune');
  await page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.equal(await panelBody(page), 'neptune');
  assert.match(await page.locator('#scene-status').textContent(), /still explore every world/);
  assert.equal(await page.locator('[data-control="zoomIn"]').isVisible(), false, '3D-only controls are hidden');
  await page.click('[data-control="previous"]');
  assert.equal(await panelBody(page), 'uranus');
  await page.click('.body-selector__button[data-body="sun"]');
  assert.equal(await panelBody(page), 'sun');
  assert.deepEqual(errors, []);
  await context.close();
});

test('reduced motion starts paused and moves the camera instantly', async () => {
  const { page, context } = await openPage('', { reducedMotion: 'reduce' });
  await sceneReady(page);
  assert.equal(await page.locator('#scene').getAttribute('data-paused'), 'true');
  await page.click('.body-selector__button[data-body="venus"]');
  assert.equal(await page.locator('#scene').getAttribute('data-transition'), 'idle');
  assert.equal(await page.locator('#scene').getAttribute('data-focus'), 'venus');
  await context.close();
});

test('keyboard focus stays on the Simple/Detailed buttons when the mode changes', async () => {
  const { page, context } = await openPage('#/jupiter');
  await sceneReady(page);
  const focused = () => page.evaluate(() => {
    const el = document.activeElement;
    return { mode: el?.dataset.mode ?? null, pressed: el?.getAttribute('aria-pressed') ?? null, inPanel: document.getElementById('info-panel').contains(el) };
  });
  await page.locator('.mode-toggle__option[data-mode="detailed"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#info-panel article').getAttribute('data-mode'), 'detailed');
  assert.deepEqual(await focused(), { mode: 'detailed', pressed: 'true', inPanel: true });
  await page.keyboard.press('Shift+Tab');
  assert.equal((await focused()).mode, 'simple');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#info-panel article').getAttribute('data-mode'), 'simple');
  assert.deepEqual(await focused(), { mode: 'simple', pressed: 'true', inPanel: true });
  await page.keyboard.press('m');
  assert.equal(await page.locator('#info-panel article').getAttribute('data-mode'), 'detailed');
  assert.equal((await focused()).inPanel, true, 'focus is not lost to the page');
  await context.close();
});

test('pausing, changing mode or switching world does not scroll someone reading the facts', async () => {
  const { page, context } = await openPage('#/mars', { ...devices['iPhone 13'], defaultBrowserType: undefined });
  await sceneReady(page);
  await page.locator('.panel-section').first().evaluate(node => node.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.scrollY);
  assert.ok(before > 300, 'page is scrolled down to the facts');
  const scrolled = async () => Math.abs((await page.evaluate(() => window.scrollY)) - before);
  await blurFocus(page);
  await page.keyboard.press('p');
  await page.waitForTimeout(400);
  assert.ok(await scrolled() < 2, 'pause moved the page');
  await page.keyboard.press('m');
  await page.waitForTimeout(400);
  assert.ok(await scrolled() < 2, 'mode change moved the page');
  await page.keyboard.press('n');
  await page.waitForTimeout(800);
  assert.equal(await panelBody(page), 'jupiter');
  assert.ok(await scrolled() < 2, 'changing world moved the page');
  const inView = await page.evaluate(() => {
    const list = document.querySelector('.body-selector__list').getBoundingClientRect();
    const button = document.querySelector('.body-selector__button[data-body="jupiter"]').getBoundingClientRect();
    return button.left >= list.left - 1 && button.right <= list.right + 1;
  });
  assert.ok(inView, 'the selector row scrolled sideways to show Jupiter');
  await context.close();
});

test('phone layout: every touch target is at least 44 × 44 pixels', async () => {
  const { page, context, errors } = await openPage('#/mars', { ...devices['iPhone 13'], defaultBrowserType: undefined });
  await sceneReady(page);
  const targets = '.body-selector__button, .control:visible, .mode-toggle__option, #info-panel summary, .planet-card__explore, .primary-button';
  const measure = () => page.locator(targets).evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { name: node.className || node.tagName, width: box.width, height: box.height };
  }));
  const check = sizes => {
    for (const size of sizes) assert.ok(size.height >= 44 && size.width >= 44, `${size.name}: ${size.width.toFixed(1)} × ${size.height.toFixed(1)}`);
  };
  const body = await measure();
  assert.ok(body.some(size => size.name.includes('mode-toggle__option')), 'includes Simple/Detailed');
  assert.ok(body.some(size => size.name === 'SUMMARY'), 'includes expandable sections');
  check(body);
  await page.click('[data-control="overview"]');
  await page.waitForSelector('#info-panel article[data-body="overview"]');
  const overview = await measure();
  assert.ok(overview.some(size => size.name.includes('primary-button')), 'includes Start with the Sun');
  assert.ok(overview.some(size => size.name === 'SUMMARY'), 'includes keyboard shortcuts');
  check(overview);
  assert.deepEqual(errors, []);
  await context.close();
});
