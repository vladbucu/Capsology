-- ============================================================
-- CAPSOLOGY v2 MIGRATION
-- 1. EUR -> RON (x5)
-- 2. Men-only (ascundem produsele femei)
-- 3. Structura pentru 3 tinute per capsula
-- Ruleaza in Supabase SQL Editor
-- ============================================================

-- ─── 1. PRETURI EUR -> RON ────────────────────────────────────
-- Adaugam coloana noua ca sa nu pierdem valorile originale
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_ron numeric(10,2);

UPDATE public.products
SET price_ron = ROUND((price_eur * 5)::numeric, 0)
WHERE price_ron IS NULL;

-- Rotunjim la preturi realiste (terminate in 9)
UPDATE public.products
SET price_ron = FLOOR(price_ron / 10) * 10 + 9
WHERE price_ron > 20;

-- ─── 2. MEN ONLY ──────────────────────────────────────────────
-- Nu stergem, doar marcam ca inactive (revenim la femei in v3)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

UPDATE public.products SET is_active = false WHERE gender = 'women';
UPDATE public.products SET is_active = true  WHERE gender IN ('men', 'unisex');

CREATE INDEX IF NOT EXISTS products_active_gender_idx
  ON public.products(is_active, gender) WHERE is_active = true;

-- ─── 3. STRUCTURA 3 TINUTE ────────────────────────────────────
-- capsules.outfits = [{ id, name, description, style, products[], total_ron, hero_image }]
ALTER TABLE public.capsules
  ADD COLUMN IF NOT EXISTS outfits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS budget_ron numeric(10,2),
  ADD COLUMN IF NOT EXISTS capsule_number int;

-- Numar incremental pentru afisare "CAPSULA 027"
CREATE SEQUENCE IF NOT EXISTS capsule_number_seq START 1;

CREATE OR REPLACE FUNCTION set_capsule_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.capsule_number IS NULL THEN
    NEW.capsule_number := nextval('capsule_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capsule_number_trigger ON public.capsules;
CREATE TRIGGER capsule_number_trigger
  BEFORE INSERT ON public.capsules
  FOR EACH ROW EXECUTE FUNCTION set_capsule_number();

-- ─── 4. HERO IMAGES PENTRU TINUTE ─────────────────────────────
-- Tabela separata: incarci manual pozele AI generate,
-- se potrivesc automat dupa stil + paleta de culori
CREATE TABLE IF NOT EXISTS public.outfit_hero_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url   text NOT NULL,
  style_tag   text,              -- 'Urban Minimal' | 'Smart Casual' | 'Relaxed Summer' etc
  season      text,              -- 'Primavara/Vara' | 'Toamna/Iarna'
  colour_tone text,              -- 'neutru' | 'inchis' | 'deschis'
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hero_images_style_idx
  ON public.outfit_hero_images(style_tag) WHERE is_active = true;

ALTER TABLE public.outfit_hero_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hero_images_public_read" ON public.outfit_hero_images;
CREATE POLICY "hero_images_public_read"
  ON public.outfit_hero_images FOR SELECT USING (true);

-- ─── 5. VERIFICARE ────────────────────────────────────────────
SELECT
  gender,
  category,
  COUNT(*) FILTER (WHERE is_active) AS active,
  MIN(price_ron) AS min_ron,
  MAX(price_ron) AS max_ron
FROM public.products
GROUP BY gender, category
ORDER BY gender, category;
