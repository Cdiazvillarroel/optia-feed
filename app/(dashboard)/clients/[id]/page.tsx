'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, X, ChevronRight, Check, AlertTriangle, Shield } from 'lucide-react'
import ProfileEditorModal from '@/components/ProfileEditorModal'

const STAGES: Record<string, string[]> = {
  cattle: ['early_lactation','mid_lactation','late_lactation','dry_cow_far_off','dry_cow_close_up','heifer_growing','heifer_pre_calving'],
  beef: ['feedlot_induction','feedlot_grower','feedlot_finisher','growing_steer','pastoral_breeding','pastoral_lactation','pastoral_weaner'],
  pig: ['nursery_phase1','nursery_phase2','nursery_phase3','grower_23_41','grower_41_59','finisher_59_82','finisher_82_104','finisher_104_market','gestation_gilt','gestation_sow_ideal','gestation_sow_recovery','lactation_gilt','lactation_sow','mature_boar'],
  poultry: ['broiler_starter','broiler_grower','broiler_finisher','layer_pullet','layer_production'],
  sheep: ['ewe_maintenance','ewe_lactation','lamb_growing','lamb_finishing'],
}

const STAGE_LABELS: Record<string,string> = {
  early_lactation:'Early Lactation',mid_lactation:'Mid Lactation',late_lactation:'Late Lactation',
  dry_cow_far_off:'Dry Cow — Far Off',dry_cow_close_up:'Dry Cow — Close Up',
  heifer_growing:'Heifer — Growing',heifer_pre_calving:'Heifer — Pre-calving',
  feedlot_induction:'Feedlot — Induction',feedlot_grower:'Feedlot — Grower',feedlot_finisher:'Feedlot — Finisher',
  growing_steer:'Growing Steer',pastoral_breeding:'Pastoral — Breeding',pastoral_lactation:'Pastoral — Lactation',pastoral_weaner:'Pastoral — Weaner',
  nursery_phase1:'Nursery Phase 1',nursery_phase2:'Nursery Phase 2',nursery_phase3:'Nursery Phase 3',
  grower_23_41:'Grower (23-41kg)',grower_41_59:'Grower (41-59kg)',
  finisher_59_82:'Finisher (59-82kg)',finisher_82_104:'Finisher (82-104kg)',finisher_104_market:'Late Finisher',
  gestation_gilt:'Gestating Gilt',gestation_sow_ideal:'Gestating Sow',gestation_sow_recovery:'Gestating Sow (Recovery)',
  lactation_gilt:'Lactating Gilt',lactation_sow:'Lactating Sow',mature_boar:'Mature Boar',
  broiler_starter:'Broiler — Starter',broiler_grower:'Broiler — Grower',broiler_finisher:'Broiler — Finisher',
  layer_pullet:'Layer — Pullet',layer_production:'Layer — Production',
  ewe_maintenance:'Ewe — Maintenance',ewe_lactation:'Ewe — Lactation',lamb_growing:'Lamb — Growing',lamb_finishing:'Lamb — Finishing',
}

function stageLabel(stage: string): string { return STAGE_LABELS[stage] || stage?.replace(/_/g,' ') || '—' }

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function daysColor(days: number): string {
  if (days <= 5) return 'text-status-red'
  if (days <= 14) return 'text-status-amber'
  return 'text-brand'
}

