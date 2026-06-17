# Capsule — AI Wardrobe Platform MVP

## What this is
A Next.js web app that:
1. Takes users through a 6-step style quiz
2. Calls Claude AI to generate a curated capsule wardrobe from About You & Zalando
3. Shows the capsule with brands/links blurred
4. Charges €3 (unlock) or €15 (full service) via Stripe
5. Reveals affiliate links after payment (stored securely server-side)
6. For full service: stores delivery address and places order on user's behalf

## Stack
| Layer | Tool | Cost |
|-------|------|------|
| Frontend + API | Next.js 14 | Free |
| Database + Auth | Supabase | Free up to 50k users |
| AI (capsule logic) | Anthropic Claude API | ~€0.003/capsule |
| Payments | Stripe | 1.5% + €0.25/transaction |
| Affiliate products | Awin (About You + Zalando) | Free |
| Hosting | Vercel | Free |
| Email | Brevo | Free up to 300/day |

**Total monthly cost: ~€4** (just domain + minimal AI API calls)

---

## Setup in 4 steps

### Step 1 — Install dependencies
```bash
cd capsule-mvp
npm install
```

### Step 2 — Set up Supabase
1. Go to https://supabase.com → Create new project (free)
2. Go to SQL Editor → paste contents of `lib/schema.sql` → Run
3. Copy your project URL and keys from Settings → API

### Step 3 — Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in all values in `.env.local` (see comments in the file for where to get each key)

### Step 4 — Run locally
```bash
npm run dev
```
Open http://localhost:3000 — you'll see the landing page.
Go to http://localhost:3000/quiz to test the full flow.

---

## Testing payments locally
Stripe needs to receive webhooks from your local machine.
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:3000/api/webhook`
3. Copy the webhook secret it gives you → paste into `.env.local` as `STRIPE_WEBHOOK_SECRET`
4. Use Stripe test card: `4242 4242 4242 4242` any future date, any CVC

---

## Deploying to Vercel (makes it live on the internet)
1. Push this folder to GitHub
2. Go to https://vercel.com → Import project → select your repo
3. Add all environment variables from `.env.local` in Vercel's dashboard
4. Deploy → your site is live at `yourproject.vercel.app`
5. Add your Vercel URL as `NEXT_PUBLIC_APP_URL` in Vercel env vars
6. Update Stripe webhook endpoint to `https://yourproject.vercel.app/api/webhook`

---

## Key files for your freelancer
| File | What it does |
|------|-------------|
| `app/quiz/page.tsx` | The 6-step style quiz |
| `app/capsule/[id]/page.tsx` | Capsule display + payment |
| `app/api/generate-capsule/route.ts` | AI capsule generation |
| `app/api/create-checkout/route.ts` | Stripe checkout |
| `app/api/webhook/route.ts` | Stripe → unlock capsule + send email |
| `lib/ai.ts` | Claude prompt + capsule logic |
| `lib/awin.ts` | Awin product feed fetch |
| `lib/schema.sql` | Full database schema |

---

## Adding the AI chat feature (Year 2)
When ready, add a new file `app/chat/page.tsx` with a chat interface that:
1. Loads the user's capsule history from Supabase
2. Sends messages to Claude with the user's style profile as context
3. Claude responds with outfit suggestions, style advice, capsule updates

The Claude API is already in the stack — no new integrations needed.

---

## Business plan notes
- No refunds on €3 unlock or €15 service fee (legal basis: digital content + service rendered)
- Affiliate commissions paid by Awin: twice monthly (1st and 15th)
- Commission lag: ~45-60 days from sale to bank account
- About You: 15% commission, 7-day cookie (send reminder email at payment)
- Zalando: 7% commission, 30-day cookie
- Return policy: customers return directly to retailer — zero cost to platform
- Platform ships direct to customer address — no staging needed
