'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, FlaskConical, Database, Package, ChevronRight, Check, ArrowRight,
  Rocket, Shield, BookOpen, User as UserIcon, AlertTriangle
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

const NUT_MODELS = [
  { key: 'AFRC', name: 'AFRC / CSIRO', region: 'Australia, NZ, UK', desc: 'ME-based energy, UDP/RDP protein. Standard in AU/NZ dairy and beef.' },
  { key: 'NRC',  name: 'NRC 2001',     region: 'USA, Canada',       desc: 'NEL/TDN energy, RUP/RDP protein. US dairy industry standard.' },
  { key: 'CNCPS',name: 'CNCPS v6',     region: 'Research / global', desc: 'Advanced protein and carbohydrate fractions. Used by AMTS and NDS.' },
]

const CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'BRL', 'ARS', 'ZAR', 'CLP']
const COUNTRIES = ['Australia','New Zealand','United States','Canada','United Kingdom','Ireland','South Africa','Brazil','Argentina','Chile','Uruguay','Other']

const SPECIES_KEYS = [
  { key: 'dairy', tKey: 'animals.dairy_cattle' },
  { key: 'beef', tKey: 'animals.beef_cattle' },
  { key: 'sheep', tKey: 'animals.sheep' },
  { key: 'pig', tKey: 'animals.pigs' },
  { key: 'poultry', tKey: 'animals.poultry' },
]

const SPECIES_T_MAP: Record<string, string> = {
  cattle: 'animals.dairy_cattle',
  dairy: 'animals.dairy_cattle',
  beef: 'animals.beef_cattle',
  sheep: 'animals.sheep',
  pig: 'animals.pigs',
  poultry: 'animals.poultry',
}

