const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

const origin = 'https://elyra.test';
const url = origin + '/api/narrate?f=chapter-coral-123.mp3&v=2';
const params = { chapterId: 'chapter', text: 'An original story.', genre: 'Romance' };
const disk = new Map();
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function moduleFrom(file, fetch, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, console, fetch, Response, Request, Headers, URL, TextEncoder, AbortController,
    crypto: webcrypto, setTimeout, clearTimeout, window: { location: { origin } },
    require: name => {
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      if (name === '@/config/app') return { SITE_URL: origin };
      if (name === '@react-native-async-storage/async-storage') return {
        getItem: async k => disk.get(k) ?? null,
        setItem: async (k, v) => { disk.set(k, v); },
        removeItem: async k => { disk.delete(k); },
      };
      throw new Error('Unexpected import: ' + name);
    }, ...extra,
  }, { filename: file });
  return exports;
}

async function clientTests() {
  let calls = [];
  const fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    await new Promise(resolve => setTimeout(resolve, 10));
    return json({ url, cached: true });
  };
  let client = moduleFrom('src/lib/tts.ts', fetch);
  const [warm, listen, doubleClick] = await Promise.all([
    client.getChapterAudioUrl(params, { cacheOnly: true }),
    client.getChapterAudioUrl(params), client.getChapterAudioUrl(params),
  ]);
  assert.equal(warm.url, url);
  assert.equal(listen.url, url);
  assert.equal(doubleClick.url, url);
  assert.equal(calls.length, 1, 'warming and two clicks share one cache lookup');
  assert.equal(calls[0].cacheOnly, true);
  await client.getChapterAudioUrl(params);
  assert.equal(calls.length, 1, 'repeat listen uses memory');
  client = moduleFrom('src/lib/tts.ts', fetch);
  await client.getChapterAudioUrl(params);
  assert.equal(calls.length, 1, 'reload uses persisted audio URL');
  assert.ok([...disk.values()].every(value => !value.includes(params.text)), 'never persist chapter text');
  await client.getChapterAudioUrl({ ...params, text: 'An edited story.' });
  await client.getChapterAudioUrl({ ...params, genre: 'Mystery' });
  assert.equal(calls.length, 3, 'text and voice changes invalidate the recording');
  await client.forgetChapterAudio(params);
  client = moduleFrom('src/lib/tts.ts', fetch);
  await client.getChapterAudioUrl(params);
  assert.equal(calls.length, 4, 'failed audio is evicted from memory and disk');

  disk.clear(); calls = [];
  client = moduleFrom('src/lib/tts.ts', async (_url, options) => {
    const request = JSON.parse(options.body); calls.push(request);
    return json(request.cacheOnly ? { cached: false } : { url, cached: false });
  });
  await client.getChapterAudioUrl(params, { cacheOnly: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cacheOnly, true, 'reading alone must not generate audio');
  await client.getChapterAudioUrl(params);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].cacheOnly, false);

  disk.clear(); calls = [];
  client = moduleFrom('src/lib/tts.ts', async () => { calls.push(1); return json({ error: 'Busy' }, 503); });
  assert.equal((await client.getChapterAudioUrl(params)).error, 'Busy');
  assert.equal(calls.length, 1, 'do not silently repeat paid generation four times');
  await client.getChapterAudioUrl(params);
  assert.equal(calls.length, 2, 'a user can retry after failure');

  client = moduleFrom('src/lib/tts.ts', (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
  }), { setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 20)) });
  assert.match((await client.getChapterAudioUrl(params)).error, /too long/);
  assert.equal((await client.getChapterAudioUrl(params, { cacheOnly: true })).error, undefined);

  client = moduleFrom('src/lib/tts.ts', async () => json({ url: 'https://unexpected.test/recording.mp3' }));
  assert.ok((await client.getChapterAudioUrl(params)).error, 'only accept this site\'s audio URLs');
  console.log('PASS client: warm/repeat/reload cache, changed text/voice, eviction, deduplication, cache-only, timeout, retry, URL validation.');
}

