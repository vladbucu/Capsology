# Setup Supabase Storage pentru imagini articole

După ce ai rulat build-ul și pushen codul, trebuie să creezi bucket-ul în Supabase.

## 1. Creează bucket în Supabase Dashboard

1. Intră în [Supabase Dashboard](https://app.supabase.com)
2. Selectează proiectul Capsology
3. Mergi la **Storage** (stânga)
4. Click **Create bucket**
   - **Name**: `item-images`
   - **Privacy**: `Private` (important — nimeni afară de admin nu poate accesa direct)
   - Click **Create bucket**

## 2. Setează RLS (Row Level Security)

După creație, bucket-ul automat:
- Refuză citire publică (Private)
- Permite upload/delete doar cu `service_role` (ce folosim în API)

Nicio configurație suplimentară de RLS nu e necesară.

## 3. Testează

1. Mergi la `/admin/capsule/[id]` (un capsulă existentă)
2. La un articol, butonul **+ Upload poză** ar trebui să apară
3. Selectează o imagine JPG/PNG
4. După upload, URL-ul semnat se salvează în DB
5. Preview-ul ar trebui să arate poza

## Detalii Tehnice

- **Rută**: `POST /api/upload-item-image`
- **Compresie**: Client-side canvas → JPEG 85% quality, max 640px lățime
- **URL**: Semnat 24 ore (expiră, se refolosește doar din DB)
- **Storage Path**: `item-images/{timestamp}-{itemId}.jpg`

## Depanare

Dacă nu se uploadează:
1. Verifică că bucket-ul e creat și Private
2. `SUPABASE_SERVICE_ROLE_KEY` e correct în Vercel env
3. Consolă browser: network tab, caută POST `/api/upload-item-image`
4. Loguri Vercel: `vercel logs --prod`
