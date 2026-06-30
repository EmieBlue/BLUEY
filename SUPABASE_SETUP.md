# Connecting Bluy to Supabase (real accounts + database)

This takes about 5 minutes and is free. Until you do it, the app runs in "demo
mode" (sample stories, on-device data). After it, sign-up/login is real and each
reader's library + progress lives in the cloud.

## 1. Create a free Supabase project
1. Go to **https://supabase.com** and sign up (GitHub or email).
2. Click **New project**. Give it a name (e.g. `bluy`), set a database password
   (save it somewhere), pick the region closest to you, and create it.
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the database tables
1. In your project, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) from this project,
   copy everything, paste it into the editor, and click **Run**.
3. You should see "Success". (You can re-run it anytime; it won't duplicate.)

## 3. Make sign-up instant (recommended for now)
By default Supabase emails a confirmation link before login works. To keep
testing simple while we build:
- Go to **Authentication → Sign In / Providers → Email**.
- Turn **OFF** "Confirm email", then Save.
  (You can turn it back on before launch — the app already handles both cases.)

## 4. Get your two keys
- Go to **Project Settings → API**.
- Copy **Project URL** and the **anon / public** API key.

## 5. Put the keys in the app
1. In the project folder `c:\Bluy`, copy `.env.example` to a new file named `.env`.
2. Paste your values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```
3. **Stop and restart** the dev server (`Ctrl+C`, then `npm run web`) so Expo
   reads the new values.

## 6. Test it
- Open the app → **Library** tab → **Sign in or create an account** → make an
  account.
- Follow a story and read a chapter, then check Supabase **Table Editor** →
  `follows` and `reading_progress` should have your rows. 🎉

That's it. Tell me once it's connected and I'll verify everything end-to-end and
we'll move on to payments (Stripe) and going live.
