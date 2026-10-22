// Browser tests for choosing worlds by their floating names, and for the facts card over the 3D view.
// Taps use real touch input (Chrome DevTools Protocol) on emulated phones and iPads; this is not a real device.
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

const device = name => ({ ...devices[name], defaultBrowserType: undefined });
const desktop = { viewport: { width: 1280, height: 860 } };

async function openPage(path = '', options = desktop) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(server.url + path);
  await page.waitForSelector('#info-panel article');
  if (!path.includes('view=2d')) await page.waitForSelector('#scene[data-scene-state="ready"]', { timeout: 30000 });
  return { page, context, errors };
}

const panelBody = page => page.locator('#info-panel article.panel').last().getAttribute('data-body');
const hash = page => page.evaluate(() => location.hash);
const idle = (page, focus) => page.waitForSelector(`#scene[data-transition="idle"][data-focus="${focus}"]`, { timeout: 15000 });
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const showScene = page => page.evaluate(() => document.getElementById('scene').scrollIntoView({ block: 'start' }));
// Pause with the keyboard, so nothing scrolls, and wait for the names to settle.
async function freeze(page) {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('p');
  await page.waitForSelector('#scene[data-paused="true"]');
  await page.waitForTimeout(250);
}

/** Visible names, with the centre of each name on screen and its tap area. */
function visibleNames(page) {
  return page.evaluate(() => [...document.querySelectorAll('.scene-label')]
    .filter(node => !node.hidden && node.style.visibility !== 'hidden')
    .map(node => {
      const text = node.querySelector('.scene-label__text').getBoundingClientRect();
      const target = node.getBoundingClientRect();
      return { id: node.dataset.body, x: text.left + text.width / 2, y: text.top + text.height / 2, text: { left: text.left, right: text.right, top: text.top, bottom: text.bottom }, width: target.width, height: target.height };
    }));
}

async function touchTap(page, cdp, x, y, holdMs = 120) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.waitForTimeout(holdMs);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function touchDrag(page, cdp, from, to, steps = 10) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const nameTransforms = page => page.evaluate(() => [...document.querySelectorAll('.scene-label')].map(n => n.style.transform).join('|'));

