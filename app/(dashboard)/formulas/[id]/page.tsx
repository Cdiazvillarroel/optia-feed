'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Sparkles, Save, Lock, Unlock, X, Search, ChevronDown, ChevronUp, Loader2, ToggleLeft, ToggleRight, DollarSign } from 'lucide-react'

interface Req { nutrient: string; unit: string; min: number|null; max: number|null; target: number; critical_max?: number|null; critical_min?: number|null }
interface Ratio { name: string; min: number; max: number; target: number; unit?: string }

const PRODUCTION_FIELDS: Record<string, { key: string; label: string; unit: string; placeholder: string }[]> = {
  cattle: [
    { key: 'milk_yield', label: 'Milk Yield', unit: 'L/day', placeholder: '28' },
    { key: 'milk_fat', label: 'Milk Fat', unit: '%', placeholder: '4.0' },
    { key: 'milk_protein', label: 'Milk Protein', unit: '%', placeholder: '3.3' },
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '650' },
    { key: 'dmi', label: 'DMI (actual)', unit: 'kg/d', placeholder: '22' },
    { key: 'days_in_milk', label: 'Days in Milk', unit: 'DIM', placeholder: '120' },
    { key: 'days_pregnant', label: 'Days Pregnant', unit: 'days', placeholder: '90' },
    { key: 'lwg', label: 'Live Weight Change', unit: 'kg/d', placeholder: '0.0' },
  ],
  beef: [
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '450' },
    { key: 'target_adg', label: 'Target ADG', unit: 'kg/day', placeholder: '1.5' },
    { key: 'dmi', label: 'DMI (actual)', unit: 'kg/d', placeholder: '10' },
    { key: 'frame_score', label: 'Frame Score', unit: '', placeholder: '5' },
    { key: 'body_condition', label: 'Body Condition', unit: 'BCS 1-5', placeholder: '3.0' },
    { key: 'days_on_feed', label: 'Days on Feed', unit: 'days', placeholder: '100' },
    { key: 'sale_weight', label: 'Sale Weight', unit: 'kg', placeholder: '600' },
    { key: 'price_per_kg', label: 'Price', unit: '$/kg LW', placeholder: '4.50' },
  ],
  pig: [
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '80' },
    { key: 'target_adg', label: 'Target ADG', unit: 'g/day', placeholder: '900' },
    { key: 'dmi', label: 'Feed Intake', unit: 'kg/d', placeholder: '2.8' },
    { key: 'target_fcr', label: 'Target FCR', unit: '', placeholder: '2.5' },
    { key: 'litter_size', label: 'Litter Size', unit: 'piglets', placeholder: '12' },
    { key: 'price_per_kg', label: 'Price', unit: '$/kg CW', placeholder: '3.80' },
  ],
  poultry: [
    { key: 'body_weight', label: 'Body Weight', unit: 'g', placeholder: '2200' },
    { key: 'target_adg', label: 'Target ADG', unit: 'g/day', placeholder: '65' },
    { key: 'dmi', label: 'Feed Intake', unit: 'g/d', placeholder: '130' },
    { key: 'target_fcr', label: 'Target FCR', unit: '', placeholder: '1.7' },
    { key: 'egg_production', label: 'Egg Production', unit: '%', placeholder: '90' },
    { key: 'price_per_kg', label: 'Price', unit: '$/kg LW', placeholder: '2.20' },
  ],
  sheep: [
    { key: 'body_weight', label: 'Body Weight', unit: 'kg', placeholder: '65' },
    { key: 'target_adg', label: 'Target ADG', unit: 'g/day', placeholder: '250' },
    { key: 'dmi', label: 'DMI', unit: 'kg/d', placeholder: '1.8' },
    { key: 'lambs', label: 'Lambs', unit: 'singles/twins', placeholder: '2' },
    { key: 'wool_growth', label: 'Wool Growth', unit: 'kg/yr', placeholder: '5' },
    { key: 'price_per_kg', label: 'Price', unit: '$/kg LW', placeholder: '6.00' },
  ],
}

// ── NUTRITION MODELS ─────────────────────────────────────
// NRC 2001 DMI prediction for dairy
function predictDMI_NRC(bw: number, milkYield: number, milkFat: number, dim: number): number {
  const fcm4 = milkYield * (0.4 + 15 * (milkFat / 100)) // 4% FCM
  const wol = dim / 7 // weeks of lactation
  return (0.372 * fcm4 + 0.0968 * Math.pow(bw, 0.75)) * (1 - Math.exp(-0.192 * (wol + 3.67)))
}

// CSIRO DMI prediction for beef
function predictDMI_CSIRO(bw: number, meDensity: number): number {
  // Simplified CSIRO: intake potential based on BW and diet quality
  const relativeIntake = 0.025 + (meDensity - 7) * 0.002 // higher ME = slightly higher intake as %BW
  return bw * Math.min(Math.max(relativeIntake, 0.015), 0.035)
}

// Effective degradability (AFRC 1993)
function effectiveDeg(aN: number, bN: number, cN: number, kp: number): number {
  if (cN + kp === 0) return aN
  return aN + (bN * cN) / (cN + kp)
}

