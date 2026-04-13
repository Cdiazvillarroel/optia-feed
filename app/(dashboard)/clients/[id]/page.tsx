import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: client } = await supabase
    .from('nutrition_clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!client) notFound()

  const { data: animals } = await supabase
    .from('client_animals')
    .select('*, formula:formulas(id, name, status)')
    .eq('client_id', client.id)
    .order('name')

  const { data: formulas } = await supabase
    .from('formulas')
    .select('*')
    .eq('client_id', client.id)
    .not('status', 'eq', 'archived')
    .order('updated_at', { ascending: false })

  return (
    <div className="p-7 max-w-[1200px]">
      <Link href="/clients" className="text-sm text-text-ghost hover:text-text-muted mb-4 inline-block no-underline">
        ← Back to Clients
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-text">{client.name}</h1>
            {client.feedflow_client_id && (
              <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">FEEDFLOW</span>
            )}
          </div>
          <p className="text-base text-text-faint">{client.contact_name} · {client.location}</p>
        </div>
        <div className="flex gap-2">
          {client.feedflow_client_id && (
            <button className="btn btn-ghost btn-sm"><RefreshCw size={14} /> Sync</button>
          )}
          <Link href="/formulas" className="btn btn-primary btn-sm"><Plus size={14} /> New Formula</Link>
        </div>
      </div>

      {/* Animal Groups */}
      <div className="card mb-4">
        <div className="card-header">
          <span className="text-base font-bold text-text-dim">Animal Groups</span>
          <button className="btn btn-ghost btn-sm"><Plus size={14} /> Add Group</button>
        </div>
        {animals && animals.length > 0 ? (
          animals.map((g) => (
            <div key={g.id} className="grid grid-cols-[2fr_1fr_80px_80px_1.5fr] px-4 py-2.5 border-b border-border/5 gap-2 items-center">
              <span className="text-base font-semibold text-text-dim">{g.name}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold w-fit">{g.production_stage}</span>
              <span className="text-sm text-text-muted font-mono">{g.count} hd</span>
              <span className="text-sm text-text-muted font-mono">{g.avg_weight_kg}kg</span>
              <span className="text-sm text-status-blue cursor-pointer">{g.formula?.name || '—'}</span>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-text-ghost">
            No animal groups defined yet.
          </div>
        )}
      </div>

      {/* Formulas */}
      <div className="card">
        <div className="card-header">
          <span className="text-base font-bold text-text-dim">Formulas</span>
        </div>
        {formulas && formulas.length > 0 ? (
          formulas.map((f) => (
            <Link
              key={f.id}
              href={`/formulas/${f.id}`}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors no-underline"
            >
              <div className="flex-1">
                <div className="text-base font-semibold text-text-dim">{f.name}</div>
                <div className="text-xs text-text-ghost">{f.species} · {f.production_stage} · v{f.version}</div>
              </div>
              <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase
                ${f.status === 'draft' ? 'bg-status-amber/15 text-status-amber' :
                  f.status === 'approved' || f.status === 'active' ? 'bg-brand/15 text-brand' :
                  'bg-white/5 text-text-ghost'}`}>
                {f.status}
              </span>
            </Link>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-text-ghost">No formulas for this client.</div>
        )}
      </div>
    </div>
  )
}
