// Browser tests for Science Experiments (run after `npm run build`). Set DIST_DIR to test another build folder.
// Expected numbers are worked out by hand from NASA's values, not with the app's code.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import { startStaticServer } from './static-server.js';

const sources = JSON.parse(readFileSync(new URL('../../src/data/sources.json', import.meta.url), 'utf8'));
const sourceUrls = new Set(sources.map(source => source.url));
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

const screen = page => page.locator('#info-panel article.experiments').getAttribute('data-experiment-screen');
const panelBody = page => page.locator('#info-panel article.panel').last().getAttribute('data-body');
const hash = page => page.evaluate(() => location.hash);
const status = page => page.evaluate(() => document.getElementById('explorer-status').textContent);
const active = page => page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el.tagName, id: el.id, text: el.textContent.replace(/\s+/g, ' ').trim(), action: el.dataset.experimentAction ?? null };
});
const resultText = page => page.locator('.experiment-result').innerText();
const modelValue = (page, id, value) => page.locator(`.experiment-card[data-row="${id}"] [data-value="${value}"]`).textContent();

async function openExperiment(page, id) {
  await page.click('#experiments-entry');
  assert.equal(await hash(page), '#/experiments');
  assert.equal(await screen(page), 'list');
  await page.click(`.mission-card[data-experiment="${id}"] [data-experiment-action="choose"]`);
  assert.equal(await screen(page), 'form');
}

