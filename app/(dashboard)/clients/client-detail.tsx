'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, Edit2, Trash2, X, ChevronRight } from 'lucide-react'
import { updateClientAction, deleteClientAction, createAnimalGroupAction, deleteAnimalGroupAction } from '@/app/(dashboard)/clients/actions'

const STAGES: Record<string, string[]> = {
  cattle: ['Lactation', 'Dry Cow', 'Growing', 'Finishing', 'Calf Rearing', 'Breeding'],
  pig: ['Lactation Sow', 'Gestation Sow', 'Grower', 'Finisher', 'Nursery', 'Boar'],
  poultry: ['Starter', 'Grower', 'Finisher', 'Layer', 'Breeder'],
  sheep: ['Maintenance', 'Lactation', 'Finishing', 'Lamb Creep', 'Breeding'],
}

interface FeedFlowSilo {
  id: string
  ingredient_name: string
  capacity_tonnes: number
  current_tonnes: number
  daily_usage_tonnes: number
  last_reading_at: string
}

interface Props {
  client: any
  animals: any[]
  formulas: any[]
  silos?: FeedFlowSilo[]
}

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

export function ClientDetail({ client, animals, formulas, silos = [] }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const [showAddAnimal, setShowAddAnimal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editSpecies, setEditSpecies] = useState<string[]>(client.species || [])
  const [animalSpecies, setAnimalSpecies] = useState(client.species?.[0] || 'cattle')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const totalAnimals = animals.reduce((s: number, a: any) => s + (a.count || 0), 0)

  const syncedFormulas = formulas.filter((f: any) => f.feedflow_synced_at)
  const unsyncedFormulas = formulas.filter((f: any) => !f.feedflow_synced_at)
  const isConnected = !!client.feedflow_client_id

  function toggleEditSpecies(sp: string) {
    setEditSpecies(prev => prev.includes(sp) ? prev.filter(s => s !== sp) : [...prev, sp])
  }

  async function handleUpdate(formData: FormData) {
    setLoading(true)
    formData.set('id', client.id)
    formData.set('species', editSpecies.join(','))
    try { await updateClientAction(formData) } catch { setLoading(false) }
  }

  async function handleDelete() {
    setLoading(true)
    try { await deleteClientAction(client.id) } catch { setLoading(false) }
  }

  async function handleAddAnimal(formData: FormData) {
    setLoading(true)
    formData.set('client_id', client.id)
    formData.set('species', animalSpecies)
    try {
      await createAnimalGroupAction(formData)
      setShowAddAnimal(false)
      setLoading(false)
      router.refresh()
    } catch { setLoading(false) }
  }

  async function handleDeleteAnimal(id: string) {
    await deleteAnimalGroupAction(id, client.id)
    router.refresh()
  }

  return (
    <div className="p-7 max-w-[1200px]">
      <Link href="/clients" className="text-sm text-text-ghost hover:text-text-muted mb-4 inline-block no-underline">
        ← Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-text">{client.name}</h1>
            {client.feedflow_client_id && (
              <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">FEEDFLOW</span>
            )}
          </div>
          <p className="text-base text-text-faint">
            {[client.contact_name, client.location].filter(Boolean).join(' · ') || 'No contact info'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditSpecies(client.species || []); setShowEdit(true) }} className="btn btn-ghost btn-sm">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-ghost btn-sm text-status-red hover:text-status-red">
            <Trash2 size={14} />
          </button>
          {client.feedflow_client_id && (
            <button className="btn btn-ghost btn-sm"><RefreshCw size={14} /> Sync</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {[
          { label: 'Total Animals', value: totalAnimals || '—' },
          { label: 'Animal Groups', value: animals.length },
          { label: 'Active Formulas', value: formulas.length },
          { label: 'FeedFlow', value: client.feedflow_client_id ? 'Connected' : 'Not connected' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-xl font-bold text-text-dim font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Contact Info */}
      {(client.contact_email || client.contact_phone) && (
        <div className="card p-4 mb-4">
          <div className="flex gap-6">
            {client.contact_name && <div><span className="text-xs text-text-ghost">Contact</span><div className="text-sm text-text-dim font-semibold">{client.contact_name}</div></div>}
            {client.contact_email && <div><span className="text-xs text-text-ghost">Email</span><div className="text-sm text-text-dim">{client.contact_email}</div></div>}
            {client.contact_phone && <div><span className="text-xs text-text-ghost">Phone</span><div className="text-sm text-text-dim font-mono">{client.contact_phone}</div></div>}
            {client.location && <div><span className="text-xs text-text-ghost">Location</span><div className="text-sm text-text-dim">{client.location}</div></div>}
          </div>
        </div>
      )}

      {/* Animal Groups */}
      <div className="card mb-4">
        <div className="card-header">
          <span className="text-base font-bold text-text-dim">Animal Groups</span>
          <button onClick={() => setShowAddAnimal(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> Add Group</button>
        </div>
        {animals.length > 0 ? animals.map((a: any) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 group">
            <div className="flex-1">
              <div className="text-base font-semibold text-text-dim">{a.name}</div>
              <div className="text-xs text-text-ghost">
                {a.breed ? `${a.breed} · ` : ''}{a.production_stage}
              </div>
            </div>
            <span className="text-sm text-text-muted font-mono">{a.count} hd</span>
            <span className="text-sm text-text-muted font-mono">{a.avg_weight_kg ? `${a.avg_weight_kg}kg` : '—'}</span>
            {a.target_milk_yield_l && <span className="text-sm text-text-muted font-mono">{a.target_milk_yield_l} L/d</span>}
            {a.target_adg_kg && <span className="text-sm text-text-muted font-mono">{a.target_adg_kg} kg/d</span>}
            <span className="text-sm text-status-blue cursor-pointer">
              {a.formula?.name || '—'}
            </span>
            <button
              onClick={() => handleDeleteAnimal(a.id)}
              className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-status-red transition-all bg-transparent border-none cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )) : (
          <div className="px-4 py-8 text-center text-sm text-text-ghost">
            No animal groups defined. Add groups to start assigning formulas.
          </div>
        )}
      </div>

      {/* Formulas */}
      <div className="card">
        <div className="card-header">
          <span className="text-base font-bold text-text-dim">Formulas</span>
          <Link href="/formulas" className="btn btn-ghost btn-sm no-underline"><Plus size={14} /> New Formula</Link>
        </div>
        {formulas.length > 0 ? formulas.map((f: any) => (
          <Link
            key={f.id}
            href={`/formulas/${f.id}`}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors no-underline"
          >
            <div className="flex-1">
              <div className="text-base font-semibold text-text-dim">{f.name}</div>
              <div className="text-xs text-text-ghost capitalize">{f.species} · {f.production_stage} · v{f.version}</div>
            </div>
            {f.feedflow_synced_at && (
              <span className="text-2xs text-text-ghost font-mono">
                Synced {timeAgo(f.feedflow_synced_at)}
              </span>
            )}
            <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase
              ${f.status === 'draft' ? 'bg-status-amber/15 text-status-amber' :
                f.status === 'approved' || f.status === 'active' ? 'bg-brand/15 text-brand' :
                'bg-white/5 text-text-ghost'}`}>
              {f.status}
            </span>
            <ChevronRight size={14} className="text-text-ghost" />
          </Link>
        )) : (
          <div className="px-4 py-8 text-center text-sm text-text-ghost">
            No formulas for this client yet.
          </div>
        )}
      </div>

      {/* ── FEEDFLOW INVENTORY ─────────────────────────────── */}
      <div className="card mt-4">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-text-dim">FeedFlow Inventory</span>
            {isConnected && (
              <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">CONNECTED</span>
            )}
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
            {/* Table header */}
            <div className="flex items-center gap-3 py-2 text-xs font-semibold text-text-faint uppercase tracking-wider">
              <span className="w-[140px]">Ingredient</span>
              <span className="flex-1">Level</span>
              <span className="w-[90px] text-right">Stock</span>
              <span className="w-[50px] text-right">Days</span>
            </div>
            {silos.map((silo) => {
              const pct = Math.round((silo.current_tonnes / silo.capacity_tonnes) * 100)
              const daysLeft = silo.daily_usage_tonnes > 0
                ? Math.round(silo.current_tonnes / silo.daily_usage_tonnes)
                : null
              return (
                <div key={silo.id} className="flex items-center gap-3 py-2 border-t border-border/5">
                  <span className="w-[140px] text-sm text-text-dim truncate">{silo.ingredient_name}</span>
                  <div className="flex-1 h-3.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-[90px] text-right text-xs text-text-muted font-mono">
                    {silo.current_tonnes} / {silo.capacity_tonnes} t
                  </span>
                  <span className={`w-[50px] text-right text-sm font-bold font-mono ${daysLeft !== null ? daysColor(daysLeft) : 'text-text-ghost'}`}>
                    {daysLeft !== null ? `${daysLeft}d` : '—'}
                  </span>
                </div>
              )
            })}
            {/* Synced formulas summary */}
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
                        <span className={`text-xs font-mono ${needsResync ? 'text-status-amber' : 'text-text-ghost'}`}>
                          {needsResync ? `${ago} — needs re-sync` : ago}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : isConnected && silos.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-ghost">
            Connected to FeedFlow but no silos configured yet.
          </div>
        ) : (
          /* Not connected — CTA */
          <div className="px-4 py-6">
            <div className="border border-dashed border-border/30 rounded-lg p-6 text-center">
              <p className="text-sm text-text-muted mb-1">
                {client.name} is not connected to FeedFlow yet.
              </p>
              <p className="text-xs text-text-ghost mb-4">
                Connect to see real-time silo levels, days of stock, and sync formulas to the mixer wagon automatically.
              </p>
              <button className="btn btn-primary btn-sm">
                Connect to FeedFlow
              </button>
              {unsyncedFormulas.length > 0 && (
                <p className="text-xs text-text-ghost mt-3">
                  {unsyncedFormulas.length} formula{unsyncedFormulas.length > 1 ? 's' : ''} ready to sync
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="card mt-4 p-4">
          <div className="text-xs font-semibold text-text-ghost uppercase tracking-wider mb-2">Notes</div>
          <p className="text-sm text-text-muted leading-relaxed">{client.notes}</p>
        </div>
      )}

      {/* ── EDIT MODAL ──────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text">Edit Client</h2>
              <button onClick={() => setShowEdit(false)} className="text-text-ghost hover:text-text-muted bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <form action={handleUpdate} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Farm / Client Name *</label>
                <input name="name" required defaultValue={client.name} className="input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1.5">Species *</label>
                <div className="flex gap-2">
                  {(['cattle', 'pig', 'poultry', 'sheep'] as const).map((sp) => (
                    <button key={sp} type="button" onClick={() => toggleEditSpecies(sp)}
                      className={`px-4 py-2 rounded border text-sm font-semibold capitalize transition-all cursor-pointer
                        ${editSpecies.includes(sp) ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-surface-bg text-text-faint'}`}>
                      {sp}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Contact Name</label><input name="contact_name" defaultValue={client.contact_name || ''} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Phone</label><input name="contact_phone" defaultValue={client.contact_phone || ''} className="input" /></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Email</label><input name="contact_email" type="email" defaultValue={client.contact_email || ''} className="input" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Location</label><input name="location" defaultValue={client.location || ''} className="input" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Notes</label><textarea name="notes" defaultValue={client.notes || ''} className="input min-h-[60px] resize-y" /></div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD ANIMAL MODAL ────────────────────────────────── */}
      {showAddAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddAnimal(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text">Add Animal Group</h2>
              <button onClick={() => setShowAddAnimal(false)} className="text-text-ghost hover:text-text-muted bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <form action={handleAddAnimal} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Group Name *</label>
                <input name="name" required className="input" placeholder="e.g. Lactating Herd — Holsteins" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Species</label>
                  <select value={animalSpecies} onChange={(e) => setAnimalSpecies(e.target.value)} className="input">
                    {(client.species as string[]).map((sp: string) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Production Stage *</label>
                  <select name="production_stage" required className="input">
                    {(STAGES[animalSpecies] || []).map((st: string) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Breed</label>
                <input name="breed" className="input" placeholder="e.g. Holstein, Angus, Large White" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Head Count *</label><input name="count" type="number" required min="1" className="input" placeholder="500" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Avg Weight (kg)</label><input name="avg_weight_kg" type="number" step="0.1" className="input" placeholder="650" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">DMI (kg/d)</label><input name="dmi_kg" type="number" step="0.1" className="input" placeholder="22" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target ADG (kg/d)</label><input name="target_adg_kg" type="number" step="0.001" className="input" placeholder="0.800" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Target Milk (L/d)</label><input name="target_milk_yield_l" type="number" step="0.1" className="input" placeholder="28" /></div>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Notes</label><textarea name="notes" className="input min-h-[50px] resize-y" /></div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowAddAnimal(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading ? 'Adding...' : 'Add Group'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ───────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text mb-2">Delete Client</h2>
            <p className="text-sm text-text-muted mb-5">
              Are you sure you want to remove <strong className="text-text-dim">{client.name}</strong>? This will archive the client but preserve all associated formulas.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleDelete} disabled={loading} className="btn flex-1 justify-center bg-status-red text-white border-none hover:bg-status-red/80">
                {loading ? 'Deleting...' : 'Delete Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
