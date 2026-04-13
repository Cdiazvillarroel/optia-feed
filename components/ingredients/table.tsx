'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import type { Ingredient, IngredientPrice } from '@/types'

const categories = ['all', 'energy', 'protein', 'forage', 'mineral', 'byproduct', 'vitamin', 'additive']

const catColors: Record<string, string> = {
  energy: 'bg-status-amber/10 text-status-amber',
  protein: 'bg-status-coral/10 text-status-coral',
  forage: 'bg-brand/10 text-brand',
  mineral: 'bg-status-blue/10 text-status-blue',
  byproduct: 'bg-status-purple/10 text-status-purple',
  vitamin: 'bg-brand/10 text-brand',
  additive: 'bg-white/5 text-text-muted',
}

interface Props {
  ingredients: Ingredient[]
  prices: IngredientPrice[]
}

export function IngredientsTable({ ingredients, prices }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  const filtered = ingredients.filter((i) =>
    (category === 'all' || i.category === category) &&
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  function getPrice(ingId: string): number | null {
    const p = prices.find((p) => p.ingredient_id === ingId)
    return p?.price_per_tonne ?? null
  }

  return (
    <>
      <div className="flex gap-2.5 mb-4 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`filter-pill ${category === c ? 'active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['Ingredient', 'Cat', 'DM%', 'CP%', 'ME', 'NDF%', 'EE%', 'Ca%', 'P%', 'Lys%', '$/t'].map((h) => (
                <th key={h} className={`px-2.5 py-2.5 text-2xs font-bold text-text-ghost uppercase tracking-wider
                  ${h === 'Ingredient' ? 'text-left' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ing) => {
              const price = getPrice(ing.id)
              return (
                <tr key={ing.id} className="border-b border-border/5 hover:bg-[#253442] transition-colors cursor-pointer">
                  <td className="px-2.5 py-2 text-base font-semibold text-text-dim">{ing.name}</td>
                  <td className="px-2.5 py-2 text-right">
                    <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${catColors[ing.category] || 'bg-white/5 text-text-ghost'}`}>
                      {ing.category.slice(0, 3)}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.dm_pct?.toFixed(1) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.cp_pct?.toFixed(1) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.me_mj?.toFixed(1) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.ndf_pct?.toFixed(1) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.ee_pct?.toFixed(1) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.ca_pct?.toFixed(2) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.p_pct?.toFixed(2) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{ing.lysine_pct?.toFixed(2) ?? '—'}</td>
                  <td className="px-2.5 py-2 text-sm text-status-amber text-right font-mono font-semibold">
                    {price ? `$${price.toFixed(0)}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-ghost">No ingredients found.</div>
        )}
      </div>
    </>
  )
}
