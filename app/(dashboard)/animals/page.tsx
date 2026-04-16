'use client'

import { useState, useEffect } from 'react'
import { Shield, ChevronRight } from 'lucide-react'

interface Requirement { nutrient: string; unit: string; min: number|null; max: number|null; target: number; critical_max?: number|null; critical_min?: number|null }
interface Ratio { name: string; min: number; max: number; target: number; unit?: string }
interface StageData { id: string; species: string; production_stage: string; stage_name: string; stage_description: string; requirements: Requirement[]; ratios: Ratio[] }
interface SafetyRule { id: string; species: string; severity: string; title: string; description: string; detail: string; ingredient_name: string|null }

const SPECIES_LIST = [
  { key: 'cattle', name: 'Dairy Cattle', emoji: '🐄', color: '#4CAF7D' },
  { key: 'beef', name: 'Beef Cattle', emoji: '🐂', color: '#8B6914' },
  { key: 'pig', name: 'Pigs', emoji: '🐷', color: '#E88B6E' },
  { key: 'poultry', name: 'Poultry', emoji: '🐔', color: '#D4A843' },
  { key: 'sheep', name: 'Sheep', emoji: '🐑', color: '#7BA0C4' },
]

export default function AnimalsPage() {
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
  const spData = SPECIES_LIST.find(s => s.key === species)

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Animals & Requirements</h1>
        <p className="text-base text-text-faint mt-1">Species profiles, production stages, nutritional requirements and safety rules</p>
      </div>

      {/* Species Cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {SPECIES_LIST.map((s) => (
          <div
            key={s.key}
            onClick={() => { setSpecies(s.key); setTab('requirements') }}
            className={`bg-surface-card rounded-lg p-4 border-2 cursor-pointer transition-all relative overflow-hidden
              ${species === s.key ? 'border-brand' : 'border-border hover:border-white/10'}`}
          >
            {species === s.key && <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-lg" style={{ background: s.color }} />}
            <div className="text-2xl mb-2">{s.emoji}</div>
            <div className="text-sm font-bold text-text-dim">{s.name}</div>
            <div className="text-2xs text-text-ghost mt-0.5">
              {species === s.key && !loading ? `${stages.length} stages · ${rules.length} rules` : 'Click to view'}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-5">
        <button onClick={() => setTab('requirements')} className={`px-4 py-2 rounded text-sm font-semibold transition-all ${tab==='requirements'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}>
          Nutritional Requirements
        </button>
        <button onClick={() => setTab('safety')} className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-1.5 ${tab==='safety'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}>
          <Shield size={14} /> Safety Rules
          {dangerCount > 0 && <span className="text-2xs px-1.5 py-0.5 rounded-full bg-status-red/20 text-status-red font-mono font-bold">{rules.length}</span>}
        </button>
        <button onClick={() => setTab('overview')} className={`px-4 py-2 rounded text-sm font-semibold transition-all ${tab==='overview'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}>
          Overview
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-sm text-text-ghost">Loading {spData?.name} data...</div>
      ) : (
        <>
          {/* REQUIREMENTS TAB */}
          {tab === 'requirements' && (
            <>
              {/* Stage selector */}
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">Production Stage<span className="flex-1 h-px bg-border" /></div>
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
                    Nutrient Requirements — {selectedStage.stage_name}<span className="flex-1 h-px bg-border" />
                  </div>
                  <div className="card mb-5">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-2.5 text-left text-2xs font-bold text-text-ghost uppercase tracking-wider" style={{width:'30%'}}>Nutrient</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">Unit</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">Min</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">Target</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">Max</th>
                          <th className="px-3 py-2.5 text-center text-2xs font-bold text-text-ghost uppercase">Critical</th>
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
                        Key Ratios<span className="flex-1 h-px bg-border" />
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {selectedStage.ratios.map((r, i) => (
                          <div key={i} className="card p-4">
                            <div className="text-xs text-text-ghost font-semibold uppercase tracking-wider mb-1">{r.name}{r.unit ? ` (${r.unit})` : ''}</div>
                            <div className="flex items-baseline gap-3">
                              <span className="text-2xl font-bold font-mono text-brand">{r.target}</span>
                              <span className="text-xs font-mono text-text-ghost">range: {r.min} – {r.max}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Quick compare */}
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    Stage Comparison<span className="flex-1 h-px bg-border" />
                  </div>
                  <div className="card">
                    <table className="w-full border-collapse">
                      <thead><tr className="border-b border-border">
                        <th className="px-4 py-2.5 text-left text-2xs font-bold text-text-ghost uppercase">Stage</th>
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
                const label = sev === 'danger' ? '🚫 Critical — Do Not Exceed' : sev === 'warning' ? '⚠️ Warnings — Monitor Closely' : 'ℹ️ Guidelines — Best Practice'
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
                  {l:'Production Stages',v:stages.length,c:spData?.color||'#4CAF7D'},
                  {l:'Nutrient Parameters',v:stages.reduce((s,st) => s+st.requirements.length, 0),c:spData?.color||'#4CAF7D'},
                  {l:'Safety Rules',v:rules.length,c:spData?.color||'#4CAF7D'},
                  {l:'Critical Rules',v:dangerCount,c:'#E05252'},
                ].map((s,i) => (
                  <div key={i} className="stat-card">
                    <div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.l}</div>
                    <div className="text-2xl font-bold font-mono" style={{color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                All Stages — {spData?.name}<span className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {stages.map((s) => (
                  <div key={s.id} className="card p-4 cursor-pointer hover:border-brand/25 transition-colors"
                    onClick={() => { setSelectedStage(s); setTab('requirements') }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-text-dim">{s.stage_name}</span>
                      <span className="text-2xs text-text-ghost font-mono">{s.requirements.length} nutrients</span>
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
                <p className="text-sm text-text-muted leading-relaxed">
                  Requirements based on <strong className="text-text-dim">CSIRO Feeding Standards for Australian Livestock</strong> and <strong className="text-text-dim">NRC Nutrient Requirements</strong>. Values represent typical ranges — adjust based on genetics, environment, and production targets.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
