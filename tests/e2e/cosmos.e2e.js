// Browser tests for Cosmos, the galaxy map beside the solar system (run after `npm run build`).
// Galaxy ids, names and the order of distances are typed in here by hand, not read from galaxies.json.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startStaticServer } from './static-server.js';
import { ANSWER_KEY } from '../data/quiz-answer-key.js';
import { readFileSync } from 'node:fs';

// Nearest first, with the Milky Way (home) at the start: the order of the NASA distances in tests/data/galaxy-key.js.
const NEAREST_FIRST = ['milky-way', 'large-magellanic-cloud', 'small-magellanic-cloud', 'andromeda', 'triangulum',
  'messier-81', 'cigar', 'pinwheel', 'sombrero', 'whirlpool', 'messier-87', 'ngc-1300'];
const quizQuestions = JSON.parse(readFileSync(new URL('../../src/data/quiz.json', import.meta.url), 'utf8'));

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

async function openPage(path = '', contextOptions = {}, { block = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !block) errors.push(message.text()); });
  page.on('request', request => requests.push(request.url()));
  if (block) await page.route(block, route => route.abort());
  await page.goto(server.url + path);
  await page.waitForSelector('#info-panel article');
  // A page opened in Cosmos hides the 3D view, which draws its first frame only when it is shown.
  if (path.startsWith('#/cosmos')) await page.waitForSelector('#scene[data-suspended="true"], #scene[data-scene-state="fallback"]', { state: 'attached', timeout: 30000 });
  else await page.waitForSelector('#scene[data-scene-state="ready"], #scene[data-scene-state="fallback"]', { timeout: 30000 });
  return { page, context, errors, requests };
}

const mapReady = page => page.waitForSelector('#cosmos-map[data-map-state="ready"]');
const hash = page => page.evaluate(() => location.hash);
const screen = page => page.locator('#info-panel article.panel').last().getAttribute('data-cosmos-screen');
const shownGalaxy = page => page.locator('#info-panel article.panel').last().getAttribute('data-galaxy-id');
const activeInfo = page => page.evaluate(() => ({ id: document.activeElement?.id, marker: document.activeElement?.dataset.galaxyMarker, galaxy: document.activeElement?.dataset.galaxy }));
const markerBoxes = page => page.$$eval('[data-galaxy-marker]', nodes => nodes.map(node => {
  const box = node.getBoundingClientRect();
  return { id: node.dataset.galaxyMarker, x: box.left + box.width / 2, y: box.top + box.height / 2, left: box.left, top: box.top, width: box.width, height: box.height };
}));
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function openCosmos(page) {
  await page.click('.explore-switch [data-explore="cosmos"]');
  await mapReady(page);
}

