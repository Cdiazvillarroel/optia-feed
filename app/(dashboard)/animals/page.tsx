'use client'

import { useState } from 'react'
import { Plus, Shield } from 'lucide-react'

// This page uses client-side state for species/stage selection
// Data will be fetched from Supabase animal_requirements and safety_rules tables
// For now, renders the UI shell that will be populated with real data

export default function AnimalsPage() {
  const [species, setSpecies] = useState<string>('cattle')
  const [stage, setStage] = useState<string>('lactation')
  const [tab, setTab] = useState<'requirements' | 'safety' | 'overview'>('requirements')

  const speciesList = [
    { key: 'cattle', name: 'Cattle', emoji: '🐄', color: '#4CAF7D' },
    { key: 'pig', name: 'Pigs', emoji: '🐷', color: '#E88B6E' },
    { key: 'poultry', name: 'Poultry', emoji: '🐔', color: '#D4A843' },
    { key: 'sheep', name: 'Sheep', emoji: '🐑', color: '#7BA0C4' },
  ]

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Animals & Requirements</h1>
          <p className="text-base text-text-faint mt-1">Species profiles, production stages, nutritional requirements and safety rules</p>
        </div>
        <button className="btn btn-primary"><Plus size={14} /> Custom Profile</button>
      </div>

      {/* Species Cards */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {speciesList.map((s) => (
          <div
            key={s.key}
            onClick={() => { setSpecies(s.key); setTab('requirements') }}
            className={`bg-surface-card rounded-lg p-4 border-2 cursor-pointer transition-all relative overflow-hidden
              ${species === s.key ? 'border-brand' : 'border-border hover:border-white/10'}`}
          >
            {species === s.key && (
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ background: s.color }} />
            )}
            <div className="text-[28px] mb-3 w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: s.color + '18' }}>
              {s.emoji}
            </div>
            <div className="text-lg font-bold text-text-dim">{s.name}</div>
            <div className="text-xs text-text-ghost">Select to view requirements</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-5">
        {[
          { key: 'requirements', label: 'Nutritional Requirements' },
          { key: 'safety', label: 'Safety Rules', icon: Shield },
          { key: 'overview', label: 'Species Overview' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-1.5
              ${tab === t.key ? 'bg-brand text-white' : 'text-text-faint hover:bg-white/5'}`}
          >
            {t.icon && <t.icon size={14} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content area - populated from Supabase */}
      <div className="card p-8 text-center">
        <p className="text-base text-text-ghost">
          Requirements and safety rules for <strong className="text-text-dim capitalize">{species}</strong> will be loaded from the database.
        </p>
        <p className="text-sm text-text-ghost mt-2">
          Run the seed script to populate global defaults: <code className="text-brand bg-brand/10 px-2 py-0.5 rounded font-mono">npm run db:seed</code>
        </p>
      </div>
    </div>
  )
}
