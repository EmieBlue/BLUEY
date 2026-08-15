import { Platform } from 'react-native';

import { SITE_URL, VAPID_PUBLIC_KEY } from '@/config/app';
import { supabase } from '@/lib/supabase';

/**
 * Web-push helpers. Readers opt in with `enablePush()` (asks permission,
 * subscribes, stores the subscription); authors call `broadcastPush()` to notify
 * everyone about a new story/chapter. Web only.
 */
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

export function pushSupported(): boolean {
  return (
    isWeb && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  );
}

export function pushPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as 'granted' | 'denied' | 'default';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function accessToken(): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? undefined;
}

/** Ask permission, subscribe, and store the subscription. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return { ok: false, error: 'Notifications aren’t supported on this device/browser.' };
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, error: 'Notifications were not allowed.' };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }
    const token = await accessToken();
    const res = await fetch(`${window.location.origin}/api/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), accessToken: token }),
    });
    if (!res.ok) return { ok: false, error: 'Could not save your subscription.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not enable notifications.' };
  }
}

/** Author broadcast: notify all subscribers about a story/chapter. */
export async function broadcastPush(params: {
  title: string;
  body?: string;
  url?: string;
}): Promise<{ ok: boolean; sent?: number; error?: string }> {
  const token = await accessToken();
  if (!token) return { ok: false, error: 'Please sign in.' };
  try {
    const base = isWeb ? window.location.origin : SITE_URL;
    const res = await fetch(`${base}/api/push-broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, accessToken: token }),
    });
    const data = await res.json().catch(() => ({}) as { sent?: number; error?: string });
    if (!res.ok) return { ok: false, error: data.error || 'Could not send notifications.' };
    return { ok: true, sent: data.sent };
  } catch {
    return { ok: false, error: 'Could not reach the notification service.' };
  }
}
