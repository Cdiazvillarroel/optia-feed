'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, FlaskConical, X, Pencil, Trash2, Copy, Bookmark, BookmarkCheck } from 'lucide-react'

const SPECIES_OPTIONS = [
  { value: 'cattle', label: 'Dairy Cattle', short: 'Dairy' },
  { value: 'beef', label: 'Beef Cattle', short: 'Beef' },
  { value: 'sheep', label: 'Sheep', short: 'Sheep' },
  { value: 'pig', label: 'Pigs', short: 'Pigs' },
  { value: 'poultry', label: 'Poultry', short: 'Poultry' },
]

const SPECIES_LABELS: Record<string,string> = { cattle: 'Dairy Cattle', beef: 'Beef Cattle', sheep: 'Sheep', pig: 'Pigs', poultry: 'Poultry' }

const BREEDS: Record<string, string[]> = {
  cattle: ['Holstein', 'Jersey'],
  beef: ['Angus', 'Wagyu'],
  sheep: ['Merino', 'Dorper'],
  pig: ['Large White', 'Duroc', 'PIC Camborough', 'PIC 337', 'PIC 800', 'Landrace', 'Hampshire', 'Pietrain'],
  poultry: ['Ross 308', 'Hy-Line'],
}

const STAGES: Record<string, { value: string; label: string; group: string }[]> = {
  cattle: [
    { value: 'early_lactation', label: 'Early Lactation (0-100 DIM)', group: 'Lactation' },
    { value: 'mid_lactation', label: 'Mid Lactation (100-200 DIM)', group: 'Lactation' },
    { value: 'late_lactation', label: 'Late Lactation (200+ DIM)', group: 'Lactation' },
    { value: 'dry_cow_far_off', label: 'Dry Cow — Far Off (>21d pre-calving)', group: 'Dry Period' },
    { value: 'dry_cow_close_up', label: 'Dry Cow — Close Up (21d pre-calving)', group: 'Dry Period' },
    { value: 'transition', label: 'Transition (−3 to +3 weeks)', group: 'Dry Period' },
    { value: 'heifer_growing', label: 'Heifer — Growing', group: 'Young Stock' },
    { value: 'heifer_pre_calving', label: 'Heifer — Pre-calving', group: 'Young Stock' },
    { value: 'calf', label: 'Calf (pre-weaning)', group: 'Young Stock' },
  ],
  beef: [
    { value: 'breeding_cow', label: 'Breeding Cow', group: 'Pastoral' },
    { value: 'lactating_cow', label: 'Lactating Cow', group: 'Pastoral' },
    { value: 'growing_steer', label: 'Growing Steer/Heifer', group: 'Pastoral' },
    { value: 'weaner', label: 'Weaner', group: 'Pastoral' },
    { value: 'feedlot_induction', label: 'Feedlot — Induction', group: 'Feedlot' },
    { value: 'feedlot_grower', label: 'Feedlot — Grower', group: 'Feedlot' },
    { value: 'feedlot_finisher', label: 'Feedlot — Finisher', group: 'Feedlot' },
    { value: 'bull', label: 'Bull', group: 'Other' },
  ],
  sheep: [
    { value: 'ewe_maintenance', label: 'Ewe — Maintenance', group: 'Ewes' },
    { value: 'ewe_pregnancy_late', label: 'Ewe — Late Pregnancy', group: 'Ewes' },
    { value: 'ewe_lactation', label: 'Ewe — Lactation', group: 'Ewes' },
    { value: 'lamb_growing', label: 'Lamb — Growing', group: 'Lambs' },
    { value: 'lamb_finishing', label: 'Lamb — Finishing', group: 'Lambs' },
    { value: 'ram', label: 'Ram', group: 'Other' },
  ],
  pig: [
    { value: 'nursery_phase1', label: 'Nursery Phase 1 (Weaning → 7.5 kg)', group: 'Nursery' },
    { value: 'nursery_phase2', label: 'Nursery Phase 2 (7.5 → 11.5 kg)', group: 'Nursery' },
    { value: 'nursery_phase3', label: 'Nursery Phase 3 (11 → 23 kg)', group: 'Nursery' },
    { value: 'grower_23_41', label: 'Grower (23 → 41 kg)', group: 'Grow-Finish' },
    { value: 'grower_41_59', label: 'Grower (41 → 59 kg)', group: 'Grow-Finish' },
    { value: 'finisher_59_82', label: 'Finisher (59 → 82 kg)', group: 'Grow-Finish' },
    { value: 'finisher_82_104', label: 'Finisher (82 → 104 kg)', group: 'Grow-Finish' },
    { value: 'finisher_104_market', label: 'Late Finisher (104 kg → Market)', group: 'Grow-Finish' },
    { value: 'gilt_dev_23_60', label: 'Developing Gilt (23 → 60 kg)', group: 'Gilt Development' },
    { value: 'gilt_dev_60_90', label: 'Developing Gilt (60 → 90 kg)', group: 'Gilt Development' },
    { value: 'gilt_dev_90_breed', label: 'Developing Gilt (90 kg → Breeding)', group: 'Gilt Development' },
    { value: 'gestation_gilt', label: 'Gestating Gilt', group: 'Gestation' },
    { value: 'gestation_sow_ideal', label: 'Gestating Sow (Ideal/Over)', group: 'Gestation' },
    { value: 'gestation_sow_recovery', label: 'Gestating Sow (Recovery)', group: 'Gestation' },
    { value: 'lactation_gilt', label: 'Lactating Gilt', group: 'Lactation' },
    { value: 'lactation_sow', label: 'Lactating Sow', group: 'Lactation' },
    { value: 'mature_boar', label: 'Mature Boar', group: 'Boar' },
  ],
  poultry: [
    { value: 'broiler_starter', label: 'Broiler — Starter (0-10d)', group: 'Broiler' },
    { value: 'broiler_grower', label: 'Broiler — Grower (10-24d)', group: 'Broiler' },
    { value: 'broiler_finisher', label: 'Broiler — Finisher (24d+)', group: 'Broiler' },
    { value: 'layer_pullet', label: 'Layer — Pullet', group: 'Layer' },
    { value: 'layer_production', label: 'Layer — Production', group: 'Layer' },
    { value: 'breeder', label: 'Breeder', group: 'Other' },
  ],
}

