import type { Product } from './types'

const API_BASE = 'https://api.profitshare.ro'
const API_USER = process.env.PROFITSHARE_API_USER!
const API_KEY  = process.env.PROFITSHARE_API_KEY!

// ─── HMAC-SHA1 signature (Profitshare auth method) ───────────
async function sign(
  method: string,
  endpoint: string,
  queryString: string,
  date: string
): Promise<string> {
  const message = `${method}${endpoint}/?${queryString}/${API_USER}${date}`
  const encoder = new TextEncoder()
  const keyData  = encoder.encode(API_KEY)
  const msgData  = encoder.encode(message)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Core API call ────────────────────────────────────────────
async function apiCall(endpoint: string, params: Record<string, any> = {}) {
  const date = new Date().toUTCString()
  const queryString = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) =>
      typeof v === 'object'
        ? Object.entries(v).map(([k2, v2]) => [`${k}[${k2}]`, String(v2)])
        : [[k, String(v)]]
    )
  ).toString()

  const auth = await sign('GET', endpoint, queryString, date)
  const url  = `${API_BASE}/${endpoint}/?${queryString}`

  const res = await fetch(url, {
    headers: {
      'Date':      date,
      'X-PS-Client': API_USER,
      'X-PS-Accept': 'json',
      'X-PS-Auth':   auth,
    },
    next: { revalidate: 3600 },
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.result
}

// ─── Get list of advertisers you're approved for ──────────────
export async function getProfitshareAdvertisers() {
  return apiCall('affiliate-advertisers')
}

// ─── Get products for a specific advertiser ───────────────────
// advertiser = advertiser ID from getProfitshareAdvertisers()
// page = 1-based page number (each page = 50 products)
export async function getProfitshareProducts(
  advertiserId: number,
  page = 1
): Promise<Product[]> {
  const raw = await apiCall('affiliate-products', {
    filters: { advertiser: advertiserId },
    page,
  })

  if (!Array.isArray(raw)) return []

  return raw.map((item: any): Product => ({
    id:               `ps_${item.id || item.product_id}`,
    platform:         'aboutyou', // Profitshare is the network — platform shown as source
    name:             item.title || item.name || '',
    brand:            item.brand || item.manufacturer || '',
    category:         normaliseCategory(item.category || item.type || ''),
    merchant_category: item.category || '',
    google_category:  item.category || '',
    price_eur:        parseFloat(item.price || item.sale_price || '0'),
    image_url:        item.image_url || item.image || '',
    colours:          extractColours(item),
    style_tags:       extractStyleTags(item),
    gender:           normaliseGender(item.gender || ''),
    material:         item.material || '',
    in_stock:         item.availability !== 'outofstock' && item.stock !== '0',
    // affiliate_url stored separately — never exposed to client
  }))
}

// ─── Get ALL products across all pages for one advertiser ─────
export async function getAllProfitshareProductsForAdvertiser(
  advertiserId: number
): Promise<Product[]> {
  const allProducts: Product[] = []
  let page = 1

  while (true) {
    const products = await getProfitshareProducts(advertiserId, page)
    if (!products || products.length === 0) break
    allProducts.push(...products)
    if (products.length < 50) break  // last page
    page++
    // Rate limiting — be polite to the API
    await new Promise(r => setTimeout(r, 200))
  }

  return allProducts
}

// ─── Get affiliate link for a product ────────────────────────
// Called server-side only after payment confirmed
export async function getProfitshareAffiliateLink(
  productId: string,
  advertiserId: number
): Promise<string> {
  try {
    const result = await apiCall('affiliate-links', {
      links: [{ product_id: productId, advertiser_id: advertiserId }]
    })
    return result?.[0]?.affiliate_url || '#'
  } catch {
    return '#'
  }
}

// ─── Main export — matches same signature as lib/awin.ts ──────
export async function getAllProducts(gender?: string): Promise<Product[]> {
  try {
    // Get approved advertisers
    const advertisers = await getProfitshareAdvertisers()
    if (!Array.isArray(advertisers) || advertisers.length === 0) {
      console.log('No approved advertisers yet — using mock products')
      return getMockProducts()
    }

    // Pull products from all approved fashion advertisers
    const fashionAdvertisers = advertisers.filter((a: any) =>
      ['fashion', 'clothing', 'shoes', 'moda', 'haine', 'incaltaminte']
        .some(kw => (a.category || a.name || '').toLowerCase().includes(kw))
    )

    const allProducts: Product[] = []
    for (const advertiser of fashionAdvertisers.slice(0, 5)) {
      const products = await getAllProfitshareProductsForAdvertiser(advertiser.id)
      allProducts.push(...products)
    }

    if (allProducts.length === 0) return getMockProducts()

    // Filter by gender if specified
    return gender
      ? allProducts.filter(p => p.gender === gender || p.gender === 'unisex')
      : allProducts

  } catch (error) {
    console.error('Profitshare API error:', error)
    return getMockProducts()
  }
}

// ─── Normalisers ─────────────────────────────────────────────
function normaliseCategory(raw: string): Product['category'] {
  const r = raw.toLowerCase()
  if (r.includes('shirt') || r.includes('top') || r.includes('bluza') ||
      r.includes('tricou') || r.includes('pulover') || r.includes('jacheta'))
    return 'tops'
  if (r.includes('pant') || r.includes('jean') || r.includes('fusta') ||
      r.includes('rochie') || r.includes('dress') || r.includes('skirt'))
    return 'bottoms'
  if (r.includes('palton') || r.includes('coat') || r.includes('jacket') ||
      r.includes('geaca') || r.includes('blazer'))
    return 'outerwear'
  if (r.includes('pantofi') || r.includes('shoe') || r.includes('boot') ||
      r.includes('ghete') || r.includes('sneaker') || r.includes('sandal'))
    return 'shoes'
  return 'accessories'
}

function normaliseGender(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes('femei') || r.includes('women') || r.includes('female') || r.includes('dama'))
    return 'women'
  if (r.includes('barbat') || r.includes('men') || r.includes('male') || r.includes('baieti'))
    return 'men'
  return 'unisex'
}

