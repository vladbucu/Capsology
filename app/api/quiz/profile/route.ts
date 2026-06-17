import { NextRequest, NextResponse } from 'next/server'

// GET /api/quiz/profile — returns logged-in user's style profile
export async function GET(req: NextRequest) {
  try {
    const { createServerComponentClient } = await import('@/lib/supabase')
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ profile: null })

    const { data: profile } = await supabase
      .from('user_style_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: history } = await supabase
      .from('quiz_sessions')
      .select('id, gender, budget_eur, styles, colors, occasions, size_top, size_bottom, size_shoes, created_at, capsule_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ profile, history: history || [] })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/quiz/profile — update extended v2.0 profile fields
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { createServerComponentClient } = await import('@/lib/supabase')
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Only allow updating v2.0 extended fields — not aggregated fields (those are auto-computed)
    const allowed = [
      'preferred_brands', 'avoided_brands',
      'preferred_materials', 'avoided_materials',
      'prefers_sustainable', 'preferred_origins',
      'height_cm', 'weight_kg',
      'chest_cm', 'waist_cm', 'hips_cm',
      'shoulder_width_cm', 'inseam_cm', 'foot_length_cm',
      'style_personality', 'fashion_risk',
      'shopping_frequency', 'price_sensitivity',
      'wardrobe_goal', 'lifestyle_tags',
    ]

    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    const { error } = await supabase
      .from('user_style_profiles')
      .update(updates)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
