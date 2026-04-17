'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, Send, Share2, MessageCircle, Trash2, Download, Mail, Copy, Check, FileText } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

// ── PDF / SHARE DOCUMENT GENERATOR (English - external documents) ──
function generateFormulaHTML(f: any, ings: any[], profile: any, options: { forPrint?: boolean } = {}) {
  const totalPct = ings.reduce((s, fi) => s + (fi.inclusion_pct || 0), 0)
  const batchKg = f.batch_size_kg || 1000
  const ingRows = ings.map(fi => {
    const ing = fi.ingredient || {}
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;font-weight:600;color:#1a1a1a">${ing.name || 'Unknown'}</td><td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;text-align:center;color:#666;font-size:12px">${ing.category || ''}</td><td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-family:monospace;font-weight:700;color:#1a1a1a">${fi.inclusion_pct.toFixed(1)}%</td><td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-family:monospace;color:#666">${(fi.inclusion_pct / 100 * batchKg).toFixed(0)} kg</td><td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-family:monospace;color:#666">${fi.cost_per_tonne ? '$' + fi.cost_per_tonne.toFixed(0) : '—'}</td></tr>`
  }).join('')
  const nutRows = profile.map((n: any) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-weight:500;color:#333">${n.label}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-family:monospace;font-weight:600;color:#1a1a1a">${n.value}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#999;font-size:12px">${n.unit}</td></tr>`).join('')
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${f.name} — Optia Feed</title><style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',system-ui,sans-serif;color:#1a1a1a;background:#fff;padding:40px;max-width:800px;margin:0 auto}@media print{body{padding:20px}.no-print{display:none!important}}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:3px solid #4CAF7D}.logo{display:flex;align-items:center;gap:12px}.logo-box{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#4CAF7D,#3a9468);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px}.logo-text{font-size:18px;font-weight:700;color:#1a1a1a}.logo-sub{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#999;font-weight:600}.date{font-size:12px;color:#999;text-align:right}.title{font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:4px}.meta{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}.meta-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600;margin-bottom:2px}.meta-value{font-size:14px;font-weight:600;color:#333}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4CAF7D;font-weight:700;margin:28px 0 12px 0;display:flex;align-items:center;gap:8px}.section-title::after{content:'';flex:1;height:1px;background:#e0e0e0}table{width:100%;border-collapse:collapse;font-size:13px}thead th{padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:700;border-bottom:2px solid #e0e0e0}.totals-row td{font-weight:700!important;color:#1a1a1a!important;border-top:2px solid #333;padding-top:10px!important}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}.stat-box{background:#f8f9fa;border-radius:8px;padding:12px;text-align:center;border:1px solid #eee}.stat-box .stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#999;font-weight:600}.stat-box .stat-value{font-size:22px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#4CAF7D;margin-top:4px}.stat-box .stat-value.amber{color:#D4A843}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;align-items:center}.footer-text{font-size:11px;color:#bbb}.disclaimer{font-size:10px;color:#ccc;margin-top:12px;line-height:1.5}.status-badge{display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;font-family:'JetBrains Mono',monospace}.status-draft{background:#FFF3E0;color:#D4A843}.status-approved,.status-active{background:#E8F5E9;color:#4CAF7D}.status-review{background:#E3F2FD;color:#5B9BD5}.btn-print{display:inline-block;padding:10px 24px;background:#4CAF7D;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;margin-bottom:24px}.btn-print:hover{background:#3a9468}</style></head><body>${options.forPrint ? '<button class="btn-print no-print" onclick="window.print()">Download PDF (Ctrl+P)</button>' : ''}<div class="header"><div class="logo"><div class="logo-box">OF</div><div><div class="logo-text">Optia Feed</div><div class="logo-sub">by Agrometrics</div></div></div><div class="date"><div style="font-size:14px;font-weight:600;color:#333">Formula Specification</div><div>${date}</div><div style="margin-top:4px"><span class="status-badge status-${f.status}">${f.status}</span></div></div></div><div class="title">${f.name}</div><div style="font-size:13px;color:#666;margin-bottom:20px">Version ${f.version} &middot; ${f.species} &middot; ${f.production_stage}</div><div class="meta"><div><div class="meta-label">Client</div><div class="meta-value">${f.client?.name || 'Not assigned'}</div></div><div><div class="meta-label">Species</div><div class="meta-value" style="text-transform:capitalize">${f.species}</div></div><div><div class="meta-label">Stage</div><div class="meta-value" style="text-transform:capitalize">${f.production_stage?.replace(/_/g, ' ')}</div></div><div><div class="meta-label">Batch Size</div><div class="meta-value">${batchKg.toLocaleString()} kg</div></div></div><div class="stat-grid"><div class="stat-box"><div class="stat-label">Cost / Tonne</div><div class="stat-value amber">$${(f.total_cost_per_tonne || 0).toFixed(0)}</div></div><div class="stat-box"><div class="stat-label">Crude Protein</div><div class="stat-value">${(f.total_cp_pct || 0).toFixed(1)}%</div></div><div class="stat-box"><div class="stat-label">Energy (ME)</div><div class="stat-value">${(f.total_me_mj || 0).toFixed(1)}</div></div><div class="stat-box"><div class="stat-label">Ingredients</div><div class="stat-value">${ings.length}</div></div></div><div class="section-title">Ingredient Composition</div><table><thead><tr><th style="text-align:left">Ingredient</th><th style="text-align:center">Category</th><th style="text-align:right">Inclusion</th><th style="text-align:right">Per Batch</th><th style="text-align:right">Price/t</th></tr></thead><tbody>${ingRows}<tr class="totals-row"><td style="padding:10px 12px" colspan="2">TOTAL</td><td style="padding:10px 12px;text-align:right;font-family:monospace">${totalPct.toFixed(1)}%</td><td style="padding:10px 12px;text-align:right;font-family:monospace">${(totalPct / 100 * batchKg).toFixed(0)} kg</td><td style="padding:10px 12px;text-align:right;font-family:monospace;color:#D4A843">$${(f.total_cost_per_tonne || 0).toFixed(0)}</td></tr></tbody></table><div class="section-title">Calculated Nutrient Profile</div><table><thead><tr><th style="text-align:left">Nutrient</th><th style="text-align:right">Value</th><th style="text-align:center">Unit</th></tr></thead><tbody>${nutRows}</tbody></table><div class="footer"><div class="footer-text">Generated by Optia Feed &middot; Agrometrics</div><div class="footer-text">${date}</div></div><div class="disclaimer">This formula specification is provided for professional use only.</div></body></html>`
}

function buildShareText(f: any, ings: any[]): string {
  const batchKg = f.batch_size_kg || 1000
  let t = `*${f.name}* (v${f.version})\n${f.species} — ${f.production_stage?.replace(/_/g, ' ')}\nClient: ${f.client?.name || 'N/A'} | Batch: ${batchKg}kg\n\n*Ingredients:*\n`
  ings.forEach(fi => { t += `• ${fi.ingredient?.name}: ${fi.inclusion_pct.toFixed(1)}% (${(fi.inclusion_pct/100*batchKg).toFixed(0)}kg)\n` })
  t += `\nTotal: ${ings.reduce((s: number, fi: any) => s + fi.inclusion_pct, 0).toFixed(1)}% | Cost: $${(f.total_cost_per_tonne||0).toFixed(0)}/t | CP: ${(f.total_cp_pct||0).toFixed(1)}% | ME: ${(f.total_me_mj||0).toFixed(1)} MJ/kg\n\n_Generated by Optia Feed_`
  return t
}

function buildEmailBody(f: any, ings: any[]): string {
  const batchKg = f.batch_size_kg || 1000
  let t = `Formula: ${f.name} (v${f.version})\nSpecies: ${f.species} | Stage: ${f.production_stage?.replace(/_/g, ' ')}\nClient: ${f.client?.name || 'N/A'} | Batch: ${batchKg}kg\n\nINGREDIENTS:\n`
  ings.forEach(fi => { t += `  - ${fi.ingredient?.name}: ${fi.inclusion_pct.toFixed(1)}% (${(fi.inclusion_pct/100*batchKg).toFixed(0)}kg/batch)\n` })
  t += `\nTOTALS:\n  Total: ${ings.reduce((s: number, fi: any) => s + fi.inclusion_pct, 0).toFixed(1)}%\n  Cost: $${(f.total_cost_per_tonne||0).toFixed(0)}/tonne\n  CP: ${(f.total_cp_pct||0).toFixed(1)}% | ME: ${(f.total_me_mj||0).toFixed(1)} MJ/kg\n\nGenerated by Optia Feed (Agrometrics)`
  return t
}

export default function HubPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'farms'|'mills'|'shared'>('farms')
  const [farms, setFarms] = useState<any[]>([])
  const [mills, setMills] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [shared, setShared] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [formulas, setFormulas] = useState<any[]>([])
  const [formulaIngs, setFormulaIngs] = useState<Record<string,any[]>>({})
  const [selectedFarm, setSelectedFarm] = useState(0)
  const [selectedMill, setSelectedMill] = useState(0)
  const [farmTab, setFarmTab] = useState<'overview'|'messages'>('overview')
  const [millTab, setMillTab] = useState<'overview'|'contacts'|'messages'>('overview')
  const [showAddMill, setShowAddMill] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shareFormulaId, setShareFormulaId] = useState('')
  const [shareTab, setShareTab] = useState<'preview'|'send'>('preview')
  const [hubShareType, setHubShareType] = useState<'farm'|'mill'>('farm')
  const [hubEntityId, setHubEntityId] = useState('')
  const [hubContact, setHubContact] = useState('')
  const [copied, setCopied] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string|null>(null)
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)
    const { data: f } = await supabase.from('nutrition_clients').select('*').eq('active', true).order('name')
    setFarms(f || [])
    const { data: m } = await supabase.from('hub_mills').select('*').order('name')
    setMills(m || [])
    const { data: c } = await supabase.from('hub_contacts').select('*').order('name')
    setContacts(c || [])
    const { data: s } = await supabase.from('shared_formulas').select('*, formula:formulas(name, species, version, status)').order('shared_at', { ascending: false })
    setShared(s || [])
    const { data: msgs } = await supabase.from('hub_messages').select('*').order('created_at', { ascending: true })
    setMessages(msgs || [])
    const { data: fmls } = await supabase.from('formulas').select('*, client:nutrition_clients(name)').not('status', 'eq', 'archived').order('name')
    setFormulas(fmls || [])
    const { data: allFi } = await supabase.from('formula_ingredients').select('*, ingredient:ingredients(name, category, cp_pct, me_mj, ndf_pct, ee_pct, ca_pct, p_pct, lysine_pct, methionine_pct)')
    const fiMap: Record<string,any[]> = {}
    allFi?.forEach((fi: any) => { if (!fiMap[fi.formula_id]) fiMap[fi.formula_id] = []; fiMap[fi.formula_id].push(fi) })
    setFormulaIngs(fiMap)
  }

  function getMessages(type: string, entityId: string) { return messages.filter(m => m.thread_type === type && m.thread_entity_id === entityId) }
  function getSharedFor(type: string, entityId: string) { return shared.filter(s => s.shared_with_type === type && s.shared_with_entity_id === entityId) }
  function getContactsFor(entityId: string) { return contacts.filter(c => c.entity_id === entityId) }
  function getSelectedFormula() { return formulas.find(f => f.id === shareFormulaId) }
  function getSelectedIngs() { return formulaIngs[shareFormulaId] || [] }

  function getNutrientProfile() {
    const ings = getSelectedIngs()
    const calc = (key: string) => ings.reduce((s: number, fi: any) => s + (fi.ingredient?.[key] || 0) * (fi.inclusion_pct || 0) / 100, 0)
    const ca = calc('ca_pct'), pp = calc('p_pct')
    return [
      { label: 'Crude Protein (CP)', value: calc('cp_pct').toFixed(1), unit: '%' },
      { label: 'Metabolisable Energy (ME)', value: calc('me_mj').toFixed(1), unit: 'MJ/kg' },
      { label: 'NDF', value: calc('ndf_pct').toFixed(1), unit: '%' },
      { label: 'Ether Extract (Fat)', value: calc('ee_pct').toFixed(1), unit: '%' },
      { label: 'Calcium (Ca)', value: calc('ca_pct').toFixed(3), unit: '%' },
      { label: 'Phosphorus (P)', value: calc('p_pct').toFixed(3), unit: '%' },
      { label: 'Ca:P Ratio', value: pp > 0 ? (ca/pp).toFixed(2)+':1' : '—', unit: '' },
      { label: 'Lysine', value: calc('lysine_pct').toFixed(3), unit: '%' },
      { label: 'Methionine', value: calc('methionine_pct').toFixed(3), unit: '%' },
    ]
  }

  function handleDownloadPDF() { const f = getSelectedFormula(); if (!f) return; const html = generateFormulaHTML(f, getSelectedIngs(), getNutrientProfile(), { forPrint: true }); const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close() } }
  function handleEmail() { const f = getSelectedFormula(); if (!f) return; const subject = encodeURIComponent(`Formula: ${f.name} (v${f.version}) — Optia Feed`); const body = encodeURIComponent(buildEmailBody(f, getSelectedIngs())); window.open(`mailto:?subject=${subject}&body=${body}`, '_self') }
  function handleWhatsApp() { const f = getSelectedFormula(); if (!f) return; window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText(f, getSelectedIngs()))}`, '_blank') }
  function handleTelegram() { const f = getSelectedFormula(); if (!f) return; window.open(`https://t.me/share/url?url=Optia+Feed&text=${encodeURIComponent(buildShareText(f, getSelectedIngs()))}`, '_blank') }
  async function handleCopy() { const f = getSelectedFormula(); if (!f) return; await navigator.clipboard.writeText(buildEmailBody(f, getSelectedIngs())); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  async function handleHubShare() {
    if (!shareFormulaId || !hubEntityId) return; setLoading(true)
    const f = getSelectedFormula(); const supabase = await getSupabase()
    await supabase.from('shared_formulas').insert({ nutritionist_id: userId, formula_id: shareFormulaId, shared_with_type: hubShareType, shared_with_entity_id: hubEntityId, shared_with_contact: hubContact, formula_version: f?.version || 1, status: 'new' })
    setLoading(false); setShowShare(false); loadData()
  }

  async function handleAddMill(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); const fd = new FormData(e.currentTarget); const supabase = await getSupabase(); await supabase.from('hub_mills').insert({ nutritionist_id: userId, name: fd.get('name') as string, location: fd.get('location') as string || null, capacity: fd.get('capacity') as string || null, status: 'active', connected: true }); setShowAddMill(false); setLoading(false); loadData() }
  async function handleAddContact(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setLoading(true); const fd = new FormData(e.currentTarget); const supabase = await getSupabase(); const mill = mills[selectedMill]; if (!mill) return; await supabase.from('hub_contacts').insert({ nutritionist_id: userId, entity_type: 'mill', entity_id: mill.id, name: fd.get('name') as string, role: fd.get('role') as string || null, email: fd.get('email') as string || null, phone: fd.get('phone') as string || null }); setShowAddContact(false); setLoading(false); loadData() }
  async function handleSendMessage(type: string, entityId: string) { if (!msgText.trim()) return; const supabase = await getSupabase(); await supabase.from('hub_messages').insert({ nutritionist_id: userId, thread_type: type, thread_entity_id: entityId, sender_name: 'You', sender_role: 'Nutritionist', message: msgText.trim(), is_from_nutritionist: true }); setMsgText(''); loadData() }
  async function handleDeleteMill(id: string) { const supabase = await getSupabase(); await supabase.from('hub_mills').delete().eq('id', id); loadData() }

  const connectedFarms = farms.filter(f => f.feedflow_client_id)
  const disconnectedFarms = farms.filter(f => !f.feedflow_client_id)
  const currentFarm = connectedFarms[selectedFarm]
  const currentMill = mills[selectedMill]
  const selectedFormula = getSelectedFormula()
  const selectedIngs = getSelectedIngs()

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-2xl font-bold text-text">{t('hub.title')}</h1><p className="text-base text-text-faint mt-0.5">{t('hub.subtitle')}</p></div>
        <div className="flex gap-2">
          {tab === 'mills' && <button onClick={() => setShowAddMill(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> {t('common.add')}</button>}
          <button onClick={() => { setShareFormulaId(''); setShareTab('preview'); setShowShare(true) }} className="btn btn-primary btn-sm"><Share2 size={14} /> Share</button>
        </div>
      </div>

      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-4">
        {[{key:'farms' as const,label:'🏠 Farms',count:farms.length},{key:'mills' as const,label:'🏭 Mills',count:mills.length},{key:'shared' as const,label:'📤 Shared',count:shared.length}].map(tb=>(
          <button key={tb.key} onClick={()=>setTab(tb.key)} className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-2 ${tab===tb.key?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}>{tb.label}<span className={`text-2xs font-mono px-1.5 py-0.5 rounded-full ${tab===tb.key?'bg-white/20':'bg-white/5'}`}>{tb.count}</span></button>
        ))}
      </div>

      {/* SHARED TAB */}
      {tab==='shared'&&(<div>{shared.length>0?shared.map(s=>(<div key={s.id} className="card p-4 mb-2.5"><div className="flex items-center gap-2.5 mb-2"><span className="text-base font-bold text-text-dim">{s.formula?.name||t('sidebar.formulas')}</span><span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">v{s.formula_version}</span></div><div className="flex items-center gap-2.5 px-2.5 py-2 bg-surface-bg rounded-md"><span className="text-base">{s.shared_with_type==='farm'?'🏠':'🏭'}</span><span className="text-sm text-text-dim font-semibold">{s.shared_with_contact||s.shared_with_type}</span><span className="text-xs text-text-ghost">· {new Date(s.shared_at).toLocaleDateString()}</span><span className={`ml-auto text-2xs px-1.5 py-0.5 rounded font-bold font-mono ${s.status==='viewed'?'bg-brand/10 text-brand':'bg-status-amber/10 text-status-amber'}`}>{s.status.toUpperCase()}</span></div></div>)):<div className="card p-12 text-center"><Share2 size={32} className="text-text-ghost mx-auto mb-3"/><p className="text-sm text-text-ghost">{t('common.no_results')}</p></div>}</div>)}

      {/* FARMS TAB */}
      {tab==='farms'&&(<div className="grid grid-cols-[260px_1fr] gap-0 rounded-lg overflow-hidden border border-border" style={{height:'calc(100vh - 250px)'}}>
        <div className="bg-surface-card border-r border-border overflow-auto">
          {connectedFarms.length>0&&<div className="px-4 py-3 border-b border-border"><span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Connected</span></div>}
          {connectedFarms.map((f,i)=>(<div key={f.id} onClick={()=>{setSelectedFarm(i);setFarmTab('overview')}} className={`flex items-center gap-2.5 px-4 py-3 border-b border-border/5 cursor-pointer transition-colors ${selectedFarm===i?'bg-brand/5 border-l-[3px] border-l-brand':'hover:bg-[#253442]'}`}><div className="w-2 h-2 rounded-full bg-brand shadow-[0_0_6px_#4CAF7D60]"/><div><div className="text-sm font-semibold text-text-dim">{f.name}</div><div className="text-2xs text-text-ghost">{f.location}</div></div></div>))}
          {disconnectedFarms.length>0&&<><div className="px-4 py-3 border-t border-border"><span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Not Connected</span></div>{disconnectedFarms.map(f=>(<div key={f.id} className="flex items-center gap-2.5 px-4 py-3 opacity-50"><div className="w-2 h-2 rounded-full bg-text-ghost"/><div><div className="text-sm font-semibold text-text-dim">{f.name}</div><div className="text-2xs text-text-ghost">{f.location}</div></div></div>))}</>}
          {farms.length===0&&<div className="px-4 py-8 text-center text-sm text-text-ghost">{t('common.no_results')}</div>}
        </div>
        <div className="bg-surface-bg overflow-auto p-5">
          {currentFarm?<><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_6px_#4CAF7D60]"/><div><div className="text-xl font-bold text-text">{currentFarm.name}</div><div className="text-xs text-text-ghost">{currentFarm.contact_name} · {currentFarm.location}</div></div></div></div>
            <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-4"><button onClick={()=>setFarmTab('overview')} className={`px-4 py-1.5 rounded text-xs font-semibold ${farmTab==='overview'?'bg-brand text-white':'text-text-faint'}`}>{t('animals.overview')}</button><button onClick={()=>setFarmTab('messages')} className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${farmTab==='messages'?'bg-brand text-white':'text-text-faint'}`}><MessageCircle size={12}/> Messages</button></div>
            {farmTab==='overview'&&<>{getSharedFor('farm',currentFarm.id).length>0?getSharedFor('farm',currentFarm.id).map(s=>(<div key={s.id} className="card p-3 mb-2"><div className="flex items-center justify-between"><div><span className="text-sm font-bold text-text-dim">{s.formula?.name}</span><span className="text-2xs font-mono text-text-ghost ml-2">v{s.formula_version}</span></div><span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono ${s.status==='viewed'?'bg-brand/10 text-brand':'bg-status-amber/10 text-status-amber'}`}>{s.status.toUpperCase()}</span></div></div>)):<div className="text-sm text-text-ghost">{t('common.no_results')}</div>}</>}
            {farmTab==='messages'&&<><div className="flex flex-col gap-3 mb-4" style={{minHeight:200}}>{getMessages('farm',currentFarm.id).map(m=>(<div key={m.id}><div className={`flex items-center gap-1.5 mb-0.5 ${m.is_from_nutritionist?'justify-end':''}`}><span className={`text-2xs font-bold ${m.is_from_nutritionist?'text-brand':'text-status-coral'}`}>{m.sender_name}</span><span className="text-2xs text-text-ghost">{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div><div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.is_from_nutritionist?'bg-brand text-white ml-auto rounded-br-sm':'bg-surface-card text-text-dim border border-border rounded-bl-sm'}`}>{m.message}</div></div>))}{getMessages('farm',currentFarm.id).length===0&&<div className="text-sm text-text-ghost text-center py-8">{t('common.no_results')}</div>}<div ref={msgEndRef}/></div><div className="flex gap-2"><input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSendMessage('farm',currentFarm.id)} placeholder="Message..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-border-focus"/><button onClick={()=>handleSendMessage('farm',currentFarm.id)} className="btn btn-primary btn-sm"><Send size={14}/></button></div></>}
          </>:<div className="text-center py-12 text-sm text-text-ghost">{t('common.no_results')}</div>}
        </div>
      </div>)}

      {/* MILLS TAB */}
      {tab==='mills'&&(<div className="grid grid-cols-[260px_1fr] gap-0 rounded-lg overflow-hidden border border-border" style={{height:'calc(100vh - 250px)'}}>
        <div className="bg-surface-card border-r border-border overflow-auto">
          <div className="px-4 py-3 border-b border-border"><span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Feed Mills</span></div>
          {mills.map((m,i)=>(<div key={m.id} onClick={()=>{setSelectedMill(i);setMillTab('overview')}} className={`flex items-center gap-2.5 px-4 py-3 border-b border-border/5 cursor-pointer transition-colors ${selectedMill===i?'bg-brand/5 border-l-[3px] border-l-brand':'hover:bg-[#253442]'}`}><div className={`w-2 h-2 rounded-full ${m.connected?'bg-brand shadow-[0_0_6px_#4CAF7D60]':'bg-status-amber'}`}/><div><div className="text-sm font-semibold text-text-dim">{m.name}</div><div className="text-2xs text-text-ghost">{m.location}</div></div></div>))}
          {mills.length===0&&<div className="px-4 py-8 text-center text-sm text-text-ghost">{t('common.no_results')}</div>}
        </div>
        <div className="bg-surface-bg overflow-auto p-5">
          {currentMill?<><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${currentMill.connected?'bg-brand':'bg-status-amber'}`}/><div><div className="text-xl font-bold text-text">{currentMill.name}</div><div className="text-xs text-text-ghost">{currentMill.location}</div></div></div><button onClick={()=>handleDeleteMill(currentMill.id)} className="btn btn-ghost btn-sm text-status-red"><Trash2 size={14}/></button></div>
            <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-4"><button onClick={()=>setMillTab('overview')} className={`px-4 py-1.5 rounded text-xs font-semibold ${millTab==='overview'?'bg-brand text-white':'text-text-faint'}`}>{t('animals.overview')}</button><button onClick={()=>setMillTab('contacts')} className={`px-4 py-1.5 rounded text-xs font-semibold ${millTab==='contacts'?'bg-brand text-white':'text-text-faint'}`}>{t('clients.contact')}</button><button onClick={()=>setMillTab('messages')} className={`px-4 py-1.5 rounded text-xs font-semibold ${millTab==='messages'?'bg-brand text-white':'text-text-faint'}`}><MessageCircle size={12}/> Messages</button></div>
            {millTab==='overview'&&<><div className="grid grid-cols-3 gap-3 mb-4">{[{l:t('clients.contact'),v:getContactsFor(currentMill.id).length},{l:'Shared',v:getSharedFor('mill',currentMill.id).length},{l:'Messages',v:getMessages('mill',currentMill.id).length}].map((s,i)=>(<div key={i} className="stat-card"><div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.l}</div><div className="text-xl font-bold text-text-dim font-mono">{s.v}</div></div>))}</div>{getContactsFor(currentMill.id).map(c=>(<div key={c.id} className="card p-3 mb-2 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">{c.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}</div><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{c.name}</div><div className="text-2xs text-text-ghost">{c.role}{c.email?' · '+c.email:''}</div></div></div>))}</>}
            {millTab==='contacts'&&<><div className="flex justify-between mb-3"><span className="text-xs font-bold text-text-muted uppercase">{t('clients.contact')}</span><button onClick={()=>setShowAddContact(true)} className="btn btn-ghost btn-sm"><Plus size={14}/> {t('common.add')}</button></div>{getContactsFor(currentMill.id).map(c=>(<div key={c.id} className="card p-4 mb-3"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">{c.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2)}</div><div><div className="text-sm font-bold text-text-dim">{c.name}</div><div className="text-xs text-text-ghost">{c.role}</div></div></div>{c.email&&<div className="text-xs text-text-ghost mb-1">{c.email}</div>}{c.phone&&<div className="text-xs text-text-ghost font-mono">{c.phone}</div>}</div>))}{getContactsFor(currentMill.id).length===0&&<div className="card p-8 text-center text-sm text-text-ghost">{t('common.no_results')}</div>}</>}
            {millTab==='messages'&&<><div className="flex flex-col gap-3 mb-4" style={{minHeight:200}}>{getMessages('mill',currentMill.id).map(m=>(<div key={m.id}><div className={`flex items-center gap-1.5 mb-0.5 ${m.is_from_nutritionist?'justify-end':''}`}><span className={`text-2xs font-bold ${m.is_from_nutritionist?'text-brand':'text-status-blue'}`}>{m.sender_name}</span><span className="text-2xs text-text-ghost">{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div><div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.is_from_nutritionist?'bg-brand text-white ml-auto rounded-br-sm':'bg-surface-card text-text-dim border border-border rounded-bl-sm'}`}>{m.message}</div></div>))}{getMessages('mill',currentMill.id).length===0&&<div className="text-sm text-text-ghost text-center py-8">{t('common.no_results')}</div>}<div ref={msgEndRef}/></div><div className="flex gap-2"><input value={msgText} onChange={e=>setMsgText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSendMessage('mill',currentMill.id)} placeholder="Message..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-border-focus"/><button onClick={()=>handleSendMessage('mill',currentMill.id)} className="btn btn-primary btn-sm"><Send size={14}/></button></div></>}
          </>:<div className="text-center py-12"><div className="text-3xl mb-3">🏭</div><div className="text-base font-bold text-text-dim mb-2">{t('common.add')}</div><button onClick={()=>setShowAddMill(true)} className="btn btn-primary">{t('common.add')}</button></div>}
        </div>
      </div>)}

      {/* ADD MILL MODAL */}
      {showAddMill&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddMill(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">{t('common.add')}</h2><button onClick={()=>setShowAddMill(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div><form onSubmit={handleAddMill} className="flex flex-col gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.name')} *</label><input name="name" required className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.location')}</label><input name="location" className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Capacity</label><input name="capacity" className="input" placeholder="120t/day"/></div><div className="flex gap-2 mt-1"><button type="button" onClick={()=>setShowAddMill(false)} className="btn btn-ghost flex-1 justify-center">{t('common.cancel')}</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?t('common.saving'):t('common.add')}</button></div></form></div></div>)}

      {/* ADD CONTACT MODAL */}
      {showAddContact&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddContact(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">{t('common.add')} {t('clients.contact')}</h2><button onClick={()=>setShowAddContact(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div><p className="text-sm text-text-ghost mb-4">{currentMill?.name}</p><form onSubmit={handleAddContact} className="flex flex-col gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.name')} *</label><input name="name" required className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Role</label><input name="role" className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.email')}</label><input name="email" type="email" className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.phone')}</label><input name="phone" className="input"/></div><div className="flex gap-2 mt-1"><button type="button" onClick={()=>setShowAddContact(false)} className="btn btn-ghost flex-1 justify-center">{t('common.cancel')}</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?t('common.saving'):t('common.add')}</button></div></form></div></div>)}

      {/* SHARE FORMULA MODAL */}
      {showShare&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowShare(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-3xl shadow-2xl max-h-[85vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="text-xl font-bold text-text">Share</h2><button onClick={()=>setShowShare(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <div className="px-5 py-3 border-b border-border"><label className="text-xs font-semibold text-text-muted block mb-1.5">{t('reports.select_formula')}</label><select value={shareFormulaId} onChange={e=>setShareFormulaId(e.target.value)} className="input"><option value="">{t('reports.choose_formula')}</option>{formulas.map(f=><option key={f.id} value={f.id}>{f.name} (v{f.version}) — {f.species} — {f.client?.name||'—'}</option>)}</select></div>
        {shareFormulaId && selectedFormula ? <>
          <div className="flex gap-0.5 bg-surface-bg p-1 mx-5 mt-3 rounded-lg w-fit"><button onClick={()=>setShareTab('preview')} className={`px-4 py-1.5 rounded text-xs font-semibold transition-all ${shareTab==='preview'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}><FileText size={12} className="inline mr-1.5"/>Preview</button><button onClick={()=>setShareTab('send')} className={`px-4 py-1.5 rounded text-xs font-semibold transition-all ${shareTab==='send'?'bg-brand text-white':'text-text-faint hover:bg-white/5'}`}><Share2 size={12} className="inline mr-1.5"/>Send</button></div>
          {shareTab==='preview'&&(
            <div className="flex-1 overflow-auto px-5 py-4">
              <div style={{background:'#fff',borderRadius:12,padding:28,color:'#1a1a1a',fontFamily:'DM Sans, system-ui, sans-serif',border:'1px solid #e0e0e0'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,paddingBottom:16,borderBottom:'3px solid #4CAF7D'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#4CAF7D,#3a9468)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:12}}>OF</div><div><div style={{fontSize:15,fontWeight:700}}>Optia Feed</div><div style={{fontSize:8,letterSpacing:3,textTransform:'uppercase' as const,color:'#999',fontWeight:600}}>by Agrometrics</div></div></div><div style={{textAlign:'right' as const,fontSize:11,color:'#999'}}><div style={{fontSize:13,fontWeight:600,color:'#333'}}>Formula Specification</div><div>{new Date().toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})}</div></div></div>
                <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>{selectedFormula.name}</div>
                <div style={{fontSize:12,color:'#666',marginBottom:16}}>Version {selectedFormula.version} · {selectedFormula.species} · {selectedFormula.production_stage?.replace(/_/g,' ')}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20}}>{[{l:'Client',v:selectedFormula.client?.name||'N/A'},{l:'Batch',v:(selectedFormula.batch_size_kg||1000)+'kg'},{l:'Cost/t',v:'$'+(selectedFormula.total_cost_per_tonne||0).toFixed(0)},{l:'Ingredients',v:selectedIngs.length.toString()}].map((s,i)=>(<div key={i} style={{background:'#f8f9fa',borderRadius:6,padding:10,textAlign:'center' as const}}><div style={{fontSize:9,textTransform:'uppercase' as const,letterSpacing:1.5,color:'#999',fontWeight:600}}>{s.l}</div><div style={{fontSize:16,fontWeight:700,color:s.l==='Cost/t'?'#D4A843':'#4CAF7D',fontFamily:'JetBrains Mono, monospace',marginTop:2}}>{s.v}</div></div>))}</div>
                <div style={{fontSize:10,textTransform:'uppercase' as const,letterSpacing:2,color:'#4CAF7D',fontWeight:700,marginBottom:8,display:'flex',alignItems:'center',gap:8}}>Ingredients<span style={{flex:1,height:1,background:'#e0e0e0'}}/></div>
                <table style={{width:'100%',borderCollapse:'collapse' as const,fontSize:12}}><thead><tr style={{borderBottom:'2px solid #e0e0e0'}}><th style={{padding:'6px 10px',textAlign:'left' as const,fontSize:9,textTransform:'uppercase' as const,letterSpacing:1.5,color:'#999',fontWeight:700}}>Ingredient</th><th style={{padding:'6px 10px',textAlign:'right' as const,fontSize:9,textTransform:'uppercase' as const,letterSpacing:1.5,color:'#999',fontWeight:700}}>Inclusion</th><th style={{padding:'6px 10px',textAlign:'right' as const,fontSize:9,textTransform:'uppercase' as const,letterSpacing:1.5,color:'#999',fontWeight:700}}>Per Batch</th></tr></thead><tbody>{selectedIngs.map((fi: any,i: number)=>(<tr key={i} style={{borderBottom:'1px solid #f0f0f0'}}><td style={{padding:'6px 10px',fontWeight:600}}>{fi.ingredient?.name}</td><td style={{padding:'6px 10px',textAlign:'right' as const,fontFamily:'JetBrains Mono, monospace',fontWeight:700}}>{fi.inclusion_pct.toFixed(1)}%</td><td style={{padding:'6px 10px',textAlign:'right' as const,fontFamily:'JetBrains Mono, monospace',color:'#666'}}>{(fi.inclusion_pct/100*(selectedFormula.batch_size_kg||1000)).toFixed(0)}kg</td></tr>))}</tbody></table>
                <div style={{fontSize:10,textTransform:'uppercase' as const,letterSpacing:2,color:'#4CAF7D',fontWeight:700,margin:'20px 0 8px 0',display:'flex',alignItems:'center',gap:8}}>Nutrient Profile<span style={{flex:1,height:1,background:'#e0e0e0'}}/></div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{getNutrientProfile().map((n,i)=>(<div key={i} style={{background:'#f8f9fa',borderRadius:6,padding:8}}><div style={{fontSize:9,color:'#999',fontWeight:600}}>{n.label}</div><div style={{fontSize:14,fontWeight:700,fontFamily:'JetBrains Mono, monospace',color:'#1a1a1a'}}>{n.value} <span style={{fontSize:10,color:'#999',fontWeight:400}}>{n.unit}</span></div></div>))}</div>
                <div style={{marginTop:20,paddingTop:12,borderTop:'1px solid #e0e0e0',display:'flex',justifyContent:'space-between',fontSize:10,color:'#ccc'}}><span>Generated by Optia Feed · Agrometrics</span><span>{new Date().toLocaleDateString('en-AU')}</span></div>
              </div>
            </div>
          )}
          {shareTab==='send'&&(
            <div className="flex-1 overflow-auto px-5 py-4">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">Send<span className="flex-1 h-px bg-border"/></div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={handleDownloadPDF} className="card p-4 flex items-center gap-3 hover:border-brand/30 transition-colors cursor-pointer text-left"><div className="w-10 h-10 rounded-lg bg-status-red/10 flex items-center justify-center"><Download size={18} className="text-status-red"/></div><div><div className="text-sm font-bold text-text-dim">PDF</div><div className="text-2xs text-text-ghost">Download</div></div></button>
                <button onClick={handleEmail} className="card p-4 flex items-center gap-3 hover:border-brand/30 transition-colors cursor-pointer text-left"><div className="w-10 h-10 rounded-lg bg-status-blue/10 flex items-center justify-center"><Mail size={18} className="text-status-blue"/></div><div><div className="text-sm font-bold text-text-dim">{t('common.email')}</div><div className="text-2xs text-text-ghost">Email client</div></div></button>
                <button onClick={handleWhatsApp} className="card p-4 flex items-center gap-3 hover:border-brand/30 transition-colors cursor-pointer text-left"><div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center"><span className="text-lg">💬</span></div><div><div className="text-sm font-bold text-text-dim">WhatsApp</div><div className="text-2xs text-text-ghost">Message</div></div></button>
                <button onClick={handleTelegram} className="card p-4 flex items-center gap-3 hover:border-brand/30 transition-colors cursor-pointer text-left"><div className="w-10 h-10 rounded-lg bg-status-blue/10 flex items-center justify-center"><Send size={18} className="text-status-blue"/></div><div><div className="text-sm font-bold text-text-dim">Telegram</div><div className="text-2xs text-text-ghost">Share</div></div></button>
                <button onClick={handleCopy} className="card p-4 flex items-center gap-3 hover:border-brand/30 transition-colors cursor-pointer text-left col-span-2"><div className="w-10 h-10 rounded-lg bg-status-purple/10 flex items-center justify-center">{copied?<Check size={18} className="text-brand"/>:<Copy size={18} className="text-status-purple"/>}</div><div><div className="text-sm font-bold text-text-dim">{copied?'✓ Copied':'Copy'}</div><div className="text-2xs text-text-ghost">Clipboard</div></div></button>
              </div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">Track<span className="flex-1 h-px bg-border"/></div>
              <div className="card p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div><label className="text-2xs text-text-ghost block mb-1">{t('common.type')}</label><div className="flex gap-2"><button type="button" onClick={()=>setHubShareType('farm')} className={`px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer ${hubShareType==='farm'?'border-brand bg-brand/10 text-brand':'border-border text-text-faint'}`}>🏠 Farm</button><button type="button" onClick={()=>setHubShareType('mill')} className={`px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer ${hubShareType==='mill'?'border-brand bg-brand/10 text-brand':'border-border text-text-faint'}`}>🏭 Mill</button></div></div>
                  <div><label className="text-2xs text-text-ghost block mb-1">Recipient</label><select value={hubEntityId} onChange={e=>{setHubEntityId(e.target.value);if(hubShareType==='farm'){const ff=farms.find(x=>x.id===e.target.value);setHubContact(ff?.contact_name||ff?.name||'')}else{const mm=mills.find(x=>x.id===e.target.value);setHubContact(mm?.name||'')}}} className="input text-sm"><option value="">—</option>{hubShareType==='farm'?farms.map(ff=><option key={ff.id} value={ff.id}>{ff.name}</option>):mills.map(mm=><option key={mm.id} value={mm.id}>{mm.name}</option>)}</select></div>
                </div>
                <button onClick={handleHubShare} disabled={loading||!hubEntityId} className="btn btn-ghost btn-sm disabled:opacity-50">{loading?t('common.saving'):'Log'}</button>
              </div>
            </div>
          )}
        </> : <div className="flex-1 flex items-center justify-center text-sm text-text-ghost py-12">{t('reports.choose_formula')}</div>}
      </div></div>)}
    </div>
  )
}
