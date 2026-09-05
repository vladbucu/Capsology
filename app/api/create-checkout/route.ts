import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { PaymentTier } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// Preț de deblocare implicit (RON) când capsula nu are unlock_price_ron setat.
const DEFAULT_UNLOCK_PRICE_RON = 49

// ─── Test capsule IDs — bypass Supabase lookup ────────────────
// Used for Stripe payment testing before Supabase is configured
const TEST_CAPSULE_IDS = ['test-123', 'test-unlock', 'test-full-service', 'demo']

export async function POST(req: NextRequest) {
  try {
    const { capsule_id, tier, delivery_address, guest_info, removed_item_ids } = await req.json() as {
      capsule_id: string
      tier: PaymentTier
      delivery_address?: any
      guest_info?: any
      removed_item_ids?: string[]
    }

    // ─── Test mode: skip Supabase entirely ───────────────────
    const isTestMode = TEST_CAPSULE_IDS.includes(capsule_id) ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co'

    // ─── Suma de plată: unlock_price_ron din capsulă (RON) ────
    let priceRon = DEFAULT_UNLOCK_PRICE_RON

    if (!isTestMode) {
      // ─── Production: citește prețul capsulei din Supabase ──
      try {
        const { createServerComponentClient } = await import('@/lib/supabase')
        const supabase = await createServerComponentClient()
        const { data: capsule, error } = await supabase
          .from('capsules')
          .select('id, unlock_price_ron')
          .eq('id', capsule_id)
          .single()
        if (error || !capsule) {
          return NextResponse.json({ error: 'Capsule not found' }, { status: 404 })
        }
        if (capsule.unlock_price_ron != null && Number(capsule.unlock_price_ron) > 0) {
          priceRon = Number(capsule.unlock_price_ron)
        }
      } catch {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
      }
    }

    // Stripe folosește subunitatea monedei (bani pentru RON).
    const unitAmount = Math.round(priceRon * 100)

    // ─── Build Stripe session ─────────────────────────────────
    const descriptions: Record<PaymentTier, string> = {
      unlock:       'Deblochează linkurile capsulei tale — comandă singur',
      full_service: 'Comandăm și livrăm întreaga capsulă la ușa ta',
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'ron',
          product_data: {
            name: tier === 'unlock' ? 'Capsology — Deblochează capsula' : 'Capsology — Serviciu complet',
            description: descriptions[tier],
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      // Collect email if not provided
      ...(guest_info?.email
        ? { customer_email: guest_info.email }
        : {}),
      success_url: `${appUrl}/checkout/success?tier=${tier}&capsule_id=${capsule_id}`,
      cancel_url:  `${appUrl}/checkout?tier=${tier}&capsule_id=${capsule_id}&cancelled=1`,
      metadata: {
        capsule_id,
        tier,
        test_mode: isTestMode ? 'true' : 'false',
        price_ron: String(priceRon),
        delivery_address:   delivery_address   ? JSON.stringify(delivery_address)   : '',
        guest_info:         guest_info         ? JSON.stringify(guest_info)         : '',
        removed_item_ids:   removed_item_ids   ? JSON.stringify(removed_item_ids)   : '',
      },
      payment_intent_data: {
        description: `Capsology — ${tier === 'unlock' ? 'Deblocare capsulă' : 'Serviciu complet'} — ${priceRon} RON — Nerambursabil`,
      },
      custom_text: {
        submit: {
          message: tier === 'unlock'
            ? `Prin continuare confirmi că suma de ${priceRon} RON este nerambursabilă — conținut digital livrat imediat (Directiva EU 2011/83/UE art.16m).`
            : `Prin continuare confirmi că taxa de serviciu de ${priceRon} RON este nerambursabilă odată ce comanda este plasată.`,
        },
      },
    })

    // ─── Save payment record (only in production with Supabase) ─
    if (!isTestMode) {
      try {
        const { createServerComponentClient } = await import('@/lib/supabase')
        const supabase = await createServerComponentClient()
        await supabase.from('payments').insert({
          capsule_id,
          stripe_session_id: session.id,
          amount_eur: priceRon,   // coloana istorică `amount_eur` stochează acum valoarea în RON
          tier,
          status: 'pending',
        })
      } catch { /* non-fatal in test mode */ }
    }

    return NextResponse.json({ checkout_url: session.url })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
