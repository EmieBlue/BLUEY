const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../.expo/ui-tools/node_modules/playwright-core');

const base = process.env.NAV_TEST_URL || 'http://localhost:8093';
const output = path.resolve('.expo/back-button-review');
fs.mkdirSync(output, { recursive: true });

const appearance = button => button.evaluate(el => {
  const style = getComputedStyle(el);
  return {
    background: style.backgroundColor, border: style.borderColor,
    radius: style.borderRadius, shadow: style.boxShadow,
  };
});

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const errors = [];
  try {
    for (const width of [1280, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.route('**/*.supabase.co/**', route => route.fulfill({
        contentType: 'application/json', body: route.request().url().includes('/auth/') ? '{}' : '[]',
      }));
      await context.route('**/api/**', route => route.abort());
      await context.route('**/.netlify/functions/**', route => route.abort());
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/settings', { waitUntil: 'networkidle' });
      const back = page.getByRole('button', { name: 'Go back', exact: true });
      await back.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const initialBox = await back.boundingBox();
      assert.equal(initialBox.width, 44);
      assert.equal(initialBox.height, 44);
      const normal = await appearance(back);
      const leg = back.getByTestId('walking-leg');
      const pose = () => leg.evaluate(el => getComputedStyle(el).transform);
      assert.equal(normal.radius, '22px');
      assert.notEqual(normal.background, 'rgba(0, 0, 0, 0)');
      assert.notEqual(normal.shadow, 'none');
      await page.screenshot({ path: path.join(output, `settings-dark-${width}.png`) });
      await back.hover();
      await page.waitForTimeout(750);
      const firstPose = await pose();
      const firstPixels = await back.screenshot({ path: path.join(output, `walking-step-a-${width}.png`) });
      await page.waitForTimeout(170);
      assert.notEqual(await pose(), firstPose, 'the figure must actually walk on hover');
      const nextPixels = await back.screenshot({ path: path.join(output, `walking-step-b-${width}.png`) });
      assert.notDeepEqual(firstPixels, nextPixels, 'walking must change the rendered pixels');
      const hover = await appearance(back);
      assert.notEqual(hover.background, normal.background);
      assert.notEqual(hover.border, normal.border);
      await back.focus();
      assert.match((await appearance(back)).shadow, /3px/);
      assert.deepEqual(await back.boundingBox(), initialBox, 'interaction must not shift the header');
      await page.screenshot({ path: path.join(output, `settings-focus-${width}.png`) });
      await back.evaluate(el => el.blur());
      await page.mouse.down();
      await page.waitForFunction(() => {
        const button = document.querySelector('[aria-label="Go back"]');
        return button && getComputedStyle(button).boxShadow === 'none';
      }, null, { timeout: 2000 });
      assert.equal((await appearance(back)).shadow, 'none', 'press has a flatter appearance');
      await page.mouse.move(width - 5, 5);
      await page.mouse.up();
      await back.evaluate(el => el.blur());
      await page.waitForTimeout(300);
      const restingPose = await pose();
      await page.waitForTimeout(200);
      assert.equal(await pose(), restingPose, 'walking must stop when interaction ends');

      const palettes = page.getByTestId('theme-palettes').getByRole('button');
      for (let index = 0; index < await palettes.count(); index++) {
        await palettes.nth(index).click();
        await page.waitForTimeout(750);
        assert.deepEqual(await back.boundingBox(), initialBox, 'theme changes must keep button size and placement');
        const style = await appearance(back);
        assert.notEqual(style.background, 'rgba(0, 0, 0, 0)');
        if (index === 2) {
          assert.equal(style.background, 'rgb(234, 245, 240)');
          await page.screenshot({ path: path.join(output, `settings-light-${width}.png`) });
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(base + '/auth', { waitUntil: 'networkidle' });
      const authBack = page.getByRole('button', { name: 'Back to stories', exact: true });
      const authBox = await authBack.boundingBox();
      assert.equal(authBox.width, 44);
      assert.equal(authBox.height, 44);
      assert.equal(await authBack.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(output, `auth-${width}.png`) });
      await authBack.focus();
      assert.equal(await authBack.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
      const authLeg = authBack.getByTestId('walking-leg');
      const reducedPose = await authLeg.evaluate(el => getComputedStyle(el).transform);
      await page.waitForTimeout(250);
      assert.equal(await authLeg.evaluate(el => getComputedStyle(el).transform), reducedPose, 'reduced motion keeps the figure still');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForTimeout(100);
      const resumedPose = await authLeg.evaluate(el => getComputedStyle(el).transform);
      await page.waitForTimeout(180);
      assert.notEqual(await authLeg.evaluate(el => getComputedStyle(el).transform), resumedPose, 'motion preference changes apply without refresh');
      await page.keyboard.press('Enter');
      await page.waitForURL(url => url.pathname === '/explore');
      await context.close();
      console.log(`PASS ${width}px: all palettes, hover/press/focus, stable layout, auth and reduced motion.`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
