create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.renote_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default '整える',
  source text not null,
  result text not null,
  purpose text not null,
  tone text not null,
  writing_style text not null,
  target_length integer,
  reduce_ai_tone boolean not null default true,
  improvements jsonb not null default '[]'::jsonb,
  score jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.renote_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  history_id uuid not null references public.renote_histories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, history_id)
);

create table if not exists public.renote_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_purpose text not null default 'レポート',
  default_writing_style text not null default 'です・ます調',
  default_length text not null default '400',
  custom_length integer not null default 400,
  theme text not null default 'light',
  model text not null default 'gpt-4.1-mini',
  updated_at timestamptz not null default now()
);

create table if not exists public.renote_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  used_on date not null default current_date,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, used_on)
);

create table if not exists public.renote_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.renote_histories enable row level security;
alter table public.renote_favorites enable row level security;
alter table public.renote_settings enable row level security;
alter table public.renote_usage enable row level security;
alter table public.renote_subscriptions enable row level security;

create policy "Profiles are readable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Histories are owned by user" on public.renote_histories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Favorites are owned by user" on public.renote_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Settings are owned by user" on public.renote_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Usage is readable by owner" on public.renote_usage
  for select using (auth.uid() = user_id);

create policy "Subscriptions are readable by owner" on public.renote_subscriptions
  for select using (auth.uid() = user_id);

create or replace function public.increment_renote_usage(
  target_user_id uuid,
  target_day date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.renote_usage (user_id, used_on, count)
  values (target_user_id, target_day, 1)
  on conflict (user_id, used_on)
  do update set
    count = public.renote_usage.count + 1,
    updated_at = now();
end;
$$;
