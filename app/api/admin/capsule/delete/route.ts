import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function isAdmin(): Promise<boolean> {
  try {
    const { createServerComponentClient } = await import('@/lib/supabase')
    const sb = await createServerComponentClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return false
    const { data } = await sb.from('profiles').select('role').eq('id', user.id).single()
    return data?.role === 'admin'
  } catch { return false }
}

export async function POST(req: NextRequest) {
  if (!await isAdmin())
    return NextResponse.json({ error: 'Neautorizat' }, { status: 403 })

  try {
    const { capsule_id } = await req.json()
    if (!capsule_id)
      return NextResponse.json({ error: 'Lipsește capsule_id.' }, { status: 400 })

    // 1. Articolele capsulei (in caz ca nu e cascade pe FK)
    await admin.from('capsule_items').delete().eq('capsule_id', capsule_id)

    // 2. Dezleaga cererea si o readuce la "new" ca sa poata fi reluata
    await admin.from('capsule_requests')
      .update({ capsule_id: null, status: 'new' })
      .eq('capsule_id', capsule_id)

    // 3. Capsula
    const { error } = await admin.from('capsules').delete().eq('id', capsule_id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('admin/capsule/delete:', e?.message || e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
