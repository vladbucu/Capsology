import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { capsule_id } = await req.json()
    if (!capsule_id) return NextResponse.json({ error: 'No capsule_id' }, { status: 400 })

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Link the anonymous capsule to this user
    await supabase
      .from('capsules')
      .update({ user_id: user.id })
      .eq('id', capsule_id)
      .is('user_id', null)  // Only claim unclaimed capsules

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
