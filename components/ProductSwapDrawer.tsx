'use client'
import { useState, useEffect } from 'react'

const CAT_LABEL: Record<string, string> = {
  tops: 'topul', bottoms: 'pantalonii', shoes: 'încălțămintea',
  outerwear: 'jacheta', accessories: 'accesoriul',
}

export default function ProductSwapDrawer({
  product, outfitTotal, budget, excludeIds, answers, unlocked, onSwap, onClose,
}: {
  product: any
  outfitTotal: number
  budget: number
  excludeIds: string[]
  answers: any
  unlocked: boolean
  onSwap: (p: any) => void
  onClose: () => void
}) {
  const [alts, setAlts]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/alternatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            category:   product.category,
            budget_left: budget - (outfitTotal - product.price_ron),
            exclude_ids: excludeIds,
            answers,
          }),
        })
        const data = await res.json()
        setAlts(data.alternatives || [])
      } catch { setAlts([]) }
      setLoading(false)
    })()
  }, [product.id])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 z-50 backdrop-blur-[2px]" onClick={onClose} />

      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-warm-white z-50 overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-warm-white border-b border-border-line px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">
              Schimbă {CAT_LABEL[product.category] || 'piesa'}
            </h2>
            <p className="text-xs text-ink/50">
              Alternativele se încadrează în bugetul tău.
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full border border-border-line flex items-center justify-center hover:bg-white transition text-ink/50">
            ✕
          </button>
        </div>

        <div className="px-6 py-5">

          {/* Piesa curenta */}
          <div className="text-[11px] uppercase tracking-[0.1em] text-ink/40 mb-3">
            Piesa actuală
          </div>
          <div className="bg-white rounded-card border-2 border-ink p-3 flex gap-3.5 mb-7">
            <div className="w-20 h-20 bg-warm-white rounded-lg p-1.5 flex-shrink-0">
              <img src={product.image_url} alt={product.name}
                className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium mb-1 line-clamp-2">{product.name}</div>
              <div className={`text-[10px] uppercase tracking-wide text-ink/40 mb-1.5 ${!unlocked ? 'locked' : ''}`}>
                {product.brand}
              </div>
              <div className={`text-sm font-semibold ${!unlocked ? 'locked' : ''}`}>
                {product.price_ron} RON
              </div>
            </div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.1em] text-ink/40 mb-3">
            Alternative
          </div>

          {loading && (
            <div className="py-12 text-center text-sm text-ink/40 animate-pulse">
              Căutăm alternative…
            </div>
          )}

          {!loading && alts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-ink/50 mb-2">
                Nu am găsit alternative în bugetul rămas.
              </p>
              <p className="text-xs text-ink/40">
                Încearcă să schimbi mai întâi o piesă mai scumpă.
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            {alts.map(alt => {
              const diff      = alt.price_ron - product.price_ron
              const newTotal  = outfitTotal + diff
              const overBy    = newTotal - budget

              return (
                <button key={alt.id} onClick={() => onSwap(alt)}
                  className="w-full bg-white rounded-card border border-border-line p-3 flex gap-3.5 text-left hover:border-ink/30 hover:shadow-subtle transition-all">
                  <div className="w-20 h-20 bg-warm-white rounded-lg p-1.5 flex-shrink-0">
                    <img src={alt.image_url} alt={alt.name}
                      className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium mb-1 line-clamp-2">{alt.name}</div>
                    <div className={`text-[10px] uppercase tracking-wide text-ink/40 mb-1.5 ${!unlocked ? 'locked' : ''}`}>
                      {alt.brand}
                    </div>

                    {alt.colours?.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {alt.colours.slice(0, 4).map((c: string, i: number) => (
                          <span key={i} className="w-2.5 h-2.5 rounded-full border border-border-line"
                            style={{ background: swatch(c) }} />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${!unlocked ? 'locked' : ''}`}>
                        {alt.price_ron} RON
                      </span>
                      {diff !== 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          diff > 0 ? 'bg-warm-grey/25 text-ink/60' : 'bg-success-bg text-success'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff} RON
                        </span>
                      )}
                    </div>

                    {overBy > 0 && (
                      <div className="text-[10px] text-[#B45309] mt-1.5">
                        ⚠ Depășești bugetul cu {overBy} RON
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </aside>
    </>
  )
}

function swatch(name: string): string {
  const map: Record<string, string> = {
    negru: '#0A0A0A', alb: '#FFFFFF', gri: '#9A9A95', bej: '#D9CDBB',
    camel: '#B08A5F', maro: '#6B4A32', kaki: '#7C7B5A', olive: '#686958',
    albastru: '#3B5C86', bleumarin: '#26364F', denim: '#4A6D96', verde: '#4A6B4F',
  }
  const k = Object.keys(map).find(x => name.toLowerCase().includes(x))
  return k ? map[k] : '#C9C6BE'
}
