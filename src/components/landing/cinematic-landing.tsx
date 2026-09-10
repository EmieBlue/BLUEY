import { WelcomeHero } from '@/components/welcome-hero';

/**
 * Native (iOS / Android) fallback for the signed-out landing. The cinematic 3D
 * experience is web-only, so the app keeps the existing lightweight hero. Metro
 * picks this file on native; `cinematic-landing.web.tsx` on web.
 */
export function CinematicLanding() {
  return <WelcomeHero />;
}
