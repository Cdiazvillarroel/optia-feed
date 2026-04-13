'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Sparkles, Save, Lock, Unlock, X, Search, ChevronDown, ChevronUp, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Req { nutrient: string; unit: string; min: number|null; max: number|null; target: number; critical_max?: number|null; critical_min?: number|null }
interface Ratio { name: string; min: number; max: number; target: number; unit?: string }

const PRODUCTION_FIELDS: Record<string, { key: string; label: string; unit: string; placeholder: string }[]> = {
  cattle: [
    { key: 'milk_yield', label: 'Milk Yield', unit: 'L/day', placeholder: '28' },
    { key: 'milk_fat', label: 'Milk Fat', unit: '%', placeholder: '4.0' },
    { key: 'milk_protein', label: 'Milk Protein', unit: '%', placeholder: '3.3' },
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '650' },
    { key: 'dmi', label: 'DMI', unit: 'kg/d', placeholder: '22' },
    { key: 'days_in_milk', label: 'Days in Milk', unit: 'DIM', placeholder: '120' },
  ],
  beef: [
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '450' },
    { key: 'target_adg', label: 'Target ADG', unit: 'kg/day', placeholder: '1.5' },
    { key: 'dmi', label: 'DMI', unit: 'kg/d', placeholder: '10' },
    { key: 'frame_score', label: 'Frame Score', unit: '', placeholder: '5' },
    { key: 'body_condition', label: 'Body Condition', unit: 'BCS 1-5', placeholder: '3.0' },
    { key: 'days_on_feed', label: 'Days on Feed', unit: 'days', placeholder: '100' },
  ],
  pig: [
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '80' },
    { key: 'target_adg', label: 'Target ADG', unit: 'g/day', placeholder: '900' },
    { key: 'dmi', label: 'Feed Intake', unit: 'kg/d', placeholder: '2.8' },
    { key: 'target_fcr', label: 'Target FCR', unit: '', placeholder: '2.5' },
    { key: 'litter_size', label: 'Litter Size', unit: 'piglets', placeholder: '12' },
  ],
  poultry: [
    { key: 'body_weight', label: 'Body Weight', unit: 'g', placeholder: '2200' },
    { key: 'target_adg', label: 'Target ADG', unit: 'g/day', placeholder: '65' },
    { key: 'dmi', label: 'Feed Intake', unit: 'g/d', placeholder: '130' },
    { key: 'target_fcr', label: 'Target FCR', unit: '', placeholder: '1.7' },
    { key: 'egg_production', label: 'Egg Production', unit: '%', placeholder: '90' },
  ],
  sheep: [
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '65' },
    { key: 'target_adg', label: 'Target ADG', unit: 'g/day', placeholder: '250' },
    { key: 'dmi', label: 'DMI', unit: 'kg/d', placeholder: '1.8' },
    { key: 'lambs', label: 'Lambs', unit: 'singles/twins', placeholder: '2' },
    { key: 'wool_growth', label: 'Wool Growth', unit: 'kg/yr', placeholder: '5' },
  ],
}

