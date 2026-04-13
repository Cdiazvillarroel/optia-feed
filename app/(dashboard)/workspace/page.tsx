import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, FlaskConical, Database, Sparkles } from 'lucide-react'

export default async function WorkspacePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('nutritionist_profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { count: clientCount } = await supabase
    .from('nutrition_clients')
    .select('*', { count: 'exact', head: true })
    .eq('nutritionist_id', user!.id)
    .eq('active', true)

  const { count: formulaCount } = await supabase
    .from('formulas')
    .select('*', { count: 'exact', head: true })
    .eq('nutritionist_id', user!.id)
    .not('status', 'eq', 'archived')

  const { count: ingredientCount } = await supabase
    .from('ingredients')
    .select('*', { count: 'exact', head: true })
    .or(`nutritionist_id.is.null,nutritionist_id.eq.${user!.id}`)

  const { data: recentFormulas } = await supabase
    .from('formulas')
    .select('*, client:nutrition_clients(name)')
    .eq('nutritionist_id', user!.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  const { data: clients } = await supabase
    .from('nutrition_clients')
    .select('*')
    .eq('nutritionist_id', user!.id)
    .eq('active', true)
    .order('name')
    .limit(5)

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text">{greeting}, {firstName}</h1>
        <p className="text-base text-text-faint mt-1">
          Here&apos;s what&apos;s happening across your clients today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {[
          { label: 'Active Clients', value: clientCount || 0, icon: Users, color: 'text-brand' },
          { label: 'Active Formulas', value: formulaCount || 0, icon: FlaskConical, color: 'text-status-amber' },
          { label: 'Ingredients', value: ingredientCount || 0, icon: Database, color: 'text-status-coral' },
          { label: 'AI Reviews', value: '—', icon: Sparkles, color: 'text-status-blue' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className="text-text-ghost" />
              <span className="text-xs font-semibold text-text-faint uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Clients */}
        <div className="card">
          <div className="card-header">
            <span className="text-base font-bold text-text-dim">Clients</span>
            <Link href="/clients" className="text-xs text-brand font-semibold no-underline hover:underline">
              View all →
            </Link>
          </div>
          {clients && clients.length > 0 ? (
            clients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors no-underline"
              >
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
                <div className="flex-1">
                  <div className="text-base font-semibold text-text-dim">{c.name}</div>
                  <div className="text-xs text-text-ghost">{c.location}</div>
                </div>
                {c.feedflow_client_id && (
                  <span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">FF</span>
                )}
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-text-ghost">
              No clients yet.{' '}
              <Link href="/clients" className="text-brand hover:underline">Add your first client</Link>
            </div>
          )}
        </div>

        {/* Recent Formulas */}
        <div className="card">
          <div className="card-header">
            <span className="text-base font-bold text-text-dim">Recent Formulas</span>
            <Link href="/formulas" className="text-xs text-brand font-semibold no-underline hover:underline">
              View all →
            </Link>
          </div>
          {recentFormulas && recentFormulas.length > 0 ? (
            recentFormulas.map((f) => (
              <Link
                key={f.id}
                href={`/formulas/${f.id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors no-underline"
              >
                <div className="flex-1">
                  <div className="text-base font-semibold text-text-dim">{f.name}</div>
                  <div className="text-xs text-text-ghost">{f.client?.name || 'Unassigned'} · {f.species}</div>
                </div>
                <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase
                  ${f.status === 'draft' ? 'bg-status-amber/15 text-status-amber' :
                    f.status === 'approved' ? 'bg-brand/15 text-brand' :
                    f.status === 'active' ? 'bg-brand/15 text-brand' :
                    'bg-white/5 text-text-ghost'}`}>
                  {f.status}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-text-ghost">
              No formulas yet.{' '}
              <Link href="/formulas" className="text-brand hover:underline">Create your first formula</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
