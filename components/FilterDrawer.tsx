'use client'
import { useState, useEffect } from 'react'
import type { ProductFilters, FilterOptions } from '@/lib/types'
import { DEFAULT_FILTERS } from '@/lib/types'
import { COLOUR_MAP } from '@/lib/filters'

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: ProductFilters) => void
  currentFilters: ProductFilters
  options: FilterOptions | null
  resultCount: number
}

export default function FilterDrawer({
  isOpen, onClose, onApply, currentFilters, options, resultCount
}: FilterDrawerProps) {
  const [pending, setPending] = useState<ProductFilters>(currentFilters)

  useEffect(() => {
    if (isOpen) setPending({ ...currentFilters })
  }, [isOpen, currentFilters])

  const toggle = (key: keyof ProductFilters, value: string) => {
    const arr = pending[key] as string[]
    const updated = arr.includes(value)
      ? arr.filter(v => v !== value)
      : [...arr, value]
    setPending(prev => ({ ...prev, [key]: updated }))
  }

  const isOn = (key: keyof ProductFilters, value: string) =>
    (pending[key] as string[]).includes(value)

  const clearAll = () => setPending({ ...DEFAULT_FILTERS })

  const activeCount = [
    ...pending.platform, ...pending.category, ...pending.colour,
    ...pending.style_tags, ...pending.gender, ...pending.material, ...pending.brand,
    ...(pending.price_min || pending.price_max ? ['price'] : []),
  ].length

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-stone-50 rounded-t-2xl z-40 flex flex-col max-h-[88vh]">
        {/* Handle */}
        <div className="w-9 h-1 bg-stone-300 rounded-full mx-auto mt-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200">
          <span className="font-display text-xl font-light">Filtre</span>
          <button onClick={clearAll} className="text-xs text-brand-500 font-medium">
            Șterge tot {activeCount > 0 && `(${activeCount})`}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5">

          {/* ── Platform — Awin: publisher source ── */}
          <FilterGroup title="Platformă" tag="platform" note="Sursă produs">
            {(options?.platforms || ['About You', 'Zalando']).map(p => (
              <Chip key={p} label={p} on={isOn('platform', p)} onClick={() => toggle('platform', p)} />
            ))}
          </FilterGroup>

          {/* ── Category — Awin: merchant_category / google_product_category ── */}
          <FilterGroup title="Categorie" tag="merchant_category">
            {(options?.categories || []).map(c => (
              <Chip key={c} label={c} on={isOn('category', c)} onClick={() => toggle('category', c)} />
            ))}
          </FilterGroup>

          {/* ── Colour — Awin: colour field, normalised into buckets ── */}
          <FilterGroup title="Culoare" tag="colour field">
            {Object.keys(COLOUR_MAP).map(bucket => (
              <Chip key={bucket} label={bucket} on={isOn('colour', bucket)} onClick={() => toggle('colour', bucket)} />
            ))}
          </FilterGroup>

          {/* ── Style tags — Awin: parsed from description + spec ── */}
          <FilterGroup title="Stil" tag="din description + spec">
            {(options?.style_tags || []).map(t => (
              <Chip key={t} label={t} on={isOn('style_tags', t)} onClick={() => toggle('style_tags', t)} />
            ))}
          </FilterGroup>

          {/* ── Gender — Awin: gender field ── */}
          <FilterGroup title="Gen" tag="gender field">
            {(options?.genders || ['Femei', 'Bărbați', 'Unisex']).map(g => (
              <Chip key={g} label={g} on={isOn('gender', g)} onClick={() => toggle('gender', g)} />
            ))}
          </FilterGroup>

          {/* ── Material — Awin: material field (from spec) ── */}
          <FilterGroup title="Material" tag="material field">
            {(options?.materials || []).map(m => (
              <Chip key={m} label={m} on={isOn('material', m)} onClick={() => toggle('material', m)} />
            ))}
          </FilterGroup>

          {/* ── Brand — Awin: brand_name field ── */}
          <FilterGroup title="Brand" tag="brand_name field">
            {(options?.brands || []).map(b => (
              <Chip key={b} label={b} on={isOn('brand', b)} onClick={() => toggle('brand', b)} />
            ))}
          </FilterGroup>

          {/* ── Price range — Awin: price field ── */}
          <FilterGroup title="Preț (€)" tag="price field">
            <div className="flex items-center gap-2 w-full mt-1">
              <input
                type="number"
                placeholder={`Min €${options?.price_range.min || 0}`}
                value={pending.price_min ?? ''}
                onChange={e => setPending(prev => ({
                  ...prev, price_min: e.target.value ? parseFloat(e.target.value) : null
                }))}
                className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
              />
              <span className="text-stone-400 text-sm flex-shrink-0">—</span>
              <input
                type="number"
                placeholder={`Max €${options?.price_range.max || 500}`}
                value={pending.price_max ?? ''}
                onChange={e => setPending(prev => ({
                  ...prev, price_max: e.target.value ? parseFloat(e.target.value) : null
                }))}
                className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:border-brand-400"
              />
            </div>
          </FilterGroup>

          {/* ── In stock — Awin: in_stock field ── */}
          <FilterGroup title="Disponibilitate" tag="in_stock field" last>
            <Chip label="Doar în stoc" on={pending.in_stock} onClick={() => setPending(p => ({ ...p, in_stock: true }))} />
            <Chip label="Toate produsele" on={!pending.in_stock} onClick={() => setPending(p => ({ ...p, in_stock: false }))} />
          </FilterGroup>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-200 flex gap-3">
          <button onClick={onClose}
            className="px-5 py-3.5 border border-stone-200 rounded-xl text-sm text-stone-600 font-medium">
            Anulează
          </button>
          <button onClick={() => { onApply(pending); onClose() }}
            className="flex-1 py-3.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800">
            Vezi {resultCount} produse →
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function FilterGroup({
  title, tag, note, children, last
}: {
  title: string; tag: string; note?: string; children: React.ReactNode; last?: boolean
}) {
  return (
    <div className={`py-4 ${last ? '' : 'border-b border-stone-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium uppercase tracking-widest text-stone-500">{title}</span>
        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
          {tag}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs border transition-all ${
        on
          ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
      }`}>
      {label}
    </button>
  )
}
