'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Sparkles, Save, Lock, Unlock, X, Search, ChevronDown, ChevronUp, Loader2, ToggleLeft, ToggleRight, Zap, GitCompare, RotateCcw, Download } from 'lucide-react'

interface Req { nutrient: string; unit: string; min: number|null; max: number|null; target: number; critical_max?: number|null; critical_min?: number|null }
interface Ratio { name: string; min: number; max: number; target: number; unit?: string }
interface CompareSlot { name: string; ings: any[]; production: Record<string,string>; nutrients: Record<string,number>; cost: number; margin: number; mp: number; fc: string; timestamp: Date }

const PRODUCTION_FIELDS: Record<string, { key: string; label: string; unit: string; placeholder: string }[]> = {
  cattle: [{key:'milk_yield',label:'Milk Yield',unit:'L/d',placeholder:'28'},{key:'milk_fat',label:'Fat',unit:'%',placeholder:'4.0'},{key:'milk_protein',label:'Protein',unit:'%',placeholder:'3.3'},{key:'body_weight',label:'BW',unit:'kg',placeholder:'650'},{key:'dmi',label:'DMI',unit:'kg/d',placeholder:'22'},{key:'days_in_milk',label:'DIM',unit:'',placeholder:'120'},{key:'days_pregnant',label:'Preg',unit:'d',placeholder:'90'},{key:'lwg',label:'LWC',unit:'kg/d',placeholder:'0.0'}],
  beef: [{key:'body_weight',label:'BW',unit:'kg',placeholder:'450'},{key:'target_adg',label:'ADG',unit:'kg/d',placeholder:'1.5'},{key:'dmi',label:'DMI',unit:'kg/d',placeholder:'10'},{key:'frame_score',label:'Frame',unit:'',placeholder:'5'},{key:'body_condition',label:'BCS',unit:'1-5',placeholder:'3.0'},{key:'days_on_feed',label:'DOF',unit:'d',placeholder:'100'},{key:'sale_weight',label:'Sale',unit:'kg',placeholder:'600'},{key:'price_per_kg',label:'$/kg',unit:'LW',placeholder:'4.50'}],
  pig: [{key:'body_weight',label:'BW',unit:'kg',placeholder:'80'},{key:'target_adg',label:'ADG',unit:'g/d',placeholder:'900'},{key:'dmi',label:'Intake',unit:'kg/d',placeholder:'2.8'},{key:'target_fcr',label:'FCR',unit:'',placeholder:'2.5'},{key:'litter_size',label:'Litter',unit:'',placeholder:'12'},{key:'price_per_kg',label:'$/kg',unit:'CW',placeholder:'3.80'}],
  poultry: [{key:'body_weight',label:'BW',unit:'g',placeholder:'2200'},{key:'target_adg',label:'ADG',unit:'g/d',placeholder:'65'},{key:'dmi',label:'Intake',unit:'g/d',placeholder:'130'},{key:'target_fcr',label:'FCR',unit:'',placeholder:'1.7'},{key:'egg_production',label:'Egg%',unit:'',placeholder:'90'},{key:'price_per_kg',label:'$/kg',unit:'LW',placeholder:'2.20'}],
  sheep: [{key:'body_weight',label:'BW',unit:'kg',placeholder:'65'},{key:'target_adg',label:'ADG',unit:'g/d',placeholder:'250'},{key:'dmi',label:'DMI',unit:'kg/d',placeholder:'1.8'},{key:'lambs',label:'Lambs',unit:'',placeholder:'2'},{key:'wool_growth',label:'Wool',unit:'kg/yr',placeholder:'5'},{key:'price_per_kg',label:'$/kg',unit:'LW',placeholder:'6.00'}],
}

// ── NUTRITION MODELS ─────────────────────────────────────
function predictDMI_NRC(bw: number, my: number, mf: number, dim: number): number {
  const fcm = my * (0.4 + 15 * (mf / 100))
  const wol = dim / 7
  return (0.372 * fcm + 0.0968 * Math.pow(bw, 0.75)) * (1 - Math.exp(-0.192 * (wol + 3.67)))
}
function predictDMI_CSIRO(bw: number, me: number): number {
  const ri = 0.025 + (me - 7) * 0.002
  return bw * Math.min(Math.max(ri, 0.015), 0.035)
}
function predictDMI(species: string, prod: Record<string,string>, me: number): number {
  const bw = parseFloat(prod.body_weight) || 0
  const my = parseFloat(prod.milk_yield) || 0
  if (species === 'cattle') {
    if (my > 0 && bw > 0) {
      return predictDMI_NRC(bw, my, parseFloat(prod.milk_fat) || 4.0, parseFloat(prod.days_in_milk) || 120)
    }
    // Dry cow / heifer / calf — no milk
    return (bw || 550) * 0.02 // 2% of BW
  }
  if (species === 'beef') {
    if (bw > 0 && me > 0) return predictDMI_CSIRO(bw, me)
    return (bw || 450) * 0.025 // 2.5% of BW
  }
  if (species === 'sheep') {
    return (bw || 65) * 0.028 // 2.8% of BW
  }
  if (species === 'pig') {
    // Pigs: ~3-4% of BW for growers, more for lactating sows
    return (bw || 80) * 0.032
  }
  if (species === 'poultry') {
    // Poultry intake in g/d converted to kg/d
    const intakeG = parseFloat(prod.dmi) || 130
    return intakeG / 1000
  }
  return (bw || 500) * 0.02
}

function effectiveDeg(aN: number, bN: number, cN: number, kp: number): number {
  return cN + kp === 0 ? aN : aN + (bN * cN) / (cN + kp)
}

function calculateMP(ings: any[], totalME: number, dmi: number) {
  let totalRDP_pct = 0, totalUDP_pct = 0, totalCP_pct = 0
  ings.forEach(fi => {
    const ing = fi.ingredient; if (!ing || !ing.cp_pct) return
    const cpC = ing.cp_pct * (fi.inclusion_pct || 0) / 100; totalCP_pct += cpC
    if (ing.an_frac != null && ing.bn_frac != null && ing.cn_rate != null) {
      const kp = ing.particle_class === 'forage' ? 0.03 : 0.05
      const deg = effectiveDeg(ing.an_frac, ing.bn_frac, ing.cn_rate, kp)
      totalRDP_pct += cpC * deg; totalUDP_pct += cpC * (1 - deg)
    } else { totalRDP_pct += cpC * 0.65; totalUDP_pct += cpC * 0.35 }
  })
  // Convert to g/d using DMI
  const totalRDP = totalRDP_pct / 100 * dmi * 1000
  const totalUDP = totalUDP_pct / 100 * dmi * 1000
  const totalCP = totalCP_pct / 100 * dmi * 1000
  const fme = totalME * 0.85 * dmi // MJ/d
  const mcpE = 11 * fme // g MCP/d (11g microbial protein per MJ FME)
  const mcpN = 0.8 * totalRDP // g MCP/d (N-limited)
  const mcp = Math.min(mcpE, mcpN)
  const mpMic = mcp * 0.75 * 0.85
  const mpByp = totalUDP * 0.90
  return { totalCP, totalRDP, totalUDP, fme, mcp, mpFromMicrobes: mpMic, mpFromBypass: mpByp, mpSupply: mpMic + mpByp }
}

