import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    // Verify caller is admin
    const { createServerComponentClient } = await import('@/lib/supabase')
    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { user_id, role } = await req.json()
    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id and role required' }, { status: 400 })
    }
    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Role must be user or admin' }, { status: 400 })
    }
    if (user_id === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', user_id)

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
