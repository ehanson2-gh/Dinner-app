-- Dinner Tracker — database schema.
--
-- How to run this: open your Supabase project -> SQL Editor -> New query,
-- paste this whole file, and click Run. It's safe to re-run (uses IF NOT EXISTS
-- / CREATE OR REPLACE throughout).
--
-- This app has exactly one household with two members and talks to Supabase
-- only from trusted Next.js server code using the service_role key, which
-- bypasses Row Level Security entirely. RLS is still enabled on every table
-- with NO policies defined, so the anon/publishable key (if ever used
-- client-side by mistake) cannot read or write anything. This is
-- defense-in-depth, not the primary access control — the primary control is
-- that the service_role key never reaches the browser.

create extension if not exists pgcrypto;

-- ── households ────────────────────────────────────────────────────────────
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our kitchen',
  password_hash text,                       -- bcrypt hash of the shared sign-in password
  week_starts_on text not null default 'monday',
  repeat_window_days int not null default 14,
  avoid_back_to_back_protein boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── users (household members) ───────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  email text,
  avatar_color text not null default 'accent', -- 'accent' | 'accent-2'
  reminder_time text,                          -- e.g. '20:30', null = off
  default_log_screen text not null default 'log',
  created_at timestamptz not null default now()
);

-- ── recipes ─────────────────────────────────────────────────────────────
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  protein text,                              -- 'Chicken' | 'Beef' | 'Pork' | 'Shrimp' | 'Veg' | null
  cuisine text,
  tags text[] not null default '{}',
  origin text,                                -- e.g. 'Added from a logged dinner, 3 Feb 2025'
  photos jsonb not null default '[]',         -- [{ id, url, caption }]
  links jsonb not null default '[]',          -- [{ id, title, url }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipes_household_idx on recipes(household_id);

-- ── log entries (what was actually eaten) ─────────────────────────────────
create table if not exists log_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  recipe_id uuid references recipes(id) on delete set null,
  free_text_name text not null,
  kind text not null default 'meal' check (kind in ('meal', 'leftovers', 'dining_out', 'skipped')),
  note text,
  tags text[] not null default '{}',
  photos jsonb not null default '[]',
  links jsonb not null default '[]',
  logged_by uuid not null references users(id),
  logged_at timestamptz not null default now(),
  unique (household_id, date)
);
create index if not exists log_entries_household_date_idx on log_entries(household_id, date);

-- ── week plans ──────────────────────────────────────────────────────────
create table if not exists week_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  week_start_date date not null,
  days jsonb not null default '[]',           -- [{ date, recipeId, name, protein, cuisine, kind, tags, locked }, ...] x7
  seed int not null default 1,
  saved boolean not null default false,
  generated_by uuid references users(id),
  generated_at timestamptz not null default now(),
  saved_at timestamptz,
  unique (household_id, week_start_date)
);
create index if not exists week_plans_household_idx on week_plans(household_id);

-- ── row level security: enabled, zero policies (service_role bypasses RLS) ─
alter table households enable row level security;
alter table users enable row level security;
alter table recipes enable row level security;
alter table log_entries enable row level security;
alter table week_plans enable row level security;

-- ── keep recipes.updated_at current ────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_set_updated_at on recipes;
create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function set_updated_at();
