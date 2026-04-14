'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, X, Package, Trash2, Save, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react'

const CATEGORIES = [
  { value: 'mineral_mix', label: 'Mineral Mix' },
  { value: 'vitamin_mix', label: 'Vitamin Premix' },
  { value: 'protein_concentrate', label: 'Protein Concentrate' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'custom_blend', label: 'Custom Blend' },
]

const CATEGORY_LABELS: Record<string,string> = { mineral_mix:'Mineral Mix', vitamin_mix:'Vitamin Premix', protein_concentrate:'Protein Conc.', supplement:'Supplement', custom_blend:'Custom Blend' }

export default function PremixesPage() {
  const [premixes, setPremixes] = useState<any[]>([])
  const [allIngredients, setAllIngredients] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string,number>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  // Create form
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('mineral_mix')
  const [newDesc, setNewDesc] = useState('')
  // Expanded premix builder
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [editIngs, setEditIngs] = useState<any[]>([])
  const [showAddIng, setShowAddIng] = useState(false)
  const [ingSearch, setIngSearch] = useState('')
  const [ingCatFilter, setIngCatFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadData() }, [])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('premixes').select('*').eq('nutritionist_id', user.id).eq('active', true).order('name')
    setPremixes(p || [])
    const { data: ing } = await supabase.from('ingredients').select('*').or(`nutritionist_id.is.null,nutritionist_id.eq.${user.id}`).order('name')
    setAllIngredients(ing || [])
    const { data: pr } = await supabase.from('ingredient_prices').select('ingredient_id, price_per_tonne').eq('nutritionist_id', user.id).order('effective_date', { ascending: false })
    const pm: Record<string,number> = {}
    pr?.forEach((p: any) => { if (!pm[p.ingredient_id]) pm[p.ingredient_id] = p.price_per_tonne })
    setPrices(pm)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('premixes').insert({
      nutritionist_id: user.id, name: newName.trim(), category: newCategory,
      description: newDesc || null, active: true,
    }).select().single()
    setCreating(false)
    if (data) { setShowCreate(false); setPremixes([data, ...premixes]); toggleExpand(data.id) }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id); setSaved(false)
    const supabase = await getSupabase()
    const { data } = await supabase.from('premix_ingredients').select('*, ingredient:ingredients(*)').eq('premix_id', id)
    setEditIngs(data || [])
  }

  async function addIngToPremix(ingId: string) {
    if (!expandedId || editIngs.some(ei => ei.ingredient_id === ingId)) return
    const supabase = await getSupabase()
    const { data } = await supabase.from('premix_ingredients').insert({
      premix_id: expandedId, ingredient_id: ingId, inclusion_pct: 0,
    }).select('*, ingredient:ingredients(*)').single()
    if (data) { setEditIngs([...editIngs, data]); setShowAddIng(false); setSaved(false) }
  }

  function updateIngPct(idx: number, pct: number) {
    const u = [...editIngs]; u[idx] = { ...u[idx], inclusion_pct: pct }; setEditIngs(u); setSaved(false)
  }

  function removeIngFromPremix(idx: number) {
    setEditIngs(editIngs.filter((_, i) => i !== idx)); setSaved(false)
  }

  // Calculate totals for current premix
  function calcPremixTotals(ings: any[]) {
    const total = ings.reduce((s, ei) => s + (ei.inclusion_pct || 0), 0)
    const calc = (key: string) => ings.reduce((s, ei) => s + (ei.ingredient?.[key] || 0) * (ei.inclusion_pct || 0) / 100, 0)
    const totalAsFedKg = ings.reduce((s, ei) => {
      const dmKg = (ei.inclusion_pct || 0) / 100 * 1000
      return s + dmKg / ((ei.ingredient?.dm_pct || 88) / 100)
    }, 0)
    const costAF = ings.reduce((s, ei) => {
      const afKg = (ei.inclusion_pct || 0) / 100 * 1000 / ((ei.ingredient?.dm_pct || 88) / 100)
      const afP = totalAsFedKg > 0 ? afKg / totalAsFedKg : 0
      return s + (prices[ei.ingredient_id] || 0) * afP
    }, 0)
    return {
      total, cp: calc('cp_pct'), me: calc('me_mj'), ndf: calc('ndf_pct'),
      ca: calc('ca_pct'), p: calc('p_pct'), ee: calc('ee_pct'),
      starch: calc('starch_pct'), mg: calc('mg_pct'), na: calc('na_pct'),
      k: calc('k_pct'), s: calc('s_pct'), cl: calc('cl_pct'),
      costAF, totalAsFedKg,
      dm: ings.reduce((s, ei) => s + (ei.ingredient?.dm_pct || 88) * (ei.inclusion_pct || 0) / 100, 0),
    }
  }

  async function savePremix() {
    if (!expandedId) return
    setSaving(true)
    const supabase = await getSupabase()
    const totals = calcPremixTotals(editIngs)
    // Delete old and re-insert
    await supabase.from('premix_ingredients').delete().eq('premix_id', expandedId)
    if (editIngs.length > 0) {
      await supabase.from('premix_ingredients').insert(editIngs.map(ei => ({
        premix_id: expandedId, ingredient_id: ei.ingredient_id,
        inclusion_pct: ei.inclusion_pct, inclusion_kg: ei.inclusion_pct / 100 * 1000,
      })))
    }
    // Update totals
    await supabase.from('premixes').update({
      total_dm_pct: totals.dm, total_cp_pct: totals.cp, total_me_mj: totals.me,
      total_ndf_pct: totals.ndf, total_ca_pct: totals.ca, total_p_pct: totals.p,
      total_cost_per_tonne: totals.costAF,
    }).eq('id', expandedId)
    // Update local state
    setPremixes(premixes.map(p => p.id === expandedId ? { ...p, total_cp_pct: totals.cp, total_me_mj: totals.me, total_ca_pct: totals.ca, total_p_pct: totals.p, total_cost_per_tonne: totals.costAF, total_ndf_pct: totals.ndf, total_dm_pct: totals.dm } : p))
    setSaving(false); setSaved(true)
  }

  async function deletePremix(id: string) {
    if (!confirm('Delete this premix?')) return
    const supabase = await getSupabase()
    await supabase.from('premixes').update({ active: false }).eq('id', id)
    setPremixes(premixes.filter(p => p.id !== id))
    if (expandedId === id) { setExpandedId(null); setEditIngs([]) }
  }

  const filtered = premixes.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  const addableIngs = allIngredients.filter(i => {
    if (editIngs.some(ei => ei.ingredient_id === i.id)) return false
    if (ingSearch && !i.name.toLowerCase().includes(ingSearch.toLowerCase())) return false
    if (ingCatFilter === 'forage' && i.particle_class !== 'forage') return false
    if (ingCatFilter === 'concentrate' && i.particle_class !== 'concentrate') return false
    if (ingCatFilter === 'energy' && i.category !== 'energy') return false
    if (ingCatFilter === 'protein' && i.category !== 'protein') return false
    if (ingCatFilter === 'mineral' && i.category !== 'mineral') return false
    if (ingCatFilter === 'byproduct' && i.category !== 'byproduct') return false
    return true
  })

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-2xl font-bold text-text">Premixes &amp; Supplements</h1><p className="text-sm text-text-ghost mt-0.5">Create reusable blends as sub-formulas for your rations</p></div>
        <button onClick={() => { setNewName(''); setNewCategory('mineral_mix'); setNewDesc(''); setShowCreate(true) }} className="btn btn-primary"><Plus size={14} /> New Premix</button>
      </div>

      <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search premixes..." className="input pl-9" /></div>

      {/* Premix List */}
      <div className="flex flex-col gap-3">
        {filtered.map(p => {
          const isExpanded = expandedId === p.id
          const totals = isExpanded ? calcPremixTotals(editIngs) : null
          return (
            <div key={p.id} className="card">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => toggleExpand(p.id)}>
                <Package size={18} className="text-brand flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-base font-bold text-text">{p.name}</div>
                  <div className="text-2xs text-text-ghost">{CATEGORY_LABELS[p.category] || p.category}{p.description ? ' — ' + p.description : ''}</div>
                </div>
                <div className="flex gap-3 text-xs font-mono">
                  {p.total_cp_pct != null && <span className="text-text-muted">CP {p.total_cp_pct?.toFixed(1)}%</span>}
                  {p.total_me_mj != null && <span className="text-text-muted">ME {p.total_me_mj?.toFixed(1)}</span>}
                  {p.total_ca_pct != null && <span className="text-text-muted">Ca {p.total_ca_pct?.toFixed(2)}%</span>}
                  {p.total_cost_per_tonne != null && p.total_cost_per_tonne > 0 && <span className="text-status-amber">${p.total_cost_per_tonne?.toFixed(0)}/t</span>}
                </div>
                <button onClick={e => { e.stopPropagation(); deletePremix(p.id) }} className="text-text-ghost/30 hover:text-status-red bg-transparent border-none cursor-pointer"><Trash2 size={14} /></button>
                {isExpanded ? <ChevronUp size={16} className="text-text-ghost" /> : <ChevronDown size={16} className="text-text-ghost" />}
              </div>

              {/* Builder (expanded) */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3">
                  {/* Summary bar */}
                  <div className="flex items-center gap-3 mb-3 px-2.5 py-1.5 bg-surface-deep rounded-lg text-xs">
                    <span className={`font-mono font-bold ${totals && (totals.total > 100.1 || totals.total < 99.9) ? 'text-status-red' : 'text-brand'}`}>{totals?.total.toFixed(1)}% DM</span>
                    <span className="text-text-ghost">|</span>
                    <span className="font-mono text-text-dim">CP {totals?.cp.toFixed(1)}%</span>
                    <span className="font-mono text-text-dim">ME {totals?.me.toFixed(1)}</span>
                    <span className="font-mono text-text-dim">NDF {totals?.ndf.toFixed(1)}%</span>
                    <span className="font-mono text-text-dim">Ca {totals?.ca.toFixed(3)}%</span>
                    <span className="font-mono text-text-dim">P {totals?.p.toFixed(3)}%</span>
                    <div className="flex-1" />
                    {totals && totals.costAF > 0 && <span className="font-mono font-bold text-status-amber">${totals.costAF.toFixed(0)}/t</span>}
                  </div>

                  {/* Ingredient rows */}
                  {editIngs.map((ei, idx) => {
                    const ing = ei.ingredient
                    if (!ing) return null
                    const dmKg = (ei.inclusion_pct || 0) / 100 * 1000
                    const afKg = dmKg / ((ing.dm_pct || 88) / 100)
                    return (
                      <div key={ei.id || idx} className="grid grid-cols-[1fr_80px_60px_50px_45px_20px] px-2 py-1.5 border-b border-border/5 items-center gap-2">
                        <div><div className="text-sm font-semibold text-text-dim truncate">{ing.name}</div><div className="text-[10px] text-text-ghost font-mono">{ing.category} &middot; CP {ing.cp_pct || 0}% &middot; ME {ing.me_mj || 0}</div></div>
                        <input type="range" min="0" max="60" step="0.5" value={ei.inclusion_pct} onChange={e => updateIngPct(idx, parseFloat(e.target.value))} />
                        <input type="number" value={ei.inclusion_pct} step="0.5" min="0" max="100" onChange={e => updateIngPct(idx, parseFloat(e.target.value) || 0)} className="w-full px-1 py-0.5 rounded border border-border bg-surface-deep text-text-dim text-xs font-mono text-right outline-none focus:border-brand" />
                        <span className="text-[10px] text-text-ghost font-mono text-right">{dmKg.toFixed(0)}kg</span>
                        <span className="text-[10px] text-text-ghost font-mono text-right">{afKg.toFixed(0)}AF</span>
                        <button onClick={() => removeIngFromPremix(idx)} className="bg-transparent border-none cursor-pointer text-text-ghost/30 hover:text-status-red"><X size={11} /></button>
                      </div>
                    )
                  })}

                  {editIngs.length === 0 && <div className="text-center py-6 text-sm text-text-ghost">No ingredients yet. Add ingredients to build this premix.</div>}

                  {/* Nutrient detail grid */}
                  {editIngs.length > 0 && totals && (
                    <div className="mt-3 pt-2 border-t border-border grid grid-cols-6 gap-1.5">
                      {[['DM', totals.dm, '%'], ['CP', totals.cp, '%'], ['ME', totals.me, 'MJ'], ['NDF', totals.ndf, '%'], ['EE', totals.ee, '%'], ['Starch', totals.starch, '%'], ['Ca', totals.ca, '%'], ['P', totals.p, '%'], ['Mg', totals.mg, '%'], ['K', totals.k, '%'], ['Na', totals.na, '%'], ['S', totals.s, '%']].map(([l, v, u]) => (
                        <div key={l as string} className="text-center bg-surface-deep rounded px-1 py-1">
                          <div className="text-[8px] text-text-ghost uppercase">{l}</div>
                          <div className="text-[10px] font-mono font-bold text-text-dim">{(v as number) < 1 ? (v as number).toFixed(3) : (v as number).toFixed(1)}{u}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setIngSearch(''); setIngCatFilter(''); setShowAddIng(true) }} className="btn btn-ghost btn-sm"><Plus size={14} /> Add Ingredient</button>
                    <div className="flex-1" />
                    <button onClick={savePremix} disabled={saving} className={`btn btn-primary btn-sm ${saved ? 'bg-brand/50' : ''}`}><Save size={14} /> {saved ? '\u2713 Saved' : 'Save Premix'}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && <div className="card px-4 py-12 text-center"><Package size={32} className="text-text-ghost mx-auto mb-3" /><p className="text-sm text-text-ghost">{premixes.length === 0 ? 'No premixes yet. Create your first blend.' : 'No premixes match.'}</p></div>}
      </div>

      {/* ── CREATE MODAL ──────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-text">New Premix</h2><button onClick={() => setShowCreate(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <div className="flex flex-col gap-3">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Name *</label><input value={newName} onChange={e => setNewName(e.target.value)} className="input" placeholder="e.g. Dairy Mineral Mix" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="input">{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Description</label><input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input" placeholder="Optional notes..." /></div>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setShowCreate(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{creating ? 'Creating...' : 'Create Premix'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD INGREDIENT MODAL ──────────────────── */}
      {showAddIng && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddIng(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="text-lg font-bold text-text">Add Ingredient</h2><span className="text-2xs text-text-ghost font-mono">{addableIngs.length} available</span><button onClick={() => setShowAddIng(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <div className="p-3 border-b border-border">
              <div className="relative mb-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" /><input value={ingSearch} onChange={e => setIngSearch(e.target.value)} placeholder="Search ingredients..." className="input pl-9" autoFocus /></div>
              <div className="flex gap-1 flex-wrap">{[{ k: '', l: 'All' }, { k: 'forage', l: '\uD83C\uDF3F Forage' }, { k: 'concentrate', l: '\uD83C\uDF3E Concentrate' }, { k: 'energy', l: '\u26A1 Energy' }, { k: 'protein', l: '\uD83E\uDD69 Protein' }, { k: 'byproduct', l: '\u267B Byproduct' }, { k: 'mineral', l: '\uD83E\uDDEA Mineral' }].map(f => (<button key={f.k} onClick={() => setIngCatFilter(f.k)} className={`px-2.5 py-1 rounded text-2xs font-semibold transition-all border cursor-pointer ${ingCatFilter === f.k ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-ghost hover:border-border-light bg-transparent'}`}>{f.l}</button>))}</div>
            </div>
            <div className="flex-1 overflow-auto">{addableIngs.length > 0 ? addableIngs.map(ing => (<div key={ing.id} onClick={() => addIngToPremix(ing.id)} className="flex items-center gap-3 px-4 py-2 border-b border-border/5 hover:bg-[#253442] cursor-pointer"><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{ing.name}</div><div className="text-2xs text-text-ghost">{ing.particle_class === 'forage' ? 'F' : 'C'} &middot; {ing.category} &middot; CP {ing.cp_pct || 0}% &middot; ME {ing.me_mj || 0}</div></div>{prices[ing.id] && <span className="text-xs font-mono text-status-amber">${prices[ing.id].toFixed(0)}/t</span>}<Plus size={14} className="text-brand" /></div>)) : <div className="px-4 py-8 text-center text-sm text-text-ghost">No matching ingredients.</div>}</div>
          </div>
        </div>
      )}
    </div>
  )
}
