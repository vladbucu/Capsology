import { NextRequest, NextResponse } from 'next/server'
import { generateCapsule, filterProductsByAnswers } from '@/lib/ai'
import { getAllProducts } from '@/lib/profitshare'
import type { QuizAnswers } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const answers: QuizAnswers = body.answers
    const sessionId: string    = body.session_id

    // 1. Fetch products from Profitshare (falls back to mock if not configured)
    const allProducts = await getAllProducts(answers.gender)

    // 2. Filter by quiz answers (gender, budget, avoid tags)
    const filtered = filterProductsByAnswers(allProducts, answers)

    if (filtered.length === 0) {
      return NextResponse.json(
        { error: 'Nu s-au găsit produse pentru preferințele selectate.' },
        { status: 400 }
      )
    }

    // 3. Generate capsule with Claude AI
    const { selectedIds, styleSummary, colorStory } = await generateCapsule(answers, filtered)

    // 4. Get selected products (without affiliate URLs)
    const selectedProducts = filtered.filter(p => selectedIds.includes(p.id))
    const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price_eur, 0)

    // 5. Save to Supabase (if configured)
    try {
      const { createServerComponentClient } = await import('@/lib/supabase')
      const supabase = await createServerComponentClient()

      const { data: quizData } = await supabase
        .from('quiz_answers')
        .insert({ session_id: sessionId, answers })
        .select()
        .single()

      const { data: capsule } = await supabase
        .from('capsules')
        .insert({
          session_id:     sessionId,
          quiz_answers_id: quizData?.id,
          items:          selectedProducts,
          status:         'preview',
          total_price_eur: totalPrice,
          style_summary:  `${styleSummary} ${colorStory}`,
        })
        .select()
        .single()

      return NextResponse.json({
        capsule_id:      capsule?.id || sessionId,
        items:           selectedProducts,
        total_price_eur: totalPrice,
        style_summary:   `${styleSummary} ${colorStory}`,
        status:          'preview',
      })
    } catch {
      // Supabase not configured — return capsule without saving
      return NextResponse.json({
        capsule_id:      sessionId,
        items:           selectedProducts,
        total_price_eur: totalPrice,
        style_summary:   `${styleSummary} ${colorStory}`,
        status:          'preview',
      })
    }

  } catch (error: any) {
    console.error('Generate capsule error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
