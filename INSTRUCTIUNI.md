# Capsology v2 — Instrucțiuni

## Ordinea operațiunilor

### 1. Rulează migrarea SQL în Supabase

Deschide Supabase → SQL Editor → New query → lipește `migration_v2.sql` → Run.

Face 4 lucruri:
- Adaugă `price_ron` (EUR × 5, rotunjit la preț terminat în 9)
- Adaugă `is_active` și dezactivează produsele de damă
- Adaugă `outfits`, `budget_ron`, `capsule_number` pe tabela `capsules`
- Creează tabela `outfit_hero_images` pentru pozele AI pe care le încarci tu

La final rulează un SELECT de verificare — trimite-mi rezultatul.

### 2. Copiază fișierele în proiect

```
app/globals.css
app/layout.tsx
app/page.tsx
app/quiz/page.tsx
app/capsule/[id]/page.tsx
app/api/generate-capsule/route.ts
app/api/alternatives/route.ts
components/Header.tsx
components/ProductSwapDrawer.tsx
lib/ai.ts
tailwind.config.js
```

Fișierele vechi pe care le înlocuiesc: `app/page.tsx`, `app/quiz/page.tsx`,
`app/capsule/[id]/page.tsx`, `lib/ai.ts`, `tailwind.config.js`, `app/globals.css`.

Fă backup înainte:
```bash
cd ~/Downloads/capsule-mvp
mkdir -p _backup_v1
cp app/page.tsx app/quiz/page.tsx lib/ai.ts tailwind.config.js app/globals.css _backup_v1/
```

### 3. Testează local

```bash
npm run dev
```

Deschide `http://localhost:3000` și verifică:

- [ ] Homepage-ul are hero negru, slider de buget, selector de culori
- [ ] „Generează capsula" duce la /quiz cu bugetul și culorile precompletate
- [ ] Quiz-ul are 5 pași și bara de progres
- [ ] La final se generează 3 ținute distincte
- [ ] Switcher-ul schimbă instant ținuta afișată
- [ ] Brandurile și prețurile sunt blurate (paywall)
- [ ] „Schimbă" deschide drawer-ul cu alternative
- [ ] Alternativele arată impactul asupra bugetului (+/- RON)
- [ ] Pe mobil: o singură ținută + bară sticky jos

### 4. Push în producție

```bash
git add -A
git commit -m "Capsology v2 — redesign complet, 3 tinute, RON, men-only"
git push origin main
npx vercel --prod
```

---

## Ce mai trebuie făcut de tine

### Pozele hero AI

Generează cu Midjourney/DALL-E și încarcă-le. Prompt sugerat:

> Full body editorial fashion photograph of a man in his early 30s wearing
> [descriere ținută], standing against a minimal concrete wall, natural
> daylight, shot on 50mm, muted warm color grading, 3:4 vertical, no logos

Apoi în Supabase, tabela `outfit_hero_images`:

```sql
insert into public.outfit_hero_images (image_url, style_tag, season, colour_tone)
values
  ('https://.../urban-minimal.jpg', 'Casual / Minimal', 'Primavara / Vara', 'neutru'),
  ('https://.../smart-casual.jpg',  'Smart Casual',     'Primavara / Toamna', 'inchis'),
  ('https://.../relaxed.jpg',       'Relaxed',          'Vara',              'deschis');
```

Fără poze hero, pagina afișează automat un colaj din pozele produselor —
funcționează, dar nu arată ca în mockup.

### Pozele de produs

Rămâne problema discutată: pozele actuale sunt contextuale, nu produs-pe-fundal-alb.
Odată ce ai feed real de la un partener afiliat, se rezolvă automat.

---

## Ce nu am modificat

- `/checkout` — încă în EUR, trebuie actualizat la RON
- `/admin` — funcționează, dar afișează EUR
- `/terms` — textul menționează €3/€15
- Automatizarea Instagram — neschimbată

Le fac în pasul următor, după ce confirmi că partea vizuală e ok.
