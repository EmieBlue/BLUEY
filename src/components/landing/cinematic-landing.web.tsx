import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { CalmLanding } from '@/components/landing/calm-landing.web';
import { CinematicIntro } from '@/components/landing/cinematic-intro.web';
import { SEEN_KEY, PALETTE } from '@/components/landing/introConfig';
import { LandingStyles } from '@/components/landing/ui/landing-styles';
import { getTierProfile } from '@/lib/device-tier';

/**
 * Web entry for the signed-out landing. Decides between the full cinematic and
 * the calm fallback:
 *   - reduced-motion or a low-power device  → always calm
 *   - already watched it (localStorage flag) → calm, with a "watch the intro"
 *     link that clears the flag
 *   - otherwise                              → the cinematic
 *
 * The native build resolves `cinematic-landing.tsx` instead, which just renders
 * the existing `WelcomeHero` — no three.js in the app bundle.
 */
export function CinematicLanding() {
  const profile = useMemo(() => getTierProfile(), []);
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let s = false;
    try {
      s = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* private mode */
    }
    setSeen(s);
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const replay = useCallback(() => {
    try {
      localStorage.removeItem(SEEN_KEY);
    } catch {
      /* ignore */
    }
    setSeen(false);
  }, []);

  // Avoid a flash before we've read localStorage.
  if (seen === null) {
    return <View style={{ flex: 1, backgroundColor: PALETTE.space0 }} />;
  }

  // `?intro=force` always plays the cinematic, `?intro=calm` always shows the
  // calm page — for previewing either without clearing storage.
  let override: string | null = null;
  try {
    override = new URLSearchParams(window.location.search).get('intro');
  } catch {
    /* ignore */
  }
  const calm =
    override === 'calm' ||
    (override !== 'force' && (profile.reducedMotion || profile.tier === 'low' || seen));

  return (
    <View style={{ flex: 1, backgroundColor: PALETTE.space0 }}>
      <LandingStyles />
      {calm ? (
        <CalmLanding
          markSeen={markSeen}
          canReplay={!profile.reducedMotion && profile.tier !== 'low'}
          onReplay={replay}
        />
      ) : (
        <CinematicIntro key="cinematic" profile={profile} onSeen={markSeen} />
      )}
    </View>
  );
}
