import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type FormEvent } from 'react';

import { APP_NAME } from '@/config/app';
import { WalkingArrow } from '@/components/walking-arrow';
import { useAuth } from '@/context/auth';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { HuskyAuthStyles } from './husky-auth-styles';
import { usePasswordGuard } from './use-password-guard';

type Mode = 'signin' | 'signup' | 'reset';

export default function HuskyAuthScreen() {
  const leave = useBackNavigation('/explore');
  const { signIn, signUp, resetPassword, configured } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backActive, setBackActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const pending = useRef(false);
  const guard = usePasswordGuard();
  const heading = useRef<HTMLHeadingElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const covered = mode !== 'reset' && (guard.typing || (visible && password.length > 0));

  function changeMode(next: Mode) {
    if (pending.current) return;
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword('');
    setVisible(false);
    guard.stop();
    heading.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !configured) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    setInfo(null);
    guard.stop();
    try {
      if (mode === 'reset') {
        const result = await resetPassword(email.trim());
        if (result.error) setError(result.error);
        else setInfo('Check your email for a link to reset your password.');
        return;
      }
      const result = mode === 'signup'
        ? await signUp(email.trim(), password, name.trim() || undefined)
        : await signIn(email.trim(), password);
      if (result.error) setError(result.error);
      else if (result.needsEmailConfirmation) {
        setPassword('');
        setVisible(false);
        setMode('signin');
        setInfo('Check your email to confirm your account, then sign in.');
      } else {
        setPassword('');
        leave();
      }
    } catch {
      setError('We could not connect. Please try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="elyra-auth">
      <HuskyAuthStyles />
      <nav className="den-nav" aria-label="Sign-in navigation">
        <button type="button" className="den-back" aria-label="Back to stories" title="Back to stories" onClick={leave}
          onPointerEnter={() => setBackActive(true)} onPointerLeave={() => setBackActive(false)}
          onPointerDown={() => setBackActive(true)} onPointerUp={() => setBackActive(false)}
          onPointerCancel={() => setBackActive(false)}
          onFocus={() => setBackActive(true)} onBlur={() => setBackActive(false)}>
          <WalkingArrow active={backActive} color="#ecd097" />
        </button>
        <a className="den-wordmark" href="/" aria-label={`${APP_NAME} home`}>
          <img src="/icon-192.png" alt="" width="32" height="32" />
          {APP_NAME}
        </a>
      </nav>

      <div className="den-layout">
        <aside className="den-companion" aria-hidden="true">
          <div className={`den-husky ${covered ? 'is-covered' : ''}`} data-pose={covered ? 'covered' : 'peeking'}>
            <img className="den-face" src="/auth/husky-face.webp" alt="" draggable={false} />
            <img className="den-paw den-paw-left" src="/auth/husky-paw-left.webp" alt="" draggable={false} />
            <img className="den-paw den-paw-right" src="/auth/husky-paw-right.webp" alt="" draggable={false} />
          </div>
          <div className="den-companion-copy">
            <p>A familiar face.<br />A new chapter.</p>
            <span>Make yourself at home.</span>
          </div>
        </aside>

        <section className="den-card" aria-labelledby="den-title">
          <header>
            <p className="den-eyebrow">YOUR STORY STARTS HERE</p>
            <h1 id="den-title" ref={heading} tabIndex={-1}>
              {mode === 'reset' ? 'Forgot your password?' : APP_NAME}
            </h1>
            <p className="den-subtitle">
              {mode === 'signin' ? "Welcome back. Your husky's keeping watch."
                : mode === 'signup' ? 'A little curiosity. A world of stories.'
                  : 'We will send a reset link to your email.'}
            </p>
          </header>

          {mode !== 'reset' && <div className="den-modes" role="group" aria-label="Account action">
            <button type="button" aria-pressed={mode === 'signin'} disabled={busy} onClick={() => changeMode('signin')}>Sign in</button>
            <button type="button" aria-pressed={mode === 'signup'} disabled={busy} onClick={() => changeMode('signup')}>Create account</button>
          </div>}

          <form onSubmit={submit} aria-busy={busy}>
            <fieldset disabled={busy || !configured}>
              <legend className="den-sr-only">{mode === 'reset' ? 'Reset password' : 'Account details'}</legend>
              {mode === 'signup' && <div className="den-field">
                <label htmlFor="den-name">Display name <span>(optional)</span></label>
                <div className="den-input-wrap">
                  <Ionicons name="person-outline" size={19} color="currentColor" />
                  <input id="den-name" name="name" autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={80} />
                </div>
              </div>}
              <div className="den-field">
                <label htmlFor="den-email">Email address</label>
                <div className="den-input-wrap">
                  <Ionicons name="mail-outline" size={19} color="currentColor" />
                  <input id="den-email" name="email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false}
                    value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>
              {mode !== 'reset' && <div className="den-field">
                <label htmlFor="den-password">Password</label>
                <div className="den-input-wrap">
                  <Ionicons name="lock-closed-outline" size={19} color="currentColor" />
                  <input ref={passwordInput} id="den-password" name="password" type={visible ? 'text' : 'password'} required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} autoCapitalize="none" spellCheck={false}
                    minLength={mode === 'signup' ? 8 : undefined} value={password} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                    onFocus={guard.active} onBlur={guard.stop} onChange={e => { setPassword(e.target.value); guard.active(); }} />
                  <button className="den-eye" type="button" aria-label={visible ? 'Hide password' : 'Show password'}
                    title={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => {
                      setVisible(v => !v);
                      passwordInput.current?.focus();
                    }}>
                    <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="currentColor" />
                  </button>
                </div>
              </div>}
              {mode === 'signin' && <button className="den-forgot" type="button" onClick={() => changeMode('reset')}>Forgot password?</button>}
              <button className="den-submit" type="submit">
                {busy ? <><span className="den-spinner" aria-hidden="true" />Please wait...</>
                  : <>{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}<Ionicons name="arrow-forward" size={19} color="currentColor" /></>}
              </button>
            </fieldset>
            {(!configured || error) && <p className="den-message den-error" role="alert">{error || 'Sign-in is temporarily unavailable. Please try again later.'}</p>}
            {info && <p className="den-message den-info" role="status">{info}</p>}
          </form>

          <footer className="den-footer">
            {mode === 'reset' ? <button type="button" className="den-text-button" onClick={() => changeMode('signin')} disabled={busy}>Back to sign in</button>
              : <p>{mode === 'signup' ? 'Already have an account?' : 'New to Elyra?'}{' '}
                <button type="button" className="den-text-button" disabled={busy} onClick={() => changeMode(mode === 'signup' ? 'signin' : 'signup')}>
                  {mode === 'signup' ? 'Sign in' : 'Find your next chapter'}
                </button></p>}
          </footer>
        </section>
      </div>
      <p className="den-bottom">{APP_NAME} <span aria-hidden="true">/</span> Every story opens a world.</p>
    </main>
  );
}
