import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { capsule_id, tier, delivery_address } = session.metadata!

    // 1. Mark payment as paid
    await supabaseAdmin
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString(), stripe_payment_intent: session.payment_intent as string })
      .eq('stripe_session_id', session.id)

    // 2. Fetch capsule items to get product IDs
    const { data: capsule } = await supabaseAdmin
      .from('capsules')
      .select('items')
      .eq('id', capsule_id)
      .single()

    if (!capsule) return NextResponse.json({ error: 'Capsule not found' }, { status: 404 })

    // 3. Fetch affiliate URLs from products table (server-side only)
    const productIds = capsule.items.map((item: any) => item.id)
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, affiliate_url')
      .in('id', productIds)

    // 4. Merge affiliate URLs into items
    const unlockedItems = capsule.items.map((item: any) => ({
      ...item,
      affiliate_url: products?.find((p: any) => p.id === item.id)?.affiliate_url || '#',
    }))

    // 5. Update capsule: set to unlocked, add affiliate URLs, set 7-day expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('capsules')
      .update({
        status: tier === 'full_service' ? 'ordered' : 'unlocked',
        items_unlocked: unlockedItems,
        unlocked_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .eq('id', capsule_id)

    // 6. If full service — create order record
    if (tier === 'full_service' && delivery_address) {
      const addr = JSON.parse(delivery_address)
      await supabaseAdmin.from('orders').insert({
        capsule_id,
        delivery_name: addr.full_name,
        delivery_address: addr,
        status: 'pending',
        affiliate_commission_eur: capsule.items.reduce((sum: number, item: any) => sum + item.price_eur, 0) * 0.126,
      })
    }

    // 7. Send 7-day cookie warning email (for unlock tier with About You items)
    if (tier === 'unlock') {
      await sendCookieWarningEmail(session.customer_email!, capsule_id, expiresAt)
    }
  }

  return NextResponse.json({ received: true })
}

// ─── Send 7-day expiry warning email via Brevo ────────────────
async function sendCookieWarningEmail(email: string, capsuleId: string, expiresAt: string) {
  const expiryDate = new Date(expiresAt).toLocaleDateString('ro-RO')
  const capsuleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/capsule/${capsuleId}`

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Capsule', email: 'hello@yourcapsule.ro' },
        to: [{ email }],
        subject: 'Capsula ta te așteaptă — linkurile expiră pe ' + expiryDate,
        htmlContent: `
          <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
            <h1 style="font-size: 28px; font-weight: 400; color: #1c1917;">Capsula ta este gata.</h1>
            <p style="color: #57534e; font-size: 16px; line-height: 1.6;">
              Linkurile de cumpărare din capsula ta sunt valabile până pe <strong>${expiryDate}</strong>.
              Comandă înainte să expire!
            </p>
            <a href="${capsuleUrl}" style="display: inline-block; margin-top: 24px; padding: 14px 28px;
               background: #a87848; color: white; text-decoration: none; border-radius: 6px; font-size: 15px;">
              Vezi capsula mea →
            </a>
            <p style="margin-top: 32px; font-size: 12px; color: #a8a29e;">
              Ai primit acest email pentru că ai deblocat o capsulă pe Capsule.ro
            </p>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Email send error:', err)
    // Non-fatal — log and continue
  }
}
