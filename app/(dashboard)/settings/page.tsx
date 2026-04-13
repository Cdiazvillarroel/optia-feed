'use client'

import { useState, useEffect } from 'react'
import { Save, Check, LogOut, Key, User, Sliders, Link2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [tab, setTab] = useState<'profile'|'preferences'|'integrations'|'account'>('profile')
  // Profile fields
  const [businessName, setBusinessName] = useState('')
  const [fullName, setFullName] = useState('')
  const [credentials, setCredentials] = useState('')
  const [phone, setPhone] = useState('')
  // Preferences
  const [feedingStandard, setFeedingStandard] = useState('CSIRO')
  const [currency, setCurrency] = useState('AUD')
  const [energyUnit, setEnergyUnit] = useState('MJ')
  const [defaultBatch, setDefaultBatch] = useState('1000')
  // Integrations
  const [feedflowKey, setFeedflowKey] = useState('')
  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadProfile() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')
    const { data: p } = await supabase.from('nutritionist_profiles').select('*').eq('id', user.id).single()
    if (p) {
      setProfile(p)
      setBusinessName(p.business_name || '')
      setFullName(p.full_name || '')
      setCredentials(p.credentials || '')
      setPhone(p.phone || '')
      setFeedingStandard(p.feeding_standard || 'CSIRO')
      setCurrency(p.currency || 'AUD')
      setEnergyUnit(p.energy_unit || 'MJ')
      setDefaultBatch(String(p.default_batch_kg || 1000))
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('nutritionist_profiles').update({
      business_name: businessName || null,
      full_name: fullName || null,
      credentials: credentials || null,
      phone: phone || null,
    }).eq('id', user.id)
    setSaving(false); setSaved('profile'); setTimeout(() => setSaved(''), 2000)
  }

  async function handleSavePreferences() {
    setSaving(true)
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('nutritionist_profiles').update({
      feeding_standard: feedingStandard,
      currency: currency,
      energy_unit: energyUnit,
      default_batch_kg: parseInt(defaultBatch) || 1000,
    }).eq('id', user.id)
    setSaving(false); setSaved('preferences'); setTimeout(() => setSaved(''), 2000)
  }

  async function handleChangePassword() {
    setPwError('')
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setSaving(true)
    const supabase = await getSupabase()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSaving(false)
    if (error) { setPwError(error.message); return }
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setSaved('password'); setTimeout(() => setSaved(''), 2000)
  }

  async function handleLogout() {
    const supabase = await getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: User },
    { key: 'preferences' as const, label: 'Preferences', icon: Sliders },
    { key: 'integrations' as const, label: 'Integrations', icon: Link2 },
    { key: 'account' as const, label: 'Account', icon: Key },
  ]

  return (
    <div className="p-7 max-w-[900px]">
      <h1 className="text-2xl font-bold text-text mb-5">Settings</h1>

      <div className="grid grid-cols-[200px_1fr] gap-5">
        {/* Sidebar */}
        <div className="flex flex-col gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left border-none cursor-pointer
                ${tab === t.key ? 'bg-brand/10 text-brand' : 'text-text-faint hover:bg-white/5 bg-transparent'}`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-status-red hover:bg-status-red/5 transition-all text-left border-none cursor-pointer bg-transparent mt-4">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Content */}
        <div>
          {/* PROFILE */}
          {tab === 'profile' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">Profile</h2>
                  <p className="text-sm text-text-faint">Your business and contact information. This appears on reports and shared formulas.</p>
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className={`btn btn-primary btn-sm ${saved === 'profile' ? 'bg-brand/50' : ''}`}>
                  {saving ? 'Saving...' : saved === 'profile' ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Business Name</label>
                  <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="input" placeholder="e.g. Mitchell Livestock Nutrition" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Dr. James Mitchell" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Credentials</label>
                    <input value={credentials} onChange={e => setCredentials(e.target.value)} className="input" placeholder="BAnimSc, PhD, RAnNutr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Email</label>
                    <input value={email} disabled className="input opacity-60" />
                    <p className="text-2xs text-text-ghost mt-1">Email cannot be changed here.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+61 3 9876 5432" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PREFERENCES */}
          {tab === 'preferences' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">Preferences</h2>
                  <p className="text-sm text-text-faint">Default settings for formulation and reporting.</p>
                </div>
                <button onClick={handleSavePreferences} disabled={saving} className={`btn btn-primary btn-sm ${saved === 'preferences' ? 'bg-brand/50' : ''}`}>
                  {saving ? 'Saving...' : saved === 'preferences' ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Feeding Standard</label>
                  <select value={feedingStandard} onChange={e => setFeedingStandard(e.target.value)} className="input">
                    <option value="CSIRO">CSIRO — Feeding Standards for Australian Livestock</option>
                    <option value="NRC">NRC — Nutrient Requirements of Domestic Animals (USA)</option>
                    <option value="INRA">INRA — European Feeding Standards</option>
                  </select>
                  <p className="text-2xs text-text-ghost mt-1">Primary reference for nutrient requirements and safety limits.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
                      <option value="AUD">AUD (A$)</option>
                      <option value="USD">USD (US$)</option>
                      <option value="NZD">NZD (NZ$)</option>
                      <option value="GBP">GBP (\u00A3)</option>
                      <option value="EUR">EUR (\u20AC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Energy Units</label>
                    <select value={energyUnit} onChange={e => setEnergyUnit(e.target.value)} className="input">
                      <option value="MJ">MJ/kg (Megajoules)</option>
                      <option value="Mcal">Mcal/kg (Megacalories)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Default Batch Size</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={defaultBatch} onChange={e => setDefaultBatch(e.target.value)} className="input" min="100" step="100" />
                      <span className="text-xs text-text-ghost whitespace-nowrap">kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INTEGRATIONS */}
          {tab === 'integrations' && (
            <div className="flex flex-col gap-4">
              <div className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-extrabold text-xs font-mono">FF</div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-text-dim">FeedFlow</div>
                    <div className="text-xs text-text-ghost">Sync farm data, silo levels, and consumption</div>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-status-amber/10 text-status-amber font-bold font-mono">COMING SOON</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">FeedFlow API Key</label>
                  <input type="password" value={feedflowKey} onChange={e => setFeedflowKey(e.target.value)} className="input" placeholder="ff_live_..." />
                  <p className="text-2xs text-text-ghost mt-1">Enter your FeedFlow API key to enable bidirectional sync. Get your key from the FeedFlow dashboard.</p>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-status-purple/10 flex items-center justify-center text-status-purple font-extrabold text-xs font-mono">AI</div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-text-dim">Optia AI Engine</div>
                    <div className="text-xs text-text-ghost">Powered by Claude (Anthropic)</div>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">ACTIVE</span>
                </div>
                <p className="text-xs text-text-ghost">The AI engine is configured server-side. Contact your administrator to update the API key.</p>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-status-blue/10 flex items-center justify-center text-status-blue font-extrabold text-xs font-mono">PD</div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-text-dim">Pipedream</div>
                    <div className="text-xs text-text-ghost">Automation workflows and webhooks</div>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-status-amber/10 text-status-amber font-bold font-mono">COMING SOON</span>
                </div>
                <p className="text-xs text-text-ghost">Connect Pipedream to automate price updates, report scheduling, and client notifications.</p>
              </div>
            </div>
          )}

          {/* ACCOUNT */}
          {tab === 'account' && (
            <div className="flex flex-col gap-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-text mb-1">Change Password</h2>
                <p className="text-sm text-text-faint mb-4">Update your account password.</p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">New Password</label>
                    <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="input" placeholder="Minimum 6 characters" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Confirm New Password</label>
                    <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="input" placeholder="Repeat new password" />
                  </div>
                  {pwError && <p className="text-sm text-status-red bg-status-red/10 rounded px-3 py-2">{pwError}</p>}
                  <button onClick={handleChangePassword} disabled={saving || !newPw} className="btn btn-primary btn-sm w-fit disabled:opacity-50">
                    {saving ? 'Updating...' : saved === 'password' ? <><Check size={14} /> Updated</> : 'Update Password'}
                  </button>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-bold text-text mb-1">Subscription</h2>
                <p className="text-sm text-text-faint mb-4">Manage your Optia Feed plan.</p>
                <div className="flex items-center gap-4 p-4 bg-surface-bg rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-text-dim capitalize">{profile?.plan || 'Starter'} Plan</div>
                    <div className="text-xs text-text-ghost">
                      {profile?.plan === 'professional' ? 'Unlimited formulas, AI reviews, and clients' :
                       profile?.plan === 'enterprise' ? 'Full platform with team support and API access' :
                       'Up to 5 clients, 10 formulas, basic AI'}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm">Upgrade</button>
                </div>
              </div>

              <div className="card p-6 border-status-red/20">
                <h2 className="text-lg font-bold text-status-red mb-1">Danger Zone</h2>
                <p className="text-sm text-text-faint mb-4">Irreversible actions. Proceed with caution.</p>
                <button onClick={handleLogout} className="btn btn-sm bg-status-red text-white border-none hover:bg-status-red/80">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
