import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function FormulasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: formulas } = await supabase
    .from('formulas')
    .select('*, client:nutrition_clients(name)')
    .eq('nutritionist_id', user!.id)
    .not('status', 'eq', 'archived')
    .order('updated_at', { ascending: false })

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-text">Formulas</h1>
        <button className="btn btn-primary"><Plus size={14} /> New Formula</button>
      </div>

      <div className="card">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-2.5 border-b border-border gap-2">
          {['Formula', 'Client', 'Species / Stage', 'Status', ''].map((h) => (
            <span key={h} className="text-2xs font-bold text-text-ghost uppercase tracking-wider">{h}</span>
          ))}
        </div>
        {formulas?.map((f) => (
          <Link
            key={f.id}
            href={`/formulas/${f.id}`}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-3 border-b border-border/5 gap-2 items-center hover:bg-[#253442] transition-colors no-underline"
          >
            <div>
              <span className="text-base font-semibold text-text-dim">{f.name}</span>
              <span className="text-xs text-text-ghost font-mono ml-2">v{f.version}</span>
            </div>
            <span className="text-sm text-text-muted">{f.client?.name || '—'}</span>
            <span className="text-sm text-text-muted capitalize">{f.species} · {f.production_stage}</span>
            <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase w-fit
              ${f.status === 'draft' ? 'bg-status-amber/15 text-status-amber' :
                f.status === 'review' ? 'bg-status-blue/15 text-status-blue' :
                f.status === 'approved' || f.status === 'active' ? 'bg-brand/15 text-brand' :
                'bg-white/5 text-text-ghost'}`}>
              {f.status}
            </span>
            <span className="text-text-ghost">›</span>
          </Link>
        ))}
        {(!formulas || formulas.length === 0) && (
          <div className="px-4 py-12 text-center text-sm text-text-ghost">
            No formulas yet. Create your first ration formula.
          </div>
        )}
      </div>
    </div>
  )
}
