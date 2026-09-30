const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/components/landing/video-intro-state.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(filename, module);
loaded._compile(compiled, filename);
const { initialIntroState, introReducer, shouldAutoplayIntro } = loaded.exports;
const visitor = { reducedMotion: false, saveData: false, seen: false, override: null };

test('first visit plays; returning visit opens the landing; replay override is supported', () => {
  assert.equal(shouldAutoplayIntro(visitor), true);
  assert.equal(shouldAutoplayIntro({ ...visitor, seen: true }), false);
  assert.equal(shouldAutoplayIntro({ ...visitor, seen: true, override: 'force' }), true);
  assert.equal(shouldAutoplayIntro({ ...visitor, override: 'calm' }), false);
});

test('force never overrides reduced motion or data saving', () => {
  assert.equal(shouldAutoplayIntro({ ...visitor, reducedMotion: true, override: 'force' }), false);
  assert.equal(shouldAutoplayIntro({ ...visitor, saveData: true, override: 'force' }), false);
  assert.equal(initialIntroState(false).phase, 'complete');
});

test('skip during load remains complete despite late playback events', () => {
  let state = introReducer(initialIntroState(true), { type: 'complete' });
  for (const type of ['playing', 'paused', 'loading', 'blocked']) {
    state = introReducer(state, { type });
    assert.equal(state.phase, 'complete');
  }
});

test('ended or failed playback releases the user to the landing', () => {
  for (const phase of ['loading', 'playing', 'paused', 'blocked']) {
    const state = introReducer({ ...initialIntroState(true), phase }, { type: 'complete' });
    assert.equal(state.phase, 'complete');
  }
});

test('blocked autoplay can resume and replay starts from zero with sound muted', () => {
  let state = introReducer(initialIntroState(true), { type: 'blocked' });
  state = introReducer(state, { type: 'loading' });
  state = introReducer(state, { type: 'playing' });
  assert.equal(state.phase, 'playing');
  state = introReducer(state, { type: 'progress', elapsed: 20, duration: 42 });
  state = introReducer(state, { type: 'mute' });
  state = introReducer(state, { type: 'complete' });
  state = introReducer(state, { type: 'replay' });
  assert.deepEqual(state, { phase: 'loading', elapsed: 0, duration: 0, muted: true });
});

test('unknown and out-of-range media durations cannot corrupt the progress control', () => {
  const state = initialIntroState(true);
  assert.equal(introReducer(state, { type: 'progress', elapsed: NaN, duration: Infinity }).duration, 0);
  assert.equal(introReducer(state, { type: 'progress', elapsed: 80, duration: 42 }).elapsed, 42);
  assert.equal(introReducer(state, { type: 'progress', elapsed: -5, duration: 42 }).elapsed, 0);
});

test('service worker leaves video and byte-range playback outside its offline cache', () => {
  const listeners = {};
  const vm = require('node:vm');
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8'), {
    self: { location: { origin: 'https://blueyclub.com' }, addEventListener: (name, fn) => { listeners[name] = fn; } },
    URL,
  });
  for (const request of [
    new Request('https://blueyclub.com/landing/blueyclub-intro-web.mp4'),
    new Request('https://blueyclub.com/landing/elyra-intro-v2.mp4'),
    new Request('https://blueyclub.com/media', { headers: { Range: 'bytes=0-1023' } }),
  ]) {
    let intercepted = false;
    listeners.fetch({ request, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
});

test('replacement media exists and uses a progressive, deployment-sized MP4', () => {
  const configFile = path.resolve(__dirname, '../src/components/landing/video-intro-config.ts');
  const config = new Module(configFile, module);
  config._compile(ts.transpileModule(fs.readFileSync(configFile, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, configFile);
  const { INTRO_MEDIA, INTRO_SEEN_KEY } = config.exports;
  assert.equal(INTRO_SEEN_KEY, 'blueyclub:video-intro:v2');
  assert.equal(INTRO_MEDIA.hasAudio, true);
  for (const key of ['video', 'opening', 'poster']) {
    assert.ok(fs.statSync(path.join(__dirname, '../public', INTRO_MEDIA[key])).size > 0);
  }
  const video = fs.readFileSync(path.join(__dirname, '../public', INTRO_MEDIA.video));
  assert.ok(video.length < 25 * 1024 * 1024);
  const atoms = [];
  for (let offset = 0; offset < video.length;) {
    const size = video.readUInt32BE(offset);
    assert.ok(size >= 8 && offset + size <= video.length);
    atoms.push(video.toString('ascii', offset + 4, offset + 8));
    offset += size;
  }
  assert.ok(atoms.includes('moov') && atoms.includes('mdat'));
  assert.ok(atoms.indexOf('moov') < atoms.indexOf('mdat'));
});
