# Venu

A deployable personal finance tracker with a Supabase-ready private-sync layer.

## Deploy to Vercel

1. Create a Git repository containing this folder's contents.
2. Import that repository at [Vercel](https://vercel.com/new).
3. In the Vercel project settings, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` from your Supabase project (see `.env.example`).
4. Deploy; no build command is needed.

## Connect Supabase

1. Create a new project at [Supabase](https://supabase.com/dashboard).
2. In **Authentication > Providers**, enable **Anonymous Sign-Ins**.
3. Open **SQL Editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
4. Copy the project URL and publishable/anon key from **Project Settings > API** to the Vercel environment variables listed in `.env.example`.
5. Redeploy Vercel. Settings will report “Private cloud sync is on”.

With Supabase configured, each browser is provisioned an anonymous authenticated user and Row Level Security limits data to that user. The app continues to use local storage and supports data-backup import/export. To configure a real contribution QR code, add your UPI ID in Settings after deployment.

## What it does not include

Bank/UPI transaction imports and payment verification are not included. Each needs a provider connection, a server-side design, and appropriate compliance review.
