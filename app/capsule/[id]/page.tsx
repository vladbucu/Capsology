'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Header from '@/components/Header'
import { categoryLabel, colourHex, colourLabel } from '@/lib/constants'

export default function CapsulePage() {
  const { id }  = useParams()
  const router  = useRouter()
  const paid    = useSearchParams().get('payment') === 'success'
  const supabase = createClient()

  const [capsule, setCapsule] = useState<any>(null)
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from('capsules').select('*').eq('id', id).single()
      setCapsule(c)
      const { data: it } = await supabase.from('capsule_items')
        .select('*').eq('capsule_id', id).order('position')
      setItems(it || [])
      setLoading(false)
    })()
  }, [id, paid])

  if (loading) return (
    <div className="min-h-screen bg-warm-white"><Header />
      <div className="py-32 text-center text-ink/40 text-sm animate-pulse">Se încarcă capsula…</div>
    </div>
  )

  if (!capsule) return (
    <div className="min-h-screen bg-warm-white"><Header />
      <div className="max-w-lg mx-auto px-6 py-32 text-center">
        <p className="text-ink/50 mb-6">Capsula nu a fost găsită.</p>
        <button onClick={() => router.push('/garderoba')}
          className="bg-ink text-white rounded-btn px-6 py-3 text-sm font-medium">
          Garderoba mea
        </button>
      </div>
    </div>
  )

  const isUnlocked   = capsule.status === 'unlocked' || capsule.status === 'ordered'
  const lockedCount  = items.filter(i => !i.is_unlocked).length
  const total        = items.reduce((s, i) => s + Number(i.price_ron || 0), 0)
  const visibleTotal = items.filter(i => i.is_unlocked || isUnlocked)
                            .reduce((s, i) => s + Number(i.price_ron || 0), 0)

  const grouped = items.reduce((acc: Record<string, any[]>, it) => {
    (acc[it.category] ||= []).push(it); return acc
  }, {})

  const unlock = () =>
    router.push(`/checkout?tier=unlock&capsule_id=${id}&amount=${capsule.unlock_price_ron || 49}`)

  return (
    <div className="min-h-screen bg-warm-white pb-28">
      <Header />

      <div className="max-w-content mx-auto px-6 lg:px-12 py-8">

        <button onClick={() => router.push('/garderoba')}
          className="text-sm text-ink/50 hover:text-ink transition mb-7">
          ← Garderoba mea
        </button>

        {paid && (
          <div className="bg-success-bg border border-success/20 rounded-card px-4 py-3.5 mb-7 text-sm text-success">
            ✓ Plata a fost confirmată. Capsula ta este complet deblocată.
          </div>
        )}

        {/* Antet */}
        <div className="max-w-2xl mb-9">
          {capsule.capsule_number && (
            <span className="inline-block text-[11px] tracking-[0.12em] uppercase border border-border-line rounded-full px-3 py-1.5 mb-5 text-ink/55">
              Capsula {String(capsule.capsule_number).padStart(3, '0')}
            </span>
          )}
          <h1 className="text-section font-bold mb-3">{capsule.title || 'Capsula ta'}</h1>
          {capsule.description && (
            <p className="text-ink/60 leading-relaxed">{capsule.description}</p>
          )}
        </div>

        {/* Banner deblocare */}
        {!isUnlocked && lockedCount > 0 && (
          <div className="bg-ink text-white rounded-card-lg p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex-1">
              <div className="font-semibold mb-1.5">
                {lockedCount} {lockedCount === 1 ? 'piesă este blocată' : 'piese sunt blocate'}
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                Deblochezi toate piesele, brandurile, prețurile și linkurile
                directe către magazine.
              </p>
            </div>
            <button onClick={unlock}
              className="bg-white text-ink rounded-btn px-6 py-3.5 text-sm font-semibold hover:bg-white/90 transition whitespace-nowrap">
              Deblochează · {capsule.unlock_price_ron || 49} RON
            </button>
          </div>
        )}

        {/* Articole grupate */}
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="mb-9">
            <h2 className="text-sm font-semibold text-ink/50 uppercase tracking-wide mb-4">
              {categoryLabel(cat)}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.map(it => (
                <ItemCard key={it.id} item={it} unlocked={it.is_unlocked || isUnlocked} />
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-white border border-dashed border-border-line rounded-card-lg py-20 text-center">
            <p className="text-ink/50">Capsula nu are încă piese adăugate.</p>
          </div>
        )}
      </div>

      {/* Bara total */}
      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-border-line px-6 py-4 z-40">
          <div className="max-w-content mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-ink/45">
                {isUnlocked ? 'Total capsulă' : 'Vizibil acum'}
              </div>
              <div className="text-lg font-bold">
                {isUnlocked ? total : visibleTotal} RON
                {!isUnlocked && lockedCount > 0 && (
                  <span className="text-xs font-normal text-ink/40 ml-2">
                    + {lockedCount} blocate
                  </span>
                )}
              </div>
            </div>
            {!isUnlocked && lockedCount > 0 ? (
              <button onClick={unlock}
                className="bg-ink text-white rounded-btn px-6 py-3 text-sm font-semibold hover:bg-dark-grey transition">
                Deblochează tot · {capsule.unlock_price_ron || 49} RON
              </button>
            ) : (
              <span className="text-xs text-success font-medium">✓ Capsulă completă</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, unlocked }: { item: any; unlocked: boolean }) {
  const Wrapper = unlocked && item.product_url ? 'a' : 'div'
  const props: any = unlocked && item.product_url
    ? { href: item.product_url, target: '_blank', rel: 'noopener noreferrer sponsored' }
    : {}

  return (
    <Wrapper {...props}
      className={`bg-white rounded-card border border-border-line overflow-hidden block transition-all ${
        unlocked && item.product_url ? 'hover:shadow-lift hover:border-ink/25' : ''
      }`}>

      <div className="aspect-[3/4] bg-warm-white p-4 relative">
        {item.image_url ? (
          <img src={item.image_url} alt={unlocked ? item.name : ''} referrerPolicy="no-referrer"
            className={`w-full h-full object-contain ${unlocked ? '' : 'blur-md scale-95'}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-ink/25">
            fără imagine
          </div>
        )}

        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-ink/85 text-white text-[10px] px-3 py-1.5 rounded-full font-medium">
              Blocat
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className={`text-sm font-medium leading-tight mb-1 line-clamp-2 min-h-[34px] ${unlocked ? '' : 'blur-[4px] select-none'}`}>
          {item.name}
        </div>

        {item.brand && (
          <div className={`text-[10px] uppercase tracking-wide text-ink/45 mb-2 ${unlocked ? '' : 'blur-[4px] select-none'}`}>
            {item.brand}
          </div>
        )}

        {item.colours?.length > 0 && (
          <div className="flex gap-1 mb-2">
            {item.colours.slice(0, 4).map((c: string, i: number) => (
              <span key={i} title={colourLabel(c)}
                className="w-2.5 h-2.5 rounded-full border border-border-line"
                style={{ background: colourHex(c) }} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${unlocked ? '' : 'blur-[4px] select-none'}`}>
            {item.price_ron} RON
          </span>
          {item.size_label && (
            <span className="text-[10px] text-ink/40">{item.size_label}</span>
          )}
        </div>

        {unlocked && item.notes && (
          <p className="text-[11px] text-ink/50 mt-2 leading-relaxed border-t border-border-line pt-2">
            {item.notes}
          </p>
        )}

        {unlocked && item.product_url && (
          <div className="text-[11px] text-ink/60 mt-2 flex items-center gap-1">
            Vezi în magazin <span>→</span>
          </div>
        )}
      </div>
    </Wrapper>
  )
}
