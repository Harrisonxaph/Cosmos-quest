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

test('phone layout: touch targets are at least 44 pixels', async () => {
  const { page, context, errors } = await openPage('#/mars', { ...devices['iPhone 13'], defaultBrowserType: undefined });
  await sceneReady(page);
  const heights = await page.locator('.body-selector__button, .control:visible').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  assert.ok(heights.length > 10);
  for (const height of heights) assert.ok(height >= 44, `target height ${height}`);
  assert.equal(await panelBody(page), 'mars');
  assert.deepEqual(errors, []);
  await context.close();
});
