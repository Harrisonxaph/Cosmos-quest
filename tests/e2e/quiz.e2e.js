// Browser tests for the Planet Quiz (run after `npm run build`). Set DIST_DIR to test another build folder.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, devices } from 'playwright';
import { startStaticServer } from './static-server.js';

const questions = JSON.parse(readFileSync(new URL('../../src/data/quiz.json', import.meta.url), 'utf8'));
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

const quizStatus = page => page.locator('#info-panel article.quiz').getAttribute('data-quiz-status');
const hash = page => page.evaluate(() => location.hash);
const activeElement = page => page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el.tagName, text: el.textContent.trim(), action: el.dataset.quizAction ?? null, answer: el.dataset.answer ?? null };
});

async function currentQuestionData(page) {
  const text = (await page.locator('.quiz-question').textContent()).trim();
  const question = questions.find(q => q.question === text);
  assert.ok(question, `unknown question on screen: ${text}`);
  return question;
}

async function answer(page, correct) {
  const question = await currentQuestionData(page);
  const id = correct ? question.correctAnswerId : question.answers.find(a => a.id !== question.correctAnswerId).id;
  await page.click(`.quiz-answer[data-answer="${id}"]`);
  return question;
}

test('a complete round: progress, feedback, sources, results, play again and back to exploring', async () => {
  const { page, context, errors } = await openPage();
  await page.click('#quiz-entry');
  assert.equal(await hash(page), '#/quiz');
  assert.match(await page.locator('#info-panel h2').textContent(), /Planet Quiz/);
  await page.click('[data-quiz-action="start"]');

  const asked = [];
  for (let i = 1; i <= 5; i++) {
    assert.equal((await page.locator('.quiz-progress').textContent()).trim(), `Question ${i} of 5`);
    assert.equal(await page.locator('.quiz-answer').count(), 3);
    const correct = i % 2 === 1; // right, wrong, right, wrong, right
    const question = await answer(page, correct);
    asked.push(question.id);
    assert.equal(await quizStatus(page), 'feedback');
    assert.equal(await page.locator('.quiz-feedback').getAttribute('data-correct'), String(correct));
    assert.match(await page.locator('.quiz-feedback').textContent(), new RegExp(question.explanation.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    const links = await page.locator('.quiz-source a').evaluateAll(as => as.map(a => a.href));
    assert.ok(links.length >= 1 && links.every(href => sourceUrls.has(href)), 'source links point to the cited NASA pages');
    // Correctness is spelled out in words, not colour alone.
    const correctLabel = await page.locator(`.quiz-result[data-answer="${question.correctAnswerId}"] .quiz-result__label`).textContent();
    assert.match(correctLabel, correct ? /✓ Your answer is correct/ : /✓ Correct answer/);
    if (!correct) {
      assert.match(await page.locator('.quiz-result.is-chosen .quiz-result__label').textContent(), /Your answer/);
      assert.match(await page.locator('.quiz-feedback').textContent(), /The answer is:/);
    }
    await page.click('[data-quiz-action="next"]');
  }

  assert.equal(new Set(asked).size, 5, 'no repeated questions in a round');
  assert.equal(await quizStatus(page), 'results');
  assert.match(await page.locator('#info-panel h2').textContent(), /You got 3 out of 5!/);
  assert.equal(await page.locator('.quiz-summary li').count(), 5);
  assert.equal(await page.locator('.quiz-summary li[data-correct="true"]').count(), 3);

  await page.click('[data-quiz-action="play-again"]');
  assert.equal((await page.locator('.quiz-progress').textContent()).trim(), 'Question 1 of 5');
  const replay = await currentQuestionData(page);
  assert.ok(!asked.includes(replay.id), 'play again starts with a question not just asked');

  await page.click('#quiz-entry'); // stays on the quiz
  await page.locator('.quiz-answer').first().waitFor();
  await answer(page, true);
  for (let i = 0; i < 4; i++) {
    await page.click('[data-quiz-action="next"]');
    await answer(page, true);
  }
  await page.click('[data-quiz-action="next"]');
  assert.match(await page.locator('#info-panel h2').textContent(), /You got 5 out of 5!/);
  await page.click('[data-quiz-action="back"]');
  assert.equal(await page.locator('#info-panel article').getAttribute('data-body'), 'overview');
  assert.equal(await page.locator('.quiz-resume').count(), 0, 'finished quiz is cleared');
  assert.equal((await page.locator('.quiz-entry__progress').textContent()).trim(), '');
  assert.deepEqual(errors, []);
  await context.close();
});

test('keyboard only: focus moves to each question and each piece of feedback', async () => {
  const { page, context } = await openPage();
  await page.locator('#quiz-entry').focus();
  await page.keyboard.press('Enter');
  assert.match((await activeElement(page)).text, /Planet Quiz/, 'focus moves to the quiz heading');
  await page.keyboard.press('Tab');
  assert.equal((await activeElement(page)).action, 'start');
  await page.keyboard.press('Enter');

  for (let i = 1; i <= 5; i++) {
    const heading = await activeElement(page);
    assert.equal(heading.tag, 'H2');
    assert.match(heading.text, new RegExp(`^Question ${i} of 5`), 'question heading is focused and announced');
    await page.keyboard.press('Tab');
    const first = await activeElement(page);
    assert.ok(first.answer, 'Tab reaches the first answer');
    await page.keyboard.press('Space');
    const feedback = await activeElement(page);
    assert.equal(feedback.tag, 'H3', 'feedback heading is focused and announced');
    assert.match(feedback.text, /!$/);
    if (i === 3) {
      // Explorer shortcuts don't pull the child out of the quiz.
      await page.keyboard.press('5');
      await page.keyboard.press('ArrowRight');
      assert.equal(await hash(page), '#/quiz');
      assert.equal(await quizStatus(page), 'feedback');
      await page.locator('.quiz-feedback h3').focus();
    }
    for (let tabs = 0; tabs < 8 && (await activeElement(page)).action !== 'next'; tabs++) await page.keyboard.press('Tab');
    assert.equal((await activeElement(page)).action, 'next');
    await page.keyboard.press('Enter');
  }
  const results = await activeElement(page);
  assert.match(results.text, /^You got \d out of 5!$/, 'results heading is focused');
  for (let tabs = 0; tabs < 12 && (await activeElement(page)).action !== 'play-again'; tabs++) await page.keyboard.press('Tab');
  assert.equal((await activeElement(page)).action, 'play-again');
  await page.keyboard.press('Enter');
  assert.match((await activeElement(page)).text, /^Question 1 of 5/);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#info-panel article').getAttribute('data-body'), 'overview', 'Escape returns to exploring');
  assert.equal(await page.locator('.quiz-resume').count(), 1, 'and the quiz waits');
  await context.close();
});

test('exploring a planet mid-quiz keeps progress, and the quiz resumes where it was', async () => {
  const { page, context } = await openPage();
  await page.click('#quiz-entry');
  await page.click('[data-quiz-action="start"]');
  const first = await answer(page, false);
  const questionText = (await page.locator('.quiz-question').textContent()).trim();
  await page.click('[data-quiz-action="explore"]');
  assert.equal(await hash(page), `#/${first.planetId}`);
  assert.equal(await page.locator('#info-panel article.panel:not(.quiz)').getAttribute('data-body'), first.planetId);
  assert.match(await page.locator('.quiz-resume').textContent(), /question 1 of 5/);
  assert.match(await page.locator('#quiz-entry').textContent(), /Question 1 of 5/);

  await page.click('.body-selector__button[data-body="neptune"]');
  assert.equal(await page.locator('.quiz-resume').count(), 1, 'still waiting on another world');
  await page.click('[data-quiz-action="resume"]');
  assert.equal(await quizStatus(page), 'feedback', 'returns to the same feedback');
  assert.equal((await page.locator('.quiz-question').textContent()).trim(), questionText);
  assert.equal(await page.locator('.quiz-feedback').getAttribute('data-correct'), 'false');

  await page.click('[data-quiz-action="next"]');
  assert.equal((await page.locator('.quiz-progress').textContent()).trim(), 'Question 2 of 5');
  await page.goBack();
  assert.equal(await hash(page), '#/neptune', 'browser Back leaves the quiz');
  await page.goForward();
  assert.equal(await hash(page), '#/quiz');
  assert.equal((await page.locator('.quiz-progress').textContent()).trim(), 'Question 2 of 5', 'progress kept after Back and Forward');
  await context.close();
});

test('phone layout: every quiz control is at least 44 × 44 pixels', async () => {
  const { page, context, errors } = await openPage('', { ...devices['iPhone 13'], defaultBrowserType: undefined });
  const check = async selector => {
    const sizes = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect();
      return { name: node.dataset.quizAction ?? node.dataset.answer ?? node.id, width: box.width, height: box.height };
    }));
    assert.ok(sizes.length > 0, `nothing matched ${selector}`);
    for (const size of sizes) assert.ok(size.width >= 44 && size.height >= 44, `${size.name}: ${size.width.toFixed(1)} × ${size.height.toFixed(1)}`);
  };
  await check('#quiz-entry');
  await page.click('[data-quiz-action="open"]'); // the overview panel's entry point
  await check('[data-quiz-action="start"]');
  await page.click('[data-quiz-action="start"]');
  await check('.quiz-answer');
  await answer(page, true);
  await check('[data-quiz-action="next"], [data-quiz-action="explore"]');
  await page.click('[data-quiz-action="explore"]');
  await check('[data-quiz-action="resume"]');
  await page.click('[data-quiz-action="resume"]');
  for (let i = 0; i < 4; i++) {
    await page.click('[data-quiz-action="next"]');
    await answer(page, false);
  }
  await page.click('[data-quiz-action="next"]');
  await check('[data-quiz-action="play-again"], [data-quiz-action="back"]');
  assert.deepEqual(errors, []);
  await context.close();
});

test('the whole quiz works without 3D', async () => {
  const { page, context, errors } = await openPage('?view=2d#/quiz');
  await page.waitForSelector('#scene[data-scene-state="fallback"]');
  assert.equal(await quizStatus(page), 'idle', 'a #/quiz link opens the quiz');
  await page.click('[data-quiz-action="start"]');
  const first = await answer(page, true);
  await page.click('[data-quiz-action="explore"]');
  assert.equal(await page.locator('#info-panel article.panel:not(.quiz)').getAttribute('data-body'), first.planetId);
  await page.click('[data-quiz-action="resume"]');
  for (let i = 0; i < 4; i++) {
    await page.click('[data-quiz-action="next"]');
    await answer(page, true);
  }
  await page.click('[data-quiz-action="next"]');
  assert.match(await page.locator('#info-panel h2').textContent(), /You got 5 out of 5!/);
  assert.deepEqual(errors, []);
  await context.close();
});
