import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

// PIN-uri prea usor de ghicit
const BANNED = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '2345', '3456', '4567', '5678', '6789', '0123',
  '4321', '9876', '1212', '6969', '0007', '2000',
])

export async function POST(req: NextRequest) {
  try {
    // Sesiunea clientului (cookie) — trebuie sa fie logat (a venit pe magic link)
    const { createServerComponentClient } = await import('@/lib/supabase')
    const sb = await createServerComponentClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nu ești autentificat.' }, { status: 401 })

    const { pin } = await req.json()
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN-ul trebuie să aibă exact 4 cifre.' }, { status: 400 })
    }
    if (BANNED.has(pin)) {
      return NextResponse.json({ error: 'Alege un PIN mai greu de ghicit.' }, { status: 400 })
    }

    const pin_hash = await bcrypt.hash(pin, 10)

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error } = await admin.from('profiles')
      .update({ pin_hash }).eq('id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('set-pin:', e?.message || e)
    return NextResponse.json({ error: 'Nu am putut salva PIN-ul.' }, { status: 500 })
  }
}
