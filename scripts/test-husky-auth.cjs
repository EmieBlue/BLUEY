const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../.expo/ui-tools/node_modules/playwright-core');
const output = path.resolve('.expo/auth-review');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Never send test credentials or password-reset mail to the live service.
    await context.route('**/*.supabase.co/**', route => {
      const url = route.request().url();
      if (url.includes('/auth/v1/token')) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) });
      if (url.includes('/auth/v1/signup')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'test-user', email: 'reader@example.com' }, session: null }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: url.includes('/auth/') ? '{}' : '[]' });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:8093/auth', { waitUntil: 'networkidle' });
    await page.getByLabel('Email address').waitFor();
    await page.locator('.den-face').evaluate(image => image.decode());
    assert.equal(await page.locator('.elyra-auth').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(4, 20, 15)');
    assert.equal(await page.locator('.den-submit').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(236, 208, 151)');
    await page.screenshot({ path: path.join(output, 'desktop-idle.png'), fullPage: true });
    const password = page.locator('#den-password');
    const mascot = page.locator('.den-husky');
    await page.getByLabel('Email address').fill('reader@example.com');
    await password.pressSequentially('demo-password', { delay: 100 });
    assert.equal(await mascot.getAttribute('data-pose'), 'covered');
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(output, 'desktop-covered.png'), fullPage: true });
    await page.waitForTimeout(1300);
    assert.equal(await mascot.getAttribute('data-pose'), 'peeking');
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await page.waitForTimeout(1400);
    assert.equal(await mascot.getAttribute('data-pose'), 'covered');
    assert.equal(await password.getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    assert.equal(await password.getAttribute('type'), 'password');
    await page.locator('.den-submit').click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /invalid login/i);
    assert.equal(await page.locator('.den-submit').isEnabled(), true);
    await page.getByRole('button', { name: 'Forgot password?', exact: true }).click();
    assert.equal(await page.locator('#den-password').count(), 0);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await page.getByRole('status').waitFor();
    assert.match(await page.getByRole('status').innerText(), /reset your password/i);
    await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByLabel('Display name').fill('Reader');
    await password.fill('short');
    await page.locator('.den-submit').click();
    assert.equal(await password.evaluate(input => input.validity.tooShort), true);
    await password.fill('');
    await password.pressSequentially('new-password');
    await page.locator('.den-submit').click();
    await page.getByRole('status').waitFor();
    assert.match(await page.getByRole('status').innerText(), /confirm your account/i);
    assert.equal(await password.inputValue(), '');
    for (const [width, height] of [[390, 844], [320, 568], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(output, `viewport-${width}.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('.den-bottom').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.den-bottom').isVisible(), true);
      await page.screenshot({ path: path.join(output, `viewport-${width}-bottom.png`), fullPage: true });
      await page.locator('.elyra-auth').evaluate(el => { el.scrollTop = 0; });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await password.fill('typing-example');
    await page.locator('.elyra-auth').evaluate(el => { el.scrollTop = 0; });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(output, 'mobile-covered.png'), fullPage: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.den-paw-left').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.equal(await page.getByRole('button', { name: 'Show password' }).getAttribute('title'), 'Show password');
    assert.deepEqual(errors, []);
    console.log('PASS: masking, typing/idle/reveal poses, sign-in errors, reset, signup confirmation, responsive layouts, reduced motion; all auth requests mocked.');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
