# Web Login

`src/app/auth.web.tsx` selects this web-only design. Native still uses
`src/app/auth.tsx`. Both use the existing `AuthProvider`; backend authentication
and password recovery routes are unchanged.

Colors reuse the Emerald Noir background/text palette from `Colors.emeralddark`
and the warm gold primary-action colors from the video landing. The palette is
scoped to this screen; the mascot sprites and other app themes are unchanged.

The browser form supports sign-in, signup, and emailed password reset. It
uses email rather than a demonstration username. Google and Apple buttons
are intentionally absent: neither provider is wired into the current auth
context. Do not add misleading buttons without configuring those flows.

The password-activity hook stores only a boolean and an idle timer. Paws cover
the eyes on focus/input and lower after 1100ms of inactivity or blur. They
remain covered while the user explicitly reveals a nonempty password. CSS
transitions are removed under reduced motion. No automatic demo types into
the real form, and no example credentials are prefilled.

## Verification

- `npx.cmd tsc --noEmit`
- `npm.cmd run build:web`
- Start Expo on port 8093, then `node scripts/test-husky-auth.cjs`.

The browser regression requires the local Playwright package under
`.expo/ui-tools` and installed Chrome. Tests intercept all Supabase requests
with fake responses: they do not send credentials or reset emails to the
live backend. Coverage includes masking, typing and reveal poses, input
validation, error recovery, email confirmation, reset feedback, reduced
motion and desktop/portrait/landscape scroll layouts. Screenshots are in
`.expo/auth-review`. These are UI checks, not live provider sign-in tests.
