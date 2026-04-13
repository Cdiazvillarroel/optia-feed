'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, X, Calendar, MapPin, Clock, CheckCircle2, Circle, AlertTriangle, FileText, Trash2, ChevronRight, ChevronLeft, Download } from 'lucide-react'

const ACTIVITY_TYPES = [
  { key: 'visit', label: 'Farm Visit', icon: '\uD83D\uDEB6', color: '#4CAF7D' },
  { key: 'call', label: 'Phone Call', icon: '\uD83D\uDCDE', color: '#5B9BD5' },
  { key: 'email', label: 'Email', icon: '\uD83D\uDCE7', color: '#7BA0C4' },
  { key: 'note', label: 'Note', icon: '\uD83D\uDCDD', color: '#D4A843' },
  { key: 'meeting', label: 'Meeting', icon: '\uD83E\uDD1D', color: '#9C7BC4' },
  { key: 'formula_review', label: 'Formula Review', icon: '\uD83E\uDDEA', color: '#E88B6E' },
  { key: 'sample_collection', label: 'Sample Collection', icon: '\uD83E\uDD4A', color: '#6BBF8A' },
  { key: 'training', label: 'Training', icon: '\uD83C\uDF93', color: '#C47B9B' },
  { key: 'follow_up', label: 'Follow Up', icon: '\uD83D\uDD04', color: '#8B8B8B' },
]

const PRIORITY_COLORS: Record<string,string> = { low:'text-text-ghost', medium:'text-status-blue', high:'text-status-amber', urgent:'text-status-red' }
const PRIORITY_BG: Record<string,string> = { low:'bg-white/5', medium:'bg-status-blue/10', high:'bg-status-amber/10', urgent:'bg-status-red/10' }
const DOC_TYPES = ['lab_report','feed_analysis','contract','invoice','photo','report','formula_spec','other']
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── ICS CALENDAR GENERATION ──────────────────────────────
function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function generateICSEvent(event: { title: string; description?: string; location?: string; start: Date; end: Date; uid: string }): string {
  let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Optia Feed//CRM//EN\r\nBEGIN:VEVENT\r\n`
  ics += `UID:${event.uid}@optiafeed\r\n`
  ics += `DTSTART:${toICSDate(event.start)}\r\n`
  ics += `DTEND:${toICSDate(event.end)}\r\n`
  ics += `SUMMARY:${event.title.replace(/[,;\\]/g, ' ')}\r\n`
  if (event.description) ics += `DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, ' ').slice(0, 500)}\r\n`
  if (event.location) ics += `LOCATION:${event.location.replace(/[,;\\]/g, ' ')}\r\n`
  ics += `END:VEVENT\r\nEND:VCALENDAR\r\n`
  return ics
}