// MP calculations (AFRC 1993 simplified)
function calculateMP(ings: any[], totalME: number) {
  let totalRDP = 0, totalUDP = 0, totalCP = 0

  ings.forEach(fi => {
    const ing = fi.ingredient
    if (!ing || !ing.cp_pct) return
    const cpContrib = ing.cp_pct * (fi.inclusion_pct || 0) / 100 // g CP per kg DM diet
    totalCP += cpContrib

    if (ing.an_frac != null && ing.bn_frac != null && ing.cn_rate != null) {
      // passage rate: forages ~0.03/hr, concentrates ~0.05/hr
      const kp = ing.particle_class === 'forage' ? 0.03 : 0.05
      const deg = effectiveDeg(ing.an_frac, ing.bn_frac, ing.cn_rate, kp)
      totalRDP += cpContrib * deg
      totalUDP += cpContrib * (1 - deg)
    } else {
      // Fallback: assume 65% degradable for unknown
      totalRDP += cpContrib * 0.65
      totalUDP += cpContrib * 0.35
    }
  })

  // FME (Fermentable ME) ≈ ME × 0.85 (simplified — excludes fat ME and fermentation acid ME)
  const fme = totalME * 0.85

  // MCP (Microbial Crude Protein) = 11 g per MJ FME (AFRC 1993)
  // But limited by RDP: MCP cannot exceed 0.8 × RDP (need N for microbes)
  const mcpFromEnergy = 11 * fme / 10 // convert to % basis
  const mcpFromN = 0.8 * totalRDP
  const mcp = Math.min(mcpFromEnergy, mcpFromN)

  // MP supply
  // From microbes: MCP × 0.75 (true protein) × 0.85 (digestibility)
  // From undegraded: UDP × 0.9 (digestibility)
  const mpFromMicrobes = mcp * 0.75 * 0.85
  const mpFromBypass = totalUDP * 0.90
  const mpSupply = mpFromMicrobes + mpFromBypass

  return { totalCP, totalRDP, totalUDP, fme, mcp, mpFromMicrobes, mpFromBypass, mpSupply }
}

// MP demand (simplified)
function calculateMPDemand(species: string, prod: Record<string, string>): number {
  const bw = parseFloat(prod.body_weight) || 500
  // Maintenance: 2.19 g MP per kg BW^0.75
  const maintenance = 2.19 * Math.pow(bw, 0.75) / 10 // convert to per kg DM basis approx
  if (species === 'cattle') {
    const milkYield = parseFloat(prod.milk_yield) || 0
    const milkProtein = parseFloat(prod.milk_protein) || 3.3
    // Milk protein requirement: milk protein yield / 0.68 efficiency
    const milkMP = milkYield * (milkProtein / 100) * 1000 / 0.68 / 10
    const lwg = parseFloat(prod.lwg) || 0
    const growthMP = lwg > 0 ? lwg * 150 / 0.59 / 10 : 0
    return maintenance + milkMP + growthMP
  }
  if (species === 'beef') {
    const adg = parseFloat(prod.target_adg) || 0
    const growthMP = adg * 150 / 0.59 / 10
    return maintenance + growthMP
  }
  return maintenance
}

