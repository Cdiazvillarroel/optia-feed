'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Sparkles, Save, Lock, Unlock, X, Search, ChevronDown, ChevronUp, Loader2, ToggleLeft, ToggleRight, Zap, GitCompare, RotateCcw, Download, Shield } from 'lucide-react'
import ProfileEditorModal from '@/components/ProfileEditorModal'
import { runOptimizer as runOptimizerLP } from '@/lib/optimizer'
import { buildConstraintsFromProfile, mergeWithDefaults, type OptConstraintForUI } from '@/lib/optimizer/build-constraints'
interface Req { nutrient: string; unit: string; min: number|null; max: number|null; target: number; critical_max?: number|null; critical_min?: number|null }
interface Ratio { name: string; min: number; max: number; target: number; unit?: string }
interface CompareSlot { name: string; ings: any[]; production: Record<string,string>; nutrients: Record<string,number>; cost: number; margin: number; mp: number; fc: string; timestamp: Date }

// ── SPECIES MODE ──────────────────────────────────────────
type SpeciesMode = 'ruminant' | 'pig' | 'poultry'
function getSpeciesMode(species: string): SpeciesMode {
  if (['cattle','beef','sheep'].includes(species)) return 'ruminant'
  if (species === 'pig') return 'pig'
  if (species === 'poultry') return 'poultry'
  return 'ruminant'
}

const PRODUCTION_FIELDS: Record<string, { key: string; label: string; unit: string; placeholder: string }[]> = {
  cattle: [{key:'milk_yield',label:'Milk Yield',unit:'L/d',placeholder:'28'},{key:'milk_fat',label:'Fat',unit:'%',placeholder:'4.0'},{key:'milk_protein',label:'Protein',unit:'%',placeholder:'3.3'},{key:'body_weight',label:'BW',unit:'kg',placeholder:'650'},{key:'dmi',label:'DMI',unit:'kg/d',placeholder:'22'},{key:'days_in_milk',label:'DIM',unit:'',placeholder:'120'},{key:'days_pregnant',label:'Preg',unit:'d',placeholder:'90'},{key:'lwg',label:'LWC',unit:'kg/d',placeholder:'0.0'}],
  beef: [{key:'body_weight',label:'BW',unit:'kg',placeholder:'450'},{key:'target_adg',label:'ADG',unit:'kg/d',placeholder:'1.5'},{key:'dmi',label:'DMI',unit:'kg/d',placeholder:'10'},{key:'frame_score',label:'Frame',unit:'',placeholder:'5'},{key:'body_condition',label:'BCS',unit:'1-5',placeholder:'3.0'},{key:'days_on_feed',label:'DOF',unit:'d',placeholder:'100'},{key:'sale_weight',label:'Sale',unit:'kg',placeholder:'600'},{key:'price_per_kg',label:'$/kg',unit:'LW',placeholder:'4.50'}],
  pig: [{key:'body_weight',label:'BW',unit:'kg',placeholder:'80'},{key:'target_adg',label:'ADG',unit:'g/d',placeholder:'900'},{key:'dmi',label:'Intake',unit:'kg/d',placeholder:'2.8'},{key:'target_fcr',label:'FCR',unit:'',placeholder:'2.5'},{key:'litter_size',label:'Litter',unit:'',placeholder:'12'},{key:'price_per_kg',label:'$/kg',unit:'CW',placeholder:'3.80'}],
  poultry: [{key:'body_weight',label:'BW',unit:'g',placeholder:'2200'},{key:'target_adg',label:'ADG',unit:'g/d',placeholder:'65'},{key:'dmi',label:'Intake',unit:'g/d',placeholder:'130'},{key:'target_fcr',label:'FCR',unit:'',placeholder:'1.7'},{key:'egg_production',label:'Egg%',unit:'',placeholder:'90'},{key:'price_per_kg',label:'$/kg',unit:'LW',placeholder:'2.20'}],
  sheep: [{key:'body_weight',label:'BW',unit:'kg',placeholder:'65'},{key:'target_adg',label:'ADG',unit:'g/d',placeholder:'250'},{key:'dmi',label:'DMI',unit:'kg/d',placeholder:'1.8'},{key:'lambs',label:'Lambs',unit:'',placeholder:'2'},{key:'wool_growth',label:'Wool',unit:'kg/yr',placeholder:'5'},{key:'price_per_kg',label:'$/kg',unit:'LW',placeholder:'6.00'}],
}

// ── NUTRITION MODELS (ruminant only) ─────────────────────
const NUT_MODELS = {
  AFRC: { label:'AFRC', desc:'UK/AU/NZ', mcpCoeff:11, mcpNCoeff:0.8, mpMicDig:0.75, mpMicAA:0.85, mpBypDig:0.90, kpF:0.03, kpC:0.05, udpLabel:'UDP', rdpLabel:'RDP' },
  NRC: { label:'NRC 2001', desc:'US/CA', mcpCoeff:0.13, mcpNCoeff:0.85, mpMicDig:0.80, mpMicAA:0.80, mpBypDig:0.80, kpF:0.035, kpC:0.06, udpLabel:'RUP', rdpLabel:'RDP' },
  CNCPS: { label:'CNCPS v6', desc:'Cornell', mcpCoeff:11, mcpNCoeff:0.85, mpMicDig:0.75, mpMicAA:0.85, mpBypDig:0.80, kpF:0.04, kpC:0.06, udpLabel:'RUP', rdpLabel:'RDP' },
}
type NutModelKey = keyof typeof NUT_MODELS

// ── PREDICTION HELPERS ───────────────────────────────────
function predictDMI_NRC(bw: number, my: number, mf: number, dim: number): number {
  const fcm = my * (0.4 + 15 * (mf / 100)); const wol = dim / 7
  return (0.372 * fcm + 0.0968 * Math.pow(bw, 0.75)) * (1 - Math.exp(-0.192 * (wol + 3.67)))
}
function predictDMI_CSIRO(bw: number, me: number): number {
  const ri = 0.025 + (me - 7) * 0.002; return bw * Math.min(Math.max(ri, 0.015), 0.035)
}
function predictDMI(species: string, prod: Record<string,string>, me: number): number {
  const bw = parseFloat(prod.body_weight) || 0; const my = parseFloat(prod.milk_yield) || 0
  if (species === 'cattle') { if (my > 0 && bw > 0) return predictDMI_NRC(bw, my, parseFloat(prod.milk_fat) || 4.0, parseFloat(prod.days_in_milk) || 120); return (bw || 550) * 0.02 }
  if (species === 'beef') { if (bw > 0 && me > 0) return predictDMI_CSIRO(bw, me); return (bw || 450) * 0.025 }
  if (species === 'sheep') return (bw || 65) * 0.028
  if (species === 'pig') return (bw || 80) * 0.032
  if (species === 'poultry') return (parseFloat(prod.dmi) || 130) / 1000
  return (bw || 500) * 0.02
}

function effectiveDeg(aN: number, bN: number, cN: number, kp: number): number { return cN + kp === 0 ? aN : aN + (bN * cN) / (cN + kp) }

function calculateMP(ings: any[], totalME: number, dmi: number, model: NutModelKey = 'AFRC') {
  const m = NUT_MODELS[model]; let totalRDP_pct = 0, totalUDP_pct = 0, totalCP_pct = 0
  ings.forEach(fi => { const ing = fi.ingredient; if (!ing || !ing.cp_pct) return; const cpC = ing.cp_pct * (fi.inclusion_pct || 0) / 100; totalCP_pct += cpC
    if (ing.an_frac != null && ing.bn_frac != null && ing.cn_rate != null) { const kp = ing.particle_class === 'forage' ? m.kpF : m.kpC; const deg = effectiveDeg(ing.an_frac, ing.bn_frac, ing.cn_rate, kp); totalRDP_pct += cpC * deg; totalUDP_pct += cpC * (1 - deg) } else { totalRDP_pct += cpC * 0.65; totalUDP_pct += cpC * 0.35 } })
  const totalRDP = totalRDP_pct / 100 * dmi * 1000, totalUDP = totalUDP_pct / 100 * dmi * 1000, totalCP = totalCP_pct / 100 * dmi * 1000, fme = totalME * 0.85 * dmi
  let mcpE: number, mcpN: number
  if (model === 'NRC') { const tdn_pct = (totalME / 0.82) * 100 / 18.4; mcpE = m.mcpCoeff * (tdn_pct / 100 * dmi) * 1000; mcpN = m.mcpNCoeff * totalRDP } else { mcpE = m.mcpCoeff * fme; mcpN = m.mcpNCoeff * totalRDP }
  const mcp = Math.min(mcpE, mcpN); const mpMic = mcp * m.mpMicDig * m.mpMicAA; const mpByp = totalUDP * m.mpBypDig
  return { totalCP, totalRDP, totalUDP, fme, mcp, mcpE, mcpN, mpFromMicrobes: mpMic, mpFromBypass: mpByp, mpSupply: mpMic + mpByp }
}

function calculateMPDemand(species: string, prod: Record<string,string>): number {
  const bw = parseFloat(prod.body_weight) || (species === 'cattle' ? 550 : species === 'beef' ? 450 : species === 'sheep' ? 65 : 80)
  const maint = 2.19 * Math.pow(bw, 0.75)
  if (species === 'cattle') { const my = parseFloat(prod.milk_yield) || 0; const mp2 = parseFloat(prod.milk_protein) || 3.3; const milkMP = my > 0 ? my * (mp2 / 100) * 1000 / 0.68 : 0; const lwg = parseFloat(prod.lwg) || 0; const growth = lwg > 0 ? lwg * 150 / 0.59 : 0; const daysPreg = parseFloat(prod.days_pregnant) || 0; const pregMP = daysPreg > 200 ? daysPreg * 1.5 : daysPreg > 0 ? daysPreg * 0.7 : 0; return maint + milkMP + growth + pregMP }
  if (species === 'beef') { const adg = parseFloat(prod.target_adg) || 0; return maint + (adg > 0 ? adg * 150 / 0.59 : 0) }
  if (species === 'sheep') { const adg = parseFloat(prod.target_adg) || 0; const woolGrowth = parseFloat(prod.wool_growth) || 0; return maint + (adg > 0 ? adg * 120 / 0.59 : 0) + (woolGrowth > 0 ? woolGrowth / 365 * 1000 * 2 : 0) }
  return maint
}
function estimateMethane(me: number, dmi: number) { if (dmi <= 0 || me <= 0) return { ch4_g: 0, ch4_int: 0 }; const gei = dmi * me / 0.60; const mj = 0.065 * gei; return { ch4_g: mj / 0.0556, ch4_int: mj / 0.0556 / dmi } }

// ── OPTIMIZER ────────────────────────────────────────────
// Solver moved to lib/optimizer (LP with heuristic fallback)
interface OptConstraint { key: string; label: string; enabled: boolean; min: number; max: number }
interface OptIngConstraint { idx: number; min: number; max: number }

