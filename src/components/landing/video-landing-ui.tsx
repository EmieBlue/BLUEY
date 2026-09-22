import { Ionicons } from '@expo/vector-icons';
import type { RefObject } from 'react';

import { APP_NAME } from '@/config/app';
import { NAV_LINKS } from './introConfig';
import type { useLandingActions } from './use-landing-actions';

export function VideoLandingUI({ actions, onReplay, headingRef }: {
  actions: ReturnType<typeof useLandingActions>;
  onReplay: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="video-landing-content">
      <header className="video-landing-header">
        <a className="video-brand" href="/">{APP_NAME}</a>
        <nav aria-label="Stories">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              actions.onNav(link.href);
            }}>{link.label}</a>
          ))}
        </nav>
        <div className="video-account-links">
          <button type="button" onClick={actions.onSignIn}>Sign In</button>
          <button type="button" className="video-register" onClick={actions.onRegister}>Register</button>
        </div>
      </header>
      <main className="video-landing-hero">
        <h1 ref={headingRef} tabIndex={-1}>Every story<br />opens a world.</h1>
        <p>Read stories. Discover comics. Watch unforgettable worlds come to life.</p>
        <div className="video-landing-actions">
          <button type="button" className="video-primary" onClick={actions.onPrimary}>
            Enter the story <Ionicons name="arrow-forward" size={19} color="currentColor" />
          </button>
          <button type="button" className="video-secondary" onClick={actions.onSecondary}>Explore stories</button>
        </div>
      </main>
      <footer className="video-landing-footer">
        <button type="button" onClick={onReplay}>
          <Ionicons name="play-circle-outline" size={21} color="currentColor" /> Watch the intro
        </button>
      </footer>
    </div>
  );
}
