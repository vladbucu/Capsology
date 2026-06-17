import { NextRequest, NextResponse } from 'next/server'
import { getMockProducts } from '@/lib/profitshare'
import { buildFilterOptions } from '@/lib/filters'

export async function GET(req: NextRequest) {
  try {
    // Use Profitshare products (falls back to mock if API not configured)
    const products = getMockProducts()
    const options = buildFilterOptions(products)
    return NextResponse.json(options)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
