'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, FlaskConical, Database, Sparkles, Package, ChevronRight, Check, ArrowRight, Beaker } from 'lucide-react'

const NUT_MODELS = ['AFRC', 'NRC', 'CNCPS', 'INRA']
const CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'BRL', 'ARS', 'ZAR']
const SPECIES_LABELS: Record<string,string> = { cattle: 'Dairy Cattle', beef: 'Beef Cattle', sheep: 'Sheep', pig: 'Pigs', poultry: 'Poultry' }

export default function WorkspacePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ clients: 0, formulas: 0, ingredients: 0, premixes: 0 })
  const [recentFormulas, setRecentFormulas] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)
  const [obName, setObName] = useState('')
  const [obCompany, setObCompany] = useState('')
  const [obCountry, setObCountry] = useState('Australia')
  const [obModel, setObModel] = useState('AFRC')
  const [obCurrency, setObCurrency] = useState('AUD')
  const [obSpecies, setObSpecies] = useState<string[]>(['cattle'])
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('nutritionist_profiles').select('*').eq('id', user.id).single()
    setProfile(p)
    if (p && !p.onboarding_completed) {
      setObName(p.full_name || ''); setObCompany(p.company || '')
      setShowOnboarding(true)
    }
    const { count: cc } = await supabase.from('nutrition_clients').select('*', { count: 'exact', head: true }).eq('nutritionist_id', user.id).eq('active', true)
    const { count: fc } = await supabase.from('formulas').select('*', { count: 'exact', head: true }).eq('nutritionist_id', user.id).not('status', 'eq', 'archived')
    const { count: ic } = await supabase.from('ingredients').select('*', { count: 'exact', head: true }).or(`nutritionist_id.is.null,nutritionist_id.eq.${user.id}`)
    const { count: pc } = await supabase.from('premixes').select('*', { count: 'exact', head: true }).eq('nutritionist_id', user.id).eq('active', true)
    setStats({ clients: cc || 0, formulas: fc || 0, ingredients: ic || 0, premixes: pc || 0 })
    const { data: rf } = await supabase.from('formulas').select('*, client:nutrition_clients(name)').eq('nutritionist_id', user.id).order('updated_at', { ascending: false }).limit(5)
    setRecentFormulas(rf || [])
    const { data: cl } = await supabase.from('nutrition_clients').select('*').eq('nutritionist_id', user.id).eq('active', true).order('name').limit(5)
    setClients(cl || [])
    setLoading(false)
  }

  async function completeOnboarding() {
    setSaving(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('nutritionist_profiles').update({
      full_name: obName, company: obCompany, country: obCountry,
      nutrition_model: obModel, currency: obCurrency,
      onboarding_completed: true,
    }).eq('id', user.id)
    setProfile({ ...profile, full_name: obName, company: obCompany, onboarding_completed: true })
    setSaving(false); setShowOnboarding(false)
  }

  async function loadDemoData() {
    setSaving(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Create demo client
    const { data: client } = await supabase.from('nutrition_clients').insert({
      nutritionist_id: user.id, name: 'Demo Farm — Valley Dairy',
      location: 'Gippsland, VIC', species: ['cattle', 'beef'],
      contact_name: 'John Smith', contact_phone: '0412 345 678',
      contact_email: 'john@valleydairy.com.au', active: true,
    }).select().single()
    if (client) {
      // Create animal groups
      await supabase.from('client_animals').insert([
        { client_id: client.id, name: 'Milking herd', species: 'cattle', breed: 'Holstein', count: 220, avg_weight_kg: 650 },
        { client_id: client.id, name: 'Dry cows', species: 'cattle', breed: 'Holstein', count: 40, avg_weight_kg: 680 },
        { client_id: client.id, name: 'Heifers', species: 'cattle', breed: 'Holstein', count: 80, avg_weight_kg: 480 },
      ])
      // Create demo formula
      const { data: formula } = await supabase.from('formulas').insert({
        nutritionist_id: user.id, name: 'Demo — Lactation PMR', client_id: client.id,
        species: 'cattle', production_stage: 'early_lactation', breed: 'Holstein',
        batch_size_kg: 1000, status: 'draft', version: 1,
      }).select().single()
      if (formula) {
        // Get some common ingredients
        const { data: ings } = await supabase.from('ingredients').select('id, name').in('name', [
          'Ryegrass/clover silage - Good - Pit', 'Maize Silage', 'Wheat grain',
          'Canola meal', 'Barley grain', 'Limestone (CaC03)'
        ]).limit(6)
        if (ings && ings.length > 0) {
          const defaultPcts = [30, 20, 15, 10, 20, 2]
          await supabase.from('formula_ingredients').insert(ings.map((ing, i) => ({
            formula_id: formula.id, ingredient_id: ing.id,
            inclusion_pct: defaultPcts[i] || 5, locked: false,
          })))
        }
      }
    }
    await completeOnboarding()
    loadData()
  }

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  if (loading) return <div className="p-7 text-text-ghost">Loading workspace...</div>

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text">{greeting}, {firstName}</h1>
        <p className="text-base text-text-ghost mt-1">Here&apos;s what&apos;s happening across your clients today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {[
          { label: 'Active Clients', value: stats.clients, icon: Users, color: 'text-brand', href: '/clients' },
          { label: 'Formulas', value: stats.formulas, icon: FlaskConical, color: 'text-status-amber', href: '/formulas' },
          { label: 'Ingredients', value: stats.ingredients, icon: Database, color: 'text-status-coral', href: '/ingredients' },
          { label: 'Premixes', value: stats.premixes, icon: Package, color: 'text-status-blue', href: '/premixes' },
        ].map((stat, i) => (
          <div key={i} onClick={() => router.push(stat.href)} className="stat-card cursor-pointer hover:border-brand/20 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={14} className="text-text-ghost" />
              <span className="text-xs font-semibold text-text-ghost uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => router.push('/clients')} className="btn btn-ghost btn-sm"><Users size={14} /> New Client</button>
        <button onClick={() => router.push('/formulas')} className="btn btn-ghost btn-sm"><FlaskConical size={14} /> New Formula</button>
        <button onClick={() => router.push('/premixes')} className="btn btn-ghost btn-sm"><Package size={14} /> New Premix</button>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><span className="text-base font-bold text-text-dim">Clients</span><span onClick={() => router.push('/clients')} className="text-xs text-brand font-semibold cursor-pointer hover:underline">View all &rarr;</span></div>
          {clients.length > 0 ? clients.map(c => (
            <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors cursor-pointer">
              <div className="flex gap-1">{(c.species as string[] || []).map(s => (<span key={s} className="inline-flex items-center justify-center w-[22px] h-[22px] rounded text-xs font-bold font-mono bg-brand/10 text-brand">{s[0]?.toUpperCase()}</span>))}</div>
              <div className="flex-1"><div className="text-base font-semibold text-text-dim">{c.name}</div><div className="text-xs text-text-ghost">{c.location}</div></div>
            </div>
          )) : <div className="px-4 py-8 text-center text-sm text-text-ghost">No clients yet. <span onClick={() => router.push('/clients')} className="text-brand cursor-pointer hover:underline">Add your first client</span></div>}
        </div>

        <div className="card">
          <div className="card-header"><span className="text-base font-bold text-text-dim">Recent Formulas</span><span onClick={() => router.push('/formulas')} className="text-xs text-brand font-semibold cursor-pointer hover:underline">View all &rarr;</span></div>
          {recentFormulas.length > 0 ? recentFormulas.map(f => (
            <div key={f.id} onClick={() => router.push(`/formulas/${f.id}`)} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors cursor-pointer">
              <div className="flex-1"><div className="text-base font-semibold text-text-dim">{f.name}</div><div className="text-xs text-text-ghost">{f.client?.name || '—'} &middot; {SPECIES_LABELS[f.species] || f.species}</div></div>
              <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase ${f.status === 'draft' ? 'bg-status-amber/15 text-status-amber' : 'bg-brand/15 text-brand'}`}>{f.status}</span>
            </div>
          )) : <div className="px-4 py-8 text-center text-sm text-text-ghost">No formulas yet. <span onClick={() => router.push('/formulas')} className="text-brand cursor-pointer hover:underline">Create your first formula</span></div>}
        </div>
      </div>

      {/* ── ONBOARDING WIZARD ──────────────────────── */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-2xl border border-border w-full max-w-xl shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-surface-deep"><div className="h-full bg-brand transition-all duration-500" style={{ width: `${((onboardStep + 1) / 4) * 100}%` }} /></div>

            {/* Step 0: Welcome */}
            {onboardStep === 0 && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center mx-auto mb-5">
                  <span className="text-white font-extrabold text-2xl">OF</span>
                </div>
                <h1 className="text-2xl font-bold text-text mb-2">Welcome to Optia Feed</h1>
                <p className="text-text-muted mb-1">AI-powered livestock nutrition platform</p>
                <p className="text-sm text-text-ghost mb-8">Let&apos;s set up your workspace in 2 minutes.</p>
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                  {[
                    ['Set up your profile', 'Name, company, preferences'],
                    ['Choose your nutrition model', 'AFRC, NRC, or CNCPS'],
                    ['Start formulating', 'Create a client or load demo data'],
                  ].map(([title, desc], i) => (
                    <div key={i} className="flex items-center gap-3 text-left p-2.5 rounded-lg bg-surface-deep">
                      <div className="w-6 h-6 rounded-full bg-brand/15 text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                      <div><div className="text-sm font-semibold text-text-dim">{title}</div><div className="text-2xs text-text-ghost">{desc}</div></div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setOnboardStep(1)} className="btn btn-primary mt-6 w-full max-w-xs mx-auto justify-center">Get Started <ArrowRight size={14} /></button>
              </div>
            )}

            {/* Step 1: Profile */}
            {onboardStep === 1 && (
              <div className="p-8">
                <h2 className="text-xl font-bold text-text mb-1">Your profile</h2>
                <p className="text-sm text-text-ghost mb-5">Tell us about yourself so we can personalize your experience.</p>
                <div className="flex flex-col gap-3.5">
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">Full Name *</label><input value={obName} onChange={e => setObName(e.target.value)} className="input" placeholder="Dr. Sarah Mitchell" /></div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">Company / Practice</label><input value={obCompany} onChange={e => setObCompany(e.target.value)} className="input" placeholder="Mitchell Nutrition Services" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-semibold text-text-muted block mb-1">Country</label>
                      <select value={obCountry} onChange={e => setObCountry(e.target.value)} className="input">
                        {['Australia','New Zealand','United States','Canada','United Kingdom','Ireland','South Africa','Brazil','Argentina','Chile','Uruguay','Other'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs font-semibold text-text-muted block mb-1">Currency</label>
                      <select value={obCurrency} onChange={e => setObCurrency(e.target.value)} className="input">
                        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setOnboardStep(0)} className="btn btn-ghost flex-1 justify-center">Back</button>
                  <button onClick={() => setOnboardStep(2)} disabled={!obName.trim()} className="btn btn-primary flex-1 justify-center disabled:opacity-50">Continue <ChevronRight size={14} /></button>
                </div>
              </div>
            )}

            {/* Step 2: Nutrition Model */}
            {onboardStep === 2 && (
              <div className="p-8">
                <h2 className="text-xl font-bold text-text mb-1">Nutrition model</h2>
                <p className="text-sm text-text-ghost mb-5">Which system do you primarily work with? You can switch anytime.</p>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'AFRC', name: 'AFRC / CSIRO', region: 'Australia, New Zealand, UK', desc: 'ME-based energy, UDP/RDP protein system. Standard in AU/NZ dairy and beef.' },
                    { key: 'NRC', name: 'NRC 2001', region: 'United States, Canada', desc: 'NEL/TDN energy, RUP/RDP protein. The US dairy industry standard.' },
                    { key: 'CNCPS', name: 'CNCPS v6 (Cornell)', region: 'Research, Global', desc: 'Advanced protein & carbohydrate fractions. Used by AMTS and NDS software.' },
                  ].map(m => (
                    <div key={m.key} onClick={() => setObModel(m.key)} className={`p-3.5 rounded-lg border cursor-pointer transition-all ${obModel === m.key ? 'border-brand bg-brand/5' : 'border-border hover:border-border-light bg-surface-bg'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${obModel === m.key ? 'border-brand' : 'border-border'}`}>{obModel === m.key && <div className="w-2 h-2 rounded-full bg-brand" />}</div>
                        <span className="text-sm font-bold text-text">{m.name}</span>
                        <span className="text-2xs text-text-ghost">{m.region}</span>
                      </div>
                      <p className="text-2xs text-text-muted ml-6">{m.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setOnboardStep(1)} className="btn btn-ghost flex-1 justify-center">Back</button>
                  <button onClick={() => setOnboardStep(3)} className="btn btn-primary flex-1 justify-center">Continue <ChevronRight size={14} /></button>
                </div>
              </div>
            )}

            {/* Step 3: Quick Start */}
            {onboardStep === 3 && (
              <div className="p-8">
                <h2 className="text-xl font-bold text-text mb-1">Ready to go!</h2>
                <p className="text-sm text-text-ghost mb-5">How would you like to start?</p>
                <div className="flex flex-col gap-3">
                  <div onClick={loadDemoData} className="p-4 rounded-lg border border-brand/30 bg-brand/5 cursor-pointer hover:bg-brand/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center"><Beaker size={20} className="text-brand" /></div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-text">Load demo data</div>
                        <div className="text-2xs text-text-ghost">Creates a sample dairy farm with animal groups and a starter lactation formula. Perfect for exploring the platform.</div>
                      </div>
                      <ArrowRight size={16} className="text-brand" />
                    </div>
                  </div>
                  <div onClick={completeOnboarding} className="p-4 rounded-lg border border-border cursor-pointer hover:border-brand/20 hover:bg-surface-bg transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-deep flex items-center justify-center"><Users size={20} className="text-text-ghost" /></div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-text">Start fresh</div>
                        <div className="text-2xs text-text-ghost">Jump straight in and create your first client. You already have 286 ingredients from the Rumen8 database.</div>
                      </div>
                      <ArrowRight size={16} className="text-text-ghost" />
                    </div>
                  </div>
                </div>
                <button onClick={() => setOnboardStep(2)} className="btn btn-ghost w-full mt-4 justify-center">Back</button>
                {saving && <div className="text-center text-sm text-text-ghost mt-3">Setting up your workspace...</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
