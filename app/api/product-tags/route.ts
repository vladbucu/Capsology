import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role — this is a read-only public endpoint (no sensitive data)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface TagOption {
  tag: string
  count: number
  sources: ('aboutyou' | 'zalando')[]
}

export interface ProductTagsResponse {
  styles: TagOption[]
  colors: TagOption[]
  occasions: TagOption[]
  avoid: TagOption[]
  categories: TagOption[]
  last_synced_at: string | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gender = searchParams.get('gender') // filter by gender if provided

  try {
    // Build base query
    let query = supabase
      .from('products')
      .select('tags, colors, category, platform, gender')
      .eq('in_stock', true)

    if (gender && gender !== 'unisex') {
      query = query.or(`gender.eq.${gender},gender.eq.unisex`)
    }

    const { data: products, error } = await query

    if (error) throw error

    // ─── Aggregate tags by type ────────────────────────────────
    const styleMap   = new Map<string, { count: number; sources: Set<string> }>()
    const colorMap   = new Map<string, { count: number; sources: Set<string> }>()
    const occasionMap= new Map<string, { count: number; sources: Set<string> }>()
    const avoidMap   = new Map<string, { count: number; sources: Set<string> }>()
    const categoryMap= new Map<string, { count: number; sources: Set<string> }>()

    // Occasion keywords to detect from tags
    const occasionKeywords = ['birou','casual','weekend','seara','calatorii','sport','petrecere','outdoor','formal','work','travel','party','evening']
    // Style keywords
    const styleKeywords = ['minimalist','casual','clasic','boem','romantic','edgy','sport','business','sustainable','plus size','petite','chic','retro','street']
    // Avoid keywords
    const avoidKeywords = ['sintetica','imprimeuri','animal print','neon','oversize','strans','logo','volane','glitter','transparent']

    for (const product of products || []) {
      const platform = product.platform as 'aboutyou' | 'zalando'
      const tags: string[] = product.tags || []
      const colors: string[] = product.colors || []
      const category: string = product.category || ''

      // Categorise each tag
      for (const tag of tags) {
        const t = tag.toLowerCase().trim()
        if (!t) continue

        if (occasionKeywords.some(kw => t.includes(kw))) {
          addToMap(occasionMap, t, platform)
        } else if (styleKeywords.some(kw => t.includes(kw))) {
          addToMap(styleMap, t, platform)
        } else if (avoidKeywords.some(kw => t.includes(kw))) {
          addToMap(avoidMap, t, platform)
        } else {
          // Generic style tag
          addToMap(styleMap, t, platform)
        }
      }

      // Colors always go to color map
      for (const color of colors) {
        const c = color.toLowerCase().trim()
        if (c) addToMap(colorMap, c, platform)
      }

      // Category
      if (category) addToMap(categoryMap, category, platform)
    }

    // Get last sync time
    const { data: syncData } = await supabase
      .from('products')
      .select('last_synced_at')
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      styles:    mapToSorted(styleMap,    20),
      colors:    mapToSorted(colorMap,    15),
      occasions: mapToSorted(occasionMap, 12),
      avoid:     mapToSorted(avoidMap,    10),
      categories:mapToSorted(categoryMap, 10),
      last_synced_at: syncData?.last_synced_at || null,
    } satisfies ProductTagsResponse, {
      headers: {
        // Cache for 30 minutes — tags don't change that often
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      }
    })

  } catch (error: any) {
    console.error('Product tags error:', error)
    // Return fallback tags so the quiz still works
    return NextResponse.json(getFallbackTags(), { status: 200 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function addToMap(
  map: Map<string, { count: number; sources: Set<string> }>,
  key: string,
  platform: string
) {
  const existing = map.get(key) || { count: 0, sources: new Set<string>() }
  existing.count++
  existing.sources.add(platform)
  map.set(key, existing)
}

function mapToSorted(
  map: Map<string, { count: number; sources: Set<string> }>,
  limit: number
): TagOption[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([tag, { count, sources }]) => ({
      tag,
      count,
      sources: Array.from(sources) as ('aboutyou' | 'zalando')[],
    }))
}

// ─── Fallback tags (shown if database is empty / not yet synced) ──
function getFallbackTags(): ProductTagsResponse {
  return {
    styles: [
      { tag: 'minimalist',  count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'casual',      count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'clasic',      count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'business',    count: 0, sources: ['zalando'] },
      { tag: 'boem',        count: 0, sources: ['aboutyou'] },
      { tag: 'romantic',    count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'sport',       count: 0, sources: ['zalando'] },
    ],
    colors: [
      { tag: 'negru',    count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'alb',      count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'bej',      count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'camel',    count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'bleumarin',count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'gri',      count: 0, sources: ['aboutyou','zalando'] },
    ],
    occasions: [
      { tag: 'birou',       count: 0, sources: ['zalando'] },
      { tag: 'casual zilnic',count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'weekend',     count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'seara',       count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'calatorii',   count: 0, sources: ['aboutyou','zalando'] },
    ],
    avoid: [
      { tag: 'imprimeuri',  count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'animal print',count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'neon',        count: 0, sources: ['aboutyou','zalando'] },
      { tag: 'logo mare',   count: 0, sources: ['aboutyou'] },
    ],
    categories: [],
    last_synced_at: null,
  }
}
