export type IntroPhase = 'loading' | 'playing' | 'paused' | 'blocked' | 'complete';
export type IntroState = { phase: IntroPhase; elapsed: number; duration: number; muted: boolean };
export type IntroEvent =
  | { type: 'loading' | 'playing' | 'paused' | 'blocked' | 'complete' | 'replay' | 'mute' }
  | { type: 'progress'; elapsed: number; duration: number };

export function initialIntroState(autoplay: boolean): IntroState {
  return { phase: autoplay ? 'loading' : 'complete', elapsed: 0, duration: 0, muted: true };
}

export function shouldAutoplayIntro({ reducedMotion, saveData, seen, override }: {
  reducedMotion: boolean;
  saveData: boolean;
  seen: boolean;
  override: string | null;
}) {
  return !reducedMotion && !saveData && override !== 'calm' && (override === 'force' || !seen);
}

export function introReducer(state: IntroState, event: IntroEvent): IntroState {
  if (event.type === 'replay') return initialIntroState(true);
  // Late media events must never hide the landing after skip, failure or completion.
  if (state.phase === 'complete') return state;
  if (event.type === 'progress') {
    const duration = Number.isFinite(event.duration) ? Math.max(0, event.duration) : 0;
    return { ...state, duration, elapsed: Number.isFinite(event.elapsed) ?
      Math.max(0, Math.min(event.elapsed, duration)) : 0 };
  }
  if (event.type === 'mute') return { ...state, muted: !state.muted };
  return { ...state, phase: event.type };
}