export default function WorkspacePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ clients: 0, formulas: 0, ingredients: 0, premixes: 0 })
  const [recentFormulas, setRecentFormulas] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Wizard state
  const [showWizard, setShowWizard] = useState(false)
  const [step, setStep] = useState(0)
  const [obName, setObName] = useState('')
  const [obCompany, setObCompany] = useState('')
  const [obCountry, setObCountry] = useState('Australia')
  const [obCurrency, setObCurrency] = useState('AUD')
  const [obModel, setObModel] = useState('AFRC')
  const [obSpecies, setObSpecies] = useState<string[]>([])
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: p } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    if (p && !p.onboarding_completed) {
      setObName(p.full_name || '')
      setObCompany(p.company || '')
      setObCountry(p.country || 'Australia')
      setObCurrency(p.currency || 'AUD')
      setObModel(p.nutrition_model || 'AFRC')
      setObSpecies(p.species || [])
      setShowWizard(true)
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

  function toggleSpecies(sp: string) {
    setObSpecies(prev => prev.includes(sp) ? prev.filter(s => s !== sp) : [...prev, sp])
  }

  async function finishWizard(acceptedDisclaimer: boolean) {
    setSaving(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const updates: any = {
      full_name: obName,
      company: obCompany,
      country: obCountry,
      currency: obCurrency,
      nutrition_model: obModel,
      species: obSpecies,
      onboarding_completed: true,
    }

    if (acceptedDisclaimer) {
      updates.disclaimer_accepted = true
      updates.disclaimer_accepted_at = new Date().toISOString()
    }

    await supabase.from('user_profiles').update(updates).eq('id', user.id)

    setProfile({ ...profile, ...updates })
    setSaving(false)
    setShowWizard(false)
    loadData()
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('workspace.good_morning') : hour < 18 ? t('workspace.good_afternoon') : t('workspace.good_evening')
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  if (loading) return <div className="p-7 text-text-ghost">{t('common.loading')}</div>

  return (
    <div className="p-7 max-w-[1200px]">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text">{greeting}, {firstName}</h1>
        <p className="text-base text-text-ghost mt-1">{t('workspace.whats_happening')}</p>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {[
          { label: t('workspace.active_clients'), value: stats.clients, icon: Users, color: 'text-brand', href: '/clients' },
          { label: t('workspace.formulas'), value: stats.formulas, icon: FlaskConical, color: 'text-status-amber', href: '/formulas' },
          { label: t('workspace.ingredients'), value: stats.ingredients, icon: Database, color: 'text-status-coral', href: '/ingredients' },
          { label: t('workspace.premixes'), value: stats.premixes, icon: Package, color: 'text-status-blue', href: '/premixes' },
        ].map((stat, i) => (
          <div key={i} onClick={() => router.push(stat.href)} className="stat-card cursor-pointer hover:border-brand/20 transition-colors">
            <div className="flex items-center gap-2 mb-2"><stat.icon size={14} className="text-text-ghost" /><span className="text-xs font-semibold text-text-ghost uppercase tracking-wider">{stat.label}</span></div>
            <div className={`text-3xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => router.push('/clients')} className="btn btn-ghost btn-sm"><Users size={14} /> {t('workspace.new_client')}</button>
        <button onClick={() => router.push('/formulas')} className="btn btn-ghost btn-sm"><FlaskConical size={14} /> {t('workspace.new_formula')}</button>
        <button onClick={() => router.push('/premixes')} className="btn btn-ghost btn-sm"><Package size={14} /> {t('workspace.new_premix')}</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><span className="text-base font-bold text-text-dim">{t('sidebar.clients')}</span><span onClick={() => router.push('/clients')} className="text-xs text-brand font-semibold cursor-pointer hover:underline">{t('common.view_all')} &rarr;</span></div>
          {clients.length > 0 ? clients.map(c => (
            <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors cursor-pointer">
              <div className="flex gap-1">{(c.species as string[] || []).map(s => (<span key={s} className="inline-flex items-center justify-center w-[22px] h-[22px] rounded text-xs font-bold font-mono bg-brand/10 text-brand">{s[0]?.toUpperCase()}</span>))}</div>
              <div className="flex-1"><div className="text-base font-semibold text-text-dim">{c.name}</div><div className="text-xs text-text-ghost">{c.location}</div></div>
            </div>
          )) : <div className="px-4 py-8 text-center text-sm text-text-ghost">{t('workspace.no_clients')} <span onClick={() => router.push('/clients')} className="text-brand cursor-pointer hover:underline">{t('workspace.add_first_client')}</span></div>}
        </div>

        <div className="card">
          <div className="card-header"><span className="text-base font-bold text-text-dim">{t('workspace.recent_formulas')}</span><span onClick={() => router.push('/formulas')} className="text-xs text-brand font-semibold cursor-pointer hover:underline">{t('common.view_all')} &rarr;</span></div>
          {recentFormulas.length > 0 ? recentFormulas.map(f => (
            <div key={f.id} onClick={() => router.push(`/formulas/${f.id}`)} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] transition-colors cursor-pointer">
              <div className="flex-1"><div className="text-base font-semibold text-text-dim">{f.name}</div><div className="text-xs text-text-ghost">{f.client?.name || '—'} &middot; {t(SPECIES_T_MAP[f.species] || 'common.species')}</div></div>
              <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase ${f.status === 'draft' ? 'bg-status-amber/15 text-status-amber' : 'bg-brand/15 text-brand'}`}>{f.status}</span>
            </div>
          )) : <div className="px-4 py-8 text-center text-sm text-text-ghost">{t('workspace.no_formulas')} <span onClick={() => router.push('/formulas')} className="text-brand cursor-pointer hover:underline">{t('workspace.create_first_formula')}</span></div>}
        </div>
      </div>

      {/* ── WELCOME WIZARD ──────────────────────── */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-2xl border border-border w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="h-1 bg-surface-deep"><div className="h-full bg-brand transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>

            <div className="overflow-y-auto">

              {/* ── Step 0: Welcome ─────────────── */}
              {step === 0 && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center mx-auto mb-5">
                    <span className="text-white font-extrabold text-2xl">OF</span>
                  </div>
                  <h1 className="text-2xl font-bold text-text mb-2">{t('wizard.welcome_title')}, {firstName}</h1>
                  <p className="text-text-muted mb-1">{t('wizard.welcome_subtitle')}</p>
                  <p className="text-sm text-text-ghost mb-6">{t('wizard.setup_message')}</p>

                  <div className="bg-surface-deep rounded-lg p-4 mb-6 text-left">
                    <div className="text-xs font-semibold text-text-ghost uppercase tracking-wider mb-2">{t('wizard.already_done')}</div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm"><Check size={14} className="text-brand flex-shrink-0" /><span className="text-text-dim">{t('wizard.created_account')}</span></div>
                      <div className="flex items-center gap-2 text-sm"><Check size={14} className="text-brand flex-shrink-0" /><span className="text-text-dim">{stats.ingredients} {t('wizard.loaded_ingredients')}</span></div>
                      <div className="flex items-center gap-2 text-sm"><Check size={14} className="text-brand flex-shrink-0" /><span className="text-text-dim">{t('wizard.prepopulated_demo')}</span></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 max-w-md mx-auto">
                    {[
                      [t('wizard.step1_title'), t('wizard.step1_desc')],
                      [t('wizard.step2_title'), t('wizard.step2_desc')],
                      [t('wizard.step3_title'), t('wizard.step3_desc')],
                    ].map(([title, desc], i) => (
                      <div key={i} className="flex items-center gap-3 text-left p-2.5 rounded-lg bg-surface-deep">
                        <div className="w-6 h-6 rounded-full bg-brand/15 text-brand flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                        <div><div className="text-sm font-semibold text-text-dim">{title}</div><div className="text-2xs text-text-ghost">{desc}</div></div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setStep(1)} className="btn btn-primary mt-6 w-full max-w-xs mx-auto justify-center">{t('common.get_started')} <ArrowRight size={14} /></button>
                  <button onClick={() => setStep(3)} className="block mx-auto mt-2 text-xs text-text-ghost hover:text-brand">{t('wizard.skip_to_disclaimer')}</button>
                </div>
              )}

              {/* ── Step 1: Verify data ─────────── */}
              {step === 1 && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center"><UserIcon size={20} className="text-brand" /></div>
                    <div>
                      <h2 className="text-xl font-bold text-text">{t('wizard.confirm_details')}</h2>
                      <p className="text-sm text-text-ghost">{t('wizard.confirm_details_desc')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('wizard.full_name')} *</label><input value={obName} onChange={e => setObName(e.target.value)} className="input" placeholder="Dr. Sarah Mitchell" /></div>
                      <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('wizard.company_practice')}</label><input value={obCompany} onChange={e => setObCompany(e.target.value)} className="input" placeholder="Mitchell Nutrition" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.country')}</label>
                        <select value={obCountry} onChange={e => setObCountry(e.target.value)} className="input">
                          {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.currency')}</label>
                        <select value={obCurrency} onChange={e => setObCurrency(e.target.value)} className="input">
                          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-muted block mb-1.5">{t('wizard.species_work_with')}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {SPECIES_KEYS.map(sp => {
                          const selected = obSpecies.includes(sp.key)
                          return (
                            <button key={sp.key} type="button" onClick={() => toggleSpecies(sp.key)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selected ? 'bg-brand text-white border-brand' : 'bg-surface-deep text-text-muted border-border hover:border-brand/30'}`}>
                              {t(sp.tKey)}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-muted block mb-1.5">{t('wizard.primary_nutrition_model')}</label>
                      <div className="flex flex-col gap-1.5">
                        {NUT_MODELS.map(m => (
                          <div key={m.key} onClick={() => setObModel(m.key)} className={`p-2.5 rounded-lg border cursor-pointer transition-all ${obModel === m.key ? 'border-brand bg-brand/5' : 'border-border hover:border-border-light bg-surface-bg'}`}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${obModel === m.key ? 'border-brand' : 'border-border'}`}>{obModel === m.key && <div className="w-2 h-2 rounded-full bg-brand" />}</div>
                              <span className="text-sm font-bold text-text">{m.name}</span>
                              <span className="text-2xs text-text-ghost">{m.region}</span>
                            </div>
                            <p className="text-2xs text-text-muted ml-6">{m.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button onClick={() => setStep(0)} className="btn btn-ghost flex-1 justify-center">{t('common.back')}</button>
                    <button onClick={() => setStep(2)} disabled={!obName.trim()} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{t('common.continue')} <ChevronRight size={14} /></button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Instructions ────────── */}
              {step === 2 && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center"><BookOpen size={20} className="text-brand" /></div>
                    <div>
                      <h2 className="text-xl font-bold text-text">{t('wizard.quick_tour')}</h2>
                      <p className="text-sm text-text-ghost">{t('wizard.quick_tour_desc')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {[
                      { icon: Users,        color: 'text-brand',        title: t('sidebar.clients'),     desc: t('wizard.clients_desc') },
                      { icon: FlaskConical, color: 'text-status-amber', title: t('sidebar.formulas'),    desc: t('wizard.formulas_desc') },
                      { icon: Database,     color: 'text-status-coral', title: t('sidebar.ingredients'), desc: t('wizard.ingredients_desc') },
                      { icon: Package,      color: 'text-status-blue',  title: t('sidebar.premixes'),    desc: t('wizard.premixes_desc') },
                    ].map((f, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-surface-deep">
                        <f.icon size={20} className={`${f.color} flex-shrink-0 mt-0.5`} />
                        <div>
                          <div className="text-sm font-bold text-text-dim mb-0.5">{f.title}</div>
                          <div className="text-xs text-text-ghost leading-relaxed">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-brand/5 border border-brand/20">
                    <div className="text-xs text-text-dim leading-relaxed">
                      💡 <strong>Tip:</strong> {t('wizard.tip_ai')}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button onClick={() => setStep(1)} className="btn btn-ghost flex-1 justify-center">{t('common.back')}</button>
                    <button onClick={() => setStep(3)} className="btn btn-primary flex-1 justify-center">{t('common.continue')} <ChevronRight size={14} /></button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Disclaimer ──────────── */}
              {step === 3 && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-status-amber/15 flex items-center justify-center"><Shield size={20} className="text-status-amber" /></div>
                    <div>
                      <h2 className="text-xl font-bold text-text">{t('wizard.disclaimer_title')}</h2>
                      <p className="text-sm text-text-ghost">{t('wizard.disclaimer_subtitle')}</p>
                    </div>
                  </div>

                  <div className="bg-surface-deep rounded-lg p-5 mb-4 text-sm text-text-muted leading-relaxed max-h-80 overflow-y-auto">
                    <p className="mb-3"><strong className="text-text-dim">{t('wizard.disclaimer_text_1')}</strong></p>
                    <p className="mb-3">{t('wizard.disclaimer_text_2')}</p>
                    <p className="mb-3"><strong className="text-text-dim">{t('wizard.disclaimer_responsibilities')}</strong></p>
                    <ul className="list-disc pl-5 mb-3 space-y-1">
                      <li>{t('wizard.disclaimer_r1')}</li>
                      <li>{t('wizard.disclaimer_r2')}</li>
                      <li>{t('wizard.disclaimer_r3')}</li>
                      <li>{t('wizard.disclaimer_r4')}</li>
                      <li>{t('wizard.disclaimer_r5')}</li>
                    </ul>
                    <p className="mb-3">{t('wizard.disclaimer_liability')}</p>
                    <p className="mb-3">{t('wizard.disclaimer_models')}</p>
                    <p className="mb-0 text-text-ghost text-xs">{t('wizard.disclaimer_acknowledge')}</p>
                  </div>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-bg cursor-pointer hover:border-brand/30 transition-colors">
                    <input type="checkbox" checked={disclaimerAgreed} onChange={e => setDisclaimerAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand cursor-pointer" />
                    <span className="text-sm text-text-dim">{t('wizard.accept_checkbox')}</span>
                  </label>

                  {!disclaimerAgreed && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-status-amber/5 border border-status-amber/20">
                      <AlertTriangle size={14} className="text-status-amber flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-text-muted leading-relaxed">{t('wizard.skip_warning')}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-6">
                    <button onClick={() => setStep(2)} disabled={saving} className="btn btn-ghost flex-1 justify-center">{t('common.back')}</button>
                    {disclaimerAgreed ? (
                      <button onClick={() => finishWizard(true)} disabled={saving} className="btn btn-primary flex-1 justify-center">
                        {saving ? t('common.saving') : <>{t('wizard.accept_finish')} <Rocket size={14} /></>}
                      </button>
                    ) : (
                      <button onClick={() => finishWizard(false)} disabled={saving} className="btn btn-ghost flex-1 justify-center border border-border">
                        {saving ? t('common.saving') : t('wizard.continue_without')}
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
