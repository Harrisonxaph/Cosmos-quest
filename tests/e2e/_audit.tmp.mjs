import { chromium, devices } from 'playwright';
import { startStaticServer } from './static-server.js';
const OUT = process.argv[2];
const server = await startStaticServer(process.env.DIST_DIR);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const configs = {
  'phone320': { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  'iphone13': { ...devices['iPhone 13'] },
  'ipad-portrait': { ...devices['iPad Mini'] },
  'ipad-landscape': { ...devices['iPad Mini landscape'] },
  'desktop': { viewport: { width: 1280, height: 800 } },
  'ipad-portrait-200': { ...devices['iPad Mini'], big: true },
  'phone-200': { ...devices['iPhone 13'], big: true },
};
async function audit(page, label) {
  return page.evaluate(label => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const small = [];
    for (const el of document.querySelectorAll('button, a, input, select, summary, [role="button"]')) {
      if (!el.getClientRects().length || el.closest('[hidden]') || el.classList.contains('skip-link') || el.classList.contains('scene-label')) continue;
      const r = el.getBoundingClientRect();
      if (el.tagName === 'A' && el.closest('p, li')) continue; // inline links in text
      if (el.type === 'radio') continue;
      if (r.width < 44 || r.height < 44) small.push(`${el.tagName}.${el.className || el.id}:"${el.textContent.trim().slice(0, 25)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    const wide = [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > doc.clientWidth + 1 && !el.closest('.body-selector__list') && !el.closest('.scene') && getComputedStyle(el).position !== 'absolute').slice(0, 5).map(el => `${el.tagName}.${el.className}`);
    const header = document.querySelector('.site-header').getBoundingClientRect().height;
    const panelTop = document.getElementById('info-panel').getBoundingClientRect().top + window.scrollY;
    return { label, overflow, small: small.slice(0, 12), wide, headerHeight: Math.round(header), panelTop: Math.round(panelTop), vh: window.innerHeight };
  }, label);
}
for (const [name, cfg] of Object.entries(configs)) {
  const { big, ...opts } = cfg;
  const ctx = await browser.newContext({ ...opts, defaultBrowserType: undefined });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(server.url);
  await page.waitForSelector('#info-panel article');
  if (big) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await page.waitForTimeout(1500);
  const results = [];
  results.push(await audit(page, 'overview'));
  await page.screenshot({ path: `${OUT}/${name}-1-start.png` });
  await page.click('.body-selector__button[data-body="saturn"]'); await page.waitForTimeout(300);
  results.push(await audit(page, 'saturn'));
  await page.click('#quiz-entry'); await page.click('[data-quiz-action="start"]');
  results.push(await audit(page, 'quiz'));
  await page.screenshot({ path: `${OUT}/${name}-2-quiz.png` });
  await page.click('#missions-entry'); await page.click('.mission-card[data-mission="giants-without-ground"] [data-mission-action="choose"]'); await page.click('[data-mission-action="start"]');
  results.push(await audit(page, 'mission'));
  await page.screenshot({ path: `${OUT}/${name}-3-mission.png` });
  await page.click('#experiments-entry'); await page.click('.mission-card[data-experiment="tiny-solar-system"] [data-experiment-action="choose"]'); await page.click('[data-experiment-action="reveal"]');
  results.push(await audit(page, 'experiment'));
  await page.screenshot({ path: `${OUT}/${name}-4-experiment.png` });
  console.log(`== ${name}`); for (const r of results) console.log(JSON.stringify(r)); if (errors.length) console.log('errors', errors);
  await ctx.close();
}
await browser.close(); await server.close();