test('tapping a visible planet name on an iPad selects that same planet', async () => {
  const { page, context, errors } = await openPage('', device('iPad (gen 7)'));
  const cdp = await context.newCDPSession(page);
  await freeze(page);
  const names = await visibleNames(page);
  assert.ok(names.length >= 7, `most names are shown on an iPad (got ${names.length})`);
  for (const { id } of names) {
    await showScene(page);
    const name = (await visibleNames(page)).find(n => n.id === id);
    if (!name) continue;
    assert.ok(name.width >= 44 && name.height >= 44, `${id}: tap area ${name.width}×${name.height}`);
    await touchTap(page, cdp, name.x, name.y);
    await page.waitForFunction(expected => location.hash === `#/${expected}`, id);
    assert.equal(await panelBody(page), id);
    assert.equal(await page.locator('.scene-card').getAttribute('data-body'), id);
    assert.equal(await page.getAttribute(`.body-selector__button[data-body="${id}"]`, 'aria-pressed'), 'true', 'the selector agrees');
    await page.keyboard.press('Escape');
    await idle(page, 'overview');
    await page.waitForTimeout(150);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('on a phone, names never overlap, so each name only catches taps for its own planet', async () => {
  const { page, context, errors } = await openPage('', device('iPhone 13'));
  const cdp = await context.newCDPSession(page);
  await showScene(page);
  // While the planets move, sample the names: none may overlap another.
  for (let i = 0; i < 12; i++) {
    const names = await visibleNames(page);
    for (let a = 0; a < names.length; a++) {
      for (let b = a + 1; b < names.length; b++) {
        const p = names[a].text;
        const q = names[b].text;
        assert.ok(!(p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom), `${names[a].id} and ${names[b].id} overlap`);
      }
    }
    await page.waitForTimeout(200);
  }
  await freeze(page);
  const ids = (await visibleNames(page)).map(n => n.id);
  assert.ok(ids.length >= 5, `names shown on a phone: ${ids.join(', ')}`);
  for (const id of ids) {
    await showScene(page);
    const name = (await visibleNames(page)).find(n => n.id === id);
    if (!name) continue;
    // Tap near the edge of the visible name, not just its centre.
    await touchTap(page, cdp, name.text.left + 3, name.y);
    await page.waitForFunction(expected => location.hash === `#/${expected}`, id);
    await page.keyboard.press('Escape');
    await idle(page, 'overview');
    await page.waitForTimeout(150);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('hidden names cannot be tapped or focused: Labels off, or while a world is chosen', async () => {
  const { page, context, errors } = await openPage();
  await freeze(page);
  const focusable = () => page.evaluate(() => [...document.querySelectorAll('.scene-label')].filter(node => { node.focus(); return document.activeElement === node; }).map(n => n.dataset.body));
  assert.ok((await focusable()).length >= 7, 'shown names are focusable');
  await page.click('[data-control="labels"]');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.scene-label:not([hidden])').count(), 0);
  assert.deepEqual(await focusable(), []);
  // Labels only controls the names: a chosen world still gets its card.
  await page.click('.body-selector__button[data-body="mars"]');
  assert.equal(await page.locator('.scene-card').getAttribute('data-body'), 'mars');
  await page.click('[data-control="labels"]');
  await idle(page, 'mars');
  assert.equal(await page.locator('.scene-label:not([hidden])').count(), 0, 'names are hidden while a world is chosen');
  assert.deepEqual(await focusable(), []);
  assert.equal(await page.locator('.scene-card').getAttribute('data-body'), 'mars');
  assert.deepEqual(errors, []);
  await context.close();
});

test('keyboard: Tab reaches the names, which say where they go; Enter flies there and focuses the card', async () => {
  const { page, context, errors } = await openPage();
  await freeze(page);
  assert.equal(await page.getAttribute('#scene-labels', 'role'), 'group');
  let focused = null;
  for (let i = 0; i < 25 && !focused; i++) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => (document.activeElement?.classList.contains('scene-label') ? document.activeElement.dataset.body : null));
  }
  assert.ok(focused, 'a name is reachable with Tab');
  const label = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  assert.match(label, /^Fly to (the )?[A-Z][a-z]+$/);
  await page.keyboard.press('Enter');
  await page.waitForFunction(expected => location.hash === `#/${expected}`, focused);
  assert.equal(await page.evaluate(() => document.activeElement.className), 'scene-card__title');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), label.replace('Fly to ', ''));
  // The announcement is made once, by the existing live region.
  assert.match(await page.textContent('#explorer-status'), /^Now exploring /);
  assert.deepEqual(errors, []);
  await context.close();
});

test('a drag or pinch that starts on a name turns the view and selects nothing; the page does not scroll', async () => {
  const { page, context, errors } = await openPage('', device('iPad (gen 7)'));
  const cdp = await context.newCDPSession(page);
  await freeze(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  let name = (await visibleNames(page)).find(n => n.id === 'jupiter') ?? (await visibleNames(page))[0];
  let before = await nameTransforms(page);
  await touchDrag(page, cdp, { x: name.x, y: name.y }, { x: name.x + 150, y: name.y });
  await page.waitForTimeout(300);
  assert.notEqual(await nameTransforms(page), before, 'the view turned');
  assert.equal(await panelBody(page), 'overview');
  // A vertical drag from a name used to scroll the page instead of turning the view.
  name = (await visibleNames(page))[0];
  before = await nameTransforms(page);
  await touchDrag(page, cdp, { x: name.x, y: name.y }, { x: name.x, y: name.y - 150 });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.scrollY), 0, 'the page did not scroll');
  assert.notEqual(await nameTransforms(page), before);
  assert.equal(await panelBody(page), 'overview');
  // A two-finger pinch with one finger on a name is not a tap.
  name = (await visibleNames(page))[0];
  const box = await page.locator('#scene-canvas').boundingBox();
  const other = { x: box.x + 60, y: box.y + box.height - 60 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: name.x, y: name.y, id: 1 }, { ...other, id: 2 }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: name.x + i * 2, y: name.y - i * 12, id: 1 }, { x: other.x - i * 2, y: other.y + i * 12, id: 2 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  assert.equal(await panelBody(page), 'overview');
  assert.equal(await page.evaluate(() => visualViewport.scale), 1, 'the page itself was not zoomed');
  // A mouse drag from a name turns the view too, and does not select.
  const mouseContext = await browser.newContext(desktop);
  const mousePage = await mouseContext.newPage();
  await mousePage.goto(server.url);
  await mousePage.waitForSelector('#scene[data-scene-state="ready"]', { timeout: 30000 });
  await freeze(mousePage);
  const mouseName = (await visibleNames(mousePage))[0];
  const mouseBefore = await nameTransforms(mousePage);
  await mousePage.mouse.move(mouseName.x, mouseName.y);
  await mousePage.mouse.down();
  await mousePage.mouse.move(mouseName.x + 200, mouseName.y, { steps: 10 });
  await mousePage.mouse.up();
  await mousePage.waitForTimeout(300);
  assert.notEqual(await nameTransforms(mousePage), mouseBefore);
  assert.equal(await panelBody(mousePage), 'overview');
  await mouseContext.close();
  assert.deepEqual(errors, []);
  await context.close();
});

test('the facts card: content, hide and show, another planet, More facts and Solar system', async () => {
  const { page, context, errors } = await openPage();
  assert.equal(await page.locator('#scene-card').isHidden(), true, 'no card in the overview');
  await page.click('.body-selector__button[data-body="saturn"]');
  const card = page.locator('.scene-card');
  assert.equal(await card.getAttribute('data-body'), 'saturn');
  assert.equal(await page.textContent('.scene-card__title'), 'Saturn');
  assert.equal(await page.textContent('.scene-card__kind'), 'Gas giant · Sixth planet from the Sun');
  assert.equal(await page.textContent('.scene-card__no-surface'), 'Saturn has no solid surface.');
  const facts = await page.locator('.scene-card__facts li').allTextContents();
  assert.equal(facts.length, 3);
  assert.match(facts[0], /about 9\.4 times as wide as Earth\. Calculated$/);
  assert.match(facts[1], /29 Earth years\. Measured · NASA$/);
  assert.match(facts[2], /rings\. NASA fact$/);
  assert.doesNotMatch(await card.innerText(), /\bmoons?\b/i, 'no moon counts');
  assert.match(await card.innerText(), /model, not to scale/);
  // The card is HTML beside the canvas, not drawn into it.
  assert.equal(await page.evaluate(() => document.querySelector('.scene-card').closest('#scene') !== null && !document.querySelector('canvas').contains(document.querySelector('.scene-card'))), true);

  await page.click('[data-card-action="hide"]');
  assert.equal(await page.locator('.scene-card__facts').count(), 0);
  assert.equal(await hash(page), '#/saturn', 'hiding the card keeps the planet selected');
  assert.equal(await panelBody(page), 'saturn');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.cardAction), 'show');
  await page.click('[data-card-action="show"]');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'scene-card__title');

  await page.click('[data-card-action="hide"]');
  await page.click('[data-control="next"]');
  assert.equal(await card.getAttribute('data-body'), 'uranus', 'choosing another planet shows the card again');
  assert.equal(await page.locator('.scene-card__facts li').count(), 3);
  assert.equal(await page.textContent('.scene-card__no-surface'), 'Uranus has no solid surface.');

  await page.click('[data-card-action="more"]');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'panel-title-uranus', 'More facts moves to the information panel');
  assert.equal(await hash(page), '#/uranus');

  await page.click('[data-card-action="overview"]');
  assert.equal(await hash(page), '#/');
  assert.equal(await panelBody(page), 'overview');
  assert.equal(await page.locator('#scene-card').isHidden(), true, 'the card is removed');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'panel-title-overview', 'focus stays nearby');

  // Rocky planets have no "no solid surface" note.
  await page.click('.body-selector__button[data-body="mars"]');
  assert.equal(await page.locator('.scene-card__no-surface').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('taps and drags on the card never reach the 3D view behind it', async () => {
  const { page, context, errors } = await openPage('#/saturn');
  await idle(page, 'saturn');
  await freeze(page);
  // Screenshots of the canvas area also show the card, so hide it (and any text selection) while comparing.
  const canvasShot = async () => {
    await page.evaluate(() => { document.getSelection().removeAllRanges(); document.getElementById('scene-card').style.visibility = 'hidden'; });
    const shot = await page.locator('#scene-canvas').screenshot();
    await page.evaluate(() => { document.getElementById('scene-card').style.visibility = ''; });
    return shot;
  };
  const before = await canvasShot();
  const box = await page.locator('.scene-card__facts').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 60, { steps: 10 });
  await page.mouse.up();
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(300);
  assert.equal(Buffer.compare(before, await canvasShot()), 0, 'the 3D view did not turn, zoom or change');
  assert.equal(await hash(page), '#/saturn');
  assert.deepEqual(errors, []);
  await context.close();
});

