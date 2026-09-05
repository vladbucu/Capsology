-- ============================================================
-- CAPSOLOGY v4 MIGRATION
-- Modelul curatat de capsule foloseste tabela `capsule_items`.
-- Coloana veche `capsules.items` (jsonb) era NOT NULL fara default
-- si bloca orice insert din editorul de admin.
--
-- Ruleaza in Supabase SQL Editor. Idempotent.
-- ============================================================

alter table public.capsules alter column items drop not null;
alter table public.capsules alter column items set default '[]'::jsonb;

-- verificare
select column_name, is_nullable, column_default
from information_schema.columns
where table_name = 'capsules' and column_name = 'items';
