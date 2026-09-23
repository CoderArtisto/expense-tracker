-- Run this once in the Supabase SQL Editor for a new Venu project.
-- Anonymous users are supported so that no email address is needed for this MVP.
-- Enable "Anonymous Sign-Ins" in Authentication > Providers before deploying.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Venu' check (char_length(display_name) <= 24),
  monthly_budget numeric not null default 0 check (monthly_budget >= 0),
  upi_id text not null default '' check (char_length(upi_id) <= 120),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('expense', 'received')),
  amount numeric not null check (amount > 0),
  note text not null check (char_length(note) between 1 and 64),
  category text check (category in ('Commute', 'Regular lunch', 'Outside food', 'Miscellaneous', 'Medicines', 'Groceries')),
  person text check (char_length(person) <= 36),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  check ((kind = 'expense' and category is not null) or (kind = 'received' and person is not null))
);

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Users manage their profile" on public.profiles;
create policy "Users manage their profile" on public.profiles
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their transactions" on public.transactions;
create policy "Users manage their transactions" on public.transactions
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists transactions_user_date on public.transactions(user_id, occurred_on desc);
