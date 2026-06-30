-- Stripe: remember which Stripe customer a profile maps to, so the webhook can
-- flip is_subscribed on cancellation and the billing portal can find the customer.
alter table profiles add column if not exists stripe_customer_id text;