function calculateMPDemand(species: string, prod: Record<string,string>): number {
  const bw = parseFloat(prod.body_weight) || (species === 'cattle' ? 550 : species === 'beef' ? 450 : species === 'sheep' ? 65 : 80)
  // Maintenance: Endogenous urinary N + metabolic faecal N + dermal losses
  // AFRC 1993: 2.19 × BW^0.75 g/d
  const maint = 2.19 * Math.pow(bw, 0.75)

  if (species === 'cattle') {
    const my = parseFloat(prod.milk_yield) || 0
    const mp2 = parseFloat(prod.milk_protein) || 3.3
    // Milk protein: yield × protein% × 1000 / efficiency (0.68)
    const milkMP = my > 0 ? my * (mp2 / 100) * 1000 / 0.68 : 0
    // Growth/body weight change
    const lwg = parseFloat(prod.lwg) || 0
    const growth = lwg > 0 ? lwg * 150 / 0.59 : 0
    // Pregnancy (increases exponentially in last trimester)
    const daysPreg = parseFloat(prod.days_pregnant) || 0
    const pregMP = daysPreg > 200 ? daysPreg * 1.5 : daysPreg > 0 ? daysPreg * 0.7 : 0
    return maint + milkMP + growth + pregMP
  }
  if (species === 'beef') {
    const adg = parseFloat(prod.target_adg) || 0
    const growth = adg > 0 ? adg * 150 / 0.59 : 0
    return maint + growth
  }
  if (species === 'sheep') {
    const adg = parseFloat(prod.target_adg) || 0
    const growth = adg > 0 ? adg * 120 / 0.59 : 0
    // Wool: ~2g MP per g clean wool growth
    const woolGrowth = parseFloat(prod.wool_growth) || 0
    const woolMP = woolGrowth > 0 ? woolGrowth / 365 * 1000 * 2 : 0
    return maint + growth + woolMP
  }
  return maint
}

function estimateMethane(me: number, dmi: number) {
  if (dmi <= 0 || me <= 0) return { ch4_g: 0, ch4_int: 0 }
  const gei = dmi * me / 0.60
  const mj = 0.065 * gei
  return { ch4_g: mj / 0.0556, ch4_int: mj / 0.0556 / dmi }
}

// ── OPTIMIZER (Coordinate Descent + Fine-tuning) ─────────
interface OptConstraint { key: string; label: string; enabled: boolean; min: number; max: number }
interface OptIngConstraint { idx: number; min: number; max: number }

function runOptimizer(
  ings: any[], prices: Record<string,number>,
  constraints: OptConstraint[], ingConstraints: OptIngConstraint[],
  iterations: number = 10000
): { solution: number[]; cost: number; feasible: boolean; improved: boolean } {
  const n = ings.length
  if (n === 0) return { solution: [], cost: 0, feasible: false, improved: false }

  let current = ings.map(fi => fi.inclusion_pct || 0)
  const currentTotal = current.reduce((s, v) => s + v, 0)
  if (currentTotal < 1) {
    const unlocked = ings.map((fi, i) => fi.locked ? -1 : i).filter(i => i >= 0)
    if (unlocked.length === 0) return { solution: current, cost: 0, feasible: false, improved: false }
    const each = 100 / unlocked.length
    current = ings.map((fi, i) => fi.locked ? fi.inclusion_pct : each)
  } else if (currentTotal < 95 || currentTotal > 105) {
    const scale = 100 / currentTotal
    current = current.map((v, i) => ings[i].locked ? v : v * scale)
  }
  const originalCost = calcSolCost(current)

  function calcNutSol(sol: number[], key: string): number {
    return sol.reduce((s, pct, i) => s + (ings[i].ingredient?.[key] || 0) * pct / 100, 0)
  }
  function calcSolCost(sol: number[]): number {
    const totalAF = sol.reduce((s, pct, i) => s + pct / 100 * 1000 / ((ings[i].ingredient?.dm_pct || 88) / 100), 0)
    return sol.reduce((s, pct, i) => {
      const afKg = pct / 100 * 1000 / ((ings[i].ingredient?.dm_pct || 88) / 100)
      return s + (prices[ings[i].ingredient_id] || 0) * (totalAF > 0 ? afKg / totalAF : 0)
    }, 0)
  }
  function isFeasible(sol: number[]): boolean {
    const total = sol.reduce((s, v) => s + v, 0)
    if (total < 99.5 || total > 100.5) return false
    for (const c of constraints) {
      if (!c.enabled) continue
      const val = calcNutSol(sol, c.key)
      if (val < c.min - 0.01 || val > c.max + 0.01) return false
    }
    for (const ic of ingConstraints) {
      if (sol[ic.idx] < ic.min - 0.01 || sol[ic.idx] > ic.max + 0.01) return false
    }
    return true
  }

  let best = [...current]
  let bestCost = isFeasible(best) ? calcSolCost(best) : Infinity

  // Phase 1: Coordinate descent — systematic pairwise optimization
  for (let pass = 0; pass < 20; pass++) {
    let improved = false
    for (let i = 0; i < n; i++) {
      if (ings[i].locked) continue
      for (let j = 0; j < n; j++) {
        if (i === j || ings[j].locked) continue
        let lo = 0, hi = Math.min(best[i], 60)
        for (let bs = 0; bs < 20; bs++) {
          const mid = (lo + hi) / 2
          const candidate = [...best]
          candidate[i] = Math.max(0, best[i] - mid)
          candidate[j] = Math.min(100, best[j] + mid)
          if (isFeasible(candidate) && calcSolCost(candidate) < bestCost) { lo = mid } else { hi = mid }
        }
        if (lo > 0.05) {
          const final2 = [...best]
          final2[i] = Math.max(0, best[i] - lo)
          final2[j] = Math.min(100, best[j] + lo)
          if (isFeasible(final2)) {
            const newCost = calcSolCost(final2)
            if (newCost < bestCost - 0.01) { best = final2; bestCost = newCost; improved = true }
          }
        }
      }
    }
    if (!improved) break
  }

  // Phase 2: Fine-tuning with random perturbations
  for (let iter = 0; iter < iterations; iter++) {
    const candidate = [...best]
    const step = 0.1 + Math.random() * 0.5
    const i = Math.floor(Math.random() * n)
    const j = Math.floor(Math.random() * n)
    if (i === j || ings[i].locked || ings[j].locked) continue
    candidate[i] = Math.max(0, candidate[i] - step)
    candidate[j] = Math.max(0, candidate[j] + step)
    if (isFeasible(candidate)) {
      const cost = calcSolCost(candidate)
      if (cost < bestCost) { best = candidate; bestCost = cost }
    }
  }

  return {
    solution: best.map(v => Math.round(v * 10) / 10),
    cost: bestCost, feasible: bestCost < Infinity,
    improved: bestCost < originalCost - 0.5
  }
}

