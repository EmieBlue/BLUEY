/**
 * Central place for product/branding/pricing values so they're easy to change
 * in one spot (and so the Stripe phase has a single source of truth for price).
 */
export const APP_NAME = 'Elyra';
export const APP_TAGLINE = 'Stories worth staying up for.';

/**
 * The deployed web app + Netlify Functions origin. Used to reach the payment
 * functions from native (where there's no `window.location`) and as the redirect
 * target after Stripe Checkout.
 */
export const SITE_URL = 'https://blueyclub.com';

/** Web-push (VAPID) public key — safe to ship to the client; private key lives in Cloudflare. */
export const VAPID_PUBLIC_KEY =
  'BJJDmOeGHVWB1p-FIlzCqwy7FYaK5ERwCB23OBz586oNCuFtKLQBkDYbtpjdW58hf_rIVD3LDYZdylKKxXz9d0g';

/**
 * Buy-the-book pricing (v1): a reader pays once to unlock a whole book's premium
 * chapters, forever. Flat price for every book; the amount actually charged lives
 * in the `PAYSTACK_BOOK_AMOUNT` env var on the payment function (pesewas).
 */
export const BOOK_PRICE_LABEL = 'GH₵60';
export const BOOK_PERKS = [
  'Every chapter in this book, unlocked',
  'Yours to keep — read it anytime',
  'Support the author directly',
];
