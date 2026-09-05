import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface Product {
  id: string
  brand: string
  name: string
  category: string
  price_ron: number
  image_url: string
  image_urls?: string[]
  colours?: string[]
  style_tags?: string[]
  gender: string
  affiliate_url?: string
}

export interface QuizAnswers {
  budget: number            // RON
  colors: string[]
  style: string[]
  occasion: string[]
  size_top?: string
  size_bottom?: string
  size_shoes?: string
}

export interface Outfit {
  id: string
  name: string              // "Urban Minimal"
  description: string       // "Curata, moderna si versatila."
  occasion: string
  season: string
  style: string
  products: Product[]
  total_ron: number
  hero_image?: string
}

// ─── Filtrare de baza ─────────────────────────────────────────
export function filterProducts(products: Product[], answers: QuizAnswers): Product[] {
  return products.filter(p => {
    // Doar barbati + unisex
    if (p.gender !== 'men' && p.gender !== 'unisex') return false
    // O singura piesa nu poate depasi 55% din buget
    if (p.price_ron > answers.budget * 0.55) return false
    return true
  })
}

// ─── Scoring ──────────────────────────────────────────────────
export function scoreProduct(p: Product, answers: QuizAnswers): number {
  let score = 0
  const tags = (p.style_tags || []).map(t => t.toLowerCase())
  const cols = (p.colours || []).map(c => c.toLowerCase())

  for (const s of answers.style || [])
    if (tags.includes(s.toLowerCase())) score += 3
  for (const c of answers.colors || [])
    if (cols.some(pc => pc.includes(c.toLowerCase()) || c.toLowerCase().includes(pc))) score += 3
  for (const o of answers.occasion || [])
    if (tags.includes(o.toLowerCase())) score += 2

  return score
}

// ─── Fallback mecanic: construieste 3 tinute garantat ─────────
function buildFallbackOutfits(products: Product[], answers: QuizAnswers): Outfit[] {
  const scored = products
    .map(p => ({ ...p, _s: scoreProduct(p, answers) }))
    .sort((a, b) => b._s - a._s)

  const byCat = (c: string) => scored.filter(p => p.category === c)
  const tops   = byCat('tops')
  const bottoms= byCat('bottoms')
  const shoes  = byCat('shoes')
  const outer  = byCat('outerwear')
  const acc    = byCat('accessories')

  const ARCHETYPES = [
    { name: 'Urban Minimal',   description: 'Curata, moderna si versatila. Perfecta pentru zi de zi.', occasion: 'Zi de zi', season: 'Primavara / Vara',  style: 'Casual / Minimal' },
    { name: 'Smart Casual',    description: 'Echilibrul perfect intre business si relaxare.',          occasion: 'Birou / Intalniri', season: 'Primavara / Toamna', style: 'Smart Casual' },
    { name: 'Relaxed Weekend', description: 'Confortabila, dar pusa la punct. Pentru timpul liber.',   occasion: 'Weekend', season: 'Vara',              style: 'Relaxed' },
  ]

  const outfits: Outfit[] = []
  const globallyUsed = new Set<string>()

  for (let i = 0; i < 3; i++) {
    const used = new Set<string>()
    const picked: Product[] = []
    let total = 0

    // Alege prima piesa nefolosita global care incape in buget
    const take = (pool: Product[], required = false) => {
      for (const item of pool) {
        if (used.has(item.id)) continue
        if (!required && globallyUsed.has(item.id)) continue
        if (total + item.price_ron > answers.budget) continue
        picked.push(item); used.add(item.id); globallyUsed.add(item.id)
        total += item.price_ron
        return true
      }
      // Daca e obligatoriu si n-am gasit nimic, accepta si duplicat global
      if (required) {
        for (const item of pool) {
          if (used.has(item.id)) continue
          if (total + item.price_ron > answers.budget) continue
          picked.push(item); used.add(item.id)
          total += item.price_ron
          return true
        }
      }
      return false
    }

    take(tops, true)
    take(bottoms, true)
    take(shoes, true)
    take(outer)
    take(acc)

    if (picked.length >= 3) {
      outfits.push({
        id: `outfit-${i + 1}`,
        ...ARCHETYPES[i],
        products: picked,
        total_ron: total,
      })
    }
  }

  return outfits
}

