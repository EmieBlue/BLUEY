import { useEffect, useState } from 'react';

import { CinematicIntro } from './cinematic-intro.web';
import { INTRO_MEDIA, INTRO_SEEN_KEY } from './video-intro-config';
import { VideoLandingStyles } from './video-landing-styles';
import { shouldAutoplayIntro } from './video-intro-state';

export function CinematicLanding() {
  const [autoplay, setAutoplay] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let seen = false;
    try { seen = localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch { /* Storage is optional. */ }
    setAutoplay(shouldAutoplayIntro({ reducedMotion, saveData: Boolean(saveData), seen,
      override: params.get('intro') }));
  }, []);

  return (
    <div className="video-landing">
      <VideoLandingStyles />
      {autoplay === null ? (
        <div className="intro-boot" role="status">
          <img className="intro-backdrop" src={INTRO_MEDIA.opening} alt="" />
          <span>Loading...</span>
        </div>
      ) : <CinematicIntro autoplay={autoplay} />}
    </div>
  );
}