async function serverTests() {
  const env = { SUPABASE_URL: 'https://storage.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-key' };
  const request = body => new Request(origin + '/api/narrate', { method: 'POST', body: JSON.stringify(body) });
  let calls = [];
  let server = moduleFrom('functions/api/narrate.js', async (url, options) => {
    calls.push({ url, options }); return new Response(null, { status: 200 });
  });
  let res = await server.onRequestPost({ request: request(params), env });
  assert.equal(res.status, 200, 'saved narration does not require the TTS provider');
  assert.equal((await res.json()).cached, true);
  assert.equal(calls.length, 1);

  // The cold path must still generate and save the recording once, then reuse
  // the exact same file. All upstream services remain mocked.
  let generated = 0, uploaded = false;
  server = moduleFrom('functions/api/narrate.js', async (target, options) => {
    if (options.method === 'HEAD') return new Response(null, { status: uploaded ? 200 : 404 });
    if (target === 'https://api.openai.com/v1/audio/speech') {
      generated++;
      assert.equal(JSON.parse(options.body).voice, 'coral');
      return new Response(new Uint8Array(3000));
    }
    assert.match(target, /\/storage\/v1\/object\/tts\//);
    assert.equal(options.body.byteLength, 3000);
    uploaded = true;
    return new Response(null, { status: 200 });
  });
  const configured = { ...env, OPENAI_API_KEY: 'fixture' };
  const cold = await (await server.onRequestPost({ request: request(params), env: configured })).json();
  const repeat = await (await server.onRequestPost({ request: request(params), env: configured })).json();
  assert.equal(cold.cached, false);
  assert.equal(repeat.cached, true);
  assert.equal(cold.url, repeat.url);
  assert.equal(generated, 1);

  for (const status of [400, 404, 500, 403]) {
    calls = [];
    server = moduleFrom('functions/api/narrate.js', async (url, options) => {
      calls.push({ url, options }); return new Response(null, { status });
    });
    res = await server.onRequestPost({ request: request({ ...params, cacheOnly: true }), env });
    assert.equal(res.status, status === 400 || status === 404 ? 200 : 503);
    assert.equal(calls.length, 1, 'cache lookup must never generate');
    if (status >= 500 || status === 403) {
      res = await server.onRequestPost({ request: request(params), env: { ...env, OPENAI_API_KEY: 'fixture' } });
      assert.equal(res.status, 503, 'storage failure must not regenerate audio');
      assert.equal(calls.length, 2);
    }
  }
  server = moduleFrom('functions/api/narrate.js', async () => { throw new Error('offline'); });
  assert.equal((await server.onRequestPost({ request: request(params), env })).status, 503);
  assert.equal((await server.onRequestPost({ request: request(null), env })).status, 400);
  assert.equal((await server.onRequestPost({ request: request({ ...params, chapterId: '../escape' }), env })).status, 400);

  server = moduleFrom('functions/api/narrate.js', async (_url, options) => {
    assert.equal(options.headers.Range, 'bytes=0-3');
    return new Response(new Uint8Array([1, 2, 3, 4]), { status: 206, headers: { 'Content-Range': 'bytes 0-3/100', 'Content-Length': '4' } });
  });
  res = await server.onRequestGet({ request: new Request(url, { headers: { Range: 'bytes=0-3' } }), env });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('Content-Range'), 'bytes 0-3/100');
  assert.equal((await res.arrayBuffer()).byteLength, 4);
  for (const status of [400, 404, 500]) {
    server = moduleFrom('functions/api/narrate.js', async () => new Response('error', { status }));
    res = await server.onRequestGet({ request: new Request(url), env });
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.match(res.headers.get('Content-Type'), /json/);
  }
  const swHandlers = {};
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
    URL, self: { location: { origin }, addEventListener: (name, handler) => { swHandlers[name] = handler; } },
  });
  swHandlers.fetch({ request: new Request(url), respondWith: () => assert.fail('service worker must leave audio to browser HTTP/range caching') });
  console.log('PASS server: saved-file lookup without generation, storage failure handling, audio ranges, non-cacheable errors, service worker exclusion.');
}

(async () => { await clientTests(); await serverTests(); })().catch(error => { console.error(error); process.exitCode = 1; });
