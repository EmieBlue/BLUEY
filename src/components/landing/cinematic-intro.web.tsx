import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useLandingActions } from './use-landing-actions';
import { INTRO_LOAD_TIMEOUT_MS, INTRO_MEDIA, INTRO_SEEN_KEY } from './video-intro-config';
import { initialIntroState, introReducer } from './video-intro-state';
import { VideoLandingUI } from './video-landing-ui';

function markSeen() {
  try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* Storage is optional. */ }
}

export function CinematicIntro({ autoplay }: { autoplay: boolean }) {
  const [state, dispatch] = useReducer(introReducer, autoplay, initialIntroState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocus = useRef(false);
  const actions = useLandingActions(markSeen);
  const complete = state.phase === 'complete';

  const finish = useCallback((remember = true) => {
    videoRef.current?.pause();
    if (remember) markSeen();
    shouldFocus.current = true;
    dispatch({ type: 'complete' });
  }, []);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    dispatch({ type: 'loading' });
    void video.play().catch((error: DOMException) => {
      if (video !== videoRef.current || !video.getAttribute('src')) return;
      if (error.name === 'NotAllowedError') dispatch({ type: 'blocked' });
      else if (error.name !== 'AbortError') finish(false);
    });
  }, [finish]);

  useEffect(() => {
    if (complete) {
      if (shouldFocus.current) headingRef.current?.focus({ preventScroll: true });
      return;
    }
    const video = videoRef.current;
    // Restore the source when React re-runs effects in development Strict Mode.
    if (video) video.src = INTRO_MEDIA.video;
    play();
    return () => {
      video?.pause();
      video?.removeAttribute('src');
      video?.load();
    };
  }, [complete, play]);

  useEffect(() => {
    if (state.phase !== 'loading') return;
    const id = window.setTimeout(() => finish(false), INTRO_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [state.phase, finish]);

  useEffect(() => {
    if (complete) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    const onVisibility = () => {
      if (document.hidden) videoRef.current?.pause();
    };
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => { if (motion.matches) finish(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
    };
  }, [complete, finish]);

  const toggleMute = () => {
    if (videoRef.current) videoRef.current.muted = !state.muted;
    dispatch({ type: 'mute' });
  };

  return (
    <section className={`intro-stage ${complete ? 'is-complete' : ''}`} aria-label="Story universe">
      {complete ? (
        <>
          <img className="intro-backdrop" src={INTRO_MEDIA.poster} alt="" fetchPriority="high" />
          <VideoLandingUI actions={actions} headingRef={headingRef} onReplay={() => {
            shouldFocus.current = false;
            dispatch({ type: 'replay' });
          }} />
        </>
      ) : (
        <>
          <video
            ref={videoRef}
            className="intro-film"
            src={INTRO_MEDIA.video}
            poster={INTRO_MEDIA.opening}
            muted={state.muted}
            playsInline
            preload="auto"
            aria-label="A fantasy explorer discovers a magical book and a universe of stories"
            onPlaying={() => dispatch({ type: 'playing' })}
            onPause={() => dispatch({ type: 'paused' })}
            onWaiting={() => dispatch({ type: 'loading' })}
            onStalled={() => { if (!videoRef.current?.paused) dispatch({ type: 'loading' }); }}
            onEnded={() => finish()}
            onError={() => finish(false)}
            onLoadedMetadata={(event) => dispatch({ type: 'progress', elapsed: 0,
              duration: event.currentTarget.duration })}
            onTimeUpdate={(event) => dispatch({ type: 'progress',
              elapsed: event.currentTarget.currentTime, duration: event.currentTarget.duration })}
          />
          <div className="intro-top-controls">
            <button className="intro-control intro-skip" type="button" onClick={() => finish()}>
              Skip intro <Ionicons name="arrow-forward" size={18} color="currentColor" />
            </button>
          </div>
          {state.phase === 'loading' && <div className="intro-status" role="status">Loading...</div>}
          {(state.phase === 'blocked' || state.phase === 'paused') && (
            <div className="intro-play-overlay">
              <button className="intro-play" type="button" onClick={play}>
                <Ionicons name="play" size={24} color="currentColor" />
                {state.phase === 'blocked' ? 'Play intro' : 'Resume intro'}
              </button>
            </div>
          )}
          <div className="intro-playback">
            <button className="intro-control intro-icon" type="button"
              aria-label={state.phase === 'playing' ? 'Pause intro' : 'Play intro'}
              title={state.phase === 'playing' ? 'Pause intro' : 'Play intro'}
              onClick={() => state.phase === 'playing' ? videoRef.current?.pause() : play()}>
              <Ionicons name={state.phase === 'playing' ? 'pause' : 'play'} size={20} color="currentColor" />
            </button>
            {INTRO_MEDIA.hasAudio && <button className="intro-control intro-icon" type="button" onClick={toggleMute}
              aria-label={state.muted ? 'Turn sound on' : 'Mute sound'}
              title={state.muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={!state.muted}>
              <Ionicons name={state.muted ? 'volume-mute' : 'volume-high'} size={20} color="currentColor" />
            </button>}
            <progress aria-label="Intro progress" value={state.elapsed} max={state.duration || 1} />
            <span className="intro-time">{formatTime(state.elapsed)} / {formatTime(state.duration)}</span>
          </div>
        </>
      )}
    </section>
  );
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
