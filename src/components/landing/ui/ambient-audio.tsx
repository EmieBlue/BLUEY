import { useEffect, useState } from 'react';

import { PALETTE } from '@/components/landing/introConfig';

/**
 * Sound toggle — a stub for now. Browsers block autoplay, so audio starts muted
 * and only plays after this button is pressed. Drop an ambient loop + a
 * page-turn one-shot in `/assets` and wire them below (an <audio> element, or
 * `expo-audio` if you want it shared with native). The button just remembers the
 * viewer's choice.
 */
const KEY = 'elyra:intro:sound';

export function AmbientAudio({ hidden }: { hidden: boolean }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      setOn(localStorage.getItem(KEY) === 'on');
    } catch {
      /* private mode — ignore */
    }
  }, []);

  const toggle = () => {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? 'on' : 'off');
      } catch {
        /* ignore */
      }
      // Wire playback here once an audio file exists, e.g.:
      //   const el = document.getElementById('elyra-ambient') as HTMLAudioElement | null;
      //   if (el) next ? el.play().catch(() => {}) : el.pause();
      return next;
    });
  };

  return (
    <>
      {/* <audio id="elyra-ambient" src={require('@/assets/audio/ambient.mp3')} loop preload="none" /> */}
      <button
        type="button"
        aria-label={on ? 'Mute ambient sound' : 'Play ambient sound'}
        aria-pressed={on}
        onClick={toggle}
        className="elyra-btn"
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: 40,
          height: 40,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.18)',
          color: PALETTE.text,
          cursor: 'pointer',
          zIndex: 45,
          opacity: hidden ? 0 : 0.85,
          pointerEvents: hidden ? 'none' : 'auto',
          transition: 'opacity .4s ease',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}>
        {on ? '♪' : '·'}
      </button>
    </>
  );
}
