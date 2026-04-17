'use client'

import { useState, useEffect } from 'react'
import { Shield, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Requirement { nutrient: string; unit: string; min: number|null; max: number|null; target: number; critical_max?: number|null; critical_min?: number|null }
interface Ratio { name: string; min: number; max: number; target: number; unit?: string }
interface StageData { id: string; species: string; production_stage: string; stage_name: string; stage_description: string; requirements: Requirement[]; ratios: Ratio[] }
interface SafetyRule { id: string; species: string; severity: string; title: string; description: string; detail: string; ingredient_name: string|null }

const SPECIES_KEYS = [
  { key: 'cattle', tKey: 'animals.dairy_cattle', emoji: '🐄', color: '#4CAF7D' },
  { key: 'beef', tKey: 'animals.beef_cattle', emoji: '🐂', color: '#8B6914' },
  { key: 'pig', tKey: 'animals.pigs', emoji: '🐷', color: '#E88B6E' },
  { key: 'poultry', tKey: 'animals.poultry', emoji: '🐔', color: '#D4A843' },
  { key: 'sheep', tKey: 'animals.sheep', emoji: '🐑', color: '#7BA0C4' },
]

export default function AnimalsPage() {
  const { t } = useTranslation()
  const [species, setSpecies] = useState('beef')
  const [stages, setStages] = useState<StageData[]>([])
  const [selectedStage, setSelectedStage] = useState<StageData|null>(null)
  const [rules, setRules] = useState<SafetyRule[]>([])
  const [tab, setTab] = useState<'requirements'|'safety'|'overview'>('requirements')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadSpecies(species) }, [species])

  async function loadSpecies(sp: string) {
    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: reqs } = await supabase
      .from('animal_requirements')
      .select('*')
      .eq('species', sp)
      .is('nutritionist_id', null)
      .order('production_stage')
    const { data: safetyRules } = await supabase
      .from('safety_rules')
      .select('*')
      .eq('species', sp)
      .is('nutritionist_id', null)
      .eq('active', true)
      .order('severity')
    setStages(reqs || [])
    setRules(safetyRules || [])
    setSelectedStage(reqs?.[0] || null)
    setLoading(false)
  }

  const dangerCount = rules.filter(r => r.severity === 'danger').length
  const spData = SPECIES_KEYS.find(s => s.key === species)

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">{t('animals.title')}</h1>
        <p className="text-base text-text-faint mt-1">{t('animals.subtitle')}</p>
      </div>

      {/* Species Cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {SPECIES_KEYS.map((s) => (
          <div
            key={s.key}
            onClick={() => { setSpecies(s.key); setTab('requirements') }}
            className={`bg-surface-card rounded-lg p-4 border-2 cursor-pointer transition-all relative overflow-hidden
              ${species === s.key ? 'border-brand' : 'border-border hover:border-white/10'}`}
          >
            {species === s.key && <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ background: s.color }} />}
            <div className="text-2xl mb-2">{s.emoji}</div>
            <div className="text-sm font-bold text-text-dim">{t(s.tKey)}</div>
            <div className="text-2xs text-text-ghost mt-0.5">
              {species === s.key && !loading ? `${stages.length} ${t('animals.stages')} · ${rules.length} ${t('animals.rules')}` : t('animals.click_to_view')}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-5">
        <button onClick={() => setTab('requirements')} className={`px-4 py-2 rounded text-sm font-semibold transition-all ${tab==='requirements'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}>
          {t('animals.nutritional_requirements')}
        </button>
        <button onClick={() => setTab('safety')} className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-1.5 ${tab==='safety'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}>
          <Shield size={14} /> {t('animals.safety_rules')}
          {dangerCount > 0 && <span className="text-2xs px-1.5 py-0.5 rounded-full bg-status-red/20 text-status-red font-mono font-bold">{rules.length}</span>}
        </button>
        <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded text-sm font-semibold transition-all ${tab==='overview'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}>
          {t('animals.overview')}
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-sm text-text-ghost">{t('common.loading')}</div>
      ) : (
        <>
          {/* REQUIREMENTS TAB */}
          {tab === 'requirements' && (
            <>
              {/* Stage selector */}
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">{t('animals.production_stage')}<span className="flex-1 h-px bg-border" /></div>
              <div className="grid grid-cols-4 gap-2.5 mb-6">
                {stages.map((s) => (
                  <div key={s.id} onClick={() => setSelectedStage(s)}
                    className={`bg-surface-card rounded-lg p-3 border cursor-pointer transition-all
                      ${selectedStage?.id === s.id ? 'border-brand bg-brand/5' : 'border-border hover:border-white/10'}`}>
                    <div className="text-sm font-bold text-text-dim">{s.stage_name}</div>
                    <div className="text-2xs text-text-ghost mt-0.5 line-clamp-2">{s.stage_description?.replace('DAIRY | ','')}</div>
                  </div>
                ))}
              </div>

              {selectedStage && (
                <>
                  {/* Requirements table */}
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    {t('animals.nutrient_requirements')} — {selectedStage.stage_name}<span className="flex-1 h-px bg-border" />
                  </div>
                  <div className="card mb-5">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-2.5 text-left text-2xs font-bold text-text-ghost uppercase tracking-wider" style={{width:'30%'}}>{t('animals.nutrient')}</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">{t('animals.unit')}</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">{t('animals.min')}</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">{t('animals.target')}</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">{t('animals.max')}</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">{t('animals.critical')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStage.requirements.map((r, i) => (
                          <tr key={i} className="border-b border-border/5 hover:bg-[#253442]">
                            <td className="px-4 py-2 text-sm font-semibold text-text-dim">{r.nutrient}</td>
                            <td className="px-3 py-2 text-center text-sm text-text-ghost">{r.unit}</td>
                            <td className="px-3 py-2 text-center text-sm font-mono text-status-blue">{r.min ?? '—'}</td>
                            <td className="px-3 py-2 text-center text-sm font-mono text-brand font-bold">{r.target}</td>
                            <td className="px-3 py-2 text-center text-sm font-mono text-status-coral">{r.max ?? '—'}</td>
                            <td className="px-3 py-2 text-center text-sm font-mono">
                              {r.critical_max != null ? <span className="text-status-red font-bold">&gt;{r.critical_max}</span> :
                               r.critical_min != null ? <span className="text-status-red font-bold">&lt;{r.critical_min}</span> :
                               <span className="text-text-ghost">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Ratios */}
                  {selectedStage.ratios && selectedStage.ratios.length > 0 && (
                    <>
                      <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        {t('animals.key_ratios')}<span className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {selectedStage.ratios.map((r, i) => (
                          <div key={i} className="card p-4">
                            <div className="text-xs text-text-ghost font-semibold uppercase tracking-wider mb-1">{r.name}{r.unit ? ` (${r.unit})` : ''}</div>
                            <div className="flex items-baseline gap-3">
                              <span className="text-2xl font-bold font-mono text-brand">{r.target}</span>
                              <span className="text-xs font-mono text-text-ghost">{t('animals.range')}: {r.min} – {r.max}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Quick compare */}
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    {t('animals.stage_comparison')}<span className="flex-1 h-px bg-border" />
                  </div>
                  <div className="card">
                    <table className="w-full border-collapse">
                      <thead><tr className="border-b border-border">
                        <th className="px-4 py-2.5 text-left text-2xs font-bold text-text-ghost uppercase">{t('animals.production_stage')}</th>
                        <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">CP %</th>
                        <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">Energy</th>
                        <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">Ca %</th>
                        <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">P %</th>
                      </tr></thead>
                      <tbody>
                        {stages.map((s) => {
                          const cp = s.requirements.find(r => r.nutrient.includes('Protein'))
                          const me = s.requirements.find(r => r.nutrient.includes('Energy') || r.nutrient.includes('ME') || r.nutrient.includes('DE'))
                          const ca = s.requirements.find(r => r.nutrient.includes('Calcium'))
                          const p = s.requirements.find(r => r.nutrient.includes('Phosphorus') || r.nutrient === 'Available P')
                          return (
                            <tr key={s.id} onClick={() => setSelectedStage(s)}
                              className={`border-b border-border/5 cursor-pointer hover:bg-[#253442] ${selectedStage?.id===s.id?'bg-brand/5':''}`}>
                              <td className={`px-4 py-2 text-sm font-semibold ${selectedStage?.id===s.id?'text-brand':'text-text-dim'}`}>{s.stage_name}</td>
                              <td className="px-3 py-2 text-center text-sm font-mono text-text-dim">{cp ? `${cp.min}–${cp.max}` : '—'}</td>
                              <td className="px-3 py-2 text-center text-sm font-mono text-text-dim">{me ? `${me.target} ${me.unit}` : '—'}</td>
                              <td className="px-3 py-2 text-center text-sm font-mono text-text-dim">{ca?.target ?? '—'}</td>
                              <td className="px-3 py-2 text-center text-sm font-mono text-text-dim">{p?.target ?? '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {/* SAFETY TAB */}
          {tab === 'safety' && (
            <>
              {['danger','warning','info'].map((sev) => {
                const filtered = rules.filter(r => r.severity === sev)
                if (!filtered.length) return null
                const label = sev === 'danger' ? `🚫 ${t('animals.critical_do_not_exceed')}` : sev === 'warning' ? `⚠️ ${t('animals.warnings_monitor')}` : `ℹ️ ${t('animals.guidelines_best_practice')}`
                const color = sev === 'danger' ? 'text-status-red' : sev === 'warning' ? 'text-status-amber' : 'text-status-blue'
                return (
                  <div key={sev} className="mb-5">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${color}`}>
                      {label}<span className="flex-1 h-px bg-border" />
                    </div>
                    {filtered.map((r) => (
                      <div key={r.id} className={`bg-surface-card rounded-lg border border-border p-4 mb-2.5
                        ${sev==='danger'?'border-l-[3px] border-l-status-red':sev==='warning'?'border-l-[3px] border-l-status-amber':'border-l-[3px] border-l-status-blue'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase
                            ${sev==='danger'?'bg-status-red/15 text-status-red':sev==='warning'?'bg-status-amber/15 text-status-amber':'bg-status-blue/15 text-status-blue'}`}>{sev}</span>
                          <span className="text-sm font-bold text-text-dim">{r.title}</span>
                          {r.ingredient_name && <span className="ml-auto text-2xs px-1.5 py-0.5 rounded bg-white/5 text-text-muted font-mono">{r.ingredient_name}</span>}
                        </div>
                        <p className="text-sm text-text-muted leading-relaxed mb-2">{r.description}</p>
                        <div className="text-xs font-mono text-text-ghost bg-surface-bg rounded-md px-3 py-2">{r.detail}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-4 gap-3.5 mb-6">
                {[
                  {l:t('animals.production_stages'),v:stages.length,c:spData?.color||'#4CAF7D'},
                  {l:t('animals.nutrient_parameters'),v:stages.reduce((s,st) => s+st.requirements.length, 0),c:spData?.color||'#4CAF7D'},
                  {l:t('animals.safety_rules'),v:rules.length,c:spData?.color||'#4CAF7D'},
                  {l:t('animals.critical_rules'),v:dangerCount,c:'#E05252'},
                ].map((s,i) => (
                  <div key={i} className="stat-card">
                    <div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.l}</div>
                    <div className="text-2xl font-bold font-mono" style={{color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                {t('animals.all_stages')} — {spData ? t(spData.tKey) : ''}<span className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {stages.map((s) => (
                  <div key={s.id} className="card p-4 cursor-pointer hover:border-brand/25 transition-colors"
                    onClick={() => { setSelectedStage(s); setTab('requirements') }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-text-dim">{s.stage_name}</span>
                      <span className="text-2xs text-text-ghost font-mono">{s.requirements.length} {t('animals.nutrients')}</span>
                    </div>
                    <p className="text-xs text-text-faint mb-2 line-clamp-2">{s.stage_description?.replace('DAIRY | ','')}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {s.requirements.slice(0,3).map((r,i) => (
                        <span key={i} className="text-2xs px-2 py-0.5 rounded bg-surface-bg text-text-muted font-mono">
                          {r.nutrient.split('(')[0].trim().split(' ').slice(0,2).join(' ')}: {r.target}{r.unit}
                        </span>
                      ))}
                      {s.requirements.length > 3 && <span className="text-2xs px-2 py-0.5 rounded bg-surface-bg text-text-ghost">+{s.requirements.length-3}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card p-4">
                <p className="text-sm text-text-muted leading-relaxed">{t('animals.requirements_source')}</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
