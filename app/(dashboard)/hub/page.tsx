'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, X, Send, Radio, Share2, MessageCircle, Trash2, Edit2 } from 'lucide-react'

export default function HubPage() {
  const [tab, setTab] = useState<'farms'|'mills'|'shared'>('farms')
  const [farms, setFarms] = useState<any[]>([])
  const [mills, setMills] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [shared, setShared] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [formulas, setFormulas] = useState<any[]>([])
  const [selectedFarm, setSelectedFarm] = useState(0)
  const [selectedMill, setSelectedMill] = useState(0)
  const [farmTab, setFarmTab] = useState<'overview'|'messages'>('overview')
  const [millTab, setMillTab] = useState<'overview'|'contacts'|'messages'>('overview')
  const [showAddMill, setShowAddMill] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [shareType, setShareType] = useState<'farm'|'mill'>('farm')
  const [shareEntityId, setShareEntityId] = useState('')
  const [shareContact, setShareContact] = useState('')
  const [msgText, setMsgText] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string|null>(null)
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

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
    const { data: fmls } = await supabase.from('formulas').select('id, name, species, version, status').not('status', 'eq', 'archived').order('name')
    setFormulas(fmls || [])
  }

  function getMessages(type: string, entityId: string) {
    return messages.filter(m => m.thread_type === type && m.thread_entity_id === entityId)
  }

  function getSharedFor(type: string, entityId: string) {
    return shared.filter(s => s.shared_with_type === type && s.shared_with_entity_id === entityId)
  }

  function getContactsFor(entityId: string) {
    return contacts.filter(c => c.entity_id === entityId)
  }

  // ── ACTIONS ────────────────────────────────────────────
  async function handleAddMill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true)
    const f = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    await supabase.from('hub_mills').insert({
      nutritionist_id: userId, name: f.get('name') as string,
      location: f.get('location') as string || null, capacity: f.get('capacity') as string || null,
      status: 'active', connected: true,
    })
    setShowAddMill(false); setLoading(false); loadData()
  }

  async function handleAddContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true)
    const f = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    const mill = mills[selectedMill]
    if (!mill) return
    await supabase.from('hub_contacts').insert({
      nutritionist_id: userId, entity_type: 'mill', entity_id: mill.id,
      name: f.get('name') as string, role: f.get('role') as string || null,
      email: f.get('email') as string || null, phone: f.get('phone') as string || null,
    })
    setShowAddContact(false); setLoading(false); loadData()
  }

  async function handleShare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true)
    const f = new FormData(e.currentTarget)
    const formulaId = f.get('formula_id') as string
    const fml = formulas.find(x => x.id === formulaId)
    const supabase = await getSupabase()
    await supabase.from('shared_formulas').insert({
      nutritionist_id: userId, formula_id: formulaId,
      shared_with_type: shareType, shared_with_entity_id: shareEntityId,
      shared_with_contact: shareContact, formula_version: fml?.version || 1, status: 'new',
    })
    setShowShare(false); setLoading(false); loadData()
  }

  async function handleSendMessage(type: string, entityId: string) {
    if (!msgText.trim()) return
    const supabase = await getSupabase()
    await supabase.from('hub_messages').insert({
      nutritionist_id: userId, thread_type: type, thread_entity_id: entityId,
      sender_name: 'You', sender_role: 'Nutritionist', message: msgText.trim(),
      is_from_nutritionist: true,
    })
    setMsgText(''); loadData()
  }

  async function handleDeleteMill(id: string) {
    const supabase = await getSupabase()
    await supabase.from('hub_mills').delete().eq('id', id)
    loadData()
  }

  const connectedFarms = farms.filter(f => f.feedflow_client_id)
  const disconnectedFarms = farms.filter(f => !f.feedflow_client_id)
  const currentFarm = connectedFarms[selectedFarm]
  const currentMill = mills[selectedMill]

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text">Hub</h1>
          <p className="text-base text-text-faint mt-0.5">Share formulas and communicate with farms and mills</p>
        </div>
        <div className="flex gap-2">
          {tab === 'mills' && <button onClick={() => setShowAddMill(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> Add Mill</button>}
          <button onClick={() => { setShowShare(true); setShareType(tab === 'mills' ? 'mill' : 'farm') }} className="btn btn-primary btn-sm"><Share2 size={14} /> Share Formula</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-4">
        {[
          { key: 'farms' as const, label: '\uD83C\uDFE0 Farms', count: connectedFarms.length },
          { key: 'mills' as const, label: '\uD83C\uDFED Mills', count: mills.length },
          { key: 'shared' as const, label: '\uD83D\uDCE4 Shared', count: shared.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-2
              ${tab === t.key ? 'bg-brand text-white' : 'text-text-faint hover:bg-white/5'}`}>
            {t.label}
            <span className={`text-2xs font-mono px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-white/5'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── SHARED TAB ──────────────────────────────────── */}
      {tab === 'shared' && (
        <div>
          {shared.length > 0 ? shared.map(s => (
            <div key={s.id} className="card p-4 mb-2.5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-base font-bold text-text-dim">{s.formula?.name || 'Formula'}</span>
                <span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold font-mono">v{s.formula_version}</span>
                <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${s.formula?.status === 'draft' ? 'bg-status-amber/15 text-status-amber' : 'bg-brand/15 text-brand'}`}>{s.formula?.status}</span>
              </div>
              <div className="flex items-center gap-2.5 px-2.5 py-2 bg-surface-bg rounded-md">
                <span className="text-base">{s.shared_with_type === 'farm' ? '\uD83C\uDFE0' : '\uD83C\uDFED'}</span>
                <span className="text-sm text-text-dim font-semibold">{s.shared_with_contact || s.shared_with_type}</span>
                <span className="text-xs text-text-ghost">&middot; {new Date(s.shared_at).toLocaleDateString()}</span>
                <span className={`ml-auto text-2xs px-1.5 py-0.5 rounded font-bold font-mono ${s.status === 'viewed' ? 'bg-brand/10 text-brand' : 'bg-status-amber/10 text-status-amber'}`}>{s.status.toUpperCase()}</span>
              </div>
            </div>
          )) : (
            <div className="card p-12 text-center">
              <Share2 size={32} className="text-text-ghost mx-auto mb-3" />
              <p className="text-sm text-text-ghost">No formulas shared yet. Select a formula and share it with a farm or mill contact.</p>
            </div>
          )}
        </div>
      )}

      {/* ── FARMS TAB ───────────────────────────────────── */}
      {tab === 'farms' && (
        <div className="grid grid-cols-[260px_1fr] gap-0 rounded-lg overflow-hidden border border-border" style={{ height: 'calc(100vh - 250px)' }}>
          {/* Sidebar */}
          <div className="bg-surface-card border-r border-border overflow-auto">
            {connectedFarms.length > 0 && <div className="px-4 py-3 border-b border-border"><span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Connected Farms</span></div>}
            {connectedFarms.map((f, i) => (
              <div key={f.id} onClick={() => { setSelectedFarm(i); setFarmTab('overview') }}
                className={`flex items-center gap-2.5 px-4 py-3 border-b border-border/5 cursor-pointer transition-colors
                  ${selectedFarm === i ? 'bg-brand/5 border-l-[3px] border-l-brand' : 'hover:bg-[#253442]'}`}>
                <div className="w-2 h-2 rounded-full bg-brand shadow-[0_0_6px_#4CAF7D60]" />
                <div><div className="text-sm font-semibold text-text-dim">{f.name}</div><div className="text-2xs text-text-ghost">{f.location}</div></div>
              </div>
            ))}
            {disconnectedFarms.length > 0 && <>
              <div className="px-4 py-3 border-t border-border"><span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Not Connected</span></div>
              {disconnectedFarms.map(f => (
                <div key={f.id} className="flex items-center gap-2.5 px-4 py-3 opacity-50">
                  <div className="w-2 h-2 rounded-full bg-text-ghost" />
                  <div><div className="text-sm font-semibold text-text-dim">{f.name}</div><div className="text-2xs text-text-ghost">{f.location}</div></div>
                </div>
              ))}
            </>}
            {farms.length === 0 && <div className="px-4 py-8 text-center text-sm text-text-ghost">No farms yet. Add clients first.</div>}
          </div>
          {/* Detail */}
          <div className="bg-surface-bg overflow-auto p-5">
            {currentFarm ? <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_6px_#4CAF7D60]" />
                  <div>
                    <div className="text-xl font-bold text-text">{currentFarm.name}</div>
                    <div className="text-xs text-text-ghost">{currentFarm.contact_name} &middot; {currentFarm.location}</div>
                  </div>
                </div>
                <button onClick={() => { setShareType('farm'); setShareEntityId(currentFarm.id); setShareContact(currentFarm.contact_name || currentFarm.name); setShowShare(true) }} className="btn btn-primary btn-sm"><Share2 size={14} /> Share Formula</button>
              </div>
              <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-4">
                <button onClick={() => setFarmTab('overview')} className={`px-4 py-1.5 rounded text-xs font-semibold ${farmTab === 'overview' ? 'bg-brand text-white' : 'text-text-faint'}`}>Overview</button>
                <button onClick={() => setFarmTab('messages')} className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${farmTab === 'messages' ? 'bg-brand text-white' : 'text-text-faint'}`}>
                  <MessageCircle size={12} /> Messages
                  {getMessages('farm', currentFarm.id).length > 0 && <span className="text-2xs bg-white/20 px-1 rounded-full font-mono">{getMessages('farm', currentFarm.id).length}</span>}
                </button>
              </div>
              {farmTab === 'overview' && <>
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">Shared Formulas<span className="flex-1 h-px bg-border" /></div>
                {getSharedFor('farm', currentFarm.id).length > 0 ? getSharedFor('farm', currentFarm.id).map(s => (
                  <div key={s.id} className="card p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div><span className="text-sm font-bold text-text-dim">{s.formula?.name}</span><span className="text-2xs font-mono text-text-ghost ml-2">v{s.formula_version}</span></div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs text-text-ghost">{new Date(s.shared_at).toLocaleDateString()}</span>
                        <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono ${s.status === 'viewed' ? 'bg-brand/10 text-brand' : 'bg-status-amber/10 text-status-amber'}`}>{s.status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                )) : <div className="text-sm text-text-ghost mb-4">No formulas shared with this farm yet.</div>}
              </>}
              {farmTab === 'messages' && <>
                <div className="flex flex-col gap-3 mb-4" style={{ minHeight: 200 }}>
                  {getMessages('farm', currentFarm.id).map(m => (
                    <div key={m.id}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${m.is_from_nutritionist ? 'justify-end' : ''}`}>
                        <span className={`text-2xs font-bold ${m.is_from_nutritionist ? 'text-brand' : 'text-status-coral'}`}>{m.sender_name}</span>
                        <span className="text-2xs text-text-ghost">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.is_from_nutritionist ? 'bg-brand text-white ml-auto rounded-br-sm' : 'bg-surface-card text-text-dim border border-border rounded-bl-sm'}`}>{m.message}</div>
                    </div>
                  ))}
                  {getMessages('farm', currentFarm.id).length === 0 && <div className="text-sm text-text-ghost text-center py-8">No messages yet. Start a conversation.</div>}
                  <div ref={msgEndRef} />
                </div>
                <div className="flex gap-2">
                  <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage('farm', currentFarm.id)}
                    placeholder={`Message ${currentFarm.contact_name || currentFarm.name}...`} className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-border-focus" />
                  <button onClick={() => handleSendMessage('farm', currentFarm.id)} className="btn btn-primary btn-sm"><Send size={14} /></button>
                </div>
              </>}
            </> : <div className="text-center py-12 text-sm text-text-ghost">Select a farm to view details.</div>}
          </div>
        </div>
      )}

      {/* ── MILLS TAB ───────────────────────────────────── */}
      {tab === 'mills' && (
        <div className="grid grid-cols-[260px_1fr] gap-0 rounded-lg overflow-hidden border border-border" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="bg-surface-card border-r border-border overflow-auto">
            <div className="px-4 py-3 border-b border-border"><span className="text-xs font-bold text-text-ghost uppercase tracking-wider">Feed Mills</span></div>
            {mills.map((m, i) => (
              <div key={m.id} onClick={() => { setSelectedMill(i); setMillTab('overview') }}
                className={`flex items-center gap-2.5 px-4 py-3 border-b border-border/5 cursor-pointer transition-colors
                  ${selectedMill === i ? 'bg-brand/5 border-l-[3px] border-l-brand' : 'hover:bg-[#253442]'}`}>
                <div className={`w-2 h-2 rounded-full ${m.connected ? 'bg-brand shadow-[0_0_6px_#4CAF7D60]' : 'bg-status-amber'}`} />
                <div><div className="text-sm font-semibold text-text-dim">{m.name}</div><div className="text-2xs text-text-ghost">{m.location} &middot; {getContactsFor(m.id).length} contacts</div></div>
              </div>
            ))}
            {mills.length === 0 && <div className="px-4 py-8 text-center text-sm text-text-ghost">No mills added yet.</div>}
          </div>
          <div className="bg-surface-bg overflow-auto p-5">
            {currentMill ? <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${currentMill.connected ? 'bg-brand shadow-[0_0_6px_#4CAF7D60]' : 'bg-status-amber'}`} />
                  <div>
                    <div className="text-xl font-bold text-text">{currentMill.name}</div>
                    <div className="text-xs text-text-ghost">{currentMill.location}{currentMill.capacity ? ' \u00B7 ' + currentMill.capacity : ''}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDeleteMill(currentMill.id)} className="btn btn-ghost btn-sm text-status-red"><Trash2 size={14} /></button>
                  <button onClick={() => {
                    setShareType('mill'); setShareEntityId(currentMill.id)
                    const mc = getContactsFor(currentMill.id); setShareContact(mc[0]?.name || currentMill.name); setShowShare(true)
                  }} className="btn btn-primary btn-sm"><Share2 size={14} /> Share Formula</button>
                </div>
              </div>
              <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-4">
                <button onClick={() => setMillTab('overview')} className={`px-4 py-1.5 rounded text-xs font-semibold ${millTab === 'overview' ? 'bg-brand text-white' : 'text-text-faint'}`}>Overview</button>
                <button onClick={() => setMillTab('contacts')} className={`px-4 py-1.5 rounded text-xs font-semibold ${millTab === 'contacts' ? 'bg-brand text-white' : 'text-text-faint'}`}>Contacts</button>
                <button onClick={() => setMillTab('messages')} className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${millTab === 'messages' ? 'bg-brand text-white' : 'text-text-faint'}`}>
                  <MessageCircle size={12} /> Messages
                </button>
              </div>
              {millTab === 'overview' && <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[{ l: 'Contacts', v: getContactsFor(currentMill.id).length }, { l: 'Shared Formulas', v: getSharedFor('mill', currentMill.id).length }, { l: 'Messages', v: getMessages('mill', currentMill.id).length }].map((s, i) => (
                    <div key={i} className="stat-card"><div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.l}</div><div className="text-xl font-bold text-text-dim font-mono">{s.v}</div></div>
                  ))}
                </div>
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-2">Contacts<span className="flex-1 h-px bg-border" /></div>
                {getContactsFor(currentMill.id).map(c => (
                  <div key={c.id} className="card p-3 mb-2 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">{c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</div>
                    <div className="flex-1"><div className="text-sm font-semibold text-text-dim">{c.name}</div><div className="text-2xs text-text-ghost">{c.role}{c.email ? ' \u00B7 ' + c.email : ''}</div></div>
                  </div>
                ))}
                {getContactsFor(currentMill.id).length === 0 && <div className="text-sm text-text-ghost mb-4">No contacts yet. Add a sales rep or technical contact.</div>}
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 mt-4 flex items-center gap-2">Shared Formulas<span className="flex-1 h-px bg-border" /></div>
                {getSharedFor('mill', currentMill.id).map(s => (
                  <div key={s.id} className="card p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <div><span className="text-sm font-bold text-text-dim">{s.formula?.name}</span><span className="text-2xs font-mono text-text-ghost ml-2">v{s.formula_version} &middot; to {s.shared_with_contact}</span></div>
                      <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono ${s.status === 'viewed' ? 'bg-brand/10 text-brand' : 'bg-status-amber/10 text-status-amber'}`}>{s.status.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </>}
              {millTab === 'contacts' && <>
                <div className="flex justify-between mb-3">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Contacts at {currentMill.name}</span>
                  <button onClick={() => setShowAddContact(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> Add Contact</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {getContactsFor(currentMill.id).map(c => (
                    <div key={c.id} className="card p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">{c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</div>
                        <div><div className="text-sm font-bold text-text-dim">{c.name}</div><div className="text-xs text-text-ghost">{c.role}</div></div>
                      </div>
                      {c.email && <div className="text-xs text-text-ghost mb-1">{c.email}</div>}
                      {c.phone && <div className="text-xs text-text-ghost font-mono mb-3">{c.phone}</div>}
                      <button onClick={() => {
                        setShareType('mill'); setShareEntityId(currentMill.id); setShareContact(c.name); setShowShare(true)
                      }} className="btn btn-primary btn-sm w-full justify-center"><Share2 size={12} /> Share Formula</button>
                    </div>
                  ))}
                </div>
                {getContactsFor(currentMill.id).length === 0 && <div className="card p-8 text-center text-sm text-text-ghost">No contacts. Add your first contact at this mill.</div>}
              </>}
              {millTab === 'messages' && <>
                <div className="flex flex-col gap-3 mb-4" style={{ minHeight: 200 }}>
                  {getMessages('mill', currentMill.id).map(m => (
                    <div key={m.id}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${m.is_from_nutritionist ? 'justify-end' : ''}`}>
                        <span className={`text-2xs font-bold ${m.is_from_nutritionist ? 'text-brand' : 'text-status-blue'}`}>{m.sender_name}</span>
                        <span className="text-2xs text-text-ghost">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${m.is_from_nutritionist ? 'bg-brand text-white ml-auto rounded-br-sm' : 'bg-surface-card text-text-dim border border-border rounded-bl-sm'}`}>{m.message}</div>
                    </div>
                  ))}
                  {getMessages('mill', currentMill.id).length === 0 && <div className="text-sm text-text-ghost text-center py-8">No messages yet.</div>}
                  <div ref={msgEndRef} />
                </div>
                <div className="flex gap-2">
                  <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage('mill', currentMill.id)}
                    placeholder={`Message ${getContactsFor(currentMill.id)[0]?.name || currentMill.name}...`} className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface-deep text-text-dim text-sm outline-none focus:border-border-focus" />
                  <button onClick={() => handleSendMessage('mill', currentMill.id)} className="btn btn-primary btn-sm"><Send size={14} /></button>
                </div>
              </>}
            </> : (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">{'\uD83C\uDFED'}</div>
                <div className="text-base font-bold text-text-dim mb-2">Add your first mill</div>
                <div className="text-sm text-text-ghost mb-4 max-w-sm mx-auto">Connect with feed mills to share formula specs and communicate with sales reps.</div>
                <button onClick={() => setShowAddMill(true)} className="btn btn-primary">Add Mill</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD MILL MODAL ──────────────────────────────── */}
      {showAddMill && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddMill(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">Add Feed Mill</h2><button onClick={() => setShowAddMill(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleAddMill} className="flex flex-col gap-3">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Mill Name *</label><input name="name" required className="input" placeholder="e.g. Ridley AgriProducts" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Location</label><input name="location" className="input" placeholder="e.g. Lara, VIC" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Capacity</label><input name="capacity" className="input" placeholder="e.g. 120t/day" /></div>
              <div className="flex gap-2 mt-1"><button type="button" onClick={() => setShowAddMill(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading ? 'Adding...' : 'Add Mill'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD CONTACT MODAL ───────────────────────────── */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddContact(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">Add Contact</h2><button onClick={() => setShowAddContact(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <p className="text-sm text-text-ghost mb-4">At {currentMill?.name}</p>
            <form onSubmit={handleAddContact} className="flex flex-col gap-3">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Name *</label><input name="name" required className="input" placeholder="e.g. Mark Sullivan" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Role</label><input name="role" className="input" placeholder="e.g. Sales Representative" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Email</label><input name="email" type="email" className="input" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Phone</label><input name="phone" className="input" /></div>
              <div className="flex gap-2 mt-1"><button type="button" onClick={() => setShowAddContact(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading ? 'Adding...' : 'Add Contact'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ── SHARE FORMULA MODAL ─────────────────────────── */}
      {showShare && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowShare(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">Share Formula</h2><button onClick={() => setShowShare(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleShare} className="flex flex-col gap-3">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Formula *</label>
                <select name="formula_id" required className="input">
                  <option value="">Select formula...</option>
                  {formulas.map(f => <option key={f.id} value={f.id}>{f.name} (v{f.version}) — {f.species}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Share with</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setShareType('farm')} className={`px-4 py-2 rounded border text-sm font-semibold cursor-pointer ${shareType === 'farm' ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-faint'}`}>{'\uD83C\uDFE0'} Farm</button>
                  <button type="button" onClick={() => setShareType('mill')} className={`px-4 py-2 rounded border text-sm font-semibold cursor-pointer ${shareType === 'mill' ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-faint'}`}>{'\uD83C\uDFED'} Mill</button>
                </div>
                <select value={shareEntityId} onChange={e => {
                  setShareEntityId(e.target.value)
                  if (shareType === 'farm') { const f = farms.find(x => x.id === e.target.value); setShareContact(f?.contact_name || f?.name || '') }
                  else { const m = mills.find(x => x.id === e.target.value); const c = getContactsFor(m?.id || ''); setShareContact(c[0]?.name || m?.name || '') }
                }} className="input">
                  <option value="">Select {shareType}...</option>
                  {shareType === 'farm' ? farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>) : mills.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Contact Name</label><input value={shareContact} onChange={e => setShareContact(e.target.value)} className="input" placeholder="Name of recipient" /></div>
              <div className="flex gap-2 mt-1"><button type="button" onClick={() => setShowShare(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button><button type="submit" disabled={loading || !shareEntityId} className="btn btn-primary flex-1 justify-center disabled:opacity-50">{loading ? 'Sharing...' : 'Share'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
