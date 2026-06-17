-- ============================================================
-- CAPSULE WARDROBE PLATFORM — DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. USER PROFILES (extends Supabase auth.users)
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text,
  full_name     text,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile"    on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. STYLE QUIZ ANSWERS
create table public.quiz_answers (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references public.profiles(id) on delete cascade,
  session_id   text,                        -- for anonymous users before signup
  answers      jsonb not null,              -- full quiz answers object
  created_at   timestamptz default now()
);
alter table public.quiz_answers enable row level security;
create policy "Users can manage own quiz answers" on public.quiz_answers
  for all using (auth.uid() = user_id);


-- 3. CAPSULES (the generated wardrobe)
create table public.capsules (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.profiles(id) on delete cascade,
  session_id      text,                     -- anonymous session
  quiz_answers_id uuid references public.quiz_answers(id),
  items           jsonb not null,           -- array of items WITHOUT affiliate links
  items_unlocked  jsonb,                    -- same items WITH affiliate links (set after payment)
  status          text default 'preview',  -- preview | unlocked | ordered
  total_price_eur numeric(10,2),
  style_summary   text,                     -- AI-generated style description
  created_at      timestamptz default now(),
  unlocked_at     timestamptz,
  expires_at      timestamptz               -- 7 days from unlock (About You cookie window)
);
alter table public.capsules enable row level security;
create policy "Users can manage own capsules" on public.capsules
  for all using (auth.uid() = user_id);


-- 4. PAYMENTS
create table public.payments (
  id                  uuid default gen_random_uuid() primary key,
  capsule_id          uuid references public.capsules(id),
  user_id             uuid references public.profiles(id),
  stripe_session_id   text unique,
  stripe_payment_intent text,
  amount_eur          numeric(10,2),
  tier                text,                 -- 'unlock' (€3) | 'full_service' (€15)
  status              text default 'pending', -- pending | paid | failed
  created_at          timestamptz default now(),
  paid_at             timestamptz
);
alter table public.payments enable row level security;
create policy "Users can view own payments" on public.payments
  for select using (auth.uid() = user_id);


-- 5. FULL SERVICE ORDERS
create table public.orders (
  id              uuid default gen_random_uuid() primary key,
  capsule_id      uuid references public.capsules(id),
  user_id         uuid references public.profiles(id),
  payment_id      uuid references public.payments(id),
  delivery_name   text not null,
  delivery_address jsonb not null,          -- {line1, line2, city, county, postal_code}
  platform_orders jsonb,                    -- About You / Zalando order references
  status          text default 'pending',   -- pending | ordered | shipped | delivered
  affiliate_commission_eur numeric(10,2),
  created_at      timestamptz default now(),
  ordered_at      timestamptz
);
alter table public.orders enable row level security;
create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);


-- 6. PRODUCT CATALOGUE CACHE (refreshed nightly from Awin)
create table public.products (
  id              text primary key,         -- Awin product ID
  platform        text,                     -- 'aboutyou' | 'zalando'
  name            text,
  brand           text,
  category        text,                     -- tops | bottoms | outerwear | shoes | accessories
  price_eur       numeric(10,2),
  image_url       text,
  affiliate_url   text,                     -- NEVER exposed until payment confirmed
  colors          text[],
  tags            text[],
  gender          text,                     -- women | men | unisex
  in_stock        boolean default true,
  last_synced_at  timestamptz default now()
);
-- Products table: no RLS - readable by API, affiliate_url only used server-side

-- Index for fast capsule generation queries
create index products_category_idx on public.products(category);
create index products_price_idx on public.products(price_eur);
create index products_platform_idx on public.products(platform);
create index products_gender_idx on public.products(gender);


-- ============================================================
-- ADDENDUM: Google OAuth + capsule saving with unique codes
-- ============================================================

-- Add unique save code to capsules (generated on save)
alter table public.capsules
  add column if not exists save_code text unique,         -- e.g. "CAPS-A3X7-K9M2"
  add column if not exists saved_at  timestamptz,
  add column if not exists is_saved  boolean default false;

-- Index for quick lookup by save code
create index if not exists capsules_save_code_idx on public.capsules(save_code);

-- Generate a readable unique code: "CAPS-XXXX-XXXX"
create or replace function generate_save_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text := 'CAPS-';
  i     int;
begin
  for i in 1..4 loop
    code := code || substr(chars, floor(random()*length(chars))::int + 1, 1);
  end loop;
  code := code || '-';
  for i in 1..4 loop
    code := code || substr(chars, floor(random()*length(chars))::int + 1, 1);
  end loop;
  return code;
end;
$$;

