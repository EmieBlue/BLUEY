const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../.expo/ui-tools/node_modules/playwright-core');

const base = process.env.STORY_TEST_URL || 'http://localhost:8094';
const output = path.resolve('.expo/system-review');
fs.mkdirSync(output, { recursive: true });
const story = {
  id: 'loading-story', title: 'Loading Test Story', status: 'published', kind: 'novel', format: 'serial',
  description: 'Existing description must survive a refresh.', blurb: 'A test fixture.', genres: ['Fantasy'],
  owner_id: 'test-author', author: { id: 'test-author', name: 'Test Author', bio: '' }, cover_color: '#0f8b6d',
  chapters: [1, 2, 3].map(n => ({ id: 'ch' + n, order: n, title: 'Part ' + n, is_premium: n === 3, reading_minutes: 1, page_count: 0 })),
};
const comic = { ...story, id: 'loading-comic', title: 'Loading Test Comic', kind: 'comic',
  chapters: [{ ...story.chapters[0], page_count: 1 }] };
const errors = [];

async function fixture(browser, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  context.setDefaultTimeout(15000);
  const config = { catalogue: [story, comic], catalogueStatus: 200, catalogueDelay: 0,
    rpcStatus: 200, rpcBody: ['Readable fixture chapter.'], rpcDelay: 0, comicStatus: 200,
    purchasesStatus: 200, purchases: [], holdFirst: false };
  let catalogueRequests = 0;
  let releaseFirst;
  const pendingFirst = new Promise(resolve => { releaseFirst = resolve; });
  const writes = [];
  const narration = [];
  await context.route('**/*.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
    if (url.pathname.endsWith('/auth/v1/token')) {
      const user = { id: 'test-author', email: 'loading@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
        Buffer.from(JSON.stringify({ sub: user.id, exp })).toString('base64url'), 'test-only'].join('.');
      return json({ user, access_token: jwt, refresh_token: 'test-only', token_type: 'bearer', expires_in: 3600, expires_at: exp });
    }
    if (url.pathname.includes('/auth/')) return json({});
    if (url.pathname.endsWith('/rpc/get_chapter_content')) {
      const body = config.rpcBody;
      const status = config.rpcStatus;
      await new Promise(resolve => setTimeout(resolve, config.rpcDelay));
      return json(status === 200 ? body : { message: 'Simulated content failure' }, status);
    }
    if (url.pathname.endsWith('/stories') && req.method() === 'GET') {
      catalogueRequests++;
      if (config.holdFirst && catalogueRequests === 1) { await pendingFirst; return json([]); }
      await new Promise(resolve => setTimeout(resolve, config.catalogueDelay));
      return json(config.catalogueStatus === 200 ? config.catalogue : { message: 'Simulated catalogue failure' }, config.catalogueStatus);
    }
    if (url.pathname.endsWith('/profiles')) return json({ is_author: true });
    if (url.pathname.endsWith('/purchases')) return json(config.purchasesStatus === 200 ? config.purchases : { message: 'Simulated purchase lookup failure' }, config.purchasesStatus);
    if (req.method() !== 'GET') writes.push({ path: url.pathname, body: req.postDataJSON() });
    return json([]);
  });
  await context.route('**/api/**', route => {
    if (route.request().url().includes('/narrate')) {
      const request = route.request().postDataJSON();
      if (request.cacheOnly) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ cached: false }) });
      narration.push(request);
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture narration unavailable' }) });
    }
    return route.fulfill({ status: config.comicStatus,
    contentType: 'application/json', body: JSON.stringify(config.comicStatus === 200 ? { pages: [base + '/icon-192.png'] } : { error: 'Simulated comic failure' }) });
  });
  await context.route('**/.netlify/functions/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, config, writes, releaseFirst, narration };
}

