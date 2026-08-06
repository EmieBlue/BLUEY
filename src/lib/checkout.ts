import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { SITE_URL } from '@/config/app';

/**
 * Talks to our hosted payment functions (Cloudflare Pages Functions under /api)
 * and redirects the user to the Paystack page they return. On web we navigate
 * the tab; on native we open an in-app browser.
 */

const FUNCTIONS_BASE = `${SITE_URL}/api`;

/** Where Stripe should send the user back to after Checkout / the portal. */
function appOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return SITE_URL;
}

async function postForUrl(fn: string, body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${FUNCTIONS_BASE}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}) as { url?: string; error?: string });
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data.url as string;
}

async function go(url: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
  } else {
    await WebBrowser.openBrowserAsync(url);
  }
}

/** Open Paystack checkout to buy (unlock) a single book. */
export async function startCheckout(
  user: { id: string; email?: string | null },
  storyId: string,
): Promise<void> {
  const url = await postForUrl('create-checkout', {
    userId: user.id,
    email: user.email ?? undefined,
    storyId,
    origin: appOrigin(),
  });
  await go(url);
}
