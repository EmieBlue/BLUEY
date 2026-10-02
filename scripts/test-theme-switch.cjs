const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../.expo/ui-tools/node_modules/playwright-core');

const base = process.env.THEME_TEST_URL || 'http://localhost:8093';
const output = path.resolve('.expo/theme-review');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.route('**/*.supabase.co/**', route => route.fulfill({
      contentType: 'application/json', body: route.request().url().includes('/auth/') ? '{}' : '[]',
    }));
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const control = page.getByRole('switch', { name: 'Dark mode' });
    const canvas = page.locator('.elyra-theme-switch canvas');
    const palettes = page.getByTestId('theme-palettes');
    const choice = label => palettes.getByRole('button', { name: label, exact: true });
    const idle = () => page.waitForFunction(() => document.querySelector('[role="switch"]')?.getAttribute('aria-busy') === 'false');
    const pixels = () => canvas.evaluate(el => {
      const rgba = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
      let painted = 0;
      let gold = 0;
      let hash = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] > 0) painted++;
        if (rgba[i] > 210 && rgba[i + 1] > 130 && rgba[i + 1] < 215 && rgba[i + 2] < 120 && rgba[i + 3] > 100) gold++;
        hash = (Math.imul(hash, 31) + rgba[i] + rgba[i + 3]) | 0;
      }
      return { painted, gold, hash };
    });
    const bg = () => page.locator('#elyra-settings').evaluate(el => getComputedStyle(el).backgroundColor);
    const shot = name => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });

    await page.goto(base + '/settings', { waitUntil: 'networkidle' });
    await control.waitFor();
    await page.waitForTimeout(750);
    assert.equal(await control.getAttribute('aria-checked'), 'true');
    assert.equal(await bg(), 'rgb(4, 20, 15)');
    assert.equal(await palettes.getByRole('button').count(), 7);
    const night = await pixels();
    assert.ok(night.painted > 1500, 'night canvas must contain visible artwork');
    await shot('desktop-night');

    // Keyboard activation and independent frame samples verify actual motion.
    await control.focus();
    await page.keyboard.press('Enter');
    assert.equal(await control.getAttribute('aria-busy'), 'true');
    await page.waitForTimeout(300);
    const rising1 = await pixels();
    await page.waitForTimeout(400);
    const rising2 = await pixels();
    assert.notEqual(rising1.hash, rising2.hash);
    await page.waitForTimeout(350);
    await shot('desktop-sun-rising');
    await idle();
    assert.equal(await control.getAttribute('aria-checked'), 'false');
    assert.equal(await bg(), 'rgb(255, 255, 255)');
    assert.equal(await choice('Emerald & White').getAttribute('aria-pressed'), 'true');
    const day = await pixels();
    assert.ok(day.gold > 600, 'day canvas must display the golden sun');
    assert.notEqual(day.hash, night.hash);
    await shot('desktop-day');

    // Rapid clicks cannot queue unwanted theme flips; other themes lock briefly.
    await control.evaluate(el => { for (let i = 0; i < 6; i++) el.click(); });
    assert.equal(await palettes.getByRole('button').first().getAttribute('aria-disabled'), 'true');
    await page.waitForTimeout(560);
    await shot('desktop-push');
    assert.notEqual((await pixels()).hash, day.hash);
    await page.waitForTimeout(450);
    await shot('desktop-drop');
    await idle();
    assert.equal(await control.getAttribute('aria-checked'), 'true');
    assert.equal(await canvas.getAttribute('data-phase'), 'night');
    await page.reload({ waitUntil: 'networkidle' });
    await control.waitFor();
    assert.equal(await control.getAttribute('aria-checked'), 'true');

    // Existing custom themes remain usable and round-trip through the switch.
    await choice('Navy & Gold').click();
    await page.waitForTimeout(750);
    assert.equal(await bg(), 'rgb(11, 31, 58)');
    await control.click();
    await idle();
    await control.click();
    await idle();
    assert.equal(await choice('Navy & Gold').getAttribute('aria-pressed'), 'true');

    // Reduced motion switches immediately; every palette and system mode work.
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
    await control.click();
    assert.equal(await control.getAttribute('aria-busy'), 'false');
    assert.equal(await control.getAttribute('aria-checked'), 'false');
    assert.equal(await page.locator('.elyra-theme-thumb').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    const themes = [
      ['Emerald Noir', true], ['Navy & Gold', true], ['Emerald & White', false],
      ['Ros\u00e9 Noir', true], ['Midnight Violet', true], ['Peach Sorbet', false], ['Warm', false],
    ];
    for (const [label, dark] of themes) {
      await choice(label).click();
      assert.equal(await control.getAttribute('aria-checked'), String(dark));
      assert.ok((await pixels()).painted > 1500);
    }
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.waitForTimeout(100);
    assert.equal(await control.getAttribute('aria-checked'), 'true');
    await control.click();
    assert.equal(await control.getAttribute('aria-checked'), 'false');
    await page.reload({ waitUntil: 'networkidle' });
    await control.waitFor();
    assert.equal(await control.getAttribute('aria-checked'), 'false', 'light preference must survive reload');

    // Turning reduced motion on during a transition completes the accepted click.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await control.click();
    await page.waitForTimeout(150);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await idle();
    assert.equal(await control.getAttribute('aria-checked'), 'true');
    await choice('Emerald Noir').click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    for (const [width, height] of [[390, 844], [320, 568], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(750);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const bounds = await canvas.boundingBox();
      assert.ok(bounds.width <= width && bounds.height > 100);
      await control.scrollIntoViewIfNeeded();
      await shot('viewport-' + width);
      await control.focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(1050);
      await shot('viewport-' + width + '-moving');
      await idle();
      assert.ok((await pixels()).painted > 1500);
    }

    // Leaving settings during an accepted click still saves its intended mode.
    const before = await control.getAttribute('aria-checked');
    await control.click();
    await page.waitForTimeout(100);
    await page.getByText('Sign in or create an account', { exact: true }).click();
    await page.waitForURL('**/auth');
    await page.goBack({ waitUntil: 'networkidle' });
    await control.waitFor();
    assert.notEqual(await control.getAttribute('aria-checked'), before);
    assert.deepEqual(errors, []);
    console.log('PASS: real palette changes, physics/canvas motion, keyboard, rapid taps, saved preferences, all 7 themes, system mode, reduced motion, interrupted navigation, desktop and mobile layouts.');
    console.log('Screenshots: ' + output);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
