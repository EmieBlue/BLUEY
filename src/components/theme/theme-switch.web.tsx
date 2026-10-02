import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { THEMES } from '@/constants/theme';
import { createThemeScene } from './theme-scene';
import { useThemeToggle } from './use-theme-toggle';
import type { ThemeSwitchProps } from './theme-switch';

export function ThemeSwitch({ onAnimatingChange }: ThemeSwitchProps) {
  const { isDark, palette, themeKey, oppositeKey, setThemeKey } = useThemeToggle();
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<ReturnType<typeof createThemeScene>>(null);
  const initial = useRef({ isDark, palette });
  const locked = useRef(false);
  const notify = useRef(onAnimatingChange);
  notify.current = onAnimatingChange;

  useEffect(() => {
    if (!canvas.current) return;
    const controller = createThemeScene(canvas.current, initial.current.isDark, initial.current.palette);
    scene.current = controller;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishHidden = () => { if (document.hidden) controller?.finish(); };
    const finishReduced = () => { if (motion.matches) controller?.finish(); };
    document.addEventListener('visibilitychange', finishHidden);
    motion.addEventListener('change', finishReduced);
    return () => {
      document.removeEventListener('visibilitychange', finishHidden);
      motion.removeEventListener('change', finishReduced);
      controller?.destroy();
      scene.current = null;
    };
  }, []);

  useEffect(() => { scene.current?.setAppearance(isDark, palette); }, [isDark, palette]);

  const toggle = () => {
    if (locked.current) return;
    const commit = () => setThemeKey(oppositeKey);
    if (!scene.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commit();
      return;
    }
    locked.current = true;
    setBusy(true);
    notify.current?.(true);
    scene.current.start(!isDark, commit, () => {
      locked.current = false;
      setBusy(false);
      notify.current?.(false);
    });
  };

  return (
    <>
      <style>{STYLES}</style>
      <button
        className="elyra-theme-switch"
        type="button"
        role="switch"
        aria-label="Dark mode"
        aria-checked={isDark}
        aria-disabled={busy}
        aria-busy={busy}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        onClick={toggle}
        style={{ '--theme-ink': palette.text, '--theme-muted': palette.textSecondary,
          '--theme-accent': palette.accent, '--theme-line': palette.backgroundSelected,
        } as CSSProperties}>
        <span className="elyra-theme-heading">
          <span className="elyra-theme-label">
            <span className="elyra-theme-title">{isDark ? 'Dark mode' : 'Light mode'}</span>
            <span className="elyra-theme-name">{THEMES.find(t => t.key === themeKey)?.label}</span>
          </span>
          <span className="elyra-theme-track" data-dark={isDark} aria-hidden="true">
            <span className="elyra-theme-thumb">
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={17} color="#12392b" />
            </span>
          </span>
        </span>
        <canvas ref={canvas} width={800} height={400} aria-hidden="true" />
      </button>
    </>
  );
}

const STYLES = `
  #elyra-settings, #elyra-settings div, #elyra-settings span, #elyra-settings button {
    transition: background-color 650ms ease, color 650ms ease, border-color 650ms ease;
  }
  .elyra-theme-switch {
    display: block; width: 100%; padding: 16px 0 0; margin: 0 0 16px;
    border: 0; border-bottom: 1px solid var(--theme-line); border-radius: 0;
    background: transparent; color: var(--theme-ink); font-family: var(--font-display, sans-serif);
    text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .elyra-theme-switch:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 5px; }
  .elyra-theme-switch[aria-disabled="true"] { cursor: progress; }
  .elyra-theme-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .elyra-theme-label { display: flex; flex-direction: column; gap: 5px; }
  .elyra-theme-title { font-size: 18px; line-height: 24px; font-weight: 600; }
  .elyra-theme-name { font-size: 12px; line-height: 18px; color: var(--theme-muted); }
  .elyra-theme-track { display: block; flex-shrink: 0; width: 56px; height: 32px;
    border-radius: 20px; background: var(--theme-line); padding: 3px; box-sizing: border-box; }
  .elyra-theme-track[data-dark="true"] { background: var(--theme-accent); }
  .elyra-theme-thumb { display: flex; align-items: center; justify-content: center;
    width: 26px; height: 26px; border-radius: 50%; background: #f7f3e5;
    box-shadow: 0 1px 3px #0003; transform: translateX(0); }
  #elyra-settings .elyra-theme-thumb { transition: transform 600ms cubic-bezier(.22,1,.36,1); }
  .elyra-theme-track[data-dark="true"] .elyra-theme-thumb { transform: translateX(24px); }
  .elyra-theme-switch canvas { display: block; width: 400px; max-width: 100%; height: auto;
    aspect-ratio: 2 / 1; margin: -2px auto 0; color: inherit; }
  @media (prefers-reduced-motion: reduce) {
    #elyra-settings, #elyra-settings div, #elyra-settings span, #elyra-settings button { transition: none !important; }
  }
`;
