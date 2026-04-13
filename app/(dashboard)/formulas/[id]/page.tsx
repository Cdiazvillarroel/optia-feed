'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Sparkles, FileText, Save, Lock, Unlock, X, Trash2, Search } from 'lucide-react'

interface FormulaIng { id: string; ingredient_id: string; inclusion_pct: number; locked: boolean; ingredient: any }
interface Req { nutrient: string; unit: string; min: number|null; max: number|null; target: number; critical_max?: number|null; critical_min?: number|null }
interface Ratio { name: string; min: number; max: number; target: number; unit?: string }

export default function FormulaBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const [formula, setFormula] = useState<any>(null)
  const [ings, setIngs] = useState<FormulaIng[]>([])
  const [allIngredients, setAllIngredients] = useState<any[]>([])
  const [requirements, setRequirements] = useState<Req[]>([])
  const [ratios, setRatios] = useState<Ratio[]>([])
  const [stageName, setStageName] = useState('')
  const [prices, setPrices] = useState<Record<string,number>>({})
  const [rightTab, setRightTab] = useState<'balance'|'nutrients'|'cost'>('balance')
  const [showAddIng, setShowAddIng] = useState(false)
  const [ingSearch, setIngSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadFormula() }, [params.id])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadFormula() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    // Formula
    const { data: f } = await supabase.from('formulas').select('*, client:nutrition_clients(id, name, location)').eq('id', params.id).single()
    if (!f) { router.push('/formulas'); return }
    setFormula(f)
    // Formula ingredients
    const { data: fi } = await supabase.from('formula_ingredients').select('*, ingredient:ingredients(*)').eq('formula_id', params.id)
    setIngs(fi || [])
    // All ingredients for adding
    const { data: allIng } = await supabase.from('ingredients').select('*').or(`nutritionist_id.is.null${user?',nutritionist_id.eq.'+user.id:''}`).order('name')
    setAllIngredients(allIng || [])
    // Requirements
    const { data: req } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).is('nutritionist_id', null).limit(1).single()
    if (req) {
      setRequirements(req.requirements || [])
      setRatios(req.ratios || [])
      setStageName(req.stage_name || f.production_stage)
    }
    // Prices
    if (user) {
      const { data: pr } = await supabase.from('ingredient_prices').select('ingredient_id, price_per_tonne').eq('nutritionist_id', user.id).order('effective_date', { ascending: false })
      const pm: Record<string,number> = {}
      pr?.forEach((p: any) => { if (!pm[p.ingredient_id]) pm[p.ingredient_id] = p.price_per_tonne })
      setPrices(pm)
    }
  }

  // Calculations
  const totalPct = ings.reduce((s, fi) => s + (fi.inclusion_pct || 0), 0)

  function calcNutrient(key: string): number {
    return ings.reduce((s, fi) => {
      const v = fi.ingredient?.[key] || 0
      return s + v * (fi.inclusion_pct || 0) / 100
    }, 0)
  }

  const costPerTonne = ings.reduce((s, fi) => {
    const price = prices[fi.ingredient_id] || 0
    return s + price * (fi.inclusion_pct || 0) / 100
  }, 0)

  function findReqValue(short: string): Req | undefined {
    return requirements.find(r => {
      const n = r.nutrient.toLowerCase()
      if (short === 'cp') return n.includes('crude protein') || n.includes(' cp')
      if (short === 'me') return n.includes('energy') || n.includes(' me ') || n.includes(' de ')
      if (short === 'ndf') return n.includes('ndf') || n.includes('neutral detergent')
      if (short === 'adf') return n.includes('adf')
      if (short === 'ee') return n.includes('fat') || n.includes('ether extract') || n.includes(' ee')
      if (short === 'ca') return n.includes('calcium')
      if (short === 'p') return n.includes('phosphorus') || n.includes('available p')
      if (short === 's') return n.includes('sulphur')
      if (short === 'lys') return n.includes('lysine')
      if (short === 'met') return n.includes('methionine') || n.includes('meth+cyst')
      return false
    })
  }

  const nutrients = [
    { key: 'cp_pct', short: 'cp', label: 'CP', unit: '%' },
    { key: 'me_mj', short: 'me', label: 'ME', unit: ' MJ' },
    { key: 'ndf_pct', short: 'ndf', label: 'NDF', unit: '%' },
    { key: 'ee_pct', short: 'ee', label: 'EE', unit: '%' },
    { key: 'ca_pct', short: 'ca', label: 'Ca', unit: '%' },
    { key: 'p_pct', short: 'p', label: 'P', unit: '%' },
    { key: 'lysine_pct', short: 'lys', label: 'Lys', unit: '%' },
  ]

  // Balance stats
  let metCount = 0, warnCount = 0, failCount = 0
  nutrients.forEach(nt => {
    const val = calcNutrient(nt.key)
    const req = findReqValue(nt.short)
    if (!req) return
    const inRange = (req.min != null && req.max != null) ? val >= req.min && val <= req.max : (req.min != null ? val >= req.min : true) && (req.max != null ? val <= req.max : true)
    const critical = (req.critical_max != null && val > req.critical_max) || (req.critical_min != null && val < req.critical_min)
    if (critical) failCount++; else if (inRange) metCount++; else warnCount++
  })

  function updateIngPct(idx: number, pct: number) {
    const updated = [...ings]
    updated[idx] = { ...updated[idx], inclusion_pct: pct }
    setIngs(updated)
    setSaved(false)
  }

  function toggleLock(idx: number) {
    const updated = [...ings]
    updated[idx] = { ...updated[idx], locked: !updated[idx].locked }
    setIngs(updated)
    setSaved(false)
  }

  function removeIng(idx: number) {
    setIngs(ings.filter((_, i) => i !== idx))
    setSaved(false)
  }

  async function addIngredient(ingId: string) {
    if (ings.some(fi => fi.ingredient_id === ingId)) return
    const supabase = await getSupabase()
    const { data } = await supabase.from('formula_ingredients').insert({
      formula_id: params.id,
      ingredient_id: ingId,
      inclusion_pct: 0,
      locked: false,
    }).select('*, ingredient:ingredients(*)').single()
    if (data) { setIngs([...ings, data]); setShowAddIng(false); setSaved(false) }
  }

  async function handleSave() {
    setSaving(true)
    const supabase = await getSupabase()
    // Delete existing and re-insert
    await supabase.from('formula_ingredients').delete().eq('formula_id', params.id)
    if (ings.length > 0) {
      await supabase.from('formula_ingredients').insert(
        ings.map(fi => ({
          formula_id: params.id as string,
          ingredient_id: fi.ingredient_id,
          inclusion_pct: fi.inclusion_pct,
          inclusion_kg: fi.inclusion_pct / 100 * (formula?.batch_size_kg || 1000),
          cost_per_tonne: prices[fi.ingredient_id] || null,
          locked: fi.locked,
        }))
      )
    }
    // Update formula totals
    await supabase.from('formulas').update({
      total_cost_per_tonne: costPerTonne,
      total_cp_pct: calcNutrient('cp_pct'),
      total_me_mj: calcNutrient('me_mj'),
    }).eq('id', params.id)
    setSaving(false)
    setSaved(true)
  }

  async function updateStatus(status: string) {
    const supabase = await getSupabase()
    await supabase.from('formulas').update({ status }).eq('id', params.id)
    setFormula({ ...formula, status })
  }

  if (!formula) return <div className="p-7 text-text-ghost">Loading formula...</div>

  const batchKg = formula.batch_size_kg || 1000
  const ca = calcNutrient('ca_pct')
  const p = calcNutrient('p_pct')
  const caP = p > 0 ? (ca / p) : 0

  const addableIngs = allIngredients.filter(i =>
    !ings.some(fi => fi.ingredient_id === i.id) &&
    i.name.toLowerCase().includes(ingSearch.toLowerCase()) &&
    (i.species_suitable as string[] || []).includes(formula.species)
  )

  return (
    <div className="p-5 max-w-[1400px] h-[calc(100vh-40px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <Link href="/formulas" className="text-text-ghost hover:text-text-muted no-underline text-sm">&larr;</Link>
            <h1 className="text-xl font-bold text-text">{formula.name}</h1>
            <select value={formula.status} onChange={(e) => updateStatus(e.target.value)}
              className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase border-none cursor-pointer
                ${formula.status==='draft'?'bg-status-amber/15 text-status-amber':formula.status==='review'?'bg-status-blue/15 text-status-blue':'bg-brand/15 text-brand'}`}>
              {['draft','review','approved','active'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-text-ghost font-mono">v{formula.version}</span>
          </div>
          <p className="text-xs text-text-ghost mt-0.5">{formula.client?.name || 'No client'} \u00B7 {formula.species} \u00B7 {stageName || formula.production_stage} \u00B7 {batchKg}kg batch</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className={`btn btn-primary btn-sm ${saved?'bg-brand/50':''}`}>
            <Save size={14} /> {saving ? 'Saving...' : saved ? 'Saved \u2713' : 'Save'}
          </button>
        </div>
      </div>

      {/* Balance Bar */}
      <div className="flex items-center gap-3 mb-3 px-3.5 py-2 bg-surface-card rounded-[10px] border border-border text-xs">
        <span className="font-bold text-text-ghost uppercase tracking-wider">Balance:</span>
        <span className="font-semibold capitalize text-text-dim">{formula.species} \u2014 {stageName || formula.production_stage}</span>
        <div className="flex-1" />
        <span className="font-mono font-bold text-brand">{metCount} met</span>
        {warnCount > 0 && <span className="font-mono font-bold text-status-amber">{warnCount} warn</span>}
        {failCount > 0 && <span className="font-mono font-bold text-status-red">{failCount} critical</span>}
        <span className="text-text-ghost">|</span>
        <span className={`font-mono font-bold ${totalPct>100.1?'text-status-red':totalPct<99.9?'text-status-amber':'text-brand'}`}>{totalPct.toFixed(1)}%</span>
        <span className={`font-mono font-bold text-status-amber`}>${costPerTonne.toFixed(0)}/t</span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[1fr_320px] gap-3 flex-1 min-h-0">
        {/* Left: Ingredients */}
        <div className="card flex flex-col">
          <div className="card-header">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Ingredients ({ings.length})</span>
            <button onClick={() => { setIngSearch(''); setShowAddIng(true) }} className="btn btn-ghost btn-sm"><Plus size={14} /> Add</button>
          </div>
          <div className="flex-1 overflow-auto">
            {ings.map((fi, idx) => {
              const ing = fi.ingredient
              const price = prices[fi.ingredient_id]
              if (!ing) return null
              return (
                <div key={fi.id || idx} className="grid grid-cols-[24px_1fr_80px_65px_55px_24px] px-3 py-2 border-b border-border/5 items-center gap-1.5">
                  <button onClick={() => toggleLock(idx)} className={`bg-transparent border-none cursor-pointer flex ${fi.locked?'text-status-amber':'text-text-ghost/40'}`}>
                    {fi.locked ? <Lock size={13} /> : <Unlock size={13} />}
                  </button>
                  <div>
                    <div className="text-sm font-semibold text-text-dim truncate">{ing.name}</div>
                    <div className="text-2xs text-text-ghost font-mono">{ing.category}{price ? ' \u00B7 $'+price.toFixed(0)+'/t' : ''}</div>
                  </div>
                  <input type="range" min="0" max="60" step="0.5" value={fi.inclusion_pct}
                    onChange={(e) => updateIngPct(idx, parseFloat(e.target.value))} />
                  <input type="number" value={fi.inclusion_pct} step="0.5" min="0" max="100"
                    onChange={(e) => updateIngPct(idx, parseFloat(e.target.value) || 0)}
                    className="w-full px-1.5 py-1 rounded border border-border bg-surface-deep text-text-dim text-sm font-mono text-right outline-none focus:border-border-focus" />
                  <span className="text-2xs text-text-ghost font-mono text-right">{(fi.inclusion_pct / 100 * batchKg).toFixed(0)}kg</span>
                  <button onClick={() => removeIng(idx)} className="bg-transparent border-none cursor-pointer text-text-ghost/40 hover:text-status-red"><X size={13} /></button>
                </div>
              )
            })}
            {ings.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-text-ghost mb-3">No ingredients added yet.</p>
                <button onClick={() => setShowAddIng(true)} className="btn btn-primary btn-sm"><Plus size={14} /> Add Ingredients</button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Tabs */}
        <div className="flex flex-col gap-0 overflow-hidden">
          <div className="flex gap-px bg-border rounded overflow-hidden mb-2">
            {(['balance','nutrients','cost'] as const).map(t => (
              <button key={t} onClick={() => setRightTab(t)}
                className={`flex-1 py-1.5 text-2xs font-bold uppercase tracking-wide text-center transition-all border-none cursor-pointer
                  ${rightTab===t?'bg-brand text-white':'bg-surface-card text-text-ghost hover:text-text-muted'}`}>
                {t==='balance'?'\u2696 Balance':t==='nutrients'?'\u25C9 Nutrients':'$ Cost'}
              </button>
            ))}
          </div>

          {/* BALANCE */}
          {rightTab === 'balance' && (
            <div className="card p-3 flex-1 overflow-auto">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-surface-deep rounded-lg p-2.5 text-center"><div className="text-xl font-bold font-mono text-brand">{metCount}</div><div className="text-2xs text-text-ghost uppercase">Met</div></div>
                <div className="bg-surface-deep rounded-lg p-2.5 text-center"><div className="text-xl font-bold font-mono text-status-amber">{warnCount}</div><div className="text-2xs text-text-ghost uppercase">Warn</div></div>
                <div className="bg-surface-deep rounded-lg p-2.5 text-center"><div className="text-xl font-bold font-mono text-status-red">{failCount}</div><div className="text-2xs text-text-ghost uppercase">Critical</div></div>
              </div>
              <div className="flex flex-col gap-3">
                {nutrients.map(nt => {
                  const val = calcNutrient(nt.key)
                  const req = findReqValue(nt.short)
                  if (!req) return (
                    <div key={nt.key} className="flex items-center gap-2">
                      <span className="w-10 text-xs font-semibold text-text-muted font-mono text-right">{nt.label}</span>
                      <div className="flex-1 h-1.5 bg-surface-deep rounded-sm" />
                      <span className="w-14 text-xs font-semibold text-text font-mono text-right">{val.toFixed(2)}{nt.unit}</span>
                    </div>
                  )
                  const inRange = (req.min!=null&&req.max!=null)?val>=req.min&&val<=req.max:(req.min!=null?val>=req.min:true)&&(req.max!=null?val<=req.max:true)
                  const critical = (req.critical_max!=null&&val>req.critical_max)||(req.critical_min!=null&&val<req.critical_min)
                  const color = critical?'bg-status-red':inRange?'bg-brand':'bg-status-amber'
                  const textColor = critical?'text-status-red':inRange?'text-brand':'text-status-amber'
                  const ceiling = Math.max(req.max||req.target||1, req.critical_max||0)*1.5
                  const pctVal = Math.min((val/ceiling)*100, 100)
                  const pctMin = req.min!=null?(req.min/ceiling)*100:0
                  const pctMax = req.max!=null?(req.max/ceiling)*100:100
                  const pctTarget = (req.target/ceiling)*100
                  const diff = req.target?((val-req.target)/req.target*100).toFixed(1):null
                  return (
                    <div key={nt.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-text-muted">{nt.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold font-mono ${textColor}`}>{val.toFixed(2)}{nt.unit}</span>
                          {diff && <span className={`text-2xs font-mono ${textColor}`}>{parseFloat(diff)>0?'+':''}{diff}%</span>}
                        </div>
                      </div>
                      <div className="relative h-4 bg-surface-deep rounded overflow-visible">
                        <div className="absolute h-full rounded opacity-15" style={{left:`${pctMin}%`,width:`${pctMax-pctMin}%`,background:critical?'#E05252':inRange?'#4CAF7D':'#D4A843'}} />
                        <div className="absolute h-full w-0.5 opacity-40" style={{left:`${pctTarget}%`,background:'#4CAF7D'}} />
                        <div className={`absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2 border-2 border-surface-bg ${color}`} style={{left:`${pctVal}%`}} />
                        <span className="absolute -bottom-3 text-[8px] font-mono text-text-ghost" style={{left:`${pctMin}%`,transform:'translateX(-50%)'}}>{req.min}</span>
                        <span className="absolute -bottom-3 text-[8px] font-mono text-text-ghost" style={{left:`${pctMax}%`,transform:'translateX(-50%)'}}>{req.max}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Ratios */}
              {ratios.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="text-2xs font-bold text-text-ghost uppercase tracking-wider mb-2">Key Ratios</div>
                  {ratios.map((r,i) => {
                    let actual: number|null = null
                    if (r.name === 'Ca:P' || r.name === 'Ca:avP') actual = p > 0 ? ca / p : null
                    if (actual === null) return null
                    const ok = actual >= r.min && actual <= r.max
                    return (
                      <div key={i} className="flex justify-between items-center py-1">
                        <span className="text-xs font-semibold text-text-muted">{r.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold font-mono ${ok?'text-brand':'text-status-amber'}`}>{actual.toFixed(2)}:1</span>
                          <span className="text-2xs font-mono text-text-ghost">target {r.target}:1</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* NUTRIENTS */}
          {rightTab === 'nutrients' && (
            <div className="card p-3 flex-1 overflow-auto">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Nutrient Profile</div>
              {[['CP',calcNutrient('cp_pct'),'%'],['ME',calcNutrient('me_mj'),'MJ/kg'],['NDF',calcNutrient('ndf_pct'),'%'],['ADF',calcNutrient('adf_pct'),'%'],['EE',calcNutrient('ee_pct'),'%'],['Starch',calcNutrient('starch_pct'),'%'],['Ca',calcNutrient('ca_pct'),'%'],['P',calcNutrient('p_pct'),'%'],['Mg',calcNutrient('mg_pct'),'%'],['K',calcNutrient('k_pct'),'%'],['Na',calcNutrient('na_pct'),'%'],['S',calcNutrient('s_pct'),'%'],['Lys',calcNutrient('lysine_pct'),'%'],['Met',calcNutrient('methionine_pct'),'%'],['Thr',calcNutrient('threonine_pct'),'%']].map(([label,val,unit]) => (
                <div key={label as string} className="flex items-center gap-2 py-0.5">
                  <span className="w-10 text-xs font-semibold text-text-muted font-mono text-right">{label}</span>
                  <div className="flex-1 h-1 bg-surface-deep rounded-sm overflow-hidden">
                    <div className="h-full bg-brand rounded-sm" style={{width:`${Math.min((val as number)*5,100)}%`}} />
                  </div>
                  <span className="w-16 text-xs font-semibold text-text font-mono text-right">{(val as number).toFixed(2)} {unit}</span>
                </div>
              ))}
              <div className="bg-surface-deep rounded-lg p-2.5 mt-3">
                <div className="flex justify-between mb-1"><span className="text-2xs text-text-ghost font-semibold">Ca:P Ratio</span><span className={`text-sm font-bold font-mono ${caP>=1.5&&caP<=2.5?'text-brand':'text-status-amber'}`}>{caP.toFixed(2)}:1</span></div>
                <div className="flex justify-between"><span className="text-2xs text-text-ghost font-semibold">Total</span><span className={`text-sm font-bold font-mono ${totalPct>=99.9&&totalPct<=100.1?'text-brand':'text-status-red'}`}>{totalPct.toFixed(1)}%</span></div>
              </div>
            </div>
          )}

          {/* COST */}
          {rightTab === 'cost' && (
            <div className="card p-3 flex-1 overflow-auto">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Cost Analysis</div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[['Per Tonne','$'+costPerTonne.toFixed(0)],['Per kg','$'+(costPerTonne/1000).toFixed(3)],['Per Head/Day','$'+(costPerTonne/1000*22).toFixed(2)],['Per L Milk','$'+(costPerTonne/1000*22/28).toFixed(3)]].map(([l,v]) => (
                  <div key={l} className="bg-surface-deep rounded-lg p-2.5"><div className="text-2xs text-text-ghost font-semibold uppercase">{l}</div><div className="text-lg font-bold text-status-amber font-mono mt-0.5">{v}</div></div>
                ))}
              </div>
              <div className="text-2xs font-bold text-text-ghost uppercase tracking-wider mb-2">Breakdown</div>
              {ings.filter(fi => fi.inclusion_pct > 0).sort((a,b) => {
                const ca = (prices[a.ingredient_id]||0)*a.inclusion_pct/100
                const cb = (prices[b.ingredient_id]||0)*b.inclusion_pct/100
                return cb - ca
              }).map((fi) => {
                const price = prices[fi.ingredient_id] || 0
                const ingCost = price * fi.inclusion_pct / 100
                const pctCost = costPerTonne > 0 ? ingCost / costPerTonne * 100 : 0
                return (
                  <div key={fi.id} className="flex items-center gap-2 py-1">
                    <span className="text-xs text-text-dim flex-1 truncate">{fi.ingredient?.name}</span>
                    <div className="w-16 h-1 bg-surface-deep rounded-sm overflow-hidden"><div className="h-full bg-status-amber rounded-sm" style={{width:`${pctCost}%`}} /></div>
                    <span className="text-xs font-mono text-status-amber w-12 text-right">${ingCost.toFixed(0)}</span>
                    <span className="text-2xs font-mono text-text-ghost w-8 text-right">{pctCost.toFixed(0)}%</span>
                  </div>
                )
              })}
              {ings.filter(fi => !prices[fi.ingredient_id] && fi.inclusion_pct > 0).length > 0 && (
                <p className="text-2xs text-status-amber mt-3">\u26A0 Some ingredients have no price set. Go to Ingredients to add prices.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD INGREDIENT MODAL */}
      {showAddIng && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddIng(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-text">Add Ingredient</h2>
              <button onClick={() => setShowAddIng(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
                <input value={ingSearch} onChange={e => setIngSearch(e.target.value)} placeholder={`Search ${formula.species} ingredients...`} className="input pl-9" autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {addableIngs.map(ing => (
                <div key={ing.id} onClick={() => addIngredient(ing.id)}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-text-dim">{ing.name}</div>
                    <div className="text-2xs text-text-ghost">{ing.category} \u00B7 CP {ing.cp_pct||0}% \u00B7 ME {ing.me_mj||0} MJ</div>
                  </div>
                  {prices[ing.id] && <span className="text-xs font-mono text-status-amber">${prices[ing.id].toFixed(0)}/t</span>}
                  <Plus size={14} className="text-brand" />
                </div>
              ))}
              {addableIngs.length === 0 && <div className="px-4 py-8 text-center text-sm text-text-ghost">No matching ingredients found.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
