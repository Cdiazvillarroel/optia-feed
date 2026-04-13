'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, X } from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([])

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase
      .from('nutrition_clients')
      .select('*')
      .eq('active', true)
      .order('name')
    setClients(data || [])
  }

  const filtered = clients.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.location || '').toLowerCase().includes(search.toLowerCase())
    const matchSpecies = !speciesFilter || (c.species as string[]).includes(speciesFilter)
    return matchSearch && matchSpecies
  })

  function toggleSpecies(sp: string) {
    setSelectedSpecies(prev => prev.includes(sp) ? prev.filter(s => s !== sp) : [...prev, sp])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const form = new FormData(e.currentTarget)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setFormLoading(false); return }
    const { data, error } = await supabase
      .from('nutrition_clients')
      .insert({
        nutritionist_id: user.id,
        name: form.get('name') as string,
        species: selectedSpecies,
        contact_name: form.get('contact_name') as string || null,
        contact_email: form.get('contact_email') as string || null,
        contact_phone: form.get('contact_phone') as string || null,
        location: form.get('location') as string || null,
        notes: form.get('notes') as string || null,
      })
      .select()
      .single()
    setFormLoading(false)
    if (error) { console.error('Error:', error.message); return }
    if (data) {
      setShowForm(false)
      setSelectedSpecies([])
      loadClients()
    }
  }

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text">Clients</h1>
        <button onClick={() => setShowForm(true)} className="btn btn-primary"><Plus size={14} /> Add Client</button>
      </div>
      <div className="flex gap-2.5 mb-4 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="input pl-9" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setSpeciesFilter(null)} className={`filter-pill ${!speciesFilter ? 'active' : ''}`}>All</button>
          {['cattle','pig','poultry','sheep'].map((sp) => (
            <button key={sp} onClick={() => setSpeciesFilter(speciesFilter === sp ? null : sp)} className={`filter-pill ${speciesFilter === sp ? 'active' : ''}`}>{sp}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="grid grid-cols-[2fr_1fr_1fr_40px] px-4 py-2.5 border-b border-border gap-2">
          {['Client','Species','Location',''].map((h) => (
            <span key={h} className="text-2xs font-bold text-text-ghost uppercase tracking-wider">{h}</span>
          ))}
        </div>
        {filtered.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="grid grid-cols-[2fr_1fr_1fr_40px] px-4 py-3 border-b border-border/5 gap-2 items-center hover:bg-[#253442] transition-colors no-underline">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-semibold text-text-dim">{c.name}</span>
              {c.feedflow_client_id && <span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">FF</span>}
            </div>
            <div className="flex gap-1">
              {(c.species as string[]).map((s) => (
                <span key={s} className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded text-xs font-bold font-mono ${s==='cattle'?'bg-species-cattle/10 text-species-cattle':s==='pig'?'bg-species-pig/10 text-species-pig':s==='poultry'?'bg-species-poultry/10 text-species-poultry':'bg-species-sheep/10 text-species-sheep'}`}>
                  {s==='cattle'?'C':s==='pig'?'P':s==='poultry'?'Pk':'S'}
                </span>
              ))}
            </div>
            <span className="text-sm text-text-muted truncate">{c.location || '\u2014'}</span>
            <span className="text-text-ghost text-right">&rsaquo;</span>
          </Link>
        ))}
        {filtered.length === 0 && <div className="px-4 py-12 text-center text-sm text-text-ghost">{clients.length === 0 ? 'No clients yet. Add your first farm client.' : 'No clients match your search.'}</div>}
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text">New Client</h2>
              <button onClick={() => setShowForm(false)} className="text-text-ghost hover:text-text-muted bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Farm / Client Name *</label><input name="name" required className="input" placeholder="e.g. Kapram Dairy" /></div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1.5">Species *</label>
                <div className="flex gap-2">
                  {(['cattle','pig','poultry','sheep'] as const).map((sp) => (
                    <button key={sp} type="button" onClick={() => toggleSpecies(sp)} className={`px-4 py-2 rounded border text-sm font-semibold capitalize transition-all cursor-pointer ${selectedSpecies.includes(sp)?'border-brand bg-brand/10 text-brand':'border-border bg-surface-bg text-text-faint'}`}>{sp}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Contact Name</label><input name="contact_name" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Phone</label><input name="contact_phone" className="input" /></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Email</label><input name="contact_email" type="email" className="input" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Location</label><input name="location" className="input" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Notes</label><textarea name="notes" className="input min-h-[60px] resize-y" /></div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={formLoading || selectedSpecies.length===0} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{formLoading ? 'Creating...' : 'Create Client'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
