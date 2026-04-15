'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Copy, Save, Trash2, Plus, Search, ChevronRight, Shield, User, Loader2, AlertTriangle, Check } from 'lucide-react'

interface Req {
  nutrient: string
  unit: string
  min: number | null
  max: number | null
  target: number
  critical_min?: number | null
  critical_max?: number | null
}

interface Ratio {
  name: string
  min: number
  max: number
  target: number
  unit?: string
}

interface Profile {
  id: string
  species: string
  production_stage: string
  breed: string | null
  stage_name: string | null
  requirements: Req[]
  ratios: Ratio[]
  nutritionist_id: string | null
  created_at?: string
  description?: string | null
}

interface ProfileEditorModalProps {
  open: boolean
  onClose: () => void
  species?: string
  stage?: string
  /** Called when a profile is selected/assigned — returns the profile id */
  onProfileSelected?: (profileId: string) => void
  /** If provided, shows "Assign" button for this animal group */
  animalGroupId?: string
  animalGroupName?: string
}

// ── Default requirements template for new profiles ──
const DEFAULT_RUMINANT_REQS: Req[] = [
  { nutrient: 'Crude Protein (CP)', unit: '%', min: 14, max: 18, target: 16, critical_min: 12, critical_max: 22 },
  { nutrient: 'Metabolisable Energy (ME)', unit: 'MJ/kg', min: 10.5, max: 12.5, target: 11.5, critical_min: 8, critical_max: 14 },
  { nutrient: 'NDF', unit: '%', min: 28, max: 40, target: 33, critical_min: 22, critical_max: 50 },
  { nutrient: 'Ether Extract (Fat)', unit: '%', min: 3, max: 6, target: 4.5, critical_min: 1, critical_max: 8 },
  { nutrient: 'Calcium', unit: '%', min: 0.6, max: 1.0, target: 0.8, critical_min: 0.3, critical_max: 1.5 },
  { nutrient: 'Phosphorus', unit: '%', min: 0.3, max: 0.5, target: 0.4, critical_min: 0.2, critical_max: 0.8 },
  { nutrient: 'Lysine', unit: '%', min: 0.5, max: 0.8, target: 0.65, critical_min: null, critical_max: null },
]

const DEFAULT_PIG_REQS: Req[] = [
  { nutrient: 'Crude Protein (CP)', unit: '%', min: 16, max: 20, target: 18, critical_min: 14, critical_max: 24 },
  { nutrient: 'Net Energy (NE)', unit: 'MJ/kg', min: 9.5, max: 10.5, target: 10.0, critical_min: 8.5, critical_max: 11.5 },
  { nutrient: 'SID Lysine', unit: '%', min: 0.95, max: 1.20, target: 1.10, critical_min: 0.70, critical_max: 1.40 },
  { nutrient: 'SID Met+Cys', unit: '%', min: 0.55, max: 0.70, target: 0.62, critical_min: null, critical_max: null },
  { nutrient: 'SID Threonine', unit: '%', min: 0.60, max: 0.78, target: 0.70, critical_min: null, critical_max: null },
  { nutrient: 'SID Tryptophan', unit: '%', min: 0.17, max: 0.23, target: 0.20, critical_min: null, critical_max: null },
  { nutrient: 'STTD Phosphorus', unit: '%', min: 0.30, max: 0.42, target: 0.36, critical_min: 0.20, critical_max: 0.55 },
  { nutrient: 'Calcium', unit: '%', min: 0.60, max: 0.85, target: 0.72, critical_min: 0.40, critical_max: 1.10 },
]

