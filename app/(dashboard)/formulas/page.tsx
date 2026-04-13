'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, FlaskConical } from 'lucide-react'
import { X } from 'lucide-react'

const STATUS_COLORS: Record<string,string> = {
  draft:'bg-status-amber/15 text-status-amber',review:'bg-status-blue/15 text-status-blue',
  approved:'bg-brand/15 text-brand',active:'bg-brand/15 text-brand',archived:'bg-white/5 text-text-ghost'
}

export default function FormulasPage() {
  const [formulas, setFormulas] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newSpecies, setNewSpecies] = useState('beef')
  const [stages, setStages] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadStages(newSpecies) }, [newSpecies])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: f } = await supabase.from('formulas').select('*, client:nutrition_clients(id, name)').not('status','eq','archived').order('updated_at', { ascending: false })
    setFormulas(f || [])
    const { data: c } = await supabase.from('nutrition_clients').select('id, name, species').eq('active', true).order('name')
    setClients(c || [])
  }

  async function loadStages(sp: string) {
    const supabase = await getSupabase()
    const { data } = await supabase.from('animal_requirements').select('production_stage, stage_name').eq('species', sp).is('nutritionist_id', null).order('production_stage')
    setStages(data || [])
  }

  const filtered = formulas.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || (f.client?.name||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || f.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const clientId = form.get('client_id') as string
    const { data, error } = await supabase.from('formulas').insert({
      nutritionist_id: user.id,
      name: form.get('name') as string,
      client_id: clientId || null,
      species: form.get('species') as string,
      production_stage: form.get('production_stage') as string,
      status: 'draft',
      batch_size_kg: parseInt(form.get('batch_size_kg') as string) || 1000,
    }).select().single()
    setLoading(false)
    if (!error && data) {
      router.push(`/formulas/${data.id}`)
    }
  }

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text">Formulas</h1>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary"><Plus size={14} /> New Formula</button>
      </div>
      <div className="flex gap-2.5 mb-4 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search formulas..." className="input pl-9" />
        </div>
        <div className="flex gap-1">
          <button onClick={() => setStatusFilter(null)} className={`filter-pill ${!statusFilter?'active':''}`}>All</button>
          {['draft','review','approved','active'].map(s => (
            <button key={s} onClick={() => setStatusFilter(statusFilter===s?null:s)} className={`filter-pill ${statusFilter===s?'active':''}`}>{s}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-2.5 border-b border-border gap-2">
          {['Formula','Client','Species / Stage','Status',''].map(h => (
            <span key={h} className="text-2xs font-bold text-text-ghost uppercase tracking-wider">{h}</span>
          ))}
        </div>
        {filtered.map((f) => (
          <Link key={f.id} href={`/formulas/${f.id}`} className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-3 border-b border-border/5 gap-2 items-center hover:bg-[#253442] transition-colors no-underline">
            <div>
              <span className="text-base font-semibold text-text-dim">{f.name}</span>
              <span className="text-xs text-text-ghost font-mono ml-2">v{f.version}</span>
            </div>
            <span className="text-sm text-text-muted">{f.client?.name || '\u2014'}</span>
            <span className="text-sm text-text-muted capitalize">{f.species} \u00B7 {f.production_stage}</span>
            <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase w-fit ${STATUS_COLORS[f.status]||''}`}>{f.status}</span>
            <span className="text-text-ghost text-right">&rsaquo;</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <FlaskConical size={32} className="text-text-ghost mx-auto mb-3" />
            <p className="text-sm text-text-ghost">{formulas.length===0?'No formulas yet. Create your first ration.':'No formulas match your filters.'}</p>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text">New Formula</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Formula Name *</label><input name="name" required className="input" placeholder="e.g. Lactation 22% CP" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Client</label>
                <select name="client_id" className="input">
                  <option value="">No client (template)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Species *</label>
                  <select name="species" required value={newSpecies} onChange={e => setNewSpecies(e.target.value)} className="input">
                    {['cattle','beef','pig','poultry','sheep'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Production Stage *</label>
                  <select name="production_stage" required className="input">
                    {stages.map(s => <option key={s.production_stage} value={s.production_stage}>{s.stage_name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Batch Size (kg)</label><input name="batch_size_kg" type="number" defaultValue="1000" className="input" /></div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Creating...':'Create Formula'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
