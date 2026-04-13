import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function ClientsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('nutrition_clients')
    .select('*')
    .eq('nutritionist_id', user!.id)
    .order('name')

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text">Clients</h1>
        <button className="btn btn-primary"><Plus size={14} /> Add Client</button>
      </div>

      <div className="card">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-2.5 border-b border-border gap-2">
          {['Client', 'Species', 'Location', 'Animals', ''].map((h) => (
            <span key={h} className="text-2xs font-bold text-text-ghost uppercase tracking-wider">{h}</span>
          ))}
        </div>
        {clients?.map((c) => (
          <Link
            key={c.id}
            href={`/clients/${c.id}`}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-3 border-b border-border/5 gap-2 items-center hover:bg-[#253442] transition-colors cursor-pointer no-underline"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base font-semibold text-text-dim">{c.name}</span>
              {c.feedflow_client_id && (
                <span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">FEEDFLOW</span>
              )}
            </div>
            <div className="flex gap-1">
              {(c.species as string[]).map((s) => (
                <span key={s} className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded text-xs font-bold font-mono
                  ${s === 'cattle' ? 'bg-species-cattle/10 text-species-cattle' :
                    s === 'pig' ? 'bg-species-pig/10 text-species-pig' :
                    s === 'poultry' ? 'bg-species-poultry/10 text-species-poultry' :
                    'bg-species-sheep/10 text-species-sheep'}`}>
                  {s === 'cattle' ? 'C' : s === 'pig' ? 'P' : s === 'poultry' ? 'Pk' : 'S'}
                </span>
              ))}
            </div>
            <span className="text-sm text-text-muted">{c.location}</span>
            <span className="text-base text-text-dim font-mono">—</span>
            <span className="text-text-ghost">›</span>
          </Link>
        ))}
        {(!clients || clients.length === 0) && (
          <div className="px-4 py-12 text-center text-sm text-text-ghost">
            No clients yet. Add your first farm client to get started.
          </div>
        )}
      </div>
    </div>
  )
}