test('phones get a compact strip; iPad layouts, 200% text and 44 px card buttons', async () => {
  const smallButtons = page => page.locator('.scene-card button').evaluateAll(nodes => nodes
    .filter(n => n.getClientRects().length).map(n => n.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length);
  {
    const { page, context, errors } = await openPage('#/jupiter', device('iPhone 13'));
    const toggle = page.locator('[data-card-action="toggle"]');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.scene-card__facts').isVisible(), false, 'facts are folded away on a phone');
    assert.equal(await page.locator('.scene-card__title').isVisible(), true);
    await toggle.tap();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.scene-card__facts').isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.cardAction), 'toggle', 'focus stays on the toggle');
    assert.equal(await smallButtons(page), 0);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(200);
    assert.equal(await overflow(page), 0);
    assert.equal(await smallButtons(page), 0);
    assert.deepEqual(errors, []);
    await context.close();
  }
  for (const name of ['iPad (gen 7)', 'iPad (gen 7) landscape', 'iPhone 13 landscape']) {
    const { page, context, errors } = await openPage('#/saturn', device(name));
    await idle(page, 'saturn');
    for (const big of [false, true]) {
      if (big) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      await page.waitForTimeout(200);
      const layout = await page.evaluate(() => {
        const r = n => document.querySelector(n).getBoundingClientRect();
        const card = r('.scene-card');
        const scene = r('#scene');
        const badge = r('.scale-badge');
        const controls = r('#controls');
        const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return {
          inside: card.left >= scene.left && card.right <= scene.right + 1 && card.top >= scene.top && card.bottom <= scene.bottom + 1,
          badge: overlaps(card, badge),
          controls: overlaps(card, controls),
        };
      });
      assert.deepEqual(layout, { inside: true, badge: false, controls: false }, `${name}${big ? ' at 200%' : ''}`);
      assert.equal(await overflow(page), 0, name);
      assert.equal(await smallButtons(page), 0, name);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test('with reduced motion and in 2D, the same card and facts are available', async () => {
  const { page, context, errors } = await openPage('', { ...desktop, reducedMotion: 'reduce' });
  await page.click('.body-selector__button[data-body="venus"]');
  assert.equal(await page.locator('#scene').getAttribute('data-transition'), 'idle', 'no camera flight');
  const facts3d = await page.locator('.scene-card__facts li').allTextContents();
  await context.close();

  const flat = await openPage('?view=2d#/venus');
  await flat.page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.equal(await flat.page.locator('.scene-card').getAttribute('data-body'), 'venus');
  assert.deepEqual(await flat.page.locator('.scene-card__facts li').allTextContents(), facts3d);
  await flat.page.click('[data-card-action="hide"]');
  assert.equal(await flat.page.locator('.scene-card__facts').count(), 0);
  await flat.page.click('[data-card-action="show"]');
  await flat.page.click('[data-card-action="more"]');
  assert.equal(await flat.page.evaluate(() => document.activeElement.id), 'panel-title-venus');
  assert.equal(await flat.page.locator('.scene-label:not([hidden])').count(), 0, 'no names without 3D');
  assert.deepEqual([...errors, ...flat.errors], []);
  await flat.context.close();
});

test('choosing worlds by name keeps quiz progress', async () => {
  const { page, context, errors } = await openPage('', device('iPad (gen 7)'));
  const cdp = await context.newCDPSession(page);
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  await page.click('[data-quiz-action="leave"]');
  const progress = await page.textContent('#quiz-entry .quiz-entry__progress');
  assert.match(progress, /1 of 5/);
  await idle(page, 'overview');
  await freeze(page);
  await showScene(page);
  const name = (await visibleNames(page))[0];
  await touchTap(page, cdp, name.x, name.y);
  await page.waitForFunction(expected => location.hash === `#/${expected}`, name.id);
  assert.equal(await page.textContent('#quiz-entry .quiz-entry__progress'), progress);
  assert.equal(await page.locator('[data-quiz-action="resume"]').count(), 1, '"Back to the quiz" is still offered');
  assert.deepEqual(errors, []);
  await context.close();
});
