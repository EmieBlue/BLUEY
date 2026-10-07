const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('../.expo/ui-tools/node_modules/playwright-core');
const base = process.env.NARRATION_TEST_URL || 'http://localhost:8094';
const output = '.expo/narration-review';
fs.mkdirSync(output, { recursive: true });

// A short test tone exercises real browser decoding and playback, not just UI.
function wave() {
  const samples = 22050 * 8;
  const out = Buffer.alloc(44 + samples * 2);
  out.write('RIFF', 0); out.writeUInt32LE(out.length - 8, 4); out.write('WAVEfmt ', 8);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(22050, 24); out.writeUInt32LE(44100, 28);
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) out.writeInt16LE(Math.round(200 * Math.sin(i / 22050 * 440 * 2 * Math.PI)), 44 + i * 2);
  return out;
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      const requests = [], errors = [];
      const state = { text: 'Narration test paragraph.', missing: false, badAudio: false };
      await context.addInitScript(() => {
        const OriginalAudio = window.Audio;
        window.__testAudio = [];
        window.Audio = function (...args) { const audio = new OriginalAudio(...args); window.__testAudio.push(audio); return audio; };
        window.Audio.prototype = OriginalAudio.prototype;
      });
      await context.route('**/*.supabase.co/**', route => {
        const url = route.request().url();
        const respond = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
        if (url.includes('/auth/v1/token')) {
          const user = { id: 'voice-reader', email: 'voice@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
          const exp = Math.floor(Date.now() / 1000) + 3600;
          const access_token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp })).toString('base64url'), 'fixture'].join('.');
          return respond({ user, access_token, refresh_token: 'fixture', token_type: 'bearer', expires_in: 3600, expires_at: exp });
        }
        if (url.includes('/auth/')) return respond({});
        if (url.includes('/rest/v1/stories')) return respond([{ id: 'voice-story', title: 'Voice Test Story', status: 'published', kind: 'novel', genres: ['Fantasy'],
          author: { id: 'author', name: 'Test Author' }, chapters: [{ id: 'voice-chapter', title: 'Test Chapter', order: 1, reading_minutes: 1, is_premium: false }] }]);
        if (url.includes('/rpc/get_chapter_content')) return respond([state.text]);
        if (url.includes('/profiles')) return respond({ is_author: false });
        return respond([]);
      });
      await context.route('**/api/**', async route => {
        if (!route.request().url().includes('/narrate')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
        if (route.request().method() === 'GET') return state.badAudio
          ? route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
          : route.fulfill({ status: 200, contentType: 'audio/wav', body: wave() });
        const req = route.request().postDataJSON(); requests.push(req);
        await new Promise(resolve => setTimeout(resolve, 300));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(req.cacheOnly && state.missing ? { cached: false } : { url: base + '/api/narrate?f=fixture.mp3&v=2', cached: true }) });
      });
      await context.route('**/.netlify/functions/**', route => route.abort());
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/auth');
      await page.getByLabel('Email address').fill('voice@example.com');
      await page.locator('#den-password').fill('fixture');
      await page.locator('.den-submit').click();
      await page.waitForURL(u => u.pathname === '/explore');
      const open = () => page.goto(base + '/reader/voice-story/voice-chapter');
      const listen = () => page.getByRole('button', { name: 'Listen to chapter' }).click();
      const playing = () => page.waitForFunction(() => window.__testAudio.some(a => !a.paused && a.currentTime > 0.1 && a.readyState >= 2));
      const pause = () => page.getByRole('button', { name: 'Pause narration' }).click();
      await open();
      await page.getByText(state.text, { exact: true }).waitFor();
      await page.waitForTimeout(600);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].cacheOnly, true);
      let start = Date.now(); await listen(); await playing();
      const firstMs = Date.now() - start;
      assert.equal(requests.length, 1, 'Listen reuses the early cache lookup');
      await pause(); await listen(); await playing();
      assert.equal(requests.length, 1, 'Pause/resume does not prepare again');
      await page.screenshot({ path: `${output}/playing-${width}.png` });
      await page.reload();
      await page.getByText(state.text, { exact: true }).waitFor();
      start = Date.now(); await listen(); await playing();
      const repeatMs = Date.now() - start;
      assert.equal(requests.length, 1, 'Reload reuses the saved URL without another narration request');
      await pause();
      state.text = 'Edited narration test paragraph.'; state.missing = true;
      await open(); await page.getByText(state.text, { exact: true }).waitFor();
      await page.waitForTimeout(600);
      assert.equal(requests.length, 2);
      assert.equal(requests[1].cacheOnly, true);
      await listen(); await playing();
      assert.equal(requests.filter(r => !r.cacheOnly).length, 1, 'only a deliberate click generates missing audio');
      await pause();
      state.badAudio = true;
      await page.reload(); await page.getByText(state.text, { exact: true }).waitFor();
      await listen();
      await page.getByText('Could not load the recording. Tap Listen to try again.').waitFor();
      await page.waitForTimeout(100);
      state.badAudio = false;
      await listen(); await playing();
      assert.equal(requests.filter(r => !r.cacheOnly).length, 2, 'failed file can be retried');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      // Expo's web player also rejects play() when the intentionally broken
      // media URL returns 404. The reader must recover; other errors fail.
      assert.deepEqual(errors, ['Failed to load because no supported source was found.']);
      console.log(`PASS ${width}px: actual audio playback, repeat/reload cache, edited text, no generation on open, failed-file recovery. Fixture start ${firstMs}ms; reload ${repeatMs}ms.`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
