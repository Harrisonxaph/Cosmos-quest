// Critical family journeys, written to run in Chromium (default) or WebKit: BROWSER=webkit npm run test:e2e:webkit.
// WebKit here is Playwright's WebKit build with iPad emulation, not Safari on a real iPad.
// Correct answers come from the independent answer keys, never from the data being tested.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, webkit, devices } from 'playwright';
import { startStaticServer } from './static-server.js';
import { ANSWER_KEY } from '../data/quiz-answer-key.js';
import { MISSION_ANSWER_KEY } from '../data/mission-answer-key.js';

const engineName = process.env.BROWSER ?? 'chromium';
const engine = { chromium, webkit }[engineName];
if (!engine) throw new Error(`Unknown BROWSER "${engineName}"`);
const quizQuestions = JSON.parse(readFileSync(new URL('../../src/data/quiz.json', import.meta.url), 'utf8'));
const missions = JSON.parse(readFileSync(new URL('../../src/data/missions.json', import.meta.url), 'utf8'));
let server;
let browser;

before(async () => {
  server = await startStaticServer(process.env.DIST_DIR ?? 'dist');
  browser = await engine.launch(engineName === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : {});
});

after(async () => {
  await browser?.close();
  await server?.close();
});

const ipad = (landscape = false) => {
  const device = { ...devices[landscape ? 'iPad Mini landscape' : 'iPad Mini'] };
  delete device.defaultBrowserType; // the same iPad emulation is used with either engine
  return device;
};

async function openPage(path = '', options = ipad()) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.url + path);
  await page.waitForSelector('#info-panel article');
  // The 3D view either loads or falls back; both must leave every activity usable.
  await page.waitForSelector('#scene[data-scene-state="ready"], #scene[data-scene-state="fallback"]', { timeout: 20000 });
  return { page, context, errors };
}

const panelBody = page => page.locator('#info-panel article.panel').last().getAttribute('data-body');
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function smallTargets(page) {
  return page.evaluate(() => [...document.querySelectorAll('button, input:not([type="radio"]), select, summary, .planet-card__source')]
    .filter(node => node.getClientRects().length && !node.closest('[hidden]') && node.style.visibility !== 'hidden' && !node.classList.contains('skip-link'))
    .map(node => ({ name: node.id || node.dataset.quizAction || node.dataset.missionAction || node.dataset.experimentAction || node.textContent.trim().slice(0, 30), box: node.getBoundingClientRect() }))
    .filter(({ box }) => box.width < 44 || box.height < 44)
    .map(({ name, box }) => `${name} ${Math.round(box.width)}×${Math.round(box.height)}`));
}