export default function FormulaBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const [formula, setFormula] = useState<any>(null)
  const [ings, setIngs] = useState<any[]>([])
  const [allIngredients, setAllIngredients] = useState<any[]>([])
  const [requirements, setRequirements] = useState<Req[]>([])
  const [ratios, setRatios] = useState<Ratio[]>([])
  const [stageName, setStageName] = useState('')
  const [safetyRules, setSafetyRules] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string,number>>({})
  const [rightTab, setRightTab] = useState<'balance'|'nutrients'|'cost'>('balance')
  const [showAddIng, setShowAddIng] = useState(false)
  const [ingSearch, setIngSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [production, setProduction] = useState<Record<string,string>>({})
  const [showProduction, setShowProduction] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReview, setAiReview] = useState<string|null>(null)
  const [showAi, setShowAi] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  // DM / As Fed basis
  const [basis, setBasis] = useState<'dm'|'asfed'>('dm')

  useEffect(() => { loadFormula() }, [params.id])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadFormula() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: f } = await supabase.from('formulas').select('*, client:nutrition_clients(id, name, location, species)').eq('id', params.id).single()
    if (!f) { router.push('/formulas'); return }
    setFormula(f)
    if (f.ai_review) setAiReview(f.ai_review)
    const { data: fi } = await supabase.from('formula_ingredients').select('*, ingredient:ingredients(*)').eq('formula_id', params.id)
    setIngs(fi || [])
    const { data: allIng } = await supabase.from('ingredients').select('*').or(`nutritionist_id.is.null${user?',nutritionist_id.eq.'+user.id:''}`).order('name')
    setAllIngredients(allIng || [])
    const { data: req } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).is('nutritionist_id', null).limit(1).single()
    if (req) { setRequirements(req.requirements || []); setRatios(req.ratios || []); setStageName(req.stage_name || f.production_stage) }
    const { data: rules } = await supabase.from('safety_rules').select('*').eq('species', f.species).is('nutritionist_id', null).eq('active', true)
    setSafetyRules(rules || [])
    if (user) {
      const { data: pr } = await supabase.from('ingredient_prices').select('ingredient_id, price_per_tonne').eq('nutritionist_id', user.id).order('effective_date', { ascending: false })
      const pm: Record<string,number> = {}
      pr?.forEach((p: any) => { if (!pm[p.ingredient_id]) pm[p.ingredient_id] = p.price_per_tonne })
      setPrices(pm)
    }
  }

  // ── DM / AS FED CALCULATIONS ───────────────────────────
  // inclusion_pct is ALWAYS stored and manipulated on DM basis
  // Nutrient calculations are ALWAYS on DM basis
  // As Fed conversion: as_fed_kg = dm_kg / (ingredient_dm_pct / 100)

  const batchKg = formula?.batch_size_kg || 1000

  // Total DM %
  const totalPctDM = ings.reduce((s, fi) => s + (fi.inclusion_pct || 0), 0)

  // Per-ingredient As Fed kg
  function getAsFedKg(fi: any): number {
    const dmKg = (fi.inclusion_pct || 0) / 100 * batchKg
    const dmPct = fi.ingredient?.dm_pct || 88
    return dmKg / (dmPct / 100)
  }

  function getDMKg(fi: any): number {
    return (fi.inclusion_pct || 0) / 100 * batchKg
  }

  // Total As Fed kg for the batch
  const totalAsFedKg = ings.reduce((s, fi) => s + getAsFedKg(fi), 0)

  // As Fed % for each ingredient (proportion of total As Fed)
  function getAsFedPct(fi: any): number {
    if (totalAsFedKg === 0) return 0
    return (getAsFedKg(fi) / totalAsFedKg) * 100
  }

  // Average DM% of the total mix
  const avgDMPct = totalAsFedKg > 0 ? (totalPctDM / 100 * batchKg) / totalAsFedKg * 100 : 0

  // Nutrient calculations — always DM basis
  function calcNutrient(key: string): number {
    return ings.reduce((s, fi) => s + (fi.ingredient?.[key] || 0) * (fi.inclusion_pct || 0) / 100, 0)
  }

  // Cost — on As Fed basis (price per tonne is As Fed price)
  const costPerTonneAF = ings.reduce((s, fi) => {
    const price = prices[fi.ingredient_id] || 0
    const asFedProp = totalAsFedKg > 0 ? getAsFedKg(fi) / totalAsFedKg : 0
    return s + price * asFedProp
  }, 0)

  // Cost on DM basis (higher because you're paying for less actual matter)
  const costPerTonneDM = avgDMPct > 0 ? costPerTonneAF / (avgDMPct / 100) : 0

  const ca = calcNutrient('ca_pct'), pp = calcNutrient('p_pct'), caP = pp > 0 ? ca / pp : 0

  function findReq(short: string): Req | undefined {
    return requirements.find(r => {
      const n = r.nutrient.toLowerCase()
      if (short==='cp') return n.includes('crude protein')||n.includes(' cp'); if (short==='me') return n.includes('energy')||n.includes(' me ')||n.includes(' de ')
      if (short==='ndf') return n.includes('ndf'); if (short==='adf') return n.includes('adf'); if (short==='ee') return n.includes('fat')||n.includes('ether')||n.includes(' ee')
      if (short==='ca') return n.includes('calcium'); if (short==='p') return n.includes('phosphorus')||n.includes('available p')
      if (short==='s') return n.includes('sulphur'); if (short==='lys') return n.includes('lysine'); if (short==='met') return n.includes('methionine')||n.includes('meth+cyst')
      return false
    })
  }

  const nutrients = [
    {key:'cp_pct',short:'cp',label:'CP',unit:'%'},{key:'me_mj',short:'me',label:'ME',unit:' MJ'},{key:'ndf_pct',short:'ndf',label:'NDF',unit:'%'},
    {key:'ee_pct',short:'ee',label:'EE',unit:'%'},{key:'ca_pct',short:'ca',label:'Ca',unit:'%'},{key:'p_pct',short:'p',label:'P',unit:'%'},{key:'lysine_pct',short:'lys',label:'Lys',unit:'%'},
  ]

  let metCount=0, warnCount=0, failCount=0
  nutrients.forEach(nt => {
    const val=calcNutrient(nt.key), req=findReq(nt.short); if(!req) return
    const inRange=(req.min!=null&&req.max!=null)?val>=req.min&&val<=req.max:(req.min!=null?val>=req.min:true)&&(req.max!=null?val<=req.max:true)
    const critical=(req.critical_max!=null&&val>req.critical_max)||(req.critical_min!=null&&val<req.critical_min)
    if(critical) failCount++; else if(inRange) metCount++; else warnCount++
  })

  function updateIngPct(idx: number, pct: number) { const u=[...ings]; u[idx]={...u[idx],inclusion_pct:pct}; setIngs(u); setSaved(false) }
  function toggleLock(idx: number) { const u=[...ings]; u[idx]={...u[idx],locked:!u[idx].locked}; setIngs(u); setSaved(false) }
  function removeIng(idx: number) { setIngs(ings.filter((_,i)=>i!==idx)); setSaved(false) }

  async function addIngredient(ingId: string) {
    if (ings.some(fi => fi.ingredient_id === ingId)) return
    const supabase = await getSupabase()
    const { data } = await supabase.from('formula_ingredients').insert({ formula_id: params.id, ingredient_id: ingId, inclusion_pct: 0, locked: false }).select('*, ingredient:ingredients(*)').single()
    if (data) { setIngs([...ings, data]); setShowAddIng(false); setSaved(false) }
  }

  async function handleSave() {
    setSaving(true); const supabase = await getSupabase()
    await supabase.from('formula_ingredients').delete().eq('formula_id', params.id)
    if (ings.length > 0) {
      await supabase.from('formula_ingredients').insert(ings.map(fi => ({
        formula_id: params.id as string, ingredient_id: fi.ingredient_id, inclusion_pct: fi.inclusion_pct,
        inclusion_kg: fi.inclusion_pct / 100 * batchKg, cost_per_tonne: prices[fi.ingredient_id] || null, locked: fi.locked,
      })))
    }
    await supabase.from('formulas').update({ total_cost_per_tonne: costPerTonneAF, total_cp_pct: calcNutrient('cp_pct'), total_me_mj: calcNutrient('me_mj') }).eq('id', params.id)
    setSaving(false); setSaved(true)
  }

  async function updateStatus(status: string) {
    const supabase = await getSupabase()
    await supabase.from('formulas').update({ status }).eq('id', params.id)
    setFormula({ ...formula, status })
  }

  // ── AI ──────────────────────────────────────────────────
  function buildAiContext() {
    const ingList = ings.map(fi => `- ${fi.ingredient?.name}: ${fi.inclusion_pct.toFixed(1)}% DM (${getAsFedPct(fi).toFixed(1)}% AF, DM=${fi.ingredient?.dm_pct||88}%) ${fi.locked?'[LOCKED]':''} ${prices[fi.ingredient_id]?'$'+prices[fi.ingredient_id]+'/t AF':''}`).join('\n')
    const nutProfile = nutrients.map(nt => `${nt.label}: ${calcNutrient(nt.key).toFixed(2)}${nt.unit} (DM basis)`).join(', ')
    const reqList = requirements.map(r => `${r.nutrient}: min ${r.min??'-'} / target ${r.target} / max ${r.max??'-'} ${r.unit}`).join('\n')
    const prodInfo = Object.entries(production).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(', ')
    const violations = safetyRules.filter(r => r.severity === 'danger').map(r => `[${r.severity.toUpperCase()}] ${r.title}: ${r.detail}`).join('\n')
    return `FORMULA: ${formula.name} (${formula.status}, v${formula.version})
CLIENT: ${formula.client?.name || 'Unassigned'}
SPECIES: ${formula.species} | STAGE: ${stageName || formula.production_stage}
BATCH: ${batchKg}kg DM | Total As Fed: ${totalAsFedKg.toFixed(0)}kg | Avg DM: ${avgDMPct.toFixed(1)}%
${prodInfo ? 'PRODUCTION: ' + prodInfo : ''}

INGREDIENTS (DM basis, with As Fed conversion):
${ingList}

NUTRIENT PROFILE (DM basis):
${nutProfile}
Ca:P ratio: ${caP.toFixed(2)}:1 | Total DM: ${totalPctDM.toFixed(1)}%

COST: $${costPerTonneAF.toFixed(0)}/t As Fed | $${costPerTonneDM.toFixed(0)}/t DM

REQUIREMENTS (${stageName}, DM basis):
${reqList}

BALANCE: ${metCount} met, ${warnCount} warnings, ${failCount} critical

SAFETY RULES:\n${violations}`
  }

  async function handleAiReview() {
    setAiLoading(true); setShowAi(true); setAiReview(null)
    try {
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `Review this formula in detail. Note all values are on DM basis. Include As Fed mixing instructions. Australian context.\n\n${buildAiContext()}` }) })
      const data = await res.json()
      setAiReview(data.response || 'No response.')
      const supabase = await getSupabase()
      await supabase.from('formulas').update({ ai_review: data.response, ai_reviewed_at: new Date().toISOString() }).eq('id', params.id)
    } catch { setAiReview('Error connecting to AI.') }
    setAiLoading(false)
  }

  async function handleAiQuestion() {
    if (!aiQuestion.trim()) return
    setAiLoading(true); const q = aiQuestion; setAiQuestion('')
    try {
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `${q}\n\nCONTEXT:\n${buildAiContext()}` }) })
      const data = await res.json(); setAiReview(data.response || 'No response.')
    } catch { setAiReview('Error connecting to AI.') }
    setAiLoading(false)
  }

  if (!formula) return <div className="p-7 text-text-ghost">Loading formula...</div>
  const prodFields = PRODUCTION_FIELDS[formula.species] || PRODUCTION_FIELDS.beef
  const addableIngs = allIngredients.filter(i => !ings.some(fi=>fi.ingredient_id===i.id) && i.name.toLowerCase().includes(ingSearch.toLowerCase()) && (i.species_suitable as string[]||[]).includes(formula.species))

  // Display values based on current basis
  const displayCostPerT = basis === 'dm' ? costPerTonneDM : costPerTonneAF
  const displayTotalPct = basis === 'dm' ? totalPctDM : 100 // As Fed always sums to 100% of itself

  return (
    <div className="p-4 max-w-[1400px] h-[calc(100vh-32px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <Link href="/formulas" className="text-text-ghost hover:text-text-muted no-underline text-sm">&larr;</Link>
            <h1 className="text-xl font-bold text-text">{formula.name}</h1>
            <select value={formula.status} onChange={e=>updateStatus(e.target.value)} className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase border-none cursor-pointer ${formula.status==='draft'?'bg-status-amber/15 text-status-amber':formula.status==='review'?'bg-status-blue/15 text-status-blue':'bg-brand/15 text-brand'}`}>
              {['draft','review','approved','active'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-text-ghost font-mono">v{formula.version}</span>
          </div>
          <p className="text-xs text-text-ghost mt-0.5">{formula.client?.name||'No client'} &middot; {formula.species} &middot; {stageName||formula.production_stage} &middot; {batchKg}kg batch</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm"><Sparkles size={14}/> {aiLoading?'Reviewing...':'AI Review'}</button>
          <button onClick={handleSave} disabled={saving} className={`btn btn-primary btn-sm ${saved?'bg-brand/50':''}`}><Save size={14}/> {saving?'Saving...':saved?'Saved \u2713':'Save'}</button>
        </div>
      </div>

      {/* Production Level */}
      <div className="mb-2">
        <button onClick={()=>setShowProduction(!showProduction)} className="flex items-center gap-1.5 text-xs font-bold text-text-ghost uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-text-muted">
          Production Level {showProduction?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
        </button>
        {showProduction&&(<div className="grid grid-cols-6 gap-2 mt-2 p-3 bg-surface-card rounded-lg border border-border">{prodFields.map(f=>(<div key={f.key}><label className="text-2xs text-text-ghost block mb-0.5">{f.label} <span className="text-text-ghost/50">({f.unit})</span></label><input value={production[f.key]||''} onChange={e=>setProduction({...production,[f.key]:e.target.value})} placeholder={f.placeholder} className="w-full px-2 py-1.5 rounded border border-border bg-surface-deep text-text-dim text-sm font-mono outline-none focus:border-border-focus"/></div>))}</div>)}
      </div>

      {/* Balance Bar + DM/AF Toggle */}
      <div className="flex items-center gap-3 mb-2 px-3 py-1.5 bg-surface-card rounded-lg border border-border text-xs">
        {/* DM / As Fed Toggle */}
        <button onClick={() => setBasis(basis === 'dm' ? 'asfed' : 'dm')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface-deep cursor-pointer transition-all hover:border-brand/30">
          {basis === 'dm' ? <ToggleLeft size={14} className="text-brand"/> : <ToggleRight size={14} className="text-status-amber"/>}
          <span className={`font-bold font-mono ${basis === 'dm' ? 'text-brand' : 'text-status-amber'}`}>{basis === 'dm' ? 'DM Basis' : 'As Fed'}</span>
        </button>
        <span className="text-text-ghost">|</span>
        <span className="font-bold text-text-ghost uppercase tracking-wider">Balance:</span>
        <span className="font-mono font-bold text-brand">{metCount} met</span>
        {warnCount>0&&<span className="font-mono font-bold text-status-amber">{warnCount} warn</span>}
        {failCount>0&&<span className="font-mono font-bold text-status-red">{failCount} critical</span>}
        <div className="flex-1"/>
        {basis === 'dm' ? (
          <span className={`font-mono font-bold ${totalPctDM>100.1?'text-status-red':totalPctDM<99.9?'text-status-amber':'text-brand'}`}>{totalPctDM.toFixed(1)}% DM</span>
        ) : (
          <span className="font-mono font-bold text-text-dim">{totalAsFedKg.toFixed(0)}kg AF</span>
        )}
        <span className="font-mono text-text-ghost">DM {avgDMPct.toFixed(1)}%</span>
        <span className="font-mono font-bold text-status-amber">${displayCostPerT.toFixed(0)}/t {basis === 'dm' ? 'DM' : 'AF'}</span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[1fr_320px] gap-3 flex-1 min-h-0">
        {/* Ingredients */}
        <div className="card flex flex-col">
          <div className="card-header">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Ingredients ({ings.length})
              <span className="text-text-ghost font-normal ml-2">{basis === 'dm' ? 'showing DM basis' : 'showing As Fed'}</span>
            </span>
            <button onClick={()=>{setIngSearch('');setShowAddIng(true)}} className="btn btn-ghost btn-sm"><Plus size={14}/> Add</button>
          </div>
          {/* Column headers */}
          <div className="grid grid-cols-[24px_1fr_80px_55px_55px_55px_24px] px-3 py-1 border-b border-border gap-1.5 text-2xs font-bold text-text-ghost uppercase tracking-wider">
            <span></span><span>Ingredient</span><span></span>
            <span className="text-right">{basis==='dm'?'DM%':'AF%'}</span>
            <span className="text-right">{basis==='dm'?'DM kg':'AF kg'}</span>
            <span className="text-right">DM%</span>
            <span></span>
          </div>
          <div className="flex-1 overflow-auto">
            {ings.map((fi,idx)=>{
              const ing=fi.ingredient; if(!ing) return null
              const price=prices[fi.ingredient_id]
              const dmKg = getDMKg(fi)
              const afKg = getAsFedKg(fi)
              const afPct = getAsFedPct(fi)
              const ingDM = ing.dm_pct || 88
              const displayPct = basis === 'dm' ? fi.inclusion_pct : afPct
              const displayKg = basis === 'dm' ? dmKg : afKg
              return(
              <div key={fi.id||idx} className="grid grid-cols-[24px_1fr_80px_55px_55px_55px_24px] px-3 py-2 border-b border-border/5 items-center gap-1.5">
                <button onClick={()=>toggleLock(idx)} className={`bg-transparent border-none cursor-pointer flex ${fi.locked?'text-status-amber':'text-text-ghost/40'}`}>{fi.locked?<Lock size={13}/>:<Unlock size={13}/>}</button>
                <div>
                  <div className="text-sm font-semibold text-text-dim truncate">{ing.name}</div>
                  <div className="text-2xs text-text-ghost font-mono">{ing.category}{price?' \u00B7 $'+price.toFixed(0)+'/t':''}</div>
                </div>
                <input type="range" min="0" max="60" step="0.5" value={fi.inclusion_pct} onChange={e=>updateIngPct(idx,parseFloat(e.target.value))}/>
                <input type="number" value={fi.inclusion_pct} step="0.5" min="0" max="100" onChange={e=>updateIngPct(idx,parseFloat(e.target.value)||0)} className="w-full px-1 py-1 rounded border border-border bg-surface-deep text-text-dim text-sm font-mono text-right outline-none focus:border-border-focus" title="DM inclusion %"/>
                <span className="text-2xs text-text-ghost font-mono text-right">{displayKg.toFixed(0)}<span className="text-text-ghost/50">kg</span></span>
                <span className={`text-2xs font-mono text-right ${ingDM < 50 ? 'text-status-blue font-semibold' : 'text-text-ghost'}`} title="Ingredient DM%">{ingDM.toFixed(0)}%</span>
                <button onClick={()=>removeIng(idx)} className="bg-transparent border-none cursor-pointer text-text-ghost/40 hover:text-status-red"><X size={13}/></button>
              </div>
            )})}
            {ings.length===0&&<div className="px-4 py-12 text-center"><p className="text-sm text-text-ghost mb-3">No ingredients added.</p><button onClick={()=>setShowAddIng(true)} className="btn btn-primary btn-sm"><Plus size={14}/> Add Ingredients</button></div>}
          </div>
          {/* Totals row */}
          {ings.length > 0 && (
            <div className="px-3 py-2 border-t-2 border-border flex items-center gap-4 text-xs font-bold">
              <span className="text-text-muted uppercase tracking-wider">Total</span>
              <span className={`font-mono ${totalPctDM>100.1||totalPctDM<99.9?'text-status-red':'text-brand'}`}>{totalPctDM.toFixed(1)}% DM</span>
              <span className="text-text-ghost">|</span>
              <span className="font-mono text-text-dim">{totalAsFedKg.toFixed(0)}kg As Fed</span>
              <span className="text-text-ghost">|</span>
              <span className="font-mono text-text-ghost">Mix DM: {avgDMPct.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-0 overflow-hidden">
          <div className="flex gap-px bg-border rounded overflow-hidden mb-2">
            {(['balance','nutrients','cost'] as const).map(t=>(
              <button key={t} onClick={()=>setRightTab(t)} className={`flex-1 py-1.5 text-2xs font-bold uppercase tracking-wide text-center transition-all border-none cursor-pointer ${rightTab===t?'bg-brand text-white':'bg-surface-card text-text-ghost hover:text-text-muted'}`}>
                {t==='balance'?'\u2696 Balance':t==='nutrients'?'\u25C9 Nutrients':'$ Cost'}
              </button>
            ))}
          </div>

          {/* BALANCE */}
          {rightTab==='balance'&&(
            <div className="card p-3 flex-1 overflow-auto">
              <div className="text-2xs text-text-ghost text-center mb-2 font-mono">All values on DM basis</div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-surface-deep rounded-lg p-2 text-center"><div className="text-xl font-bold font-mono text-brand">{metCount}</div><div className="text-2xs text-text-ghost uppercase">Met</div></div>
                <div className="bg-surface-deep rounded-lg p-2 text-center"><div className="text-xl font-bold font-mono text-status-amber">{warnCount}</div><div className="text-2xs text-text-ghost uppercase">Warn</div></div>
                <div className="bg-surface-deep rounded-lg p-2 text-center"><div className="text-xl font-bold font-mono text-status-red">{failCount}</div><div className="text-2xs text-text-ghost uppercase">Critical</div></div>
              </div>
              <div className="flex flex-col gap-3">
                {nutrients.map(nt=>{const val=calcNutrient(nt.key);const req=findReq(nt.short);if(!req)return(<div key={nt.key} className="flex items-center gap-2"><span className="w-10 text-xs font-semibold text-text-muted font-mono text-right">{nt.label}</span><div className="flex-1 h-1.5 bg-surface-deep rounded-sm"/><span className="w-14 text-xs font-semibold text-text font-mono text-right">{val.toFixed(2)}{nt.unit}</span></div>)
                  const inRange=(req.min!=null&&req.max!=null)?val>=req.min&&val<=req.max:(req.min!=null?val>=req.min:true)&&(req.max!=null?val<=req.max:true)
                  const critical=(req.critical_max!=null&&val>req.critical_max)||(req.critical_min!=null&&val<req.critical_min)
                  const color=critical?'bg-status-red':inRange?'bg-brand':'bg-status-amber'; const tc=critical?'text-status-red':inRange?'text-brand':'text-status-amber'
                  const ceiling=Math.max(req.max||req.target||1,req.critical_max||0)*1.5; const pctVal=Math.min((val/ceiling)*100,100)
                  const pctMin=req.min!=null?(req.min/ceiling)*100:0; const pctMax=req.max!=null?(req.max/ceiling)*100:100; const pctTarget=(req.target/ceiling)*100
                  const diff=req.target?((val-req.target)/req.target*100).toFixed(1):null
                  return(<div key={nt.key}><div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-text-muted">{nt.label}</span><div className="flex items-center gap-2"><span className={`text-xs font-bold font-mono ${tc}`}>{val.toFixed(2)}{nt.unit}</span>{diff&&<span className={`text-2xs font-mono ${tc}`}>{parseFloat(diff)>0?'+':''}{diff}%</span>}</div></div><div className="relative h-4 bg-surface-deep rounded overflow-visible"><div className="absolute h-full rounded opacity-15" style={{left:`${pctMin}%`,width:`${pctMax-pctMin}%`,background:critical?'#E05252':inRange?'#4CAF7D':'#D4A843'}}/><div className="absolute h-full w-0.5 opacity-40" style={{left:`${pctTarget}%`,background:'#4CAF7D'}}/><div className={`absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2 border-2 border-surface-bg ${color}`} style={{left:`${pctVal}%`}}/><span className="absolute -bottom-3 text-[8px] font-mono text-text-ghost" style={{left:`${pctMin}%`,transform:'translateX(-50%)'}}>{req.min}</span><span className="absolute -bottom-3 text-[8px] font-mono text-text-ghost" style={{left:`${pctMax}%`,transform:'translateX(-50%)'}}>{req.max}</span></div></div>)
                })}
              </div>
              {ratios.length>0&&<div className="mt-4 pt-3 border-t border-border"><div className="text-2xs font-bold text-text-ghost uppercase mb-2">Ratios</div>{ratios.map((r,i)=>{let actual:number|null=null;if(r.name==='Ca:P'||r.name==='Ca:avP')actual=pp>0?ca/pp:null;if(actual===null)return null;const ok=actual>=r.min&&actual<=r.max;return(<div key={i} className="flex justify-between items-center py-1"><span className="text-xs font-semibold text-text-muted">{r.name}</span><span className={`text-sm font-bold font-mono ${ok?'text-brand':'text-status-amber'}`}>{actual.toFixed(2)}:1 <span className="text-2xs text-text-ghost font-normal">target {r.target}</span></span></div>)})}</div>}
            </div>
          )}

          {/* NUTRIENTS */}
          {rightTab==='nutrients'&&(
            <div className="card p-3 flex-1 overflow-auto">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Nutrient Profile <span className="text-text-ghost font-normal">(DM basis)</span></div>
              {[['CP',calcNutrient('cp_pct'),'%'],['ME',calcNutrient('me_mj'),'MJ'],['NDF',calcNutrient('ndf_pct'),'%'],['ADF',calcNutrient('adf_pct'),'%'],['EE',calcNutrient('ee_pct'),'%'],['Starch',calcNutrient('starch_pct'),'%'],['Ca',calcNutrient('ca_pct'),'%'],['P',calcNutrient('p_pct'),'%'],['Mg',calcNutrient('mg_pct'),'%'],['K',calcNutrient('k_pct'),'%'],['Na',calcNutrient('na_pct'),'%'],['S',calcNutrient('s_pct'),'%'],['Lys',calcNutrient('lysine_pct'),'%'],['Met',calcNutrient('methionine_pct'),'%'],['Thr',calcNutrient('threonine_pct'),'%']].map(([l,v,u])=>(
                <div key={l as string} className="flex items-center gap-2 py-0.5"><span className="w-10 text-xs font-semibold text-text-muted font-mono text-right">{l}</span><div className="flex-1 h-1 bg-surface-deep rounded-sm overflow-hidden"><div className="h-full bg-brand rounded-sm" style={{width:`${Math.min((v as number)*5,100)}%`}}/></div><span className="w-16 text-xs font-semibold text-text font-mono text-right">{(v as number).toFixed(2)} {u}</span></div>
              ))}
              <div className="bg-surface-deep rounded-lg p-2 mt-3">
                <div className="flex justify-between mb-1"><span className="text-2xs text-text-ghost font-semibold">Ca:P</span><span className={`text-sm font-bold font-mono ${caP>=1.5&&caP<=2.5?'text-brand':'text-status-amber'}`}>{caP.toFixed(2)}:1</span></div>
                <div className="flex justify-between mb-1"><span className="text-2xs text-text-ghost font-semibold">Total DM</span><span className={`text-sm font-bold font-mono ${totalPctDM>=99.9&&totalPctDM<=100.1?'text-brand':'text-status-red'}`}>{totalPctDM.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-2xs text-text-ghost font-semibold">Mix DM%</span><span className="text-sm font-bold font-mono text-text-dim">{avgDMPct.toFixed(1)}%</span></div>
              </div>
            </div>
          )}

          {/* COST */}
          {rightTab==='cost'&&(
            <div className="card p-3 flex-1 overflow-auto">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Cost Analysis</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost font-semibold uppercase">$/t As Fed</div><div className="text-lg font-bold text-status-amber font-mono mt-0.5">${costPerTonneAF.toFixed(0)}</div></div>
                <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost font-semibold uppercase">$/t DM</div><div className="text-lg font-bold text-status-coral font-mono mt-0.5">${costPerTonneDM.toFixed(0)}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost font-semibold uppercase">$/kg AF</div><div className="text-base font-bold text-text-dim font-mono mt-0.5">${(costPerTonneAF/1000).toFixed(3)}</div></div>
                <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost font-semibold uppercase">$/Head/Day</div><div className="text-base font-bold text-text-dim font-mono mt-0.5">${(costPerTonneAF/1000*(parseFloat(production.dmi)||22)).toFixed(2)}</div></div>
              </div>
              <div className="text-2xs font-bold text-text-ghost uppercase mb-2">Breakdown (As Fed cost contribution)</div>
              {ings.filter(fi=>fi.inclusion_pct>0).sort((a,b)=>{const ca2=(prices[a.ingredient_id]||0)*getAsFedKg(a);const cb=(prices[b.ingredient_id]||0)*getAsFedKg(b);return cb-ca2}).map(fi=>{
                const price=prices[fi.ingredient_id]||0;const afProp=totalAsFedKg>0?getAsFedKg(fi)/totalAsFedKg:0;const ingCost=price*afProp;const pctCost=costPerTonneAF>0?ingCost/costPerTonneAF*100:0
                return(<div key={fi.id} className="flex items-center gap-2 py-1"><span className="text-xs text-text-dim flex-1 truncate">{fi.ingredient?.name} <span className="text-text-ghost">({fi.ingredient?.dm_pct||88}% DM)</span></span><div className="w-16 h-1 bg-surface-deep rounded-sm overflow-hidden"><div className="h-full bg-status-amber rounded-sm" style={{width:`${pctCost}%`}}/></div><span className="text-xs font-mono text-status-amber w-12 text-right">${ingCost.toFixed(0)}</span><span className="text-2xs font-mono text-text-ghost w-8 text-right">{pctCost.toFixed(0)}%</span></div>)
              })}
              {ings.filter(fi=>!prices[fi.ingredient_id]&&fi.inclusion_pct>0).length>0&&<p className="text-2xs text-status-amber mt-3">\u26A0 Some ingredients have no price set.</p>}
            </div>
          )}
        </div>
      </div>

      {/* ADD INGREDIENT MODAL */}
      {showAddIng&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddIng(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="text-lg font-bold text-text">Add Ingredient</h2><button onClick={()=>setShowAddIng(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="p-4 border-b border-border"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"/><input value={ingSearch} onChange={e=>setIngSearch(e.target.value)} placeholder={`Search ${formula.species} ingredients...`} className="input pl-9" autoFocus/></div></div>
        <div className="flex-1 overflow-auto">{addableIngs.map(ing=>(<div key={ing.id} onClick={()=>addIngredient(ing.id)} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] cursor-pointer transition-colors"><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{ing.name}</div><div className="text-2xs text-text-ghost">{ing.category} &middot; CP {ing.cp_pct||0}% &middot; ME {ing.me_mj||0} MJ &middot; DM {ing.dm_pct||88}%</div></div>{prices[ing.id]&&<span className="text-xs font-mono text-status-amber">${prices[ing.id].toFixed(0)}/t</span>}<Plus size={14} className="text-brand"/></div>))}{addableIngs.length===0&&<div className="px-4 py-8 text-center text-sm text-text-ghost">No matching ingredients.</div>}</div>
      </div></div>)}

      {/* AI REVIEW PANEL */}
      {showAi&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAi(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center"><Sparkles size={14} className="text-white"/></div><div><div className="text-base font-bold text-text">Optia AI Review</div><div className="text-2xs text-text-ghost">{formula.name} &middot; DM &amp; As Fed analysis</div></div></div><button onClick={()=>setShowAi(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="flex-1 overflow-auto p-4">{aiLoading&&!aiReview&&<div className="flex items-center gap-3 text-text-ghost"><Loader2 size={16} className="animate-spin"/> Analyzing formula...</div>}{aiReview&&<div className="text-sm text-text-dim leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{__html:aiReview.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br/>')}}/>}</div>
        <div className="p-4 border-t border-border flex gap-2"><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAiQuestion()} placeholder="Ask a follow-up..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-border-focus"/><button onClick={handleAiQuestion} disabled={aiLoading} className="btn btn-primary btn-sm">{aiLoading?<Loader2 size={14} className="animate-spin"/>:'Ask'}</button><button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm">Re-review</button></div>
      </div></div>)}
    </div>
  )
}
