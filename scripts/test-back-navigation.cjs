const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../.expo/ui-tools/node_modules/playwright-core');

const base = process.env.NAV_TEST_URL || 'http://localhost:8093';
const output = path.resolve('.expo/navigation-review');
fs.mkdirSync(output, { recursive: true });
const errors = [];
const fixtureStory = {
  id: 'navigation-story', title: 'Navigation Test Story', format: 'serial', kind: 'novel',
  description: 'A local navigation fixture.', blurb: 'Navigation fixture.', genres: ['Fantasy'],
  author: { id: 'test-author', name: 'Test Author', bio: '' }, owner_id: 'test-author',
  cover_color: '#0f8b6d', cover_emoji: '', is_complete: false, status: 'published',
  chapters: [1, 2, 3].map(n => ({ id: 'ch' + n, order: n, title: 'Part ' + n,
    reading_minutes: 1, is_premium: n === 3, page_count: 0 })),
};
const fixtureComic = { ...fixtureStory, id: 'navigation-comic', title: 'Navigation Test Comic', kind: 'comic',
  chapters: [{ ...fixtureStory.chapters[0], page_count: 2 }],
};

async function fixtureContext(browser, width, author = false) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 768, serviceWorkers: 'block' });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(15000);
  const writes = [];
  const user = { id: author ? 'test-author' : 'test-reader', email: 'navigation@example.com',
    aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { display_name: 'Navigation Test' } };
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, exp: expiresAt })).toString('base64url'), 'test-only'].join('.');
  await context.route('**/*.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/token')) return json({ user, access_token: jwt,
      refresh_token: 'test-only-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt });
    if (url.pathname.includes('/auth/')) return json(user);
    if (url.pathname.endsWith('/rpc/get_chapter_content')) return json(['The local fixture chapter text.']);
    if (url.pathname.endsWith('/profiles')) return json({ is_author: author });
    if (/\/(stories|chapters|authors)$/.test(url.pathname) && req.method() !== 'GET') {
      writes.push({ method: req.method(), path: url.pathname });
      return json([]);
    }
    if (url.pathname.endsWith('/stories')) return json([fixtureStory, fixtureComic]);
    if (url.pathname.endsWith('/chapters')) return json([{ order: 3 }]);
    return json([]);
  });
  await context.route('**/api/**', route => {
    if (route.request().url().includes('/comic-pages')) {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ pages: [base + '/icon-192.png', base + '/icon-192.png'] }) });
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await context.route('**/.netlify/functions/**', route => route.abort());
  context.on('page', page => {
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
    page.on('console', message => {
      if (message.text().includes("'GO_BACK' was not handled")) errors.push(message.text());
    });
  });
  return { context, writes };
}

