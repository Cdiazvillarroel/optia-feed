'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, X, ChevronRight } from 'lucide-react'

const STAGES: Record<string, string[]> = {
  cattle: ['Lactation','Dry Cow','Growing','Finishing','Calf Rearing'],
  pig: ['Lactation Sow','Gestation Sow','Grower','Finisher','Nursery'],
  poultry: ['Starter','Grower','Finisher','Layer','Breeder'],
  sheep: ['Maintenance','Lactation','Finishing','Lamb Creep'],
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [animals, setAnimals] = useState<any[]>([])
  const [formulas, setFormulas] = useState<any[]>([])
  const [showAddAnimal, setShowAddAnimal] = useState(false)
  const [showEditAnimal, setShowEditAnimal] = useState(false)
  const [editingAnimal, setEditingAnimal] = useState<any>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [editSpecies, setEditSpecies] = useState<string[]>([])
  const [animalSpecies, setAnimalSpecies] = useState('cattle')
  const [editAnimalSpecies, setEditAnimalSpecies] = useState('cattle')
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [params.id])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: c } = await supabase.from('nutrition_clients').select('*').eq('id', params.id).single()
    if (!c) { router.push('/clients'); return }
    setClient(c)
    setEditSpecies(c.species || [])
    setAnimalSpecies(c.species?.[0] || 'cattle')
    const { data: a } = await supabase.from('client_animals').select('*, formula:formulas!client_animals_formula_id_fkey(id, name, status)')
    setAnimals(a || [])
    const { data: f } = await supabase.from('formulas').select('*').eq('client_id', params.id).not('status','eq','archived').order('updated_at', { ascending: false })
    setFormulas(f || [])
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
      target_adg_kg: parseFloat(form.get('target_adg_kg') as string) || null,
      target_milk_yield_l: parseFloat(form.get('target_milk_yield_l') as string) || null,
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
      target_adg_kg: parseFloat(form.get('target_adg_kg') as string) || null,
      target_milk_yield_l: parseFloat(form.get('target_milk_yield_l') as string) || null,
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
    const supabase = await getSupabase()
    await supabase.from('client_animals').delete().eq('id', id)
    loadData()
  }

  if (!client) return <div className="p-7 text-text-ghost">Loading...</div>

  const totalAnimals = animals.reduce((s, a) => s + (a.count || 0), 0)

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
      <div className="card mb-4">
        <div className="card-header"><span className="text-base font-bold text-text-dim">Animal Groups</span><button onClick={() => setShowAddAnimal(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> Add Group</button></div>
        {animals.length > 0 ? animals.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 group">
            <div className="flex-1">
              <div className="text-base font-semibold text-text-dim">{a.name}</div>
              <div className="text-xs text-text-ghost">{a.breed ? a.breed+' \u00B7 ' : ''}{a.production_stage}</div>
            </div>
            <span className="text-sm text-text-muted font-mono">{a.count} hd</span>
            <span className="text-sm text-text-muted font-mono">{a.avg_weight_kg ? a.avg_weight_kg+'kg' : '\u2014'}</span>
            {a.target_milk_yield_l && <span className="text-sm text-text-muted font-mono">{a.target_milk_yield_l} L/d</span>}
            {a.target_adg_kg && <span className="text-sm text-text-muted font-mono">{a.target_adg_kg} kg/d</span>}
            {a.dmi_kg && <span className="text-sm text-text-muted font-mono">DMI {a.dmi_kg}</span>}
            <span className="text-sm text-status-blue">{a.formula?.name || '\u2014'}</span>
            <button onClick={() => openEditAnimal(a)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-brand transition-all bg-transparent border-none cursor-pointer"><Edit2 size={14} /></button>
            <button onClick={() => handleDeleteAnimal(a.id)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-status-red transition-all bg-transparent border-none cursor-pointer"><Trash2 size={14} /></button>
          </div>
        )) : <div className="px-4 py-8 text-center text-sm text-text-ghost">No animal groups yet.</div>}
      </div>
      <div className="card">
        <div className="card-header"><span className="text-base font-bold text-text-dim">Formulas</span></div>
        {formulas.length > 0 ? formulas.map((f) => (
          <Link key={f.id} href={`/formulas/${f.id}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors no-underline">
            <div className="flex-1">
              <div className="text-base font-semibold text-text-dim">{f.name}</div>
              <div className="text-xs text-text-ghost capitalize">{f.species} &middot; {f.production_stage} &middot; v{f.version}</div>
            </div>
            <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase ${f.status==='draft'?'bg-status-amber/15 text-status-amber':'bg-brand/15 text-brand'}`}>{f.status}</span>
            <ChevronRight size={14} className="text-text-ghost" />
          </Link>
        )) : <div className="px-4 py-8 text-center text-sm text-text-ghost">No formulas yet.</div>}
      </div>

      {/* ADD ANIMAL */}
      {showAddAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddAnimal(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-text">Add Animal Group</h2><button onClick={() => setShowAddAnimal(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleAddAnimal} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Group Name *</label><input name="name" required className="input" placeholder="e.g. Lactating Herd" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Species</label><select value={animalSpecies} onChange={(e) => setAnimalSpecies(e.target.value)} className="input">{(client.species as string[]).map((sp: string) => (<option key={sp} value={sp}>{sp}</option>))}</select></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Stage *</label><select name="production_stage" required className="input">{(STAGES[animalSpecies]||[]).map((st: string) => (<option key={st} value={st}>{st}</option>))}</select></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Breed</label><input name="breed" className="input" placeholder="e.g. Holstein" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Head Count *</label><input name="count" type="number" required min="1" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Avg Weight (kg)</label><input name="avg_weight_kg" type="number" step="0.1" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">DMI (kg/d)</label><input name="dmi_kg" type="number" step="0.1" className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target ADG (kg/d)</label><input name="target_adg_kg" type="number" step="0.001" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target Milk (L/d)</label><input name="target_milk_yield_l" type="number" step="0.1" className="input" /></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowAddAnimal(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Adding...':'Add Group'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ANIMAL */}
      {showEditAnimal && editingAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEditAnimal(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-text">Edit Animal Group</h2><button onClick={() => setShowEditAnimal(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleEditAnimal} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Group Name *</label><input name="name" required defaultValue={editingAnimal.name} className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Species</label><select value={editAnimalSpecies} onChange={(e) => setEditAnimalSpecies(e.target.value)} className="input">{(client.species as string[]).map((sp: string) => (<option key={sp} value={sp}>{sp}</option>))}</select></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Stage *</label><select name="production_stage" required defaultValue={editingAnimal.production_stage} className="input">{(STAGES[editAnimalSpecies]||[]).map((st: string) => (<option key={st} value={st}>{st}</option>))}</select></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Breed</label><input name="breed" defaultValue={editingAnimal.breed||''} className="input" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Head Count *</label><input name="count" type="number" required min="1" defaultValue={editingAnimal.count} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Avg Weight (kg)</label><input name="avg_weight_kg" type="number" step="0.1" defaultValue={editingAnimal.avg_weight_kg||''} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">DMI (kg/d)</label><input name="dmi_kg" type="number" step="0.1" defaultValue={editingAnimal.dmi_kg||''} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target ADG (kg/d)</label><input name="target_adg_kg" type="number" step="0.001" defaultValue={editingAnimal.target_adg_kg||''} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target Milk (L/d)</label><input name="target_milk_yield_l" type="number" step="0.1" defaultValue={editingAnimal.target_milk_yield_l||''} className="input" /></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowEditAnimal(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Saving...':'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-text">Edit Client</h2><button onClick={() => setShowEdit(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleUpdate} className="flex flex-col gap-3.5">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Name *</label><input name="name" required defaultValue={client.name} className="input" /></div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1.5">Species</label>
                <div className="flex gap-2">{(['cattle','pig','poultry','sheep'] as const).map((sp) => (<button key={sp} type="button" onClick={() => setEditSpecies(prev => prev.includes(sp)?prev.filter(s=>s!==sp):[...prev,sp])} className={`px-4 py-2 rounded border text-sm font-semibold capitalize cursor-pointer ${editSpecies.includes(sp)?'border-brand bg-brand/10 text-brand':'border-border text-text-faint'}`}>{sp}</button>))}</div>
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

      {/* DELETE CLIENT */}
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
    </div>
  )
}
