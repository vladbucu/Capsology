import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scoreProduct } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { product_id, category, budget_left, exclude_ids = [], answers } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .eq('in_stock', true)
      .in('gender', ['men', 'unisex'])
      .lte('price_ron', Math.max(budget_left, 0))
      .neq('id', product_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const alternatives = (data || [])
      .filter((p: any) => !exclude_ids.includes(p.id))
      .map((p: any) => ({ ...p, _s: answers ? scoreProduct(p, answers) : 0 }))
      .sort((a: any, b: any) => b._s - a._s)
      .slice(0, 10)

    return NextResponse.json({ alternatives })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