-- Supabase Auth: enable Google provider in Dashboard → Auth → Providers → Google
-- Required env vars (add to .env.local):
--   NEXT_PUBLIC_SUPABASE_URL (already set)
--   NEXT_PUBLIC_SUPABASE_ANON_KEY (already set)
-- In Supabase Dashboard → Auth → URL Configuration:
--   Site URL: https://your-domain.com (or http://localhost:3000 for dev)
--   Redirect URLs: https://your-domain.com/auth/callback


-- ============================================================
-- ADDENDUM: guest_email on payments (for non-logged-in users)
-- ============================================================
alter table public.payments
  add column if not exists guest_email text,
  add column if not exists guest_info  jsonb;


-- ============================================================
-- USER PREFERENCES & STYLE PROFILE
-- v1.0: quiz answers history
-- v2.0: extended style profile (measurements, brands, materials)
-- ============================================================

-- ─── Quiz sessions (full history, never overwritten) ─────────
-- Each time a user completes the quiz, a new row is inserted.
-- user_id is null for anonymous sessions (linked after login).
create table if not exists public.quiz_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  session_id    text,                          -- anonymous session before login

  -- v1.0 quiz answers (current quiz)
  gender        text,                          -- 'women' | 'men' | 'unisex'
  budget_eur    numeric(10,2),
  styles        text[]  default '{}',          -- ['Minimalist', 'Casual', ...]
  colors        text[]  default '{}',          -- color family groups
  occasions     text[]  default '{}',          -- from style cards
  size_top      text,                          -- 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
  size_bottom   text,
  size_shoes    text,                          -- EU size as string

  -- metadata
  capsule_id    uuid references public.capsules(id) on delete set null,
  created_at    timestamptz default now(),
  platform      text default 'web'             -- 'web' | 'ios' | 'android'
);

-- Index for fast user history lookup
create index if not exists quiz_sessions_user_id_idx on public.quiz_sessions(user_id);
create index if not exists quiz_sessions_created_at_idx on public.quiz_sessions(created_at desc);

-- ─── User style profile (one row per user, updated in place) ──
-- Aggregated preferences derived from quiz history + v2.0 extended data.
-- This is the "learned" profile — richer than any single quiz session.
create table if not exists public.user_style_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete cascade,

  -- ── Aggregated from quiz history (auto-updated) ──────────
  preferred_gender   text,                     -- most common gender selected
  avg_budget_eur     numeric(10,2),            -- average budget across sessions
  top_styles         text[]  default '{}',     -- most selected styles, ranked
  top_colors         text[]  default '{}',     -- most selected color families
  top_occasions      text[]  default '{}',
  size_top           text,
  size_bottom        text,
  size_shoes         text,
  quiz_count         int     default 0,        -- total number of quizzes taken
  last_quiz_at       timestamptz,

  -- ── v2.0: Extended style preferences (quiz extins) ───────
  -- Brands
  preferred_brands   text[]  default '{}',     -- ['Zara', 'Mango', 'H&M', ...]
  avoided_brands     text[]  default '{}',

  -- Materials & sustainability
  preferred_materials text[] default '{}',     -- ['cotton', 'linen', 'wool', ...]
  avoided_materials   text[] default '{}',     -- ['polyester', 'synthetic', ...]
  prefers_sustainable boolean default false,   -- sustainability preference toggle
  preferred_origins   text[] default '{}',     -- ['Romania', 'Portugal', 'Italy']

  -- Body measurements (for fit optimization)
  height_cm          int,                      -- height in centimeters
  weight_kg          numeric(5,1),             -- weight in kg
  chest_cm           int,                      -- chest circumference
  waist_cm           int,                      -- waist circumference
  hips_cm            int,                      -- hip circumference
  shoulder_width_cm  int,
  inseam_cm          int,                      -- inseam length for trousers
  foot_length_cm     numeric(4,1),             -- for precise shoe sizing

  -- Style personality (v2.0 extended quiz)
  style_personality  text,                     -- 'minimalist' | 'maximalist' | 'classic' | 'eclectic'
  fashion_risk       text,                     -- 'safe' | 'moderate' | 'bold'
  shopping_frequency text,                     -- 'monthly' | 'seasonal' | 'yearly'
  price_sensitivity  text,                     -- 'budget' | 'mid' | 'premium' | 'luxury'
  wardrobe_goal      text,                     -- 'refresh' | 'build_from_scratch' | 'specific_occasion'
  lifestyle_tags     text[] default '{}',      -- ['corporate', 'creative', 'active', 'social']

  -- ── Behavioral data (auto-populated from usage) ──────────
  total_capsules_generated  int default 0,
  total_capsules_unlocked   int default 0,
  total_capsules_ordered    int default 0,
  total_spent_eur           numeric(10,2) default 0,
  favorite_categories       text[] default '{}',  -- most unlocked categories
  favorite_platforms        text[] default '{}',  -- 'aboutyou' | 'zalando' etc.

  -- ── Timestamps ───────────────────────────────────────────
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists user_style_profiles_user_id_idx on public.user_style_profiles(user_id);

