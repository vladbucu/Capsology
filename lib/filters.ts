import type { Product, ProductFilters, FilterOptions, QuizAnswers } from './types'

// ─── Colour normalisation map ─────────────────────────────────
export const COLOUR_MAP: Record<string, string[]> = {
  'Alb':     ['white', 'off white', 'cream', 'ivory', 'ecru', 'alb'],
  'Negru':   ['black', 'jet black', 'negru'],
  'Bej':     ['beige', 'camel', 'tan', 'sand', 'stone', 'nude', 'bej'],
  'Albastru':['blue', 'navy', 'navy blue', 'cobalt', 'denim', 'indigo', 'albastru'],
  'Maro':    ['brown', 'chocolate', 'cognac', 'rust', 'maro'],
  'Kaki':    ['khaki', 'olive', 'army green', 'kaki', 'military'],
  'Gri':     ['grey', 'gray', 'charcoal', 'silver', 'gri'],
  'Verde':   ['green', 'emerald', 'sage', 'mint', 'verde'],
  'Roșu':    ['red', 'burgundy', 'wine', 'bordeaux', 'rosu', 'roșu'],
  'Roz':     ['pink', 'blush', 'rose', 'mauve', 'roz'],
  'Galben':  ['yellow', 'mustard', 'galben'],
  'Multicolor': ['multicolor', 'print', 'stripes', 'floral', 'pattern'],
}

export function normaliseColour(rawColour: string): string {
  const lower = rawColour.toLowerCase().trim()
  for (const [bucket, values] of Object.entries(COLOUR_MAP)) {
    if (values.some(v => lower.includes(v))) return bucket
  }
  return rawColour
}

const STYLE_KEYWORDS: Record<string, string[]> = {
  'Casual':    ['casual', 'everyday', 'relaxed', 'comfort', 'leisurewear'],
  'Birou':     ['office', 'work', 'business', 'formal', 'professional', 'smart'],
  'Weekend':   ['weekend', 'leisure', 'saturday', 'brunch', 'daytime'],
  'Minimalist':['minimal', 'minimalist', 'clean', 'simple', 'understated', 'sleek'],
  'Clasic':    ['classic', 'timeless', 'traditional', 'elegant', 'tailored', 'refined'],
  'Boem':      ['bohemian', 'boho', 'flowy', 'floral', 'romantic', 'festival'],
  'Sport':     ['sporty', 'athletic', 'activewear', 'gym', 'yoga', 'running'],
  'Vară':      ['summer', 'beach', 'holiday', 'tropical', 'lightweight', 'linen'],
  'Toamnă':    ['autumn', 'fall', 'knit', 'wool', 'cosy', 'cozy', 'layering'],
  'Primăvară': ['spring', 'fresh', 'pastel', 'floral', 'transitional'],
}

export function extractStyleTags(
  description: string,
  spec: string,
  productType: string,
  merchantCategory: string
): string[] {
  const text = [description, spec, productType, merchantCategory].join(' ').toLowerCase()
  const tags: string[] = []
  for (const [tag, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) tags.push(tag)
  }
  return tags
}

// ─── unique helper — avoids Set spread (TS es5 compat) ───────
function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i)
}

// ─── Build filter options from live product catalogue ─────────
export function buildFilterOptions(products: Product[]): FilterOptions {
  const categories = unique(products.map(p => p.merchant_category)).sort()
  const rawColours = unique(products.flatMap(p => p.colours))
  const colours    = unique(rawColours.map(normaliseColour)).sort()
  const brands     = unique(products.map(p => p.brand)).sort()
  const style_tags = unique(products.flatMap(p => p.style_tags)).sort()
  const genders    = unique(products.map(p => p.gender)).filter(Boolean).sort()
  const materials  = unique(products.map(p => p.material)).filter(Boolean).sort()
  const platforms  = unique(products.map(p => p.platform === 'aboutyou' ? 'About You' : 'Zalando'))
  const prices     = products.map(p => p.price_eur)

  return {
    categories,
    colours,
    brands,
    style_tags,
    genders,
    materials,
    platforms,
    price_range: {
      min: prices.length > 0 ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length > 0 ? Math.ceil(Math.max(...prices)) : 1000,
    },
  }
}

// ─── Apply filters to product array ──────────────────────────
export function applyFilters(products: Product[], f: ProductFilters): Product[] {
  let result = [...products]

  if (f.platform.length > 0) {
    result = result.filter(p => {
      const display = p.platform === 'aboutyou' ? 'About You' : 'Zalando'
      return f.platform.includes(display)
    })
  }
  if (f.category.length > 0) {
    result = result.filter(p => f.category.includes(p.merchant_category))
  }
  if (f.colour.length > 0) {
    const rawValues = f.colour.flatMap(bucket => COLOUR_MAP[bucket] || [bucket.toLowerCase()])
    result = result.filter(p =>
      p.colours.some(c => rawValues.some(rv => c.toLowerCase().includes(rv)))
    )
  }
  if (f.style_tags.length > 0) {
    result = result.filter(p => p.style_tags.some(t => f.style_tags.includes(t)))
  }
  if (f.gender.length > 0) {
    result = result.filter(p => f.gender.includes(p.gender))
  }
  if (f.material.length > 0) {
    result = result.filter(p => f.material.includes(p.material))
  }
  if (f.brand.length > 0) {
    result = result.filter(p => f.brand.includes(p.brand))
  }
  if (f.price_min !== null) {
    result = result.filter(p => p.price_eur >= f.price_min!)
  }
  if (f.price_max !== null) {
    result = result.filter(p => p.price_eur <= f.price_max!)
  }
  if (f.in_stock) {
    result = result.filter(p => p.in_stock)
  }
  return result
}

// ─── Convert quiz answers → initial filter state ──────────────
export function quizToFilters(answers: QuizAnswers): Partial<ProductFilters> {
  const genderMap: Record<string, string[]> = {
    women:  ['Femei', 'Women', 'Female'],
    men:    ['Bărbați', 'Men', 'Male'],
    unisex: ['Unisex', 'Femei', 'Bărbați', 'Men', 'Women'],
  }
  const colourBucketMap: Record<string, string> = {
    'Neutre': 'Bej', 'Pământii': 'Maro', 'Bleumarin': 'Albastru',
    'Negru & alb': 'Negru', 'Pastel': 'Roz', 'Kaki': 'Kaki',
  }
  const styleTagMap: Record<string, string> = {
    'Minimalist': 'Minimalist', 'Clasic': 'Clasic',
    'Casual': 'Casual', 'Boem': 'Boem',
    'Business': 'Birou', 'Romantic': 'Boem',
  }
  const occasionTagMap: Record<string, string> = {
    'Birou & business': 'Birou',
    'Weekend & plimbări': 'Weekend',
    'Casual zilnic': 'Casual',
  }

  const colours     = unique(answers.colors.map(c => colourBucketMap[c]).filter(Boolean))
  const style_tags  = unique([
    ...answers.style.map(s => styleTagMap[s]).filter(Boolean),
    ...answers.occasion.map(o => occasionTagMap[o]).filter(Boolean),
  ])

  return {
    gender:     genderMap[answers.gender] || [],
    colour:     colours,
    style_tags,
    price_max:  answers.budget,
    in_stock:   true,
  }
}
