import Anthropic from '@anthropic-ai/sdk'
import type { QuizAnswers, Product } from './types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Filter products by quiz answers BEFORE sending to AI ─────
// This is the critical step: tags from the quiz map directly
// to tags on Awin products, so we pre-filter server-side.
export function filterProductsByAnswers(
  products: Product[],
  answers: QuizAnswers
): Product[] {
  return products.filter(p => {
    // 1. Gender filter
    if (p.gender !== answers.gender && p.gender !== 'unisex') return false
    // 2. Budget cap — no single item > 60% of total budget
    if (p.price_eur > answers.budget * 0.6) return false
    return true
  })
}

// ─── Score products by how well they match the quiz answers ───
// Higher score = better match, used to rank products for the AI
export function scoreProduct(product: Product, answers: QuizAnswers): number {
  let score = 0

  const productTags = (product.style_tags || []).map((t: string) => t.toLowerCase())
  const productColors = (product.colours || []).map((c: string) => c.toLowerCase())

  // Style matches (+3 each)
  for (const style of answers.style) {
    if (productTags.includes(style.toLowerCase())) score += 3
  }

  // Color matches (+3 each)
  for (const color of answers.colors) {
    if (productColors.includes(color.toLowerCase())) score += 3
  }

  // Occasion matches (+2 each)
  for (const occasion of answers.occasion) {
    if (productTags.includes(occasion.toLowerCase())) score += 2
  }

  // Platform preference — About You has higher commission (15% vs 7%)
  // Slightly prefer About You items to maximise commission
  if (product.platform === 'aboutyou') score += 1

  // Deprioritize flash sale / outlet inventory — products may expire
  // before user clicks through, leading to broken links post-unlock
  if ((product as any).source_type === 'flash') score -= 5

  return score
}

// ─── Build the AI prompt ──────────────────────────────────────
function buildPrompt(answers: QuizAnswers, products: Product[]): string {
  // Send top-scored products to the AI (limit to 80 to keep prompt manageable)
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
- Style preferences: ${answers.style.join(', ') || 'not specified'}
- Preferred colors: ${answers.colors.join(', ') || 'not specified'}
- Occasions: ${answers.occasion.join(', ') || 'not specified'}
- Sizes: top ${answers.size_top}, bottom ${answers.size_bottom}, shoes ${answers.size_shoes}
- Items to avoid: ${answers.avoid.join(', ') || 'none'}

SCORED PRODUCTS (pre-filtered to match user preferences — score = relevance):
${productList}

RULES:
1. Select 8–12 items that form a COHESIVE capsule within the €${answers.budget} budget
2. Must include: at least 2 tops, 2 bottoms, 1 outerwear (unless warm climate), 1 shoes
3. All items must work together (color harmony, style coherence)
4. Prefer higher-scored products — they match user preferences better
5. Prefer About You (higher commission) when quality and style are equal
6. Do NOT exceed the total budget

Respond ONLY with valid JSON — no preamble, no markdown fences:
{
  "selected_ids": ["id1", "id2", ...],
  "style_summary": "2-3 sentence poetic description of this capsule's aesthetic in Romanian",
  "color_story": "1 sentence about the color palette in Romanian"
}`
}

// ─── Main export ──────────────────────────────────────────────
export async function generateCapsule(
  answers: QuizAnswers,
  allProducts: Product[]
): Promise<{ selectedIds: string[]; styleSummary: string; colorStory: string }> {

  // Step 1: Filter products by quiz answers (gender, avoid tags, price)
  const filtered = filterProductsByAnswers(allProducts, answers)

  if (filtered.length === 0) {
    throw new Error('Nu s-au găsit produse pentru preferințele selectate.')
  }

  // Step 2: Call Claude with the filtered + scored products
  const prompt = buildPrompt(answers, filtered)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  return {
    selectedIds: parsed.selected_ids,
    styleSummary: parsed.style_summary,
    colorStory: parsed.color_story,
  }
}
// Fri Jun 19 11:15:25 EEST 2026