function barColor(pct: number): string {
  if (pct <= 20) return 'bg-status-red'
  if (pct <= 45) return 'bg-status-amber'
  return 'bg-brand'
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [animals, setAnimals] = useState<any[]>([])
  const [formulas, setFormulas] = useState<any[]>([])
  const [silos, setSilos] = useState<any[]>([])
  const [requirementProfiles, setRequirementProfiles] = useState<any[]>([])
  const [showProfileSelector, setShowProfileSelector] = useState<string|null>(null)
  const [showAddAnimal, setShowAddAnimal] = useState(false)
  const [showEditAnimal, setShowEditAnimal] = useState(false)
  const [editingAnimal, setEditingAnimal] = useState<any>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editSpecies, setEditSpecies] = useState<string[]>([])
  const [animalSpecies, setAnimalSpecies] = useState('cattle')
  const [editAnimalSpecies, setEditAnimalSpecies] = useState('cattle')
  const [loading, setLoading] = useState(false)
  // ── Profile Editor Modal state ──
  const [showProfileEditor, setShowProfileEditor] = useState(false)
  const [profileEditorTarget, setProfileEditorTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => { loadData() }, [params.id])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: c } = await supabase.from('nutrition_clients').select('*').eq('id', params.id).single()
    if (!c) { router.push('/clients'); return }
    setClient(c)
    setEditSpecies(c.species || [])
    setAnimalSpecies(c.species?.[0] || 'cattle')

    // Load animal groups WITH their assigned requirement profile
    const { data: a } = await supabase.from('client_animals')
      .select('*, requirement_profile:animal_requirements(id, stage_name, species, production_stage, breed, requirements), formulas!formulas_animal_group_id_fkey(id, name, status)')
      .eq('client_id', params.id).order('name')
    setAnimals(a || [])

    // Load all available requirement profiles for the selector
    const { data: reqProfiles } = await supabase.from('animal_requirements')
      .select('*')
      .or(`nutritionist_id.is.null${user?',nutritionist_id.eq.'+user.id:''}`)
    setRequirementProfiles(reqProfiles || [])

    const { data: f } = await supabase.from('formulas').select('*').eq('client_id', params.id).not('status','eq','archived').order('updated_at', { ascending: false })
    setFormulas(f || [])

    const { data: s } = await supabase.from('feedflow_silos').select('*').eq('client_id', params.id).order('current_tonnes', { ascending: true })
    setSilos(s || [])
  }

  async function assignProfile(animalGroupId: string, profileId: string) {
    const supabase = await getSupabase()
    await supabase.from('client_animals').update({ requirement_profile_id: profileId }).eq('id', animalGroupId)
    setShowProfileSelector(null)
    loadData()
  }

  async function handleAddAnimal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    await supabase.from('client_animals').insert({
      client_id: params.id,
      name: form.get('name') as string,
      species: animalSpecies,
      breed: form.get('breed') as string || null,
      production_stage: form.get('production_stage') as string,
      count: parseInt(form.get('count') as string) || 0,
      avg_weight_kg: parseFloat(form.get('avg_weight_kg') as string) || null,
      target_adg: parseFloat(form.get('target_adg_kg') as string) || null,
      milk_yield: parseFloat(form.get('target_milk_yield_l') as string) || null,
      dmi_kg: parseFloat(form.get('dmi_kg') as string) || null,
    })
    setShowAddAnimal(false)
    setLoading(false)
    loadData()
  }

  function openEditAnimal(a: any) {
    setEditingAnimal(a)
    setEditAnimalSpecies(a.species || client?.species?.[0] || 'cattle')
    setShowEditAnimal(true)
  }

  async function handleEditAnimal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    await supabase.from('client_animals').update({
      name: form.get('name') as string,
      species: editAnimalSpecies,
      breed: form.get('breed') as string || null,
      production_stage: form.get('production_stage') as string,
      count: parseInt(form.get('count') as string) || 0,
      avg_weight_kg: parseFloat(form.get('avg_weight_kg') as string) || null,
      target_adg: parseFloat(form.get('target_adg_kg') as string) || null,
      milk_yield: parseFloat(form.get('target_milk_yield_l') as string) || null,
      dmi_kg: parseFloat(form.get('dmi_kg') as string) || null,
    }).eq('id', editingAnimal.id)
    setShowEditAnimal(false)
    setEditingAnimal(null)
    setLoading(false)
    loadData()
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    await supabase.from('nutrition_clients').update({
      name: form.get('name') as string,
      species: editSpecies,
      contact_name: form.get('contact_name') as string || null,
      contact_email: form.get('contact_email') as string || null,
      contact_phone: form.get('contact_phone') as string || null,
      location: form.get('location') as string || null,
      notes: form.get('notes') as string || null,
    }).eq('id', params.id)
    setShowEdit(false)
    setLoading(false)
    loadData()
  }

  async function handleDelete() {
    const supabase = await getSupabase()
    await supabase.from('nutrition_clients').update({ active: false }).eq('id', params.id)
    router.push('/clients')
  }

  async function handleDeleteAnimal(id: string) {
    if (!confirm('Delete this animal group? Linked formulas will be unlinked.')) return
    const supabase = await getSupabase()
    await supabase.from('client_animals').delete().eq('id', id)
    loadData()
  }

  // ── Profile editor helpers ──
  function openProfileEditorForGroup(ag: any) {
    setProfileEditorTarget({ id: ag.id, name: ag.name })
    setShowProfileEditor(true)
  }

  function openProfileEditorBrowse() {
    setProfileEditorTarget(null)
    setShowProfileEditor(true)
  }

  if (!client) return <div className="p-7 text-text-ghost">Loading...</div>

  const totalAnimals = animals.reduce((s, a) => s + (a.count || 0), 0)
  const isConnected = !!client.feedflow_client_id
  const syncedFormulas = formulas.filter((f: any) => f.feedflow_synced_at)
  const unsyncedFormulas = formulas.filter((f: any) => !f.feedflow_synced_at)
  const groupsWithProfile = animals.filter(a => a.requirement_profile)
  const groupsWithoutProfile = animals.filter(a => !a.requirement_profile)

  return (
    <div className="p-7 max-w-[1200px]">
      <Link href="/clients" className="text-sm text-text-ghost hover:text-text-muted mb-4 inline-block no-underline">&#8592; Back to Clients</Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-text">{client.name}</h1>
            {client.feedflow_client_id && <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">FEEDFLOW</span>}
          </div>
          <p className="text-base text-text-faint">{[client.contact_name, client.location].filter(Boolean).join(' \u00B7 ') || 'No contact info'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn btn-ghost btn-sm"><Edit2 size={14} /> Edit</button>
          <button onClick={() => setShowDelete(true)} className="btn btn-ghost btn-sm text-status-red"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3.5 mb-6">
        {[{l:'Total Animals',v:totalAnimals||'\u2014'},{l:'Animal Groups',v:animals.length},{l:'Formulas',v:formulas.length}].map((s,i) => (
          <div key={i} className="stat-card"><div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.l}</div><div className="text-xl font-bold text-text-dim font-mono">{s.v}</div></div>
        ))}
      </div>

      {(client.contact_email || client.contact_phone) && (
        <div className="card p-4 mb-4"><div className="flex gap-6">
          {client.contact_name && <div><span className="text-xs text-text-ghost">Contact</span><div className="text-sm text-text-dim font-semibold">{client.contact_name}</div></div>}
          {client.contact_email && <div><span className="text-xs text-text-ghost">Email</span><div className="text-sm text-text-dim">{client.contact_email}</div></div>}
          {client.contact_phone && <div><span className="text-xs text-text-ghost">Phone</span><div className="text-sm text-text-dim font-mono">{client.contact_phone}</div></div>}
          {client.location && <div><span className="text-xs text-text-ghost">Location</span><div className="text-sm text-text-dim">{client.location}</div></div>}
        </div></div>
      )}

      {/* ── ANIMAL GROUPS ─────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-text-dim">Animal Groups</span>
            {groupsWithoutProfile.length > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded bg-status-amber/10 text-status-amber font-bold">
                {groupsWithoutProfile.length} need profile
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={openProfileEditorBrowse} className="btn btn-ghost btn-sm"><Shield size={14} /> Profiles</button>
            <button onClick={() => setShowAddAnimal(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> Add Group</button>
          </div>
        </div>

        {animals.length > 0 ? animals.map((a) => {
          const linkedFormula = a.formulas?.[0] || null
          const profile = a.requirement_profile
          const hasProfile = !!profile

          // Find compatible profiles for this animal group
          const compatibleProfiles = requirementProfiles.filter(p => 
            p.species === a.species && p.production_stage === a.production_stage
          )
          const otherProfiles = requirementProfiles.filter(p => 
            p.species === a.species && p.production_stage !== a.production_stage
          )

          return (
            <div key={a.id} className="border-b border-border/5">
              <div className="flex items-center gap-3 px-4 py-2.5 group">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-text-dim truncate">{a.name}</div>
                  <div className="text-xs text-text-ghost">{a.breed ? a.breed+' \u00B7 ' : ''}{stageLabel(a.production_stage)}</div>
                </div>
                <span className="text-sm text-text-muted font-mono flex-shrink-0">{a.count} hd</span>
                <span className="text-sm text-text-muted font-mono flex-shrink-0">{a.avg_weight_kg ? a.avg_weight_kg+'kg' : '\u2014'}</span>
                {a.milk_yield > 0 && <span className="text-sm text-text-muted font-mono flex-shrink-0">{a.milk_yield} L/d</span>}
                {a.target_adg > 0 && <span className="text-sm text-text-muted font-mono flex-shrink-0">{a.target_adg} kg/d</span>}

                {/* Profile badge — click toggles inline selector, long-press/right area opens editor */}
                {hasProfile ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setShowProfileSelector(showProfileSelector === a.id ? null : a.id)}
                      className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold cursor-pointer border-none hover:bg-brand/20 flex items-center gap-1">
                      <Check size={10} /> {profile.stage_name}
                    </button>
                    <button onClick={() => openProfileEditorForGroup(a)}
                      className="text-text-ghost/40 hover:text-brand bg-transparent border-none cursor-pointer p-0.5" title="Edit profile">
                      <Shield size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setShowProfileSelector(a.id)}
                      className="text-2xs px-2 py-0.5 rounded bg-status-amber/10 text-status-amber font-bold cursor-pointer border-none hover:bg-status-amber/20 flex items-center gap-1">
                      <AlertTriangle size={10} /> Assign Profile
                    </button>
                    <button onClick={() => openProfileEditorForGroup(a)}
                      className="text-text-ghost/40 hover:text-brand bg-transparent border-none cursor-pointer p-0.5" title="Manage profiles">
                      <Shield size={11} />
                    </button>
                  </div>
                )}

                {/* Formula link or create button */}
                {hasProfile ? (
                  linkedFormula
                    ? <Link href={`/formulas/${linkedFormula.id}`} className="text-xs text-brand hover:underline no-underline flex-shrink-0 max-w-[160px] truncate">{linkedFormula.name}</Link>
                    : <button onClick={() => router.push(`/formulas?create=true&animal_group=${a.id}&client=${params.id}`)}
                        className="text-2xs px-2 py-1 rounded bg-brand/10 text-brand font-semibold cursor-pointer border border-brand/20 hover:bg-brand/20 flex-shrink-0">
                        + New Formula
                      </button>
                ) : (
                  <span className="text-2xs text-text-ghost italic flex-shrink-0">Assign profile first</span>
                )}

                <button onClick={() => openEditAnimal(a)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-brand transition-all bg-transparent border-none cursor-pointer flex-shrink-0"><Edit2 size={14} /></button>
                <button onClick={() => handleDeleteAnimal(a.id)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-status-red transition-all bg-transparent border-none cursor-pointer flex-shrink-0"><Trash2 size={14} /></button>
              </div>

              {/* Profile selector dropdown */}
              {showProfileSelector === a.id && (
                <div className="px-4 pb-3">
                  <div className="rounded-lg border border-border bg-surface-deep p-3 max-h-64 overflow-auto">
                    {compatibleProfiles.length > 0 && (
                      <>
                        <div className="text-[9px] font-bold text-brand uppercase tracking-wider mb-1.5">
                          Recommended for {stageLabel(a.production_stage)}
                        </div>
                        {compatibleProfiles.map(p => {
                          const reqs = p.requirements || []
                          const cpReq = reqs.find((r:any) => r.nutrient?.toLowerCase().includes('protein'))
                          const meReq = reqs.find((r:any) => r.nutrient?.toLowerCase().includes('energy'))
                          const isSelected = a.requirement_profile?.id === p.id
                          const isBreedMatch = p.breed === a.breed
                          return (
                            <button key={p.id} onClick={() => assignProfile(a.id, p.id)}
                              className={`w-full text-left px-2.5 py-2 rounded-lg mb-1 border-none cursor-pointer transition-colors ${isSelected ? 'bg-brand/15' : 'bg-transparent hover:bg-surface-card'}`}>
                              <div className="flex items-center gap-2">
                                {isSelected && <Check size={12} className="text-brand" />}
                                <span className={`text-sm font-semibold ${isSelected ? 'text-brand' : 'text-text-dim'}`}>{p.stage_name}</span>
                                {isBreedMatch && <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold">BREED MATCH</span>}
                                {p.nutritionist_id && <span className="text-[9px] px-1.5 py-0.5 rounded bg-status-blue/10 text-status-blue font-bold">CUSTOM</span>}
                              </div>
                              <div className="text-[10px] font-mono text-text-ghost mt-0.5">
                                {cpReq ? `CP ${cpReq.min}–${cpReq.max}%` : ''} {meReq ? `· ME ${meReq.min}–${meReq.max} MJ` : ''} · {reqs.length} nutrients
                              </div>
                            </button>
                          )
                        })}
                      </>
                    )}
                    {otherProfiles.length > 0 && (
                      <>
                        <div className="text-[9px] font-bold text-text-ghost uppercase tracking-wider mb-1 mt-2">Other {a.species} profiles</div>
                        {otherProfiles.slice(0, 6).map(p => (
                          <button key={p.id} onClick={() => assignProfile(a.id, p.id)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg mb-0.5 border-none cursor-pointer bg-transparent hover:bg-surface-card">
                            <span className="text-xs text-text-muted">{p.stage_name}</span>
                            {p.breed && <span className="text-[9px] text-text-ghost ml-1">({p.breed})</span>}
                          </button>
                        ))}
                        {otherProfiles.length > 6 && <div className="text-[9px] text-text-ghost px-2.5 py-1">+{otherProfiles.length - 6} more</div>}
                      </>
                    )}
                    {compatibleProfiles.length === 0 && otherProfiles.length === 0 && (
                      <div className="text-sm text-text-ghost text-center py-4">No profiles found for {a.species}</div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                      <button onClick={() => openProfileEditorForGroup(a)} className="flex-1 text-xs text-brand hover:text-brand/80 bg-transparent border-none cursor-pointer py-1.5 font-semibold">
                        <Shield size={11} className="inline mr-1" /> Manage Profiles
                      </button>
                      <button onClick={() => setShowProfileSelector(null)} className="flex-1 text-xs text-text-ghost hover:text-text-muted bg-transparent border-none cursor-pointer py-1.5">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }) : <div className="px-4 py-8 text-center text-sm text-text-ghost">No animal groups yet.</div>}
      </div>

      {/* ── FORMULAS ─────────────────────────────────────── */}
      <div className="card">
        <div className="card-header"><span className="text-base font-bold text-text-dim">Formulas</span></div>
        {formulas.length > 0 ? formulas.map((f) => (
          <Link key={f.id} href={`/formulas/${f.id}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#312B26] transition-colors no-underline">
            <div className="flex-1">
              <div className="text-base font-semibold text-text-dim">{f.name}</div>
              <div className="text-xs text-text-ghost capitalize">{f.species} &middot; {stageLabel(f.production_stage)} &middot; v{f.version}</div>
            </div>
            {f.feedflow_synced_at && (
              <span className="text-2xs text-text-ghost font-mono">Synced {timeAgo(f.feedflow_synced_at)}</span>
            )}
            <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase ${f.status==='draft'?'bg-status-amber/15 text-status-amber':'bg-brand/15 text-brand'}`}>{f.status}</span>
            <ChevronRight size={14} className="text-text-ghost" />
          </Link>
        )) : <div className="px-4 py-8 text-center text-sm text-text-ghost">No formulas yet.{groupsWithProfile.length > 0 ? ' Create one from an animal group above.' : ' Assign profiles to animal groups first.'}</div>}
      </div>

      {/* ── FEEDFLOW INVENTORY ─────────────────────────────── */}
      <div className="card mt-4">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-text-dim">FeedFlow Inventory</span>
            {isConnected && <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">CONNECTED</span>}
          </div>
          {isConnected && silos.length > 0 && (
            <span className="text-xs text-text-ghost">
              Last reading {timeAgo(silos.reduce((latest, s) =>
                new Date(s.last_reading_at) > new Date(latest) ? s.last_reading_at : latest
              , silos[0].last_reading_at))}
            </span>
          )}
        </div>

        {isConnected && silos.length > 0 ? (
          <div className="px-4 py-2">
            <div className="flex items-center gap-3 py-2 text-xs font-semibold text-text-faint uppercase tracking-wider">
              <span className="w-[140px]">Ingredient</span>
              <span className="flex-1">Level</span>
              <span className="w-[90px] text-right">Stock</span>
              <span className="w-[50px] text-right">Days</span>
            </div>
            {silos.map((silo: any) => {
              const pct = Math.round((silo.current_tonnes / silo.capacity_tonnes) * 100)
              const daysLeft = silo.daily_usage_tonnes > 0 ? Math.round(silo.current_tonnes / silo.daily_usage_tonnes) : null
              return (
                <div key={silo.id} className="flex items-center gap-3 py-2 border-t border-border/5">
                  <span className="w-[140px] text-sm text-text-dim truncate">{silo.ingredient_name}</span>
                  <div className="flex-1 h-3.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} /></div>
                  <span className="w-[90px] text-right text-xs text-text-muted font-mono">{silo.current_tonnes} / {silo.capacity_tonnes} t</span>
                  <span className={`w-[50px] text-right text-sm font-bold font-mono ${daysLeft !== null ? daysColor(daysLeft) : 'text-text-ghost'}`}>{daysLeft !== null ? `${daysLeft}d` : '\u2014'}</span>
                </div>
              )
            })}
            {syncedFormulas.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/5">
                <div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-2">Synced formulas</div>
                {syncedFormulas.map((f: any) => {
                  const ago = timeAgo(f.feedflow_synced_at)
                  const diffDays = Math.floor((Date.now() - new Date(f.feedflow_synced_at).getTime()) / 86400000)
                  const needsResync = diffDays >= 3
                  return (
                    <div key={f.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-text-dim">{f.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${needsResync ? 'bg-status-amber' : 'bg-brand'}`} />
                        <span className={`text-xs font-mono ${needsResync ? 'text-status-amber' : 'text-text-ghost'}`}>{needsResync ? `${ago} — needs re-sync` : ago}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : isConnected && silos.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-ghost">Connected to FeedFlow but no silos configured yet.</div>
        ) : (
          <div className="px-4 py-6">
            <div className="border border-dashed border-border/30 rounded-lg p-6 text-center">
              <p className="text-sm text-text-muted mb-1">{client.name} is not connected to FeedFlow yet.</p>
              <p className="text-xs text-text-ghost mb-4">Connect to see real-time silo levels, days of stock, and sync formulas automatically.</p>
              <button className="btn btn-primary btn-sm">Connect to FeedFlow</button>
              {unsyncedFormulas.length > 0 && <p className="text-xs text-text-ghost mt-3">{unsyncedFormulas.length} formula{unsyncedFormulas.length > 1 ? 's' : ''} ready to sync</p>}
            </div>
          </div>
        )}
      </div>

      {client.notes && (
        <div className="card mt-4 p-4">
          <div className="text-xs font-semibold text-text-ghost uppercase tracking-wider mb-2">Notes</div>
          <p className="text-sm text-text-muted leading-relaxed">{client.notes}</p>
        </div>
      )}

      {/* ── ADD ANIMAL GROUP ────────────────────────────────── */}
      {showAddAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddAnimal(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-text">Add Animal Group</h2><button onClick={() => setShowAddAnimal(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleAddAnimal} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Group Name *</label><input name="name" required className="input" placeholder="e.g. Holstein Milkers — Early Lactation" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Species</label><select value={animalSpecies} onChange={(e) => setAnimalSpecies(e.target.value)} className="input">{(client.species as string[]).map((sp: string) => (<option key={sp} value={sp}>{sp}</option>))}</select></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Production Stage *</label><select name="production_stage" required className="input"><option value="">Select...</option>{(STAGES[animalSpecies]||[]).map((st: string) => (<option key={st} value={st}>{stageLabel(st)}</option>))}</select></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Breed</label><input name="breed" className="input" placeholder="e.g. Holstein, Angus" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Head Count *</label><input name="count" type="number" required min="1" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Avg Weight (kg)</label><input name="avg_weight_kg" type="number" step="0.1" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">DMI (kg/d)</label><input name="dmi_kg" type="number" step="0.1" className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target ADG (kg/d)</label><input name="target_adg_kg" type="number" step="0.001" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target Milk (L/d)</label><input name="target_milk_yield_l" type="number" step="0.1" className="input" /></div>
              </div>
              <p className="text-2xs text-text-ghost">After creating the group, assign a requirement profile to enable formula creation.</p>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowAddAnimal(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Adding...':'Add Group'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ANIMAL GROUP ────────────────────────────────── */}
      {showEditAnimal && editingAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEditAnimal(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-text">Edit Animal Group</h2><button onClick={() => setShowEditAnimal(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleEditAnimal} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Group Name *</label><input name="name" required defaultValue={editingAnimal.name} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Species</label><select value={editAnimalSpecies} onChange={(e) => setEditAnimalSpecies(e.target.value)} className="input">{(client.species as string[]).map((sp: string) => (<option key={sp} value={sp}>{sp}</option>))}</select></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Stage *</label><select name="production_stage" required defaultValue={editingAnimal.production_stage} className="input"><option value="">Select...</option>{(STAGES[editAnimalSpecies]||[]).map((st: string) => (<option key={st} value={st}>{stageLabel(st)}</option>))}</select></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Breed</label><input name="breed" defaultValue={editingAnimal.breed||''} className="input" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Head Count *</label><input name="count" type="number" required min="1" defaultValue={editingAnimal.count} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Avg Weight (kg)</label><input name="avg_weight_kg" type="number" step="0.1" defaultValue={editingAnimal.avg_weight_kg||''} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">DMI (kg/d)</label><input name="dmi_kg" type="number" step="0.1" defaultValue={editingAnimal.dmi_kg||''} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target ADG (kg/d)</label><input name="target_adg_kg" type="number" step="0.001" defaultValue={editingAnimal.target_adg||''} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target Milk (L/d)</label><input name="target_milk_yield_l" type="number" step="0.1" defaultValue={editingAnimal.milk_yield||''} className="input" /></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowEditAnimal(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Saving...':'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CLIENT ────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-text">Edit Client</h2><button onClick={() => setShowEdit(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleUpdate} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Name *</label><input name="name" required defaultValue={client.name} className="input" /></div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1.5">Species</label>
                <div className="flex gap-2">{(['cattle','beef','pig','poultry','sheep'] as const).map((sp) => (<button key={sp} type="button" onClick={() => setEditSpecies(prev => prev.includes(sp)?prev.filter(s=>s!==sp):[...prev,sp])} className={`px-4 py-2 rounded border text-sm font-semibold capitalize cursor-pointer ${editSpecies.includes(sp)?'border-brand bg-brand/10 text-brand':'border-border text-text-faint'}`}>{sp}</button>))}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Contact</label><input name="contact_name" defaultValue={client.contact_name||''} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Phone</label><input name="contact_phone" defaultValue={client.contact_phone||''} className="input" /></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Email</label><input name="contact_email" defaultValue={client.contact_email||''} className="input" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Location</label><input name="location" defaultValue={client.location||''} className="input" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Notes</label><textarea name="notes" defaultValue={client.notes||''} className="input min-h-[60px] resize-y" /></div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Saving...':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CLIENT ────────────────────────────────────── */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDelete(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text mb-2">Delete Client</h2>
            <p className="text-sm text-text-muted mb-5">Are you sure you want to remove <strong className="text-text-dim">{client.name}</strong>?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDelete(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleDelete} className="btn flex-1 justify-center bg-status-red text-white border-none">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE EDITOR MODAL ────────────────────────────── */}
      <ProfileEditorModal
        open={showProfileEditor}
        onClose={() => { setShowProfileEditor(false); setProfileEditorTarget(null) }}
        species={client?.species?.[0]}
        animalGroupId={profileEditorTarget?.id}
        animalGroupName={profileEditorTarget?.name}
        onProfileSelected={async () => {
          await loadData()
          setShowProfileEditor(false)
          setProfileEditorTarget(null)
        }}
      />
    </div>
  )
}
