import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface AuthResult {
  /** Human-readable error, or undefined on success. */
  error?: string;
  /** True when sign-up succeeded but the user must confirm their email first. */
  needsEmailConfirmation?: boolean;
}

interface AuthState {
  /** Whether Supabase keys are present at all. */
  configured: boolean;
  /** True while we resolve the initial session on startup. */
  initializing: boolean;
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Send a password-reset email with a link back to /reset-password. */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Set a new password (used on the reset-password screen after the email link). */
  updatePassword: (password: string) => Promise<AuthResult>;
}

const NOT_CONFIGURED: AuthResult = {
  error: 'Accounts aren’t set up yet. Add your Supabase keys to enable sign-in.',
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      configured: isSupabaseConfigured,
      initializing,
      session,
      user: session?.user ?? null,

      signUp: async (email, password, displayName) => {
        if (!supabase) return NOT_CONFIGURED;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: displayName ? { data: { display_name: displayName } } : undefined,
        });
        if (error) return { error: error.message };
        // If email confirmation is on, there's a user but no active session yet.
        if (data.user && !data.session) return { needsEmailConfirmation: true };
        return {};
      },

      signIn: async (email, password) => {
        if (!supabase) return NOT_CONFIGURED;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      },

      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
      },

      resetPassword: async (email) => {
        if (!supabase) return NOT_CONFIGURED;
        const base =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.origin
            : SITE_URL;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${base}/reset-password`,
        });
        return error ? { error: error.message } : {};
      },

      updatePassword: async (password) => {
        if (!supabase) return NOT_CONFIGURED;
        const { error } = await supabase.auth.updateUser({ password });
        return error ? { error: error.message } : {};
      },
    }),
    [initializing, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