// Methane estimation (Moate et al. 2011, simplified)
function estimateMethane(totalME: number, dmi: number): { ch4_g: number; ch4_intensity: number } {
  // CH4 (MJ/day) ≈ 0.065 × GEI, where GEI ≈ ME / 0.60
  const gei = dmi * totalME / 0.60 // approximate GE intake
  const ch4_mj = 0.065 * gei
  const ch4_g = ch4_mj / 0.0556 // 1g CH4 = 0.0556 MJ
  return { ch4_g, ch4_intensity: dmi > 0 ? ch4_g / dmi : 0 }
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
  const [rightTab, setRightTab] = useState<'balance'|'rumen'|'cost'>('balance')
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
    if (req) { setRequirements(req.requirements||[]); setRatios(req.ratios||[]); setStageName(req.stage_name||f.production_stage) }
    const { data: rules } = await supabase.from('safety_rules').select('*').eq('species', f.species).is('nutritionist_id', null).eq('active', true)
    setSafetyRules(rules || [])
    if (user) {
      const { data: pr } = await supabase.from('ingredient_prices').select('ingredient_id, price_per_tonne').eq('nutritionist_id', user.id).order('effective_date', { ascending: false })
      const pm: Record<string,number> = {}
      pr?.forEach((p: any) => { if (!pm[p.ingredient_id]) pm[p.ingredient_id] = p.price_per_tonne })
      setPrices(pm)
    }
  }

  // ── CORE CALCULATIONS ──────────────────────────────────
  const batchKg = formula?.batch_size_kg || 1000
  const totalPctDM = ings.reduce((s, fi) => s + (fi.inclusion_pct || 0), 0)
  function calcNut(key: string): number { return ings.reduce((s, fi) => s + (fi.ingredient?.[key] || 0) * (fi.inclusion_pct || 0) / 100, 0) }
  const getAsFedKg = (fi: any) => { const dmKg = (fi.inclusion_pct||0)/100*batchKg; return dmKg / ((fi.ingredient?.dm_pct||88)/100) }
  const totalAsFedKg = ings.reduce((s, fi) => s + getAsFedKg(fi), 0)
  const avgDMPct = totalAsFedKg > 0 ? (totalPctDM/100*batchKg)/totalAsFedKg*100 : 0
  const costAF = ings.reduce((s, fi) => { const afP = totalAsFedKg>0?getAsFedKg(fi)/totalAsFedKg:0; return s+(prices[fi.ingredient_id]||0)*afP }, 0)
  const costDM = avgDMPct > 0 ? costAF / (avgDMPct/100) : 0

  // Nutrient values
  const cp = calcNut('cp_pct'), me = calcNut('me_mj'), ndf = calcNut('ndf_pct'), adf = calcNut('adf_pct')
  const ee = calcNut('ee_pct'), starch = calcNut('starch_pct'), ca = calcNut('ca_pct'), pp = calcNut('p_pct')
  const mg = calcNut('mg_pct'), k = calcNut('k_pct'), na = calcNut('na_pct'), s = calcNut('s_pct')
  const lys = calcNut('lysine_pct'), met = calcNut('methionine_pct'), thr = calcNut('threonine_pct')
  const caP = pp > 0 ? ca / pp : 0

  // F:C Ratio
  const forageNDF = ings.reduce((s, fi) => {
    if (fi.ingredient?.particle_class === 'forage') return s + (fi.ingredient?.ndf_pct||0) * (fi.inclusion_pct||0) / 100
    return s
  }, 0)
  const foragePct = ings.reduce((s, fi) => fi.ingredient?.particle_class === 'forage' ? s + (fi.inclusion_pct||0) : s, 0)
  const concPct = ings.reduce((s, fi) => fi.ingredient?.particle_class === 'concentrate' ? s + (fi.inclusion_pct||0) : s, 0)
  const fcRatio = foragePct + concPct > 0 ? `${Math.round(foragePct/(foragePct+concPct)*100)}:${Math.round(concPct/(foragePct+concPct)*100)}` : '—'

  // peNDF
  const peNDF = ings.reduce((s, fi) => s + (fi.ingredient?.ndf_pct||0) * (fi.ingredient?.pendf_factor||0) * (fi.inclusion_pct||0) / 100, 0)

  // DCAD
  const dcad = ings.reduce((s, fi) => s + (fi.ingredient?.dcad||0) * (fi.inclusion_pct||0) / 100, 0)

  // MP Model
  const mpData = calculateMP(ings, me)
  const mpDemand = formula ? calculateMPDemand(formula.species, production) : 0
  const mpBalance = mpData.mpSupply - mpDemand

  // DMI Prediction
  const actualDMI = parseFloat(production.dmi) || 0
  let predictedDMI = 0
  if (formula?.species === 'cattle') {
    const bw = parseFloat(production.body_weight) || 650
    const my = parseFloat(production.milk_yield) || 28
    const mf = parseFloat(production.milk_fat) || 4.0
    const dim = parseFloat(production.days_in_milk) || 120
    predictedDMI = predictDMI_NRC(bw, my, mf, dim)
  } else if (formula?.species === 'beef') {
    const bw = parseFloat(production.body_weight) || 450
    predictedDMI = predictDMI_CSIRO(bw, me)
  }
  const dmiPctPotential = predictedDMI > 0 && actualDMI > 0 ? (actualDMI / predictedDMI * 100) : 0

  // Methane
  const dmiForMethane = actualDMI || predictedDMI || 20
  const methane = estimateMethane(me, dmiForMethane)
  const milkYieldForIntensity = parseFloat(production.milk_yield) || 0
  const ch4PerLMilk = milkYieldForIntensity > 0 ? methane.ch4_g / milkYieldForIntensity : 0

  // Income/Margin
  const dmiCost = costAF / 1000 * (actualDMI || predictedDMI || 20) // $/head/day feed cost
  let incomePerDay = 0
  if (formula?.species === 'cattle') {
    const my = parseFloat(production.milk_yield) || 0
    const mf = parseFloat(production.milk_fat) || 4.0
    const mprot = parseFloat(production.milk_protein) || 3.3
    // Component payment: fat $/kg + protein $/kg
    const fatPrice = formula.milk_price_fat || 5.10
    const protPrice = formula.milk_price_protein || 7.10
    incomePerDay = my * (mf/100) * fatPrice + my * (mprot/100) * protPrice
  } else {
    const adg = parseFloat(production.target_adg) || 0
    const priceKg = parseFloat(production.price_per_kg) || 0
    incomePerDay = adg * priceKg
  }
  const marginPerDay = incomePerDay - dmiCost

  // Balance check
  function findReq(short: string): Req | undefined {
    return requirements.find(r => {
      const n = r.nutrient.toLowerCase()
      if(short==='cp') return n.includes('crude protein')||n.includes(' cp'); if(short==='me') return n.includes('energy')||n.includes(' me ')||n.includes(' de ')
      if(short==='ndf') return n.includes('ndf'); if(short==='ee') return n.includes('fat')||n.includes('ether')||n.includes(' ee')
      if(short==='ca') return n.includes('calcium'); if(short==='p') return n.includes('phosphorus')||n.includes('available p')
      if(short==='lys') return n.includes('lysine'); if(short==='met') return n.includes('methionine')||n.includes('meth+cyst'); return false
    })
  }
  const balanceNuts = [{key:'cp_pct',short:'cp',label:'CP',v:cp,u:'%'},{key:'me_mj',short:'me',label:'ME',v:me,u:'MJ'},{key:'ndf_pct',short:'ndf',label:'NDF',v:ndf,u:'%'},{key:'ee_pct',short:'ee',label:'EE',v:ee,u:'%'},{key:'ca_pct',short:'ca',label:'Ca',v:ca,u:'%'},{key:'p_pct',short:'p',label:'P',v:pp,u:'%'},{key:'lysine_pct',short:'lys',label:'Lys',v:lys,u:'%'}]
  let metC=0, warnC=0, failC=0
  balanceNuts.forEach(nt => { const req=findReq(nt.short); if(!req) return; const inR=(req.min!=null&&req.max!=null)?nt.v>=req.min&&nt.v<=req.max:(req.min!=null?nt.v>=req.min:true)&&(req.max!=null?nt.v<=req.max:true); const crit=(req.critical_max!=null&&nt.v>req.critical_max)||(req.critical_min!=null&&nt.v<req.critical_min); if(crit) failC++; else if(inR) metC++; else warnC++ })

  // Actions
  function updateIngPct(idx: number, pct: number) { const u=[...ings]; u[idx]={...u[idx],inclusion_pct:pct}; setIngs(u); setSaved(false) }
  function toggleLock(idx: number) { const u=[...ings]; u[idx]={...u[idx],locked:!u[idx].locked}; setIngs(u) }
  function removeIng(idx: number) { setIngs(ings.filter((_,i)=>i!==idx)); setSaved(false) }

  async function addIngredient(ingId: string) {
    if (ings.some(fi=>fi.ingredient_id===ingId)) return
    const supabase = await getSupabase()
    const { data } = await supabase.from('formula_ingredients').insert({formula_id:params.id,ingredient_id:ingId,inclusion_pct:0,locked:false}).select('*, ingredient:ingredients(*)').single()
    if (data) { setIngs([...ings,data]); setShowAddIng(false); setSaved(false) }
  }

  async function handleSave() {
    setSaving(true); const supabase = await getSupabase()
    await supabase.from('formula_ingredients').delete().eq('formula_id', params.id)
    if (ings.length>0) { await supabase.from('formula_ingredients').insert(ings.map(fi=>({formula_id:params.id as string,ingredient_id:fi.ingredient_id,inclusion_pct:fi.inclusion_pct,inclusion_kg:fi.inclusion_pct/100*batchKg,cost_per_tonne:prices[fi.ingredient_id]||null,locked:fi.locked}))) }
    await supabase.from('formulas').update({total_cost_per_tonne:costAF,total_cp_pct:cp,total_me_mj:me,total_income_per_day:incomePerDay,total_margin_per_day:marginPerDay}).eq('id',params.id)
    setSaving(false); setSaved(true)
  }

  async function updateStatus(st: string) { const supabase=await getSupabase(); await supabase.from('formulas').update({status:st}).eq('id',params.id); setFormula({...formula,status:st}) }

  // AI
  function buildAiContext() {
    const ingList = ings.map(fi=>`- ${fi.ingredient?.name}: ${fi.inclusion_pct.toFixed(1)}% DM (${fi.ingredient?.particle_class||'?'}) aN=${fi.ingredient?.an_frac??'?'} bN=${fi.ingredient?.bn_frac??'?'} cN=${fi.ingredient?.cn_rate??'?'}`).join('\n')
    const prodInfo = Object.entries(production).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`).join(', ')
    return `FORMULA: ${formula.name} (v${formula.version}, ${formula.status})\nSPECIES: ${formula.species} | STAGE: ${stageName}\nCLIENT: ${formula.client?.name||'N/A'}\nBATCH: ${batchKg}kg | Total AF: ${totalAsFedKg.toFixed(0)}kg | Mix DM: ${avgDMPct.toFixed(1)}%\n${prodInfo?'PRODUCTION: '+prodInfo:''}\n\nINGREDIENTS:\n${ingList}\n\nNUTRIENT PROFILE (DM basis):\nCP: ${cp.toFixed(1)}% | ME: ${me.toFixed(1)} MJ/kg | NDF: ${ndf.toFixed(1)}% | ADF: ${adf.toFixed(1)}%\nEE: ${ee.toFixed(1)}% | Starch: ${starch.toFixed(1)}% | Ca: ${ca.toFixed(3)}% | P: ${pp.toFixed(3)}%\nCa:P: ${caP.toFixed(2)} | F:C: ${fcRatio} | peNDF: ${peNDF.toFixed(1)}% | DCAD: ${dcad.toFixed(0)} mEq/kg\n\nPROTEIN MODEL (AFRC):\nTotal CP: ${mpData.totalCP.toFixed(1)}% | RDP: ${mpData.totalRDP.toFixed(1)}% | UDP: ${mpData.totalUDP.toFixed(1)}%\nMCP: ${mpData.mcp.toFixed(1)}% | MP Supply: ${mpData.mpSupply.toFixed(1)}% | MP Demand: ${mpDemand.toFixed(1)}%\nMP Balance: ${mpBalance>0?'+':''}${mpBalance.toFixed(1)}%\n\nDMI: Actual ${actualDMI||'not set'} | Predicted ${predictedDMI.toFixed(1)} kg/d | ${dmiPctPotential.toFixed(0)}% of potential\nMETHANE: ${methane.ch4_g.toFixed(0)} g/d | ${ch4PerLMilk.toFixed(1)} g/L milk\n\nCOST: $${costAF.toFixed(0)}/t AF | $${costDM.toFixed(0)}/t DM | $${dmiCost.toFixed(2)}/hd/d\nINCOME: $${incomePerDay.toFixed(2)}/hd/d | MARGIN: $${marginPerDay.toFixed(2)}/hd/d\n\nBALANCE: ${metC} met, ${warnC} warn, ${failC} critical`
  }

  async function handleAiReview() {
    setAiLoading(true); setShowAi(true); setAiReview(null)
    try {
      const res = await fetch('/api/ai/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`Review this formula. Include MP analysis, DMI adequacy, F:C ratio assessment, DCAD evaluation, methane, and margin analysis. Australian context.\n\n${buildAiContext()}`})})
      const data = await res.json(); setAiReview(data.response||'No response.')
      const supabase = await getSupabase(); await supabase.from('formulas').update({ai_review:data.response,ai_reviewed_at:new Date().toISOString()}).eq('id',params.id)
    } catch { setAiReview('Error connecting to AI.') }
    setAiLoading(false)
  }
  async function handleAiQ() { if(!aiQuestion.trim()) return; setAiLoading(true); const q=aiQuestion; setAiQuestion(''); try { const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`${q}\n\nCONTEXT:\n${buildAiContext()}`})}); const data=await res.json(); setAiReview(data.response||'No response.') } catch { setAiReview('Error.') } setAiLoading(false) }

  if (!formula) return <div className="p-7 text-text-ghost">Loading...</div>
  const prodFields = PRODUCTION_FIELDS[formula.species] || PRODUCTION_FIELDS.beef
  const addableIngs = allIngredients.filter(i=>!ings.some(fi=>fi.ingredient_id===i.id)&&i.name.toLowerCase().includes(ingSearch.toLowerCase())&&(i.species_suitable as string[]||[]).includes(formula.species))
  const isRuminant = ['cattle','beef','sheep'].includes(formula.species)

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
          <p className="text-xs text-text-ghost mt-0.5">{formula.client?.name||'No client'} &middot; {formula.species} &middot; {stageName||formula.production_stage} &middot; {batchKg}kg</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm"><Sparkles size={14}/> {aiLoading?'...':'AI Review'}</button>
          <button onClick={handleSave} disabled={saving} className={`btn btn-primary btn-sm ${saved?'bg-brand/50':''}`}><Save size={14}/> {saving?'...':saved?'\u2713':'Save'}</button>
        </div>
      </div>

      {/* Production Level */}
      <div className="mb-2">
        <button onClick={()=>setShowProduction(!showProduction)} className="flex items-center gap-1.5 text-xs font-bold text-text-ghost uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-text-muted">Production Level {showProduction?<ChevronUp size={12}/>:<ChevronDown size={12}/>}</button>
        {showProduction&&<div className="grid grid-cols-8 gap-2 mt-2 p-3 bg-surface-card rounded-lg border border-border">{prodFields.map(f=>(<div key={f.key}><label className="text-2xs text-text-ghost block mb-0.5">{f.label} <span className="text-text-ghost/50">({f.unit})</span></label><input value={production[f.key]||''} onChange={e=>setProduction({...production,[f.key]:e.target.value})} placeholder={f.placeholder} className="w-full px-2 py-1.5 rounded border border-border bg-surface-deep text-text-dim text-sm font-mono outline-none focus:border-border-focus"/></div>))}</div>}
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-surface-card rounded-lg border border-border text-xs flex-wrap">
        <button onClick={()=>setBasis(basis==='dm'?'asfed':'dm')} className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface-deep cursor-pointer hover:border-brand/30">
          {basis==='dm'?<ToggleLeft size={13} className="text-brand"/>:<ToggleRight size={13} className="text-status-amber"/>}
          <span className={`font-bold font-mono ${basis==='dm'?'text-brand':'text-status-amber'}`}>{basis==='dm'?'DM':'AF'}</span>
        </button>
        <span className="font-mono font-bold text-brand">{metC}met</span>
        {warnC>0&&<span className="font-mono font-bold text-status-amber">{warnC}warn</span>}
        {failC>0&&<span className="font-mono font-bold text-status-red">{failC}crit</span>}
        <span className="text-text-ghost">|</span>
        <span className={`font-mono font-bold ${totalPctDM>100.1||totalPctDM<99.9?'text-status-red':'text-brand'}`}>{totalPctDM.toFixed(1)}%</span>
        <span className="text-text-ghost">F:C</span><span className="font-mono font-bold text-text-dim">{fcRatio}</span>
        {isRuminant&&<><span className="text-text-ghost">MP</span><span className={`font-mono font-bold ${mpBalance>=0?'text-brand':'text-status-red'}`}>{mpBalance>0?'+':''}{mpBalance.toFixed(1)}%</span></>}
        {dmiPctPotential>0&&<><span className="text-text-ghost">DMI</span><span className={`font-mono font-bold ${dmiPctPotential>102?'text-status-red':dmiPctPotential>95?'text-brand':'text-status-amber'}`}>{dmiPctPotential.toFixed(0)}%</span></>}
        <div className="flex-1"/>
        <span className="font-mono font-bold text-status-amber">${costAF.toFixed(0)}/t</span>
        {marginPerDay!==0&&<span className={`font-mono font-bold ${marginPerDay>0?'text-brand':'text-status-red'}`}>margin ${marginPerDay>0?'+':''}${marginPerDay.toFixed(2)}/d</span>}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[1fr_340px] gap-3 flex-1 min-h-0">
        {/* Ingredients */}
        <div className="card flex flex-col">
          <div className="card-header"><span className="text-xs font-bold text-text-muted uppercase tracking-wider">Ingredients ({ings.length})</span><button onClick={()=>{setIngSearch('');setShowAddIng(true)}} className="btn btn-ghost btn-sm"><Plus size={14}/> Add</button></div>
          <div className="grid grid-cols-[24px_1fr_70px_55px_50px_35px_24px] px-3 py-1 border-b border-border gap-1 text-2xs font-bold text-text-ghost uppercase tracking-wider">
            <span></span><span>Ingredient</span><span></span><span className="text-right">DM%</span><span className="text-right">{basis==='dm'?'DM kg':'AF kg'}</span><span className="text-right">Type</span><span></span>
          </div>
          <div className="flex-1 overflow-auto">
            {ings.map((fi,idx)=>{const ing=fi.ingredient;if(!ing)return null;const price=prices[fi.ingredient_id];const dmKg=(fi.inclusion_pct||0)/100*batchKg;const afKg=getAsFedKg(fi);const dispKg=basis==='dm'?dmKg:afKg
            return(<div key={fi.id||idx} className="grid grid-cols-[24px_1fr_70px_55px_50px_35px_24px] px-3 py-2 border-b border-border/5 items-center gap-1">
              <button onClick={()=>toggleLock(idx)} className={`bg-transparent border-none cursor-pointer flex ${fi.locked?'text-status-amber':'text-text-ghost/40'}`}>{fi.locked?<Lock size={12}/>:<Unlock size={12}/>}</button>
              <div><div className="text-sm font-semibold text-text-dim truncate">{ing.name}</div><div className="text-2xs text-text-ghost font-mono">{ing.category}{price?' \u00B7 $'+price.toFixed(0)+'/t':''}</div></div>
              <input type="range" min="0" max="60" step="0.5" value={fi.inclusion_pct} onChange={e=>updateIngPct(idx,parseFloat(e.target.value))}/>
              <input type="number" value={fi.inclusion_pct} step="0.5" min="0" max="100" onChange={e=>updateIngPct(idx,parseFloat(e.target.value)||0)} className="w-full px-1 py-1 rounded border border-border bg-surface-deep text-text-dim text-sm font-mono text-right outline-none focus:border-border-focus"/>
              <span className="text-2xs text-text-ghost font-mono text-right">{dispKg.toFixed(0)}kg</span>
              <span className={`text-2xs font-mono text-center ${ing.particle_class==='forage'?'text-brand':'text-text-ghost'}`}>{ing.particle_class==='forage'?'F':'C'}</span>
              <button onClick={()=>removeIng(idx)} className="bg-transparent border-none cursor-pointer text-text-ghost/40 hover:text-status-red"><X size={12}/></button>
            </div>)})}
            {ings.length===0&&<div className="px-4 py-12 text-center"><p className="text-sm text-text-ghost mb-3">No ingredients.</p><button onClick={()=>setShowAddIng(true)} className="btn btn-primary btn-sm"><Plus size={14}/> Add</button></div>}
          </div>
          {ings.length>0&&<div className="px-3 py-2 border-t-2 border-border flex items-center gap-3 text-xs font-bold">
            <span className="text-text-muted">Total</span>
            <span className={`font-mono ${totalPctDM>100.1||totalPctDM<99.9?'text-status-red':'text-brand'}`}>{totalPctDM.toFixed(1)}% DM</span>
            <span className="font-mono text-text-dim">{totalAsFedKg.toFixed(0)}kg AF</span>
            <span className="font-mono text-text-ghost">DM {avgDMPct.toFixed(1)}%</span>
            <span className="font-mono text-text-ghost">F:C {fcRatio}</span>
          </div>}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-0 overflow-hidden">
          <div className="flex gap-px bg-border rounded overflow-hidden mb-2">
            {(['balance','rumen','cost'] as const).map(t=>(<button key={t} onClick={()=>setRightTab(t)} className={`flex-1 py-1.5 text-2xs font-bold uppercase tracking-wide text-center transition-all border-none cursor-pointer ${rightTab===t?'bg-brand text-white':'bg-surface-card text-text-ghost hover:text-text-muted'}`}>
              {t==='balance'?'\u2696 Balance':t==='rumen'?'\uD83E\uDDEC Rumen/MP':'$ Margin'}
            </button>))}
          </div>

          {/* BALANCE */}
          {rightTab==='balance'&&<div className="card p-3 flex-1 overflow-auto">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-surface-deep rounded-lg p-2 text-center"><div className="text-lg font-bold font-mono text-brand">{metC}</div><div className="text-2xs text-text-ghost">Met</div></div>
              <div className="bg-surface-deep rounded-lg p-2 text-center"><div className="text-lg font-bold font-mono text-status-amber">{warnC}</div><div className="text-2xs text-text-ghost">Warn</div></div>
              <div className="bg-surface-deep rounded-lg p-2 text-center"><div className="text-lg font-bold font-mono text-status-red">{failC}</div><div className="text-2xs text-text-ghost">Crit</div></div>
            </div>
            {balanceNuts.map(nt=>{const req=findReq(nt.short);if(!req)return(<div key={nt.key} className="flex items-center gap-2 py-0.5"><span className="w-8 text-2xs font-semibold text-text-muted font-mono text-right">{nt.label}</span><div className="flex-1 h-1 bg-surface-deep rounded-sm"/><span className="w-14 text-2xs font-semibold text-text font-mono text-right">{nt.v.toFixed(2)}{nt.u}</span></div>)
              const inR=(req.min!=null&&req.max!=null)?nt.v>=req.min&&nt.v<=req.max:(req.min!=null?nt.v>=req.min:true)&&(req.max!=null?nt.v<=req.max:true)
              const crit=(req.critical_max!=null&&nt.v>req.critical_max)||(req.critical_min!=null&&nt.v<req.critical_min)
              const color=crit?'bg-status-red':inR?'bg-brand':'bg-status-amber';const tc=crit?'text-status-red':inR?'text-brand':'text-status-amber'
              const ceil=Math.max(req.max||req.target||1,req.critical_max||0)*1.5;const pV=Math.min((nt.v/ceil)*100,100)
              const pMin=req.min!=null?(req.min/ceil)*100:0;const pMax=req.max!=null?(req.max/ceil)*100:100
              return(<div key={nt.key} className="mb-2"><div className="flex items-center justify-between"><span className="text-2xs font-semibold text-text-muted">{nt.label}</span><span className={`text-2xs font-bold font-mono ${tc}`}>{nt.v.toFixed(2)}{nt.u} <span className="font-normal text-text-ghost">({req.min}-{req.max})</span></span></div><div className="relative h-3 bg-surface-deep rounded mt-0.5"><div className="absolute h-full rounded opacity-15" style={{left:`${pMin}%`,width:`${pMax-pMin}%`,background:crit?'#E05252':inR?'#4CAF7D':'#D4A843'}}/><div className={`absolute top-1/2 w-2.5 h-2.5 rounded-full -translate-y-1/2 -translate-x-1/2 border-2 border-surface-bg ${color}`} style={{left:`${pV}%`}}/></div></div>)
            })}
            {/* Nutrients summary */}
            <div className="mt-3 pt-2 border-t border-border grid grid-cols-3 gap-1.5">
              {[['NDF',ndf,'%'],['ADF',adf,'%'],['Starch',starch,'%'],['EE',ee,'%'],['Mg',mg,'%'],['K',k,'%'],['Na',na,'%'],['S',s,'%'],['Ca:P',caP,':1']].map(([l,v,u])=>(
                <div key={l as string} className="text-center"><div className="text-[9px] text-text-ghost uppercase">{l}</div><div className="text-xs font-mono font-bold text-text-dim">{(v as number)<1?(v as number).toFixed(3):(v as number).toFixed(1)}{u}</div></div>
              ))}
            </div>
          </div>}

          {/* RUMEN / MP */}
          {rightTab==='rumen'&&<div className="card p-3 flex-1 overflow-auto">
            {isRuminant?<>
              <div className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-2">Metabolisable Protein (AFRC)</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost">MP Supply</div><div className="text-base font-bold font-mono text-brand">{mpData.mpSupply.toFixed(1)}%</div></div>
                <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost">MP Demand</div><div className="text-base font-bold font-mono text-text-dim">{mpDemand.toFixed(1)}%</div></div>
              </div>
              <div className={`text-center text-sm font-bold font-mono mb-3 px-3 py-2 rounded-lg ${mpBalance>=0?'bg-brand/10 text-brand':'bg-status-red/10 text-status-red'}`}>
                MP Balance: {mpBalance>0?'+':''}{mpBalance.toFixed(1)}% {mpBalance>=0?'\u2713':'\u26A0 DEFICIT'}
              </div>
              {[['RDP (Rumen Degradable)',mpData.totalRDP],['UDP (Undegradable)',mpData.totalUDP],['MCP (Microbial)',mpData.mcp],['MP from microbes',mpData.mpFromMicrobes],['MP from bypass',mpData.mpFromBypass],['Total CP',mpData.totalCP]].map(([l,v])=>(
                <div key={l as string} className="flex justify-between py-0.5"><span className="text-2xs text-text-muted">{l}</span><span className="text-2xs font-mono font-bold text-text-dim">{(v as number).toFixed(1)}%</span></div>
              ))}
              <div className="mt-3 pt-2 border-t border-border">
                <div className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-2">Rumen Health</div>
                {[['F:C Ratio',fcRatio,foragePct<30?'text-status-red':foragePct<40?'text-status-amber':'text-brand'],['peNDF',peNDF.toFixed(1)+'%',peNDF<18?'text-status-red':peNDF<22?'text-status-amber':'text-brand'],['NDF from Forage',forageNDF.toFixed(1)+'%','text-text-dim'],['DCAD',dcad.toFixed(0)+' mEq/kg','text-text-dim']].map(([l,v,c])=>(
                  <div key={l as string} className="flex justify-between py-0.5"><span className="text-2xs text-text-muted">{l}</span><span className={`text-2xs font-mono font-bold ${c}`}>{v}</span></div>
                ))}
              </div>
              {dmiPctPotential>0&&<div className="mt-3 pt-2 border-t border-border">
                <div className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-2">DMI Prediction</div>
                <div className="flex justify-between py-0.5"><span className="text-2xs text-text-muted">Predicted (NRC/CSIRO)</span><span className="text-2xs font-mono font-bold text-text-dim">{predictedDMI.toFixed(1)} kg/d</span></div>
                <div className="flex justify-between py-0.5"><span className="text-2xs text-text-muted">Actual</span><span className="text-2xs font-mono font-bold text-text-dim">{actualDMI.toFixed(1)} kg/d</span></div>
                <div className={`text-center text-xs font-bold font-mono mt-1 px-2 py-1 rounded ${dmiPctPotential>102?'bg-status-red/10 text-status-red':dmiPctPotential>95?'bg-brand/10 text-brand':'bg-status-amber/10 text-status-amber'}`}>
                  {dmiPctPotential.toFixed(0)}% of potential {dmiPctPotential>102?'\u26A0 EXCEEDS':dmiPctPotential<80?'\u26A0 LOW':''}
                </div>
              </div>}
              <div className="mt-3 pt-2 border-t border-border">
                <div className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-2">Enteric Methane</div>
                <div className="flex justify-between py-0.5"><span className="text-2xs text-text-muted">CH\u2084 Total</span><span className="text-2xs font-mono font-bold text-text-dim">{methane.ch4_g.toFixed(0)} g/day</span></div>
                {milkYieldForIntensity>0&&<div className="flex justify-between py-0.5"><span className="text-2xs text-text-muted">CH\u2084 Intensity</span><span className="text-2xs font-mono font-bold text-text-dim">{ch4PerLMilk.toFixed(1)} g/L milk</span></div>}
                <div className="flex justify-between py-0.5"><span className="text-2xs text-text-muted">CH\u2084 per kg DMI</span><span className="text-2xs font-mono font-bold text-text-dim">{methane.ch4_intensity.toFixed(1)} g/kg</span></div>
              </div>
            </>:<>
              <div className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-2">Amino Acid Profile</div>
              {[['Lysine',lys],['Methionine',met],['Threonine',thr]].map(([l,v])=>(
                <div key={l as string} className="flex justify-between py-1"><span className="text-xs text-text-muted">{l}</span><span className="text-sm font-mono font-bold text-text-dim">{(v as number).toFixed(3)}%</span></div>
              ))}
              <div className="mt-3 text-2xs text-text-ghost">For monogastrics, amino acid balance relative to lysine is critical. Check ideal protein ratios.</div>
            </>}
          </div>}

          {/* COST / MARGIN */}
          {rightTab==='cost'&&<div className="card p-3 flex-1 overflow-auto">
            <div className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-2">Feed Cost</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost">$/t As Fed</div><div className="text-lg font-bold text-status-amber font-mono">${costAF.toFixed(0)}</div></div>
              <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost">$/t DM</div><div className="text-lg font-bold text-status-coral font-mono">${costDM.toFixed(0)}</div></div>
            </div>
            <div className="bg-surface-deep rounded-lg p-2 mb-3"><div className="text-2xs text-text-ghost">$/Head/Day</div><div className="text-lg font-bold text-text-dim font-mono">${dmiCost.toFixed(2)}</div></div>

            <div className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-2">Income</div>
            {formula.species==='cattle'?<div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost">Milk $/d</div><div className="text-lg font-bold text-brand font-mono">${incomePerDay.toFixed(2)}</div></div>
              <div className={`rounded-lg p-2 ${marginPerDay>=0?'bg-brand/10':'bg-status-red/10'}`}><div className="text-2xs text-text-ghost">Margin $/d</div><div className={`text-lg font-bold font-mono ${marginPerDay>=0?'text-brand':'text-status-red'}`}>${marginPerDay.toFixed(2)}</div></div>
            </div>:<div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-surface-deep rounded-lg p-2"><div className="text-2xs text-text-ghost">LWG Income $/d</div><div className="text-lg font-bold text-brand font-mono">${incomePerDay.toFixed(2)}</div></div>
              <div className={`rounded-lg p-2 ${marginPerDay>=0?'bg-brand/10':'bg-status-red/10'}`}><div className="text-2xs text-text-ghost">Margin $/d</div><div className={`text-lg font-bold font-mono ${marginPerDay>=0?'text-brand':'text-status-red'}`}>${marginPerDay.toFixed(2)}</div></div>
            </div>}

            {dmiCost>0&&incomePerDay>0&&<div className="bg-surface-deep rounded-lg p-2 mb-3">
              <div className="text-2xs text-text-ghost">Feed as % of Income</div>
              <div className={`text-lg font-bold font-mono ${dmiCost/incomePerDay*100>65?'text-status-red':dmiCost/incomePerDay*100>50?'text-status-amber':'text-brand'}`}>{(dmiCost/incomePerDay*100).toFixed(0)}%</div>
            </div>}

            <div className="text-2xs font-bold text-text-ghost uppercase mb-2">Breakdown</div>
            {ings.filter(fi=>fi.inclusion_pct>0).sort((a,b)=>(prices[b.ingredient_id]||0)*getAsFedKg(b)-(prices[a.ingredient_id]||0)*getAsFedKg(a)).map(fi=>{
              const price=prices[fi.ingredient_id]||0;const afP=totalAsFedKg>0?getAsFedKg(fi)/totalAsFedKg:0;const ingC=price*afP;const pctC=costAF>0?ingC/costAF*100:0
              return(<div key={fi.id} className="flex items-center gap-2 py-0.5"><span className="text-2xs text-text-dim flex-1 truncate">{fi.ingredient?.name}</span><div className="w-14 h-1 bg-surface-deep rounded-sm overflow-hidden"><div className="h-full bg-status-amber rounded-sm" style={{width:`${pctC}%`}}/></div><span className="text-2xs font-mono text-status-amber w-10 text-right">${ingC.toFixed(0)}</span></div>)
            })}
          </div>}
        </div>
      </div>

      {/* ADD INGREDIENT */}
      {showAddIng&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddIng(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[70vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="text-lg font-bold text-text">Add Ingredient</h2><button onClick={()=>setShowAddIng(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="p-4 border-b border-border"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"/><input value={ingSearch} onChange={e=>setIngSearch(e.target.value)} placeholder={`Search ${formula.species} ingredients...`} className="input pl-9" autoFocus/></div></div>
        <div className="flex-1 overflow-auto">{addableIngs.map(ing=>(<div key={ing.id} onClick={()=>addIngredient(ing.id)} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5 hover:bg-[#253442] cursor-pointer"><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{ing.name}</div><div className="text-2xs text-text-ghost">{ing.particle_class==='forage'?'F':'C'} &middot; CP {ing.cp_pct||0}% &middot; ME {ing.me_mj||0} MJ &middot; DM {ing.dm_pct||88}%</div></div>{prices[ing.id]&&<span className="text-xs font-mono text-status-amber">${prices[ing.id].toFixed(0)}/t</span>}<Plus size={14} className="text-brand"/></div>))}</div>
      </div></div>}

      {/* AI PANEL */}
      {showAi&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAi(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center"><Sparkles size={14} className="text-white"/></div><div><div className="text-base font-bold text-text">Optia AI Review</div><div className="text-2xs text-text-ghost">MP + DMI + F:C + DCAD + Methane + Margin</div></div></div><button onClick={()=>setShowAi(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="flex-1 overflow-auto p-4">{aiLoading&&!aiReview&&<div className="flex items-center gap-3 text-text-ghost"><Loader2 size={16} className="animate-spin"/> Analyzing...</div>}{aiReview&&<div className="text-sm text-text-dim leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{__html:aiReview.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br/>')}}/>}</div>
        <div className="p-4 border-t border-border flex gap-2"><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAiQ()} placeholder="Ask..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-border-focus"/><button onClick={handleAiQ} disabled={aiLoading} className="btn btn-primary btn-sm">{aiLoading?<Loader2 size={14} className="animate-spin"/>:'Ask'}</button><button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm">Re-review</button></div>
      </div></div>}
    </div>
  )
}