const routePath = page => new URL(page.url()).pathname;
const back = page => page.getByRole('button', { name: 'Go back', exact: true });
const waitPath = (page, expected) => page.waitForURL(url => url.pathname === expected);
async function open(page, route) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
}
async function signIn(page) {
  await open(page, '/auth');
  await page.getByLabel('Email address').fill('navigation@example.com');
  await page.locator('#den-password').fill('fixture-only-password');
  await page.locator('.den-submit').click();
  await waitPath(page, '/explore');
}
async function openStoryFromExplore(page) {
  await open(page, '/explore');
  await page.getByText(fixtureStory.title, { exact: true }).first().click();
  await waitPath(page, '/story/navigation-story');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    for (const width of [1280, 390]) {
      const { context, writes } = await fixtureContext(browser, width);
      const cases = [
        ['/settings', '/library', 'Go back'],
        ['/story/navigation-story', '/explore', 'Go back'],
        ['/story/missing-story', '/explore', 'Go back'],
        ['/reader/navigation-story/ch1', '/story/navigation-story', 'Go back'],
        ['/reader/navigation-story/missing-chapter', '/story/navigation-story', 'Go back'],
        ['/paywall?storyId=navigation-story', '/story/navigation-story', 'Close'],
        ['/paywall', '/explore', 'Close'],
        ['/write', '/library', 'Go back'],
        ['/write?storyId=navigation-story', '/story/navigation-story', 'Go back'],
        ['/add-chapter', '/library', 'Go back'],
        ['/add-chapter?storyId=missing-story', '/story/missing-story', 'Go back'],
        ['/auth', '/explore', 'Back to stories'],
      ];
      for (const [source, destination, label] of cases) {
        console.log(`Checking ${width}px: ${source} -> ${destination}`);
        const page = await context.newPage();
        await open(page, source);
        const button = page.getByRole('button', { name: label, exact: true });
        try {
          await button.waitFor();
        } catch (error) {
          console.error('Failed page:', page.url(), await page.locator('body').innerText());
          await page.screenshot({ path: path.join(output, 'failed-route.png') });
          throw error;
        }
        if (source === '/settings') {
          const box = await button.boundingBox();
          assert.ok(box.width >= 44 && box.height >= 44, 'back must be easy to tap');
          await page.screenshot({ path: path.join(output, `settings-${width}.png`) });
          await button.focus();
          await page.keyboard.press('Enter');
        } else if (width < 768) await button.tap();
        else await button.click();
        console.log('Back returned to ' + routePath(page));
        await waitPath(page, destination);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.close();
      }
      assert.equal(writes.length, 0, 'back/close must never save or publish stories');
      console.log(`PASS ${width}px: 12 direct-entry back/close routes.`);

      const page = await context.newPage();
      await openStoryFromExplore(page);
      await page.getByText(/^(Start|Continue) reading$/).click();
      await waitPath(page, '/auth');
      await page.getByRole('button', { name: 'Back to stories', exact: true }).click();
      await waitPath(page, '/story/navigation-story');
      await back(page).click();
      await waitPath(page, '/explore');

      // Refreshing loses the route stack; the fallback must still work.
      await openStoryFromExplore(page);
      await page.reload({ waitUntil: 'networkidle' });
      await back(page).click();
      await waitPath(page, '/explore');
      await page.goBack({ waitUntil: 'networkidle' });
      await page.goForward({ waitUntil: 'networkidle' });
      await waitPath(page, '/explore');

      await open(page, '/reset-password');
      await page.getByText('Back to sign in', { exact: true }).click();
      await waitPath(page, '/auth');
      await page.getByRole('button', { name: 'Back to stories', exact: true }).click();
      await waitPath(page, '/explore');
      await context.close();
      console.log(`PASS ${width}px: normal history, refreshed pages, reset-link exit, browser Back/Forward.`);
    }

    const { context, writes } = await fixtureContext(browser, 1280, true);
    const page = await context.newPage();
    await signIn(page);
    await openStoryFromExplore(page);
    await page.getByText('Edit story', { exact: true }).click();
    await waitPath(page, '/write');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await waitPath(page, '/story/navigation-story');
    await back(page).click();
    await waitPath(page, '/explore');
    assert.equal(writes.length, 0);

    // Saving should pop to the existing story, not create a duplicate story page.
    await openStoryFromExplore(page);
    await page.getByText('Edit story', { exact: true }).click();
    await page.getByText('Save changes', { exact: true }).click();
    await waitPath(page, '/story/navigation-story');
    await back(page).click();
    await waitPath(page, '/explore');
    assert.equal(writes.length, 1);

    // Chapter Back is independent of Save, including the discard/cancel paths.
    await openStoryFromExplore(page);
    await page.getByText('Add chapter', { exact: true }).click();
    await waitPath(page, '/add-chapter');
    await back(page).click();
    await waitPath(page, '/story/navigation-story');
    assert.equal(writes.length, 1);
    await page.getByText('Add chapter', { exact: true }).click();
    const body = page.getByPlaceholder(/^Start writing/);
    await body.fill('Unsaved fixture chapter.');
    page.once('dialog', dialog => dialog.dismiss());
    await back(page).click();
    assert.equal(routePath(page), '/add-chapter');
    assert.equal(await body.inputValue(), 'Unsaved fixture chapter.');
    page.once('dialog', dialog => dialog.accept());
    await back(page).click();
    await waitPath(page, '/story/navigation-story');
    assert.equal(writes.length, 1, 'discard must not invoke Save');

    await page.getByText('Add chapter', { exact: true }).click();
    await page.getByPlaceholder(/^Start writing/).fill('Saved fixture chapter.');
    await page.getByText('Save chapter', { exact: true }).click();
    await waitPath(page, '/story/navigation-story');
    await back(page).click();
    await waitPath(page, '/explore');
    assert.equal(writes.length, 2);

    await open(page, '/write');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await waitPath(page, '/library');
    await open(page, '/add-chapter?storyId=navigation-story');
    await back(page).click();
    await waitPath(page, '/story/navigation-story');

    await openStoryFromExplore(page);
    await page.getByText(/^(Start|Continue) reading$/).click();
    await waitPath(page, '/reader/navigation-story/ch1');
    const previous = page.getByRole('button', { name: 'Previous', exact: true });
    const nextChapter = page.getByRole('button', { name: 'Next chapter', exact: true });
    assert.equal(await previous.isDisabled(), true);
    const stillLeg = previous.getByTestId('walking-leg');
    const disabledPose = await stillLeg.evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(220);
    assert.equal(await stillLeg.evaluate(el => getComputedStyle(el).transform), disabledPose);
    assert.equal(await nextChapter.getByTestId('walking-arrow-forward').count(), 1);
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await nextChapter.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `walking-reader-${width}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const fits = await nextChapter.evaluate(el => {
        const outer = el.getBoundingClientRect();
        return [...el.children].every(child => {
          const box = child.getBoundingClientRect();
          return box.left >= outer.left && box.right <= outer.right && box.top >= outer.top && box.bottom <= outer.bottom;
        });
      });
      assert.equal(fits, true, 'the walking icon and chapter label must fit on small phones');
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Next chapter', exact: true }).click();
    await waitPath(page, '/reader/navigation-story/ch2');
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await waitPath(page, '/reader/navigation-story/ch1');
    await back(page).click();
    await waitPath(page, '/story/navigation-story');
    await back(page).click();
    await waitPath(page, '/explore');

    // Image readers can keep prefetch requests active; wait for their controls instead.
    await page.goto(base + '/reader/navigation-comic/ch1', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await page.getByText('2 / 2', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Next page', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    await page.getByText('1 / 2', { exact: true }).waitFor();
    await back(page).click();
    await waitPath(page, '/story/navigation-comic');
    await context.close();
    console.log('PASS: author Cancel, chapter discard, save without duplicate history, previous chapter/page, reader exits.');

    const slow = await fixtureContext(browser, 390, true);
    const slowPage = await slow.context.newPage();
    await signIn(slowPage);
    // A failed comic load must disable Save, but must not disable Back.
    await slow.context.route('**/api/comic-pages', route => route.fulfill({ status: 500, body: '{}' }));
    await slow.context.route('**/rest/v1/rpc/get_chapter_content', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await open(slowPage, '/story/navigation-comic');
    await slowPage.getByText('Edit story', { exact: true }).waitFor();
    const chapterRow = slowPage.getByText('Part 1', { exact: true }).locator('../..');
    await chapterRow.locator('[tabindex]').last().click();
    await waitPath(slowPage, '/add-chapter');
    await slowPage.getByText(/Couldn.t load this chapter/).waitFor();
    await slowPage.getByText('Loading\u2026', { exact: true }).waitFor();
    await slowPage.screenshot({ path: path.join(output, 'failed-chapter-load-mobile.png') });
    assert.equal(await back(slowPage).isEnabled(), true);
    await back(slowPage).click();
    await waitPath(slowPage, '/story/navigation-comic');
    assert.equal(slow.writes.length, 0);

    // The page-level loading spinner also retains a working exit.
    let releaseStories;
    const pending = new Promise(resolve => { releaseStories = resolve; });
    await slow.context.route('**/rest/v1/stories?**', async route => {
      await pending;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([fixtureStory]) }).catch(() => {});
    });
    await slowPage.goto(base + '/story/navigation-story', { waitUntil: 'domcontentloaded' });
    await back(slowPage).click();
    await waitPath(slowPage, '/explore');
    releaseStories();
    await slow.context.close();
    console.log('PASS: loading/error exits remain available; no unintended chapter writes.');
    assert.deepEqual(errors, []);
    console.log('PASS: no unhandled back actions or browser errors. Screenshots: ' + output);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
