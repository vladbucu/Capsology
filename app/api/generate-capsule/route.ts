import { NextRequest, NextResponse } from 'next/server'
import { generateCapsule, filterProductsByAnswers } from '@/lib/ai'
import type { QuizAnswers } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const answers: QuizAnswers = body.answers
    const sessionId: string = body.session_id

    console.log('Answers received:', JSON.stringify(answers))

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)

    console.log('Products fetched:', products?.length, 'Error:', error?.message)

    if (error) {
      return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 400 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No products in database' }, { status: 400 })
    }

    // Filter by gender
    const genderFiltered = products.filter((p: any) =>
      p.gender === answers.gender || p.gender === 'unisex'
    )
    console.log('After gender filter:', genderFiltered.length)

    // Filter by budget
    const budgetFiltered = genderFiltered.filter((p: any) =>
      p.price_eur <= answers.budget * 0.6
    )
    console.log('After budget filter:', budgetFiltered.length)

    if (budgetFiltered.length === 0) {
      return NextResponse.json({
        error: `Nu s-au găsit produse. Gender: ${answers.gender}, Budget: ${answers.budget}, Total products: ${products.length}, After gender: ${genderFiltered.length}`
      }, { status: 400 })
    }

    const filtered = filterProductsByAnswers(products as any, answers)
    console.log('After filterProductsByAnswers:', filtered.length)

    if (filtered.length === 0) {
      return NextResponse.json({ error: 'Nu s-au găsit produse pentru preferințele selectate.' }, { status: 400 })
    }

    const { selectedIds, styleSummary, colorStory } = await generateCapsule(answers, filtered)
    const selectedProducts = filtered.filter((p: any) => selectedIds.includes(p.id))
    const totalPrice = selectedProducts.reduce((sum: number, p: any) => sum + p.price_eur, 0)

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
