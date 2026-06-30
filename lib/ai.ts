import Anthropic from '@anthropic-ai/sdk'
import type { QuizAnswers, Product } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export function filterProductsByAnswers(
  products: Product[],
  answers: QuizAnswers
): Product[] {
  return products.filter(p => {
    if (p.gender !== answers.gender && p.gender !== 'unisex') return false
    if (p.price_eur > answers.budget * 0.6) return false
    return true
  })
}

export function scoreProduct(product: Product, answers: QuizAnswers): number {
  let score = 0
  const productTags = (product.style_tags || []).map((t: string) => t.toLowerCase())
  const productColors = (product.colours || []).map((c: string) => c.toLowerCase())

  for (const style of answers.style || []) {
    if (productTags.includes(style.toLowerCase())) score += 3
  }
  for (const color of answers.colors || []) {
    if (productColors.includes(color.toLowerCase())) score += 3
  }
  for (const occasion of answers.occasion || []) {
    if (productTags.includes(occasion.toLowerCase())) score += 2
  }
  if (product.platform === 'aboutyou') score += 1
  if ((product as any).source_type === 'flash') score -= 5

  return score
}

function pickGuaranteedCapsule(products: Product[], answers: QuizAnswers): Product[] {
  const scored = products.map(p => ({ ...p, _score: scoreProduct(p, answers) }))

  const byCategory = (cat: string) =>
    scored.filter(p => p.category === cat).sort((a, b) => b._score - a._score)

  const tops    = byCategory('tops')
  const bottoms = [...byCategory('bottoms'), ...byCategory('dresses')]
  const shoes   = byCategory('shoes')
  const outerwear = byCategory('outerwear')
  const accessories = byCategory('accessories')

  const selected: Product[] = []
  const usedIds = new Set<string>()

  function addUnique(pool: Product[], count: number) {
    let added = 0
    for (const item of pool) {
      if (added >= count) break
      if (usedIds.has(item.id)) continue
      selected.push(item)
      usedIds.add(item.id)
      added++
    }
  }

  addUnique(tops, 2)
  addUnique(bottoms, 2)
  addUnique(shoes, 1)
  addUnique(outerwear, 1)
  addUnique(accessories, 1)

  return selected
}

function buildPrompt(answers: QuizAnswers, products: Product[]): string {
  const scored = products
    .map(p => ({ ...p, score: scoreProduct(p, answers) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 80)

  const productList = scored.map(p =>
    `ID:${p.id}|${p.brand} ${p.name}|${p.category}|€${p.price_eur}|${p.platform}|colors:${(p.colours||[]).join(',')}|tags:${(p.style_tags||[]).join(',')}|score:${p.score}`
  ).join('\n')

  return `You are an expert personal stylist creating a cohesive capsule wardrobe.

USER PROFILE:
- Gender: ${answers.gender}
- Budget: €${answers.budget} total
- Style preferences: ${(answers.style||[]).join(', ') || 'not specified'}
- Preferred colors: ${(answers.colors||[]).join(', ') || 'not specified'}
- Occasions: ${(answers.occasion||[]).join(', ') || 'not specified'}

SCORED PRODUCTS (pre-filtered, score = relevance):
${productList}

CRITICAL RULES — must follow exactly:
1. Select 8-12 items total
2. MANDATORY: at least 2 items with category="tops"
3. MANDATORY: at least 2 items with category="bottoms" (or "dresses")
4. MANDATORY: at least 1 item with category="shoes" — this is non-negotiable, never skip shoes
5. NEVER select the same product ID twice
6. Stay within the €${answers.budget} total budget
7. Prefer higher-scored products

Respond ONLY with valid JSON, no markdown:
{
  "selected_ids": ["id1", "id2", ...],
  "style_summary": "2-3 sentence poetic description in Romanian",
  "color_story": "1 sentence about the color palette in Romanian"
}`
}

export async function generateCapsule(
  answers: QuizAnswers,
  allProducts: Product[]
): Promise<{ selectedIds: string[]; styleSummary: string; colorStory: string }> {

  const filtered = filterProductsByAnswers(allProducts, answers)
  if (filtered.length === 0) {
    throw new Error('Nu s-au găsit produse pentru preferințele selectate.')
  }

  const prompt = buildPrompt(answers, filtered)

  let selectedIds: string[] = []
  let styleSummary = ''
  let colorStory = ''

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    selectedIds = [...new Set(parsed.selected_ids as string[])]
    styleSummary = parsed.style_summary
    colorStory = parsed.color_story
  } catch (err) {
    console.error('Claude generation failed, using fallback:', err)
  }

  const selectedProducts = filtered.filter(p => selectedIds.includes(p.id))
  const hasShoes   = selectedProducts.some(p => p.category === 'shoes')
  const hasTops    = selectedProducts.some(p => p.category === 'tops')
  const hasBottoms = selectedProducts.some(p => p.category === 'bottoms' || p.category === 'dresses')

  if (!hasShoes || !hasTops || !hasBottoms || selectedIds.length === 0) {
    const guaranteed = pickGuaranteedCapsule(filtered, answers)
    selectedIds = [...new Set(guaranteed.map(p => p.id))]
    if (!styleSummary) styleSummary = 'O capsulă echilibrată, gândită pentru stilul tău.'
    if (!colorStory) colorStory = 'Culori care se completează armonios.'
  }

  return { selectedIds, styleSummary, colorStory }
}