async function completeGravityLab(page) {
  assert.equal(await page.inputValue('#experiment-mass'), '10');
  assert.equal(await page.inputValue('#experiment-world'), 'mars');
  const worlds = await page.locator('#experiment-world option').evaluateAll(options => options.map(o => o.value));
  assert.deepEqual(worlds, ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'], 'every planet, no Sun');
  assert.equal(await page.locator('.experiment-result').count(), 0, 'nothing is revealed before asking');
  await page.check('#gravity-lab-prediction-less');
  await page.click('[data-experiment-action="reveal"]');
  assert.equal(await screen(page), 'result');
  const mars = await resultText(page);
  assert.match(mars, /A 10 kg mass on Mars/);
  assert.match(mars, /force of about 37 N/); // 10 × 3.7
  assert.match(mars, /pulled with about 98 N/); // 10 × 9.8
  assert.match(mars, /10 kg × 3\.7 m\/s² = 37 N/);
  assert.match(mars, /The mass is still 10 kg/);
  assert.match(mars, /Your guess: Less than on Earth\. The calculation shows: less than on Earth\./);
  assert.doesNotMatch(mars, /correct|wrong|score|points/i, 'guesses are not scored');
  assert.match(mars, /Measured · NASA/);
  assert.match(mars, /Calculated/);
  const links = await page.locator('.experiment-result .quiz-source a').evaluateAll(as => as.map(a => a.href));
  assert.ok(links.length >= 1 && links.every(href => sourceUrls.has(href)), 'NASA sources beside the explanation');

  // Changing a setting hides the old result until the child asks again.
  await page.selectOption('#experiment-world', 'jupiter');
  assert.equal(await page.locator('.experiment-result').count(), 0);
  await page.fill('#experiment-mass', '2.5');
  await page.click('[data-experiment-action="reveal"]');
  const jupiter = await resultText(page);
  assert.match(jupiter, /force of about 57\.8 N/); // 2.5 × 23.1 = 57.75
  assert.match(jupiter, /1-bar level/);
  assert.match(jupiter, /no solid surface, so nobody could stand there/);
  assert.doesNotMatch(jupiter, /surface of Jupiter|standing on/i);
  assert.equal(await page.locator('.experiment-result .quiz-source a').count(), 2, 'the 1-bar notes are cited too');
}

async function completeTinySolarSystem(page) {
  assert.equal(await page.inputValue('#experiment-earth-diameter'), '1');
  await page.check('#tiny-solar-system-prediction-over-1-km');
  await page.click('[data-experiment-action="reveal"]');
  assert.equal(await screen(page), 'result');
  assert.equal(await page.locator('.experiment-card').count(), 9);
  assert.equal(await modelValue(page, 'sun', 'model-diameter'), '1.1 m'); // 1,391,400 ÷ 12,756 = 109.08 cm
  assert.equal(await modelValue(page, 'neptune', 'model-distance'), '3.5 km'); // 4,515 million ÷ 12,756 = 3,539.5 m
  assert.equal(await modelValue(page, 'earth', 'model-distance'), '117 metres');
  const text = await resultText(page);
  assert.match(text, /The calculation shows: more than 1 kilometre \(about 3\.5 km\)/);
  assert.match(text, /equatorial diameters for the planets/);
  assert.match(text, /twice NASA's volumetric mean radius/);
  assert.match(text, /Distances are averages/);
  assert.match(text, /no picture here on purpose/i);

  // Slider and number stay in step; a change hides the old result.
  await page.locator('#experiment-earth-diameter-slider').fill('2.5');
  assert.equal(await page.inputValue('#experiment-earth-diameter'), '2.5');
  assert.equal(await page.locator('.experiment-result').count(), 0);
  await page.fill('#experiment-earth-diameter', '4');
  assert.equal(await page.inputValue('#experiment-earth-diameter-slider'), '4');
  await page.fill('#experiment-earth-diameter', '2.5');
  await page.click('[data-experiment-action="reveal"]');
  assert.equal(await modelValue(page, 'sun', 'model-diameter'), '2.7 m'); // 109.08 × 2.5 = 272.7 cm
  assert.equal(await modelValue(page, 'jupiter', 'model-diameter'), '28 cm'); // 142,984 ÷ 12,756 × 2.5 = 28.02 cm
  assert.equal(await modelValue(page, 'neptune', 'model-distance'), '8.8 km'); // 3,539.5 × 2.5 = 8,848.8 m
  assert.equal(await modelValue(page, 'sun', 'model-distance'), 'At the centre');
}

test('Gravity lab: predict, reveal, change and reset', async () => {
  const { page, context, errors } = await openPage();
  await openExperiment(page, 'gravity-lab');
  await completeGravityLab(page);
  await page.click('[data-experiment-action="reset"]');
  assert.equal(await page.inputValue('#experiment-mass'), '10');
  assert.equal(await page.inputValue('#experiment-world'), 'mars');
  assert.equal(await page.isChecked('#gravity-lab-prediction-none'), true);
  assert.equal(await page.locator('.experiment-result').count(), 0);
  assert.equal((await active(page)).id, 'experiments-title', 'focus returns to the activity heading');
  await page.waitForFunction(() => document.getElementById('explorer-status').textContent === 'Gravity lab is back to its starting values.');
  assert.deepEqual(errors, []);
  await context.close();
});

test('Build a tiny solar system: predict, calculate, change and reset', async () => {
  const { page, context, errors } = await openPage();
  await openExperiment(page, 'tiny-solar-system');
  await completeTinySolarSystem(page);
  await page.click('[data-experiment-action="reset"]');
  assert.equal(await page.inputValue('#experiment-earth-diameter'), '1');
  assert.equal(await page.inputValue('#experiment-earth-diameter-slider'), '1');
  assert.equal(await page.locator('.experiment-result').count(), 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('invalid, empty, zero, negative and out-of-range values show clear messages', async () => {
  const { page, context } = await openPage();
  await openExperiment(page, 'gravity-lab');
  const cases = [
    ['', /Please type the mass/],
    ['abc', /“abc” isn’t a number/],
    ['0', /must be more than 0 kg/],
    ['-5', /must be more than 0 kg/],
    ['2000', /2,000 kg is too big\. Choose a number from 0\.1 to 1,000 kilograms/],
  ];
  for (const [value, message] of cases) {
    await page.fill('#experiment-mass', value);
    await page.click('[data-experiment-action="reveal"]');
    assert.equal(await screen(page), 'error', JSON.stringify(value));
    assert.equal(await page.locator('.experiment-result').count(), 0);
    assert.equal((await active(page)).id, 'experiment-mass', 'focus moves to the field to fix');
    assert.equal(await page.getAttribute('#experiment-mass', 'aria-invalid'), 'true');
    assert.match(await page.getAttribute('#experiment-mass', 'aria-describedby'), /experiment-mass-error/);
    assert.match(await page.locator('#experiment-mass-error').textContent(), message);
    assert.match(await page.locator('#experiment-mass-error').textContent(), /^⚠/, 'marked with a symbol, not only colour');
  }
  await page.locator('#experiment-mass').pressSequentially('7');
  assert.equal(await page.locator('#experiment-mass-error').count(), 0, 'the message goes once the child types');
  assert.equal(await page.getAttribute('#experiment-mass', 'aria-invalid'), null);

  await page.click('[data-experiment-action="list"]');
  await page.click('.mission-card[data-experiment="tiny-solar-system"] [data-experiment-action="choose"]');
  for (const [value, message] of [['0.4', /0\.4 cm is too small/], ['6', /6 cm is too big/], ['-1', /more than 0 cm/]]) {
    await page.fill('#experiment-earth-diameter', value);
    await page.click('[data-experiment-action="reveal"]');
    assert.match(await page.locator('#experiment-earth-diameter-error').textContent(), message);
  }
  await context.close();
});

test('keyboard only: choose, type, submit and hear the result, without explorer shortcuts firing', async () => {
  const { page, context, errors } = await openPage();
  const tabTo = async (predicate, limit = 40) => {
    for (let i = 0; i < limit && !predicate(await active(page)); i++) await page.keyboard.press('Tab');
    assert.ok(predicate(await active(page)), `could not Tab to the control (on ${JSON.stringify(await active(page))})`);
  };
  await page.locator('#experiments-entry').focus();
  await page.keyboard.press('Enter');
  assert.equal((await active(page)).text, 'Science Experiments');
  await tabTo(el => el.action === 'choose' && el.text.includes('Gravity lab'));
  await page.keyboard.press('Enter');
  assert.equal((await active(page)).text, 'Gravity lab');
  await tabTo(el => el.id === 'experiment-mass');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('30'); // "3" is also the explorer shortcut for Earth
  assert.equal(await hash(page), '#/experiments', 'typing digits does not jump to a planet');
  await page.keyboard.press('Tab');
  assert.equal((await active(page)).id, 'experiment-world');
  await page.keyboard.press('ArrowDown'); // Mars → Jupiter
  assert.equal(await page.inputValue('#experiment-world'), 'jupiter');
  await page.keyboard.press('Tab');
  assert.equal((await active(page)).id, 'gravity-lab-prediction-none', 'Tab enters the guesses at the selected choice');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.isChecked('#gravity-lab-prediction-more'), true);
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.isChecked('#gravity-lab-prediction-same'), true, 'arrow keys choose a guess');
  await page.locator('#experiment-mass').focus();
  await page.keyboard.press('Enter'); // Enter in the field submits
  const heading = await active(page);
  assert.equal(heading.id, 'experiment-result-title');
  assert.equal(heading.text, 'Result: A 30 kg mass on Jupiter');
  await page.waitForFunction(() => /^Gravity on Jupiter pulls on it with a force of about 693 N\./.test(document.getElementById('explorer-status').textContent)); // 30 × 23.1
  await tabTo(el => el.action === 'leave');
  await page.keyboard.press('Enter');
  assert.equal(await panelBody(page), 'overview');
  assert.deepEqual(errors, []);
  await context.close();
});

test('moving the slider announces nothing until the child asks for the result', async () => {
  const { page, context } = await openPage();
  await openExperiment(page, 'tiny-solar-system');
  await page.waitForTimeout(400);
  const before = await status(page);
  await page.locator('#experiment-earth-diameter-slider').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  assert.equal(await page.inputValue('#experiment-earth-diameter'), '1.5');
  assert.equal(await page.getAttribute('#experiment-earth-diameter-slider', 'aria-valuetext'), '1.5 centimetres');
  await page.waitForTimeout(500);
  assert.equal(await status(page), before);
  await page.click('[data-experiment-action="reveal"]');
  await page.waitForFunction(() => document.getElementById('explorer-status').textContent.startsWith('With Earth 1.5 cm wide'));
  await context.close();
});

test('stale results are not announced after leaving or changing a value', async () => {
  const { page, context } = await openPage();
  await openExperiment(page, 'gravity-lab');
  await page.evaluate(() => {
    document.querySelector('[data-experiment-action="reveal"]').click();
    document.querySelector('[data-experiment-action="leave"]').click();
  });
  await page.waitForTimeout(700);
  assert.equal(await status(page), 'Showing the whole solar system');
  await page.click('#experiments-entry');
  await page.evaluate(() => {
    document.querySelector('[data-experiment-action="reveal"]').click();
    const input = document.getElementById('experiment-mass');
    input.value = '11';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(700);
  assert.doesNotMatch(await status(page), /Gravity on/, 'the hidden result was not read out');
  await context.close();
});

for (const [label, options] of [['desktop', { viewport: { width: 1280, height: 640 } }], ['phone', { ...devices['iPhone 13'], defaultBrowserType: undefined }]]) {
  test(`${label}: leaving and returning keeps settings, results, focus and reading position`, async () => {
    const { page, context, errors } = await openPage('', options);
    await openExperiment(page, 'tiny-solar-system');
    await page.fill('#experiment-earth-diameter', '3');
    await page.click('[data-experiment-action="reveal"]');
    const leave = page.locator('[data-experiment-action="leave"]');
    await leave.scrollIntoViewIfNeeded();
    await leave.focus();
    const before = await page.evaluate(() => ({ panelTop: Math.round(document.getElementById('info-panel').scrollTop), pageY: Math.round(window.scrollY) }));
    if (label === 'desktop') assert.ok(before.panelTop > 0); else assert.ok(before.pageY > 0);
    await page.keyboard.press('Enter');
    assert.equal(await panelBody(page), 'overview');
    await page.click('.body-selector__button[data-body="saturn"]');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#experiments-entry');
    assert.equal(await screen(page), 'result', 'the result is still there');
    assert.equal(await page.inputValue('#experiment-earth-diameter'), '3');
    assert.equal((await active(page)).action, 'leave', 'focus returns to the button used');
    const after = await page.evaluate(() => ({ panelTop: Math.round(document.getElementById('info-panel').scrollTop), pageY: Math.round(window.scrollY) }));
    assert.ok(Math.abs(after.panelTop - before.panelTop) <= 2, `panel ${before.panelTop} → ${after.panelTop}`);
    assert.ok(Math.abs(after.pageY - before.pageY) <= 2, `page ${before.pageY} → ${after.pageY}`);

    // The other activity keeps its own settings too, and browser Back/Forward work.
    await page.click('[data-experiment-action="list"]');
    await page.click('.mission-card[data-experiment="gravity-lab"] [data-experiment-action="choose"]');
    await page.fill('#experiment-mass', '55');
    await page.goBack();
    assert.equal(await hash(page), '#/saturn');
    await page.goForward();
    assert.equal(await page.inputValue('#experiment-mass'), '55');
    assert.equal((await active(page)).id, 'experiment-mass', 'back on the same form, focus returns to the field being typed in');
    assert.deepEqual(errors, []);
    await context.close();
  });
}

test('quiz and mission progress stay intact while experimenting', async () => {
  const { page, context } = await openPage();
  await page.click('#missions-entry');
  await page.click('.mission-card[data-mission="rocky-neighbours"] [data-mission-action="choose"]');
  await page.click('[data-mission-action="start"]');
  await page.click('[data-mission-action="explore"]');
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  await page.locator('.quiz-answer').first().click();
  const question = (await page.locator('.quiz-question').textContent()).trim();

  await openExperiment(page, 'gravity-lab');
  await page.click('[data-experiment-action="reveal"]');
  await page.click('[data-experiment-action="reset"]');
  assert.match(await page.locator('.mission-bar').textContent(), /Step 1 of 5/);
  assert.equal(await page.locator('.quiz-resume:not(.mission-bar)').count(), 1);
  assert.match(await page.locator('#missions-entry').textContent(), /Step 1 of 5/);
  assert.match(await page.locator('#quiz-entry').textContent(), /Question 1 of 5/);

  await page.click('.quiz-resume:not(.mission-bar) [data-quiz-action="resume"]');
  assert.equal(await page.locator('#info-panel article.quiz').getAttribute('data-quiz-status'), 'feedback');
  assert.equal((await page.locator('.quiz-question').textContent()).trim(), question);
  await page.click('#missions-entry');
  assert.equal(await page.locator('#info-panel article.missions').getAttribute('data-mission-screen'), 'task');
  assert.match(await page.locator('.mission-visited').textContent(), /You’ve visited Mercury/, 'the mission visit is kept');
  await context.close();
});

test('phone and tablet layouts: every experiment control is at least 44 × 44 pixels', async () => {
  for (const device of ['iPhone 13', 'iPad Mini']) {
    const { page, context, errors } = await openPage('', { ...devices[device], defaultBrowserType: undefined });
    const check = async selector => {
      const sizes = await page.locator(selector).evaluateAll(nodes => nodes.filter(node => node.getClientRects().length).map(node => {
        const box = node.getBoundingClientRect();
        return { name: node.dataset.experimentAction ?? node.id ?? node.textContent, width: box.width, height: box.height };
      }));
      assert.ok(sizes.length > 0, `${device}: nothing matched ${selector}`);
      for (const size of sizes) assert.ok(size.width >= 44 && size.height >= 44, `${device} ${size.name}: ${size.width.toFixed(1)} × ${size.height.toFixed(1)}`);
    };
    await check('#experiments-entry');
    await page.tap('[data-experiment-action="open"]'); // the overview panel's entry point
    await check('[data-experiment-action="choose"], [data-experiment-action="leave"]');
    await page.tap('.mission-card[data-experiment="gravity-lab"] [data-experiment-action="choose"]');
    await check('#experiment-mass, #experiment-world, .experiment-choice, [data-experiment-action="reveal"], [data-experiment-action="reset"], [data-experiment-action="leave"], [data-experiment-action="list"]');
    await page.tap('label[for="gravity-lab-prediction-more"]');
    assert.equal(await page.isChecked('#gravity-lab-prediction-more'), true, 'the whole label is tappable');
    await page.tap('[data-experiment-action="reveal"]');
    assert.equal(await screen(page), 'result');
    await page.tap('[data-experiment-action="list"]');
    await page.tap('.mission-card[data-experiment="tiny-solar-system"] [data-experiment-action="choose"]');
    await check('#experiment-earth-diameter, #experiment-earth-diameter-slider, .experiment-choice');
    await page.tap('[data-experiment-action="reveal"]');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${device}: no sideways page scrolling (${overflow}px)`);
    assert.deepEqual(errors, []);
    await context.close();
  }
});

test('both experiments work without 3D', async () => {
  const { page, context, errors } = await openPage('?view=2d#/experiments');
  await page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.equal(await screen(page), 'list', 'a #/experiments link opens the experiments');
  await page.click('.mission-card[data-experiment="gravity-lab"] [data-experiment-action="choose"]');
  await completeGravityLab(page);
  await page.click('[data-experiment-action="list"]');
  await page.click('.mission-card[data-experiment="tiny-solar-system"] [data-experiment-action="choose"]');
  await completeTinySolarSystem(page);
  assert.deepEqual(errors, []);
  await context.close();
});
