import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';

type NarrationParams = { chapterId: string; text: string; genre?: string };
type NarrationResult = { url?: string; error?: string };
type SavedAudio = { url: string; expiresAt: number };
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const saved = new Map<string, SavedAudio>();
const pending = new Map<string, Promise<NarrationResult>>();

function endpoint(): string {
  const base = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  return `${base}/api/narrate`;
}

function cacheKey(params: NarrationParams) {
  return JSON.stringify([endpoint(), params.chapterId, params.genre ?? '', params.text]);
}

// Persist only a digest and the audio URL, never the chapter text. Native
// runtimes without Web Crypto still use the in-memory cache and server cache.
async function storageKey(key: string): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    return 'bluey.audio.v1.' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}

function validUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    const service = new URL(endpoint());
    return url.origin === service.origin && url.pathname === service.pathname && /^[\w.-]+\.mp3$/.test(url.searchParams.get('f') ?? '');
  } catch { return false; }
}

export async function forgetChapterAudio(params: NarrationParams) {
  const key = cacheKey(params);
  saved.delete(key);
  const diskKey = await storageKey(key);
  if (diskKey) await AsyncStorage.removeItem(diskKey).catch(() => {});
}

export function getChapterAudioUrl(
  params: NarrationParams,
  { cacheOnly = false }: { cacheOnly?: boolean } = {},
): Promise<NarrationResult> {
  if (!params.text.trim()) return Promise.resolve({ error: 'Nothing to read here yet.' });
  const key = cacheKey(params);
  const cached = saved.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve({ url: cached.url });
  const requestKey = `${cacheOnly ? 'lookup' : 'generate'}:${key}`;
  const existing = pending.get(requestKey);
  if (existing) return existing;

  const request = (async (): Promise<NarrationResult> => {
    // A click arriving during the early lookup must not start a second request.
    if (!cacheOnly) {
      const lookup = pending.get(`lookup:${key}`);
      if (lookup) {
        const result = await lookup;
        if (result.url) return result;
      }
    }
    const diskKey = await storageKey(key);
    if (diskKey) {
      try {
        const raw = await AsyncStorage.getItem(diskKey);
        const entry: SavedAudio | null = raw ? JSON.parse(raw) : null;
        if (entry && entry.expiresAt > Date.now() && validUrl(entry.url)) {
          saved.set(key, entry);
          return { url: entry.url };
        }
      } catch { /* Storage can be disabled in private browsing. */ }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), cacheOnly ? 8000 : 90000);
    try {
      const res = await fetch(endpoint(), {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, cacheOnly }),
      });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (res.ok && validUrl(data.url)) {
        const entry = { url: data.url, expiresAt: Date.now() + CACHE_TTL };
        if (saved.size >= 64) saved.delete(saved.keys().next().value!);
        saved.set(key, entry);
        if (diskKey) void AsyncStorage.setItem(diskKey, JSON.stringify(entry)).catch(() => {});
        return { url: data.url };
      }
      if (cacheOnly) return {};
      return { error: data.error || 'Could not prepare narration. Please try again.' };
    } catch {
      if (cacheOnly) return {};
      return { error: controller.signal.aborted
        ? 'Preparing this recording took too long. Please try again.'
        : 'Could not reach the narration service. Check your connection and try again.' };
    } finally { clearTimeout(timeout); }
  })().finally(() => pending.delete(requestKey));
  pending.set(requestKey, request);
  return request;
}