// ── DEFAULT OPTIMIZER CONSTRAINTS BY MODE ─────────────────
function defaultOptConstraints(mode: SpeciesMode, stage?: string): OptConstraint[] {
  if (mode === 'pig') {
    const isGrower = stage?.includes('grower')
    const isSow = stage?.includes('sow') || stage?.includes('lactation')
    return [
      { key: 'ne_pig_mj', label: 'NE (MJ/kg)', enabled: true, min: isGrower ? 9.5 : isSow ? 9.0 : 9.5, max: isGrower ? 10.5 : isSow ? 10.5 : 11.0 },
      { key: 'cp_pct', label: 'CP (%)', enabled: true, min: isGrower ? 18 : isSow ? 17 : 14, max: isGrower ? 22 : isSow ? 20 : 18 },
      { key: 'sid_lys_pct', label: 'SID Lys (%)', enabled: true, min: isGrower ? 1.05 : isSow ? 0.85 : 0.70, max: isGrower ? 1.35 : isSow ? 1.10 : 1.00 },
      { key: 'sttd_p_pct', label: 'STTD P (%)', enabled: false, min: 0.25, max: 0.45 },
      { key: 'ca_pct', label: 'Ca (%)', enabled: false, min: 0.50, max: 0.90 },
      { key: 'ee_pct', label: 'Fat (%)', enabled: false, min: 2, max: 8 },
      { key: 'crude_fibre_pct', label: 'CF (%)', enabled: false, min: 2, max: 7 },
    ]
  }
  if (mode === 'poultry') return [
    { key: 'me_poultry_mj', label: 'AME (MJ/kg)', enabled: true, min: 11.0, max: 13.5 },
    { key: 'cp_pct', label: 'CP (%)', enabled: true, min: 16, max: 24 },
    { key: 'sid_lys_pct', label: 'Dig Lys (%)', enabled: true, min: 0.85, max: 1.30 },
    { key: 'sttd_p_pct', label: 'Avail P (%)', enabled: false, min: 0.25, max: 0.50 },
    { key: 'ca_pct', label: 'Ca (%)', enabled: false, min: 0.70, max: 1.10 },
    { key: 'linoleic_pct', label: 'Linoleic (%)', enabled: false, min: 1.0, max: 3.0 },
  ]
  const s = stage || ''
  const isEarlyLact = s.includes('early')
  const isMidLact = s.includes('mid')
  const isLateLact = s.includes('late')
  const isDryFar = s.includes('dry') && s.includes('far')
  const isDryClose = s.includes('dry') && s.includes('close')
  const isFinisher = s.includes('finisher')
  const isGrower = s.includes('grower')

  let me_min = 10.5, me_max = 13.5
  let cp_min = 14, cp_max = 20
  let ndf_min = 25, ndf_max = 45
  let ee_min = 2, ee_max = 7
  let starch_min = 15, starch_max = 35

  if (isEarlyLact)      { me_min=11.5; me_max=13.0; cp_min=16.5; cp_max=19.0; ndf_min=28; ndf_max=38; ee_min=3; ee_max=6; starch_min=18; starch_max=30 }
  else if (isMidLact)   { me_min=11.0; me_max=12.5; cp_min=15.5; cp_max=18.0; ndf_min=30; ndf_max=40; ee_min=3; ee_max=6; starch_min=15; starch_max=28 }
  else if (isLateLact)  { me_min=10.5; me_max=12.0; cp_min=14.5; cp_max=17.0; ndf_min=32; ndf_max=42; ee_min=2; ee_max=5; starch_min=12; starch_max=25 }
  else if (isDryFar)    { me_min=8.5;  me_max=10.5; cp_min=12.0; cp_max=15.0; ndf_min=40; ndf_max=55; ee_min=2; ee_max=4; starch_min=5;  starch_max=15 }
  else if (isDryClose)  { me_min=10.0; me_max=11.5; cp_min=14.0; cp_max=16.0; ndf_min=35; ndf_max=45; ee_min=2; ee_max=5; starch_min=10; starch_max=20 }
  else if (isFinisher)  { me_min=11.5; me_max=13.5; cp_min=12.0; cp_max=15.0; ndf_min=18; ndf_max=30; ee_min=4; ee_max=8; starch_min=25; starch_max=40 }
  else if (isGrower)    { me_min=10.5; me_max=12.5; cp_min=13.0; cp_max=16.0; ndf_min=25; ndf_max=40; ee_min=3; ee_max=7; starch_min=20; starch_max=35 }

  return [
    { key: 'me_mj', label: 'ME (MJ/kg)', enabled: true, min: me_min, max: me_max },
    { key: 'cp_pct', label: 'CP (%)', enabled: true, min: cp_min, max: cp_max },
    { key: 'ndf_pct', label: 'NDF (%)', enabled: true, min: ndf_min, max: ndf_max },
    { key: 'ee_pct', label: 'Fat (%)', enabled: true, min: ee_min, max: ee_max },
    { key: 'ca_pct', label: 'Ca (%)', enabled: false, min: 0.4, max: 1.0 },
    { key: 'p_pct', label: 'P (%)', enabled: false, min: 0.25, max: 0.50 },
    { key: 'starch_pct', label: 'Starch (%)', enabled: true, min: starch_min, max: starch_max },
  ]
}
// ── INPUT VALIDATION ─────────────────────────────────────
interface Warning { type: 'error'|'warning'|'info'; message: string; ingredient?: string }

function validateFormula(ings: any[], safetyRules: any[], requirements: Req[], balanceNuts: {s:string,l:string,v:number,u:string}[], findReq: (s:string)=>Req|undefined, totalPctDM: number, speciesMode: SpeciesMode): Warning[] {
  const warnings: Warning[] = []
  if (ings.length > 0 && totalPctDM < 99.5) warnings.push({ type: 'error', message: `Total inclusion is ${totalPctDM.toFixed(1)}% — must be ~100% DM` })
  if (totalPctDM > 100.5) warnings.push({ type: 'error', message: `Total inclusion is ${totalPctDM.toFixed(1)}% — exceeds 100% DM` })
  ings.forEach(fi => {
    if (!fi.ingredient) return
    const pct = fi.inclusion_pct || 0
    const name = fi.ingredient.name
    if (pct < 0) warnings.push({ type: 'error', message: `${name} has negative inclusion (${pct}%)`, ingredient: name })
    if (pct > 70) warnings.push({ type: 'warning', message: `${name} at ${pct.toFixed(1)}% is very high — check if intentional`, ingredient: name })
    if (fi.ingredient.max_inclusion_pct && pct > fi.ingredient.max_inclusion_pct) {
      warnings.push({ type: 'warning', message: `${name} at ${pct.toFixed(1)}% exceeds max ${fi.ingredient.max_inclusion_pct}%`, ingredient: name })
    }
    safetyRules.forEach(rule => {
      if (!rule.ingredient_name) return
      if (name.toLowerCase().includes(rule.ingredient_name.toLowerCase()) || rule.ingredient_name.toLowerCase().includes(name.toLowerCase().split(' ')[0])) {
        if (pct > 0) {
        const wType = rule.severity === 'danger' ? 'error' : rule.severity === 'warning' ? 'warning' : 'info'
        warnings.push({ type: wType, message: `⚠ ${rule.title}: ${name} — ${rule.description?.substring(0, 100)}`, ingredient: name })
        }
      }
    })
  })
  balanceNuts.forEach(nt => {
    const req = findReq(nt.s)
    if (!req) return
    if (req.critical_min != null && nt.v < req.critical_min) warnings.push({ type: 'error', message: `${nt.l} at ${nt.v.toFixed(2)}${nt.u} is critically below minimum ${req.critical_min}${nt.u}` })
    if (req.critical_max != null && nt.v > req.critical_max) warnings.push({ type: 'error', message: `${nt.l} at ${nt.v.toFixed(2)}${nt.u} critically exceeds maximum ${req.critical_max}${nt.u}` })
    if (req.min != null && nt.v < req.min && nt.v > 0) warnings.push({ type: 'warning', message: `${nt.l} at ${nt.v.toFixed(2)}${nt.u} is below target range (${req.min}–${req.max})` })
    if (req.max != null && nt.v > req.max) warnings.push({ type: 'warning', message: `${nt.l} at ${nt.v.toFixed(2)}${nt.u} exceeds target range (${req.min}–${req.max})` })
  })
  if (speciesMode === 'ruminant') {
    const ndfVal = ings.reduce((s, fi) => s + (fi.ingredient?.ndf_pct||0)*(fi.inclusion_pct||0)/100, 0)
    if (ndfVal > 0 && ndfVal < 25) warnings.push({ type: 'warning', message: `NDF at ${ndfVal.toFixed(1)}% is low — risk of subacute acidosis` })
    const forPct = ings.reduce((s,fi)=>fi.ingredient?.particle_class==='forage'?s+(fi.inclusion_pct||0):s,0)
    if (forPct > 0 && forPct < 25 && totalPctDM > 50) warnings.push({ type: 'warning', message: `Forage at ${forPct.toFixed(0)}% is low — minimum 30% recommended for rumen health` })
  }
  if (speciesMode === 'pig') {
    const caVal = ings.reduce((s, fi) => s + (fi.ingredient?.ca_pct||0)*(fi.inclusion_pct||0)/100, 0)
    const sttdP = ings.reduce((s, fi) => s + (fi.ingredient?.sttd_p_pct||0)*(fi.inclusion_pct||0)/100, 0)
    if (sttdP > 0 && caVal / sttdP > 3.5) warnings.push({ type: 'warning', message: `Ca:STTD P ratio is ${(caVal/sttdP).toFixed(1)}:1 — exceeds 3.5:1 max (reduces P absorption)` })
  }
  return warnings
}