// ─── Prompt ───────────────────────────────────────────────────
function buildPrompt(answers: QuizAnswers, products: Product[]): string {
  const scored = products
    .map(p => ({ ...p, s: scoreProduct(p, answers) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 90)

  const list = scored.map(p =>
    `${p.id}|${p.brand} ${p.name}|${p.category}|${p.price_ron}RON|culori:${(p.colours || []).join(',')}|stil:${(p.style_tags || []).join(',')}`
  ).join('\n')

  return `Esti stilist personal pentru barbati. Creezi 3 tinute COMPLETE si DISTINCTE, toate in acelasi buget.

PROFIL CLIENT
Buget maxim per tinuta: ${answers.budget} RON
Stil preferat: ${(answers.style || []).join(', ') || 'nespecificat'}
Culori preferate: ${(answers.colors || []).join(', ') || 'nespecificat'}
Ocazii: ${(answers.occasion || []).join(', ') || 'nespecificat'}

PRODUSE DISPONIBILE
${list}

REGULI OBLIGATORII
1. Exact 3 tinute, fiecare cu 4-6 produse
2. Fiecare tinuta CONTINE OBLIGATORIU: 1 top, 1 bottom, 1 shoes. Optional: outerwear, accessories
3. Totalul fiecarei tinute trebuie sa fie sub ${answers.budget} RON, dar cat mai aproape de buget (minim 85% din buget)
4. Cele 3 tinute trebuie sa fie VIZIBIL DIFERITE ca stil si paleta de culori
5. NU repeta acelasi produs in doua tinute diferite
6. NU repeta acelasi produs de doua ori in aceeasi tinuta
7. Piesele dintr-o tinuta trebuie sa se asorteze cromatic

TON pentru descrieri: prieten care se pricepe la haine, nu revista de moda.
Bun: "O tinuta simpla, curata si usor de purtat."
Rau: "Silueta contemporana cu influente sartoriale."

Raspunde DOAR cu JSON valid, fara markdown:
{
  "outfits": [
    {
      "name": "Urban Minimal",
      "description": "Curata, moderna si versatila. Perfecta pentru zi de zi.",
      "occasion": "Zi de zi",
      "season": "Primavara / Vara",
      "style": "Casual / Minimal",
      "product_ids": ["id1","id2","id3","id4"]
    }
  ]
}`
}

// ─── Export principal ─────────────────────────────────────────
export async function generateOutfits(
  answers: QuizAnswers,
  allProducts: Product[]
): Promise<Outfit[]> {

  const pool = filterProducts(allProducts, answers)
  if (pool.length < 6) {
    throw new Error('Nu sunt suficiente produse pentru bugetul selectat. Incearca un buget mai mare.')
  }

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildPrompt(answers, pool) }],
    })

    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    const outfits: Outfit[] = (parsed.outfits || []).map((o: any, i: number) => {
      const ids = [...new Set(o.product_ids as string[])]
      const prods = ids
        .map(id => pool.find(p => p.id === id))
        .filter(Boolean) as Product[]
      return {
        id: `outfit-${i + 1}`,
        name: o.name,
        description: o.description,
        occasion: o.occasion || '',
        season: o.season || '',
        style: o.style || '',
        products: prods,
        total_ron: prods.reduce((s, p) => s + p.price_ron, 0),
      }
    })

    // Validare: fiecare tinuta trebuie sa aiba top+bottom+shoes si sa fie in buget
    const valid = outfits.filter(o =>
      o.products.some(p => p.category === 'tops') &&
      o.products.some(p => p.category === 'bottoms') &&
      o.products.some(p => p.category === 'shoes') &&
      o.total_ron <= answers.budget &&
      o.products.length >= 3
    )

    if (valid.length === 3) return valid

    // Completam ce lipseste din fallback
    const fallback = buildFallbackOutfits(pool, answers)
    return [...valid, ...fallback].slice(0, 3)

  } catch (err) {
    console.error('AI outfit generation failed, using fallback:', err)
    return buildFallbackOutfits(pool, answers)
  }
}

// ─── Inlocuire piesa individuala ──────────────────────────────
export function findAlternatives(
  current: Product,
  allProducts: Product[],
  answers: QuizAnswers,
  outfitTotal: number,
  excludeIds: string[] = []
): Product[] {
  const budgetLeft = answers.budget - (outfitTotal - current.price_ron)

  return allProducts
    .filter(p =>
      p.category === current.category &&
      p.id !== current.id &&
      !excludeIds.includes(p.id) &&
      (p.gender === 'men' || p.gender === 'unisex') &&
      p.price_ron <= budgetLeft
    )
    .map(p => ({ ...p, _s: scoreProduct(p, answers) }))
    .sort((a, b) => b._s - a._s)
    .slice(0, 8)
}
