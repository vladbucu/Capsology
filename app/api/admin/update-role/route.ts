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

    const { user_id, role } = await req.json()
    if (!['user', 'admin'].includes(role))
      return NextResponse.json({ error: 'Rol invalid' }, { status: 400 })
    if (user_id === user.id)
      return NextResponse.json({ error: 'Nu iti poti schimba propriul rol.' }, { status: 400 })

    await admin.from('profiles').update({ role }).eq('id', user_id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
