/**
 * Central place for product/branding/pricing values so they're easy to change
 * in one spot (and so the Stripe phase has a single source of truth for price).
 */
export const APP_NAME = 'Bluey';
export const APP_TAGLINE = 'Stories worth staying up for.';

/**
 * The deployed web app + Netlify Functions origin. Used to reach the payment
 * functions from native (where there's no `window.location`) and as the redirect
 * target after Stripe Checkout.
 */
export const SITE_URL = 'https://bluy-4az69d.netlify.app';

export const PREMIUM_PLAN = {
  name: 'Bluey Premium',
  priceLabel: '$4.99',
  period: 'month',
  perks: [
    'Unlock every premium chapter',
    'New chapters the moment they drop',
    'Support the authors you love',
    'Read ad-free, everywhere',
  ],
};
