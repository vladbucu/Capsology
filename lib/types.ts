// ─── Quiz ────────────────────────────────────────────────────
export interface QuizAnswers {
  gender: 'women' | 'men' | 'unisex'
  budget: number
  style: string[]
  colors: string[]
  occasion: string[]
  size_top: string
  size_bottom: string
  size_shoes: string
  avoid: string[]
}

// ─── Filter state — maps 1:1 to Awin feed fields ─────────────
export interface ProductFilters {
  // merchant_category / google_product_category path
  category: string[]
  // colour field (normalised)
  colour: string[]
  // brand_name field
  brand: string[]
  // parsed from description + spec + product_type at ingest
  style_tags: string[]
  // gender field (from spec / product_type)
  gender: string[]
  // material field
  material: string[]
  // platform source (About You | Zalando)
  platform: string[]
  // price field range
  price_min: number | null
  price_max: number | null
  // in_stock field
  in_stock: boolean
}

export const DEFAULT_FILTERS: ProductFilters = {
  category:  [],
  colour:    [],
  brand:     [],
  style_tags:[],
  gender:    [],
  material:  [],
  platform:  [],
  price_min: null,
  price_max: null,
  in_stock:  true,
}

// ─── Product (safe — no affiliate URL) ───────────────────────
// All fields map directly to Awin product feed fields
export interface Product {
  id: string
  // Awin: publisher source
  platform: 'aboutyou' | 'zalando'
  // Awin: product_name
  name: string
  // Awin: brand_name
  brand: string
  // Awin: merchant_category (normalised)
  category: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories'
  // Awin: merchant_category (raw, for filtering)
  merchant_category: string
  // Awin: google_product_category (full path)
  google_category: string
  // Awin: price
  price_eur: number
  // Awin: imgurl (large image)
  image_url: string
  // Awin: colour field (array, normalised)
  colours: string[]
  // Awin: extracted from description + spec
  style_tags: string[]
  // Awin: gender (from spec / product_type)
  gender: string
  // Awin: material (from spec)
  material: string
  // Awin: in_stock
  in_stock: boolean
}

// ─── Product with affiliate link (only after payment) ─────────
export interface ProductUnlocked extends Product {
  affiliate_url: string
}

// ─── Capsule ─────────────────────────────────────────────────
export interface Capsule {
  id: string
  items: Product[]
  items_unlocked?: ProductUnlocked[]
  status: 'preview' | 'unlocked' | 'ordered'
  total_price_eur: number
  style_summary: string
  created_at: string
  unlocked_at?: string
  expires_at?: string
}

// ─── Payment tiers ────────────────────────────────────────────
export type PaymentTier = 'unlock' | 'full_service'

export const PRICES = {
  unlock: 300,
  full_service: 1500,
} as const

// ─── Delivery address ─────────────────────────────────────────
export interface DeliveryAddress {
  full_name: string
  line1: string
  line2?: string
  city: string
  county: string
  postal_code: string
  phone: string
}

// ─── Filter option groups (built from live feed data) ─────────
export interface FilterOptions {
  categories: string[]
  colours: string[]        // normalised display names
  brands: string[]
  style_tags: string[]
  genders: string[]
  materials: string[]
  platforms: string[]
  price_range: { min: number; max: number }
}