function generateICSMultiple(events: { title: string; description?: string; location?: string; start: Date; end: Date; uid: string }[]): string {
  let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Optia Feed//CRM//EN\r\nX-WR-CALNAME:Optia Feed\r\n`
  events.forEach(e => {
    ics += `BEGIN:VEVENT\r\n`
    ics += `UID:${e.uid}@optiafeed\r\n`
    ics += `DTSTART:${toICSDate(e.start)}\r\n`
    ics += `DTEND:${toICSDate(e.end)}\r\n`
    ics += `SUMMARY:${e.title.replace(/[,;\\]/g, ' ')}\r\n`
    if (e.description) ics += `DESCRIPTION:${e.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, ' ').slice(0, 500)}\r\n`
    if (e.location) ics += `LOCATION:${e.location.replace(/[,;\\]/g, ' ')}\r\n`
    ics += `END:VEVENT\r\n`
  })
  ics += `END:VCALENDAR\r\n`
  return ics
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── MAIN COMPONENT ───────────────────────────────────────
export default function CRMPage() {
  const [tab, setTab] = useState<'dashboard'|'calendar'|'activities'|'tasks'|'documents'>('dashboard')
  const [clients, setClients] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [formulas, setFormulas] = useState<any[]>([])
  const [userId, setUserId] = useState<string|null>(null)
  const [clientFilter, setClientFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState<'all'|'pending'|'completed'>('pending')
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activityType, setActivityType] = useState('visit')
  const [activityClientId, setActivityClientId] = useState('')
  const [activityDate, setActivityDate] = useState('')
  // Calendar
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<Date|null>(null)

  useEffect(() => { loadData() }, [])

  async function getSupabase() { const { createClient } = await import('@/lib/supabase/client'); return createClient() }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)
    const { data: c } = await supabase.from('nutrition_clients').select('*').eq('active', true).order('name')
    setClients(c || [])
    const { data: a } = await supabase.from('crm_activities').select('*, client:nutrition_clients(name, location)').order('activity_date', { ascending: false })
    setActivities(a || [])
    const { data: t } = await supabase.from('crm_tasks').select('*, client:nutrition_clients(name)').order('due_date', { ascending: true })
    setTasks(t || [])
    const { data: d } = await supabase.from('crm_documents').select('*, client:nutrition_clients(name)').order('doc_date', { ascending: false })
    setDocuments(d || [])
    const { data: f } = await supabase.from('formulas').select('id, name').not('status','eq','archived').order('name')
    setFormulas(f || [])
  }

  const now = new Date()
  const filteredActivities = activities.filter(a => {
    if (clientFilter && a.client_id !== clientFilter) return false
    if (typeFilter && a.activity_type !== typeFilter) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !(a.description||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending' && (t.status === 'completed' || t.status === 'cancelled')) return false
    if (taskFilter === 'completed' && t.status !== 'completed') return false
    if (clientFilter && t.client_id !== clientFilter) return false
    return true
  })

  const thisWeek = activities.filter(a => new Date(a.activity_date) > new Date(now.getTime() - 7*24*60*60*1000))
  const thisMonth = activities.filter(a => new Date(a.activity_date) > new Date(now.getTime() - 30*24*60*60*1000))
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < now)
  const upcomingActivities = activities.filter(a => a.status === 'planned' && new Date(a.activity_date) > now).sort((a,b) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime())
  const followUps = activities.filter(a => a.follow_up_date && new Date(a.follow_up_date) <= now && a.status === 'completed')
  const clientLastActivity: Record<string, Date> = {}
  activities.forEach(a => { const d = new Date(a.activity_date); if (!clientLastActivity[a.client_id] || d > clientLastActivity[a.client_id]) clientLastActivity[a.client_id] = d })
  const needsAttention = clients.filter(c => { const last = clientLastActivity[c.id]; return !last || (now.getTime() - last.getTime()) > 30*24*60*60*1000 })

  function getTypeInfo(type: string) { return ACTIVITY_TYPES.find(t => t.key === type) || ACTIVITY_TYPES[0] }
  function timeAgo(date: string) { const diff = now.getTime() - new Date(date).getTime(); const days = Math.floor(diff/(24*60*60*1000)); if(days===0) return 'Today'; if(days===1) return 'Yesterday'; if(days<7) return days+'d ago'; if(days<30) return Math.floor(days/7)+'w ago'; return Math.floor(days/30)+'mo ago' }

  // ── CALENDAR HELPERS ───────────────────────────────────
  function getCalendarDays() {
    const firstDay = new Date(calYear, calMonth, 1)
    const lastDay = new Date(calYear, calMonth + 1, 0)
    let startDay = firstDay.getDay() - 1; if (startDay < 0) startDay = 6
    const days: (Date|null)[] = []
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(calYear, calMonth, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }

  function getEventsForDay(day: Date) {
    const dayStr = day.toISOString().split('T')[0]
    const acts = activities.filter(a => new Date(a.activity_date).toISOString().split('T')[0] === dayStr)
    const tks = tasks.filter(t => t.due_date && new Date(t.due_date).toISOString().split('T')[0] === dayStr && t.status !== 'completed')
    const fups = activities.filter(a => a.follow_up_date && new Date(a.follow_up_date).toISOString().split('T')[0] === dayStr)
    return { acts, tks, fups, total: acts.length + tks.length + fups.length }
  }

  function isToday(day: Date) { return day.toDateString() === now.toDateString() }
  function isSameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }

  // ── CALENDAR EXPORT ────────────────────────────────────
  function exportSingleEvent(a: any) {
    const start = new Date(a.activity_date)
    const end = new Date(start.getTime() + (a.visit_duration_min || 60) * 60 * 1000)
    const ics = generateICSEvent({ title: `${getTypeInfo(a.activity_type).label}: ${a.title}`, description: [a.description, a.observations, a.recommendations].filter(Boolean).join('\n\n'), location: a.visit_location || a.client?.location || '', start, end, uid: a.id })
    downloadICS(ics, `optia-${a.activity_type}-${start.toISOString().split('T')[0]}.ics`)
  }

  function exportMonthEvents() {
    const monthStart = new Date(calYear, calMonth, 1)
    const monthEnd = new Date(calYear, calMonth + 1, 0, 23, 59, 59)
    const monthActs = activities.filter(a => { const d = new Date(a.activity_date); return d >= monthStart && d <= monthEnd })
    const monthTasks = tasks.filter(t => t.due_date && (() => { const d = new Date(t.due_date); return d >= monthStart && d <= monthEnd })())
    const events = [
      ...monthActs.map(a => ({ title: `${getTypeInfo(a.activity_type).label}: ${a.title}`, description: a.description || '', location: a.visit_location || a.client?.location || '', start: new Date(a.activity_date), end: new Date(new Date(a.activity_date).getTime() + (a.visit_duration_min || 60)*60*1000), uid: a.id })),
      ...monthTasks.map(t => ({ title: `Task: ${t.title}`, description: t.description || '', location: '', start: new Date(t.due_date), end: new Date(new Date(t.due_date).getTime() + 30*60*1000), uid: t.id })),
    ]
    if (events.length === 0) return
    const ics = generateICSMultiple(events)
    downloadICS(ics, `optia-feed-${MONTHS[calMonth].toLowerCase()}-${calYear}.ics`)
  }

  function exportAllEvents() {
    const events = [
      ...activities.map(a => ({ title: `${getTypeInfo(a.activity_type).label}: ${a.title}`, description: a.description || '', location: a.visit_location || a.client?.location || '', start: new Date(a.activity_date), end: new Date(new Date(a.activity_date).getTime() + (a.visit_duration_min || 60)*60*1000), uid: a.id })),
      ...tasks.filter(t => t.due_date).map(t => ({ title: `Task: ${t.title}`, description: t.description || '', location: '', start: new Date(t.due_date!), end: new Date(new Date(t.due_date!).getTime() + 30*60*1000), uid: t.id })),
    ]
    if (events.length === 0) return
    const ics = generateICSMultiple(events)
    downloadICS(ics, `optia-feed-all-events.ics`)
  }

  // ── ACTIONS ────────────────────────────────────────────
  async function handleAddActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true)
    const f = new FormData(e.currentTarget); const supabase = await getSupabase()
    const tagsRaw = f.get('tags') as string
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : null
    await supabase.from('crm_activities').insert({
      nutritionist_id: userId, client_id: f.get('client_id') as string, activity_type: activityType,
      title: f.get('title') as string, description: f.get('description') as string || null,
      visit_location: f.get('visit_location') as string || null, visit_duration_min: parseInt(f.get('visit_duration_min') as string) || null,
      travel_km: parseFloat(f.get('travel_km') as string) || null, observations: f.get('observations') as string || null,
      recommendations: f.get('recommendations') as string || null, activity_date: f.get('activity_date') as string || new Date().toISOString(),
      follow_up_date: f.get('follow_up_date') as string || null, follow_up_notes: f.get('follow_up_notes') as string || null,
      tags, status: f.get('status') as string || 'completed', billable: f.get('billable') === 'on',
      amount: parseFloat(f.get('amount') as string) || null, formula_id: f.get('formula_id') as string || null,
    })
    setLoading(false); setShowAddActivity(false); setActivityDate(''); loadData()
  }

  async function handleAddTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true)
    const f = new FormData(e.currentTarget); const supabase = await getSupabase()
    await supabase.from('crm_tasks').insert({ nutritionist_id: userId, client_id: f.get('client_id') as string || null, title: f.get('title') as string, description: f.get('description') as string || null, priority: f.get('priority') as string || 'medium', due_date: f.get('due_date') as string || null })
    setLoading(false); setShowAddTask(false); loadData()
  }

  async function handleAddDoc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true)
    const f = new FormData(e.currentTarget); const supabase = await getSupabase()
    await supabase.from('crm_documents').insert({ nutritionist_id: userId, client_id: f.get('client_id') as string || null, doc_type: f.get('doc_type') as string, title: f.get('title') as string, description: f.get('description') as string || null, file_url: f.get('file_url') as string || null, doc_date: f.get('doc_date') as string || new Date().toISOString().split('T')[0] })
    setLoading(false); setShowAddDoc(false); loadData()
  }

  async function toggleTask(id: string, currentStatus: string) {
    const supabase = await getSupabase()
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    await supabase.from('crm_tasks').update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', id)
    loadData()
  }

  async function deleteActivity(id: string) { const supabase = await getSupabase(); await supabase.from('crm_activities').delete().eq('id', id); setShowDetail(null); loadData() }
  async function deleteTask(id: string) { const supabase = await getSupabase(); await supabase.from('crm_tasks').delete().eq('id', id); loadData() }
  async function deleteDoc(id: string) { const supabase = await getSupabase(); await supabase.from('crm_documents').delete().eq('id', id); loadData() }

  const calDays = getCalendarDays()

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-2xl font-bold text-text">CRM</h1><p className="text-base text-text-faint mt-0.5">Track activities, visits, tasks, and documents</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddTask(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> Task</button>
          <button onClick={() => { setActivityType('visit'); setActivityDate(''); setActivityClientId(''); setShowAddActivity(true) }} className="btn btn-primary btn-sm"><Plus size={14} /> Log Activity</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-5">
        {[
          { key: 'dashboard' as const, label: 'Dashboard', count: null },
          { key: 'calendar' as const, label: '\uD83D\uDCC5 Calendar', count: null },
          { key: 'activities' as const, label: 'Activities', count: thisMonth.length },
          { key: 'tasks' as const, label: 'Tasks', count: pendingTasks.length },
          { key: 'documents' as const, label: 'Documents', count: documents.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-2 ${tab === t.key ? 'bg-brand text-white' : 'text-text-faint hover:bg-white/5'}`}>
            {t.label}{t.count !== null && <span className={`text-2xs font-mono px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-white/5'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══════════════════════════════════════ */}
      {tab === 'dashboard' && (<>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[{l:'This Week',v:thisWeek.length,c:'#4CAF7D'},{l:'This Month',v:thisMonth.length,c:'#5B9BD5'},{l:'Pending Tasks',v:pendingTasks.length,c:'#D4A843'},{l:'Overdue',v:overdueTasks.length,c:overdueTasks.length>0?'#E05252':'#4CAF7D'},{l:'Needs Attention',v:needsAttention.length,c:needsAttention.length>0?'#D4A843':'#4CAF7D'}].map((s,i)=>(
            <div key={i} className="stat-card"><div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.l}</div><div className="text-2xl font-bold font-mono" style={{color:s.c}}>{s.v}</div></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">Upcoming Planned</span></div>{upcomingActivities.length>0?upcomingActivities.slice(0,5).map(a=>{const t=getTypeInfo(a.activity_type);return(<div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><span className="text-lg">{t.icon}</span><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {new Date(a.activity_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}</div></div></div>)}):<div className="px-4 py-6 text-center text-sm text-text-ghost">No upcoming activities.</div>}</div>
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">Tasks Due</span></div>{pendingTasks.slice(0,5).map(t=>(<div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><button onClick={()=>toggleTask(t.id,t.status)} className="bg-transparent border-none cursor-pointer"><Circle size={16} className={`${t.due_date&&new Date(t.due_date)<now?'text-status-red':'text-text-ghost'}`}/></button><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{t.title}</div><div className="text-2xs text-text-ghost">{t.client?.name||'General'}{t.due_date?' \u00B7 Due '+new Date(t.due_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'}):''}</div></div><span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${PRIORITY_BG[t.priority]} ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></div>))}{pendingTasks.length===0&&<div className="px-4 py-6 text-center text-sm text-text-ghost">All caught up!</div>}</div>
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">Follow-Ups Due</span></div>{followUps.length>0?followUps.slice(0,5).map(a=>(<div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><span className="text-lg">{'\uD83D\uDD04'}</span><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {a.follow_up_notes||'Follow up required'}</div></div><span className="text-2xs text-status-amber font-mono">{timeAgo(a.follow_up_date)}</span></div>)):<div className="px-4 py-6 text-center text-sm text-text-ghost">No follow-ups pending.</div>}</div>
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">Needs Attention</span><span className="text-2xs text-text-ghost">30+ days no contact</span></div>{needsAttention.length>0?needsAttention.slice(0,5).map(c=>(<div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><AlertTriangle size={14} className="text-status-amber"/><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{c.name}</div><div className="text-2xs text-text-ghost">{c.location} &middot; Last: {clientLastActivity[c.id]?timeAgo(clientLastActivity[c.id].toISOString()):'Never'}</div></div><button onClick={()=>{setActivityClientId(c.id);setActivityType('visit');setShowAddActivity(true)}} className="btn btn-ghost btn-sm text-2xs">Log</button></div>)):<div className="px-4 py-6 text-center text-sm text-text-ghost">All clients well-attended.</div>}</div>
        </div>
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mt-6 mb-3 flex items-center gap-2">Recent Activity<span className="flex-1 h-px bg-border"/></div>
        {activities.slice(0,8).map(a=>{const t=getTypeInfo(a.activity_type);return(<div key={a.id} onClick={()=>setShowDetail(a)} className="flex items-center gap-3 px-4 py-3 bg-surface-card rounded-lg border border-border mb-2 hover:border-brand/20 cursor-pointer transition-colors"><span className="text-xl">{t.icon}</span><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {t.label} &middot; {new Date(a.activity_date).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'})}</div></div>{a.billable&&a.amount&&<span className="text-xs font-mono text-status-amber font-bold">${a.amount}</span>}<span className="text-2xs text-text-ghost">{timeAgo(a.activity_date)}</span><ChevronRight size={14} className="text-text-ghost"/></div>)})}
      </>)}

      {/* ══ CALENDAR ═══════════════════════════════════════ */}
      {tab === 'calendar' && (<>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(calYear-1)}else setCalMonth(calMonth-1) }} className="btn btn-ghost btn-sm"><ChevronLeft size={16}/></button>
            <h2 className="text-lg font-bold text-text w-48 text-center">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(calYear+1)}else setCalMonth(calMonth+1) }} className="btn btn-ghost btn-sm"><ChevronRight size={16}/></button>
            <button onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()) }} className="btn btn-ghost btn-sm text-2xs">Today</button>
          </div>
          <div className="flex gap-2">
            <button onClick={exportMonthEvents} className="btn btn-ghost btn-sm" title="Export this month to .ics"><Download size={14} /> Export Month</button>
            <button onClick={exportAllEvents} className="btn btn-ghost btn-sm" title="Export all events to .ics"><Calendar size={14} /> Export All</button>
          </div>
        </div>

        {/* Sync info */}
        <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-surface-card rounded-lg border border-border text-xs text-text-ghost">
          <Calendar size={14} className="text-brand"/>
          <span>Export as <strong className="text-text-muted">.ics</strong> file &mdash; works with <strong className="text-text-muted">Google Calendar</strong>, <strong className="text-text-muted">Outlook</strong>, <strong className="text-text-muted">Apple Calendar</strong>, and any calendar app. Click an event to export individually, or use the buttons above to export in bulk.</span>
        </div>

        {/* Calendar Grid */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map(d => (<div key={d} className="px-2 py-2 text-center text-2xs font-bold text-text-ghost uppercase tracking-wider">{d}</div>))}
          </div>
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[100px] bg-surface-bg/50 border-b border-r border-border/5" />
              const events = getEventsForDay(day)
              const today = isToday(day)
              const selected = selectedDay && isSameDay(day, selectedDay)
              return (
                <div key={i} onClick={() => setSelectedDay(selected ? null : day)}
                  className={`min-h-[100px] border-b border-r border-border/5 p-1.5 cursor-pointer transition-colors
                    ${today ? 'bg-brand/5' : selected ? 'bg-surface-card' : 'hover:bg-surface-card/50'}`}>
                  <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${today ? 'bg-brand text-white' : 'text-text-dim'}`}>{day.getDate()}</div>
                  {events.acts.slice(0, 2).map(a => {
                    const t = getTypeInfo(a.activity_type)
                    return <div key={a.id} onClick={e => { e.stopPropagation(); setShowDetail(a) }}
                      className="text-2xs px-1.5 py-0.5 rounded mb-0.5 truncate font-semibold cursor-pointer hover:opacity-80" style={{ background: t.color + '20', color: t.color }}>
                      {t.icon} {a.title}
                    </div>
                  })}
                  {events.tks.slice(0, 1).map(t => (
                    <div key={t.id} className="text-2xs px-1.5 py-0.5 rounded mb-0.5 truncate font-semibold bg-status-amber/10 text-status-amber">
                      \u2610 {t.title}
                    </div>
                  ))}
                  {events.fups.slice(0, 1).map(a => (
                    <div key={a.id+'f'} className="text-2xs px-1.5 py-0.5 rounded mb-0.5 truncate font-semibold bg-status-blue/10 text-status-blue">
                      \uD83D\uDD04 {a.title}
                    </div>
                  ))}
                  {events.total > 3 && <div className="text-2xs text-text-ghost font-mono text-center">+{events.total - 3} more</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDay && (() => {
          const events = getEventsForDay(selectedDay)
          return (
            <div className="card mt-4 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-text">{selectedDay.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                <div className="flex gap-2">
                  <button onClick={() => { setActivityDate(selectedDay.toISOString().slice(0, 16)); setShowAddActivity(true) }} className="btn btn-primary btn-sm"><Plus size={14} /> Add Activity</button>
                </div>
              </div>
              {events.total === 0 ? <div className="text-sm text-text-ghost text-center py-4">No events on this day.</div> : <>
                {events.acts.map(a => {
                  const t = getTypeInfo(a.activity_type)
                  return <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/5 group">
                    <span className="text-lg">{t.icon}</span>
                    <div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {t.label}{a.visit_duration_min?' &middot; '+a.visit_duration_min+'min':''}</div></div>
                    <button onClick={() => exportSingleEvent(a)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-brand bg-transparent border-none cursor-pointer transition-all" title="Add to calendar"><Download size={14}/></button>
                    <button onClick={() => setShowDetail(a)} className="text-text-ghost hover:text-brand bg-transparent border-none cursor-pointer"><ChevronRight size={14}/></button>
                  </div>
                })}
                {events.tks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border/5">
                    <button onClick={() => toggleTask(t.id, t.status)} className="bg-transparent border-none cursor-pointer"><Circle size={16} className="text-status-amber"/></button>
                    <div className="flex-1"><div className="text-sm font-semibold text-text-dim">{t.title}</div><div className="text-2xs text-text-ghost">{t.client?.name||'General'} &middot; Task</div></div>
                    <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${PRIORITY_BG[t.priority]} ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  </div>
                ))}
                {events.fups.map(a => (
                  <div key={a.id+'f'} className="flex items-center gap-3 py-2 border-b border-border/5">
                    <span className="text-lg">{'\uD83D\uDD04'}</span>
                    <div className="flex-1"><div className="text-sm font-semibold text-text-dim">Follow-up: {a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {a.follow_up_notes||''}</div></div>
                  </div>
                ))}
              </>}
            </div>
          )
        })()}
      </>)}

      {/* ══ ACTIVITIES ═════════════════════════════════════ */}
      {tab === 'activities' && (<>
        <div className="flex gap-2.5 mb-4 items-center">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search activities..." className="input pl-9"/></div>
          <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)} className="input w-48"><option value="">All Clients</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="input w-40"><option value="">All Types</option>{ACTIVITY_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}</select>
        </div>
        {filteredActivities.map(a=>{const t=getTypeInfo(a.activity_type);return(<div key={a.id} onClick={()=>setShowDetail(a)} className="flex items-center gap-3 px-4 py-3 bg-surface-card rounded-lg border border-border mb-2 hover:border-brand/20 cursor-pointer transition-colors"><span className="text-xl">{t.icon}</span><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-text-dim">{a.title}</span>{a.status==='planned'&&<span className="text-2xs px-1.5 py-0.5 rounded bg-status-blue/10 text-status-blue font-mono font-bold">PLANNED</span>}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {t.label} &middot; {new Date(a.activity_date).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}{a.visit_duration_min?' &middot; '+a.visit_duration_min+'min':''}</div>{a.description&&<div className="text-xs text-text-muted mt-1 line-clamp-1">{a.description}</div>}</div>{a.billable&&a.amount&&<span className="text-xs font-mono text-status-amber font-bold">${a.amount}</span>}<ChevronRight size={14} className="text-text-ghost"/></div>)})}
        {filteredActivities.length===0&&<div className="card p-12 text-center text-sm text-text-ghost">No activities found.</div>}
      </>)}

      {/* ══ TASKS ══════════════════════════════════════════ */}
      {tab === 'tasks' && (<>
        <div className="flex gap-2.5 mb-4 items-center">
          <div className="flex gap-1">{(['pending','completed','all'] as const).map(f=>(<button key={f} onClick={()=>setTaskFilter(f)} className={`filter-pill ${taskFilter===f?'active':''}`}>{f}</button>))}</div>
          <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)} className="input w-48"><option value="">All Clients</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="flex-1"/>
          <button onClick={()=>setShowAddTask(true)} className="btn btn-primary btn-sm"><Plus size={14}/> Add Task</button>
        </div>
        {filteredTasks.map(t=>(<div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-surface-card rounded-lg border border-border mb-2 group"><button onClick={()=>toggleTask(t.id,t.status)} className="bg-transparent border-none cursor-pointer">{t.status==='completed'?<CheckCircle2 size={18} className="text-brand"/>:<Circle size={18} className={`${t.due_date&&new Date(t.due_date)<now&&t.status!=='completed'?'text-status-red':'text-text-ghost'}`}/>}</button><div className="flex-1"><div className={`text-sm font-semibold ${t.status==='completed'?'text-text-ghost line-through':'text-text-dim'}`}>{t.title}</div><div className="text-2xs text-text-ghost">{t.client?.name||'General'}{t.due_date?' \u00B7 Due '+new Date(t.due_date).toLocaleDateString('en-AU',{day:'numeric',month:'short'}):''}</div></div><span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${PRIORITY_BG[t.priority]} ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span><button onClick={()=>deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-status-red bg-transparent border-none cursor-pointer transition-all"><Trash2 size={14}/></button></div>))}
        {filteredTasks.length===0&&<div className="card p-12 text-center text-sm text-text-ghost">{taskFilter==='pending'?'No pending tasks.':'No tasks found.'}</div>}
      </>)}

      {/* ══ DOCUMENTS ══════════════════════════════════════ */}
      {tab === 'documents' && (<>
        <div className="flex gap-2.5 mb-4 items-center"><select value={clientFilter} onChange={e=>setClientFilter(e.target.value)} className="input w-48"><option value="">All Clients</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="flex-1"/><button onClick={()=>setShowAddDoc(true)} className="btn btn-primary btn-sm"><Plus size={14}/> Add Document</button></div>
        <div className="grid grid-cols-3 gap-3">{documents.filter(d=>!clientFilter||d.client_id===clientFilter).map(d=>(<div key={d.id} className="card p-4 group"><div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-brand"/><span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono font-bold uppercase">{d.doc_type.replace(/_/g,' ')}</span><button onClick={()=>deleteDoc(d.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-text-ghost hover:text-status-red bg-transparent border-none cursor-pointer transition-all"><Trash2 size={12}/></button></div><div className="text-sm font-bold text-text-dim mb-1">{d.title}</div><div className="text-2xs text-text-ghost">{d.client?.name||'General'} &middot; {new Date(d.doc_date).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</div>{d.description&&<div className="text-xs text-text-muted mt-1 line-clamp-2">{d.description}</div>}{d.file_url&&<a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-2xs text-brand mt-2 inline-block hover:underline">Open link &rarr;</a>}</div>))}</div>
        {documents.filter(d=>!clientFilter||d.client_id===clientFilter).length===0&&<div className="card p-12 text-center text-sm text-text-ghost">No documents yet.</div>}
      </>)}

      {/* ── ACTIVITY DETAIL MODAL ─────────────────────────── */}
      {showDetail&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowDetail(null)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl max-h-[80vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2.5"><span className="text-2xl">{getTypeInfo(showDetail.activity_type).icon}</span><div><div className="text-lg font-bold text-text">{showDetail.title}</div><div className="text-xs text-text-ghost">{getTypeInfo(showDetail.activity_type).label} &middot; {showDetail.client?.name} &middot; {new Date(showDetail.activity_date).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div></div><div className="flex gap-1"><button onClick={()=>exportSingleEvent(showDetail)} className="text-text-ghost hover:text-brand bg-transparent border-none cursor-pointer p-1" title="Add to calendar"><Download size={14}/></button><button onClick={()=>deleteActivity(showDetail.id)} className="text-text-ghost hover:text-status-red bg-transparent border-none cursor-pointer p-1"><Trash2 size={14}/></button><button onClick={()=>setShowDetail(null)} className="text-text-ghost bg-transparent border-none cursor-pointer p-1"><X size={18}/></button></div></div>
        {showDetail.description&&<div className="text-sm text-text-dim leading-relaxed mb-3">{showDetail.description}</div>}
        <div className="flex flex-wrap gap-2 mb-3">{showDetail.visit_location&&<span className="text-2xs px-2 py-1 rounded bg-surface-bg text-text-muted flex items-center gap-1"><MapPin size={10}/> {showDetail.visit_location}</span>}{showDetail.visit_duration_min&&<span className="text-2xs px-2 py-1 rounded bg-surface-bg text-text-muted flex items-center gap-1"><Clock size={10}/> {showDetail.visit_duration_min} min</span>}{showDetail.travel_km&&<span className="text-2xs px-2 py-1 rounded bg-surface-bg text-text-muted">{showDetail.travel_km} km</span>}{showDetail.billable&&<span className="text-2xs px-2 py-1 rounded bg-status-amber/10 text-status-amber font-mono font-bold">${showDetail.amount||0} AUD</span>}{(showDetail.tags as string[]||[]).map((tag:string)=><span key={tag} className="text-2xs px-2 py-1 rounded bg-brand/10 text-brand font-mono">{tag}</span>)}</div>
        {showDetail.observations&&<><div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Observations</div><div className="text-sm text-text-dim bg-surface-bg rounded-lg p-3 mb-3 leading-relaxed">{showDetail.observations}</div></>}
        {showDetail.recommendations&&<><div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Recommendations</div><div className="text-sm text-text-dim bg-surface-bg rounded-lg p-3 mb-3 leading-relaxed">{showDetail.recommendations}</div></>}
        {showDetail.follow_up_date&&<><div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Follow Up</div><div className="text-sm text-text-dim bg-surface-bg rounded-lg p-3 mb-3"><span className="font-mono">{new Date(showDetail.follow_up_date).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}</span>{showDetail.follow_up_notes&&<span> &mdash; {showDetail.follow_up_notes}</span>}</div></>}
      </div></div>)}

      {/* ── ADD ACTIVITY MODAL ─────────────────────────── */}
      {showAddActivity&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddActivity(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">Log Activity</h2><button onClick={()=>setShowAddActivity(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <form onSubmit={handleAddActivity} className="flex flex-col gap-3.5">
          <div><label className="text-xs font-semibold text-text-muted block mb-1.5">Activity Type</label><div className="flex gap-1.5 flex-wrap">{ACTIVITY_TYPES.map(t=>(<button key={t.key} type="button" onClick={()=>setActivityType(t.key)} className={`px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${activityType===t.key?'border-brand bg-brand/10 text-brand':'border-border text-text-faint hover:border-border-light'}`}><span>{t.icon}</span> {t.label}</button>))}</div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Client *</label><select name="client_id" required defaultValue={activityClientId} className="input"><option value="">Select client...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Date *</label><input name="activity_date" type="datetime-local" required defaultValue={activityDate || new Date().toISOString().slice(0,16)} className="input"/></div></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Title *</label><input name="title" required className="input" placeholder={activityType==='visit'?'e.g. Quarterly nutrition review':'Activity title'}/></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Description</label><textarea name="description" className="input min-h-[60px] resize-y" placeholder="What happened..."/></div>
          {(activityType==='visit'||activityType==='sample_collection')&&(<div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Location</label><input name="visit_location" className="input" placeholder="Dairy shed"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Duration (min)</label><input name="visit_duration_min" type="number" className="input" placeholder="120"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Travel (km)</label><input name="travel_km" type="number" step="0.1" className="input" placeholder="85"/></div></div>)}
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Observations</label><textarea name="observations" className="input min-h-[50px] resize-y" placeholder="What you observed..."/></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Recommendations</label><textarea name="recommendations" className="input min-h-[50px] resize-y" placeholder="What you recommended..."/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Follow-up Date</label><input name="follow_up_date" type="date" className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Follow-up Notes</label><input name="follow_up_notes" className="input" placeholder="Check diet transition"/></div></div>
          <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Status</label><select name="status" className="input"><option value="completed">Completed</option><option value="planned">Planned</option></select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Formula</label><select name="formula_id" className="input"><option value="">None</option>{formulas.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Tags</label><input name="tags" className="input" placeholder="audit, seasonal"/></div></div>
          <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer"><input name="billable" type="checkbox" className="rounded"/> Billable</label><div className="flex items-center gap-1"><label className="text-xs text-text-muted">Amount $</label><input name="amount" type="number" step="0.01" className="input w-24 text-sm" placeholder="250"/></div></div>
          <div className="flex gap-2 mt-2"><button type="button" onClick={()=>setShowAddActivity(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Saving...':'Log Activity'}</button></div>
        </form>
      </div></div>)}

      {/* ── ADD TASK MODAL ─────────────────────────────── */}
      {showAddTask&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddTask(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">Add Task</h2><button onClick={()=>setShowAddTask(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <form onSubmit={handleAddTask} className="flex flex-col gap-3">
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Task *</label><input name="title" required className="input" placeholder="e.g. Send revised formula"/></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Description</label><textarea name="description" className="input min-h-[50px] resize-y"/></div>
          <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Client</label><select name="client_id" className="input"><option value="">General</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Priority</label><select name="priority" defaultValue="medium" className="input"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Due Date</label><input name="due_date" type="date" className="input"/></div></div>
          <div className="flex gap-2 mt-1"><button type="button" onClick={()=>setShowAddTask(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Adding...':'Add Task'}</button></div>
        </form>
      </div></div>)}

      {/* ── ADD DOCUMENT MODAL ────────────────────────── */}
      {showAddDoc&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddDoc(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">Add Document</h2><button onClick={()=>setShowAddDoc(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <form onSubmit={handleAddDoc} className="flex flex-col gap-3">
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Title *</label><input name="title" required className="input" placeholder="e.g. Feed analysis — March 2026"/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Type *</label><select name="doc_type" required className="input">{DOC_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Client</label><select name="client_id" className="input"><option value="">General</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">Description</label><textarea name="description" className="input min-h-[50px] resize-y"/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Link / URL</label><input name="file_url" type="url" className="input" placeholder="https://..."/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Date</label><input name="doc_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input"/></div></div>
          <div className="flex gap-2 mt-1"><button type="button" onClick={()=>setShowAddDoc(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Adding...':'Add Document'}</button></div>
        </form>
      </div></div>)}
    </div>
  )
}