// ── MAIN COMPONENT ───────────────────────────────────────
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
  const [rightTab, setRightTab] = useState<'balance'|'rumen'|'cost'>('balance')
  const [showAddIng, setShowAddIng] = useState(false)
  const [ingSearch, setIngSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [production, setProduction] = useState<Record<string,string>>({})
  const [showProduction, setShowProduction] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReview, setAiReview] = useState<string|null>(null)
  const [showAi, setShowAi] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [basis, setBasis] = useState<'dm'|'asfed'>('dm')
  const [ingCatFilter, setIngCatFilter] = useState('')
  const [showOptimizer, setShowOptimizer] = useState(false)
  const [optRunning, setOptRunning] = useState(false)
  const [optResult, setOptResult] = useState<any>(null)
  const [optConstraints, setOptConstraints] = useState<OptConstraint[]>([
    { key: 'me_mj', label: 'ME (MJ/kg)', enabled: true, min: 10.5, max: 13.5 },
    { key: 'cp_pct', label: 'CP (%)', enabled: true, min: 14, max: 20 },
    { key: 'ndf_pct', label: 'NDF (%)', enabled: false, min: 25, max: 45 },
    { key: 'ee_pct', label: 'Fat (%)', enabled: false, min: 2, max: 7 },
    { key: 'ca_pct', label: 'Ca (%)', enabled: false, min: 0.4, max: 1.0 },
    { key: 'p_pct', label: 'P (%)', enabled: false, min: 0.25, max: 0.50 },
    { key: 'starch_pct', label: 'Starch (%)', enabled: false, min: 15, max: 35 },
  ])
  const [showCompare, setShowCompare] = useState(false)
  const [compareSlots, setCompareSlots] = useState<(CompareSlot|null)[]>([null, null, null, null])

  useEffect(() => { loadFormula() }, [params.id])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadFormula() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: f } = await supabase.from('formulas').select('*, client:nutrition_clients(id, name, location, species)').eq('id', params.id).single()
    if (!f) { router.push('/formulas'); return }
    setFormula(f); if (f.ai_review) setAiReview(f.ai_review)
    // Load linked animal group and pre-fill production
    if (f.animal_group_id) {
      const { data: ag } = await supabase.from('client_animals').select('*').eq('id', f.animal_group_id).single()
      if (ag) {
        const prefill: Record<string,string> = {}
        if (ag.avg_weight_kg) prefill.body_weight = String(ag.avg_weight_kg)
        if (ag.milk_yield) prefill.milk_yield = String(ag.milk_yield)
        if (ag.milk_fat) prefill.milk_fat = String(ag.milk_fat)
        if (ag.milk_protein) prefill.milk_protein = String(ag.milk_protein)
        if (ag.days_in_milk) prefill.days_in_milk = String(ag.days_in_milk)
        if (ag.days_pregnant) prefill.days_pregnant = String(ag.days_pregnant)
        if (ag.target_adg) prefill.target_adg = String(ag.target_adg)
        if (ag.target_fcr) prefill.target_fcr = String(ag.target_fcr)
        if (ag.body_condition) prefill.body_condition = String(ag.body_condition)
        if (ag.frame_score) prefill.frame_score = String(ag.frame_score)
        if (ag.days_on_feed) prefill.days_on_feed = String(ag.days_on_feed)
        if (ag.sale_weight) prefill.sale_weight = String(ag.sale_weight)
        if (ag.price_per_kg) prefill.price_per_kg = String(ag.price_per_kg)
        setProduction(prev => ({ ...prefill, ...prev }))
      }
    }
    const { data: fi } = await supabase.from('formula_ingredients').select('*, ingredient:ingredients(*)').eq('formula_id', params.id)
    setIngs(fi || [])
    const { data: allIng } = await supabase.from('ingredients').select('*').or(`nutritionist_id.is.null${user?',nutritionist_id.eq.'+user.id:''}`).order('name')
    setAllIngredients(allIng || [])
    // Load requirements: breed-specific → generic → any match
    let req = null
    if (f.breed) {
      const { data: breedReq } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).eq('breed', f.breed).is('nutritionist_id', null).limit(1).single()
      req = breedReq
    }
    if (!req) {
      const { data: genericReq } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).is('nutritionist_id', null).is('breed', null).limit(1).single()
      req = genericReq
    }
    if (!req) {
      const { data: anyReq } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).is('nutritionist_id', null).limit(1).single()
      req = anyReq
    }
    if (req) { setRequirements(req.requirements||[]); setRatios(req.ratios||[]); setStageName(req.stage_name||f.production_stage) }
    const { data: rules } = await supabase.from('safety_rules').select('*').eq('species', f.species).is('nutritionist_id', null).eq('active', true)
    setSafetyRules(rules || [])
    if (user) { const { data: pr } = await supabase.from('ingredient_prices').select('ingredient_id, price_per_tonne').eq('nutritionist_id', user.id).order('effective_date', { ascending: false }); const pm: Record<string,number> = {}; pr?.forEach((p: any) => { if (!pm[p.ingredient_id]) pm[p.ingredient_id] = p.price_per_tonne }); setPrices(pm) }
  }

  // ── CALCULATIONS ───────────────────────────────────────
  const batchKg = formula?.batch_size_kg || 1000
  const totalPctDM = ings.reduce((s, fi) => s + (fi.inclusion_pct || 0), 0)
  function calcNut(key: string): number { return ings.reduce((s, fi) => s + (fi.ingredient?.[key]||0)*(fi.inclusion_pct||0)/100, 0) }
  const getAsFedKg = (fi: any) => (fi.inclusion_pct||0)/100*batchKg/((fi.ingredient?.dm_pct||88)/100)
  const totalAsFedKg = ings.reduce((s, fi) => s + getAsFedKg(fi), 0)
  const avgDMPct = totalAsFedKg > 0 ? (totalPctDM/100*batchKg)/totalAsFedKg*100 : 0
  const costAF = ings.reduce((s, fi) => { const afP=totalAsFedKg>0?getAsFedKg(fi)/totalAsFedKg:0; return s+(prices[fi.ingredient_id]||0)*afP }, 0)

  const cp=calcNut('cp_pct'),me=calcNut('me_mj'),ndf=calcNut('ndf_pct'),adf=calcNut('adf_pct'),ee=calcNut('ee_pct'),starch=calcNut('starch_pct')
  const ca=calcNut('ca_pct'),pp=calcNut('p_pct'),mg=calcNut('mg_pct'),k=calcNut('k_pct'),na=calcNut('na_pct'),s2=calcNut('s_pct')
  const lys=calcNut('lysine_pct'),met2=calcNut('methionine_pct'),thr=calcNut('threonine_pct')
  const caP=pp>0?ca/pp:0
  const foragePct=ings.reduce((s,fi)=>fi.ingredient?.particle_class==='forage'?s+(fi.inclusion_pct||0):s,0)
  const concPct=ings.reduce((s,fi)=>fi.ingredient?.particle_class==='concentrate'?s+(fi.inclusion_pct||0):s,0)
  const fcRatio=foragePct+concPct>0?`${Math.round(foragePct/(foragePct+concPct)*100)}:${Math.round(concPct/(foragePct+concPct)*100)}`:'—'
  const peNDF=ings.reduce((s,fi)=>s+(fi.ingredient?.ndf_pct||0)*(fi.ingredient?.pendf_factor||0)*(fi.inclusion_pct||0)/100,0)
  const dcad=ings.reduce((s,fi)=>s+(fi.ingredient?.dcad||0)*(fi.inclusion_pct||0)/100,0)

  // Energy equations (NRC — equations use Mcal, we work in MJ)
  const de = me > 0 ? me / 0.82 : 0
  const tdn = de > 0 ? de * 100 / 18.4 : 0
  const nel = me > 0 ? 0.703 * me - 0.19 : 0
  const meMcal = me / 4.184
  const nem = me > 0 ? (1.37 * meMcal - 0.138 * meMcal * meMcal + 0.0105 * meMcal * meMcal * meMcal - 1.12) * 4.184 : 0
  const neg = me > 0 ? (1.42 * meMcal - 0.174 * meMcal * meMcal + 0.0122 * meMcal * meMcal * meMcal - 1.65) * 4.184 : 0

  // DMI prediction (must be before MP calculation)
  // DMI prediction (species-aware, must be before MP)
  const actualDMI = parseFloat(production.dmi) || 0
  const predictedDMI = formula ? predictDMI(formula.species, production, me) : 10
  const useDMI = actualDMI || predictedDMI
  const dmiPct = predictedDMI > 0 && actualDMI > 0 ? (actualDMI / predictedDMI * 100) : 0

  // MP model (g/d using DMI)
  const mpData=calculateMP(ings,me,useDMI)
  const mpDemand=formula?calculateMPDemand(formula.species,production):0
  const mpBalance=mpData.mpSupply-mpDemand

  const methane=estimateMethane(me,useDMI)
  const dmiCost=costAF/1000*useDMI
  let incomePerDay=0
  if(formula?.species==='cattle'){const my=parseFloat(production.milk_yield)||0;incomePerDay=my*(parseFloat(production.milk_fat)||4)/100*(formula.milk_price_fat||5.10)+my*(parseFloat(production.milk_protein)||3.3)/100*(formula.milk_price_protein||7.10)}
  else{incomePerDay=(parseFloat(production.target_adg)||0)*(parseFloat(production.price_per_kg)||0)}
  const marginPerDay=incomePerDay-dmiCost

  function findReq(short: string): Req|undefined { return requirements.find(r=>{const n=r.nutrient.toLowerCase();if(short==='cp')return n.includes('crude protein')||n.includes(' cp');if(short==='me')return n.includes('energy')||n.includes(' me ')||n.includes(' de ');if(short==='ndf')return n.includes('ndf');if(short==='ee')return n.includes('fat')||n.includes('ether');if(short==='ca')return n.includes('calcium');if(short==='p')return n.includes('phosphorus')||n.includes('available p');if(short==='lys')return n.includes('lysine');return false}) }
  const balanceNuts=[{s:'cp',l:'CP',v:cp,u:'%'},{s:'me',l:'ME',v:me,u:'MJ'},{s:'ndf',l:'NDF',v:ndf,u:'%'},{s:'ee',l:'EE',v:ee,u:'%'},{s:'ca',l:'Ca',v:ca,u:'%'},{s:'p',l:'P',v:pp,u:'%'},{s:'lys',l:'Lys',v:lys,u:'%'}]
  let metC=0,warnC=0,failC=0
  balanceNuts.forEach(nt=>{const req=findReq(nt.s);if(!req)return;const inR=(req.min!=null&&req.max!=null)?nt.v>=req.min&&nt.v<=req.max:(req.min!=null?nt.v>=req.min:true)&&(req.max!=null?nt.v<=req.max:true);const crit=(req.critical_max!=null&&nt.v>req.critical_max)||(req.critical_min!=null&&nt.v<req.critical_min);if(crit)failC++;else if(inR)metC++;else warnC++})

  const isRuminant=['cattle','beef','sheep'].includes(formula?.species||'')

  // ── ACTIONS ────────────────────────────────────────────
  function updateIngPct(idx: number,pct: number){const u=[...ings];u[idx]={...u[idx],inclusion_pct:pct};setIngs(u);setSaved(false)}
  function toggleLock(idx: number){const u=[...ings];u[idx]={...u[idx],locked:!u[idx].locked};setIngs(u)}
  function removeIng(idx: number){setIngs(ings.filter((_,i)=>i!==idx));setSaved(false)}

  async function addIngredient(ingId: string){if(ings.some(fi=>fi.ingredient_id===ingId))return;const supabase=await getSupabase();const{data}=await supabase.from('formula_ingredients').insert({formula_id:params.id,ingredient_id:ingId,inclusion_pct:0,locked:false}).select('*, ingredient:ingredients(*)').single();if(data){setIngs([...ings,data]);setShowAddIng(false);setSaved(false)}}

  async function handleSave(){setSaving(true);const supabase=await getSupabase();await supabase.from('formula_ingredients').delete().eq('formula_id',params.id);if(ings.length>0){await supabase.from('formula_ingredients').insert(ings.map(fi=>({formula_id:params.id as string,ingredient_id:fi.ingredient_id,inclusion_pct:fi.inclusion_pct,inclusion_kg:fi.inclusion_pct/100*batchKg,cost_per_tonne:prices[fi.ingredient_id]||null,locked:fi.locked})))}
  await supabase.from('formulas').update({total_cost_per_tonne:costAF,total_cp_pct:cp,total_me_mj:me,total_income_per_day:incomePerDay,total_margin_per_day:marginPerDay}).eq('id',params.id);setSaving(false);setSaved(true)}

  async function updateStatus(st: string){const supabase=await getSupabase();await supabase.from('formulas').update({status:st}).eq('id',params.id);setFormula({...formula,status:st})}

  // ── EXPORT ─────────────────────────────────────────────
  function handleExport() {
    if (!formula || ings.length === 0) return
    const headers = ['Ingredient','Category','Type','Inclusion_DM_pct','DM_kg','AsFed_kg','DM_pct','CP_pct','ME_MJ','NDF_pct','ADF_pct','Fat_pct','Starch_pct','Ca_pct','P_pct','NEm_MJ','NEl_MJ','aN','bN','cN','Price_per_t']
    const rows = ings.filter(fi => fi.inclusion_pct > 0).map(fi => {
      const ing = fi.ingredient
      const dmKg = fi.inclusion_pct / 100 * batchKg
      const afKg = dmKg / ((ing?.dm_pct || 88) / 100)
      return [ing?.name, ing?.category, ing?.particle_class, fi.inclusion_pct.toFixed(2), dmKg.toFixed(1), afKg.toFixed(1), ing?.dm_pct, ing?.cp_pct, ing?.me_mj, ing?.ndf_pct, ing?.adf_pct, ing?.ee_pct, ing?.starch_pct, ing?.ca_pct, ing?.p_pct, ing?.nem_mj||nem.toFixed(2), ing?.nel_mj||nel.toFixed(2), ing?.an_frac, ing?.bn_frac, ing?.cn_rate, prices[fi.ingredient_id] || ''].join(',')
    })
    const meta = [`# Formula: ${formula.name}`,`# Version: ${formula.version}`,`# Species: ${formula.species}`,`# Stage: ${stageName || formula.production_stage}`,`# Client: ${formula.client?.name || 'N/A'}`,`# Batch: ${batchKg} kg`,`# Date: ${new Date().toISOString().split('T')[0]}`,`# Cost/t AF: $${costAF.toFixed(0)}`,`# CP: ${cp.toFixed(1)}%  ME: ${me.toFixed(1)} MJ  NDF: ${ndf.toFixed(1)}%  F:C: ${fcRatio}`,`# MP Supply: ${mpData.mpSupply.toFixed(0)}g/d  Demand: ${mpDemand.toFixed(0)}g/d  Balance: ${mpBalance.toFixed(0)}g/d`,`# NEl: ${nel.toFixed(1)} MJ  NEm: ${nem.toFixed(1)} MJ  NEg: ${neg.toFixed(1)} MJ  TDN: ${tdn.toFixed(1)}%`,`# Model: AFRC/CSIRO`,'']
    const csv = [...meta, headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${formula.name.replace(/[^a-zA-Z0-9]/g, '_')}_v${formula.version}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  // ── OPTIMIZER ──────────────────────────────────────────
  function handleRunOptimizer() {
    setOptRunning(true); setOptResult(null)
    const ingC: OptIngConstraint[] = ings.map((fi, idx) => ({ idx, min: fi.locked ? fi.inclusion_pct : 0, max: fi.locked ? fi.inclusion_pct : (fi.ingredient?.max_inclusion_pct || 60) }))
    setTimeout(() => { const result = runOptimizer(ings, prices, optConstraints, ingC, 8000); setOptResult(result); setOptRunning(false) }, 100)
  }

  function applyOptResult() { if (!optResult?.solution) return; const updated = ings.map((fi, idx) => ({ ...fi, inclusion_pct: optResult.solution[idx] || 0 })); setIngs(updated); setSaved(false); setShowOptimizer(false) }

  // ── COMPARE ────────────────────────────────────────────
  function saveToCompareSlot(slotIdx: number) { const slots = [...compareSlots]; slots[slotIdx] = { name: `Diet ${slotIdx+1} — ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`, ings: ings.map(fi => ({ name: fi.ingredient?.name, pct: fi.inclusion_pct, id: fi.ingredient_id })), production: { ...production }, nutrients: { cp, me, ndf, ee, ca, p: pp, starch, caP, peNDF }, cost: costAF, margin: marginPerDay, mp: mpData.mpSupply, fc: fcRatio, timestamp: new Date() }; setCompareSlots(slots) }
  function recallFromSlot(slotIdx: number) { const slot = compareSlots[slotIdx]; if (!slot) return; const updated = ings.map(fi => { const saved2 = slot.ings.find((si: any) => si.id === fi.ingredient_id); return saved2 ? { ...fi, inclusion_pct: saved2.pct } : { ...fi, inclusion_pct: 0 } }); setIngs(updated); setProduction(slot.production); setSaved(false) }
  function clearSlot(idx: number) { const s=[...compareSlots]; s[idx]=null; setCompareSlots(s) }

  // ── AI ──────────────────────────────────────────────────
  function buildCtx(){return`FORMULA: ${formula.name} (v${formula.version})\nSPECIES: ${formula.species} | STAGE: ${stageName}\nCP:${cp.toFixed(1)}% ME:${me.toFixed(1)} NDF:${ndf.toFixed(1)}% F:C:${fcRatio} peNDF:${peNDF.toFixed(1)}% DCAD:${dcad.toFixed(0)}\nMP supply:${mpData.mpSupply.toFixed(0)}g/d demand:${mpDemand.toFixed(0)}g/d balance:${mpBalance>0?'+':''}${mpBalance.toFixed(0)}g/d\nDMI:${useDMI.toFixed(1)}kg/d NEl:${nel.toFixed(1)} NEm:${nem.toFixed(1)} NEg:${neg.toFixed(1)} TDN:${tdn.toFixed(1)}%\nCost:$${costAF.toFixed(0)}/t Margin:$${marginPerDay.toFixed(2)}/d\n${ings.map(fi=>`${fi.ingredient?.name}: ${fi.inclusion_pct.toFixed(1)}% ${fi.ingredient?.particle_class==='forage'?'[F]':'[C]'}`).join('\n')}`}
  async function handleAiReview(){setAiLoading(true);setShowAi(true);setAiReview(null);try{const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`Full review. MP, DMI, F:C, DCAD, methane, margin, energy systems. AU context.\n\n${buildCtx()}`})});const data=await res.json();setAiReview(data.response||'No response.');const supabase=await getSupabase();await supabase.from('formulas').update({ai_review:data.response,ai_reviewed_at:new Date().toISOString()}).eq('id',params.id)}catch{setAiReview('Error.')}setAiLoading(false)}
  async function handleAiQ(){if(!aiQuestion.trim())return;setAiLoading(true);const q=aiQuestion;setAiQuestion('');try{const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`${q}\n\n${buildCtx()}`})});const data=await res.json();setAiReview(data.response||'No response.')}catch{setAiReview('Error.')}setAiLoading(false)}

  if (!formula) return <div className="p-7 text-text-ghost">Loading...</div>
  const prodFields = PRODUCTION_FIELDS[formula.species]||PRODUCTION_FIELDS.beef
  const addableIngs = allIngredients.filter(i=>{if(ings.some(fi=>fi.ingredient_id===i.id)) return false; if(!(i.species_suitable as string[]||[]).includes(formula.species)) return false; if(ingSearch&&!i.name.toLowerCase().includes(ingSearch.toLowerCase())) return false; if(ingCatFilter==='forage'&&i.particle_class!=='forage') return false; if(ingCatFilter==='concentrate'&&i.particle_class!=='concentrate') return false; if(ingCatFilter==='energy'&&i.category!=='energy') return false; if(ingCatFilter==='protein'&&i.category!=='protein') return false; if(ingCatFilter==='byproduct'&&i.category!=='byproduct') return false; if(ingCatFilter==='mineral'&&i.category!=='mineral') return false; if(ingCatFilter==='premix'&&i.source!=='premix') return false; return true})

  return (
    <div className="p-4 max-w-[1400px] h-[calc(100vh-32px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2"><Link href="/formulas" className="text-text-ghost hover:text-text-muted no-underline text-sm">&larr;</Link><h1 className="text-xl font-bold text-text">{formula.name}</h1>
            <select value={formula.status} onChange={e=>updateStatus(e.target.value)} className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase border-none cursor-pointer ${formula.status==='draft'?'bg-status-amber/15 text-status-amber':formula.status==='review'?'bg-status-blue/15 text-status-blue':'bg-brand/15 text-brand'}`}>{['draft','review','approved','active'].map(s=><option key={s} value={s}>{s}</option>)}</select>
            <span className="text-xs text-text-ghost font-mono">v{formula.version}</span></div>
          <p className="text-xs text-text-ghost mt-0.5">{formula.client?.name||'—'} &middot; {formula.species} &middot; {stageName||formula.production_stage} &middot; {batchKg}kg</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={()=>setShowCompare(true)} className="btn btn-ghost btn-sm" title="Compare"><GitCompare size={14}/> Compare</button>
          <button onClick={()=>{setOptResult(null);setShowOptimizer(true)}} className="btn btn-ghost btn-sm" title="Optimize"><Zap size={14}/> Optimize</button>
          <button onClick={handleExport} className="btn btn-ghost btn-sm" title="Export CSV"><Download size={14}/> Export</button>
          <button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm"><Sparkles size={14}/> AI</button>
          <button onClick={handleSave} disabled={saving} className={`btn btn-primary btn-sm ${saved?'bg-brand/50':''}`}><Save size={14}/> {saved?'\u2713':'Save'}</button>
        </div>
      </div>

      {/* Production */}
      <div className="mb-1.5"><button onClick={()=>setShowProduction(!showProduction)} className="flex items-center gap-1 text-2xs font-bold text-text-ghost uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-text-muted">Production {showProduction?<ChevronUp size={10}/>:<ChevronDown size={10}/>}</button>
        {showProduction&&<div className="grid grid-cols-8 gap-1.5 mt-1.5 p-2.5 bg-surface-card rounded-lg border border-border">{prodFields.map(f=>(<div key={f.key}><label className="text-[10px] text-text-ghost block">{f.label} ({f.unit})</label><input value={production[f.key]||''} onChange={e=>setProduction({...production,[f.key]:e.target.value})} placeholder={f.placeholder} className="w-full px-1.5 py-1 rounded border border-border bg-surface-deep text-text-dim text-xs font-mono outline-none focus:border-brand"/></div>))}</div>}
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-2 mb-2 px-2.5 py-1 bg-surface-card rounded-lg border border-border text-xs flex-wrap">
        <button onClick={()=>setBasis(basis==='dm'?'asfed':'dm')} className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface-deep cursor-pointer hover:border-brand/30">{basis==='dm'?<ToggleLeft size={12} className="text-brand"/>:<ToggleRight size={12} className="text-status-amber"/>}<span className={`font-bold font-mono text-2xs ${basis==='dm'?'text-brand':'text-status-amber'}`}>{basis==='dm'?'DM':'AF'}</span></button>
        <span className="font-mono font-bold text-brand">{metC}met</span>{warnC>0&&<span className="font-mono font-bold text-status-amber">{warnC}w</span>}{failC>0&&<span className="font-mono font-bold text-status-red">{failC}c</span>}
        <span className="text-text-ghost">|</span><span className={`font-mono font-bold ${totalPctDM>100.1||totalPctDM<99.9?'text-status-red':'text-brand'}`}>{totalPctDM.toFixed(1)}%</span>
        <span className="text-text-ghost">F:C</span><span className="font-mono font-bold text-text-dim">{fcRatio}</span>
        {isRuminant&&<><span className="text-text-ghost">MP</span><span className={`font-mono font-bold ${mpBalance>=0?'text-brand':'text-status-red'}`}>{mpBalance>0?'+':''}{mpBalance.toFixed(0)}g</span></>}
        {dmiPct>0&&<><span className="text-text-ghost">DMI</span><span className={`font-mono font-bold ${dmiPct>102?'text-status-red':dmiPct>95?'text-brand':'text-status-amber'}`}>{dmiPct.toFixed(0)}%</span></>}
        <div className="flex-1"/><span className="font-mono font-bold text-status-amber">${costAF.toFixed(0)}/t</span>
        {marginPerDay!==0&&<span className={`font-mono font-bold ${marginPerDay>0?'text-brand':'text-status-red'}`}>${marginPerDay>0?'+':''}${marginPerDay.toFixed(2)}/d</span>}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[1fr_330px] gap-3 flex-1 min-h-0">
        {/* Ingredients */}
        <div className="card flex flex-col">
          <div className="card-header"><span className="text-xs font-bold text-text-muted uppercase tracking-wider">Ingredients ({ings.length})</span><button onClick={()=>{setIngSearch('');setShowAddIng(true)}} className="btn btn-ghost btn-sm"><Plus size={14}/> Add</button></div>
          <div className="flex-1 overflow-auto">
            {ings.map((fi,idx)=>{const ing=fi.ingredient;if(!ing)return null;const price=prices[fi.ingredient_id];const dmKg=(fi.inclusion_pct||0)/100*batchKg;const afKg=getAsFedKg(fi);const dispKg=basis==='dm'?dmKg:afKg
            return(<div key={fi.id||idx} className="grid grid-cols-[20px_1fr_65px_50px_45px_20px_20px] px-2 py-1.5 border-b border-border/5 items-center gap-1">
              <button onClick={()=>toggleLock(idx)} className={`bg-transparent border-none cursor-pointer flex ${fi.locked?'text-status-amber':'text-text-ghost/30'}`}>{fi.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
              <div><div className="text-sm font-semibold text-text-dim truncate">{ing.name}</div><div className="text-[10px] text-text-ghost font-mono">{ing.category}{price?' $'+price.toFixed(0):''}</div></div>
              <input type="range" min="0" max="60" step="0.5" value={fi.inclusion_pct} onChange={e=>updateIngPct(idx,parseFloat(e.target.value))}/>
              <input type="number" value={fi.inclusion_pct} step="0.5" min="0" max="100" onChange={e=>updateIngPct(idx,parseFloat(e.target.value)||0)} className="w-full px-1 py-0.5 rounded border border-border bg-surface-deep text-text-dim text-xs font-mono text-right outline-none focus:border-brand"/>
              <span className="text-[10px] text-text-ghost font-mono text-right">{dispKg.toFixed(0)}kg</span>
              <span className={`text-[10px] font-mono text-center ${ing.particle_class==='forage'?'text-brand':'text-text-ghost'}`}>{ing.particle_class==='forage'?'F':'C'}</span>
              <button onClick={()=>removeIng(idx)} className="bg-transparent border-none cursor-pointer text-text-ghost/30 hover:text-status-red"><X size={11}/></button>
            </div>)})}
            {ings.length===0&&<div className="px-4 py-10 text-center"><p className="text-sm text-text-ghost mb-3">No ingredients.</p><button onClick={()=>setShowAddIng(true)} className="btn btn-primary btn-sm"><Plus size={14}/> Add</button></div>}
          </div>
          {ings.length>0&&<div className="px-2 py-1.5 border-t-2 border-border flex items-center gap-3 text-[10px] font-bold">
            <span className={`font-mono ${totalPctDM>100.1||totalPctDM<99.9?'text-status-red':'text-brand'}`}>{totalPctDM.toFixed(1)}% DM</span>
            <span className="font-mono text-text-dim">{totalAsFedKg.toFixed(0)}kg AF</span>
            <span className="font-mono text-text-ghost">Mix DM {avgDMPct.toFixed(1)}%</span>
            <span className="font-mono text-text-ghost">F:C {fcRatio}</span>
          </div>}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-0 overflow-hidden">
          <div className="flex gap-px bg-border rounded overflow-hidden mb-2">{(['balance','rumen','cost'] as const).map(t=>(<button key={t} onClick={()=>setRightTab(t)} className={`flex-1 py-1 text-2xs font-bold uppercase text-center border-none cursor-pointer ${rightTab===t?'bg-brand text-white':'bg-surface-card text-text-ghost hover:text-text-muted'}`}>{t==='balance'?'\u2696 Balance':t==='rumen'?'\uD83E\uDDEC Rumen':'$ Margin'}</button>))}</div>

          {/* BALANCE */}
          {rightTab==='balance'&&<div className="card p-2.5 flex-1 overflow-auto">
            <div className="grid grid-cols-3 gap-1.5 mb-2">{[{l:'Met',v:metC,c:'text-brand'},{l:'Warn',v:warnC,c:'text-status-amber'},{l:'Crit',v:failC,c:'text-status-red'}].map((x,i)=>(<div key={i} className="bg-surface-deep rounded-lg p-1.5 text-center"><div className={`text-lg font-bold font-mono ${x.c}`}>{x.v}</div><div className="text-[9px] text-text-ghost">{x.l}</div></div>))}</div>
            {balanceNuts.map(nt=>{const req=findReq(nt.s);if(!req)return(<div key={nt.s} className="flex items-center gap-2 py-0.5"><span className="w-7 text-[10px] font-semibold text-text-muted font-mono text-right">{nt.l}</span><div className="flex-1 h-1 bg-surface-deep rounded-sm"/><span className="w-14 text-[10px] font-mono text-text text-right">{nt.v.toFixed(2)}{nt.u}</span></div>)
              const inR=(req.min!=null&&req.max!=null)?nt.v>=req.min&&nt.v<=req.max:(req.min!=null?nt.v>=req.min:true)&&(req.max!=null?nt.v<=req.max:true);const crit=(req.critical_max!=null&&nt.v>req.critical_max)||(req.critical_min!=null&&nt.v<req.critical_min)
              const color=crit?'bg-status-red':inR?'bg-brand':'bg-status-amber';const tc=crit?'text-status-red':inR?'text-brand':'text-status-amber'
              const ceil=Math.max(req.max||req.target||1,req.critical_max||0)*1.5;const pV=Math.min((nt.v/ceil)*100,100);const pMin=req.min!=null?(req.min/ceil)*100:0;const pMax=req.max!=null?(req.max/ceil)*100:100
              return(<div key={nt.s} className="mb-1.5"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-text-muted">{nt.l}</span><span className={`text-[10px] font-bold font-mono ${tc}`}>{nt.v.toFixed(2)}{nt.u} <span className="font-normal text-text-ghost">({req.min}-{req.max})</span></span></div><div className="relative h-2.5 bg-surface-deep rounded mt-0.5"><div className="absolute h-full rounded opacity-15" style={{left:`${pMin}%`,width:`${pMax-pMin}%`,background:crit?'#E05252':inR?'#4CAF7D':'#D4A843'}}/><div className={`absolute top-1/2 w-2 h-2 rounded-full -translate-y-1/2 -translate-x-1/2 border-2 border-surface-bg ${color}`} style={{left:`${pV}%`}}/></div></div>)
            })}
            <div className="mt-2 pt-1.5 border-t border-border grid grid-cols-3 gap-1">{[['NDF',ndf,'%'],['Starch',starch,'%'],['EE',ee,'%'],['Ca:P',caP,':1'],['Mg',mg,'%'],['Na',na,'%'],['K',k,'%'],['S',s2,'%'],['ADF',adf,'%']].map(([l,v,u])=>(<div key={l as string} className="text-center"><div className="text-[8px] text-text-ghost uppercase">{l}</div><div className="text-[10px] font-mono font-bold text-text-dim">{(v as number)<1?(v as number).toFixed(3):(v as number).toFixed(1)}{u}</div></div>))}</div>
          </div>}

          {/* RUMEN */}
          {rightTab==='rumen'&&<div className="card p-2.5 flex-1 overflow-auto">
            {isRuminant?<>
              <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">Metabolisable Protein</div>
              <div className={`text-center text-xs font-bold font-mono mb-2 px-2 py-1.5 rounded-lg ${mpBalance>=0?'bg-brand/10 text-brand':'bg-status-red/10 text-status-red'}`}>MP: {mpData.mpSupply.toFixed(0)}g supply / {mpDemand.toFixed(0)}g demand = {mpBalance>0?'+':''}{mpBalance.toFixed(0)} g/d</div>
              {[['RDP',mpData.totalRDP,'g/d'],['UDP',mpData.totalUDP,'g/d'],['FME',mpData.fme,'MJ/d'],['MCP',mpData.mcp,'g/d'],['MP microbes',mpData.mpFromMicrobes,'g/d'],['MP bypass',mpData.mpFromBypass,'g/d']].map(([l,v,u])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold text-text-dim">{(v as number).toFixed(0)} {u}</span></div>))}
              <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">Rumen Health</div>
              {[['F:C',fcRatio,foragePct<30?'text-status-red':foragePct<40?'text-status-amber':'text-brand'],['peNDF',peNDF.toFixed(1)+'%',peNDF<18?'text-status-red':peNDF<22?'text-status-amber':'text-brand'],['DCAD',dcad.toFixed(0)+' mEq/kg','text-text-dim']].map(([l,v,c])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className={`text-[10px] font-mono font-bold ${c}`}>{v}</span></div>))}</div>
              {dmiPct>0&&<div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">DMI</div><div className={`text-center text-xs font-bold font-mono px-2 py-1 rounded ${dmiPct>102?'bg-status-red/10 text-status-red':dmiPct>95?'bg-brand/10 text-brand':'bg-status-amber/10 text-status-amber'}`}>Actual {actualDMI.toFixed(1)} / Predicted {predictedDMI.toFixed(1)} = {dmiPct.toFixed(0)}%</div></div>}
              <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">Energy Systems</div>
              {[['ME',me.toFixed(1)+' MJ/kg'],['DE',de.toFixed(1)+' MJ/kg'],['TDN',tdn.toFixed(1)+'%'],['NEl',nel.toFixed(1)+' MJ/kg'],['NEm',nem.toFixed(1)+' MJ/kg'],['NEg',neg.toFixed(1)+' MJ/kg']].map(([l,v])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold text-text-dim">{v}</span></div>))}</div>
              <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">Methane</div>{[['CH\u2084',methane.ch4_g.toFixed(0)+' g/d'],['CH\u2084/kg DMI',methane.ch4_int.toFixed(1)+' g/kg']].map(([l,v])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono text-text-dim">{v}</span></div>))}</div>
            </>:<><div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">Amino Acids</div>{[['Lysine',lys],['Methionine',met2],['Threonine',thr]].map(([l,v])=>(<div key={l as string} className="flex justify-between py-1"><span className="text-xs text-text-muted">{l}</span><span className="text-sm font-mono font-bold text-text-dim">{(v as number).toFixed(3)}%</span></div>))}</>}
          </div>}

          {/* COST/MARGIN */}
          {rightTab==='cost'&&<div className="card p-2.5 flex-1 overflow-auto">
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="bg-surface-deep rounded-lg p-2"><div className="text-[9px] text-text-ghost">$/t AF</div><div className="text-lg font-bold text-status-amber font-mono">${costAF.toFixed(0)}</div></div>
              <div className="bg-surface-deep rounded-lg p-2"><div className="text-[9px] text-text-ghost">$/hd/d</div><div className="text-lg font-bold text-text-dim font-mono">${dmiCost.toFixed(2)}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="bg-surface-deep rounded-lg p-2"><div className="text-[9px] text-text-ghost">Income $/d</div><div className="text-base font-bold text-brand font-mono">${incomePerDay.toFixed(2)}</div></div>
              <div className={`rounded-lg p-2 ${marginPerDay>=0?'bg-brand/10':'bg-status-red/10'}`}><div className="text-[9px] text-text-ghost">Margin $/d</div><div className={`text-base font-bold font-mono ${marginPerDay>=0?'text-brand':'text-status-red'}`}>${marginPerDay.toFixed(2)}</div></div>
            </div>
            {dmiCost>0&&incomePerDay>0&&<div className="bg-surface-deep rounded-lg p-2 mb-2"><div className="text-[9px] text-text-ghost">Feed % of Income</div><div className={`text-base font-bold font-mono ${dmiCost/incomePerDay*100>65?'text-status-red':'text-brand'}`}>{(dmiCost/incomePerDay*100).toFixed(0)}%</div></div>}
            <div className="text-[9px] font-bold text-text-ghost uppercase mb-1">Breakdown</div>
            {ings.filter(fi=>fi.inclusion_pct>0).sort((a,b)=>(prices[b.ingredient_id]||0)*getAsFedKg(b)-(prices[a.ingredient_id]||0)*getAsFedKg(a)).map(fi=>{const price=prices[fi.ingredient_id]||0;const afP=totalAsFedKg>0?getAsFedKg(fi)/totalAsFedKg:0;const ingC=price*afP;const pctC=costAF>0?ingC/costAF*100:0;return(<div key={fi.id} className="flex items-center gap-1 py-0.5"><span className="text-[10px] text-text-dim flex-1 truncate">{fi.ingredient?.name}</span><div className="w-12 h-1 bg-surface-deep rounded-sm overflow-hidden"><div className="h-full bg-status-amber rounded-sm" style={{width:`${pctC}%`}}/></div><span className="text-[10px] font-mono text-status-amber w-10 text-right">${ingC.toFixed(0)}</span></div>)})}
          </div>}
        </div>
      </div>

      {/* ── ADD INGREDIENT ───────────────────────────── */}
      {showAddIng&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddIng(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="text-lg font-bold text-text">Add Ingredient</h2><span className="text-2xs text-text-ghost font-mono">{addableIngs.length} available</span><button onClick={()=>setShowAddIng(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="p-3 border-b border-border">
          <div className="relative mb-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"/><input value={ingSearch} onChange={e=>setIngSearch(e.target.value)} placeholder="Search ingredients..." className="input pl-9" autoFocus/></div>
          <div className="flex gap-1 flex-wrap">{[{k:'',l:'All'},{k:'forage',l:'\uD83C\uDF3F Forage'},{k:'concentrate',l:'\uD83C\uDF3E Concentrate'},{k:'energy',l:'\u26A1 Energy'},{k:'protein',l:'\uD83E\uDD69 Protein'},{k:'byproduct',l:'\u267B Byproduct'},{k:'mineral',l:'\uD83E\uDDEA Mineral'},{k:'premix',l:'\uD83D\uDCE6 Premix'}].map(f=>(<button key={f.k} onClick={()=>setIngCatFilter(f.k)} className={`px-2.5 py-1 rounded text-2xs font-semibold transition-all border cursor-pointer ${ingCatFilter===f.k?'border-brand bg-brand/10 text-brand':'border-border text-text-ghost hover:border-border-light bg-transparent'}`}>{f.l}</button>))}</div>
        </div>
        <div className="flex-1 overflow-auto">{addableIngs.length>0?addableIngs.map(ing=>(<div key={ing.id} onClick={()=>addIngredient(ing.id)} className="flex items-center gap-3 px-4 py-2 border-b border-border/5 hover:bg-[#253442] cursor-pointer"><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{ing.name}</div><div className="text-2xs text-text-ghost">{ing.particle_class==='forage'?'F':'C'} &middot; {ing.category} &middot; CP {ing.cp_pct||0}% &middot; ME {ing.me_mj||0} &middot; DM {ing.dm_pct||88}%</div></div>{prices[ing.id]&&<span className="text-xs font-mono text-status-amber">${prices[ing.id].toFixed(0)}/t</span>}<Plus size={14} className="text-brand"/></div>)):<div className="px-4 py-8 text-center text-sm text-text-ghost">No matching ingredients.</div>}</div>
      </div></div>}

      {/* ── OPTIMIZER ────────────────────────────────── */}
      {showOptimizer&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowOptimizer(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl p-6 shadow-2xl max-h-[80vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2.5"><Zap size={18} className="text-status-amber"/><div><div className="text-lg font-bold text-text">Least-Cost Optimizer</div><div className="text-2xs text-text-ghost">Coordinate descent + fine-tuning algorithm</div></div></div><button onClick={()=>setShowOptimizer(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">Nutrient Constraints<span className="flex-1 h-px bg-border"/></div>
        <div className="grid grid-cols-2 gap-2 mb-4">{optConstraints.map((c, i) => (<div key={c.key} className={`flex items-center gap-2 p-2.5 rounded-lg border ${c.enabled?'border-brand/30 bg-brand/5':'border-border bg-surface-bg'}`}><input type="checkbox" checked={c.enabled} onChange={e=>{const u=[...optConstraints];u[i]={...u[i],enabled:e.target.checked};setOptConstraints(u)}} className="rounded"/><span className="text-xs font-semibold text-text-dim w-20">{c.label}</span><input type="number" value={c.min} step="0.1" onChange={e=>{const u=[...optConstraints];u[i]={...u[i],min:parseFloat(e.target.value)||0};setOptConstraints(u)}} className="w-16 px-1.5 py-1 rounded border border-border bg-surface-deep text-xs font-mono text-right outline-none" disabled={!c.enabled}/><span className="text-2xs text-text-ghost">to</span><input type="number" value={c.max} step="0.1" onChange={e=>{const u=[...optConstraints];u[i]={...u[i],max:parseFloat(e.target.value)||0};setOptConstraints(u)}} className="w-16 px-1.5 py-1 rounded border border-border bg-surface-deep text-xs font-mono text-right outline-none" disabled={!c.enabled}/></div>))}</div>
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">Ingredient Limits<span className="flex-1 h-px bg-border"/></div>
        <div className="text-2xs text-text-ghost mb-2">Locked ingredients held at current value.</div>
        <div className="grid grid-cols-3 gap-1.5 mb-4">{ings.map((fi, i) => (<div key={fi.id||i} className="flex items-center gap-1.5 text-2xs"><span className={`w-3 h-3 rounded ${fi.locked?'bg-status-amber':'bg-brand/20'}`}/><span className="flex-1 truncate text-text-dim">{fi.ingredient?.name}</span><span className="font-mono text-text-ghost">{fi.locked?fi.inclusion_pct.toFixed(1)+'% \uD83D\uDD12':'0-'+(fi.ingredient?.max_inclusion_pct||60)+'%'}</span></div>))}</div>
        <div className="flex gap-2 mb-4"><button onClick={handleRunOptimizer} disabled={optRunning||ings.length===0} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{optRunning?<><Loader2 size={14} className="animate-spin"/> Optimizing...</>:<><Zap size={14}/> Run Optimizer</>}</button></div>
        {optResult&&<div className={`p-4 rounded-lg border ${optResult.feasible?'border-brand/30 bg-brand/5':'border-status-red/30 bg-status-red/5'}`}>
          <div className="flex items-center gap-2 mb-2"><span className={`text-sm font-bold ${optResult.feasible?'text-brand':'text-status-red'}`}>{optResult.feasible?'\u2713 Feasible diet found':'\u2717 No feasible solution'}</span>{optResult.improved&&<span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">IMPROVED</span>}</div>
          {optResult.feasible&&<><div className="text-xs text-text-muted mb-2">Cost: <strong className="text-status-amber font-mono">${optResult.cost.toFixed(0)}/t</strong> (was ${costAF.toFixed(0)}/t, saving <strong className="text-brand">${(costAF-optResult.cost).toFixed(0)}/t</strong>)</div><div className="grid grid-cols-3 gap-1.5 mb-3">{optResult.solution.map((pct: number, i: number) => (<div key={i} className={`flex justify-between text-2xs ${pct > 0 ? '' : 'opacity-30'}`}><span className="text-text-dim truncate">{ings[i]?.ingredient?.name}</span><span className="font-mono font-bold text-text-dim">{pct.toFixed(1)}%</span></div>))}</div><button onClick={applyOptResult} className="btn btn-primary btn-sm w-full justify-center">Apply Optimized Diet</button></>}
          {!optResult.feasible&&<div className="text-xs text-text-ghost">Try relaxing constraints or adding more ingredients.</div>}
        </div>}
      </div></div>}

      {/* ── COMPARE ──────────────────────────────────── */}
      {showCompare&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowCompare(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-4xl p-6 shadow-2xl max-h-[80vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2.5"><GitCompare size={18} className="text-brand"/><div><div className="text-lg font-bold text-text">Diet Compare</div><div className="text-2xs text-text-ghost">Save snapshots and compare side by side</div></div></div><button onClick={()=>setShowCompare(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="flex gap-2 mb-4">{[0,1,2,3].map(i=>(<button key={i} onClick={()=>saveToCompareSlot(i)} className="btn btn-ghost btn-sm flex-1 justify-center">Save to Slot {i+1}</button>))}</div>
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">Current Diet<span className="flex-1 h-px bg-border"/></div>
        <div className="grid grid-cols-8 gap-2 mb-4 p-3 bg-surface-bg rounded-lg border border-brand/20">{[['CP',cp.toFixed(1)+'%'],['ME',me.toFixed(1)],['NDF',ndf.toFixed(1)+'%'],['F:C',fcRatio],['MP bal',mpBalance.toFixed(1)],['Cost/t','$'+costAF.toFixed(0)],['Margin','$'+marginPerDay.toFixed(2)],['peNDF',peNDF.toFixed(1)+'%']].map(([l,v])=>(<div key={l as string} className="text-center"><div className="text-[8px] text-text-ghost uppercase">{l}</div><div className="text-xs font-mono font-bold text-brand">{v}</div></div>))}</div>
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">Saved Diets<span className="flex-1 h-px bg-border"/></div>
        <div className="grid grid-cols-4 gap-3">{compareSlots.map((slot, i) => (<div key={i} className={`rounded-lg border p-3 ${slot?'border-border bg-surface-card':'border-border/30 bg-surface-bg/50'}`}><div className="text-2xs font-bold text-text-ghost uppercase mb-2">Slot {i+1}</div>{slot?<><div className="text-xs font-semibold text-text-dim mb-2">{slot.name}</div>{[['CP',slot.nutrients.cp?.toFixed(1)+'%'],['ME',slot.nutrients.me?.toFixed(1)],['NDF',slot.nutrients.ndf?.toFixed(1)+'%'],['F:C',slot.fc],['Cost','$'+slot.cost.toFixed(0)+'/t'],['Margin','$'+slot.margin.toFixed(2)+'/d']].map(([l,v])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[9px] text-text-ghost">{l}</span><span className="text-[9px] font-mono font-bold text-text-dim">{v}</span></div>))}<div className="text-[9px] text-text-ghost mt-2 mb-2">{slot.ings.filter((si: any)=>si.pct>0).map((si: any)=>`${si.name}: ${si.pct.toFixed(1)}%`).join(', ')}</div><div className="flex gap-1"><button onClick={()=>recallFromSlot(i)} className="btn btn-primary btn-sm flex-1 justify-center text-2xs"><RotateCcw size={10}/> Recall</button><button onClick={()=>clearSlot(i)} className="btn btn-ghost btn-sm text-2xs"><X size={10}/></button></div></>:<div className="text-2xs text-text-ghost text-center py-6">Empty</div>}</div>))}</div>
      </div></div>}

      {/* ── AI ────────────────────────────────────────── */}
      {showAi&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAi(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><div className="flex items-center gap-2"><Sparkles size={16} className="text-brand"/><div className="text-base font-bold text-text">Optia AI Review</div></div><button onClick={()=>setShowAi(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="flex-1 overflow-auto p-4">{aiLoading&&!aiReview&&<div className="flex items-center gap-3 text-text-ghost"><Loader2 size={16} className="animate-spin"/> Analyzing...</div>}{aiReview&&<div className="text-sm text-text-dim leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{__html:aiReview.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br/>')}}/>}</div>
        <div className="p-4 border-t border-border flex gap-2"><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAiQ()} placeholder="Ask..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-brand"/><button onClick={handleAiQ} disabled={aiLoading} className="btn btn-primary btn-sm">{aiLoading?<Loader2 size={14} className="animate-spin"/>:'Ask'}</button><button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm">Re-review</button></div>
      </div></div>}
    </div>
  )
}