function extractColours(item: any): string[] {
  const raw = item.color || item.colour || item.culoare || ''
  if (!raw) return []
  return String(raw).split(/[,/|]/).map((c: string) => c.trim().toLowerCase()).filter(Boolean)
}

function extractStyleTags(item: any): string[] {
  const text = [
    item.description || '',
    item.category || '',
    item.tags || '',
    item.keywords || '',
  ].join(' ').toLowerCase()

  const tags: string[] = []
  const map: Record<string, string[]> = {
    'Casual':    ['casual', 'relaxed', 'everyday', 'zi de zi'],
    'Birou':     ['office', 'business', 'formal', 'birou', 'profesional'],
    'Weekend':   ['weekend', 'leisure', 'timp liber'],
    'Minimalist':['minimal', 'minimalist', 'simplu', 'clean'],
    'Clasic':    ['clasic', 'classic', 'elegant', 'timeless'],
    'Boem':      ['boho', 'bohemian', 'romantic', 'floral'],
    'Sport':     ['sport', 'athletic', 'activ', 'gym'],
    'Vară':      ['vara', 'summer', 'beach', 'plaja'],
    'Toamnă':    ['toamna', 'autumn', 'fall', 'knit', 'tricotat'],
  }
  for (const [tag, keywords] of Object.entries(map)) {
    if (keywords.some(kw => text.includes(kw))) tags.push(tag)
  }
  return tags
}

// ─── Mock products (used when API not yet configured) ────────
export function getMockProducts(): Product[] {
  const m = (
    id: string, pl: 'aboutyou'|'zalando', name: string, brand: string,
    cat: 'tops'|'bottoms'|'outerwear'|'shoes'|'accessories',
    price: number, img: string, colours: string[], style_tags: string[], gender: string
  ): Product => ({
    id, platform: pl, name, brand, category: cat, price_eur: price,
    image_url: img, colours, style_tags, gender,
    merchant_category: cat, google_category: cat, material: '', in_stock: true,
  })
  return [
    m('ps001','aboutyou','Cămașă albă clasică','Edited','tops',29.99,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',['white'],['Clasic','Birou','Casual'],'women'),
    m('ps002','aboutyou','Jeans drepți','Only','bottoms',39.99,'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',['blue'],['Casual','Weekend'],'women'),
    m('ps003','aboutyou','Trench coat bej','Vila','outerwear',79.99,'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400',['beige'],['Clasic','Birou'],'women'),
    m('ps004','aboutyou','Pulover merino','Object','tops',44.99,'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400',['camel'],['Casual','Toamnă'],'women'),
    m('ps005','zalando','Pantaloni wide-leg','Vero Moda','bottoms',34.99,'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=400',['black'],['Birou','Minimalist'],'women'),
    m('ps006','zalando','Sneakers albi','Tamaris','shoes',59.99,'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',['white'],['Casual','Weekend'],'women'),
    m('ps007','zalando','Blazer linen','Selected Femme','outerwear',69.99,'https://images.unsplash.com/photo-1594938298603-c8148c4b4e30?w=400',['beige'],['Birou','Casual'],'women'),
    m('ps008','zalando','Cizme ankle','Anna Field','shoes',89.99,'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400',['black'],['Clasic','Toamnă'],'women'),
    m('ps009','aboutyou','Rochie slip midi','Y.A.S','bottoms',49.99,'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400',['nude'],['Casual','Vară'],'women'),
    m('ps010','aboutyou','Top dungi marine','JDY','tops',19.99,'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=400',['navy'],['Casual','Vară'],'women'),
    m('ps011','zalando','Geantă crossbody','Pieces','accessories',29.99,'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',['tan'],['Clasic','Casual'],'unisex'),
    m('ps012','zalando','Chinos slim fit','Jack & Jones','bottoms',44.99,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',['khaki'],['Casual','Birou'],'men'),
  ]
}
