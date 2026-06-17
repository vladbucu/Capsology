import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function isAdmin(): Promise<{ ok: boolean; userId?: string }> {
  try {
    const { createServerComponentClient } = await import('@/lib/supabase')
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    return { ok: profile?.role === 'admin', userId: user.id }
  } catch { return { ok: false } }
}

export async function POST(req: NextRequest) {
  try {
    const { ok, userId } = await isAdmin()
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { user_id } = await req.json()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    if (user_id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
