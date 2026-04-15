'use client'

import { useState, useEffect } from 'react'
import { FileText, BarChart3, Users, FlaskConical, X, Download, Loader2 } from 'lucide-react'

export default function ReportsPage() {
  const [formulas, setFormulas] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [formulaIngs, setFormulaIngs] = useState<Record<string,any[]>>({})
  const [animals, setAnimals] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string,number>>({})
  const [profileName, setProfileName] = useState('')
  const [showReport, setShowReport] = useState<string|null>(null)
  const [selectedFormula, setSelectedFormula] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadData() }, [])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('nutritionist_profiles').select('*').eq('id', user.id).single()
    if (profile) setProfileName(profile.full_name || profile.business_name || '')
    const { data: f } = await supabase.from('formulas').select('*, client:nutrition_clients(name, location, contact_name)').not('status','eq','archived').order('name')
    setFormulas(f || [])
    const { data: c } = await supabase.from('nutrition_clients').select('*').eq('active', true).order('name')
    setClients(c || [])
    const { data: allFi } = await supabase.from('formula_ingredients').select('*, ingredient:ingredients(name, category, cp_pct, me_mj, ndf_pct, adf_pct, ee_pct, ca_pct, p_pct, mg_pct, k_pct, na_pct, s_pct, lysine_pct, methionine_pct, threonine_pct, starch_pct)')
    const fiMap: Record<string,any[]> = {}
    allFi?.forEach((fi: any) => { if (!fiMap[fi.formula_id]) fiMap[fi.formula_id] = []; fiMap[fi.formula_id].push(fi) })
    setFormulaIngs(fiMap)
    const { data: a } = await supabase.from('client_animals').select('*').order('name')
    setAnimals(a || [])
    const { data: pr } = await supabase.from('ingredient_prices').select('ingredient_id, price_per_tonne').eq('nutritionist_id', user.id).order('effective_date', { ascending: false })
    const pm: Record<string,number> = {}
    pr?.forEach((p: any) => { if (!pm[p.ingredient_id]) pm[p.ingredient_id] = p.price_per_tonne })
    setPrices(pm)
  }

  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  function css() {
    return `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',system-ui,sans-serif;color:#1a1a1a;background:#fff;padding:40px;max-width:860px;margin:0 auto;font-size:13px;line-height:1.5}
    @media print{body{padding:20px}.no-print{display:none!important}@page{margin:15mm}}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}h2{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4CAF7D;font-weight:700;margin:28px 0 10px;display:flex;align-items:center;gap:8px}h2::after{content:'';flex:1;height:1px;background:#e0e0e0}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #4CAF7D}
    .logo{display:flex;align-items:center;gap:10px}.logo-box{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#4CAF7D,#3a9468);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px}
    .meta{display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap}.meta-item .label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600}.meta-item .value{font-size:13px;font-weight:600;color:#333}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}thead th{padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:700;border-bottom:2px solid #e0e0e0}
    tbody td{padding:6px 10px;border-bottom:1px solid #f0f0f0}tbody tr:hover{background:#fafafa}
    .mono{font-family:'JetBrains Mono',monospace}.right{text-align:right}.center{text-align:center}.bold{font-weight:700}.green{color:#4CAF7D}.amber{color:#D4A843}.red{color:#E05252}.gray{color:#999}
    .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}.stat-box{background:#f8f9fa;border-radius:8px;padding:10px;text-align:center;border:1px solid #eee}
    .stat-box .sl{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600}.stat-box .sv{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace;margin-top:2px}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-family:'JetBrains Mono',monospace}
    .badge-draft{background:#FFF3E0;color:#D4A843}.badge-approved,.badge-active{background:#E8F5E9;color:#4CAF7D}.badge-review{background:#E3F2FD;color:#5B9BD5}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;font-size:10px;color:#ccc}
    .disclaimer{font-size:9px;color:#ccc;margin-top:10px;line-height:1.6}
    .btn-print{display:inline-block;padding:10px 24px;background:#4CAF7D;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;margin-bottom:20px}
    .section-card{background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:12px;border:1px solid #eee}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px}`
  }

  function headerHTML(title: string, subtitle: string) {
    return `<button class="btn-print no-print" onclick="window.print()">Download PDF (Ctrl+P)</button>
    <div class="header"><div class="logo"><div class="logo-box">OF</div><div><div style="font-size:16px;font-weight:700">Optia Feed</div><div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#999;font-weight:600">by Agrometrics</div></div></div>
    <div style="text-align:right"><div style="font-size:13px;font-weight:600;color:#333">${title}</div><div style="font-size:11px;color:#999">${date}</div>${profileName?`<div style="font-size:11px;color:#999;margin-top:2px">${profileName}</div>`:''}</div></div>
    <h1>${subtitle}</h1>`
  }

  function footerHTML() {
    return `<div class="footer"><span>Generated by Optia Feed &middot; Agrometrics</span><span>${date}</span></div>
    <div class="disclaimer">This report is generated for professional use. The nutritionist is responsible for verifying all values. Optia Feed is a decision-support tool.</div>`
  }

  // ── FORMULA REPORT ─────────────────────────────────────
  function generateFormulaReport() {
    const f = formulas.find(x => x.id === selectedFormula)
    if (!f) return
    const ings = formulaIngs[f.id] || []
    const batchKg = f.batch_size_kg || 1000
    const totalPct = ings.reduce((s: number, fi: any) => s + (fi.inclusion_pct||0), 0)
    const calc = (key: string) => ings.reduce((s: number, fi: any) => s + (fi.ingredient?.[key]||0)*(fi.inclusion_pct||0)/100, 0)
    const costPerT = ings.reduce((s: number, fi: any) => s + (prices[fi.ingredient_id]||0)*(fi.inclusion_pct||0)/100, 0)
    const ca = calc('ca_pct'), pp = calc('p_pct'), caP = pp>0?(ca/pp):0

    const ingRows = ings.map((fi: any) => `<tr><td class="bold">${fi.ingredient?.name||''}</td><td class="center gray" style="font-size:11px">${fi.ingredient?.category||''}</td><td class="right mono bold">${fi.inclusion_pct.toFixed(1)}%</td><td class="right mono gray">${(fi.inclusion_pct/100*batchKg).toFixed(0)} kg</td><td class="right mono amber">${prices[fi.ingredient_id]?'$'+prices[fi.ingredient_id].toFixed(0):'—'}</td><td class="right mono gray">${prices[fi.ingredient_id]?'$'+(prices[fi.ingredient_id]*fi.inclusion_pct/100).toFixed(0):'—'}</td></tr>`).join('')

    const nutData = [['Crude Protein (CP)',calc('cp_pct'),'%'],['Metabolisable Energy (ME)',calc('me_mj'),'MJ/kg'],['NDF',calc('ndf_pct'),'%'],['ADF',calc('adf_pct'),'%'],['Ether Extract (Fat)',calc('ee_pct'),'%'],['Starch',calc('starch_pct'),'%'],['Calcium (Ca)',calc('ca_pct'),'%'],['Phosphorus (P)',calc('p_pct'),'%'],['Magnesium (Mg)',calc('mg_pct'),'%'],['Potassium (K)',calc('k_pct'),'%'],['Sodium (Na)',calc('na_pct'),'%'],['Sulphur (S)',calc('s_pct'),'%'],['Lysine',calc('lysine_pct'),'%'],['Methionine',calc('methionine_pct'),'%'],['Threonine',calc('threonine_pct'),'%'],['Ca:P Ratio',caP,':1']]
    const nutRows = nutData.map(([l,v,u])=>`<tr><td class="bold">${l}</td><td class="right mono bold">${typeof v==='number'?((l as string).includes('Ca:P')?v.toFixed(2):v<1?v.toFixed(3):v.toFixed(1)):v}</td><td class="center gray">${u}</td></tr>`)

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${f.name} — Formula Report</title><style>${css()}</style></head><body>
    ${headerHTML('Formula Report', f.name)}
    <div style="font-size:12px;color:#666;margin-bottom:16px">Version ${f.version} &middot; <span class="badge badge-${f.status}">${f.status}</span> &middot; ${f.species} &middot; ${f.production_stage?.replace(/_/g,' ')}</div>
    <div class="meta"><div class="meta-item"><div class="label">Client</div><div class="value">${f.client?.name||'Unassigned'}</div></div><div class="meta-item"><div class="label">Location</div><div class="value">${f.client?.location||'—'}</div></div><div class="meta-item"><div class="label">Batch Size</div><div class="value">${batchKg.toLocaleString()} kg</div></div><div class="meta-item"><div class="label">Date</div><div class="value">${date}</div></div></div>
    <div class="stat-grid"><div class="stat-box"><div class="sl">Cost / Tonne</div><div class="sv amber">$${costPerT.toFixed(0)}</div></div><div class="stat-box"><div class="sl">Crude Protein</div><div class="sv green">${calc('cp_pct').toFixed(1)}%</div></div><div class="stat-box"><div class="sl">ME Energy</div><div class="sv green">${calc('me_mj').toFixed(1)}</div></div><div class="stat-box"><div class="sl">Ca:P Ratio</div><div class="sv ${caP>=1.5&&caP<=2.5?'green':'red'}">${caP.toFixed(2)}:1</div></div></div>
    <h2>Ingredient Composition</h2>
    <table><thead><tr><th>Ingredient</th><th class="center">Category</th><th class="right">Inclusion</th><th class="right">Per Batch</th><th class="right">Price/t</th><th class="right">Cost</th></tr></thead><tbody>${ingRows}<tr style="border-top:2px solid #333"><td class="bold" colspan="2">TOTAL</td><td class="right mono bold">${totalPct.toFixed(1)}%</td><td class="right mono bold">${(totalPct/100*batchKg).toFixed(0)} kg</td><td></td><td class="right mono bold amber">$${costPerT.toFixed(0)}/t</td></tr></tbody></table>
    <h2>Calculated Nutrient Profile</h2>
    <div class="two-col"><div><table><thead><tr><th>Nutrient</th><th class="right">Value</th><th class="center">Unit</th></tr></thead><tbody>${nutRows.slice(0, Math.ceil(nutData.length/2)).join('')}</tbody></table></div><div><table><thead><tr><th>Nutrient</th><th class="right">Value</th><th class="center">Unit</th></tr></thead><tbody>${nutRows.slice(Math.ceil(nutData.length/2)).join('')}</tbody></table></div></div>
    <h2>Cost Breakdown</h2>
    <table><thead><tr><th>Ingredient</th><th class="right">Inclusion</th><th class="right">Price/t</th><th class="right">Cost Contribution</th><th class="right">% of Total</th></tr></thead><tbody>${ings.filter((fi:any)=>fi.inclusion_pct>0).sort((a:any,b:any)=>(prices[b.ingredient_id]||0)*b.inclusion_pct/100-(prices[a.ingredient_id]||0)*a.inclusion_pct/100).map((fi:any)=>{const p=prices[fi.ingredient_id]||0;const c=p*fi.inclusion_pct/100;const pct=costPerT>0?c/costPerT*100:0;return`<tr><td>${fi.ingredient?.name}</td><td class="right mono">${fi.inclusion_pct.toFixed(1)}%</td><td class="right mono">${p?'$'+p.toFixed(0):'—'}</td><td class="right mono bold amber">${c?'$'+c.toFixed(0):'—'}</td><td class="right mono gray">${pct.toFixed(1)}%</td></tr>`}).join('')}</tbody></table>
    ${f.ai_review?`<h2>AI Review</h2><div class="section-card" style="white-space:pre-wrap;font-size:12px;line-height:1.6;color:#444">${f.ai_review.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')}</div>`:''}
    ${footerHTML()}</body></html>`

    const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close()}
  }

  // ── CLIENT SUMMARY ─────────────────────────────────────
  function generateClientSummary() {
    const c = clients.find(x => x.id === selectedClient)
    if (!c) return
    const clientFormulas = formulas.filter(f => f.client_id === c.id)
    const clientAnimals = animals.filter(a => a.client_id === c.id)
    const totalAnimals = clientAnimals.reduce((s, a) => s + (a.count||0), 0)

    const formulaRows = clientFormulas.map(f => {
      const ings = formulaIngs[f.id] || []
      const costPerT = ings.reduce((s: number, fi: any) => s + (prices[fi.ingredient_id]||0)*(fi.inclusion_pct||0)/100, 0)
      const calc = (key: string) => ings.reduce((s: number, fi: any) => s + (fi.ingredient?.[key]||0)*(fi.inclusion_pct||0)/100, 0)
      return `<tr><td class="bold">${f.name}</td><td><span class="badge badge-${f.status}">${f.status}</span></td><td class="center mono">v${f.version}</td><td class="center" style="text-transform:capitalize">${f.species}</td><td class="center" style="text-transform:capitalize">${f.production_stage?.replace(/_/g,' ')}</td><td class="right mono">${calc('cp_pct').toFixed(1)}%</td><td class="right mono">${calc('me_mj').toFixed(1)}</td><td class="right mono bold amber">${costPerT?'$'+costPerT.toFixed(0):'—'}</td></tr>`
    }).join('')

    const animalRows = clientAnimals.map(a => `<tr><td class="bold">${a.name}</td><td class="center" style="text-transform:capitalize">${a.species}</td><td class="center">${a.production_stage}</td><td class="center">${a.breed||'—'}</td><td class="right mono bold">${a.count}</td><td class="right mono">${a.avg_weight_kg?a.avg_weight_kg+'kg':'—'}</td></tr>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${c.name} — Client Summary</title><style>${css()}</style></head><body>
    ${headerHTML('Client Summary Report', c.name)}
    <div style="font-size:12px;color:#666;margin-bottom:16px">${c.location||''}</div>
    <div class="meta"><div class="meta-item"><div class="label">Contact</div><div class="value">${c.contact_name||'—'}</div></div><div class="meta-item"><div class="label">Email</div><div class="value">${c.contact_email||'—'}</div></div><div class="meta-item"><div class="label">Phone</div><div class="value">${c.contact_phone||'—'}</div></div><div class="meta-item"><div class="label">FeedFlow</div><div class="value">${c.feedflow_client_id?'Connected':'Not connected'}</div></div></div>
    <div class="stat-grid"><div class="stat-box"><div class="sl">Animal Groups</div><div class="sv green">${clientAnimals.length}</div></div><div class="stat-box"><div class="sl">Total Animals</div><div class="sv green">${totalAnimals.toLocaleString()}</div></div><div class="stat-box"><div class="sl">Active Formulas</div><div class="sv green">${clientFormulas.length}</div></div><div class="stat-box"><div class="sl">Species</div><div class="sv green">${(c.species as string[]).length}</div></div></div>
    <h2>Animal Groups</h2>
    ${clientAnimals.length>0?`<table><thead><tr><th>Group Name</th><th class="center">Species</th><th class="center">Stage</th><th class="center">Breed</th><th class="right">Head Count</th><th class="right">Avg Weight</th></tr></thead><tbody>${animalRows}<tr style="border-top:2px solid #333"><td class="bold" colspan="4">TOTAL</td><td class="right mono bold">${totalAnimals.toLocaleString()}</td><td></td></tr></tbody></table>`:'<div class="section-card gray">No animal groups defined.</div>'}
    <h2>Formulas</h2>
    ${clientFormulas.length>0?`<table><thead><tr><th>Formula</th><th class="center">Status</th><th class="center">Version</th><th class="center">Species</th><th class="center">Stage</th><th class="right">CP%</th><th class="right">ME</th><th class="right">Cost/t</th></tr></thead><tbody>${formulaRows}</tbody></table>`:'<div class="section-card gray">No formulas assigned.</div>'}
    ${c.notes?`<h2>Notes</h2><div class="section-card">${c.notes}</div>`:''}
    ${footerHTML()}</body></html>`

    const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close()}
  }

  // ── NUTRITION AUDIT ────────────────────────────────────
  function generateNutritionAudit() {
    const c = clients.find(x => x.id === selectedClient)
    if (!c) return
    const clientFormulas = formulas.filter(f => f.client_id === c.id)

    const auditRows = clientFormulas.map(f => {
      const ings = formulaIngs[f.id] || []
      const calc = (key: string) => ings.reduce((s: number, fi: any) => s + (fi.ingredient?.[key]||0)*(fi.inclusion_pct||0)/100, 0)
      const costPerT = ings.reduce((s: number, fi: any) => s + (prices[fi.ingredient_id]||0)*(fi.inclusion_pct||0)/100, 0)
      const ca = calc('ca_pct'), pp = calc('p_pct'), caP = pp>0?(ca/pp):0
      const totalPct = ings.reduce((s: number, fi: any) => s + (fi.inclusion_pct||0), 0)
      const issues: string[] = []
      if (totalPct < 99.5 || totalPct > 100.5) issues.push(`Total inclusion ${totalPct.toFixed(1)}% (should be 100%)`)
      if (caP < 1.5 || caP > 2.5) issues.push(`Ca:P ratio ${caP.toFixed(2)} (target 1.5-2.5)`)
      if (calc('s_pct') > 0.4) issues.push(`Sulphur ${calc('s_pct').toFixed(2)}% exceeds 0.4% limit`)

      return `<div class="section-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><span style="font-size:14px;font-weight:700">${f.name}</span> <span class="badge badge-${f.status}" style="margin-left:6px">${f.status}</span></div><span class="mono amber bold">${costPerT?'$'+costPerT.toFixed(0)+'/t':'—'}</span></div>
      <div style="font-size:11px;color:#666;margin-bottom:8px;text-transform:capitalize">${f.species} &middot; ${f.production_stage?.replace(/_/g,' ')} &middot; v${f.version} &middot; ${ings.length} ingredients</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:8px">${[['CP',calc('cp_pct').toFixed(1)+'%'],['ME',calc('me_mj').toFixed(1)+' MJ'],['NDF',calc('ndf_pct').toFixed(1)+'%'],['Ca',calc('ca_pct').toFixed(3)+'%'],['P',calc('p_pct').toFixed(3)+'%'],['Ca:P',caP.toFixed(2)]].map(([l,v])=>`<div style="text-align:center"><div style="font-size:9px;color:#999;text-transform:uppercase;font-weight:600">${l}</div><div class="mono bold" style="font-size:13px">${v}</div></div>`).join('')}</div>
      ${issues.length>0?`<div style="background:#FFF3E0;border-radius:6px;padding:8px;margin-top:4px">${issues.map(i=>`<div style="font-size:11px;color:#D4A843;font-weight:600">\u26A0 ${i}</div>`).join('')}</div>`:f.ai_review?'<div style="font-size:11px;color:#4CAF7D;font-weight:600">\u2713 No critical issues detected</div>':''}
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${c.name} — Nutrition Audit</title><style>${css()}</style></head><body>
    ${headerHTML('Nutrition Audit', c.name+' — Nutrition Audit')}
    <div style="font-size:12px;color:#666;margin-bottom:20px">${c.location||''} &middot; ${clientFormulas.length} formula${clientFormulas.length!==1?'s':''} reviewed</div>
    Array.from(new Set(clientFormulas.map(ff=>ff.species))).length
    ${clientFormulas.length>0?auditRows:'<div class="section-card gray">No formulas to audit.</div>'}
    ${footerHTML()}</body></html>`

    const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close()}
  }

  // ── COST ANALYSIS ──────────────────────────────────────
  function generateCostAnalysis() {
    const clientFormulas = selectedClient ? formulas.filter(f => f.client_id === selectedClient) : formulas

    const formulaCosts = clientFormulas.map(f => {
      const ings = formulaIngs[f.id] || []
      const costPerT = ings.reduce((s: number, fi: any) => s + (prices[fi.ingredient_id]||0)*(fi.inclusion_pct||0)/100, 0)
      const topIng = ings.sort((a: any, b: any) => (prices[b.ingredient_id]||0)*b.inclusion_pct/100 - (prices[a.ingredient_id]||0)*a.inclusion_pct/100)[0]
      return { ...f, costPerT, topIng }
    }).sort((a, b) => b.costPerT - a.costPerT)

    const avgCost = formulaCosts.length > 0 ? formulaCosts.reduce((s, f) => s + f.costPerT, 0) / formulaCosts.length : 0
    const maxCost = formulaCosts.length > 0 ? Math.max(...formulaCosts.map(f => f.costPerT)) : 0
    const minCost = formulaCosts.length > 0 ? Math.min(...formulaCosts.map(f => f.costPerT)) : 0

    const rows = formulaCosts.map(f => `<tr><td class="bold">${f.name}</td><td class="center">${f.client?.name||'—'}</td><td class="center" style="text-transform:capitalize">${f.species}</td><td class="right mono bold amber">$${f.costPerT.toFixed(0)}</td><td class="right mono gray">${f.topIng?.ingredient?.name||'—'}</td></tr>`).join('')

    const c = selectedClient ? clients.find(x => x.id === selectedClient) : null

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cost Analysis</title><style>${css()}</style></head><body>
    ${headerHTML('Cost Analysis Report', c ? c.name+' — Cost Analysis' : 'Cost Analysis — All Formulas')}
    <div style="font-size:12px;color:#666;margin-bottom:20px">${formulaCosts.length} formula${formulaCosts.length!==1?'s':''} analysed</div>
    <div class="stat-grid"><div class="stat-box"><div class="sl">Average Cost/t</div><div class="sv amber">$${avgCost.toFixed(0)}</div></div><div class="stat-box"><div class="sl">Highest Cost/t</div><div class="sv red">$${maxCost.toFixed(0)}</div></div><div class="stat-box"><div class="sl">Lowest Cost/t</div><div class="sv green">$${minCost.toFixed(0)}</div></div><div class="stat-box"><div class="sl">Formulas</div><div class="sv green">${formulaCosts.length}</div></div></div>
    <h2>Formula Cost Ranking</h2>
    <table><thead><tr><th>Formula</th><th class="center">Client</th><th class="center">Species</th><th class="right">Cost/t (AUD)</th><th class="right">Top Cost Driver</th></tr></thead><tbody>${rows}</tbody></table>
    ${footerHTML()}</body></html>`

    const w = window.open('','_blank'); if(w){w.document.write(html);w.document.close()}
  }

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      if (showReport === 'formula') generateFormulaReport()
      else if (showReport === 'client') generateClientSummary()
      else if (showReport === 'audit') generateNutritionAudit()
      else if (showReport === 'cost') generateCostAnalysis()
      setGenerating(false)
    }, 300)
  }

  const reports = [
    { key: 'formula', title: 'Formula Report', desc: 'Detailed formula breakdown with ingredient composition, full nutrient profile, cost analysis, and AI review notes.', icon: FlaskConical, color: '#4CAF7D', selector: 'formula' },
    { key: 'client', title: 'Client Summary', desc: 'Comprehensive client overview with animal groups, assigned formulas, contact details, and production data.', icon: Users, color: '#5B9BD5', selector: 'client' },
    { key: 'audit', title: 'Nutrition Audit', desc: 'Review all formulas for a client. Checks nutrient balance, flags issues, and compares across formulations.', icon: BarChart3, color: '#D4A843', selector: 'client' },
    { key: 'cost', title: 'Cost Analysis', desc: 'Formula cost ranking and comparison. Identifies highest cost drivers and optimization opportunities.', icon: BarChart3, color: '#E88B6E', selector: 'client_optional' },
  ]

  return (
    <div className="p-7 max-w-[1000px]">
      <h1 className="text-2xl font-bold text-text mb-1">Reports</h1>
      <p className="text-base text-text-faint mb-5">Generate professional PDF reports for clients, formulas, and audits.</p>
      <div className="grid grid-cols-2 gap-3.5">
        {reports.map(r => (
          <div key={r.key} onClick={() => { setShowReport(r.key); setSelectedFormula(''); setSelectedClient('') }}
            className="card p-5 cursor-pointer hover:border-brand/25 transition-colors">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: r.color+'15' }}>
                <r.icon size={18} style={{ color: r.color }} />
              </div>
              <span className="text-lg font-bold text-text-dim">{r.title}</span>
            </div>
            <p className="text-sm text-text-faint leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* REPORT CONFIG MODAL */}
      {showReport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowReport(null)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-text">{reports.find(r=>r.key===showReport)?.title}</h2>
              <button onClick={() => setShowReport(null)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>

            {(showReport === 'formula') && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-text-muted block mb-1">Select Formula *</label>
                <select value={selectedFormula} onChange={e => setSelectedFormula(e.target.value)} className="input">
                  <option value="">Choose a formula...</option>
                  {formulas.map(f => <option key={f.id} value={f.id}>{f.name} (v{f.version}) — {f.client?.name||'No client'}</option>)}
                </select>
              </div>
            )}

            {(showReport === 'client' || showReport === 'audit') && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-text-muted block mb-1">Select Client *</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="input">
                  <option value="">Choose a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.location}</option>)}
                </select>
              </div>
            )}

            {showReport === 'cost' && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-text-muted block mb-1">Client (optional — leave blank for all)</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="input">
                  <option value="">All formulas</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <p className="text-xs text-text-ghost mb-4">The report will open in a new window. Use <strong className="text-text-muted">Ctrl+P</strong> (or Cmd+P) to save as PDF.</p>

            <div className="flex gap-2">
              <button onClick={() => setShowReport(null)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
              <button onClick={handleGenerate}
                disabled={generating || (showReport === 'formula' && !selectedFormula) || ((showReport === 'client' || showReport === 'audit') && !selectedClient)}
                className="btn btn-primary flex-1 justify-center disabled:opacity-50">
                {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Download size={14} /> Generate Report</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
