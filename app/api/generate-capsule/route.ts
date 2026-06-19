import { NextRequest, NextResponse } from 'next/server'
import { generateCapsule, filterProductsByAnswers } from '@/lib/ai'
import type { QuizAnswers } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const answers: QuizAnswers = body.answers
    const sessionId: string = body.session_id

    // Load products from Supabase
    const { createServerComponentClient } = await import('@/lib/supabase')
    const supabase = await createServerComponentClient()

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .or(`gender.eq.${answers.gender},gender.eq.unisex`)

    if (error || !products || products.length === 0) {
      return NextResponse.json({ error: 'Nu s-au găsit produse.' }, { status: 400 })
    }

    const filtered = filterProductsByAnswers(products as any, answers)
    if (filtered.length === 0) {
      return NextResponse.json({ error: 'Nu s-au găsit produse pentru preferințele selectate.' }, { status: 400 })
    }

    const { selectedIds, styleSummary, colorStory } = await generateCapsule(answers, filtered)
    const selectedProducts = filtered.filter(p => selectedIds.includes(p.id))
    const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price_eur, 0)

    try {
      const { data: capsule } = await supabase
        .from('capsules')
        .insert({
          session_id: sessionId,
          items: selectedProducts,
          status: 'preview',
          total_price_eur: totalPrice,
          style_summary: `${styleSummary} ${colorStory}`,
        })
        .select()
        .single()

      return NextResponse.json({
        capsule_id: capsule?.id || sessionId,
        items: selectedProducts,
        total_price_eur: totalPrice,
        style_summary: `${styleSummary} ${colorStory}`,
        status: 'preview',
      })
    } catch {
      return NextResponse.json({
        capsule_id: sessionId,
        items: selectedProducts,
        total_price_eur: totalPrice,
        style_summary: `${styleSummary} ${colorStory}`,
        status: 'preview',
      })
    }

  } catch (error: any) {
    console.error('Generate capsule error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
