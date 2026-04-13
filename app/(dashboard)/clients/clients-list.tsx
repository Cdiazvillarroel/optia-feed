'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, X } from 'lucide-react'
import { createClientAction } from '@/app/(dashboard)/clients/actions'

const SPECIES_OPTIONS = [
  { key: 'cattle', label: 'C', color: 'bg-species-cattle/10 text-species-cattle' },
  { key: 'pig', label: 'P', color: 'bg-species-pig/10 text-species-pig' },
  { key: 'poultry', label: 'Pk', color: 'bg-species-poultry/10 text-species-poultry' },
  { key: 'sheep', label: 'S', color: 'bg-species-sheep/10 text-species-sheep' },
]

interface Props {
  clients: any[]
  animalCounts: Record<string, number>
  formulaCounts: Record<string, number>
}

export function ClientsList({ clients, animalCounts, formulaCounts }: Props) {
  const [search, setSearch] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.location || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name || '').toLowerCase().includes(search.toLowerCase())
    const matchSpecies = !speciesFilter || (c.species as string[]).includes(speciesFilter)
    return matchSearch && matchSpecies
  })

  function toggleSpecies(sp: string) {
    setSelectedSpecies(prev =>
      prev.includes(sp) ? prev.filter(s => s !== sp) : [...prev, sp]
    )
  }

  async function handleSubmit(formData: FormData) {
    setFormLoading(true)
    formData.set('species', selectedSpecies.join(','))
    try {
      await createClientAction(formData)
    } catch (e) {
      setFormLoading(false)
    }
  }

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text">Clients</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus size={14} /> Add Client
        </button>
      </div>
      <div className="flex gap-2.5 mb-4 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="input pl-9" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setSpeciesFilter(null)} className={`filter-pill ${!speciesFilter ? 'active' : ''}`}>All</button>
          {SPECIES_OPTIONS.map((sp) => (
            <button key={sp.key} onClick={() => setSpeciesFilter(speciesFilter === sp.key ? null : sp.key)} className={`filter-pill ${speciesFilter === sp.key ? 'active' : ''}`}>{sp.key}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_80px_40px] px-4 py-2.5 border-b border-border gap-2">
          {['Client', 'Species', 'Location', 'Animals', 'Diets', ''].map((h) => (
            <span key={h} className="text-2xs font-bold text-text-ghost uppercase tracking-wider">{h}</span>
          ))}
        </div>
        {filtered.length > 0 ? filtered.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="grid grid-cols-[2fr_1fr_1fr_80px_80px_40px] px-4 py-3 border-b border-border/5 gap-2 items-center hover:bg-[#253442] transition-colors no-underline">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-semibold text-text-dim">{c.name}</span>
              {c.feedflow_client_id && (<span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">FF</span>)}
            </div>
            <div className="flex gap-1">
              {(c.species as string[]).map((s) => {
                const sp = SPECIES_OPTIONS.find(o => o.key === s)
                return sp ? (<span key={s} className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded text-xs font-bold font-mono ${sp.color}`}>{sp.label}</span>) : null
              })}
            </div>
            <span className="text-sm text-text-muted truncate">{c.location || '\u2014'}</span>
            <span className="text-base text-text-dim font-mono">{animalCounts[c.id] || '\u2014'}</span>
            <span className="text-base text-text-dim font-mono">{formulaCounts[c.id] || '\u2014'}</span>
            <span className="text-text-ghost text-right">&rsaquo;</span>
          </Link>
        )) : (
          <div className="px-4 py-12 text-center text-sm text-text-ghost">{clients.length === 0 ? 'No clients yet. Add your first farm client.' : 'No clients match your search.'}</div>
        )}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text">New Client</h2>
              <button onClick={() => setShowForm(false)} className="text-text-ghost hover:text-text-muted bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <form action={handleSubmit} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Farm / Client Name *</label><input name="name" required className="input" placeholder="e.g. Kapram Dairy" /></div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1.5">Species *</label>
                <div className="flex gap-2">
                  {(['cattle', 'pig', 'poultry', 'sheep'] as const).map((sp) => (
                    <button key={sp} type="button" onClick={() => toggleSpecies(sp)} className={`px-4 py-2 rounded border text-sm font-semibold capitalize transition-all cursor-pointer ${selectedSpecies.includes(sp) ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-surface-bg text-text-faint hover:border-border-light'}`}>{sp}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Contact Name</label><input name="contact_name" className="input" placeholder="James Mitchell" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Contact Phone</label><input name="contact_phone" className="input" placeholder="+61 3 9876 5432" /></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Contact Email</label><input name="contact_email" type="email" className="input" placeholder="james@farm.com.au" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Location</label><input name="location" className="input" placeholder="Gippsland, VIC" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Notes</label><textarea name="notes" className="input min-h-[60px] resize-y" placeholder="Any notes..." /></div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={formLoading || selectedSpecies.length === 0} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{formLoading ? 'Creating...' : 'Create Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