const open = (page, url) => page.goto(base + url, { waitUntil: 'domcontentloaded' });
async function signIn(page) {
  await open(page, '/auth');
  await page.getByLabel('Email address').fill('loading@example.com');
  await page.locator('#den-password').fill('fixture-only');
  await page.locator('.den-submit').click();
  await page.waitForURL(url => url.pathname === '/explore');
}
const retry = page => page.getByRole('button', { name: 'Try again', exact: true }).click();

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [1280, 390]) {
      const { context, page, config, writes } = await fixture(browser, width);
      config.catalogueStatus = 400;
      await open(page, '/story/loading-story');
      await page.getByText('Could not load stories', { exact: true }).waitFor();
      assert.equal(await page.getByText('Story not found.', { exact: true }).count(), 0);
      await page.screenshot({ path: path.join(output, `catalogue-error-${width}.png`) });
      config.catalogueStatus = 200;
      await retry(page);
      await page.getByText(story.title, { exact: true }).first().waitFor();
      assert.equal(new URL(page.url()).pathname, '/story/loading-story');
      config.catalogue = [];
      await open(page, '/explore');
      await page.getByPlaceholder('Search titles, authors, genres').waitFor();
      assert.equal(await page.getByText(story.title, { exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Try again' }).count(), 0);
      config.catalogue = [story, comic];
      await signIn(page);
      config.rpcStatus = 400;
      await open(page, '/reader/loading-story/ch1');
      await page.getByText('Could not load this chapter', { exact: true }).waitFor();
      assert.equal(writes.filter(w => w.path.endsWith('/reading_progress')).length, 0, 'failed reading must not advance progress');
      assert.equal(await page.getByText(/isn.t available to read yet/).count(), 0);
      await page.screenshot({ path: path.join(output, `chapter-error-${width}.png`) });
      config.rpcStatus = 200;
      await retry(page);
      await page.getByText('Readable fixture chapter.', { exact: true }).waitFor();
      await page.screenshot({ path: path.join(output, `chapter-recovered-${width}.png`) });
      await page.waitForTimeout(150);
      assert.ok(writes.some(w => w.path.endsWith('/reading_progress')), 'progress resumes after successful reading');
      config.rpcBody = null;
      await open(page, '/reader/loading-story/ch2');
      await page.getByText('Your access to this chapter may have changed. Try again to refresh the story.').waitFor();
      config.rpcBody = [];
      await retry(page);
      await page.getByText(/isn.t available to read yet/).waitFor();
      config.rpcBody = ['Readable fixture chapter.'];
      config.comicStatus = 500;
      await open(page, '/reader/loading-comic/ch1');
      await page.getByText('Could not load this chapter', { exact: true }).waitFor();
      config.comicStatus = 200;
      await retry(page);
      await page.getByText('1 / 1', { exact: true }).waitFor();
      config.purchasesStatus = 400;
      await open(page, '/library');
      await page.getByText('Could not load your account', { exact: true }).waitFor();
      config.purchasesStatus = 200;
      await retry(page);
      await page.getByText('Your stories', { exact: true }).waitFor();
      config.catalogueDelay = 500;
      await open(page, '/write?storyId=loading-story');
      await page.getByPlaceholder('Untitled Story').waitFor();
      assert.equal(await page.getByPlaceholder('Untitled Story').inputValue(), story.title);
      assert.equal(await page.getByPlaceholder("What's your story about?").inputValue(), story.description);
      config.rpcStatus = 400;
      await open(page, '/add-chapter?storyId=loading-story&chapterId=ch1');
      await page.getByText('Could not load this chapter', { exact: true }).waitFor();
      assert.equal(await page.getByText('Save changes', { exact: true }).count(), 0, 'cannot save an unloaded chapter');
      config.rpcStatus = 200;
      await retry(page);
      await page.getByPlaceholder(/^Start writing/).waitFor();
      assert.equal(await page.getByPlaceholder(/^Start writing/).inputValue(), 'Readable fixture chapter.');
      assert.equal(await page.getByPlaceholder(/^e.g. Chapter 1/).inputValue(), 'Part 1');
      assert.equal(writes.filter(w => /\/(chapters|stories)$/.test(w.path)).length, 0, 'loading and recovery must not change author content');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await context.close();
      console.log(`PASS ${width}px: catalogue failure/retry, empty catalogue, chapter failure/retry/access/empty, comics, account recovery, safe editor loading.`);
    }

    const race = await fixture(browser);
    race.config.holdFirst = true;
    await signIn(race.page);
    await race.page.getByText(story.title, { exact: true }).first().waitFor();
    race.releaseFirst();
    await race.page.waitForTimeout(300);
    assert.ok(await race.page.getByText(story.title, { exact: true }).count(), 'a stale anonymous request must not replace the signed-in catalogue');
    race.config.rpcDelay = 1600;
    race.config.rpcBody = ['Old chapter response.'];
    await open(race.page, '/reader/loading-story/ch1');
    await race.page.getByRole('button', { name: 'Next chapter', exact: true }).waitFor();
    await race.page.waitForTimeout(200);
    race.config.rpcDelay = 0;
    race.config.rpcBody = ['New chapter response.'];
    await race.page.getByRole('button', { name: 'Next chapter', exact: true }).click();
    await race.page.getByText('New chapter response.', { exact: true }).waitFor();
    await race.page.waitForTimeout(1800);
    assert.equal(await race.page.getByText('Old chapter response.', { exact: true }).count(), 0);
    race.config.rpcDelay = 600;
    await open(race.page, '/reader/loading-story/ch1?autoplay=1');
    await race.page.getByText('Fixture narration unavailable', { exact: true }).waitFor();
    assert.equal(race.narration.length, 1, 'auto narration must wait until chapter text has loaded');
    await race.context.close();
    const stalled = await fixture(browser);
    stalled.config.holdFirst = true;
    await open(stalled.page, '/story/loading-story');
    await stalled.page.getByText('Could not load stories', { exact: true }).waitFor({ timeout: 25000 });
    stalled.releaseFirst();
    await retry(stalled.page);
    await stalled.page.getByText(story.title, { exact: true }).first().waitFor();
    await stalled.context.close();
    assert.deepEqual(errors, []);
    console.log('PASS: sign-in request race, stale chapter cancellation, no browser errors. All writes mocked.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