const DEFAULT_POULTRY_REQS: Req[] = [
  { nutrient: 'Crude Protein (CP)', unit: '%', min: 18, max: 23, target: 21, critical_min: 16, critical_max: 26 },
  { nutrient: 'AME', unit: 'MJ/kg', min: 11.5, max: 13.0, target: 12.2, critical_min: 10.5, critical_max: 14.0 },
  { nutrient: 'Dig Lysine', unit: '%', min: 1.00, max: 1.25, target: 1.12, critical_min: 0.85, critical_max: 1.40 },
  { nutrient: 'Dig Met+Cys', unit: '%', min: 0.75, max: 0.95, target: 0.85, critical_min: null, critical_max: null },
  { nutrient: 'Dig Threonine', unit: '%', min: 0.65, max: 0.82, target: 0.73, critical_min: null, critical_max: null },
  { nutrient: 'Avail Phosphorus', unit: '%', min: 0.30, max: 0.45, target: 0.38, critical_min: 0.22, critical_max: 0.55 },
  { nutrient: 'Calcium', unit: '%', min: 0.80, max: 1.05, target: 0.90, critical_min: 0.60, critical_max: 1.20 },
  { nutrient: 'Linoleic Acid', unit: '%', min: 1.0, max: 2.5, target: 1.5, critical_min: null, critical_max: null },
]

function getDefaultReqs(species: string): Req[] {
  if (species === 'pig') return DEFAULT_PIG_REQS
  if (species === 'poultry') return DEFAULT_POULTRY_REQS
  return DEFAULT_RUMINANT_REQS
}

const SPECIES_OPTIONS = ['cattle', 'beef', 'sheep', 'pig', 'poultry']
const STAGE_OPTIONS: Record<string, string[]> = {
  cattle: ['early_lactation', 'mid_lactation', 'late_lactation', 'dry_far_off', 'dry_close_up', 'transition', 'heifer_growing'],
  beef: ['grower', 'finisher', 'backgrounding', 'breeder_cow', 'bull_growing'],
  sheep: ['lamb_growing', 'ewe_lactation', 'ewe_maintenance', 'ram_maintenance'],
  pig: ['starter', 'grower', 'finisher', 'sow_gestation', 'sow_lactation', 'boar'],
  poultry: ['broiler_starter', 'broiler_grower', 'broiler_finisher', 'layer', 'breeder'],
}

