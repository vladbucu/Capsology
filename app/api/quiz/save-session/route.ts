import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { answers, session_id, capsule_id } = body

    const { createServerComponentClient } = await import('@/lib/supabase')
    const supabase = await createServerComponentClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id:     user?.id || null,
        session_id,
        capsule_id:  capsule_id || null,
        gender:      answers.gender,
        budget_eur:  answers.budget,
        styles:      answers.style     || [],
        colors:      answers.colors    || [],
        occasions:   answers.occasion  || [],
        size_top:    answers.size_top,
        size_bottom: answers.size_bottom,
        size_shoes:  answers.size_shoes,
        platform:    'web',
      })
      .select()
      .single()

    if (error) throw error

    // Refresh aggregated style profile if user is logged in
    if (user?.id) {
      await supabase.rpc('refresh_style_profile', { p_user_id: user.id })
    }

    return NextResponse.json({ ok: true, session_id: session.id })

  } catch (error: any) {
    console.error('Quiz session save error:', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 })
  }
}
