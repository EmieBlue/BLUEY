import { useEffect, useState } from 'react';
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

type CacheEntry = THREE.Texture | null | 'pending';
const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

function load(url: string) {
  cache.set(url, 'pending');
  const notify = () => listeners.get(url)?.forEach((fn) => fn());
  new THREE.TextureLoader().load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      cache.set(url, tex);
      notify();
    },
    undefined,
    () => {
      // Missing/failed — silently fall back. Expected until the user drops art in.
      cache.set(url, null);
      notify();
    },
  );
}

/** Loads an optional texture; returns `null` (never throws) until it resolves
 *  or fails, so callers can render a procedural fallback with no asset present. */
export function useOptionalTexture(url: string): THREE.Texture | null {
  const [, bump] = useState(0);

  useEffect(() => {
    if (!cache.has(url)) load(url);
    let set = listeners.get(url);
    if (!set) {
      set = new Set();
      listeners.set(url, set);
    }
    const onChange = () => bump((n) => n + 1);
    set.add(onChange);
    return () => {
      set!.delete(onChange);
    };
  }, [url]);

  const v = cache.get(url);
  return v && v !== 'pending' ? v : null;
}
