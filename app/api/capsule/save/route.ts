import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateSaveCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `CAPS-${rand(4)}-${rand(4)}`
}

export async function POST(req: NextRequest) {
  try {
    const { capsule_id } = await req.json()
    if (!capsule_id) return NextResponse.json({ error: 'Missing capsule_id' }, { status: 400 })

    const supabase = await createServerComponentClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Generate unique save code (retry on collision — extremely rare)
    let save_code = generateSaveCode()
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from('capsules').select('id').eq('save_code', save_code).single()
      if (!existing) break
      save_code = generateSaveCode()
      attempts++
    }

    const { data, error } = await supabaseAdmin
      .from('capsules')
      .update({
        user_id: user.id,
        save_code,
        is_saved: true,
        saved_at: new Date().toISOString(),
      })
      .eq('id', capsule_id)
      .select('save_code')
      .single()

    if (error) throw error
    return NextResponse.json({ save_code: data.save_code })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