export default function ProfileEditorModal({
  open,
  onClose,
  species: filterSpecies,
  stage: filterStage,
  onProfileSelected,
  animalGroupId,
  animalGroupName,
}: ProfileEditorModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'system' | 'custom'>('system')
  const [search, setSearch] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState(filterSpecies || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // ── Editing state ──
  const [editName, setEditName] = useState('')
  const [editSpecies, setEditSpecies] = useState('')
  const [editStage, setEditStage] = useState('')
  const [editBreed, setEditBreed] = useState('')
  const [editReqs, setEditReqs] = useState<Req[]>([])
  const [editRatios, setEditRatios] = useState<Ratio[]>([])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // ── Load profiles ──
  useEffect(() => {
    if (open) loadProfiles()
  }, [open])

  async function loadProfiles() {
    setLoading(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || null)

    let query = supabase.from('animal_requirements').select('*').order('species').order('production_stage')
    if (speciesFilter) query = query.eq('species', speciesFilter)

    // Load both system (nutritionist_id is null) and user's custom profiles
    if (user) {
      query = query.or(`nutritionist_id.is.null,nutritionist_id.eq.${user.id}`)
    } else {
      query = query.is('nutritionist_id', null)
    }

    const { data } = await query
    setProfiles(data || [])
    setLoading(false)
  }

  const systemProfiles = profiles.filter(p => p.nutritionist_id === null)
  const customProfiles = profiles.filter(p => p.nutritionist_id !== null)

  const filteredProfiles = (tab === 'system' ? systemProfiles : customProfiles).filter(p => {
    if (search && !p.stage_name?.toLowerCase().includes(search.toLowerCase()) &&
        !p.production_stage.toLowerCase().includes(search.toLowerCase()) &&
        !p.species.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selectedProfile = profiles.find(p => p.id === selectedId)
  const isOwn = selectedProfile?.nutritionist_id === userId && userId !== null
  const isSystem = selectedProfile?.nutritionist_id === null

  // ── Select a profile ──
  function selectProfile(p: Profile) {
    setSelectedId(p.id)
    setEditMode(false)
    populateEditor(p)
  }

  function populateEditor(p: Profile) {
    setEditName(p.stage_name || p.production_stage)
    setEditSpecies(p.species)
    setEditStage(p.production_stage)
    setEditBreed(p.breed || '')
    setEditReqs([...(p.requirements || [])])
    setEditRatios([...(p.ratios || [])])
  }

  // ── Duplicate profile ──
  async function handleDuplicate() {
    if (!selectedProfile) return
    setSaving(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data, error } = await supabase.from('animal_requirements').insert({
      species: selectedProfile.species,
      production_stage: selectedProfile.production_stage,
      breed: selectedProfile.breed,
      stage_name: `${selectedProfile.stage_name || selectedProfile.production_stage} (custom)`,
      requirements: selectedProfile.requirements,
      ratios: selectedProfile.ratios,
      nutritionist_id: user.id,
    }).select('*').single()

    if (data) {
      await loadProfiles()
      setSelectedId(data.id)
      setTab('custom')
      setEditMode(true)
      populateEditor(data)
      showToast('Profile duplicated — edit and save')
    }
    setSaving(false)
  }

  // ── Create new profile ──
  async function handleCreateNew() {
    const sp = speciesFilter || 'cattle'
    setSaving(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data, error } = await supabase.from('animal_requirements').insert({
      species: sp,
      production_stage: STAGE_OPTIONS[sp]?.[0] || 'custom',
      breed: null,
      stage_name: 'New Custom Profile',
      requirements: getDefaultReqs(sp),
      ratios: [],
      nutritionist_id: user.id,
    }).select('*').single()

    if (data) {
      await loadProfiles()
      setSelectedId(data.id)
      setTab('custom')
      setEditMode(true)
      populateEditor(data)
      showToast('New profile created')
    }
    setSaving(false)
  }

  // ── Save edits ──
  async function handleSave() {
    if (!selectedId || !isOwn) return
    setSaving(true)
    const supabase = await getSupabase()
    const { error } = await supabase.from('animal_requirements').update({
      stage_name: editName,
      species: editSpecies,
      production_stage: editStage,
      breed: editBreed || null,
      requirements: editReqs,
      ratios: editRatios,
    }).eq('id', selectedId)

    if (!error) {
      await loadProfiles()
      setEditMode(false)
      showToast('Profile saved')
    }
    setSaving(false)
  }

  // ── Delete ──
  async function handleDelete() {
    if (!selectedId || !isOwn) return
    if (!confirm('Delete this custom profile? This cannot be undone.')) return
    setDeleting(true)
    const supabase = await getSupabase()
    await supabase.from('animal_requirements').delete().eq('id', selectedId)
    await loadProfiles()
    setSelectedId(null)
    setEditMode(false)
    setDeleting(false)
    showToast('Profile deleted')
  }

  // ── Assign to animal group ──
  async function handleAssign() {
    if (!selectedId || !animalGroupId) return
    setSaving(true)
    const supabase = await getSupabase()
    await supabase.from('client_animals').update({ requirement_profile_id: selectedId }).eq('id', animalGroupId)
    onProfileSelected?.(selectedId)
    setSaving(false)
    showToast(`Profile assigned to ${animalGroupName || 'group'}`)
  }

  // ── Requirement editing helpers ──
  function updateReq(idx: number, field: keyof Req, value: any) {
    const u = [...editReqs]
    u[idx] = { ...u[idx], [field]: value }
    setEditReqs(u)
  }

  function addReqRow() {
    setEditReqs([...editReqs, { nutrient: 'New Nutrient', unit: '%', min: 0, max: 0, target: 0, critical_min: null, critical_max: null }])
  }

  function removeReqRow(idx: number) {
    setEditReqs(editReqs.filter((_, i) => i !== idx))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-card rounded-xl border border-border w-full max-w-5xl shadow-2xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-brand" />
            <div>
              <div className="text-base font-bold text-text">Requirement Profiles</div>
              <div className="text-2xs text-text-ghost">
                {speciesFilter ? `${speciesFilter} profiles` : 'All species'} · {systemProfiles.length} system · {customProfiles.length} custom
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {animalGroupId && selectedId && (
              <button onClick={handleAssign} disabled={saving} className="btn btn-primary btn-sm">
                <Check size={14} /> Assign to {animalGroupName || 'group'}
              </button>
            )}
            <button onClick={onClose} className="text-text-ghost bg-transparent border-none cursor-pointer hover:text-text-muted">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="flex flex-1 min-h-0">
          
          {/* ── LEFT: Profile List ── */}
          <div className="w-[280px] border-r border-border flex flex-col bg-surface-bg/50">
            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setTab('system')}
                className={`flex-1 py-2 text-2xs font-bold uppercase text-center border-none cursor-pointer ${tab === 'system' ? 'bg-surface-card text-brand' : 'bg-transparent text-text-ghost hover:text-text-muted'}`}
              >
                <Shield size={10} className="inline mr-1" /> System ({systemProfiles.length})
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`flex-1 py-2 text-2xs font-bold uppercase text-center border-none cursor-pointer ${tab === 'custom' ? 'bg-surface-card text-brand' : 'bg-transparent text-text-ghost hover:text-text-muted'}`}
              >
                <User size={10} className="inline mr-1" /> Custom ({customProfiles.length})
              </button>
            </div>

            {/* Search + species filter */}
            <div className="p-2 border-b border-border space-y-1.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ghost" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-2 py-1.5 rounded border border-border bg-surface-deep text-text-dim text-xs outline-none focus:border-brand"
                />
              </div>
              {!filterSpecies && (
                <select
                  value={speciesFilter}
                  onChange={e => setSpeciesFilter(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-border bg-surface-deep text-text-dim text-xs outline-none cursor-pointer"
                >
                  <option value="">All species</option>
                  {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>

            {/* Profile list */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-text-ghost">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-text-ghost">
                  {tab === 'custom' ? 'No custom profiles yet.' : 'No profiles found.'}
                </div>
              ) : (
                filteredProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectProfile(p)}
                    className={`w-full text-left px-3 py-2 border-b border-border/30 cursor-pointer transition-colors ${
                      selectedId === p.id
                        ? 'bg-brand/10 border-l-2 border-l-brand'
                        : 'bg-transparent border-l-2 border-l-transparent hover:bg-surface-card'
                    }`}
                  >
                    <div className="text-xs font-semibold text-text-dim truncate">
                      {p.stage_name || p.production_stage}
                    </div>
                    <div className="text-[10px] text-text-ghost mt-0.5 flex items-center gap-1.5">
                      <span className={`px-1 py-0 rounded text-[9px] font-bold uppercase ${
                        p.species === 'pig' ? 'bg-[#BE5529]/15 text-[#BE5529]' :
                        p.species === 'poultry' ? 'bg-[#C9A043]/15 text-[#C9A043]' :
                        'bg-[#2E6B42]/15 text-[#2E6B42]'
                      }`}>{p.species}</span>
                      <span>{p.production_stage.replace(/_/g, ' ')}</span>
                      {p.breed && <span className="text-text-ghost">· {p.breed}</span>}
                    </div>
                    <div className="text-[9px] text-text-ghost mt-0.5">
                      {(p.requirements || []).length} nutrients
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Create new button */}
            <div className="p-2 border-t border-border">
              <button onClick={handleCreateNew} disabled={saving} className="btn btn-ghost btn-sm w-full justify-center">
                <Plus size={14} /> New Profile
              </button>
            </div>
          </div>

          {/* ── RIGHT: Editor Panel ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedProfile ? (
              <div className="flex-1 flex items-center justify-center text-text-ghost text-sm">
                Select a profile to view or edit
              </div>
            ) : (
              <>
                {/* Profile header */}
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {editMode ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 rounded border border-brand/30 bg-surface-deep text-text text-sm font-bold outline-none focus:border-brand"
                            placeholder="Profile name"
                          />
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={editSpecies}
                            onChange={e => { setEditSpecies(e.target.value); setEditStage(STAGE_OPTIONS[e.target.value]?.[0] || '') }}
                            className="px-2 py-1 rounded border border-border bg-surface-deep text-text-dim text-xs outline-none cursor-pointer"
                          >
                            {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select
                            value={editStage}
                            onChange={e => setEditStage(e.target.value)}
                            className="px-2 py-1 rounded border border-border bg-surface-deep text-text-dim text-xs outline-none cursor-pointer"
                          >
                            {(STAGE_OPTIONS[editSpecies] || []).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            <option value="custom">custom</option>
                          </select>
                          <input
                            value={editBreed}
                            onChange={e => setEditBreed(e.target.value)}
                            placeholder="Breed (optional)"
                            className="px-2 py-1 rounded border border-border bg-surface-deep text-text-dim text-xs outline-none flex-1"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-text">{selectedProfile.stage_name || selectedProfile.production_stage}</span>
                          <span className={`text-2xs px-1.5 py-0.5 rounded font-bold uppercase ${
                            isSystem ? 'bg-status-blue/10 text-status-blue' : 'bg-brand/10 text-brand'
                          }`}>{isSystem ? 'system' : 'custom'}</span>
                        </div>
                        <div className="text-2xs text-text-ghost mt-0.5">
                          {selectedProfile.species} · {selectedProfile.production_stage.replace(/_/g, ' ')}
                          {selectedProfile.breed ? ` · ${selectedProfile.breed}` : ''}
                          {' · '}{(selectedProfile.requirements || []).length} nutrients
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 ml-3">
                    {isSystem && (
                      <button onClick={handleDuplicate} disabled={saving} className="btn btn-ghost btn-sm" title="Duplicate as custom profile">
                        <Copy size={13} /> Duplicate
                      </button>
                    )}
                    {isOwn && !editMode && (
                      <button onClick={() => setEditMode(true)} className="btn btn-ghost btn-sm">
                        Edit
                      </button>
                    )}
                    {isOwn && editMode && (
                      <>
                        <button onClick={() => { setEditMode(false); populateEditor(selectedProfile) }} className="btn btn-ghost btn-sm">
                          Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                        </button>
                      </>
                    )}
                    {isOwn && (
                      <button onClick={handleDelete} disabled={deleting} className="btn btn-ghost btn-sm text-status-red hover:bg-status-red/10" title="Delete profile">
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Requirements table */}
                <div className="flex-1 overflow-auto px-5 py-3">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                    Nutrient Requirements
                    <span className="flex-1 h-px bg-border" />
                    {editMode && (
                      <button onClick={addReqRow} className="flex items-center gap-1 text-brand hover:text-brand/80 cursor-pointer bg-transparent border-none">
                        <Plus size={11} /> Add Row
                      </button>
                    )}
                  </div>

                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_50px_65px_65px_65px_65px_65px_24px] gap-1 px-1 py-1 text-[9px] font-bold text-text-ghost uppercase tracking-wider border-b border-border">
                    <span>Nutrient</span>
                    <span className="text-center">Unit</span>
                    <span className="text-center">Crit Min</span>
                    <span className="text-center">Min</span>
                    <span className="text-center">Target</span>
                    <span className="text-center">Max</span>
                    <span className="text-center">Crit Max</span>
                    <span />
                  </div>

                  {/* Rows */}
                  {(editMode ? editReqs : (selectedProfile.requirements || [])).map((req, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-[1fr_50px_65px_65px_65px_65px_65px_24px] gap-1 px-1 py-1 items-center border-b border-border/20 ${
                        idx % 2 === 0 ? '' : 'bg-surface-bg/30'
                      }`}
                    >
                      {editMode ? (
                        <>
                          <input
                            value={req.nutrient}
                            onChange={e => updateReq(idx, 'nutrient', e.target.value)}
                            className="px-1.5 py-0.5 rounded border border-border bg-surface-deep text-text-dim text-xs outline-none focus:border-brand"
                          />
                          <input
                            value={req.unit}
                            onChange={e => updateReq(idx, 'unit', e.target.value)}
                            className="px-1 py-0.5 rounded border border-border bg-surface-deep text-text-dim text-[10px] font-mono text-center outline-none"
                          />
                          {(['critical_min', 'min', 'target', 'max', 'critical_max'] as const).map(field => (
                            <input
                              key={field}
                              type="number"
                              step="0.01"
                              value={req[field] ?? ''}
                              onChange={e => updateReq(idx, field, e.target.value === '' ? null : parseFloat(e.target.value))}
                              className={`px-1 py-0.5 rounded border bg-surface-deep text-[10px] font-mono text-center outline-none ${
                                field === 'target' ? 'border-brand/30 text-brand font-bold' :
                                field.includes('critical') ? 'border-status-red/20 text-status-red/70' :
                                'border-border text-text-dim'
                              }`}
                            />
                          ))}
                          <button onClick={() => removeReqRow(idx)} className="bg-transparent border-none cursor-pointer text-text-ghost/40 hover:text-status-red">
                            <X size={11} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-text-dim">{req.nutrient}</span>
                          <span className="text-[10px] font-mono text-text-ghost text-center">{req.unit}</span>
                          <span className={`text-[10px] font-mono text-center ${req.critical_min != null ? 'text-status-red/60' : 'text-text-ghost/30'}`}>
                            {req.critical_min != null ? req.critical_min : '—'}
                          </span>
                          <span className="text-[10px] font-mono text-center text-text-muted">{req.min ?? '—'}</span>
                          <span className="text-[10px] font-mono text-center text-brand font-bold">{req.target}</span>
                          <span className="text-[10px] font-mono text-center text-text-muted">{req.max ?? '—'}</span>
                          <span className={`text-[10px] font-mono text-center ${req.critical_max != null ? 'text-status-red/60' : 'text-text-ghost/30'}`}>
                            {req.critical_max != null ? req.critical_max : '—'}
                          </span>
                          <span />
                        </>
                      )}
                    </div>
                  ))}

                  {(selectedProfile.requirements || []).length === 0 && !editMode && (
                    <div className="py-6 text-center text-xs text-text-ghost">No requirements defined.</div>
                  )}

                  {/* Ratios section */}
                  {((editMode ? editRatios : selectedProfile.ratios) || []).length > 0 && (
                    <>
                      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mt-4 mb-2 flex items-center gap-2">
                        Ratios
                        <span className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid grid-cols-[1fr_50px_65px_65px_65px] gap-1 px-1 py-1 text-[9px] font-bold text-text-ghost uppercase tracking-wider border-b border-border">
                        <span>Ratio</span>
                        <span className="text-center">Unit</span>
                        <span className="text-center">Min</span>
                        <span className="text-center">Target</span>
                        <span className="text-center">Max</span>
                      </div>
                      {(editMode ? editRatios : selectedProfile.ratios || []).map((ratio, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_50px_65px_65px_65px] gap-1 px-1 py-1 items-center border-b border-border/20">
                          <span className="text-xs text-text-dim">{ratio.name}</span>
                          <span className="text-[10px] font-mono text-text-ghost text-center">{ratio.unit || ':1'}</span>
                          <span className="text-[10px] font-mono text-center text-text-muted">{ratio.min}</span>
                          <span className="text-[10px] font-mono text-center text-brand font-bold">{ratio.target}</span>
                          <span className="text-[10px] font-mono text-center text-text-muted">{ratio.max}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer info */}
                {isSystem && !editMode && (
                  <div className="px-5 py-2 border-t border-border bg-surface-bg/30">
                    <div className="flex items-center gap-2 text-[10px] text-text-ghost">
                      <AlertTriangle size={11} className="text-status-amber" />
                      System profiles are read-only. Duplicate to create an editable copy.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── TOAST ── */}
        {toast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold shadow-lg animate-pulse">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