function clampInclusion(value: number): number {
  if (isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

// ── RADAR CHART ──────────────────────────────────────────
function RadarChart({ cp, me, ndf, ee, ca, p, findReq }: { 
  cp: number, me: number, ndf: number, ee: number, ca: number, p: number,
  findReq: (s:string)=>Req|undefined
}) {
  const axes = [
    { label: 'CP', value: cp, short: 'cp' },
    { label: 'ME', value: me, short: 'me' },
    { label: 'NDF', value: ndf, short: 'ndf' },
    { label: 'EE', value: ee, short: 'ee' },
    { label: 'Ca', value: ca, short: 'ca' },
    { label: 'P', value: p, short: 'p' },
  ]
  const points = axes.map(ax => {
    const req = findReq(ax.short)
    const mid = req?.min != null && req?.max != null ? (req.min + req.max) / 2 : ax.value
    return { label: ax.label, actual: mid > 0 ? ax.value / mid : 0, min: req?.min != null ? req.min / mid : 0.8, max: req?.max != null ? req.max / mid : 1.2 }
  })
  const cx = 130, cy = 130, r = 90, n = points.length
  const angleStep = (2 * Math.PI) / n, startAngle = -Math.PI / 2
  const toXY = (frac: number, i: number) => {
    const f = Math.min(Math.max(frac, 0), 1.6), a = startAngle + i * angleStep
    return { x: cx + r * f * Math.cos(a), y: cy + r * f * Math.sin(a) }
  }
  const makePath = (fn: (p: typeof points[0]) => number) =>
    points.map((pt, i) => { const { x, y } = toXY(fn(pt), i); return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}` }).join(' ') + ' Z'
  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-[200px] mx-auto my-1">
      {[0.5, 1.0, 1.5].map(ring => (
        <polygon key={ring} points={Array.from({ length: n }, (_, i) => { const { x, y } = toXY(ring, i); return `${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')} fill="none" stroke="var(--color-border, #3a332d)" strokeWidth="0.5" opacity="0.4" />
      ))}
      {points.map((_, i) => { const { x, y } = toXY(1.5, i); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border, #3a332d)" strokeWidth="0.5" opacity="0.25" /> })}
      <path d={makePath(pt => pt.max)} fill="rgba(76,175,125,0.07)" stroke="none" />
      <path d={makePath(pt => pt.min)} fill="var(--color-surface-bg, #1a1612)" stroke="none" />
      <path d={makePath(pt => pt.min)} fill="none" stroke="#4CAF7D" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <path d={makePath(pt => pt.max)} fill="none" stroke="#4CAF7D" strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <path d={makePath(pt => pt.actual)} fill="rgba(207,134,60,0.15)" stroke="#CF863C" strokeWidth="2" />
      {points.map((pt, i) => { const { x, y } = toXY(pt.actual, i); const c = pt.actual >= pt.min && pt.actual <= pt.max ? '#4CAF7D' : pt.actual < pt.min ? '#D4A843' : '#E24B4A'; return <circle key={i} cx={x} cy={y} r="3.5" fill={c} stroke="var(--color-surface-bg, #1a1612)" strokeWidth="1.5" /> })}
      {points.map((pt, i) => { const { x, y } = toXY(1.78, i); const c = pt.actual >= pt.min && pt.actual <= pt.max ? 'var(--color-text-muted, #a89882)' : pt.actual < pt.min ? '#D4A843' : '#E24B4A'; return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={c} fontSize="10" fontWeight="700" fontFamily="monospace">{pt.label}</text> })}
    </svg>
  )
}

// ── MAIN COMPONENT ───────────────────────────────────────
export default function FormulaBuilderPage() {
  const params = useParams(); const router = useRouter()
  const [formula, setFormula] = useState<any>(null)
  const [ings, setIngs] = useState<any[]>([])
  const [allIngredients, setAllIngredients] = useState<any[]>([])
  const [requirements, setRequirements] = useState<Req[]>([])
  const [ratios, setRatios] = useState<Ratio[]>([])
  const [stageName, setStageName] = useState('')
  const [safetyRules, setSafetyRules] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string,number>>({})
  const [rightTab, setRightTab] = useState<'balance'|'rumen'|'chart'|'cost'>('balance')
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
  const [ingCatFilter, setIngCatFilter] = useState('')
  const [nutModel, setNutModel] = useState<NutModelKey>('AFRC')
  const [showOptimizer, setShowOptimizer] = useState(false)
  const [optRunning, setOptRunning] = useState(false)
  const [optResult, setOptResult] = useState<any>(null)
  const [optConstraints, setOptConstraints] = useState<OptConstraintForUI[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [compareSlots, setCompareSlots] = useState<(CompareSlot|null)[]>([null, null, null, null])
  // ── CHANGE 3.1: Track where requirements came from ──
   const [profileSource, setProfileSource] = useState<'linked'|'legacy'|'none'>('none')
  const [showProfileEditor, setShowProfileEditor] = useState(false)

  const speciesMode: SpeciesMode = formula ? getSpeciesMode(formula.species) : 'ruminant'
  const isRuminant = speciesMode === 'ruminant'
  const isPig = speciesMode === 'pig'
  const isPoultry = speciesMode === 'poultry'
  const isMono = isPig || isPoultry

  useEffect(() => { loadFormula() }, [params.id])

  // ═══════════════════════════════════════════════════════
  // OPTIMIZER A.1: Auto-load constraints from profile
  // Priority: profile requirements → fall back to defaults for missing
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!formula) return
    const mode = getSpeciesMode(formula.species)
    const defaults = defaultOptConstraints(mode, formula.production_stage)
      .map(c => ({ ...c, source: 'default' as const })) as OptConstraintForUI[]

    // If profile loaded → merge profile constraints with defaults
    if (requirements && requirements.length > 0) {
      const fromProfile = buildConstraintsFromProfile(requirements, mode)
      setOptConstraints(mergeWithDefaults(fromProfile, defaults))
    } else {
      setOptConstraints(defaults)
    }
  }, [formula?.species, formula?.production_stage, requirements])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadFormula() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: f } = await supabase.from('formulas').select('*, client:nutrition_clients(id, name, location, species)').eq('id', params.id).single()
    if (!f) { router.push('/formulas'); return }
    setFormula(f); if (f.ai_review) setAiReview(f.ai_review)
    // Initialize production with placeholder defaults so MP demand calculates on load
    // Layer order: defaults (placeholders) → saved DB params → animal group overrides
    const prodFields2 = PRODUCTION_FIELDS[f.species] || PRODUCTION_FIELDS.beef
    const prodDefaults: Record<string,string> = {}
    prodFields2.forEach(field => { prodDefaults[field.key] = field.placeholder })
    const savedProd = (f.production_params && typeof f.production_params === 'object') ? f.production_params : {}
    setProduction(prev => ({ ...prodDefaults, ...savedProd, ...prev }))
    if (f.animal_group_id) {
      const { data: ag } = await supabase.from('client_animals').select('*').eq('id', f.animal_group_id).single()
      if (ag) { const prefill: Record<string,string> = {}; if (ag.avg_weight_kg) prefill.body_weight = String(ag.avg_weight_kg); if (ag.milk_yield) prefill.milk_yield = String(ag.milk_yield); if (ag.milk_fat) prefill.milk_fat = String(ag.milk_fat); if (ag.milk_protein) prefill.milk_protein = String(ag.milk_protein); if (ag.days_in_milk) prefill.days_in_milk = String(ag.days_in_milk); if (ag.days_pregnant) prefill.days_pregnant = String(ag.days_pregnant); if (ag.target_adg) prefill.target_adg = String(ag.target_adg); if (ag.target_fcr) prefill.target_fcr = String(ag.target_fcr); if (ag.body_condition) prefill.body_condition = String(ag.body_condition); if (ag.frame_score) prefill.frame_score = String(ag.frame_score); if (ag.days_on_feed) prefill.days_on_feed = String(ag.days_on_feed); if (ag.sale_weight) prefill.sale_weight = String(ag.sale_weight); if (ag.price_per_kg) prefill.price_per_kg = String(ag.price_per_kg); setProduction(prev => ({ ...prefill, ...prev })) }
    }
    const { data: fi } = await supabase.from('formula_ingredients').select('*, ingredient:ingredients(*)').eq('formula_id', params.id)
    setIngs(fi || [])
    const { data: allIng } = await supabase.from('ingredients').select('*').or(`nutritionist_id.is.null${user?',nutritionist_id.eq.'+user.id:''}`).order('name')
    setAllIngredients(allIng || [])

    // ═══════════════════════════════════════════════════════
    // CHANGE 3.1: Load requirements from linked profile
    // Priority 1: animal_group → requirement_profile_id (assigned profile)
    // Priority 2: nutritionist's custom profile for species+stage
    // Priority 3: legacy search by species + stage + breed (system defaults)
    // ═══════════════════════════════════════════════════════
    let req = null
    let reqSource: 'linked'|'legacy'|'none' = 'none'

    // Priority 1: Load from linked animal group's assigned profile
    if (f.animal_group_id) {
      const { data: ag } = await supabase
        .from('client_animals')
        .select('requirement_profile_id')
        .eq('id', f.animal_group_id)
        .single()
      if (ag?.requirement_profile_id) {
        const { data: profileReq } = await supabase
          .from('animal_requirements')
          .select('*')
          .eq('id', ag.requirement_profile_id)
          .single()
        if (profileReq) {
          req = profileReq
          reqSource = 'linked'
        }
      }
    }

    // Priority 2: Nutritionist's custom profile for this species+stage
    if (!req && user) {
      const { data: customReq } = await supabase
        .from('animal_requirements')
        .select('*')
        .eq('species', f.species)
        .eq('production_stage', f.production_stage)
        .eq('nutritionist_id', user.id)
        .limit(1)
        .single()
      if (customReq) {
        req = customReq
        reqSource = 'linked'
      }
    }

    // Priority 3 (fallback): Legacy search by species + stage + breed (system defaults)
    if (!req && f.breed) {
      const { data: breedReq } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).eq('breed', f.breed).is('nutritionist_id', null).limit(1).single()
      if (breedReq) { req = breedReq; reqSource = 'legacy' }
    }
    if (!req) {
      const { data: genericReq } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).is('nutritionist_id', null).is('breed', null).limit(1).single()
      if (genericReq) { req = genericReq; reqSource = 'legacy' }
    }
    if (!req) {
      const { data: anyReq } = await supabase.from('animal_requirements').select('*').eq('species', f.species).eq('production_stage', f.production_stage).is('nutritionist_id', null).limit(1).single()
      if (anyReq) { req = anyReq; reqSource = 'legacy' }
    }

    if (req) { setRequirements(req.requirements||[]); setRatios(req.ratios||[]); setStageName(req.stage_name||f.production_stage) }
    setProfileSource(reqSource)
    // ═══════════════════════════════════════════════════════

    const { data: rules } = await supabase.from('safety_rules').select('*').eq('species', f.species).is('nutritionist_id', null).eq('active', true)
    setSafetyRules(rules || [])
    if (user) { const { data: pr } = await supabase.from('ingredient_prices').select('ingredient_id, price_per_tonne').eq('nutritionist_id', user.id).order('effective_date', { ascending: false }); const pm: Record<string,number> = {}; pr?.forEach((p: any) => { if (!pm[p.ingredient_id]) pm[p.ingredient_id] = p.price_per_tonne }); setPrices(pm) }
  }

  // ── CALCULATIONS ────────────────────────────────────────
  const batchKg = formula?.batch_size_kg || 1000
  const totalPctDM = ings.reduce((s, fi) => s + (fi.inclusion_pct || 0), 0)
  function calcNut(key: string): number { return ings.reduce((s, fi) => s + (fi.ingredient?.[key]||0)*(fi.inclusion_pct||0)/100, 0) }
  const getAsFedKg = (fi: any) => (fi.inclusion_pct||0)/100*batchKg/((fi.ingredient?.dm_pct||88)/100)
  const totalAsFedKg = ings.reduce((s, fi) => s + getAsFedKg(fi), 0)
  const avgDMPct = totalAsFedKg > 0 ? (totalPctDM/100*batchKg)/totalAsFedKg*100 : 0
  const costAF = ings.reduce((s, fi) => { const afP=totalAsFedKg>0?getAsFedKg(fi)/totalAsFedKg:0; return s+(prices[fi.ingredient_id]||0)*afP }, 0)

  const cp=calcNut('cp_pct'), ee=calcNut('ee_pct'), starch=calcNut('starch_pct'), ash=calcNut('ash_pct')
  const ca=calcNut('ca_pct'), pp=calcNut('p_pct'), mg=calcNut('mg_pct'), k=calcNut('k_pct'), na=calcNut('na_pct'), s2=calcNut('s_pct'), cl=calcNut('cl_pct')
  const me=calcNut('me_mj'), ndf=calcNut('ndf_pct'), adf=calcNut('adf_pct')
  const lys=calcNut('lysine_pct'), met2=calcNut('methionine_pct'), thr=calcNut('threonine_pct')
  const peNDF=ings.reduce((s,fi)=>s+(fi.ingredient?.ndf_pct||0)*(fi.ingredient?.pendf_factor||0)*(fi.inclusion_pct||0)/100,0)
  const dcad=ings.reduce((s,fi)=>s+(fi.ingredient?.dcad||0)*(fi.inclusion_pct||0)/100,0)
  const foragePct=ings.reduce((s,fi)=>fi.ingredient?.particle_class==='forage'?s+(fi.inclusion_pct||0):s,0)
  const concPct=ings.reduce((s,fi)=>fi.ingredient?.particle_class==='concentrate'?s+(fi.inclusion_pct||0):s,0)
  const fcRatio=foragePct+concPct>0?`${Math.round(foragePct/(foragePct+concPct)*100)}:${Math.round(concPct/(foragePct+concPct)*100)}`:'—'

  const ne_pig=calcNut('ne_pig_mj'), me_pig=calcNut('me_pig_mj'), de_pig=calcNut('de_pig_mj')
  const me_poultry=calcNut('me_poultry_mj')
  const sid_lys=calcNut('sid_lys_pct'), sid_met=calcNut('sid_met_pct'), sid_met_cys=calcNut('sid_met_cys_pct')
  const sid_thr=calcNut('sid_thr_pct'), sid_trp=calcNut('sid_trp_pct'), sid_ile=calcNut('sid_ile_pct')
  const sid_leu=calcNut('sid_leu_pct'), sid_val=calcNut('sid_val_pct'), sid_his=calcNut('sid_his_pct')
  const sid_phe_tyr=calcNut('sid_phe_tyr_pct'), sid_arg=calcNut('sid_arg_pct')
  const sttd_p=calcNut('sttd_p_pct'), crude_fibre=calcNut('crude_fibre_pct'), linoleic=calcNut('linoleic_pct')
  const caP_sttd = sttd_p > 0 ? ca / sttd_p : 0
  const caP_total = pp > 0 ? ca / pp : 0

  const aaRatios = sid_lys > 0 ? {
    met_cys: (sid_met_cys / sid_lys * 100).toFixed(0),
    thr: (sid_thr / sid_lys * 100).toFixed(0),
    trp: (sid_trp / sid_lys * 100).toFixed(0),
    ile: (sid_ile / sid_lys * 100).toFixed(0),
    leu: (sid_leu / sid_lys * 100).toFixed(0),
    val: (sid_val / sid_lys * 100).toFixed(0),
    his: (sid_his / sid_lys * 100).toFixed(0),
    phe_tyr: (sid_phe_tyr / sid_lys * 100).toFixed(0),
  } : null

  const neMcal = ne_pig / 4.184
  const sidLysToNE = neMcal > 0 ? (sid_lys * 10) / neMcal : 0

  const primaryEnergy = isPig ? ne_pig : isPoultry ? (me_poultry || me_pig) : me
  const primaryEnergyLabel = isPig ? 'NE' : isPoultry ? 'AME' : 'ME'
  const primaryEnergyUnit = 'MJ'

  const de_rum = me > 0 ? me / 0.82 : 0
  const tdn = de_rum > 0 ? de_rum * 100 / 18.4 : 0
  const nel = me > 0 ? 0.703 * me - 0.19 : 0
  const meMcal = me / 4.184
  const nem = me > 0 ? (1.37 * meMcal - 0.138 * meMcal * meMcal + 0.0105 * meMcal * meMcal * meMcal - 1.12) * 4.184 : 0
  const neg = me > 0 ? (1.42 * meMcal - 0.174 * meMcal * meMcal + 0.0122 * meMcal * meMcal * meMcal - 1.65) * 4.184 : 0

  const actualDMI = parseFloat(production.dmi) || 0
  const predictedDMI = formula ? predictDMI(formula.species, production, me) : 10
  const useDMI = actualDMI || predictedDMI
  const dmiPct = predictedDMI > 0 && actualDMI > 0 ? (actualDMI / predictedDMI * 100) : 0

  const curModel = NUT_MODELS[nutModel]
  const mpData = isRuminant ? calculateMP(ings,me,useDMI,nutModel) : { totalCP:0,totalRDP:0,totalUDP:0,fme:0,mcp:0,mcpE:0,mcpN:0,mpFromMicrobes:0,mpFromBypass:0,mpSupply:0 }
  const mpDemand = isRuminant && formula ? calculateMPDemand(formula.species,production) : 0
  const mpBalance = mpData.mpSupply - mpDemand
  const methane = isRuminant ? estimateMethane(me,useDMI) : { ch4_g:0, ch4_int:0 }

  const dmiCost = costAF/1000*useDMI
  let incomePerDay = 0
  if (formula?.species==='cattle') { const my=parseFloat(production.milk_yield)||0; incomePerDay=my*(parseFloat(production.milk_fat)||4)/100*(formula.milk_price_fat||5.10)+my*(parseFloat(production.milk_protein)||3.3)/100*(formula.milk_price_protein||7.10) }
  else { incomePerDay=(parseFloat(production.target_adg)||0)*(parseFloat(production.price_per_kg)||0); if(formula?.species==='pig') incomePerDay=(parseFloat(production.target_adg)||0)/1000*(parseFloat(production.price_per_kg)||0) }
  const marginPerDay = incomePerDay - dmiCost

  function findReq(short: string): Req|undefined { return requirements.find(r => { const n = r.nutrient.toLowerCase(); if(short==='cp') return n.includes('crude protein')||n.includes(' cp'); if(short==='me') return n.includes('energy')||n.includes(' me ')||n.includes(' de ')||n.includes(' ne '); if(short==='ndf') return n.includes('ndf'); if(short==='ee') return n.includes('fat')||n.includes('ether'); if(short==='ca') return n.includes('calcium'); if(short==='p') return n.includes('phosphorus'); if(short==='lys') return n.includes('lysine'); if(short==='sid_lys') return n.includes('sid lys')||n.includes('lysine'); if(short==='sid_met_cys') return n.includes('met+cys')||n.includes('methionine'); if(short==='sid_thr') return n.includes('threonine'); if(short==='sid_trp') return n.includes('tryptophan'); if(short==='sttd_p') return n.includes('sttd p')||n.includes('phosphorus'); return false }) }

  const balanceNuts = isMono ? [
    {s:isPig?'me':'me',l:primaryEnergyLabel, v:primaryEnergy, u:primaryEnergyUnit},
    {s:'cp', l:'CP', v:cp, u:'%'},
    {s:'sid_lys', l:'SID Lys', v:sid_lys, u:'%'},
    {s:'sid_met_cys', l:'SID M+C', v:sid_met_cys, u:'%'},
    {s:'sid_thr', l:'SID Thr', v:sid_thr, u:'%'},
    {s:'sid_trp', l:'SID Trp', v:sid_trp, u:'%'},
    {s:'sttd_p', l:'STTD P', v:sttd_p, u:'%'},
    {s:'ca', l:'Ca', v:ca, u:'%'},
  ] : [
    {s:'cp',l:'CP',v:cp,u:'%'},{s:'me',l:'ME',v:me,u:'MJ'},{s:'ndf',l:'NDF',v:ndf,u:'%'},
    {s:'ee',l:'EE',v:ee,u:'%'},{s:'ca',l:'Ca',v:ca,u:'%'},{s:'p',l:'P',v:pp,u:'%'},{s:'lys',l:'Lys',v:lys,u:'%'}
  ]

  const formulaWarnings = ings.length > 0 ? validateFormula(ings, safetyRules, requirements, balanceNuts, findReq, totalPctDM, speciesMode) : []
 
  if (isRuminant && ings.length > 0 && totalPctDM > 50) {
    const cpReq = findReq('cp')
    const cpNearMin = cpReq?.min != null && cp <= cpReq.min * 1.05
    const cpInRange = cpReq?.min != null && cpReq?.max != null && cp >= cpReq.min && cp <= cpReq.max
    const cpAboveMax = cpReq?.max != null && cp > cpReq.max
 
    if (mpBalance > 300 && cpAboveMax) {
      formulaWarnings.push({ type: 'warning', message: `MP surplus (+${mpBalance.toFixed(0)}g/d) with CP above target (${cp.toFixed(1)}% > ${cpReq!.max}%) — consider replacing bypass protein with cheaper RDP sources` })
    } else if (mpBalance > 200 && cpNearMin) {
      formulaWarnings.push({ type: 'info', message: `MP surplus (+${mpBalance.toFixed(0)}g/d) but CP near minimum (${cp.toFixed(1)}%) — protein sources are efficient, do not reduce CP below ${cpReq!.min}%` })
    } else if (mpBalance > 300 && cpInRange) {
      formulaWarnings.push({ type: 'info', message: `MP surplus (+${mpBalance.toFixed(0)}g/d) — could shift some UDP sources to cheaper RDP while keeping CP ≥${cpReq!.min}%` })
    } else if (mpBalance < -100 && mpBalance >= -400) {
      formulaWarnings.push({ type: 'warning', message: `MP deficit (${mpBalance.toFixed(0)}g/d) — consider adding bypass protein (canola meal, DDG, blood meal)` })
    } else if (mpBalance < -400) {
      formulaWarnings.push({ type: 'error', message: `Severe MP deficit (${mpBalance.toFixed(0)}g/d) — cow will mobilize body protein, expect production loss and condition loss` })
    }
 
    if (mpData.mcpE < mpData.mcpN * 0.9) {
      formulaWarnings.push({ type: 'info', message: `Microbial protein is energy-limited (FME ${mpData.fme.toFixed(0)} MJ/d) — increasing ME would improve MP supply more than adding protein` })
    } else if (mpData.mcpN < mpData.mcpE * 0.85) {
      formulaWarnings.push({ type: 'warning', message: `Microbial protein is N-limited (RDP ${mpData.totalRDP.toFixed(0)}g/d) — rumen microbes have energy but insufficient degradable protein` })
    }
  }
 
  const errorCount = formulaWarnings.filter(w => w.type === 'error').length
  const warningCount = formulaWarnings.filter(w => w.type === 'warning').length
  
  let metC=0,warnC=0,failC=0
  balanceNuts.forEach(nt=>{const req=findReq(nt.s);if(!req)return;const inR=(req.min!=null&&req.max!=null)?nt.v>=req.min&&nt.v<=req.max:(req.min!=null?nt.v>=req.min:true)&&(req.max!=null?nt.v<=req.max:true);const crit=(req.critical_max!=null&&nt.v>req.critical_max)||(req.critical_min!=null&&nt.v<req.critical_min);if(crit)failC++;else if(inR)metC++;else warnC++})

  function updateIngPct(idx: number,pct: number){const u=[...ings];u[idx]={...u[idx],inclusion_pct:clampInclusion(pct)};setIngs(u);setSaved(false)}
  function toggleLock(idx: number){const u=[...ings];u[idx]={...u[idx],locked:!u[idx].locked};setIngs(u)}
  function removeIng(idx: number){setIngs(ings.filter((_,i)=>i!==idx));setSaved(false)}
  async function addIngredient(ingId: string){if(ings.some(fi=>fi.ingredient_id===ingId))return;const supabase=await getSupabase();const{data}=await supabase.from('formula_ingredients').insert({formula_id:params.id,ingredient_id:ingId,inclusion_pct:0,locked:false}).select('*, ingredient:ingredients(*)').single();if(data){setIngs([...ings,data]);setShowAddIng(false);setSaved(false)}}
   async function handleSave(){if(errorCount>0&&!confirm(`There are ${errorCount} errors in this formula (total ≠ 100%, critical nutrients). Save anyway?`))return;setSaving(true);const supabase=await getSupabase();await supabase.from('formula_ingredients').delete().eq('formula_id',params.id);if(ings.length>0){await supabase.from('formula_ingredients').insert(ings.map(fi=>({formula_id:params.id as string,ingredient_id:fi.ingredient_id,inclusion_pct:fi.inclusion_pct,inclusion_kg:fi.inclusion_pct/100*batchKg,cost_per_tonne:prices[fi.ingredient_id]||null,locked:fi.locked})))}
  await supabase.from('formulas').update({total_cost_per_tonne:costAF,total_cp_pct:cp,total_me_mj:isMono?primaryEnergy:me,total_income_per_day:incomePerDay,total_margin_per_day:marginPerDay,production_params:production}).eq('id',params.id);setSaving(false);setSaved(true)}
  async function updateStatus(s:string){const supabase=await getSupabase();await supabase.from('formulas').update({status:s,version:(formula.version||1)+(s==='approved'?1:0)}).eq('id',params.id);setFormula({...formula,status:s,version:(formula.version||1)+(s==='approved'?1:0)})}
  function handleExport(){
    const headers=['Ingredient','DM%','Incl%DM','kg DM','kg AF',isMono?'NE MJ':'ME MJ','CP%',isMono?'SID Lys%':'Lys%',isMono?'STTD P%':'P%','Ca%','$/t','$/batch']
    const rows=ings.filter(fi=>fi.inclusion_pct>0).map(fi=>{const ing=fi.ingredient;const dmKg=(fi.inclusion_pct||0)/100*batchKg;const afKg=getAsFedKg(fi);const price=prices[fi.ingredient_id]||0;return[ing?.name,ing?.dm_pct,fi.inclusion_pct?.toFixed(2),dmKg.toFixed(1),afKg.toFixed(1),isMono?(ing?.ne_pig_mj||0).toFixed(1):(ing?.me_mj||0).toFixed(1),ing?.cp_pct,isMono?(ing?.sid_lys_pct||0).toFixed(2):(ing?.lysine_pct||0).toFixed(2),isMono?(ing?.sttd_p_pct||0).toFixed(2):(ing?.p_pct||0).toFixed(2),ing?.ca_pct,price.toFixed(0),(price*afKg/1000).toFixed(2)].join(',')})
    const meta = [`# Formula: ${formula.name}`,`# Species: ${formula.species} (${speciesMode} mode)`,`# Stage: ${stageName||formula.production_stage}`,`# ${primaryEnergyLabel}: ${primaryEnergy.toFixed(1)} MJ | CP: ${cp.toFixed(1)}%`,isMono?`# SID Lys: ${sid_lys.toFixed(2)}% | STTD P: ${sttd_p.toFixed(2)}% | Ca: ${ca.toFixed(2)}%`:`# MP: ${mpData.mpSupply.toFixed(0)}g/d | F:C: ${fcRatio} | NDF: ${ndf.toFixed(1)}%`,`# Cost/t AF: $${costAF.toFixed(0)}`,isPig?`# SID Lys:NE = ${sidLysToNE.toFixed(2)} g/Mcal`:'','']
    const csv=[...meta,headers.join(','),...rows].join('\n');const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${formula.name.replace(/[^a-zA-Z0-9]/g,'_')}_v${formula.version}.csv`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)}
  function handleRunOptimizer() {
    setOptRunning(true)
    setOptResult(null)
    const ingC = ings.map((fi, idx) => ({
      idx,
      min: fi.locked ? fi.inclusion_pct : 0,
      max: fi.locked ? fi.inclusion_pct : (fi.ingredient?.max_inclusion_pct || 60),
    }))
    setTimeout(() => {
      const result = runOptimizerLP(ings, prices, optConstraints, ingC, 8000)
      setOptResult(result)
      setOptRunning(false)
      // Fire-and-forget: persist run for analytics/undo (never blocks UI)
      fetch(`/api/formulas/${params.id}/optimize-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: result.feasible ? 'feasible' : 'infeasible',
          method: result.method ?? 'lp',
          cost_before_af: costAF,
          cost_after_af: result.feasible ? result.cost : null,
          constraints_used: optConstraints.filter(c => c.enabled),
          solution: result.solution,
          diagnostics: result.diagnostics ?? null,
          applied: false,
        }),
      }).catch(() => { /* silent fail */ })
    }, 100)
  }
  function applyOptResult(){if(!optResult?.solution)return;setIngs(ings.map((fi,idx)=>({...fi,inclusion_pct:optResult.solution[idx]||0})));setSaved(false);setShowOptimizer(false)}
  function saveToCompareSlot(slotIdx:number){const slots=[...compareSlots];slots[slotIdx]={name:`Diet ${slotIdx+1} — ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`,ings:ings.map(fi=>({name:fi.ingredient?.name,pct:fi.inclusion_pct,id:fi.ingredient_id})),production:{...production},nutrients:{cp,me:primaryEnergy,ndf,ee,ca,p:pp,starch,caP:isMono?caP_sttd:caP_total,peNDF,sid_lys,sttd_p},cost:costAF,margin:marginPerDay,mp:mpData.mpSupply,fc:fcRatio,timestamp:new Date()};setCompareSlots(slots)}
  function recallFromSlot(slotIdx:number){const slot=compareSlots[slotIdx];if(!slot)return;setIngs(ings.map(fi=>{const s2=slot.ings.find((si:any)=>si.id===fi.ingredient_id);return s2?{...fi,inclusion_pct:s2.pct}:{...fi,inclusion_pct:0}}));setProduction(slot.production);setSaved(false)}
  function clearSlot(idx:number){const s=[...compareSlots];s[idx]=null;setCompareSlots(s)}

  // ── AI ──────────────────────────────────────────────────
  function buildCtx(){
    const base = `FORMULA: ${formula.name} (v${formula.version})\nSPECIES: ${formula.species} | STAGE: ${stageName} | MODE: ${speciesMode}\nREQ PROFILE: ${profileSource === 'linked' ? 'Linked profile' : profileSource === 'legacy' ? 'System default (legacy)' : 'None loaded'}`
    if (isMono) return `${base}\n${primaryEnergyLabel}:${primaryEnergy.toFixed(1)}MJ CP:${cp.toFixed(1)}%\nSID Lys:${sid_lys.toFixed(2)}% M+C:${sid_met_cys.toFixed(2)}% Thr:${sid_thr.toFixed(2)}% Trp:${sid_trp.toFixed(3)}%\nIle:${sid_ile.toFixed(2)}% Leu:${sid_leu.toFixed(2)}% Val:${sid_val.toFixed(2)}% His:${sid_his.toFixed(2)}%\nSID Lys:NE=${sidLysToNE.toFixed(2)}g/Mcal\nSTTD P:${sttd_p.toFixed(2)}% Ca:${ca.toFixed(2)}% Ca:STTD P=${caP_sttd.toFixed(1)}:1\nNa:${na.toFixed(2)}% Cl:${cl.toFixed(2)}%\nCost:$${costAF.toFixed(0)}/t\n${ings.map(fi=>`${fi.ingredient?.name}: ${fi.inclusion_pct.toFixed(1)}%`).join('\n')}`
    const warnCtx = formulaWarnings.filter(w => w.type !== 'error').map(w => `[${w.type.toUpperCase()}] ${w.message}`).join('\n')
    return `${base} | MODEL: ${curModel.label}\nCP:${cp.toFixed(1)}% ME:${me.toFixed(1)} NDF:${ndf.toFixed(1)}% F:C:${fcRatio} peNDF:${peNDF.toFixed(1)}% DCAD:${dcad.toFixed(0)}\nMP:${mpData.mpSupply.toFixed(0)}g/d demand:${mpDemand.toFixed(0)}g/d bal:${mpBalance>0?'+':''}${mpBalance.toFixed(0)}g/d\nCost:$${costAF.toFixed(0)}/t Margin:$${marginPerDay.toFixed(2)}/d\n${ings.map(fi=>`${fi.ingredient?.name}: ${fi.inclusion_pct.toFixed(1)}% ${fi.ingredient?.particle_class==='forage'?'[F]':'[C]'}`).join('\n')}${warnCtx ? '\n\nSYSTEM WARNINGS (respect these):\n' + warnCtx : ''}`
  }
  async function handleAiReview(){setAiLoading(true);setShowAi(true);setAiReview(null);try{const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`Full ${speciesMode} diet review${isPig?' using PIC/NRC 2012 guidelines. Check SID Lys:NE ratio, AA ratios, STTD P, Ca:P ratio, CP minimum.':isPoultry?' for poultry. Check AME, dig AA, available P, Ca, linoleic acid.':` using ${curModel.label} model. MP, DMI, F:C, DCAD, methane.`} AU context.\n\n${buildCtx()}`})});const data=await res.json();setAiReview(data.response||'No response.');const supabase=await getSupabase();await supabase.from('formulas').update({ai_review:data.response,ai_reviewed_at:new Date().toISOString()}).eq('id',params.id)}catch{setAiReview('Error.')}setAiLoading(false)}
  async function handleAiQ(){if(!aiQuestion.trim())return;setAiLoading(true);const q=aiQuestion;setAiQuestion('');try{const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:`${q}\n\n${buildCtx()}`})});const data=await res.json();setAiReview(data.response||'No response.')}catch{setAiReview('Error.')}setAiLoading(false)}

  if (!formula) return <div className="p-7 text-text-ghost">Loading...</div>
  const prodFields = PRODUCTION_FIELDS[formula.species]||PRODUCTION_FIELDS.beef

  const addableIngs = allIngredients.filter(i=>{
    if(ings.some(fi=>fi.ingredient_id===i.id)) return false
    if(!(i.species_suitable as string[]||[]).includes(formula.species)) return false
    if(ingSearch&&!i.name.toLowerCase().includes(ingSearch.toLowerCase())) return false
    if(ingCatFilter==='forage'&&i.particle_class!=='forage') return false
    if(ingCatFilter==='concentrate'&&i.particle_class!=='concentrate') return false
    if(ingCatFilter==='energy'&&i.category!=='energy') return false
    if(ingCatFilter==='protein'&&i.category!=='protein') return false
    if(ingCatFilter==='byproduct'&&i.category!=='byproduct') return false
    if(ingCatFilter==='mineral'&&i.category!=='mineral') return false
    if(ingCatFilter==='additive'&&i.category!=='additive') return false
    if(ingCatFilter==='premix'&&i.source==='premix') return true
    if(ingCatFilter==='premix'&&i.source!=='premix') return false
    return true
  })

  const catFilters = isMono
    ? [{k:'',l:'All'},{k:'energy',l:'⚡ Energy'},{k:'protein',l:'🥩 Protein'},{k:'additive',l:'💊 Additive'},{k:'mineral',l:'🧪 Mineral'},{k:'byproduct',l:'♻ Byproduct'},{k:'premix',l:'📦 Premix'}]
    : [{k:'',l:'All'},{k:'forage',l:'🌿 Forage'},{k:'concentrate',l:'🌾 Concentrate'},{k:'energy',l:'⚡ Energy'},{k:'protein',l:'🥩 Protein'},{k:'byproduct',l:'♻ Byproduct'},{k:'mineral',l:'🧪 Mineral'},{k:'premix',l:'📦 Premix'}]

  const rumenTabLabel = isMono ? '🧬 AA Profile' : '🧬 Rumen'

  return (
    <div className="p-4 max-w-[1400px] h-[calc(100vh-32px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2"><Link href="/formulas" className="text-text-ghost hover:text-text-muted no-underline text-sm">&larr;</Link><h1 className="text-xl font-bold text-text">{formula.name}</h1>
            <select value={formula.status} onChange={e=>updateStatus(e.target.value)} className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase border-none cursor-pointer ${formula.status==='draft'?'bg-status-amber/15 text-status-amber':formula.status==='review'?'bg-status-blue/15 text-status-blue':'bg-brand/15 text-brand'}`}>{['draft','review','approved','active'].map(s=><option key={s} value={s}>{s}</option>)}</select>
            <span className="text-xs text-text-ghost font-mono">v{formula.version}</span>
            {/* SPECIES MODE BADGE */}
            <span className={`text-2xs px-2 py-0.5 rounded font-bold uppercase ${isPig?'bg-[#BE5529]/15 text-[#BE5529]':isPoultry?'bg-[#C9A043]/15 text-[#C9A043]':'bg-[#2E6B42]/15 text-[#2E6B42]'}`}>{speciesMode}</span>
            {/* CHANGE 3.1: PROFILE SOURCE BADGE */}
            {profileSource !== 'none' && (
              <span className={`text-2xs px-2 py-0.5 rounded font-mono ${profileSource === 'linked' ? 'bg-brand/10 text-brand' : 'bg-status-amber/10 text-status-amber'}`}>
                {profileSource === 'linked' ? '● profile' : '○ legacy'}
              </span>
            )}
          </div>
          <p className="text-xs text-text-ghost mt-0.5">{formula.client?.name||'—'} · {formula.species} · {stageName||formula.production_stage} · {batchKg}kg</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={()=>setShowProfileEditor(true)} className="btn btn-ghost btn-sm" title="Profile"><Shield size={14}/> Profile</button>
          <button onClick={()=>setShowCompare(true)} className="btn btn-ghost btn-sm" title="Compare"><GitCompare size={14}/> Compare</button>
          <button onClick={()=>{setOptResult(null);setShowOptimizer(true)}} className="btn btn-ghost btn-sm" title="Optimize"><Zap size={14}/> Optimize</button>
          <button onClick={handleExport} className="btn btn-ghost btn-sm" title="Export CSV"><Download size={14}/> Export</button>
          <button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm"><Sparkles size={14}/> AI</button>
          <button onClick={handleSave} disabled={saving} className={`btn btn-primary btn-sm ${saved?'bg-brand/50':''}`}><Save size={14}/> {saved?'✓':'Save'}</button>
        </div>
      </div>

      {/* Production */}
      <div className="mb-1.5"><button onClick={()=>setShowProduction(!showProduction)} className="flex items-center gap-1 text-2xs font-bold text-text-ghost uppercase tracking-wider bg-transparent border-none cursor-pointer hover:text-text-muted">Production {showProduction?<ChevronUp size={10}/>:<ChevronDown size={10}/>}</button>
        {showProduction&&<div className="grid grid-cols-8 gap-1.5 mt-1.5 p-2.5 bg-surface-card rounded-lg border border-border">{prodFields.map(f=>(<div key={f.key}><label className="text-[10px] text-text-ghost block">{f.label} ({f.unit})</label><input value={production[f.key]||''} onChange={e=>setProduction({...production,[f.key]:e.target.value})} placeholder={f.placeholder} className="w-full px-1.5 py-1 rounded border border-border bg-surface-deep text-text-dim text-xs font-mono outline-none focus:border-brand"/></div>))}</div>}
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-2 mb-2 px-2.5 py-1 bg-surface-card rounded-lg border border-border text-xs flex-wrap">
        <button onClick={()=>setBasis(basis==='dm'?'asfed':'dm')} className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-surface-deep cursor-pointer hover:border-brand/30">{basis==='dm'?<ToggleLeft size={12} className="text-brand"/>:<ToggleRight size={12} className="text-status-amber"/>}<span className={`font-bold font-mono text-2xs ${basis==='dm'?'text-brand':'text-status-amber'}`}>{basis==='dm'?'DM':'AF'}</span></button>
        {isRuminant && <select value={nutModel} onChange={e=>setNutModel(e.target.value as NutModelKey)} className="px-1.5 py-0.5 rounded-md border border-border bg-surface-deep text-2xs font-bold font-mono text-text-dim cursor-pointer outline-none">{(Object.keys(NUT_MODELS) as NutModelKey[]).map(k=>(<option key={k} value={k}>{NUT_MODELS[k].label}</option>))}</select>}
        {isMono && <span className="px-1.5 py-0.5 rounded-md border border-border bg-surface-deep text-2xs font-bold font-mono text-text-dim">NRC 2012</span>}
        <span className="font-mono font-bold text-brand">{metC}met</span>{warnC>0&&<span className="font-mono font-bold text-status-amber">{warnC}w</span>}{failC>0&&<span className="font-mono font-bold text-status-red">{failC}c</span>}
        <span className="text-text-ghost">|</span><span className={`font-mono font-bold ${totalPctDM>100.1||totalPctDM<99.9?'text-status-red':'text-brand'}`}>{totalPctDM.toFixed(1)}%</span>
        {isRuminant&&<><span className="text-text-ghost">F:C</span><span className="font-mono font-bold text-text-dim">{fcRatio}</span></>}
        {isRuminant&&<><span className="text-text-ghost">MP</span><span className={`font-mono font-bold ${mpBalance>=0?'text-brand':'text-status-red'}`}>{mpBalance>0?'+':''}{mpBalance.toFixed(0)}g</span></>}
        {isPig&&<><span className="text-text-ghost">Lys:NE</span><span className="font-mono font-bold text-text-dim">{sidLysToNE.toFixed(2)}</span></>}
        {isMono&&<><span className="text-text-ghost">SID Lys</span><span className="font-mono font-bold text-brand">{sid_lys.toFixed(2)}%</span></>}
        {dmiPct>0&&<><span className="text-text-ghost">DMI</span><span className={`font-mono font-bold ${dmiPct>102?'text-status-red':dmiPct>95?'text-brand':'text-status-amber'}`}>{dmiPct.toFixed(0)}%</span></>}
        <div className="flex-1"/><span className="font-mono font-bold text-status-amber">${costAF.toFixed(0)}/t</span>
        {marginPerDay!==0&&<span className={`font-mono font-bold ${marginPerDay>0?'text-brand':'text-status-red'}`}>${marginPerDay>0?'+':''}${marginPerDay.toFixed(2)}/d</span>}
      </div>
      {formulaWarnings.length > 0 && (
        <div className="mb-2 px-2.5 py-1.5 rounded-lg border border-status-amber/30 bg-status-amber/5 max-h-24 overflow-auto">
          {formulaWarnings.slice(0, 5).map((w, i) => (
            <div key={i} className={`flex items-start gap-1.5 py-0.5 text-[10px] ${w.type === 'error' ? 'text-status-red font-bold' : w.type === 'warning' ? 'text-status-amber' : 'text-text-muted'}`}>
              <span className="flex-shrink-0">{w.type === 'error' ? '✗' : w.type === 'warning' ? '⚠' : 'ℹ'}</span>
              <span>{w.message}</span>
            </div>
          ))}
          {formulaWarnings.length > 5 && <div className="text-[10px] text-text-ghost mt-0.5">+{formulaWarnings.length - 5} more warnings</div>}
        </div>
      )}
      
      {/* Main Grid */}
      <div className="grid grid-cols-[1fr_330px] gap-3 flex-1 min-h-0">
        {/* Ingredients */}
        <div className="card flex flex-col">
          <div className="card-header"><span className="text-xs font-bold text-text-muted uppercase tracking-wider">Ingredients ({ings.length})</span><button onClick={()=>{setIngSearch('');setShowAddIng(true)}} className="btn btn-ghost btn-sm"><Plus size={14}/> Add</button></div>
          <div className="flex-1 overflow-auto">
            {ings.map((fi,idx)=>{const ing=fi.ingredient;if(!ing)return null;const price=prices[fi.ingredient_id];const dmKg=(fi.inclusion_pct||0)/100*batchKg;const afKg=getAsFedKg(fi);const dispKg=basis==='dm'?dmKg:afKg
            const previewEnergy = isMono ? (ing.ne_pig_mj||0) : (ing.me_mj||0)
            const previewELabel = isPig ? 'NE' : isPoultry ? 'AME' : 'ME'
            const previewLys = isMono ? (ing.sid_lys_pct||0) : (ing.lysine_pct||0)
            const previewLysLabel = isMono ? 'SIDLys' : 'Lys'
            return(<div key={fi.id||idx} className="grid grid-cols-[20px_1fr_65px_50px_45px_20px_20px] px-2 py-1.5 border-b border-border/5 items-center gap-1">
              <button onClick={()=>toggleLock(idx)} className={`bg-transparent border-none cursor-pointer flex ${fi.locked?'text-status-amber':'text-text-ghost/30'}`}>{fi.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
              <div><div className="text-sm font-semibold text-text-dim truncate">{ing.name}</div><div className="text-[10px] text-text-ghost font-mono">{ing.category}{price?' $'+price.toFixed(0):''} · CP {ing.cp_pct||0}% · {previewELabel} {previewEnergy.toFixed(1)} · {previewLysLabel} {previewLys.toFixed(2)}%</div></div>
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
            {isRuminant&&<span className="font-mono text-text-ghost">F:C {fcRatio}</span>}
            {isMono&&<span className="font-mono text-text-ghost">{primaryEnergyLabel} {primaryEnergy.toFixed(1)}</span>}
          </div>}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-0 overflow-hidden">
          <div className="flex gap-px bg-border rounded overflow-hidden mb-2">{(['balance','rumen','chart','cost'] as const).map(t=>(<button key={t} onClick={()=>setRightTab(t)} className={`flex-1 py-1 text-2xs font-bold uppercase text-center border-none cursor-pointer ${rightTab===t?'bg-brand text-white':'bg-surface-card text-text-ghost hover:text-text-muted'}`}>{t==='balance'?'⚖ Balance':t==='rumen'?rumenTabLabel:t==='chart'?'📊 Chart':'$ Margin'}</button>))}</div>

          {/* BALANCE */}
          {rightTab==='balance'&&<div className="card p-2.5 flex-1 overflow-auto">
            <RadarChart cp={cp} me={me} ndf={ndf} ee={ee} ca={ca} p={pp} findReq={findReq} />
            <div className="grid grid-cols-3 gap-1.5 mb-2">{[{l:'Met',v:metC,c:'text-brand'},{l:'Warn',v:warnC,c:'text-status-amber'},{l:'Crit',v:failC,c:'text-status-red'}].map((x,i)=>(<div key={i} className="bg-surface-deep rounded-lg p-1.5 text-center"><div className={`text-lg font-bold font-mono ${x.c}`}>{x.v}</div><div className="text-[9px] text-text-ghost">{x.l}</div></div>))}</div>
            {balanceNuts.map(nt=>{const req=findReq(nt.s);if(!req)return(<div key={nt.s} className="flex items-center gap-2 py-0.5"><span className="w-10 text-[10px] font-semibold text-text-muted font-mono text-right">{nt.l}</span><div className="flex-1 h-1 bg-surface-deep rounded-sm"/><span className="w-14 text-[10px] font-mono text-text text-right">{nt.v<0.1?nt.v.toFixed(3):nt.v.toFixed(2)}{nt.u}</span></div>)
              const inR=(req.min!=null&&req.max!=null)?nt.v>=req.min&&nt.v<=req.max:(req.min!=null?nt.v>=req.min:true)&&(req.max!=null?nt.v<=req.max:true);const crit=(req.critical_max!=null&&nt.v>req.critical_max)||(req.critical_min!=null&&nt.v<req.critical_min)
              const color=crit?'bg-status-red':inR?'bg-brand':'bg-status-amber';const tc=crit?'text-status-red':inR?'text-brand':'text-status-amber'
              const ceil=Math.max(req.max||req.target||1,req.critical_max||0)*1.5;const pV=Math.min((nt.v/ceil)*100,100);const pMin=req.min!=null?(req.min/ceil)*100:0;const pMax=req.max!=null?(req.max/ceil)*100:100
              return(<div key={nt.s} className="mb-1.5"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-text-muted">{nt.l}</span><span className={`text-[10px] font-bold font-mono ${tc}`}>{nt.v<0.1?nt.v.toFixed(3):nt.v.toFixed(2)}{nt.u} <span className="font-normal text-text-ghost">({req.min}-{req.max})</span></span></div><div className="relative h-2.5 bg-surface-deep rounded mt-0.5"><div className="absolute h-full rounded opacity-15" style={{left:`${pMin}%`,width:`${pMax-pMin}%`,background:crit?'#E05252':inR?'#4CAF7D':'#D4A843'}}/><div className={`absolute top-1/2 w-2 h-2 rounded-full -translate-y-1/2 -translate-x-1/2 border-2 border-surface-bg ${color}`} style={{left:`${pV}%`}}/></div></div>)
            })}
            <div className="mt-2 pt-1.5 border-t border-border grid grid-cols-3 gap-1">
              {isMono ? (
                [['Na',na,'%'],['Cl',cl,'%'],['EE',ee,'%'],['CF',crude_fibre,'%'],['Starch',starch,'%'],['Ca:P',caP_sttd,':1'],isPig?['Lys:NE',sidLysToNE,'g/Mc']:['Linoleic',linoleic,'%'],['Mg',mg,'%'],['K',k,'%']].map(([l,v,u])=>(<div key={l as string} className="text-center"><div className="text-[8px] text-text-ghost uppercase">{l}</div><div className="text-[10px] font-mono font-bold text-text-dim">{(v as number)<1?(v as number).toFixed(3):(v as number).toFixed(1)}{u}</div></div>))
              ) : (
                [['NDF',ndf,'%'],['Starch',starch,'%'],['EE',ee,'%'],['Ca:P',caP_total,':1'],['Mg',mg,'%'],['Na',na,'%'],['K',k,'%'],['S',s2,'%'],['ADF',adf,'%']].map(([l,v,u])=>(<div key={l as string} className="text-center"><div className="text-[8px] text-text-ghost uppercase">{l}</div><div className="text-[10px] font-mono font-bold text-text-dim">{(v as number)<1?(v as number).toFixed(3):(v as number).toFixed(1)}{u}</div></div>))
              )}
            </div>
          </div>}

          {/* RUMEN / AA PROFILE */}
          {rightTab==='rumen'&&<div className="card p-2.5 flex-1 overflow-auto">
            {isMono ? (
              <>
                <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">SID Amino Acid Profile <span className="text-text-ghost font-normal normal-case">(NRC 2012)</span></div>
                {[['SID Lys',sid_lys],['SID Met',sid_met],['SID Met+Cys',sid_met_cys],['SID Thr',sid_thr],['SID Trp',sid_trp],['SID Ile',sid_ile],['SID Leu',sid_leu],['SID Val',sid_val],['SID His',sid_his],['SID Phe+Tyr',sid_phe_tyr],['SID Arg',sid_arg]].map(([l,v])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold text-text-dim">{(v as number).toFixed(3)}%</span></div>))}
                {aaRatios && <>
                  <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">AA Ratios to SID Lys (%)</div>
                  {[['Met+Cys',aaRatios.met_cys, isPig?'55':'60'],['Thr',aaRatios.thr, isPig?'63':'65'],['Trp',aaRatios.trp, isPig?'19':'18'],['Ile',aaRatios.ile, isPig?'54':'60'],['Leu',aaRatios.leu, '100'],['Val',aaRatios.val, isPig?'65':'70'],['His',aaRatios.his, isPig?'32':'32'],['Phe+Tyr',aaRatios.phe_tyr, isPig?'95':'95']].map(([l,v,min])=>{
                    const vn = parseInt(v as string); const mn = parseInt(min as string); const ok = vn >= mn
                    return(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><div className="flex items-center gap-1.5"><span className="text-[9px] text-text-ghost">min {min}%</span><span className={`text-[10px] font-mono font-bold ${ok?'text-brand':'text-status-red'}`}>{v}%</span></div></div>)
                  })}</div>
                </>}
                <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">Energy</div>
                {[['DE',de_pig,'MJ/kg'],['ME',me_pig,'MJ/kg'],['NE',ne_pig,'MJ/kg'],['NE',neMcal.toFixed(2),'Mcal/kg']].map(([l,v,u])=>(<div key={`${l}-${u}`} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold text-text-dim">{typeof v === 'number'?v.toFixed(2):v} {u}</span></div>))}</div>
                {isPig && sidLysToNE > 0 && <div className={`mt-2 text-center text-xs font-bold font-mono px-2 py-1.5 rounded-lg ${sidLysToNE > 2 ? 'bg-brand/10 text-brand' : 'bg-status-amber/10 text-status-amber'}`}>SID Lys:NE = {sidLysToNE.toFixed(2)} g/Mcal</div>}
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">Metabolisable Protein <span className="text-text-ghost font-normal normal-case">({curModel.label})</span></div>
                <div className={`text-center text-xs font-bold font-mono mb-2 px-2 py-1.5 rounded-lg ${mpBalance>=0?'bg-brand/10 text-brand':'bg-status-red/10 text-status-red'}`}>MP: {mpData.mpSupply.toFixed(0)}g / {mpDemand.toFixed(0)}g = {mpBalance>0?'+':''}{mpBalance.toFixed(0)} g/d</div>
                {[[curModel.rdpLabel,mpData.totalRDP,'g/d'],[curModel.udpLabel,mpData.totalUDP,'g/d'],['FME',mpData.fme,'MJ/d'],['MCP',mpData.mcp,'g/d'],['MP microbes',mpData.mpFromMicrobes,'g/d'],['MP bypass',mpData.mpFromBypass,'g/d']].map(([l,v,u])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold text-text-dim">{(v as number).toFixed(0)} {u}</span></div>))}
                <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">Rumen Health</div>
                {[['F:C',fcRatio,foragePct<30?'text-status-red':foragePct<40?'text-status-amber':'text-brand'],['peNDF',peNDF.toFixed(1)+'%',peNDF<18?'text-status-red':peNDF<22?'text-status-amber':'text-brand'],['DCAD',dcad.toFixed(0)+' mEq/kg','text-text-dim']].map(([l,v,c])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className={`text-[10px] font-mono font-bold ${c}`}>{v}</span></div>))}</div>
                <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">Energy</div>
                {[['NEl',nel.toFixed(1),'MJ'],['NEm',nem.toFixed(1),'MJ'],['NEg',neg.toFixed(1),'MJ'],['TDN',tdn.toFixed(1),'%'],['Methane',methane.ch4_g.toFixed(0),'g/d']].map(([l,v,u])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold text-text-dim">{v} {u}</span></div>))}</div>
              </>
            )}
          </div>}

          {/* CHART */}
          {rightTab==='chart'&&<div className="card p-2.5 flex-1 overflow-auto">
            {(()=>{
              const nutrients = isMono
                ? [{l:primaryEnergyLabel,v:primaryEnergy,u:'MJ',target:0,min:0,max:0},{l:'CP',v:cp,u:'%',target:0,min:0,max:0},{l:'SID Lys',v:sid_lys,u:'%',target:0,min:0,max:0},{l:'SID M+C',v:sid_met_cys,u:'%',target:0,min:0,max:0},{l:'SID Thr',v:sid_thr,u:'%',target:0,min:0,max:0},{l:'SID Trp',v:sid_trp,u:'%',target:0,min:0,max:0},{l:'STTD P',v:sttd_p,u:'%',target:0,min:0,max:0},{l:'Ca',v:ca,u:'%',target:0,min:0,max:0},{l:'Na',v:na,u:'%',target:0,min:0,max:0}]
                : [{l:'ME',v:me,u:'MJ',target:0,min:0,max:0},{l:'CP',v:cp,u:'%',target:0,min:0,max:0},{l:'NDF',v:ndf,u:'%',target:0,min:0,max:0},{l:'EE',v:ee,u:'%',target:0,min:0,max:0},{l:'Ca',v:ca,u:'%',target:0,min:0,max:0},{l:'P',v:pp,u:'%',target:0,min:0,max:0},{l:'Starch',v:starch,u:'%',target:0,min:0,max:0}]
              nutrients.forEach(nt=>{const req=findReq(nt.l.toLowerCase().replace('sid ','').replace('sttd ',''));if(req){nt.target=req.target;nt.min=req.min||0;nt.max=req.max||0}})
              const hasReqs=nutrients.some(nt=>nt.target>0)
              return(<>
              <div className="text-[10px] font-bold text-text-muted uppercase mb-1.5">{hasReqs?'Actual vs ':''}Target</div>
              {nutrients.map(nt=>{
                const pctOfTarget=nt.target>0?(nt.v/nt.target*100):0
                const inRange=nt.min>0&&nt.max>0?nt.v>=nt.min&&nt.v<=nt.max:true
                const barColor=!hasReqs?'#378ADD':inRange?'#4CAF7D':nt.v<(nt.min||0)?'#D4A843':'#E24B4A'
                const maxBar=Math.max(nt.max||nt.target||nt.v,nt.v)*1.3;const barW=maxBar>0?Math.min(nt.v/maxBar*100,100):0;const minW=maxBar>0&&nt.min>0?nt.min/maxBar*100:0;const maxW=maxBar>0&&nt.max>0?nt.max/maxBar*100:100
                return(<div key={nt.l} className="mb-2"><div className="flex justify-between items-baseline mb-0.5"><span className="text-[10px] font-semibold text-text-muted">{nt.l}</span><div className="flex items-baseline gap-1.5"><span className="text-[10px] font-mono font-bold" style={{color:barColor}}>{nt.v<0.1?nt.v.toFixed(3):nt.v.toFixed(2)}{nt.u}</span>{nt.target>0&&<span className="text-[9px] text-text-ghost">/ {nt.target<0.1?nt.target.toFixed(3):nt.target.toFixed(1)}</span>}{pctOfTarget>0&&<span className={`text-[9px] font-mono font-bold ${inRange?'text-brand':pctOfTarget<90?'text-status-amber':'text-status-red'}`}>{pctOfTarget.toFixed(0)}%</span>}</div></div><div className="relative h-3 bg-surface-deep rounded-sm overflow-hidden">{nt.min>0&&nt.max>0&&<div className="absolute h-full rounded-sm" style={{left:`${minW}%`,width:`${maxW-minW}%`,background:'rgba(76,175,125,0.12)'}}/>}<div className="h-full rounded-sm transition-all" style={{width:`${barW}%`,background:barColor,opacity:0.7}}/></div></div>)})}
              <div className="mt-2 pt-1.5 border-t border-border"><div className="text-[10px] font-bold text-text-muted uppercase mb-1">Key ratios</div>
              {isMono
                ? [['Ca:STTD P',caP_sttd.toFixed(1)+':1',caP_sttd<1.8||caP_sttd>3.0?'#E24B4A':'#4CAF7D'],isPig?['SID Lys:NE',sidLysToNE.toFixed(2)+' g/Mc',sidLysToNE<2?'#D4A843':'#4CAF7D']:['Linoleic',linoleic.toFixed(2)+'%','#378ADD'],['CP min',cp.toFixed(1)+'%',cp<13?'#E24B4A':'#4CAF7D'],['Na',na.toFixed(2)+'%',na<0.15?'#E24B4A':'#4CAF7D']].map(([l,v,c])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold" style={{color:c as string}}>{v}</span></div>))
                : [['F:C',fcRatio,foragePct<30?'#E24B4A':foragePct<40?'#D4A843':'#4CAF7D'],['Ca:P',caP_total.toFixed(2)+':1',caP_total<1.5||caP_total>2.5?'#E24B4A':'#4CAF7D'],['peNDF',peNDF.toFixed(1)+'%',peNDF<18?'#E24B4A':peNDF<22?'#D4A843':'#4CAF7D'],['MP bal',mpBalance.toFixed(0)+' g/d',mpBalance<0?'#E24B4A':'#4CAF7D']].map(([l,v,c])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[10px] text-text-muted">{l}</span><span className="text-[10px] font-mono font-bold" style={{color:c as string}}>{v}</span></div>))
              }</div>
            </>)})()}
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
            {isPig && <div className="bg-surface-deep rounded-lg p-2 mb-2"><div className="text-[9px] text-text-ghost">Feed cost / kg gain</div><div className="text-base font-bold font-mono text-text-dim">${(parseFloat(production.target_fcr)||2.5) * costAF / 1000 > 0 ? ((parseFloat(production.target_fcr)||2.5) * costAF / 1000).toFixed(2) : '—'}</div></div>}
            <div className="text-[9px] font-bold text-text-ghost uppercase mb-1">Breakdown</div>
            {ings.filter(fi=>fi.inclusion_pct>0).sort((a,b)=>(prices[b.ingredient_id]||0)*getAsFedKg(b)-(prices[a.ingredient_id]||0)*getAsFedKg(a)).map(fi=>{const price=prices[fi.ingredient_id]||0;const afP=totalAsFedKg>0?getAsFedKg(fi)/totalAsFedKg:0;const ingC=price*afP;const pctC=costAF>0?ingC/costAF*100:0;return(<div key={fi.id} className="flex items-center gap-1 py-0.5"><span className="text-[10px] text-text-dim flex-1 truncate">{fi.ingredient?.name}</span><div className="w-12 h-1 bg-surface-deep rounded-sm overflow-hidden"><div className="h-full bg-status-amber rounded-sm" style={{width:`${pctC}%`}}/></div><span className="text-[10px] font-mono text-status-amber w-10 text-right">${ingC.toFixed(0)}</span></div>)})}
          </div>}
        </div>
      </div>

      {/* ADD INGREDIENT MODAL */}
      {showAddIng&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddIng(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="text-lg font-bold text-text">Add Ingredient</h2><span className="text-2xs text-text-ghost font-mono">{addableIngs.length} for {formula.species}</span><button onClick={()=>setShowAddIng(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="p-3 border-b border-border">
          <div className="relative mb-2"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"/><input value={ingSearch} onChange={e=>setIngSearch(e.target.value)} placeholder="Search ingredients..." className="input pl-9" autoFocus/></div>
          <div className="flex gap-1 flex-wrap">{catFilters.map(f=>(<button key={f.k} onClick={()=>setIngCatFilter(f.k)} className={`px-2.5 py-1 rounded text-2xs font-semibold transition-all border cursor-pointer ${ingCatFilter===f.k?'border-brand bg-brand/10 text-brand':'border-border text-text-ghost hover:border-border-light bg-transparent'}`}>{f.l}</button>))}</div>
        </div>
        <div className="flex-1 overflow-auto">{addableIngs.length>0?addableIngs.map(ing=>{
          const eLabel = isPig ? 'NE' : isPoultry ? 'AME' : 'ME'
          const eVal = isPig ? (ing.ne_pig_mj||0) : isPoultry ? (ing.me_pig_mj||0) : (ing.me_mj||0)
          const lysLabel = isMono ? 'SID Lys' : 'Lys'
          const lysVal = isMono ? (ing.sid_lys_pct||0) : (ing.lysine_pct||0)
          const pLabel = isMono ? 'STTD P' : 'P'
          const pVal = isMono ? (ing.sttd_p_pct||0) : (ing.p_pct||0)
          return(<div key={ing.id} onClick={()=>addIngredient(ing.id)} className="flex items-center gap-3 px-4 py-2 border-b border-border/5 hover:bg-[#312B26] cursor-pointer"><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{ing.name}</div><div className="text-2xs text-text-ghost">{ing.category} · CP {ing.cp_pct||0}% · {eLabel} {eVal.toFixed(1)} · {lysLabel} {lysVal.toFixed(2)}% · {pLabel} {pVal.toFixed(2)}%</div></div>{prices[ing.id]&&<span className="text-xs font-mono text-status-amber">${prices[ing.id].toFixed(0)}/t</span>}<Plus size={14} className="text-brand"/></div>)}):<div className="px-4 py-8 text-center text-sm text-text-ghost">No matching ingredients for {formula.species}.</div>}</div>
      </div></div>}

      {/* OPTIMIZER */}
      {showOptimizer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowOptimizer(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-3xl p-6 shadow-2xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Zap size={18} className="text-status-amber" />
                <div>
                  <div className="text-lg font-bold text-text">Least-Cost Optimizer</div>
                  <div className="text-2xs text-text-ghost">
                    {speciesMode} mode · {optConstraints.filter(c => c.enabled).length} active constraints
                    {optResult?.method && (
                      <span className="ml-1 px-1 rounded bg-brand/10 text-brand font-mono text-[9px]">
                        {optResult.method === 'lp' ? 'LP' : 'HEURISTIC'}
                      </span>
                    )}
                    {optConstraints.some(c => c.source === 'profile') && (
                      <span className="ml-1 px-1 rounded bg-brand/10 text-brand font-mono text-[9px]">PROFILE</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowOptimizer(false)} className="text-text-ghost bg-transparent border-none cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Profile auto-loaded notice */}
            {optConstraints.some(c => c.source === 'profile') && (
              <div className="mb-3 px-3 py-2 rounded-lg border border-brand/30 bg-brand/5 text-2xs text-text-muted">
                ✓ Constraints auto-loaded from <strong className="text-brand">linked profile</strong>. Edit values below or uncheck to ignore.
              </div>
            )}

            {/* Constraints */}
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
              Nutrient Constraints<span className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {optConstraints.map((c, i) => (
                <div key={c.key} className={`flex items-center gap-2 p-2.5 rounded-lg border ${c.enabled ? 'border-brand/30 bg-brand/5' : 'border-border bg-surface-bg'}`}>
                  <input
                    type="checkbox"
                    checked={c.enabled}
                    onChange={e => { const u = [...optConstraints]; u[i] = { ...u[i], enabled: e.target.checked }; setOptConstraints(u) }}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-text-dim truncate">{c.label}</div>
                    {c.source === 'profile' && (
                      <div className="text-[9px] text-brand/70 font-mono">● from profile</div>
                    )}
                  </div>
                  <input
                    type="number"
                    value={c.min}
                    step="0.01"
                    onChange={e => { const u = [...optConstraints]; u[i] = { ...u[i], min: parseFloat(e.target.value) || 0 }; setOptConstraints(u) }}
                    className="w-16 px-1.5 py-1 rounded border border-border bg-surface-deep text-xs font-mono text-right outline-none"
                    disabled={!c.enabled}
                  />
                  <span className="text-2xs text-text-ghost">to</span>
                  <input
                    type="number"
                    value={c.max}
                    step="0.01"
                    onChange={e => { const u = [...optConstraints]; u[i] = { ...u[i], max: parseFloat(e.target.value) || 0 }; setOptConstraints(u) }}
                    className="w-16 px-1.5 py-1 rounded border border-border bg-surface-deep text-xs font-mono text-right outline-none"
                    disabled={!c.enabled}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleRunOptimizer}
                disabled={optRunning || ings.length === 0}
                className="btn btn-primary flex-1 justify-center disabled:opacity-50"
              >
                {optRunning ? <><Loader2 size={14} className="animate-spin" /> Optimizing...</> : <><Zap size={14} /> Run Optimizer</>}
              </button>
            </div>

            {/* Results */}
            {optResult && (
              <div className={`p-4 rounded-lg border ${optResult.feasible ? 'border-brand/30 bg-brand/5' : 'border-status-red/30 bg-status-red/5'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-bold ${optResult.feasible ? 'text-brand' : 'text-status-red'}`}>
                    {optResult.feasible ? '✓ Feasible' : '✗ No feasible solution'}
                  </span>
                  {optResult.feasible && (
                    <div className="text-xs text-text-muted">
                      <strong className="text-status-amber font-mono">${optResult.cost.toFixed(0)}/t</strong>
                      <span className="ml-2">save <strong className="text-brand">${(costAF - optResult.cost).toFixed(0)}/t</strong></span>
                    </div>
                  )}
                </div>

                {/* Infeasibility reasons */}
                {!optResult.feasible && optResult.diagnostics?.infeasibility_reasons?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-2xs font-bold text-status-red uppercase mb-1">Why no solution exists</div>
                    <ul className="text-2xs text-text-muted space-y-0.5">
                      {optResult.diagnostics.infeasibility_reasons.slice(0, 5).map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5"><span className="flex-shrink-0">•</span><span>{r}</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                {optResult.feasible && (
                  <>
                    {/* Binding constraints */}
                    {optResult.diagnostics?.binding_constraints?.length > 0 && (
                      <div className="mb-3 px-3 py-2 rounded border border-status-amber/30 bg-status-amber/5">
                        <div className="text-2xs font-bold text-status-amber uppercase mb-1">⚡ Active limits ({optResult.diagnostics.binding_constraints.length})</div>
                        <div className="text-2xs text-text-muted">
                          {optResult.diagnostics.binding_constraints.map((bc: string, i: number) => {
                            const c = optConstraints.find(oc => oc.key === bc)
                            return (
                              <span key={i} className="inline-block mr-2">
                                <span className="font-mono">{c?.label || bc}</span>
                              </span>
                            )
                          })}
                        </div>
                        <div className="text-[9px] text-text-ghost mt-0.5">These constraints are limiting further cost reduction.</div>
                      </div>
                    )}

                    {/* Diff table */}
                    <div className="mb-3">
                      <div className="text-2xs font-bold text-text-muted uppercase mb-1.5">Inclusion changes</div>
                      <div className="rounded border border-border overflow-hidden">
                        <table className="w-full text-2xs">
                          <thead className="bg-surface-deep">
                            <tr>
                              <th className="px-2 py-1 text-left text-text-ghost font-semibold">Ingredient</th>
                              <th className="px-2 py-1 text-right text-text-ghost font-semibold">Before</th>
                              <th className="px-2 py-1 text-right text-text-ghost font-semibold">After</th>
                              <th className="px-2 py-1 text-right text-text-ghost font-semibold">Δ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ings.map((fi, idx) => {
                              const before = fi.inclusion_pct || 0
                              const after = optResult.solution[idx] || 0
                              const delta = after - before
                              if (Math.abs(delta) < 0.05 && before === 0) return null
                              const deltaColor = Math.abs(delta) < 0.05 ? 'text-text-ghost' : delta > 0 ? 'text-brand' : 'text-status-amber'
                              return (
                                <tr key={fi.id || idx} className="border-t border-border/30 hover:bg-surface-deep/30">
                                  <td className="px-2 py-1 text-text-dim flex items-center gap-1">
                                    {fi.locked && <Lock size={9} className="text-status-amber" />}
                                    <span className="truncate">{fi.ingredient?.name}</span>
                                  </td>
                                  <td className="px-2 py-1 text-right font-mono text-text-ghost">{before.toFixed(1)}%</td>
                                  <td className="px-2 py-1 text-right font-mono font-bold text-text-dim">{after.toFixed(1)}%</td>
                                  <td className={`px-2 py-1 text-right font-mono font-bold ${deltaColor}`}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Warnings */}
                    {optResult.diagnostics?.warnings?.length > 0 && (
                      <div className="mb-3 px-3 py-2 rounded border border-status-amber/30 bg-status-amber/5">
                        <div className="text-2xs font-bold text-status-amber uppercase mb-1">Warnings</div>
                        <ul className="text-2xs text-text-muted space-y-0.5">
                          {optResult.diagnostics.warnings.map((w: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5"><span className="flex-shrink-0">⚠</span><span>{w}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={applyOptResult}
                      className="btn btn-primary btn-sm w-full justify-center"
                    >
                      Apply Optimized Diet
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPARE */}
      {showCompare&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowCompare(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-4xl p-6 shadow-2xl max-h-[80vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2.5"><GitCompare size={18} className="text-brand"/><div className="text-lg font-bold text-text">Diet Compare</div></div><button onClick={()=>setShowCompare(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="flex gap-2 mb-4">{[0,1,2,3].map(i=>(<button key={i} onClick={()=>saveToCompareSlot(i)} className="btn btn-ghost btn-sm flex-1 justify-center">Save Slot {i+1}</button>))}</div>
        <div className="grid grid-cols-4 gap-3">{compareSlots.map((slot, i) => (<div key={i} className={`rounded-lg border p-3 ${slot?'border-border bg-surface-card':'border-border/30 bg-surface-bg/50'}`}><div className="text-2xs font-bold text-text-ghost uppercase mb-2">Slot {i+1}</div>{slot?<><div className="text-xs font-semibold text-text-dim mb-2">{slot.name}</div>{(isMono?[['Energy',slot.nutrients.me?.toFixed(1)],['SID Lys',(slot.nutrients.sid_lys||0).toFixed(2)+'%'],['STTD P',(slot.nutrients.sttd_p||0).toFixed(2)+'%'],['Cost','$'+slot.cost.toFixed(0)+'/t']]:[['ME',slot.nutrients.me?.toFixed(1)],['CP',slot.nutrients.cp?.toFixed(1)+'%'],['F:C',slot.fc],['Cost','$'+slot.cost.toFixed(0)+'/t']]).map(([l,v])=>(<div key={l as string} className="flex justify-between py-0.5"><span className="text-[9px] text-text-ghost">{l}</span><span className="text-[9px] font-mono font-bold text-text-dim">{v}</span></div>))}<div className="flex gap-1 mt-2"><button onClick={()=>recallFromSlot(i)} className="btn btn-primary btn-sm flex-1 justify-center text-2xs"><RotateCcw size={10}/> Recall</button><button onClick={()=>clearSlot(i)} className="btn btn-ghost btn-sm text-2xs"><X size={10}/></button></div></>:<div className="text-2xs text-text-ghost text-center py-6">Empty</div>}</div>))}</div>
      </div></div>}

      {/* AI */}
      {showAi&&<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAi(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border"><div className="flex items-center gap-2"><Sparkles size={16} className="text-brand"/><div className="text-base font-bold text-text">Optia AI Review</div><span className={`text-2xs px-1.5 py-0.5 rounded font-bold ${isPig?'bg-[#BE5529]/15 text-[#BE5529]':isPoultry?'bg-[#C9A043]/15 text-[#C9A043]':'bg-[#2E6B42]/15 text-[#2E6B42]'}`}>{speciesMode}</span></div><button onClick={()=>setShowAi(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="flex-1 overflow-auto p-4">{aiLoading&&!aiReview&&<div className="flex items-center gap-3 text-text-ghost"><Loader2 size={16} className="animate-spin"/> Analyzing {speciesMode} diet...</div>}{aiReview&&<div className="text-sm text-text-dim leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{__html:aiReview.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br/>')}}/>}</div>
        <div className="p-4 border-t border-border flex gap-2"><input value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAiQ()} placeholder="Ask..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-brand"/><button onClick={handleAiQ} disabled={aiLoading} className="btn btn-primary btn-sm">{aiLoading?<Loader2 size={14} className="animate-spin"/>:'Ask'}</button><button onClick={handleAiReview} disabled={aiLoading} className="btn btn-ai btn-sm">Re-review</button></div>
      </div></div>}
      
     {/* PROFILE EDITOR */}
      <ProfileEditorModal
        open={showProfileEditor}
        onClose={() => setShowProfileEditor(false)}
        species={formula?.species}
        stage={formula?.production_stage}
      />
    </div>
  )
}
