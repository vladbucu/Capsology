'use client'
import { Suspense } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ─── Types ────────────────────────────────────────────────────
interface CartItem {
  id: string
  name: string
  brand: string
  category: string
  price_eur: number
  image_url: string
  platform: string
}

interface GuestInfo {
  email: string
  phone: string
  full_name: string
  line1: string
  city: string
  county: string
  postal_code: string
}

function CheckoutPageInner() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const tier      = (searchParams.get('tier') || 'unlock') as 'unlock' | 'full_service'
  const capsuleId = searchParams.get('capsule_id') || ''

  const [items, setItems]         = useState<CartItem[]>([])
  const [capsuleTotal, setCapsuleTotal] = useState(0)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [guest, setGuest]         = useState<GuestInfo>({
    email: '', phone: '', full_name: '', line1: '', city: '', county: '', postal_code: ''
  })
  const [agreed, setAgreed]       = useState(false)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]       = useState<Record<string, string>>({})

  // ─── Load capsule items ───────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!capsuleId) { setLoading(false); return }
      try {
        const res = await fetch(`/api/capsule/${capsuleId}/items`)
        const data = await res.json()
        setItems(data.items || [])
        setCapsuleTotal(data.total_eur || 0)
      } catch {
        // fallback: use sessionStorage if API not yet wired
        const stored = sessionStorage.getItem('capsule_items')
        if (stored) {
          const parsed = JSON.parse(stored)
          setItems(parsed)
          setCapsuleTotal(parsed.reduce((s: number, i: CartItem) => s + i.price_eur, 0))
        }
      }
      setLoading(false)
    }
    load()
  }, [capsuleId])

  // ─── Removal rules ────────────────────────────────────────────
  const maxRemovable = useMemo(() => {
    if (items.length === 0) return 0
    // Max 10% removable, minimum 1 item always kept
    return Math.max(1, Math.floor(items.length * 0.1))
  }, [items.length])

  const activeItems = items.filter(i => !removedIds.has(i.id))

  const canRemove = (id: string) => {
    if (tier === 'unlock') return false          // unlock: all or nothing
    if (removedIds.has(id)) return false         // already removed
    if (removedIds.size >= maxRemovable) return false  // hit cap
    if (activeItems.length <= 1) return false    // must keep at least 1
    return true
  }

  const toggleRemove = (id: string) => {
    if (!canRemove(id) && !removedIds.has(id)) return
    setRemovedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Price calculation ────────────────────────────────────────
  const clothingTotal = activeItems.reduce((s, i) => s + i.price_eur, 0)
  const serviceFee    = tier === 'unlock' ? 3 : 15
  const grandTotal    = serviceFee  // user pays only service fee; clothing ordered separately

  // ─── Validation ───────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {}
    if (!guest.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email invalid'
    if (tier === 'full_service') {
      if (!guest.full_name.trim()) e.full_name = 'Câmp obligatoriu'
      if (!guest.phone.match(/^(\+4)?07\d{8}$/)) e.phone = 'Număr de telefon invalid (format RO)'
      if (!guest.line1.trim()) e.line1 = 'Câmp obligatoriu'
      if (!guest.city.trim()) e.city = 'Câmp obligatoriu'
      if (!guest.county.trim()) e.county = 'Câmp obligatoriu'
      if (!guest.postal_code.match(/^\d{6}$/)) e.postal_code = 'Cod poștal invalid (6 cifre)'
    }
    if (!agreed) e.agreed = 'Trebuie să confirmi condițiile'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ─── Submit to Stripe ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capsule_id: capsuleId,
          tier,
          guest_info: guest,
          removed_item_ids: Array.from(removedIds),
        }),
      })
      const data = await res.json()
      if (data.checkout_url) window.location.href = data.checkout_url
      else throw new Error(data.error || 'Checkout failed')
    } catch (err: any) {
      setErrors({ submit: err.message })
      setSubmitting(false)
    }
  }

  const Field = ({ k, label, placeholder, type = 'text', half = false }: {
    k: keyof GuestInfo; label: string; placeholder: string; type?: string; half?: boolean
  }) => (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input type={type} placeholder={placeholder}
        value={guest[k]}
        onChange={e => setGuest(p => ({ ...p, [k]: e.target.value }))}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-stone-50 focus:outline-none focus:border-stone-500 transition-colors ${
          errors[k] ? 'border-red-300 bg-red-50' : 'border-stone-200'
        }`} />
      {errors[k] && <p className="text-xs text-red-500 mt-1">{errors[k]}</p>}
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm animate-pulse">Se încarcă...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50">

      {/* Nav */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href={`/capsule/${capsuleId}`} className="text-stone-400 hover:text-stone-700 text-sm">← Înapoi</Link>
        <span className="font-display text-lg tracking-wide">Capsology</span>
        <div className="w-16" />
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-1">Checkout</p>
          <h1 className="font-display text-3xl font-light text-stone-900">
            {tier === 'unlock' ? 'Deblochează capsula' : 'Serviciu complet'}
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {tier === 'unlock'
              ? 'Primești brandurile și linkurile. Comanzi tu direct pe platformele partenere.'
              : 'Comandăm și livrăm întreaga capsulă direct la tine acasă.'}
          </p>
        </div>

        {/* ── NON-REFUNDABLE BANNER ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠</div>
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">
                Taxa de serviciu este nerambursabilă
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {tier === 'unlock'
                  ? 'Conform legislației UE privind conținutul digital (Directiva 2019/770), taxa de €3 nu poate fi rambursată odată ce accesul la linkuri este furnizat. Prin continuare, ești de acord cu livrarea imediată a serviciului digital și renunți la dreptul de retragere de 14 zile.'
                  : 'Taxa de serviciu de €15 reprezintă contraprestația pentru serviciul de comandă și nu poate fi rambursată odată ce comanda a fost plasată. Articolele de îmbrăcăminte pot fi returnate direct la About You sau Zalando conform politicii lor de retur (30 de zile). Capsology nu intermediază returnările.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── CART (full service only) ── */}
        {tier === 'full_service' && items.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-800">Coșul tău</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Poți elimina maxim {maxRemovable} {maxRemovable === 1 ? 'piesă' : 'piese'} din capsulă
                </p>
              </div>
              <div className="text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded-full border border-stone-200">
                {activeItems.length}/{items.length} piese
              </div>
            </div>

            <div className="divide-y divide-stone-50">
              {items.map(item => {
                const removed  = removedIds.has(item.id)
                const removable = canRemove(item.id)
                return (
                  <div key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-opacity ${removed ? 'opacity-40' : ''}`}>
                    <img src={item.image_url} alt={item.name}
                      className="w-12 h-14 rounded-lg object-cover bg-stone-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{item.name}</p>
                      {/* Brand visible in checkout (user is about to pay, brand shown here is fine) */}
                      <p className="text-xs text-stone-400 mt-0.5">{item.brand} · {item.category}</p>
                    </div>
                    <span className="text-sm font-medium text-stone-800 flex-shrink-0">
                      €{item.price_eur.toFixed(0)}
                    </span>
                    {tier === 'full_service' && (
                      <button onClick={() => toggleRemove(item.id)}
                        disabled={!removable && !removed}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 text-xs transition-all ${
                          removed
                            ? 'border-green-300 bg-green-50 text-green-600'
                            : removable
                            ? 'border-stone-300 text-stone-400 hover:border-red-300 hover:text-red-400'
                            : 'border-stone-100 text-stone-200 cursor-not-allowed'
                        }`}
                        title={removed ? 'Adaugă înapoi' : removable ? 'Elimină' : 'Limita de eliminare atinsă'}>
                        {removed ? '+' : '×'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Cart totals */}
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 space-y-1.5">
              <div className="flex justify-between text-xs text-stone-500">
                <span>Valoare îmbrăcăminte ({activeItems.length} piese)</span>
                <span>€{clothingTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-500">
                <span>Taxă serviciu comandă & livrare</span>
                <span>€{serviceFee}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-stone-800 pt-1 border-t border-stone-200">
                <span>Plătești acum</span>
                <span>€{serviceFee} <span className="text-xs font-normal text-stone-400">(taxa serviciu)</span></span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Suma de €{clothingTotal.toFixed(0)} pentru îmbrăcăminte va fi colectată direct de About You / Zalando la livrare sau prin linkurile furnizate.
              </p>
            </div>

            {/* Return policy notice */}
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-medium">Politica de retur pentru îmbrăcăminte:</span> Returnările se fac direct la About You sau Zalando conform politicii lor standard (30 zile). Capsology nu intermediază returnările și nu rambursează taxa de serviciu de €15.
              </p>
            </div>
          </div>
        )}

        {/* ── UNLOCK summary ── */}
        {tier === 'unlock' && (
          <div className="bg-white border border-stone-200 rounded-xl px-4 py-4 mb-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-stone-600">Acces la linkuri & branduri</span>
              <span className="text-sm font-medium text-stone-800">€3.00</span>
            </div>
            <div className="text-xs text-stone-400 bg-stone-50 rounded-lg p-3 leading-relaxed">
              Vei primi imediat brandurile și linkurile de cumpărare pentru toate piesele capsulei. Linkurile About You sunt valabile <strong>7 zile</strong> — vei primi un email de reamintire. Linkurile Zalando sunt valabile 30 de zile.
            </div>
          </div>
        )}

        {/* ── Guest info form ── */}
        <div className="bg-white border border-stone-200 rounded-xl px-4 py-4 mb-5">
          <p className="text-sm font-medium text-stone-800 mb-4">
            {tier === 'full_service' ? 'Date de contact & livrare' : 'Email pentru confirmare'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field k="email" label="Email *" placeholder="adresa@email.com" type="email" />
            {tier === 'full_service' && (
              <>
                <Field k="full_name" label="Nume complet *" placeholder="Ion Popescu" />
                <Field k="phone" label="Telefon *" placeholder="07xx xxx xxx" type="tel" half />
                <div className="col-span-1" />
                <Field k="line1" label="Stradă și număr *" placeholder="Str. Exemplu, nr. 1" />
                <Field k="city" label="Oraș *" placeholder="București" half />
                <Field k="county" label="Județ *" placeholder="Ilfov" half />
                <Field k="postal_code" label="Cod poștal *" placeholder="012345" half />
              </>
            )}
          </div>
        </div>

        {/* ── Agreement checkbox ── */}
        <div className={`bg-white border rounded-xl px-4 py-4 mb-5 ${errors.agreed ? 'border-red-300' : 'border-stone-200'}`}>
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="mt-0.5 flex-shrink-0">
              <input type="checkbox" checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="w-4 h-4 accent-stone-800 cursor-pointer" />
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Confirm că am citit și sunt de acord cu{' '}
              <Link href="/terms" target="_blank" className="underline text-stone-800 hover:text-stone-600">
                Termenii și Condițiile Capsology
              </Link>
              {'. '}
              {tier === 'unlock'
                ? 'Înțeleg că taxa de €3 este nerambursabilă deoarece serviciul digital este livrat imediat și renunț la dreptul de retragere de 14 zile conform art. 16(m) din Directiva 2011/83/UE.'
                : 'Înțeleg că taxa de serviciu de €15 este nerambursabilă odată ce comanda este plasată și că retururile pentru îmbrăcăminte se fac direct la retailer.'}
            </p>
          </label>
          {errors.agreed && <p className="text-xs text-red-500 mt-2 ml-7">{errors.agreed}</p>}
        </div>

        {/* ── Submit ── */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">
            {errors.submit}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting}
          className={`w-full py-4 rounded-xl text-sm font-medium transition-all ${
            submitting
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98]'
          }`}>
          {submitting
            ? 'Se procesează...'
            : tier === 'unlock'
            ? 'Plătește €3 și deblochează capsula →'
            : `Plătește €15 taxa serviciu →`}
        </button>

        <p className="text-xs text-stone-400 text-center mt-3 leading-relaxed">
          Plată securizată prin Stripe. Datele cardului nu sunt stocate pe serverele Capsology.
          <br />
          <Link href="/terms" className="underline hover:text-stone-600">Termeni și condiții</Link>
          {' · '}
          <Link href="/privacy" className="underline hover:text-stone-600">Confidențialitate</Link>
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPage() { return <Suspense fallback={null}><CheckoutPageInner /></Suspense> }
