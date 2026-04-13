import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('nutritionist_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const p = profile || {}

  return (
    <div className="p-7 max-w-[700px]">
      <h1 className="text-2xl font-bold text-text mb-5">Settings</h1>

      {/* Profile */}
      <div className="card p-5 mb-4">
        <h2 className="text-lg font-bold text-text-dim mb-4">Profile</h2>
        {[
          ['Business Name', p.business_name || '—'],
          ['Full Name', p.full_name || '—'],
          ['Email', user.email || '—'],
          ['Credentials', p.credentials || '—'],
          ['Phone', p.phone || '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-2.5 border-b border-border/5">
            <span className="text-sm text-text-faint">{label}</span>
            <span className="text-base text-text-dim">{value}</span>
          </div>
        ))}
      </div>

      {/* Integrations */}
      <div className="card p-5 mb-4">
        <h2 className="text-lg font-bold text-text-dim mb-4">Integrations</h2>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-extrabold text-xs font-mono">FF</div>
            <div>
              <div className="text-base font-semibold text-text-dim">FeedFlow</div>
              <div className="text-xs text-text-ghost">Connect to sync farm data</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">Configure</button>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-status-purple/10 flex items-center justify-center text-status-purple font-extrabold text-xs font-mono">PD</div>
            <div>
              <div className="text-base font-semibold text-text-dim">Pipedream</div>
              <div className="text-xs text-text-ghost">Automation workflows</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">Configure</button>
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-5">
        <h2 className="text-lg font-bold text-text-dim mb-4">Preferences</h2>
        {[
          ['Feeding Standards', p.feeding_standard || 'CSIRO'],
          ['Currency', p.currency || 'AUD'],
          ['Energy Units', p.energy_unit === 'Mcal' ? 'Mcal/kg' : 'MJ/kg'],
          ['Default Batch Size', `${p.default_batch_kg || 1000} kg`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-2.5 border-b border-border/5">
            <span className="text-sm text-text-faint">{label}</span>
            <span className="text-base text-text-dim font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
