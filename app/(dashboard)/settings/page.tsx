'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Save, Check, LogOut, Key, User, Sliders, Link2, Shield, CreditCard,
  Globe, Camera, Upload, X, AlertTriangle, ExternalLink, CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'BRL', 'ARS', 'ZAR', 'CLP']
const COUNTRIES = ['Australia','New Zealand','United States','Canada','United Kingdom','Ireland','South Africa','Brazil','Argentina','Chile','Uruguay','Other']
const SPECIES_OPTIONS = [
  { key: 'dairy', label: 'Dairy Cattle' },
  { key: 'beef', label: 'Beef Cattle' },
  { key: 'sheep', label: 'Sheep' },
  { key: 'pig', label: 'Pigs' },
  { key: 'poultry', label: 'Poultry' },
]

export default function SettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [tab, setTab] = useState<'profile'|'community'|'preferences'|'subscription'|'disclaimer'|'integrations'|'account'>('profile')

  // Profile (user_profiles)
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [country, setCountry] = useState('Australia')
  const [species, setSpecies] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Professional (nutritionist_profiles)
  const [businessName, setBusinessName] = useState('')
  const [credentials, setCredentials] = useState('')
  const [phone, setPhone] = useState('')

  // Community (user_profiles)
  const [publicProfile, setPublicProfile] = useState(false)
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState<number | null>(null)
  const [specialties, setSpecialties] = useState<string[]>([])

  // Preferences (user_profiles + nutritionist_profiles)
  const [nutritionModel, setNutritionModel] = useState('AFRC')
  const [currency, setCurrency] = useState('AUD')
  const [feedingStandard, setFeedingStandard] = useState('CSIRO')
  const [energyUnit, setEnergyUnit] = useState('MJ')
  const [defaultBatch, setDefaultBatch] = useState('1000')

  // Subscription (user_profiles)
  const [subscriptionStatus, setSubscriptionStatus] = useState('')
  const [subscriptionPlan, setSubscriptionPlan] = useState('')
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null)
  const [subscriptionStartedAt, setSubscriptionStartedAt] = useState<string | null>(null)

  // Disclaimer (user_profiles)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [disclaimerAcceptedAt, setDisclaimerAcceptedAt] = useState<string | null>(null)

  // Integrations
  const [feedflowKey, setFeedflowKey] = useState('')

  // Password
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadProfile() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setEmail(user.email || '')

    // user_profiles — primary source
    const { data: up } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    if (up) {
      setFullName(up.full_name || '')
      setCompany(up.company || '')
      setCountry(up.country || 'Australia')
      setSpecies(up.species || [])
      setAvatarUrl(up.avatar_url || null)
      setNutritionModel(up.nutrition_model || 'AFRC')
      setCurrency(up.currency || 'AUD')
      setPublicProfile(up.public_profile || false)
      setBio(up.bio || '')
      setYearsExperience(up.years_experience)
      setSpecialties(up.specialties || [])
      setSubscriptionStatus(up.subscription_status || '')
      setSubscriptionPlan(up.subscription_plan || '')
      setTrialExpiresAt(up.trial_expires_at || null)
      setSubscriptionStartedAt(up.subscription_started_at || null)
      setDisclaimerAccepted(up.disclaimer_accepted || false)
      setDisclaimerAcceptedAt(up.disclaimer_accepted_at || null)
    }

    // nutritionist_profiles — professional settings
    const { data: np } = await supabase.from('nutritionist_profiles').select('*').eq('id', user.id).single()
    if (np) {
      setBusinessName(np.business_name || '')
      setCredentials(np.credentials || '')
      setPhone(np.phone || '')
      setFeedingStandard(np.feeding_standard || 'CSIRO')
      setEnergyUnit(np.energy_unit || 'MJ')
      setDefaultBatch(String(np.default_batch_kg || 1000))
    }
  }

  function showSaved(key: string) {
    setSaved(key)
    setTimeout(() => setSaved(''), 2000)
  }

  // ── AVATAR UPLOAD ──────────────────────────

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB')
      return
    }

    setUploadingAvatar(true)
    const supabase = await getSupabase()
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${userId}.${ext}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Avatar upload failed:', uploadError)
      alert('Failed to upload image. Please try again.')
      setUploadingAvatar(false)
      return
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const url = urlData.publicUrl + '?t=' + Date.now() // cache bust

    // Save to profile
    await supabase.from('user_profiles').update({ avatar_url: url }).eq('id', userId)
    setAvatarUrl(url)
    setUploadingAvatar(false)
  }

  async function removeAvatar() {
    const supabase = await getSupabase()
    await supabase.from('user_profiles').update({ avatar_url: null }).eq('id', userId)
    setAvatarUrl(null)
  }

  // ── SAVE HANDLERS ──────────────────────────

  async function handleSaveProfile() {
    setSaving(true)
    const supabase = await getSupabase()

    // user_profiles
    await supabase.from('user_profiles').update({
      full_name: fullName || null,
      company: company || null,
      country: country || null,
      species: species,
    }).eq('id', userId)

    // nutritionist_profiles
    await supabase.from('nutritionist_profiles').upsert({
      id: userId,
      business_name: businessName || null,
      credentials: credentials || null,
      phone: phone || null,
    })

    setSaving(false)
    showSaved('profile')
  }

  async function handleSaveCommunity() {
    setSaving(true)
    const supabase = await getSupabase()
    await supabase.from('user_profiles').update({
      public_profile: publicProfile,
      bio: bio.trim() || null,
      years_experience: yearsExperience,
      specialties: specialties,
    }).eq('id', userId)
    setSaving(false)
    showSaved('community')
  }

  async function handleSavePreferences() {
    setSaving(true)
    const supabase = await getSupabase()

    // user_profiles
    await supabase.from('user_profiles').update({
      nutrition_model: nutritionModel,
      currency: currency,
    }).eq('id', userId)

    // nutritionist_profiles
    await supabase.from('nutritionist_profiles').upsert({
      id: userId,
      feeding_standard: feedingStandard,
      energy_unit: energyUnit,
      default_batch_kg: parseInt(defaultBatch) || 1000,
    })

    setSaving(false)
    showSaved('preferences')
  }

  async function handleAcceptDisclaimer() {
    setSaving(true)
    const supabase = await getSupabase()
    const now = new Date().toISOString()
    await supabase.from('user_profiles').update({
      disclaimer_accepted: true,
      disclaimer_accepted_at: now,
    }).eq('id', userId)
    setDisclaimerAccepted(true)
    setDisclaimerAcceptedAt(now)
    setSaving(false)
    showSaved('disclaimer')
  }

  async function handleRevokeDisclaimer() {
    setSaving(true)
    const supabase = await getSupabase()
    await supabase.from('user_profiles').update({
      disclaimer_accepted: false,
      disclaimer_accepted_at: null,
    }).eq('id', userId)
    setDisclaimerAccepted(false)
    setDisclaimerAcceptedAt(null)
    setSaving(false)
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
    setNewPw(''); setConfirmPw('')
    showSaved('password')
  }

  async function handleLogout() {
    const supabase = await getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function toggleSpecies(sp: string) {
    setSpecies(prev => prev.includes(sp) ? prev.filter(s => s !== sp) : [...prev, sp])
  }

  // ── STATUS HELPERS ─────────────────────────

  function subscriptionLabel() {
    switch (subscriptionStatus) {
      case 'trialing': return { text: 'Free Trial', color: 'bg-status-amber/15 text-status-amber' }
      case 'subscribed_trialing': return { text: 'Subscribed (Trial)', color: 'bg-brand/15 text-brand' }
      case 'active': return { text: 'Active', color: 'bg-brand/15 text-brand' }
      case 'past_due': return { text: 'Past Due', color: 'bg-status-red/15 text-status-red' }
      case 'cancelled': return { text: 'Cancelled', color: 'bg-status-red/10 text-text-ghost' }
      case 'trial_expired': return { text: 'Trial Expired', color: 'bg-status-red/15 text-status-red' }
      default: return { text: subscriptionStatus || 'Unknown', color: 'bg-white/10 text-text-muted' }
    }
  }

  function SaveButton({ section }: { section: string }) {
    return (
      <button onClick={() => {
        if (section === 'profile') handleSaveProfile()
        else if (section === 'community') handleSaveCommunity()
        else if (section === 'preferences') handleSavePreferences()
      }} disabled={saving} className={`btn btn-primary btn-sm ${saved === section ? 'bg-brand/50' : ''}`}>
        {saving ? 'Saving...' : saved === section ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
      </button>
    )
  }

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: User },
    { key: 'community' as const, label: 'Community', icon: Globe },
    { key: 'preferences' as const, label: 'Preferences', icon: Sliders },
    { key: 'subscription' as const, label: 'Subscription', icon: CreditCard },
    { key: 'disclaimer' as const, label: 'Disclaimer', icon: Shield },
    { key: 'integrations' as const, label: 'Integrations', icon: Link2 },
    { key: 'account' as const, label: 'Account', icon: Key },
  ]

  const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="p-7 max-w-[960px]">
      <h1 className="text-2xl font-bold text-text mb-5">Settings</h1>

      <div className="grid grid-cols-[200px_1fr] gap-5">
        {/* Sidebar */}
        <div className="flex flex-col gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left border-none cursor-pointer
                ${tab === t.key ? 'bg-brand/10 text-brand' : 'text-text-faint hover:bg-white/5 bg-transparent'}`}>
              <t.icon size={16} /> {t.label}
              {t.key === 'disclaimer' && !disclaimerAccepted && (
                <span className="ml-auto w-2 h-2 rounded-full bg-status-amber" />
              )}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-status-red hover:bg-status-red/5 transition-all text-left border-none cursor-pointer bg-transparent mt-4">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Content */}
        <div>

          {/* ── PROFILE ───────────────────────── */}
          {tab === 'profile' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">Profile</h2>
                  <p className="text-sm text-text-faint">Your personal and business information. Appears on reports, Community, and shared formulas.</p>
                </div>
                <SaveButton section="profile" />
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-border">
                <div className="relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-brand/15 flex items-center justify-center text-2xl font-bold text-brand border-2 border-border">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border-none"
                  >
                    <Camera size={20} className="text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-dim mb-1">{fullName || 'Your Name'}</div>
                  <div className="text-xs text-text-ghost mb-2">{email}</div>
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="btn btn-ghost btn-sm text-xs">
                      {uploadingAvatar ? 'Uploading...' : <><Upload size={12} /> Upload photo</>}
                    </button>
                    {avatarUrl && (
                      <button onClick={removeAvatar} className="btn btn-ghost btn-sm text-xs text-status-red"><X size={12} /> Remove</button>
                    )}
                  </div>
                  <p className="text-2xs text-text-ghost mt-1">JPG, PNG, or WebP. Max 2MB. Shows in Community directory and reports.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Dr. Sarah Mitchell" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Credentials</label>
                    <input value={credentials} onChange={e => setCredentials(e.target.value)} className="input" placeholder="BAnimSc, PhD, RAnNutr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Company / Practice</label>
                    <input value={company} onChange={e => setCompany(e.target.value)} className="input" placeholder="Mitchell Nutrition" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Business Name (for reports)</label>
                    <input value={businessName} onChange={e => setBusinessName(e.target.value)} className="input" placeholder="Mitchell Livestock Nutrition Pty Ltd" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Email</label>
                    <input value={email} disabled className="input opacity-60" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+61 3 9876 5432" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Country</label>
                    <select value={country} onChange={e => setCountry(e.target.value)} className="input">
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1.5">Species you work with</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIES_OPTIONS.map(sp => {
                      const selected = species.includes(sp.key)
                      return (
                        <button key={sp.key} type="button" onClick={() => toggleSpecies(sp.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selected ? 'bg-brand text-white border-brand' : 'bg-surface-deep text-text-muted border-border hover:border-brand/30'}`}>
                          {sp.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── COMMUNITY ─────────────────────── */}
          {tab === 'community' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">Community Profile</h2>
                  <p className="text-sm text-text-faint">Control what other Optia Feed users see about you in the Professional Directory.</p>
                </div>
                <SaveButton section="community" />
              </div>

              {/* Public toggle */}
              <div className="flex items-center justify-between p-4 bg-surface-bg rounded-lg border border-border mb-5">
                <div className="flex items-center gap-3">
                  <Globe size={18} className={publicProfile ? 'text-brand' : 'text-text-ghost'} />
                  <div>
                    <div className="text-sm font-bold text-text-dim">Public profile</div>
                    <div className="text-2xs text-text-ghost">{publicProfile ? 'Visible to other Optia Feed users in the Community directory' : 'Hidden — only you can see your profile'}</div>
                  </div>
                </div>
                <button onClick={() => setPublicProfile(!publicProfile)}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer border-none ${publicProfile ? 'bg-brand' : 'bg-surface-deep border border-border'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${publicProfile ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} className="input" rows={3}
                    placeholder="Independent dairy nutrition consultant specialising in high-producing Holstein herds across Gippsland and Western Victoria..." />
                  <p className="text-2xs text-text-ghost mt-1">{bio.length}/300 characters</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Years of experience</label>
                    <input type="number" value={yearsExperience ?? ''} onChange={e => setYearsExperience(e.target.value ? parseInt(e.target.value) : null)}
                      className="input" placeholder="e.g. 15" min="0" max="60" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Specialties (comma-separated)</label>
                    <input value={specialties.join(', ')} onChange={e => setSpecialties(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      className="input" placeholder="e.g. dairy, feedlot, TMR design" />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {publicProfile && (
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Profile preview</div>
                  <div className="card p-4 flex items-start gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-sm font-bold text-brand">{initials}</div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-bold text-text-dim">{fullName || 'Your Name'}</div>
                      <div className="text-2xs text-text-ghost">{company || 'Company'} · {country}</div>
                      {bio && <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{bio}</p>}
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {species.map(sp => (
                          <span key={sp} className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold">
                            {SPECIES_OPTIONS.find(s => s.key === sp)?.label || sp}
                          </span>
                        ))}
                        {yearsExperience && <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-bg text-text-ghost font-mono">{yearsExperience}y exp</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PREFERENCES ───────────────────── */}
          {tab === 'preferences' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">Preferences</h2>
                  <p className="text-sm text-text-faint">Default settings for formulation and reporting.</p>
                </div>
                <SaveButton section="preferences" />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Nutrition Model</label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { key: 'AFRC', name: 'AFRC / CSIRO', region: 'Australia, NZ, UK', desc: 'ME-based energy, UDP/RDP protein. Standard in AU/NZ dairy and beef.' },
                      { key: 'NRC', name: 'NRC 2001', region: 'USA, Canada', desc: 'NEL/TDN energy, RUP/RDP protein. US dairy industry standard.' },
                      { key: 'CNCPS', name: 'CNCPS v6', region: 'Research / global', desc: 'Advanced protein and carbohydrate fractions.' },
                    ].map(m => (
                      <div key={m.key} onClick={() => setNutritionModel(m.key)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all ${nutritionModel === m.key ? 'border-brand bg-brand/5' : 'border-border hover:border-border-light bg-surface-bg'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${nutritionModel === m.key ? 'border-brand' : 'border-border'}`}>
                            {nutritionModel === m.key && <div className="w-2 h-2 rounded-full bg-brand" />}
                          </div>
                          <span className="text-sm font-bold text-text">{m.name}</span>
                          <span className="text-2xs text-text-ghost">{m.region}</span>
                        </div>
                        <p className="text-2xs text-text-muted ml-6">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Feeding Standard</label>
                  <select value={feedingStandard} onChange={e => setFeedingStandard(e.target.value)} className="input">
                    <option value="CSIRO">CSIRO — Feeding Standards for Australian Livestock</option>
                    <option value="NRC">NRC — Nutrient Requirements of Domestic Animals (USA)</option>
                    <option value="INRA">INRA — European Feeding Standards</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
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

          {/* ── SUBSCRIPTION ──────────────────── */}
          {tab === 'subscription' && (
            <div className="flex flex-col gap-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-text mb-1">Subscription</h2>
                <p className="text-sm text-text-faint mb-5">Manage your Optia Feed plan and billing.</p>

                <div className="p-4 bg-surface-bg rounded-lg border border-border mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-base font-bold text-text-dim capitalize">{subscriptionPlan || 'Free Trial'}</div>
                      <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase ${subscriptionLabel().color}`}>
                        {subscriptionLabel().text}
                      </span>
                    </div>
                    {(subscriptionStatus === 'trialing' || subscriptionStatus === 'trial_expired') && (
                      <button onClick={() => router.push('/subscribe')} className="btn btn-primary btn-sm">
                        <CreditCard size={14} /> Subscribe Now
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {trialExpiresAt && (
                      <div>
                        <span className="text-text-ghost">Trial expires:</span>
                        <span className="ml-2 text-text-dim font-semibold">{new Date(trialExpiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                    {subscriptionStartedAt && (
                      <div>
                        <span className="text-text-ghost">Subscribed since:</span>
                        <span className="ml-2 text-text-dim font-semibold">{new Date(subscriptionStartedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { plan: 'Starter', price: '$49', features: ['Up to 10 clients', 'Ruminant formulation', 'Basic AI reviews'] },
                    { plan: 'Professional', price: '$99', features: ['Unlimited clients', 'All species', 'Full AI + least-cost', 'Branded reports'], popular: true },
                    { plan: 'Enterprise', price: '$199', features: ['Everything in Pro', 'Team accounts (5)', 'Custom profiles', 'API access'] },
                  ].map(p => (
                    <div key={p.plan} className={`p-4 rounded-lg border ${p.popular ? 'border-brand bg-brand/5' : 'border-border bg-surface-bg'}`}>
                      <div className="text-sm font-bold text-text-dim">{p.plan}</div>
                      <div className="text-xl font-bold font-mono text-brand mt-1">{p.price}<span className="text-xs text-text-ghost font-normal">/mo AUD</span></div>
                      <div className="mt-2 flex flex-col gap-1">
                        {p.features.map((f, i) => (
                          <div key={i} className="text-2xs text-text-muted flex items-center gap-1"><CheckCircle size={10} className="text-brand" /> {f}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DISCLAIMER ────────────────────── */}
          {tab === 'disclaimer' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-text">Professional-Use Disclaimer</h2>
                  <p className="text-sm text-text-faint">Review and manage your acceptance of the platform disclaimer.</p>
                </div>
                {disclaimerAccepted ? (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-brand"><CheckCircle size={16} /> Accepted</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-status-amber"><AlertTriangle size={16} /> Not accepted</span>
                )}
              </div>

              <div className="bg-surface-bg rounded-lg p-5 mb-4 text-sm text-text-muted leading-relaxed max-h-72 overflow-y-auto border border-border">
                <p className="mb-3"><strong className="text-text-dim">Optia Feed is a decision-support tool</strong> designed to assist qualified animal nutritionists and livestock professionals in formulating diets, analysing nutrient requirements, and managing client data.</p>
                <p className="mb-3">All formulations, nutrient calculations, AI-generated reviews, and recommendations produced by this platform are <strong className="text-text-dim">informational aids only</strong>. They do not replace, substitute, override, or in any way diminish the professional judgment, expertise, or final responsibility of the user.</p>
                <p className="mb-3"><strong className="text-text-dim">The user retains full responsibility for:</strong></p>
                <ul className="list-disc pl-5 mb-3 space-y-1">
                  <li>Validating all inputs, ingredient compositions, and ingredient prices</li>
                  <li>Reviewing all outputs before applying them in the field</li>
                  <li>Independently verifying nutritional requirements for the specific animals, conditions, and management system</li>
                  <li>Ensuring compliance with local regulations, veterinary guidelines, and animal welfare standards</li>
                  <li>Any decisions, recommendations, or outcomes resulting from the use of this platform</li>
                </ul>
                <p className="mb-3">Optia Feed, its developers, Agrometrics, and affiliated entities accept no liability for animal health outcomes, production losses, regulatory non-compliance, or financial consequences arising from the use of formulations, reports, or analyses generated through this platform.</p>
                <p>Nutritional models (AFRC, NRC, CNCPS) reference published scientific standards but may not reflect the most recent updates.</p>
              </div>

              {disclaimerAccepted ? (
                <div className="flex items-center justify-between p-3 bg-brand/5 rounded-lg border border-brand/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-brand" />
                    <span className="text-sm text-text-dim">Accepted on {disclaimerAcceptedAt ? new Date(disclaimerAcceptedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                  </div>
                  <button onClick={handleRevokeDisclaimer} disabled={saving} className="btn btn-ghost btn-sm text-xs text-status-red">Revoke acceptance</button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-3 mb-3 bg-status-amber/5 rounded-lg border border-status-amber/20">
                    <AlertTriangle size={14} className="text-status-amber flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-muted">Your exported reports will carry a notice that the disclaimer has not been acknowledged. This may affect professional credibility with clients.</p>
                  </div>
                  <button onClick={handleAcceptDisclaimer} disabled={saving} className="btn btn-primary">
                    {saving ? 'Saving...' : <><Shield size={14} /> Accept Disclaimer</>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── INTEGRATIONS ──────────────────── */}
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
                  <p className="text-2xs text-text-ghost mt-1">Enter your FeedFlow API key to enable bidirectional sync.</p>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand font-extrabold text-xs font-mono">AI</div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-text-dim">Optia AI Engine</div>
                    <div className="text-xs text-text-ghost">Powered by Claude (Anthropic)</div>
                  </div>
                  <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">ACTIVE</span>
                </div>
                <p className="text-xs text-text-ghost">The AI engine is configured server-side and requires no setup from your end.</p>
              </div>
            </div>
          )}

          {/* ── ACCOUNT ───────────────────────── */}
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

              <div className="card p-6 border-status-red/20">
                <h2 className="text-lg font-bold text-status-red mb-1">Danger Zone</h2>
                <p className="text-sm text-text-faint mb-4">Irreversible actions. Proceed with caution.</p>
                <button onClick={handleLogout} className="btn btn-sm bg-status-red text-white border-none hover:bg-status-red/80 cursor-pointer">
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
