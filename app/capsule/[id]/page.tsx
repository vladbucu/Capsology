'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LangToggle, useLang } from '@/lib/lang'
import type { Capsule } from '@/lib/types'

type AnyProduct = any

interface CatGroup {
  id: 'top' | 'bottom' | 'shoe'
  label: string
  dotColor: string
  items: AnyProduct[]
}

const CAT_DEF: Omit<CatGroup, 'items'>[] = [
  { id: 'top',    label: 'Top & bluze',       dotColor: '#378ADD' },
  { id: 'bottom', label: 'Pantaloni & fuste',  dotColor: '#1D9E75' },
  { id: 'shoe',   label: 'Încălțăminte',       dotColor: '#BA7517' },
]

export default function CapsulePage() {
  const { id }       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { t }        = useLang()

  const [capsule, setCapsule]         = useState<Capsule | null>(null)
  const [loading, setLoading]         = useState(true)
  const [cats, setCats]               = useState<CatGroup[]>([])
  const [capsuleTotal, setCapsuleTotal] = useState(0)
  const [selected, setSelected]       = useState<Record<string, string>>({})
  const [carPos, setCarPos]           = useState<Record<string, number>>({})
  const [scrambling, setScrambling]   = useState(false)
  const [savingCapsule, setSavingCapsule] = useState(false)
  const [saveCode, setSaveCode]       = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const paymentStatus = searchParams.get('payment')
  const isUnlocked = capsule?.status === 'unlocked' || capsule?.status === 'ordered'
  const daysLeft = capsule?.expires_at
    ? Math.max(0, Math.ceil((new Date(capsule.expires_at).getTime() - Date.now()) / 86400000))
    : null

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('capsules').select('*').eq('id', id).single()
      if (data) {
        setCapsule(data as Capsule)
        buildCats(data.items || [])
        if (data.save_code) setSaveCode(data.save_code)
      }
      setLoading(false)
    }
    load()
  }, [id])

  function buildCats(items: AnyProduct[]) {
    const grouped: CatGroup[] = CAT_DEF.map(def => ({
      ...def,
      items: items.filter(item => {
        if (def.id === 'top')    return item.category === 'tops'
        if (def.id === 'bottom') return item.category === 'bottoms' || item.category === 'dresses'
        if (def.id === 'shoe')   return item.category === 'shoes'
        return false
      })
    })).filter(c => c.items.length > 0)

    setCats(grouped)
    const total = grouped.reduce((sum, cat) => sum + (cat.items[0]?.price_eur || 0), 0)
    setCapsuleTotal(total)
    const defSel: Record<string, string> = {}
    const defPos: Record<string, number> = {}
    grouped.forEach(c => { defSel[c.id] = c.items[0]?.id || ''; defPos[c.id] = 0 })
    setSelected(defSel)
    setCarPos(defPos)
  }

  const getSelItem = useCallback((catId: string) => {
    const cat = cats.find(c => c.id === catId)
    return cat?.items.find(i => i.id === selected[catId]) || cat?.items[0]
  }, [cats, selected])

  // ─── Scramble entire capsule ───────────────────────────────
  const handleScramble = async () => {
    setScrambling(true)
    try {
      const res = await fetch('/api/generate-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: capsule?.quiz_answers || {},
          session_id: crypto.randomUUID(),
          exclude_ids: cats.flatMap(c => c.items.map((i: any) => i.id)),
        }),
      })
      const data = await res.json()
      if (data.items) buildCats(data.items)
    } catch (err) {
      console.error('Scramble failed:', err)
    }
    setScrambling(false)
  }

  // ─── Refresh single item in a category ────────────────────
  const handleRefreshItem = async (catId: string) => {
    const cat = cats.find(c => c.id === catId)
    if (!cat) return
    const currentIds = cat.items.map((i: any) => i.id)
    try {
      const res = await fetch('/api/generate-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: { ...(capsule?.quiz_answers || {}), category_override: catId },
          session_id: crypto.randomUUID(),
          exclude_ids: currentIds,
          single_category: catId,
        }),
      })
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        // Replace items in this category only
        setCats(prev => prev.map(c =>
          c.id === catId
            ? { ...c, items: data.items.filter((i: any) => {
                if (catId === 'top')    return i.category === 'tops'
                if (catId === 'bottom') return i.category === 'bottoms' || i.category === 'dresses'
                if (catId === 'shoe')   return i.category === 'shoes'
                return false
              }) }
            : c
        ))
      }
    } catch (err) {
      console.error('Refresh item failed:', err)
    }
  }

  // ─── Save capsule ──────────────────────────────────────────
  const handleSave = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to login with return URL
      router.push(`/auth/login?reason=save&capsule_id=${id}&redirect=/capsule/${id}`)
      return
    }

    setSavingCapsule(true)
    try {
      const res = await fetch('/api/capsule/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capsule_id: id }),
      })
      const data = await res.json()
      if (data.save_code) setSaveCode(data.save_code)
    } catch (err) {
      console.error('Save failed:', err)
    }
    setSavingCapsule(false)
  }

  const openCart = () => router.push(`/checkout?tier=full_service&capsule_id=${id}`)
  const handleUnlock = () => router.push(`/checkout?tier=unlock&capsule_id=${id}`)

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm animate-pulse">
        {t('Se încarcă capsula...', 'Loading your capsule...')}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* Top bar */}
      <nav className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-stone-400 hover:text-stone-700 text-sm">←</button>
          <span className="font-display text-lg tracking-wide">Capsology</span>
          <span className="text-sm text-stone-500 hidden sm:block">
            {t('Total', 'Total')}: <strong className="text-stone-900">€{Math.round(capsuleTotal)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />

          {/* Save capsule button */}
          {saveCode ? (
            <span className="text-xs font-mono bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full border border-stone-200">
              {saveCode}
            </span>
          ) : (
            <button onClick={handleSave} disabled={savingCapsule}
              className="px-3 py-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 hidden sm:flex items-center gap-1.5 disabled:opacity-50">
              {savingCapsule ? '...' : <>🪢 {t('Salvează capsula', 'Save capsule')}</>}
            </button>
          )}

          {!isUnlocked && (
            <>
              {/* Scramble button */}
              <button onClick={handleScramble} disabled={scrambling}
                className="px-3 py-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50 hidden sm:flex items-center gap-1.5">
                {scrambling ? '...' : <>🔀 {t('Regenerează', 'Regenerate')}</>}
              </button>
              <button onClick={openCart}
                className="px-3 py-1.5 text-xs border border-stone-300 rounded-lg hover:bg-stone-50 text-stone-700">
                {t('Serviciu complet €15', 'Full service €15')}
              </button>
              <button onClick={handleUnlock}
                className="px-3 py-1.5 text-xs bg-stone-900 text-white rounded-lg hover:bg-stone-800">
                🔓 {t('Deblochează €3', 'Unlock €3')}
              </button>
            </>
          )}
        </div>
      </nav>

      {paymentStatus === 'success' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-800">
          ✓ {searchParams.get('tier') === 'unlock'
            ? t(`Deblocat! Link-uri valabile ${daysLeft} zile.`, `Unlocked! Links valid for ${daysLeft} days.`)
            : t('Comandă plasată!', 'Order placed!')}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Center: continuous carousel stack ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl">
            {cats.map((cat, catIdx) => {
              const item = getSelItem(cat.id)
              const imgs: string[] = item?.image_url ? [item.image_url] : []
              const pos = carPos[cat.id] || 0
              const maxPos = Math.max(0, imgs.length - 1)

              return (
                <div key={cat.id}
                  className={catIdx < cats.length - 1 ? 'border-b border-stone-200' : ''}
                  style={{ position: 'relative', height: '220px' }}>

                  {/* Left arrow */}
                  <button onClick={() => setCarPos(p => ({ ...p, [cat.id]: Math.max(0, pos - 1) }))}
                    disabled={pos === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-25 hover:bg-stone-50"
                    aria-label={t('Anterior', 'Previous')}>
                    ‹
                  </button>

                  {/* Image */}
                  <div style={{ overflow: 'hidden', height: '100%' }}>
                    <div style={{ display: 'flex', height: '100%', transform: `translateX(-${pos * 100}%)`, transition: 'transform .3s ease' }}>
                      {imgs.map((url, i) => (
                        <div key={i} style={{ minWidth: '100%', height: '100%' }}>
                          <img src={url} alt={item?.name || ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      ))}
                      {imgs.length === 0 && (
                        <div className="min-w-full h-full bg-stone-100 flex items-center justify-center">
                          <span className="text-stone-300 text-sm">{t('Nicio imagine', 'No image')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right arrow */}
                  <button onClick={() => setCarPos(p => ({ ...p, [cat.id]: Math.min(maxPos, pos + 1) }))}
                    disabled={pos >= maxPos}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-25 hover:bg-stone-50"
                    aria-label={t('Următor', 'Next')}>
                    ›
                  </button>

                  {/* Refresh this item button */}
                  <button onClick={() => handleRefreshItem(cat.id)}
                    className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-white text-xs"
                    title={t('Înlocuiește această piesă', 'Replace this item')}>
                    ↻
                  </button>

                  {/* Dot strip */}
                  {imgs.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {imgs.map((_, i) => (
                        <button key={i} onClick={() => setCarPos(p => ({ ...p, [cat.id]: i }))}
                          className={`rounded-full transition-all ${i === pos ? 'w-4 h-1.5 bg-stone-800' : 'w-1.5 h-1.5 bg-white/70'}`} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Mobile scramble + save buttons */}
            <div className="sm:hidden flex gap-2 p-4">
              <button onClick={handleScramble} disabled={scrambling}
                className="flex-1 py-2.5 border border-stone-200 rounded-xl text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                {scrambling ? '...' : `🔀 ${t('Regenerează capsula', 'Regenerate capsule')}`}
              </button>
              <button onClick={handleSave} disabled={savingCapsule || !!saveCode}
                className="flex-1 py-2.5 border border-stone-200 rounded-xl text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                {saveCode ? saveCode : savingCapsule ? '...' : `🪢 ${t('Salvează', 'Save')}`}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-44 border-l border-stone-200 bg-white overflow-y-auto p-2.5 flex-shrink-0">
          {cats.map((cat, idx) => (
            <div key={cat.id} className={idx > 0 ? 'mt-4' : ''}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat.dotColor }} />
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">{cat.label}</span>
                <button onClick={() => handleRefreshItem(cat.id)}
                  className="ml-auto text-stone-400 hover:text-stone-700 text-xs"
                  title={t('Înlocuiește', 'Replace')}>
                  ↻
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {cat.items.map((item: any) => {
                  const isActive = selected[cat.id] === item.id
                  return (
                    <button key={item.id}
                      onClick={() => { setSelected(s => ({ ...s, [cat.id]: item.id })); setCarPos(p => ({ ...p, [cat.id]: 0 })) }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${isActive ? 'border-stone-800' : 'border-transparent'}`}
                      style={{ aspectRatio: '3/4' }}>
                      <img src={item.image_url} alt={item.name}
                        className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-1.5 py-1">
                        <div className="text-[10px] font-medium text-stone-800">€{item.price_eur?.toFixed(0)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Total + CTAs */}
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="bg-stone-50 rounded-xl p-2.5 mb-3 text-center">
              <div className="text-xs text-stone-400 mb-0.5">{t('Total capsulă', 'Capsule total')}</div>
              <div className="text-lg font-medium text-stone-900">€{Math.round(capsuleTotal)}</div>
            </div>
            {!isUnlocked && (
              <>
                <button onClick={handleUnlock} disabled={checkoutLoading}
                  className="w-full py-2 bg-stone-900 text-white text-xs font-medium rounded-lg mb-1.5 hover:bg-stone-800 disabled:opacity-50">
                  🔓 {t('Deblochează €3', 'Unlock €3')}
                </button>
                <button onClick={openCart} disabled={checkoutLoading}
                  className="w-full py-2 border border-stone-300 text-stone-700 text-xs rounded-lg hover:bg-stone-50 disabled:opacity-50">
                  📦 {t('Serviciu complet €15', 'Full service €15')}
                </button>
                <p className="text-[10px] text-stone-400 text-center mt-2 leading-snug">
                  {t('Taxa nerambursabilă.', 'Non-refundable fee.')}<br/>
                  {t('Hainele se returnează la magazin.', 'Clothes returned to retailer.')}
                </p>
              </>
            )}
            {isUnlocked && (
              <div className="text-center">
                <p className="text-xs text-green-700 font-medium">✓ {t('Capsulă deblocată', 'Capsule unlocked')}</p>
                {daysLeft !== null && (
                  <p className={`text-xs mt-1 ${daysLeft <= 3 ? 'text-amber-600' : 'text-stone-400'}`}>
                    {t(`Link-uri: ${daysLeft} zile`, `Links: ${daysLeft} days`)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
