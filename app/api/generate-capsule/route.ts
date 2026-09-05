import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateOutfits, type QuizAnswers, type Product } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const answers: QuizAnswers = body.answers
    const sessionId: string = body.session_id || crypto.randomUUID()

    if (!answers?.budget) {
      return NextResponse.json({ error: 'Buget lipsa' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Doar produse active (barbati + unisex)
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('in_stock', true)

    if (error)  return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 })
    if (!products?.length) return NextResponse.json({ error: 'Nu exista produse in baza de date' }, { status: 400 })

    const outfits = await generateOutfits(answers, products as Product[])

    if (!outfits.length) {
      return NextResponse.json(
        { error: 'Nu am putut construi tinute in acest buget. Incearca un buget mai mare.' },
        { status: 400 }
      )
    }

    // Atasam hero images potrivite pe stil
    const { data: heroes } = await supabase
      .from('outfit_hero_images')
      .select('*')
      .eq('is_active', true)

    if (heroes?.length) {
      outfits.forEach((o, i) => {
        const match = heroes.find((h: any) =>
          h.style_tag && o.style.toLowerCase().includes(h.style_tag.toLowerCase())
        )
        o.hero_image = (match || heroes[i % heroes.length])?.image_url
      })
    }

    const { data: capsule } = await supabase
      .from('capsules')
      .insert({
        session_id:      sessionId,
        outfits,
        budget_ron:      answers.budget,
        quiz_answers:    answers,
        status:          'preview',
        total_price_eur: outfits[0]?.total_ron ?? 0,
        items:           outfits[0]?.products ?? [],
      })
      .select()
      .single()

    return NextResponse.json({
      capsule_id:     capsule?.id ?? sessionId,
      capsule_number: capsule?.capsule_number ?? null,
      outfits,
      budget_ron:     answers.budget,
      status:         'preview',
    })

  } catch (e: any) {
    console.error('generate-capsule:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
