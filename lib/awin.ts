import type { Product } from './types'

const AWIN_API_BASE = 'https://api.awin.com'
const PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID
const API_KEY = process.env.AWIN_API_KEY

// About You advertiser ID on Awin (Romania)
const ABOUT_YOU_ADVERTISER_ID = '14069'
// Zalando advertiser ID on Awin (Romania)  
const ZALANDO_ADVERTISER_ID = '13150'

// ─── Fetch product feed from Awin ────────────────────────────
export async function fetchAwinProducts(
  advertiserId: string,
  platform: 'aboutyou' | 'zalando',
  category?: string
): Promise<Product[]> {
  const params = new URLSearchParams({
    publisherId: PUBLISHER_ID!,
    format: 'json',
    ...(category && { categoryId: category }),
  })

  const res = await fetch(
    `${AWIN_API_BASE}/publishers/${PUBLISHER_ID}/programmes/${advertiserId}/productdata?${params}`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    }
  )

  if (!res.ok) throw new Error(`Awin API error: ${res.status}`)

  const data = await res.json()

  // Normalise Awin response into our Product type
  // Note: affiliate_url is kept server-side only, never returned to client
  return (data.products || []).map((item: any) => ({
    id: item.id || item.productId,
    platform,
    name: item.productName || item.name,
    brand: item.brandName || item.brand || 'Unknown',
    category: normaliseCategory(item.categoryName || item.category || ''),
    price_eur: parseFloat(item.displayPrice || item.price || '0'),
    image_url: item.imageUrl || item.image,
    colors: extractColors(item),
    tags: extractTags(item),
    gender: normaliseGender(item.gender || ''),
    // affiliate_url stored separately in DB, never in this client type
  }))
}

// ─── Helpers ─────────────────────────────────────────────────
function normaliseCategory(raw: string): Product['category'] {
  const r = raw.toLowerCase()
  if (r.includes('shirt') || r.includes('top') || r.includes('blouse') || r.includes('sweater')) return 'tops'
  if (r.includes('pant') || r.includes('trouser') || r.includes('jean') || r.includes('skirt') || r.includes('dress')) return 'bottoms'
  if (r.includes('jacket') || r.includes('coat') || r.includes('blazer')) return 'outerwear'
  if (r.includes('shoe') || r.includes('boot') || r.includes('sneaker') || r.includes('sandal')) return 'shoes'
  return 'accessories'
}

function normaliseGender(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes('woman') || r.includes('female') || r.includes('femei')) return 'women'
  if (r.includes('man') || r.includes('male') || r.includes('barbat')) return 'men'
  return 'unisex'
}

function extractColors(item: any): string[] {
  const colorField = item.colour || item.color || item.colours || ''
  if (!colorField) return []
  return colorField.split(/[,/]/).map((c: string) => c.trim().toLowerCase()).filter(Boolean)
}

function extractTags(item: any): string[] {
  const tags: string[] = []
  const desc = (item.description || item.productDescription || '').toLowerCase()
  const keywords = ['casual', 'formal', 'work', 'weekend', 'minimal', 'classic', 'summer', 'winter', 'spring', 'autumn']
  keywords.forEach(kw => { if (desc.includes(kw)) tags.push(kw) })
  return tags
}

// ─── Get all products for capsule generation ──────────────────
export async function getAllProducts(gender?: string): Promise<Product[]> {
  try {
    const [ayProducts, zProducts] = await Promise.all([
      fetchAwinProducts(ABOUT_YOU_ADVERTISER_ID, 'aboutyou'),
      fetchAwinProducts(ZALANDO_ADVERTISER_ID, 'zalando'),
    ])
    const all = [...ayProducts, ...zProducts]
    return gender ? all.filter(p => p.gender === gender || p.gender === 'unisex') : all
  } catch (error) {
    console.error('Awin fetch error:', error)
    // Return mock data in development if Awin API not configured
    return getMockProducts()
  }
}

// ─── Mock products for local development / testing ────────────
export function getMockProducts(): Product[] {
  const mock = (id: string, platform: 'aboutyou'|'zalando', name: string, brand: string,
    category: 'tops'|'bottoms'|'outerwear'|'shoes'|'accessories',
    price_eur: number, image_url: string, colours: string[], style_tags: string[], gender: string
  ): Product => ({
    id, platform, name, brand, category, price_eur, image_url,
    colours, style_tags, gender,
    merchant_category: category,
    google_category: category,
    material: '',
    in_stock: true,
  })

  return [
    mock('ay001','aboutyou','Classic White Shirt','Edited','tops',29.99,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',['white'],['Clasic','Birou','Casual'],'women'),
    mock('ay002','aboutyou','Straight Leg Jeans','Only','bottoms',39.99,'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',['blue'],['Casual','Weekend'],'women'),
    mock('ay003','aboutyou','Beige Trench Coat','Vila','outerwear',79.99,'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=400',['beige','camel'],['Clasic','Birou','Toamnă'],'women'),
    mock('ay004','aboutyou','Merino Knit Sweater','Object','tops',44.99,'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400',['camel','brown'],['Casual','Toamnă'],'women'),
    mock('za001','zalando','Wide Leg Trousers','Vero Moda','bottoms',34.99,'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=400',['black','grey'],['Birou','Minimalist'],'women'),
    mock('za002','zalando','White Sneakers','Tamaris','shoes',59.99,'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',['white'],['Casual','Weekend'],'women'),
    mock('za003','zalando','Linen Blazer','Selected Femme','outerwear',69.99,'https://images.unsplash.com/photo-1594938298603-c8148c4b4e30?w=400',['beige','sand'],['Birou','Primăvară'],'women'),
    mock('za004','zalando','Leather Ankle Boots','Anna Field','shoes',89.99,'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400',['black','brown'],['Clasic','Toamnă'],'women'),
    mock('ay005','aboutyou','Silk Slip Dress','Y.A.S','bottoms',49.99,'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400',['nude','cream'],['Casual','Vară'],'women'),
    mock('ay006','aboutyou','Striped Marinière Top','JDY','tops',19.99,'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=400',['navy','white'],['Casual','Primăvară'],'women'),
    mock('za005','zalando','Crossbody Bag','Pieces','accessories',29.99,'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',['tan','camel'],['Clasic','Casual'],'unisex'),
    mock('za006','zalando','Slim Fit Chinos','Jack & Jones','bottoms',44.99,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',['khaki','olive'],['Casual','Birou'],'men'),
  ]
}