test('Cosmos sits beside the solar system in Explore; the four activities are unchanged', async () => {
  const { page, context, errors, requests } = await openPage('#/jupiter');
  assert.deepEqual(await page.$$eval('.site-header__actions button', nodes => nodes.map(n => n.id)), ['explore-entry', 'missions-entry', 'experiments-entry', 'quiz-entry']);
  // Nothing from Cosmos is downloaded until it is opened.
  assert.equal(requests.some(url => /galaxies|cosmosMap|assets\/galaxies\//.test(url)), false);
  await openCosmos(page);
  assert.equal(await hash(page), '#/cosmos');
  assert.equal(await page.getAttribute('[data-explore="cosmos"]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('[data-explore="solar"]', 'aria-pressed'), 'false');
  assert.equal(await page.getAttribute('#explore-entry', 'aria-current'), 'page');
  assert.equal(await page.locator('#scene').isHidden(), true);
  assert.equal(await page.locator('#controls').isHidden(), true);
  assert.equal(await page.locator('.explore-help').isHidden(), true);
  assert.equal(await page.locator('#cosmos').isVisible(), true);
  if (await page.locator('#scene[data-scene-state="ready"]').count()) assert.equal(await page.getAttribute('#scene', 'data-suspended'), 'true', 'the 3D scene stops drawing');
  // The map explains itself.
  const text = await page.locator('#info-panel').innerText();
  assert.match(text, /not to scale/i);
  assert.match(text, /not a map of the sky/i);
  assert.match(text, /does not take you closer/i);
  assert.match(text, /Messier 87 and the Sombrero Galaxy are both in the constellation Virgo/);
  assert.match(await page.locator('#cosmos').innerText(), /Not to scale · illustrative map/);
  // Every galaxy is on the map and in the list, nearest first.
  assert.deepEqual(await page.$$eval('[data-galaxy-marker]', nodes => nodes.map(n => n.dataset.galaxyMarker)), NEAREST_FIRST);
  assert.deepEqual(await page.$$eval('.cosmos-list__button', nodes => nodes.map(n => n.dataset.galaxy)), NEAREST_FIRST);
  // Only local files: no live catalogue requests.
  assert.deepEqual(requests.filter(url => !url.startsWith(server.url)), []);
  assert.deepEqual(errors, []);
  await context.close();
});

test('map coordinates: left to right keeps the order of distances, markers never overlap, and are 44 px at every zoom', async () => {
  const { page, context, errors } = await openPage('#/cosmos');
  await mapReady(page);
  // The bands, nearest first, typed in by hand: every galaxy in a band is right of every galaxy in the band before.
  const bands = [['milky-way'], ['large-magellanic-cloud', 'small-magellanic-cloud'], ['andromeda', 'triangulum'],
    ['messier-81', 'cigar', 'pinwheel', 'sombrero', 'whirlpool'], ['messier-87', 'ngc-1300']];
  assert.deepEqual(bands.flat(), NEAREST_FIRST);
  for (const zoom of ['1', 'zoomed']) {
    if (zoom !== '1') {
      await page.click('[data-cosmos-control="zoomIn"]');
      await page.click('[data-cosmos-control="zoomIn"]');
      assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '2.25');
    }
    const boxes = await markerBoxes(page);
    const centres = Object.fromEntries(boxes.map(b => [b.id, b.x]));
    for (let i = 1; i < bands.length; i++) {
      const before = Math.max(...bands[i - 1].map(id => centres[id]));
      const after = Math.min(...bands[i].map(id => centres[id]));
      assert.ok(after > before, `zoom ${zoom}: band ${i + 1} is right of band ${i}`);
    }
    // Within the crowded "nearby groups" band, marker centres keep the order of distances too. (Not the dots:
    // each dot sits at the start of its name, so a longer name puts its dot further left.)
    const nearby = bands[3].map(id => centres[id]);
    if (zoom !== '1') for (let i = 1; i < nearby.length; i++) assert.ok(nearby[i] > nearby[i - 1], `${bands[3][i]} is right of ${bands[3][i - 1]}`);
    for (let i = 0; i < boxes.length; i++) {
      assert.ok(boxes[i].width >= 44 && boxes[i].height >= 44, `${boxes[i].id} is at least 44 px`);
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const overlap = a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
        assert.equal(overlap, false, `zoom ${zoom}: ${a.id} overlaps ${b.id}`);
      }
    }
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('zoom buttons stop at their limits, and reset returns to the start; markers keep their size', async () => {
  const { page, context, errors } = await openPage('#/cosmos');
  await mapReady(page);
  assert.equal(await page.locator('[data-cosmos-control="zoomOut"]').isDisabled(), true);
  assert.equal(await page.locator('[data-cosmos-control="reset"]').isDisabled(), true);
  const startBoxes = Object.fromEntries((await markerBoxes(page)).map(b => [b.id, b]));
  let clicks = 0;
  while (!(await page.locator('[data-cosmos-control="zoomIn"]').isDisabled())) {
    await page.click('[data-cosmos-control="zoomIn"]');
    clicks += 1;
    assert.ok(clicks < 10, 'zoom in stops');
  }
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '4');
  assert.match(await page.locator('.cosmos-map__zoom').textContent(), /×4/);
  const zoomed = Object.fromEntries((await markerBoxes(page)).map(b => [b.id, b]));
  assert.equal(Math.round(zoomed.andromeda.width), Math.round(startBoxes.andromeda.width), 'markers are not enlarged by zoom');
  await page.click('[data-cosmos-control="reset"]');
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '1');
  assert.equal(await page.locator('[data-cosmos-control="reset"]').isDisabled(), true);
  const reset = Object.fromEntries((await markerBoxes(page)).map(b => [b.id, b]));
  for (const id of NEAREST_FIRST) assert.ok(Math.abs(reset[id].x - startBoxes[id].x) < 1, `${id} is back where it started`);
  // Keyboard on the map: + and − zoom, and they too stop at the limit.
  await page.focus('[data-galaxy-marker="andromeda"]');
  for (let i = 0; i < 8; i++) await page.keyboard.press('-');
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '1');
  await page.keyboard.press('+');
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '1.5');
  assert.equal(await hash(page), '#/cosmos', 'map keys do not choose galaxies or worlds');
  assert.deepEqual(errors, []);
  await context.close();
});

test('choosing a galaxy by pointer, keyboard and list opens its picture, facts, credit and sources', async () => {
  const { page, context, errors } = await openPage('#/cosmos');
  await mapReady(page);
  // Pointer: focus stays on the map, and the live region says once what is showing.
  await page.click('[data-galaxy-marker="andromeda"]');
  assert.equal(await hash(page), '#/cosmos/andromeda');
  assert.equal(await shownGalaxy(page), 'andromeda');
  assert.equal((await activeInfo(page)).marker, 'andromeda');
  assert.equal(await page.getAttribute('[data-galaxy-marker="andromeda"]', 'aria-pressed'), 'true');
  assert.equal(await page.locator('#explorer-status').textContent(), 'Now showing the Andromeda Galaxy');
  const panel = await page.locator('#info-panel').innerText();
  assert.match(panel, /Andromeda Galaxy/);
  assert.match(panel, /Spiral galaxy/);
  assert.match(panel, /About 2\.5 million light-years away/);
  assert.match(panel, /NASA estimates this distance; other studies can give different values\./);
  assert.match(panel, /Composite image · Hubble Space Telescope/);
  assert.match(panel, /Image credit: NASA, ESA, Benjamin F\. Williams/);
  assert.match(panel, /Changes for this app: Resized/);
  assert.match(panel, /does not mean we are any closer/);
  assert.match(panel, /In our sky, it is in the constellation Andromeda\./);
  assert.equal(await page.locator('.cosmos-links a', { hasText: 'Image source' }).getAttribute('href'), 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/');
  assert.ok(await page.locator('.cosmos-links a', { hasText: 'Usage terms' }).getAttribute('href'));
  assert.ok(await page.locator('.panel__sources a').count() >= 1);
  assert.match(await page.locator('#cosmos-selected').innerText(), /Andromeda Galaxy · Spiral galaxy · About 2\.5 million light-years/);

  // Keyboard: Tab to a marker and press Enter.
  await page.focus('[data-galaxy-marker="triangulum"]');
  await page.keyboard.press('Tab');
  assert.equal((await activeInfo(page)).marker, 'messier-81');
  await page.keyboard.press('Enter');
  assert.equal(await shownGalaxy(page), 'messier-81');
  assert.equal((await activeInfo(page)).marker, 'messier-81');

  // List: focus moves to the galaxy's heading (which is read out, so the live region stays quiet).
  await page.click('[data-cosmos-action="list"] >> nth=0');
  assert.equal(await screen(page), 'list');
  assert.equal((await activeInfo(page)).galaxy, 'messier-81', 'back on the list, focus returns to that galaxy');
  await page.click('.cosmos-list__button[data-galaxy="milky-way"]');
  assert.equal(await shownGalaxy(page), 'milky-way');
  assert.equal((await activeInfo(page)).id, 'panel-title-galaxy-milky-way');
  assert.equal(await page.locator('#explorer-status').textContent(), '');
  const milkyWay = await page.locator('#info-panel').innerText();
  assert.match(milkyWay, /Artist's illustration · not a photograph/);
  assert.match(milkyWay, /We live inside it\./);
  assert.doesNotMatch(milkyWay, /light-years away/, 'no distance for our own galaxy');
  assert.match(await page.locator('[data-galaxy-marker="milky-way"]').innerText(), /You are here/);

  // Ultraviolet pictures say so in child-friendly words; CC BY pictures link their licence.
  await page.click('[data-galaxy-marker="large-magellanic-cloud"]');
  assert.match(await page.locator('#info-panel').innerText(), /Ultraviolet light, which our eyes cannot see/);
  await page.click('[data-galaxy-marker="triangulum"]');
  assert.equal(await page.locator('.cosmos-links a', { hasText: 'Licence (CC BY 4.0)' }).count(), 1);
  assert.deepEqual(errors, []);
  await context.close();
});

test('pictures: the thumbnail first, the detailed picture only for the galaxy shown', async () => {
  const { page, context, errors, requests } = await openPage('#/cosmos');
  await mapReady(page);
  assert.equal(requests.filter(url => url.includes('/assets/galaxies/')).length, 0, 'the list loads no pictures');
  let releaseDetail;
  const detailHeld = new Promise(resolve => { releaseDetail = resolve; });
  await page.route('**/assets/galaxies/whirlpool.webp', async route => {
    await detailHeld;
    await route.continue();
  });
  await page.click('.cosmos-list__button[data-galaxy="whirlpool"]');
  const image = page.locator('.cosmos-figure__image');
  await page.waitForFunction(() => document.querySelector('.cosmos-figure__image')?.complete);
  assert.match(await image.getAttribute('src'), /whirlpool-thumb\.webp$/);
  assert.equal(await image.getAttribute('data-image-size'), 'thumbnail');
  releaseDetail();
  await page.waitForSelector('.cosmos-figure__image[data-image-size="detail"]');
  assert.match(await image.getAttribute('src'), /whirlpool\.webp$/);
  const pictures = new Set(requests.filter(url => url.includes('/assets/galaxies/')).map(url => url.split('/').pop()));
  assert.deepEqual([...pictures].sort(), ['whirlpool-thumb.webp', 'whirlpool.webp'], 'no other galaxy pictures are fetched');
  assert.ok(await image.getAttribute('alt'));
  assert.deepEqual(errors, []);
  await context.close();
});

test('drag pans and pinch zooms the map only; the page itself does not scroll or zoom', async () => {
  const { page, context, errors } = await openPage('#/cosmos', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await mapReady(page);
  await page.evaluate(() => document.querySelector('.cosmos-map__viewport').scrollIntoView({ block: 'center' }));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const box = await page.locator('.cosmos-map__viewport').boundingBox();
  const before = Object.fromEntries((await markerBoxes(page)).map(b => [b.id, b]));
  const cdp = await context.newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  // One-finger drag to the left, starting on empty map.
  const y = box.y + box.height - 50;
  await touch('touchStart', [[box.x + 300, y]]);
  for (let step = 1; step <= 10; step++) await touch('touchMove', [[box.x + 300 - step * 20, y]]);
  await touch('touchEnd', []);
  const dragged = Object.fromEntries((await markerBoxes(page)).map(b => [b.id, b]));
  assert.ok(dragged.andromeda.x < before.andromeda.x - 100, 'the map moved left');
  assert.equal(await page.evaluate(() => window.scrollY), scrollBefore, 'the page did not scroll');
  assert.equal(await page.evaluate(() => window.visualViewport.scale), 1);
  // Two-finger pinch out.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
  for (let step = 1; step <= 10; step++) await touch('touchMove', [[cx - 30 - step * 8, cy], [cx + 30 + step * 8, cy]]);
  await touch('touchEnd', []);
  const zoom = Number(await page.getAttribute('#cosmos-map', 'data-zoom'));
  assert.ok(zoom > 2, `pinched to ${zoom}`);
  assert.equal(await page.evaluate(() => window.visualViewport.scale), 1, 'the page did not zoom');
  assert.equal(await page.evaluate(() => window.scrollY), scrollBefore);
  // A drag that starts on a galaxy moves the map without choosing it.
  await page.click('[data-cosmos-control="reset"]');
  const start = (await markerBoxes(page)).find(b => b.id === 'andromeda');
  await touch('touchStart', [[start.x, start.y]]);
  for (let step = 1; step <= 6; step++) await touch('touchMove', [[start.x + step * 10, start.y]]);
  await touch('touchEnd', []);
  assert.equal(await hash(page), '#/cosmos', 'a drag never chooses a galaxy');
  // A tap does choose it. (Chromium treats a tap straight after another touch as a possible double-tap and
  // sends no click, so wait as a real finger would.)
  await page.waitForTimeout(600);
  const tapped = (await markerBoxes(page)).find(b => b.id === start.id);
  await page.touchscreen.tap(tapped.x, tapped.y);
  assert.equal(await hash(page), `#/cosmos/${start.id}`);
  // Scrolling outside the map still scrolls the page.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#info-panel').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => window.scrollY) > 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a mouse wheel scrolls the page over the map; Ctrl + wheel (trackpad pinch) zooms the map', async () => {
  const { page, context, errors } = await openPage('#/cosmos', { viewport: { width: 1024, height: 700 } });
  await mapReady(page);
  const box = await page.locator('.cosmos-map__viewport').boundingBox();
  // The wheel is over the map (the window is 700 px tall).
  const overMap = { x: box.x + box.width / 2, y: Math.min(box.y + box.height, 700) - 40 };
  assert.ok(overMap.y > box.y + 40);
  await page.mouse.move(overMap.x, overMap.y);
  await page.mouse.wheel(0, 200);
  await page.waitForFunction(() => window.scrollY > 0);
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '1');
  await page.evaluate(() => document.querySelector('.cosmos-map__viewport').scrollIntoView({ block: 'center' }));
  const box2 = await page.locator('.cosmos-map__viewport').boundingBox();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Control');
  assert.ok(Number(await page.getAttribute('#cosmos-map', 'data-zoom')) > 1);
  // Mouse drag pans the map, and doesn't select text or choose a galaxy.
  const before = (await markerBoxes(page)).find(b => b.id === 'triangulum');
  await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height - 30);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width / 2 - 120, box2.y + box2.height - 30, { steps: 8 });
  await page.mouse.up();
  const after = (await markerBoxes(page)).find(b => b.id === 'triangulum');
  assert.ok(after.x < before.x - 60);
  assert.equal(await hash(page), '#/cosmos');
  assert.deepEqual(errors, []);
  await context.close();
});

test('switching between the solar system and Cosmos keeps each one where it was', async () => {
  const { page, context, errors } = await openPage('#/jupiter');
  const has3d = await page.locator('#scene[data-scene-state="ready"]').count() === 1;
  if (has3d) await page.waitForSelector('#scene[data-transition="idle"][data-focus="jupiter"]', { timeout: 15000 });
  await page.evaluate(() => { document.getElementById('info-panel').scrollTop = 250; });
  const solarTop = await page.evaluate(() => document.getElementById('info-panel').scrollTop);
  await openCosmos(page);
  await page.click('[data-cosmos-control="zoomIn"]');
  await page.click('[data-galaxy-marker="sombrero"]');
  await page.keyboard.press('ArrowLeft'); // pans the map (focus is on the Sombrero marker)
  const mapBefore = await markerBoxes(page);
  const zoomBefore = await page.getAttribute('#cosmos-map', 'data-zoom');
  await page.click('.explore-switch [data-explore="solar"]');
  assert.equal(await hash(page), '#/jupiter');
  assert.equal(await page.locator('#info-panel article.panel').last().getAttribute('data-body'), 'jupiter');
  assert.equal(await page.evaluate(() => document.getElementById('info-panel').scrollTop), solarTop, 'the solar reading position is back');
  if (has3d) {
    assert.equal(await page.getAttribute('#scene', 'data-focus'), 'jupiter');
    assert.equal(await page.getAttribute('#scene', 'data-transition'), 'idle', 'the camera did not fly again');
    assert.equal(await page.getAttribute('#scene', 'data-suspended'), 'false');
  }
  assert.equal(await page.locator('#cosmos').isHidden(), true);
  await page.click('.explore-switch [data-explore="cosmos"]');
  assert.equal(await hash(page), '#/cosmos/sombrero', 'Cosmos remembers the galaxy');
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), zoomBefore);
  assert.deepEqual(await markerBoxes(page), mapBefore, 'the map is where it was left');
  // Escape goes back to the solar system, to the world last explored; planet keys do nothing in Cosmos.
  await page.keyboard.press('3');
  assert.equal(await hash(page), '#/cosmos/sombrero');
  await page.keyboard.press('Escape');
  assert.equal(await hash(page), '#/jupiter');
  // Browser Back returns to the galaxy.
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/cosmos/sombrero');
  assert.equal(await shownGalaxy(page), 'sombrero');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Cosmos keeps the quiz and mission progress separate', async () => {
  const { page, context, errors } = await openPage();
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  const text = (await page.locator('.quiz-question').textContent()).trim();
  const question = quizQuestions.find(q => q.question === text);
  await page.locator('.quiz-answer', { hasText: ANSWER_KEY[question.id].answer }).first().click();
  await page.click('[data-quiz-action="next"]');
  const progress = await page.locator('#quiz-entry .quiz-entry__progress').textContent();
  await openCosmos(page);
  assert.equal(await page.getAttribute('#quiz-entry', 'aria-current'), null);
  assert.equal(await page.locator('#quiz-entry .quiz-entry__progress').textContent(), progress, 'the quiz is still waiting');
  assert.equal(await page.locator('.quiz-resume').count(), 1, 'the waiting bar shows while exploring Cosmos');
  await page.click('[data-galaxy-marker="pinwheel"]');
  await page.click('#quiz-entry');
  assert.match(await page.locator('.quiz-progress').textContent(), /Question 2 of 5/);
  // Explore returns to Cosmos, where the child left it.
  await page.click('#explore-entry');
  assert.equal(await hash(page), '#/cosmos/pinwheel');
  assert.deepEqual(errors, []);
  await context.close();
});

