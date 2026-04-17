'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Save, Check, LogOut, Key, User, Sliders, Link2, Shield, CreditCard,
  Globe, Camera, Upload, X, AlertTriangle, ExternalLink, CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'

const CURRENCIES = ['AUD', 'USD', 'NZD', 'GBP', 'EUR', 'BRL', 'ARS', 'ZAR', 'CLP']
const COUNTRIES = ['Australia','New Zealand','United States','Canada','United Kingdom','Ireland','South Africa','Brazil','Argentina','Chile','Uruguay','Other']
const SPECIES_OPTIONS = [
  { key: 'dairy', label: 'Dairy Cattle' },
  { key: 'beef', label: 'Beef Cattle' },
  { key: 'sheep', label: 'Sheep' },
  { key: 'pig', label: 'Pigs' },
  { key: 'poultry', label: 'Poultry' },
]

const CANCEL_REASONS: Record<string, string> = {
  too_expensive: 'Too expensive for my practice',
  missing_features: 'Missing features I need',
  too_complex: 'Too complex or hard to use',
  switched_competitor: 'Switching to another tool',
  not_enough_clients: 'Not enough farm clients to justify it',
  temporary_pause: 'I need a temporary pause (seasonal)',
  data_quality: 'Ingredient or requirement data quality issues',
  ai_not_useful: 'AI reviews are not useful enough',
  other: 'Other reason',
}

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [tab, setTab] = useState<'profile'|'community'|'preferences'|'subscription'|'disclaimer'|'integrations'|'account'>('profile')

  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [country, setCountry] = useState('Australia')
  const [species, setSpecies] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [credentials, setCredentials] = useState('')
  const [phone, setPhone] = useState('')

  const [publicProfile, setPublicProfile] = useState(false)
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState<number | null>(null)
  const [specialties, setSpecialties] = useState<string[]>([])

  const [nutritionModel, setNutritionModel] = useState('AFRC')
  const [currency, setCurrency] = useState('AUD')
  const [feedingStandard, setFeedingStandard] = useState('CSIRO')
  const [energyUnit, setEnergyUnit] = useState('MJ')
  const [defaultBatch, setDefaultBatch] = useState('1000')

  const [subscriptionStatus, setSubscriptionStatus] = useState('')
  const [subscriptionPlan, setSubscriptionPlan] = useState('')
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null)
  const [subscriptionStartedAt, setSubscriptionStartedAt] = useState<string | null>(null)

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [disclaimerAcceptedAt, setDisclaimerAcceptedAt] = useState<string | null>(null)

  const [feedflowKey, setFeedflowKey] = useState('')

  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelExplanation, setCancelExplanation] = useState('')
  const [pendingCancellation, setPendingCancellation] = useState<any>(null)

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

    const { data: up } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    if (up) {
      setFullName(up.full_name || ''); setCompany(up.company || ''); setCountry(up.country || 'Australia')
      setSpecies(up.species || []); setAvatarUrl(up.avatar_url || null)
      setNutritionModel(up.nutrition_model || 'AFRC'); setCurrency(up.currency || 'AUD')
      setPublicProfile(up.public_profile || false); setBio(up.bio || '')
      setYearsExperience(up.years_experience); setSpecialties(up.specialties || [])
      setSubscriptionStatus(up.subscription_status || ''); setSubscriptionPlan(up.subscription_plan || '')
      setTrialExpiresAt(up.trial_expires_at || null); setSubscriptionStartedAt(up.subscription_started_at || null)
      setDisclaimerAccepted(up.disclaimer_accepted || false); setDisclaimerAcceptedAt(up.disclaimer_accepted_at || null)
    }

    const { data: cr } = await supabase.from('cancellation_requests').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).single()
    if (cr) setPendingCancellation(cr)

    const { data: np } = await supabase.from('nutritionist_profiles').select('*').eq('id', user.id).single()
    if (np) {
      setBusinessName(np.business_name || ''); setCredentials(np.credentials || ''); setPhone(np.phone || '')
      setFeedingStandard(np.feeding_standard || 'CSIRO'); setEnergyUnit(np.energy_unit || 'MJ')
      setDefaultBatch(String(np.default_batch_kg || 1000))
    }
  }

  function showSaved(key: string) { setSaved(key); setTimeout(() => setSaved(''), 2000) }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return }
    setUploadingAvatar(true)
    const supabase = await getSupabase()
    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${userId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) { alert('Failed to upload'); setUploadingAvatar(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const url = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('user_profiles').update({ avatar_url: url }).eq('id', userId)
    setAvatarUrl(url); setUploadingAvatar(false)
  }

  async function removeAvatar() {
    const supabase = await getSupabase()
    await supabase.from('user_profiles').update({ avatar_url: null }).eq('id', userId)
    setAvatarUrl(null)
  }

  async function handleSaveProfile() {
    setSaving(true); const supabase = await getSupabase()
    await supabase.from('user_profiles').update({ full_name: fullName || null, company: company || null, country: country || null, species }).eq('id', userId)
    await supabase.from('nutritionist_profiles').upsert({ id: userId, business_name: businessName || null, credentials: credentials || null, phone: phone || null })
    setSaving(false); showSaved('profile')
  }

  async function handleSaveCommunity() {
    setSaving(true); const supabase = await getSupabase()
    await supabase.from('user_profiles').update({ public_profile: publicProfile, bio: bio.trim() || null, years_experience: yearsExperience, specialties }).eq('id', userId)
    setSaving(false); showSaved('community')
  }

  async function handleSavePreferences() {
    setSaving(true); const supabase = await getSupabase()
    await supabase.from('user_profiles').update({ nutrition_model: nutritionModel, currency }).eq('id', userId)
    await supabase.from('nutritionist_profiles').upsert({ id: userId, feeding_standard: feedingStandard, energy_unit: energyUnit, default_batch_kg: parseInt(defaultBatch) || 1000 })
    setSaving(false); showSaved('preferences')
  }

  async function handleAcceptDisclaimer() {
    setSaving(true); const supabase = await getSupabase(); const now = new Date().toISOString()
    await supabase.from('user_profiles').update({ disclaimer_accepted: true, disclaimer_accepted_at: now }).eq('id', userId)
    setDisclaimerAccepted(true); setDisclaimerAcceptedAt(now); setSaving(false); showSaved('disclaimer')
  }

  async function handleRevokeDisclaimer() {
    setSaving(true); const supabase = await getSupabase()
    await supabase.from('user_profiles').update({ disclaimer_accepted: false, disclaimer_accepted_at: null }).eq('id', userId)
    setDisclaimerAccepted(false); setDisclaimerAcceptedAt(null); setSaving(false)
  }

  async function handleCancellationRequest() {
    if (!cancelReason) return; setSaving(true); const supabase = await getSupabase()
    await supabase.from('cancellation_requests').insert({ user_id: userId, user_email: email, user_name: fullName, subscription_plan: subscriptionPlan, reason: cancelReason, explanation: cancelExplanation.trim() || null })
    setSaving(false); setShowCancelForm(false); setCancelReason(''); setCancelExplanation(''); loadProfile(); showSaved('cancellation')
  }

  async function handleChangePassword() {
    setPwError('')
    if (newPw.length < 6) { setPwError(t('settings.password_min_6')); return }
    if (newPw !== confirmPw) { setPwError(t('settings.passwords_no_match')); return }
    setSaving(true); const supabase = await getSupabase()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSaving(false)
    if (error) { setPwError(error.message); return }
    setNewPw(''); setConfirmPw(''); showSaved('password')
  }

  async function handleLogout() {
    const supabase = await getSupabase(); await supabase.auth.signOut(); router.push('/login')
  }

  function toggleSpecies(sp: string) { setSpecies(prev => prev.includes(sp) ? prev.filter(s => s !== sp) : [...prev, sp]) }

  function subscriptionLabel() {
    switch (subscriptionStatus) {
      case 'trialing': return { text: t('settings.free_trial'), color: 'bg-status-amber/15 text-status-amber' }
      case 'subscribed_trialing': return { text: t('settings.subscribed_trial'), color: 'bg-brand/15 text-brand' }
      case 'active': return { text: t('settings.active'), color: 'bg-brand/15 text-brand' }
      case 'past_due': return { text: t('settings.past_due'), color: 'bg-status-red/15 text-status-red' }
      case 'cancelled': return { text: t('settings.cancelled'), color: 'bg-status-red/10 text-text-ghost' }
      case 'trial_expired': return { text: t('settings.trial_expired'), color: 'bg-status-red/15 text-status-red' }
      default: return { text: subscriptionStatus || '—', color: 'bg-white/10 text-text-muted' }
    }
  }

  function SaveBtn({ section }: { section: string }) {
    return (
      <button onClick={() => { if (section === 'profile') handleSaveProfile(); else if (section === 'community') handleSaveCommunity(); else if (section === 'preferences') handleSavePreferences() }} disabled={saving} className={`btn btn-primary btn-sm ${saved === section ? 'bg-brand/50' : ''}`}>
        {saving ? t('common.saving') : saved === section ? <><Check size={14} /> {t('common.saved')}</> : <><Save size={14} /> {t('common.save')}</>}
      </button>
    )
  }

  const tabs = [
    { key: 'profile' as const, label: t('settings.profile'), icon: User },
    { key: 'community' as const, label: t('community.title'), icon: Globe },
    { key: 'preferences' as const, label: t('settings.preferences'), icon: Sliders },
    { key: 'subscription' as const, label: t('settings.subscription'), icon: CreditCard },
    { key: 'disclaimer' as const, label: t('settings.disclaimer'), icon: Shield },
    { key: 'integrations' as const, label: t('settings.integrations'), icon: Link2 },
    { key: 'account' as const, label: t('settings.account'), icon: Key },
  ]

  const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div className="p-7 max-w-[960px]">
      <h1 className="text-2xl font-bold text-text mb-5">{t('settings.title')}</h1>

      <div className="grid grid-cols-[200px_1fr] gap-5">
        <div className="flex flex-col gap-1">
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left border-none cursor-pointer
                ${tab === tb.key ? 'bg-brand/10 text-brand' : 'text-text-faint hover:bg-white/5 bg-transparent'}`}>
              <tb.icon size={16} /> {tb.label}
              {tb.key === 'disclaimer' && !disclaimerAccepted && <span className="ml-auto w-2 h-2 rounded-full bg-status-amber" />}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-status-red hover:bg-status-red/5 transition-all text-left border-none cursor-pointer bg-transparent mt-4">
            <LogOut size={16} /> {t('settings.sign_out')}
          </button>
        </div>

        <div>
          {/* PROFILE */}
          {tab === 'profile' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">{t('settings.profile')}</h2>
                  <p className="text-sm text-text-faint">{t('settings.profile_desc')}</p>
                </div>
                <SaveBtn section="profile" />
              </div>

              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-border">
                <div className="relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-brand/15 flex items-center justify-center text-2xl font-bold text-brand border-2 border-border">{initials}</div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border-none">
                    <Camera size={20} className="text-white" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-dim mb-1">{fullName || t('settings.your_name')}</div>
                  <div className="text-xs text-text-ghost mb-2">{email}</div>
                  <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="btn btn-ghost btn-sm text-xs">
                      {uploadingAvatar ? t('common.saving') : <><Upload size={12} /> {t('settings.upload_photo')}</>}
                    </button>
                    {avatarUrl && <button onClick={removeAvatar} className="btn btn-ghost btn-sm text-xs text-status-red"><X size={12} /> {t('common.delete')}</button>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.name')}</label><input value={fullName} onChange={e => setFullName(e.target.value)} className="input" /></div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">Credentials</label><input value={credentials} onChange={e => setCredentials(e.target.value)} className="input" placeholder="BAnimSc, PhD" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.company')}</label><input value={company} onChange={e => setCompany(e.target.value)} className="input" /></div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.business_name')}</label><input value={businessName} onChange={e => setBusinessName(e.target.value)} className="input" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.email')}</label><input value={email} disabled className="input opacity-60" /></div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.phone')}</label><input value={phone} onChange={e => setPhone(e.target.value)} className="input" /></div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.country')}</label>
                    <select value={country} onChange={e => setCountry(e.target.value)} className="input">{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1.5">{t('common.species')}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIES_OPTIONS.map(sp => (
                      <button key={sp.key} type="button" onClick={() => toggleSpecies(sp.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${species.includes(sp.key) ? 'bg-brand text-white border-brand' : 'bg-surface-deep text-text-muted border-border hover:border-brand/30'}`}>
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMMUNITY */}
          {tab === 'community' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">{t('settings.community_profile')}</h2>
                  <p className="text-sm text-text-faint">{t('settings.community_profile_desc')}</p>
                </div>
                <SaveBtn section="community" />
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-bg rounded-lg border border-border mb-5">
                <div className="flex items-center gap-3">
                  <Globe size={18} className={publicProfile ? 'text-brand' : 'text-text-ghost'} />
                  <div>
                    <div className="text-sm font-bold text-text-dim">{t('community.your_public_profile')}</div>
                    <div className="text-2xs text-text-ghost">{publicProfile ? t('community.visible_to_users') : t('community.hidden_profile')}</div>
                  </div>
                </div>
                <button onClick={() => setPublicProfile(!publicProfile)} className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer border-none ${publicProfile ? 'bg-brand' : 'bg-surface-deep border border-border'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${publicProfile ? 'left-[26px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} className="input" rows={3} />
                  <p className="text-2xs text-text-ghost mt-1">{bio.length}/300</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.years_experience')}</label><input type="number" value={yearsExperience ?? ''} onChange={e => setYearsExperience(e.target.value ? parseInt(e.target.value) : null)} className="input" min="0" max="60" /></div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.specialties')}</label><input value={specialties.join(', ')} onChange={e => setSpecialties(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="input" /></div>
                </div>
              </div>
              {publicProfile && (
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">{t('settings.profile_preview')}</div>
                  <div className="card p-4 flex items-start gap-3">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-sm font-bold text-brand">{initials}</div>}
                    <div className="flex-1">
                      <div className="text-sm font-bold text-text-dim">{fullName || t('settings.your_name')}</div>
                      <div className="text-2xs text-text-ghost">{company || '—'} · {country}</div>
                      {bio && <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{bio}</p>}
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {species.map(sp => <span key={sp} className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold">{SPECIES_OPTIONS.find(s => s.key === sp)?.label || sp}</span>)}
                        {yearsExperience && <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-bg text-text-ghost font-mono">{yearsExperience}y exp</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PREFERENCES */}
          {tab === 'preferences' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text">{t('settings.preferences')}</h2>
                  <p className="text-sm text-text-faint">{t('settings.preferences_desc')}</p>
                </div>
                <SaveBtn section="preferences" />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.nutrition_model')}</label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { key: 'AFRC', name: 'AFRC / CSIRO', region: 'Australia, NZ, UK', desc: 'ME-based energy, UDP/RDP protein.' },
                      { key: 'NRC', name: 'NRC 2001', region: 'USA, Canada', desc: 'NEL/TDN energy, RUP/RDP protein.' },
                      { key: 'CNCPS', name: 'CNCPS v6', region: 'Research / global', desc: 'Advanced protein and carbohydrate fractions.' },
                    ].map(m => (
                      <div key={m.key} onClick={() => setNutritionModel(m.key)} className={`p-2.5 rounded-lg border cursor-pointer transition-all ${nutritionModel === m.key ? 'border-brand bg-brand/5' : 'border-border hover:border-border-light bg-surface-bg'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${nutritionModel === m.key ? 'border-brand' : 'border-border'}`}>{nutritionModel === m.key && <div className="w-2 h-2 rounded-full bg-brand" />}</div>
                          <span className="text-sm font-bold text-text">{m.name}</span><span className="text-2xs text-text-ghost">{m.region}</span>
                        </div>
                        <p className="text-2xs text-text-muted ml-6">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.feeding_standard')}</label>
                  <select value={feedingStandard} onChange={e => setFeedingStandard(e.target.value)} className="input">
                    <option value="CSIRO">CSIRO — Feeding Standards for Australian Livestock</option>
                    <option value="NRC">NRC — Nutrient Requirements of Domestic Animals (USA)</option>
                    <option value="INRA">INRA — European Feeding Standards</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.currency')}</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="input">{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select>
                  </div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.energy_units')}</label>
                    <select value={energyUnit} onChange={e => setEnergyUnit(e.target.value)} className="input"><option value="MJ">MJ/kg</option><option value="Mcal">Mcal/kg</option></select>
                  </div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.default_batch')}</label>
                    <div className="flex items-center gap-2"><input type="number" value={defaultBatch} onChange={e => setDefaultBatch(e.target.value)} className="input" min="100" step="100" /><span className="text-xs text-text-ghost">kg</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUBSCRIPTION */}
          {tab === 'subscription' && (
            <div className="flex flex-col gap-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-text mb-1">{t('settings.subscription')}</h2>
                <p className="text-sm text-text-faint mb-5">{t('settings.subscription_desc')}</p>
                <div className="p-4 bg-surface-bg rounded-lg border border-border mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-base font-bold text-text-dim capitalize">{subscriptionPlan || t('settings.free_trial')}</div>
                      <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase ${subscriptionLabel().color}`}>{subscriptionLabel().text}</span>
                    </div>
                    {(subscriptionStatus === 'trialing' || subscriptionStatus === 'trial_expired') && (
                      <button onClick={() => router.push('/subscribe')} className="btn btn-primary btn-sm"><CreditCard size={14} /> {t('settings.subscribe_now')}</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {trialExpiresAt && <div><span className="text-text-ghost">{t('settings.trial_expires')}:</span><span className="ml-2 text-text-dim font-semibold">{new Date(trialExpiresAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
                    {subscriptionStartedAt && <div><span className="text-text-ghost">{t('settings.subscribed_since')}:</span><span className="ml-2 text-text-dim font-semibold">{new Date(subscriptionStartedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
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
                      <div className="mt-2 flex flex-col gap-1">{p.features.map((f, i) => (<div key={i} className="text-2xs text-text-muted flex items-center gap-1"><CheckCircle size={10} className="text-brand" /> {f}</div>))}</div>
                    </div>
                  ))}
                </div>
              </div>

              {(subscriptionStatus === 'active' || subscriptionStatus === 'subscribed_trialing') && (
                <div className="card p-6 border-border">
                  <h2 className="text-lg font-bold text-text mb-1">{t('settings.cancel_subscription')}</h2>
                  <p className="text-sm text-text-faint mb-4">{t('settings.cancel_desc')}</p>
                  {pendingCancellation ? (
                    <div className="p-4 bg-status-amber/5 rounded-lg border border-status-amber/20">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-status-amber flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-bold text-text-dim mb-1">{t('settings.cancellation_submitted')}</div>
                          <p className="text-xs text-text-muted mb-2">{new Date(pendingCancellation.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p className="text-xs text-text-muted mb-2"><strong className="text-text-dim">{t('settings.reason')}:</strong> {CANCEL_REASONS[pendingCancellation.reason] || pendingCancellation.reason}</p>
                          {pendingCancellation.explanation && <p className="text-xs text-text-muted mb-2"><strong className="text-text-dim">{t('settings.details')}:</strong> {pendingCancellation.explanation}</p>}
                          <p className="text-xs text-text-ghost">{t('settings.team_will_contact')}</p>
                        </div>
                      </div>
                    </div>
                  ) : !showCancelForm ? (
                    <button onClick={() => setShowCancelForm(true)} className="btn btn-ghost btn-sm text-status-red border border-status-red/20 hover:bg-status-red/5">{t('settings.request_cancellation')}</button>
                  ) : (
                    <div className="p-5 bg-surface-bg rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-bold text-text-dim">{t('settings.tell_us_why')}</div>
                        <button onClick={() => setShowCancelForm(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={16} /></button>
                      </div>
                      <div className="flex flex-col gap-2 mb-4">
                        {Object.entries(CANCEL_REASONS).map(([value, label]) => (
                          <label key={value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${cancelReason === value ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/20'}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${cancelReason === value ? 'border-brand' : 'border-border'}`}>{cancelReason === value && <div className="w-2 h-2 rounded-full bg-brand" />}</div>
                            <input type="radio" name="cancel_reason" value={value} checked={cancelReason === value} onChange={() => setCancelReason(value)} className="hidden" />
                            <span className="text-sm text-text-dim">{label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mb-4"><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.notes')}</label><textarea value={cancelExplanation} onChange={e => setCancelExplanation(e.target.value)} className="input" rows={3} /></div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowCancelForm(false)} className="btn btn-ghost flex-1 justify-center">{t('settings.keep_subscription')}</button>
                        <button onClick={handleCancellationRequest} disabled={saving || !cancelReason} className="btn btn-sm flex-1 justify-center bg-status-red text-white border-none hover:bg-status-red/80 cursor-pointer disabled:opacity-50">{saving ? t('common.saving') : t('settings.submit_cancellation')}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DISCLAIMER */}
          {tab === 'disclaimer' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-text">{t('settings.disclaimer')}</h2>
                  <p className="text-sm text-text-faint">{t('settings.disclaimer_desc')}</p>
                </div>
                {disclaimerAccepted ? (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-brand"><CheckCircle size={16} /> {t('settings.accepted')}</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-status-amber"><AlertTriangle size={16} /> {t('settings.not_accepted')}</span>
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
                <p className="mb-3">Optia Feed, its developers, Agrometrics, and affiliated entities accept no liability for animal health outcomes, production losses, regulatory non-compliance, or financial consequences.</p>
                <p>Nutritional models (AFRC, NRC, CNCPS) reference published scientific standards but may not reflect the most recent updates.</p>
              </div>
              {disclaimerAccepted ? (
                <div className="flex items-center justify-between p-3 bg-brand/5 rounded-lg border border-brand/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-brand" />
                    <span className="text-sm text-text-dim">{t('settings.accepted_on')} {disclaimerAcceptedAt ? new Date(disclaimerAcceptedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                  </div>
                  <button onClick={handleRevokeDisclaimer} disabled={saving} className="btn btn-ghost btn-sm text-xs text-status-red">{t('settings.revoke')}</button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 p-3 mb-3 bg-status-amber/5 rounded-lg border border-status-amber/20">
                    <AlertTriangle size={14} className="text-status-amber flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-muted">{t('settings.disclaimer_warning')}</p>
                  </div>
                  <button onClick={handleAcceptDisclaimer} disabled={saving} className="btn btn-primary">
                    {saving ? t('common.saving') : <><Shield size={14} /> {t('settings.accept_disclaimer')}</>}
                  </button>
                </>
              )}
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
                <p className="text-xs text-text-ghost">{t('settings.ai_configured')}</p>
              </div>
            </div>
          )}

          {/* ACCOUNT */}
          {tab === 'account' && (
            <div className="flex flex-col gap-4">
              <div className="card p-6">
                <h2 className="text-lg font-bold text-text mb-1">{t('settings.change_password')}</h2>
                <p className="text-sm text-text-faint mb-4">{t('settings.change_password_desc')}</p>
                <div className="flex flex-col gap-3">
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.new_password')}</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="input" /></div>
                  <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('settings.confirm_password')}</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="input" /></div>
                  {pwError && <p className="text-sm text-status-red bg-status-red/10 rounded px-3 py-2">{pwError}</p>}
                  <button onClick={handleChangePassword} disabled={saving || !newPw} className="btn btn-primary btn-sm w-fit disabled:opacity-50">
                    {saving ? t('common.saving') : saved === 'password' ? <><Check size={14} /> {t('common.saved')}</> : t('settings.update_password')}
                  </button>
                </div>
              </div>
              <div className="card p-6 border-status-red/20">
                <h2 className="text-lg font-bold text-status-red mb-1">{t('settings.danger_zone')}</h2>
                <p className="text-sm text-text-faint mb-4">{t('settings.danger_zone_desc')}</p>
                <button onClick={handleLogout} className="btn btn-sm bg-status-red text-white border-none hover:bg-status-red/80 cursor-pointer">
                  <LogOut size={14} /> {t('settings.sign_out')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