const STATUS_COLORS: Record<string,string> = {
  draft:'bg-status-amber/15 text-status-amber',review:'bg-status-blue/15 text-status-blue',
  approved:'bg-brand/15 text-brand',active:'bg-brand/15 text-brand',archived:'bg-white/5 text-text-ghost'
}

const SPECIES_BADGE_COLORS: Record<string,string> = {
  cattle:'bg-[#2E6B42]/15 text-[#2E6B42]', beef:'bg-[#1E4A5A]/15 text-[#1E4A5A]',
  sheep:'bg-[#C9A043]/15 text-[#C9A043]', pig:'bg-[#BE5529]/15 text-[#BE5529]',
  poultry:'bg-[#C9A043]/15 text-[#C9A043]'
}

function getStageLabel(species: string, stage: string): string {
  const all = STAGES[species] || []
  const found = all.find(s => s.value === stage)
  return found ? found.label : stage?.replace(/_/g, ' ') || '—'
}

export default function FormulasPage() {
  const router = useRouter()
  const [formulas, setFormulas] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [animalGroups, setAnimalGroups] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string|null>(null)
  const [speciesFilter, setSpeciesFilter] = useState<string|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newSpecies, setNewSpecies] = useState('cattle')
  const [newStage, setNewStage] = useState('')
  const [newBreed, setNewBreed] = useState('')
  const [newClientId, setNewClientId] = useState('')
  const [newAnimalGroupId, setNewAnimalGroupId] = useState('')
  const [newName, setNewName] = useState('')
  const [newBatch, setNewBatch] = useState('1000')
  const [newTemplateId, setNewTemplateId] = useState('')

  useEffect(() => { loadData() }, [])
  useEffect(() => { setNewStage(''); setNewBreed(''); setNewAnimalGroupId('') }, [newSpecies])
  useEffect(() => { if (newClientId) loadAnimalGroups(newClientId); else setAnimalGroups([]) }, [newClientId])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: f } = await supabase.from('formulas').select('*, client:nutrition_clients(id, name)').eq('nutritionist_id', user.id).not('status','eq','archived').order('updated_at', { ascending: false })
    setFormulas(f || [])
    const { data: c } = await supabase.from('nutrition_clients').select('id, name, species').eq('active', true).order('name')
    setClients(c || [])
  }

  async function loadAnimalGroups(clientId: string) {
    const supabase = await getSupabase()
    const { data } = await supabase.from('client_animals').select('*').eq('client_id', clientId).order('name')
    setAnimalGroups(data || [])
  }

  // Species counts for filter badges
  const speciesCounts: Record<string, number> = {}
  formulas.forEach(f => { speciesCounts[f.species] = (speciesCounts[f.species] || 0) + 1 })
  const activeSpecies = SPECIES_OPTIONS.filter(sp => speciesCounts[sp.value] > 0)

  const filtered = formulas.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || (f.client?.name||'').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter ? true : statusFilter === 'template' ? f.is_template : f.status === statusFilter
    const matchSpecies = !speciesFilter || f.species === speciesFilter
    return matchSearch && matchStatus && matchSpecies
  })

  async function handleCreate() {
    if (!newName.trim() || !newStage) return
    setLoading(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data, error } = await supabase.from('formulas').insert({
      nutritionist_id: user.id, name: newName.trim(), client_id: newClientId || null,
      species: newSpecies, production_stage: newStage, breed: newBreed || null,
      animal_group_id: newAnimalGroupId || null, status: 'draft',
      batch_size_kg: parseInt(newBatch) || 1000, version: 1,
    }).select().single()
    if (!error && data && newTemplateId) {
      const { data: templateIngs } = await supabase.from('formula_ingredients').select('ingredient_id, inclusion_pct, locked').eq('formula_id', newTemplateId)
      if (templateIngs && templateIngs.length > 0) {
        await supabase.from('formula_ingredients').insert(templateIngs.map(ti => ({
          formula_id: data.id, ingredient_id: ti.ingredient_id,
          inclusion_pct: ti.inclusion_pct, locked: ti.locked || false,
        })))
      }
    }
    setLoading(false)
    if (!error && data) { setShowCreate(false); router.push(`/formulas/${data.id}`) }
  }

  async function deleteFormula(id: string) {
    if (!confirm('Delete this formula? This cannot be undone.')) return
    const supabase = await getSupabase()
    await supabase.from('formula_ingredients').delete().eq('formula_id', id)
    await supabase.from('formulas').delete().eq('id', id)
    setFormulas(formulas.filter(f => f.id !== id))
  }

  async function duplicateFormula(id: string) {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const orig = formulas.find(f => f.id === id)
    if (!orig) return
    const { data } = await supabase.from('formulas').insert({
      nutritionist_id: user.id, name: orig.name + ' (copy)', client_id: orig.client_id,
      species: orig.species, production_stage: orig.production_stage, breed: orig.breed,
      batch_size_kg: orig.batch_size_kg, status: 'draft', version: 1,
    }).select('*, client:nutrition_clients(id, name)').single()
    if (data) {
      const { data: origIngs } = await supabase.from('formula_ingredients').select('ingredient_id, inclusion_pct, locked').eq('formula_id', id)
      if (origIngs && origIngs.length > 0) {
        await supabase.from('formula_ingredients').insert(origIngs.map(ti => ({
          formula_id: data.id, ingredient_id: ti.ingredient_id,
          inclusion_pct: ti.inclusion_pct, locked: ti.locked || false,
        })))
      }
      setFormulas([data, ...formulas])
    }
  }

  async function toggleTemplate(id: string) {
    const supabase = await getSupabase()
    const f = formulas.find(f => f.id === id)
    if (!f) return
    const newVal = !f.is_template
    await supabase.from('formulas').update({ is_template: newVal }).eq('id', id)
    setFormulas(formulas.map(f => f.id === id ? { ...f, is_template: newVal } : f))
  }

  const stageOptions = STAGES[newSpecies] || []
  const stageGroups = Array.from(new Set(stageOptions.map(s => s.group)))
  const breedOptions = BREEDS[newSpecies] || []
  const filteredAnimalGroups = animalGroups.filter(ag => ag.species === newSpecies)
  const sameSpeciesTemplates = formulas.filter(f => f.is_template && f.species === newSpecies)
  const otherSpeciesTemplates = formulas.filter(f => f.is_template && f.species !== newSpecies)

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text">Formulas</h1>
        <button onClick={() => { setNewName(''); setNewSpecies('cattle'); setNewStage(''); setNewBreed(''); setNewClientId(''); setNewAnimalGroupId(''); setNewBatch('1000'); setNewTemplateId(''); setShowCreate(true) }} className="btn btn-primary"><Plus size={14} /> New Formula</button>
      </div>

      {/* Search + Status filters */}
      <div className="flex gap-2.5 mb-2 items-center">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search formulas..." className="input pl-9" /></div>
        <div className="flex gap-1">
          <button onClick={() => setStatusFilter(null)} className={`filter-pill ${!statusFilter?'active':''}`}>All</button>
          {['draft','review','approved','active','template'].map(s => (<button key={s} onClick={() => setStatusFilter(statusFilter===s?null:s)} className={`filter-pill ${statusFilter===s?'active':''}`}>{s === 'template' ? '\u2B50 Templates' : s}</button>))}
        </div>
      </div>

      {/* Species filters */}
      {activeSpecies.length > 1 && (
        <div className="flex gap-1.5 mb-4">
          <button onClick={() => setSpeciesFilter(null)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${!speciesFilter ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-ghost hover:border-border-light bg-transparent'}`}>
            All species <span className="font-mono ml-1 opacity-60">{formulas.length}</span>
          </button>
          {activeSpecies.map(sp => (
            <button key={sp.value} onClick={() => setSpeciesFilter(speciesFilter === sp.value ? null : sp.value)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer flex items-center gap-1.5 ${speciesFilter === sp.value ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-ghost hover:border-border-light bg-transparent'}`}>
              <span className={`w-2 h-2 rounded-full ${sp.value === 'cattle' ? 'bg-[#2E6B42]' : sp.value === 'beef' ? 'bg-[#1E4A5A]' : sp.value === 'pig' ? 'bg-[#BE5529]' : sp.value === 'poultry' ? 'bg-[#C9A043]' : 'bg-[#C9A043]'}`} />
              {sp.short} <span className="font-mono opacity-60">{speciesCounts[sp.value]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1fr_110px] px-4 py-2.5 border-b border-border gap-2">
          {['Formula','Client','Species / Stage','Status',''].map(h => (<span key={h} className="text-2xs font-bold text-text-ghost uppercase tracking-wider">{h}</span>))}
        </div>
        {filtered.map((f) => (
          <div key={f.id} className={`grid grid-cols-[2fr_1fr_1.5fr_1fr_110px] px-4 py-3 border-b border-border/5 gap-2 items-center hover:bg-[#312B26] transition-colors ${f.is_template ? 'border-l-2 border-l-status-amber/40' : ''}`}>
            <div onClick={() => router.push(`/formulas/${f.id}`)} className="cursor-pointer">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold text-text-dim">{f.name}</span>
                <span className="text-xs text-text-ghost font-mono">v{f.version}</span>
                {f.is_template && <span className="text-[9px] px-1.5 py-0.5 rounded bg-status-amber/15 text-status-amber font-bold font-mono uppercase">Template</span>}
              </div>
            </div>
            <span className="text-sm text-text-muted">{f.client?.name || '\u2014'}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${SPECIES_BADGE_COLORS[f.species] || 'bg-white/5 text-text-ghost'}`}>{f.species === 'cattle' ? 'dairy' : f.species}</span>
                <span className="text-sm text-text-muted">{f.breed || ''}</span>
              </div>
              <div className="text-2xs text-text-ghost">{getStageLabel(f.species, f.production_stage)}</div>
            </div>
            <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase w-fit ${STATUS_COLORS[f.status]||''}`}>{f.status}</span>
            <div className="flex items-center gap-0.5 justify-end">
              <button onClick={() => toggleTemplate(f.id)} title={f.is_template ? 'Remove template' : 'Set as template'} className={`p-1.5 rounded bg-transparent border-none cursor-pointer ${f.is_template ? 'text-status-amber hover:text-status-amber/70' : 'text-text-ghost/40 hover:text-status-amber hover:bg-status-amber/10'}`}>{f.is_template ? <BookmarkCheck size={13}/> : <Bookmark size={13}/>}</button>
              <button onClick={() => duplicateFormula(f.id)} title="Duplicate" className="p-1.5 rounded text-text-ghost/40 hover:text-brand hover:bg-brand/10 bg-transparent border-none cursor-pointer"><Copy size={13}/></button>
              <button onClick={() => router.push(`/formulas/${f.id}`)} title="Edit" className="p-1.5 rounded text-text-ghost/40 hover:text-brand hover:bg-brand/10 bg-transparent border-none cursor-pointer"><Pencil size={13}/></button>
              <button onClick={() => deleteFormula(f.id)} title="Delete" className="p-1.5 rounded text-text-ghost/40 hover:text-status-red hover:bg-status-red/10 bg-transparent border-none cursor-pointer"><Trash2 size={13}/></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center"><FlaskConical size={32} className="text-text-ghost mx-auto mb-3" /><p className="text-sm text-text-ghost">{formulas.length===0?'No formulas yet. Create your first ration.':statusFilter==='template'?'No templates yet. Mark a formula as template with the bookmark icon.':'No formulas match your filters.'}</p></div>
        )}
      </div>

      {/* ── CREATE MODAL ──────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-text">New Formula</h2><button onClick={() => setShowCreate(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <div className="flex flex-col gap-3.5">
              {(sameSpeciesTemplates.length > 0 || otherSpeciesTemplates.length > 0) && (
                <div className="p-3 rounded-lg border border-status-amber/20 bg-status-amber/5">
                  <label className="text-xs font-semibold text-status-amber block mb-1.5">{'\u2B50'} Start from template</label>
                  <select value={newTemplateId} onChange={e => setNewTemplateId(e.target.value)} className="input">
                    <option value="">Empty formula — start fresh</option>
                    {sameSpeciesTemplates.length > 0 && (
                      <optgroup label={SPECIES_LABELS[newSpecies] || newSpecies}>
                        {sameSpeciesTemplates.map(f => (
                          <option key={f.id} value={f.id}>{f.name} — {getStageLabel(f.species, f.production_stage)}{f.breed ? ' \u00B7 ' + f.breed : ''}</option>
                        ))}
                      </optgroup>
                    )}
                    {otherSpeciesTemplates.length > 0 && (
                      <optgroup label="Other species">
                        {otherSpeciesTemplates.map(f => (
                          <option key={f.id} value={f.id}>{f.name} — {SPECIES_LABELS[f.species]} {'\u00B7'} {getStageLabel(f.species, f.production_stage)}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <p className="text-2xs text-text-ghost mt-1">Copies all ingredients and inclusion rates into the new formula.</p>
                </div>
              )}
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Formula Name *</label><input value={newName} onChange={e => setNewName(e.target.value)} className="input" placeholder="e.g. Early Lact — High Production 28L" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Client</label>
                <select value={newClientId} onChange={e => setNewClientId(e.target.value)} className="input">
                  <option value="">No client (template)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Species *</label>
                  <select value={newSpecies} onChange={e => setNewSpecies(e.target.value)} className="input">
                    {SPECIES_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Production Stage *</label>
                  <select value={newStage} onChange={e => setNewStage(e.target.value)} className="input">
                    <option value="">Select stage...</option>
                    {stageGroups.map(g => (<optgroup key={g} label={g}>{stageOptions.filter(s => s.group === g).map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}</optgroup>))}
                  </select>
                </div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Breed *</label>
                <select value={newBreed} onChange={e => setNewBreed(e.target.value)} className="input">
                  <option value="">Select breed...</option>
                  {breedOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <p className="text-2xs text-text-ghost mt-1">Breed determines specific nutritional requirements.</p>
              </div>
              {newClientId && filteredAnimalGroups.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Link to Animal Group <span className="text-text-ghost font-normal">(optional)</span></label>
                  <select value={newAnimalGroupId} onChange={e => setNewAnimalGroupId(e.target.value)} className="input">
                    <option value="">No specific group</option>
                    {filteredAnimalGroups.map(ag => (<option key={ag.id} value={ag.id}>{ag.name} — {ag.breed || ag.species} ({ag.count} head{ag.avg_weight_kg ? ', ' + ag.avg_weight_kg + 'kg' : ''})</option>))}
                  </select>
                  <p className="text-2xs text-text-ghost mt-1">Pre-fills production data from the animal group.</p>
                </div>
              )}
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Batch Size (kg)</label><input type="number" value={newBatch} onChange={e => setNewBatch(e.target.value)} className="input" min="100" step="100" /></div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowCreate(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button onClick={handleCreate} disabled={loading || !newName.trim() || !newStage} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{loading ? 'Creating...' : newTemplateId ? 'Create from Template' : 'Create Formula'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
