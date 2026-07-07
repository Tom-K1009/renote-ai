create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'student', 'pro', 'supporter')),
  is_suspended boolean not null default false,
  suspended_reason text,
  student_verified_at timestamptz,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tsumugu_histories (
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

create table if not exists public.tsumugu_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  history_id uuid not null references public.tsumugu_histories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, history_id)
);

create table if not exists public.tsumugu_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_purpose text not null default 'レポート',
  default_writing_style text not null default 'です・ます調',
  default_length text not null default '400',
  custom_length integer not null default 400,
  theme text not null default 'light',
  model text not null default 'gpt-4.1-mini',
  updated_at timestamptz not null default now()
);

create table if not exists public.tsumugu_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  used_on date not null default current_date,
  count integer not null default 0,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, used_on)
);

create table if not exists public.tsumugu_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tsumugu_api_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan text not null default 'free',
  endpoint text not null,
  mode text,
  purpose text,
  writing_style text,
  target_length integer,
  input_chars integer not null default 0,
  output_chars integer not null default 0,
  estimated_tokens integer not null default 0,
  estimated_cost_jpy numeric(12, 4) not null default 0,
  response_ms integer,
  status text not null default 'success',
  error_code text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.tsumugu_analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  plan text not null default 'guest',
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tsumugu_feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  category text not null default 'その他',
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists suspended_reason text;
alter table public.profiles add column if not exists student_verified_at timestamptz;
alter table public.tsumugu_usage add column if not exists plan text not null default 'free';
alter table public.tsumugu_subscriptions add column if not exists plan text not null default 'free';
alter table public.tsumugu_feedback add column if not exists category text not null default 'その他';

alter table public.profiles enable row level security;
alter table public.tsumugu_histories enable row level security;
alter table public.tsumugu_favorites enable row level security;
alter table public.tsumugu_settings enable row level security;
alter table public.tsumugu_usage enable row level security;
alter table public.tsumugu_subscriptions enable row level security;
alter table public.tsumugu_api_events enable row level security;
alter table public.tsumugu_analytics_events enable row level security;
alter table public.tsumugu_feedback enable row level security;

create policy "Profiles are readable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create policy "Histories are owned by user" on public.tsumugu_histories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Favorites are owned by user" on public.tsumugu_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Settings are owned by user" on public.tsumugu_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Usage is readable by owner" on public.tsumugu_usage
  for select using (auth.uid() = user_id);

create policy "Subscriptions are readable by owner" on public.tsumugu_subscriptions
  for select using (auth.uid() = user_id);

create policy "Analytics can be inserted by authenticated users" on public.tsumugu_analytics_events
  for insert with check (auth.uid() = user_id or user_id is null);

create or replace function public.increment_tsumugu_usage(
  target_user_id uuid,
  target_day date,
  target_plan text default 'free'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tsumugu_usage (user_id, used_on, count)
  values (target_user_id, target_day, 1, target_plan)
  on conflict (user_id, used_on)
  do update set
    count = public.tsumugu_usage.count + 1,
    plan = target_plan,
    updated_at = now();
end;
$$;
