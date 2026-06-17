import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { capsuleId: string } }
) {
  try {
    const supabase = await createServerComponentClient()
    const { data: capsule, error } = await supabase
      .from('capsules')
      .select('items, total_price_eur, status')
      .eq('id', params.capsuleId)
      .single()

    if (error || !capsule) {
      return NextResponse.json({ error: 'Capsule not found' }, { status: 404 })
    }

    return NextResponse.json({
      items: capsule.items || [],
      total_eur: capsule.total_price_eur || 0,
      status: capsule.status,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
