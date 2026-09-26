import { chromium } from 'playwright';

const pages = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

for (const p of pages) {
  const [route, name, w, h] = p.split(' ');
  await page.setViewportSize({ width: Number(w) || 1440, height: Number(h) || 900 });
  await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/shot-${name}.png`, fullPage: true });
  console.log('SHOT', name, route);
}
console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 1));
await browser.close();
