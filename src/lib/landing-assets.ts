import { useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';

/**
 * Optional reference-art overlays for the cinematic landing. Every slot is
 * plain, user-dropped static files under `public/landing/` (served at
 * `/landing/...` — no Metro asset pipeline, just refresh to pick up a new
 * file) — see `src/components/landing/README.md` for the exact checklist.
 *
 * Nothing here is required: `useOptionalTexture` never throws or suspends, so
 * a missing file just resolves to `null` and the caller renders its
 * procedural fallback instead.
 */
export const ASSET_URL = {
  bookCover: '/landing/book-cover.jpg',
  symbol: '/landing/symbol.png',
  character: '/landing/character.png',
  world: (key: string) => `/landing/world-${key}.jpg`,
};

const cache = new Map<string, THREE.Texture | null>();
const inflight = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

function ensureLoad(url: string) {
  if (cache.has(url) || inflight.has(url)) return;
  inflight.add(url);
  const notify = () => listeners.get(url)?.forEach((fn) => fn());
  new THREE.TextureLoader().load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      inflight.delete(url);
      cache.set(url, tex);
      notify();
    },
    undefined,
    () => {
      // Missing/failed — silently fall back. Expected until the user drops art in.
      inflight.delete(url);
      cache.set(url, null);
      notify();
    },
  );
}

/**
 * Loads an optional texture; returns `null` (never throws) until it resolves
 * or fails, so callers can render a procedural fallback with no asset present.
 *
 * Deliberately built on `useSyncExternalStore` rather than a plain
 * `useState`+module-level-`Map` combo: this project has React Compiler
 * enabled (`app.json` experiments.reactCompiler), which auto-memoizes render
 * output assuming everything read during render is part of React's own
 * reactive state — a bare `cache.get(url)` read during render is exactly the
 * "mutable external value" pattern the compiler can memoize past, silently
 * keeping components stuck on `null` even after the texture finishes
 * loading. `useSyncExternalStore` is the React-blessed, compiler-safe way to
 * subscribe to state that lives outside React.
 */
export function useOptionalTexture(url: string): THREE.Texture | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      ensureLoad(url);
      let set = listeners.get(url);
      if (!set) {
        set = new Set();
        listeners.set(url, set);
      }
      set.add(onStoreChange);
      return () => set!.delete(onStoreChange);
    },
    [url],
  );
  const getSnapshot = useCallback(() => cache.get(url) ?? null, [url]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
