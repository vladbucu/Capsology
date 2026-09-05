import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { createServerComponentClient } = await import('@/lib/supabase')
    const sb = await createServerComponentClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })
    const { data: p } = await sb.from('profiles').select('role').eq('id', user.id).single()
    if (p?.role !== 'admin') return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })

    const { email, password, full_name } = await req.json()
    if (!email || !password)
      return NextResponse.json({ error: 'Email si parola obligatorii.' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'Parola trebuie sa aiba minim 8 caractere.' }, { status: 400 })

    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, user: data.user })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
