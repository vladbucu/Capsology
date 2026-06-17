'use client'
import type { ProductFilters } from '@/lib/types'

interface ActiveFilterTagsProps {
  filters: ProductFilters
  onRemove: (key: keyof ProductFilters, value?: string) => void
}

export default function ActiveFilterTags({ filters, onRemove }: ActiveFilterTagsProps) {
  const tags: { label: string; key: keyof ProductFilters; value?: string }[] = []

  filters.platform.forEach(v   => tags.push({ label: v, key: 'platform', value: v }))
  filters.category.forEach(v   => tags.push({ label: v, key: 'category', value: v }))
  filters.colour.forEach(v     => tags.push({ label: v, key: 'colour', value: v }))
  filters.style_tags.forEach(v => tags.push({ label: v, key: 'style_tags', value: v }))
  filters.gender.forEach(v     => tags.push({ label: v, key: 'gender', value: v }))
  filters.material.forEach(v   => tags.push({ label: v, key: 'material', value: v }))
  filters.brand.forEach(v      => tags.push({ label: v, key: 'brand', value: v }))

  if (filters.price_min || filters.price_max) {
    tags.push({
      label: `€${filters.price_min ?? '0'} – €${filters.price_max ?? '∞'}`,
      key: 'price_min',
    })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-5 py-2.5 border-b border-stone-100">
      {tags.map((tag, i) => (
        <button
          key={i}
          onClick={() => onRemove(tag.key, tag.value)}
          className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-100 transition-colors"
        >
          {tag.label}
          <span className="opacity-60 text-xs">×</span>
        </button>
      ))}
      {tags.length > 1 && (
        <button
          onClick={() => onRemove('category', undefined)} // signal clear all
          className="text-xs text-stone-400 hover:text-stone-600 px-2"
        >
          Șterge tot
        </button>
      )}
    </div>
  )
}
