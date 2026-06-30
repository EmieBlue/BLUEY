// URL polyfill is required for supabase-js to work in React Native.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/**
 * Supabase is wired up but OPTIONAL. The app reads its credentials from Expo
 * public env vars (set in `.env`). If they're missing, `supabase` is `null` and
 * the app runs in local "demo mode" (sample data + on-device storage). As soon
 * as the keys are added, real auth + cloud data turn on — no code changes.
 *
 * See SUPABASE_SETUP.md for how to get these two values.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // Persist the login session: AsyncStorage on native, localStorage on web.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Only relevant on web (handles the magic-link/OAuth redirect in the URL).
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
