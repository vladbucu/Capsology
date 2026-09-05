-- ============================================================
-- CAPSOLOGY v3 MIGRATION
-- Flux: cerere -> cont client (dupa email) -> capsula-ciorna
--       -> la publicare, email cu link de logare -> PIN 4 cifre
--
-- Ruleaza in Supabase SQL Editor INAINTE de deploy-ul codului.
-- Idempotent (if not exists) — se poate rula de mai multe ori.
-- ============================================================

-- ─── profiles: PIN + role (role e deja in prod, il pastram sigur) ──
alter table public.profiles         add column if not exists pin_hash text;
alter table public.profiles         add column if not exists role text default 'user';

-- ─── legatura cerere -> user, si guard pentru emailul de acces ─────
alter table public.capsule_requests add column if not exists user_id uuid references public.profiles(id);
alter table public.capsules         add column if not exists access_email_sent_at timestamptz;

-- ─── rate limiting pentru logarea cu PIN ──────────────────────────
create table if not exists public.pin_login_attempts (
  email        text primary key,
  fail_count   int default 0,
  locked_until timestamptz,
  updated_at   timestamptz default now()
);

-- RLS activ, fara politici pentru roluri publice — accesul trece
-- doar prin server actions cu service_role.
alter table public.pin_login_attempts enable row level security;

-- ─── verificare ───────────────────────────────────────────────────
select
  (select count(*) from information_schema.columns
     where table_name = 'profiles' and column_name = 'pin_hash')            as has_pin_hash,
  (select count(*) from information_schema.columns
     where table_name = 'capsule_requests' and column_name = 'user_id')     as req_has_user_id,
  (select count(*) from information_schema.columns
     where table_name = 'capsules' and column_name = 'access_email_sent_at') as caps_has_email_flag,
  (select count(*) from information_schema.tables
     where table_name = 'pin_login_attempts')                              as has_attempts_table;
