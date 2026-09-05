import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const MAX_FAILS   = 5
const LOCK_MINUTES = 15

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const pin   = String(body?.pin || '')

    if (!email || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Email sau PIN invalid.' }, { status: 400 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Rate limit ────────────────────────────────────────
    const { data: att } = await admin.from('pin_login_attempts')
      .select('fail_count, locked_until').eq('email', email).maybeSingle()

    if (att?.locked_until && new Date(att.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Prea multe încercări. Reîncearcă peste 15 minute.' },
        { status: 429 },
      )
    }

    // ── Verifica PIN-ul ───────────────────────────────────
    const { data: prof } = await admin.from('profiles')
      .select('id, pin_hash').eq('email', email).maybeSingle()

    const ok = !!prof?.pin_hash && await bcrypt.compare(pin, prof.pin_hash)

    if (!ok) {
      const fails = (att?.fail_count || 0) + 1
      const locked_until = fails >= MAX_FAILS
        ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
        : null
      await admin.from('pin_login_attempts').upsert({
        email, fail_count: fails, locked_until, updated_at: new Date().toISOString(),
      })
      return NextResponse.json({ error: 'Email sau PIN incorect.' }, { status: 401 })
    }

    // ── Succes — reseteaza contorul, minteaza token de sesiune ─
    await admin.from('pin_login_attempts')
      .upsert({ email, fail_count: 0, locked_until: null, updated_at: new Date().toISOString() })

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    const token_hash = link?.properties?.hashed_token
    if (linkErr || !token_hash) {
      console.error('pin-login: generateLink', linkErr?.message)
      return NextResponse.json({ error: 'Nu am putut porni sesiunea.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, token_hash })
  } catch (e: any) {
    console.error('pin-login:', e?.message || e)
    return NextResponse.json({ error: 'Eroare de server.' }, { status: 500 })
  }
}