-- ─── Auto-update updated_at on style profile changes ─────────
create or replace function update_style_profile_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger style_profile_updated
  before update on public.user_style_profiles
  for each row execute function update_style_profile_timestamp();

-- ─── Auto-create style profile when user registers ───────────
create or replace function create_style_profile_on_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_style_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_style_profile
  after insert on auth.users
  for each row execute function create_style_profile_on_signup();

-- ─── Function: update aggregated preferences from quiz history ─
-- Called after each quiz session is saved.
create or replace function refresh_style_profile(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_gender        text;
  v_avg_budget    numeric;
  v_styles        text[];
  v_colors        text[];
  v_occasions     text[];
  v_size_top      text;
  v_size_bottom   text;
  v_size_shoes    text;
  v_count         int;
  v_last_quiz     timestamptz;
begin
  -- Count sessions
  select count(*), max(created_at)
    into v_count, v_last_quiz
    from public.quiz_sessions
   where user_id = p_user_id;

  -- Most common gender
  select gender into v_gender
    from public.quiz_sessions
   where user_id = p_user_id
   group by gender
   order by count(*) desc
   limit 1;

  -- Average budget
  select avg(budget_eur) into v_avg_budget
    from public.quiz_sessions
   where user_id = p_user_id;

  -- Most recent sizes (from last quiz)
  select size_top, size_bottom, size_shoes
    into v_size_top, v_size_bottom, v_size_shoes
    from public.quiz_sessions
   where user_id = p_user_id
   order by created_at desc
   limit 1;

  -- Aggregate styles (flatten all arrays, rank by frequency)
  select array_agg(style order by cnt desc)
    into v_styles
    from (
      select unnest(styles) as style, count(*) as cnt
        from public.quiz_sessions
       where user_id = p_user_id
       group by style
       limit 5
    ) s;

  -- Aggregate colors
  select array_agg(color order by cnt desc)
    into v_colors
    from (
      select unnest(colors) as color, count(*) as cnt
        from public.quiz_sessions
       where user_id = p_user_id
       group by color
       limit 5
    ) c;

  -- Aggregate occasions
  select array_agg(occasion order by cnt desc)
    into v_occasions
    from (
      select unnest(occasions) as occasion, count(*) as cnt
        from public.quiz_sessions
       where user_id = p_user_id
       group by occasion
       limit 5
    ) o;

  -- Upsert into style profile
  insert into public.user_style_profiles (
    user_id, preferred_gender, avg_budget_eur,
    top_styles, top_colors, top_occasions,
    size_top, size_bottom, size_shoes,
    quiz_count, last_quiz_at
  ) values (
    p_user_id, v_gender, v_avg_budget,
    coalesce(v_styles, '{}'),
    coalesce(v_colors, '{}'),
    coalesce(v_occasions, '{}'),
    v_size_top, v_size_bottom, v_size_shoes,
    v_count, v_last_quiz
  )
  on conflict (user_id) do update set
    preferred_gender = excluded.preferred_gender,
    avg_budget_eur   = excluded.avg_budget_eur,
    top_styles       = excluded.top_styles,
    top_colors       = excluded.top_colors,
    top_occasions    = excluded.top_occasions,
    size_top         = excluded.size_top,
    size_bottom      = excluded.size_bottom,
    size_shoes       = excluded.size_shoes,
    quiz_count       = excluded.quiz_count,
    last_quiz_at     = excluded.last_quiz_at;
end;
$$;

-- ─── RLS policies ─────────────────────────────────────────────
alter table public.quiz_sessions enable row level security;
alter table public.user_style_profiles enable row level security;

-- Users can only see their own data
create policy "quiz_sessions_user_select"
  on public.quiz_sessions for select
  using (auth.uid() = user_id);

create policy "quiz_sessions_user_insert"
  on public.quiz_sessions for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "style_profile_user_select"
  on public.user_style_profiles for select
  using (auth.uid() = user_id);

create policy "style_profile_user_update"
  on public.user_style_profiles for update
  using (auth.uid() = user_id);

-- Admins can see all
create policy "quiz_sessions_admin_all"
  on public.quiz_sessions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "style_profile_admin_all"
  on public.user_style_profiles for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