test('if the map cannot load, the list still gives every galaxy and its information', async () => {
  const { page, context, errors } = await openPage('#/cosmos', {}, { block: /cosmosMap-[^/]*\.js$/ });
  await page.waitForSelector('#cosmos-map[data-map-state="fallback"]');
  assert.match(await page.locator('#cosmos-map').innerText(), /every galaxy is in the list/);
  assert.match(await page.locator('#info-panel').innerText(), /The map is not showing, but every galaxy is in this list\./);
  assert.equal(await page.locator('.cosmos-list__button').count(), NEAREST_FIRST.length);
  await page.click('[data-cosmos-action="to-list"]');
  assert.equal((await activeInfo(page)).id, 'panel-title-cosmos');
  await page.click('.cosmos-list__button[data-galaxy="messier-87"]');
  assert.equal(await shownGalaxy(page), 'messier-87');
  assert.match(await page.locator('#info-panel').innerText(), /About 54 million light-years away/);
  assert.match(await page.locator('#info-panel').innerText(), /Image credit:/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('addresses: a galaxy link opens it, an unknown galaxy opens the list', async () => {
  const { page, context, errors } = await openPage('#/cosmos/ngc-1300');
  await page.waitForSelector('article[data-galaxy-id="ngc-1300"]');
  assert.equal(await page.locator('#info-panel h2').textContent(), 'NGC 1300');
  await mapReady(page);
  assert.equal(await page.getAttribute('[data-galaxy-marker="ngc-1300"]', 'aria-pressed'), 'true');
  const unknown = await openPage('#/cosmos/not-a-galaxy');
  await unknown.page.waitForSelector('article[data-cosmos-screen="list"]');
  assert.equal(await hash(unknown.page), '#/cosmos');
  assert.deepEqual([...errors, ...unknown.errors], []);
  await unknown.context.close();
  await context.close();
});

test('phones, large text and reduced motion: 44 px controls and no sideways scrolling', async () => {
  for (const options of [{ viewport: { width: 375, height: 700 }, hasTouch: true, isMobile: true }, { viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce' }]) {
    const { page, context, errors } = await openPage('#/cosmos/andromeda', options);
    await mapReady(page);
    for (const percent of [100, 200]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = size; }, `${percent}%`);
      await page.waitForTimeout(200);
      const small = await page.evaluate(() => [...document.querySelectorAll('#cosmos button, #info-panel button, .explore-switch button, .cosmos-links a')]
        .filter(node => node.getClientRects().length && !node.closest('[hidden]'))
        .map(node => ({ name: node.textContent.trim().slice(0, 30), box: node.getBoundingClientRect() }))
        .filter(({ box }) => box.width < 44 || box.height < 44)
        .map(({ name, box }) => `${name} ${Math.round(box.width)}×${Math.round(box.height)}`));
      assert.deepEqual(small, [], `${percent}% text`);
      assert.equal(await overflow(page), 0, `${percent}% text: no sideways scrolling`);
    }
    if (options.reducedMotion) {
      assert.equal(await page.$eval('[data-galaxy-marker="andromeda"]', node => getComputedStyle(node).transitionDuration), '0s', 'map moves are instant');
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
});