test(`[${engineName}] explore: choose worlds, use the help and the activity bar`, async () => {
  const { page, context, errors } = await openPage();
  await page.tap('.body-selector__button[data-body="saturn"]');
  assert.equal(await panelBody(page), 'saturn');
  assert.match(await page.locator('#info-panel').innerText(), /no solid surface/i);
  await page.tap('[data-control="next"]');
  assert.equal(await panelBody(page), 'uranus');
  await page.tap('.explore-help summary');
  assert.match(await page.locator('.explore-help').innerText(), /round buttons/);
  assert.equal(await page.getAttribute('#explore-entry', 'aria-current'), 'page');
  assert.deepEqual(await smallTargets(page), []);
  assert.equal(await overflow(page), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test(`[${engineName}] planet names and the facts card: tap a name, hide and show the card, More facts`, async () => {
  const { page, context, errors } = await openPage();
  const has3d = await page.locator('#scene[data-scene-state="ready"]').count() === 1;
  let chosen = 'jupiter';
  if (has3d) {
    await page.keyboard.press('p'); // pause, so the names stay still
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('scene').scrollIntoView({ block: 'start' }));
    const name = await page.evaluate(() => {
      const node = [...document.querySelectorAll('.scene-label')].find(n => !n.hidden && n.style.visibility !== 'hidden');
      const box = node.querySelector('.scene-label__text').getBoundingClientRect();
      return { id: node.dataset.body, x: box.left + box.width / 2, y: box.top + box.height / 2 };
    });
    chosen = name.id;
    await page.touchscreen.tap(name.x, name.y);
  } else {
    await page.tap(`.body-selector__button[data-body="${chosen}"]`);
  }
  await page.waitForFunction(id => location.hash === `#/${id}`, chosen);
  assert.equal(await panelBody(page), chosen);
  assert.equal(await page.locator('.scene-card').getAttribute('data-body'), chosen);
  assert.equal(await page.locator('.scene-card__facts li').count(), 3);
  assert.doesNotMatch(await page.locator('.scene-card').innerText(), /\bmoons?\b/i);
  await page.tap('[data-card-action="hide"]');
  assert.equal(await page.locator('.scene-card__facts').count(), 0);
  assert.equal(await panelBody(page), chosen, 'hiding the card keeps the planet');
  await page.tap('[data-card-action="show"]');
  await page.tap('[data-card-action="more"]');
  assert.equal(await page.evaluate(() => document.activeElement.id), `panel-title-${chosen}`);
  await page.tap('[data-card-action="overview"]');
  assert.equal(await panelBody(page), 'overview');
  assert.equal(await page.locator('#scene-card').isHidden(), true);
  assert.deepEqual(await smallTargets(page), []);
  assert.equal(await overflow(page), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test(`[${engineName}] quiz: a full round with feedback, leaving and resuming`, async () => {
  const { page, context, errors } = await openPage();
  await page.tap('#quiz-entry');
  await page.tap('[data-quiz-action="start"]');
  for (let i = 1; i <= 5; i++) {
    const text = (await page.locator('.quiz-question').textContent()).trim();
    const question = quizQuestions.find(q => q.question === text);
    const expected = ANSWER_KEY[question.id].answer;
    if (i === 2) {
      await page.tap('[data-quiz-action="leave"]');
      assert.equal(await panelBody(page), 'overview');
      await page.tap('.quiz-resume [data-quiz-action="resume"]');
      assert.equal((await page.locator('.quiz-question').textContent()).trim(), text, 'the same question is waiting');
    }
    await page.locator('.quiz-answer', { hasText: expected }).first().tap();
    assert.equal(await page.locator('.quiz-feedback').getAttribute('data-correct'), 'true', question.id);
    assert.deepEqual(await smallTargets(page), []);
    await page.tap('[data-quiz-action="next"]');
  }
  assert.match(await page.locator('#info-panel h2').textContent(), /You got 5 out of 5!/);
  assert.deepEqual(errors, []);
  await context.close();
});

test(`[${engineName}] mission: complete “Meet our rocky neighbours”`, async () => {
  const { page, context, errors } = await openPage('', ipad(true));
  const mission = missions.find(m => m.id === 'rocky-neighbours');
  await page.tap('#missions-entry');
  await page.tap('.mission-card[data-mission="rocky-neighbours"] [data-mission-action="choose"]');
  await page.tap('[data-mission-action="start"]');
  for (const step of mission.steps) {
    if (step.type === 'find') {
      await page.tap('[data-mission-action="explore"]');
      assert.equal(await panelBody(page), step.target);
      await page.tap('.mission-bar [data-mission-action="found-here"]');
    } else {
      await page.locator('.quiz-answer', { hasText: MISSION_ANSWER_KEY[mission.id][step.id].answer }).first().tap();
    }
    assert.equal(await page.locator('.quiz-feedback').getAttribute('data-correct'), 'true', step.id);
    await page.tap('[data-mission-action="next"]');
  }
  assert.equal(await page.locator('#info-panel article.missions').getAttribute('data-mission-screen'), 'recap');
  assert.deepEqual(await smallTargets(page), []);
  assert.equal(await overflow(page), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test(`[${engineName}] experiments: gravity lab and tiny solar system, with settings kept`, async () => {
  const { page, context, errors } = await openPage();
  await page.tap('#experiments-entry');
  await page.tap('.mission-card[data-experiment="gravity-lab"] [data-experiment-action="choose"]');
  await page.tap('[data-experiment-action="reveal"]');
  assert.match(await page.locator('.experiment-result').innerText(), /10 kg × 3\.7 m\/s² = 37 N/);
  await page.tap('[data-experiment-action="list"]');
  await page.tap('.mission-card[data-experiment="tiny-solar-system"] [data-experiment-action="choose"]');
  await page.fill('#experiment-earth-diameter', '2.25');
  assert.equal(await page.inputValue('#experiment-earth-diameter-slider'), '2.25');
  await page.tap('[data-experiment-action="reveal"]');
  assert.match(await page.locator('.experiment-result').innerText(), /With Earth 2\.25 cm wide/);
  await page.tap('[data-experiment-action="leave"]');
  await page.tap('#experiments-entry');
  assert.equal(await page.inputValue('#experiment-earth-diameter'), '2.25', 'settings kept for this visit');
  assert.deepEqual(await smallTargets(page), []);
  assert.equal(await overflow(page), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test(`[${engineName}] 2D view, 200% text and portrait/landscape iPad layouts`, async () => {
  for (const landscape of [false, true]) {
    const { page, context, errors } = await openPage('?view=2d', ipad(landscape));
    assert.equal(await page.getAttribute('#scene', 'data-scene-state'), 'fallback');
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    for (const entry of ['#missions-entry', '#experiments-entry', '#quiz-entry', '#explore-entry']) {
      await page.tap(entry);
      assert.ok(await overflow(page) <= 1, `${landscape ? 'landscape' : 'portrait'} ${entry}: ${await overflow(page)}px sideways`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test(`[${engineName}] Cosmos: switch views, choose galaxies on the map and in the list, and come back`, async () => {
  const { page, context, errors } = await openPage('#/saturn');
  await page.tap('.explore-switch [data-explore="cosmos"]');
  await page.waitForSelector('#cosmos-map[data-map-state="ready"]');
  assert.equal(await page.getAttribute('[data-explore="cosmos"]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('#explore-entry', 'aria-current'), 'page');
  // Tap a galaxy on the map: its picture, credit and facts open in the panel.
  await page.locator('[data-galaxy-marker="andromeda"]').tap();
  await page.waitForFunction(() => location.hash === '#/cosmos/andromeda');
  assert.equal(await page.locator('#info-panel h2').textContent(), 'Andromeda Galaxy');
  const panel = await page.locator('#info-panel').innerText();
  assert.match(panel, /Composite image/);
  assert.match(panel, /Image credit: NASA/);
  assert.match(panel, /About 2\.5 million light-years away/);
  await page.waitForSelector('.cosmos-figure__image[data-image-size="detail"]');
  // Zoom, then the list: the Milky Way is an illustration, with no distance.
  await page.tap('[data-cosmos-control="zoomIn"]');
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '1.5');
  await page.locator('[data-cosmos-action="list"]').first().tap();
  await page.locator('.cosmos-list__button[data-galaxy="milky-way"]').tap();
  assert.match(await page.locator('#info-panel').innerText(), /Artist's illustration · not a photograph/);
  assert.deepEqual(await smallTargets(page), []);
  assert.equal(await overflow(page), 0);
  // Back to the solar system, at Saturn; then Cosmos again, where it was left.
  await page.tap('.explore-switch [data-explore="solar"]');
  assert.equal(await panelBody(page), 'saturn');
  await page.tap('.explore-switch [data-explore="cosmos"]');
  await page.waitForFunction(() => location.hash === '#/cosmos/milky-way');
  assert.equal(await page.getAttribute('#cosmos-map', 'data-zoom'), '1.5');
  assert.deepEqual(errors, []);
  await context.close();
});
