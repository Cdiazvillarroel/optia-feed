'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Search, X, Calendar, MapPin, Clock, CheckCircle2, Circle, AlertTriangle, FileText, Trash2, ChevronRight, ChevronLeft, Download } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

const ACTIVITY_TYPE_KEYS = [
  { key: 'visit', tKey: 'crm.farm_visit', icon: '🚶', color: '#4CAF7D' },
  { key: 'call', tKey: 'crm.phone_call', icon: '📞', color: '#5B9BD5' },
  { key: 'email', tKey: 'common.email', icon: '📧', color: '#7BA0C4' },
  { key: 'note', tKey: 'crm.note', icon: '📝', color: '#D4A843' },
  { key: 'meeting', tKey: 'crm.meeting', icon: '🤝', color: '#9C7BC4' },
  { key: 'formula_review', tKey: 'crm.formula_review', icon: '🧪', color: '#E88B6E' },
  { key: 'sample_collection', tKey: 'crm.sample_collection', icon: '🥊', color: '#6BBF8A' },
  { key: 'training', tKey: 'crm.training', icon: '🎓', color: '#C47B9B' },
  { key: 'follow_up', tKey: 'crm.follow_up', icon: '🔄', color: '#8B8B8B' },
]

const PRIORITY_COLORS: Record<string,string> = { low:'text-text-ghost', medium:'text-status-blue', high:'text-status-amber', urgent:'text-status-red' }
const PRIORITY_BG: Record<string,string> = { low:'bg-white/5', medium:'bg-status-blue/10', high:'bg-status-amber/10', urgent:'bg-status-red/10' }
const DOC_TYPES = ['lab_report','feed_analysis','contract','invoice','photo','report','formula_spec','other']
const DAYS_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DAYS_ES = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DAYS_PT = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const DAYS_MAP: Record<string, string[]> = { en: DAYS_EN, es: DAYS_ES, pt: DAYS_PT }
const MONTHS_MAP: Record<string, string[]> = { en: MONTHS_EN, es: MONTHS_ES, pt: MONTHS_PT }

// ── ICS CALENDAR GENERATION ──────────────────────────────
function toICSDate(d: Date): string { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') }

function generateICSEvent(event: { title: string; description?: string; location?: string; start: Date; end: Date; uid: string }): string {
  let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Optia Feed//CRM//EN\r\nBEGIN:VEVENT\r\n`
  ics += `UID:${event.uid}@optiafeed\r\nDTSTART:${toICSDate(event.start)}\r\nDTEND:${toICSDate(event.end)}\r\n`
  ics += `SUMMARY:${event.title.replace(/[,;\\]/g, ' ')}\r\n`
  if (event.description) ics += `DESCRIPTION:${event.description.replace(/\n/g, '\\n').replace(/[,;\\]/g, ' ').slice(0, 500)}\r\n`
  if (event.location) ics += `LOCATION:${event.location.replace(/[,;\\]/g, ' ')}\r\n`
  ics += `END:VEVENT\r\nEND:VCALENDAR\r\n`
  return ics
}

function generateICSMultiple(events: { title: string; description?: string; location?: string; start: Date; end: Date; uid: string }[]): string {
  let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Optia Feed//CRM//EN\r\nX-WR-CALNAME:Optia Feed\r\n`
  events.forEach(e => {
    ics += `BEGIN:VEVENT\r\nUID:${e.uid}@optiafeed\r\nDTSTART:${toICSDate(e.start)}\r\nDTEND:${toICSDate(e.end)}\r\n`
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
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── MAIN COMPONENT ───────────────────────────────────────
export default function CRMPage() {
  const { t, lang } = useTranslation()
  const DAYS = DAYS_MAP[lang] || DAYS_EN
  const MONTHS = MONTHS_MAP[lang] || MONTHS_EN

  function getTypeInfo(type: string) {
    const info = ACTIVITY_TYPE_KEYS.find(a => a.key === type) || ACTIVITY_TYPE_KEYS[0]
    return { ...info, label: t(info.tKey) }
  }

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
    const { data: tk } = await supabase.from('crm_tasks').select('*, client:nutrition_clients(name)').order('due_date', { ascending: true })
    setTasks(tk || [])
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
  const filteredTasks = tasks.filter(tk => {
    if (taskFilter === 'pending' && (tk.status === 'completed' || tk.status === 'cancelled')) return false
    if (taskFilter === 'completed' && tk.status !== 'completed') return false
    if (clientFilter && tk.client_id !== clientFilter) return false
    return true
  })

  const thisWeek = activities.filter(a => new Date(a.activity_date) > new Date(now.getTime() - 7*24*60*60*1000))
  const thisMonth = activities.filter(a => new Date(a.activity_date) > new Date(now.getTime() - 30*24*60*60*1000))
  const pendingTasks = tasks.filter(tk => tk.status === 'pending' || tk.status === 'in_progress')
  const overdueTasks = pendingTasks.filter(tk => tk.due_date && new Date(tk.due_date) < now)
  const upcomingActivities = activities.filter(a => a.status === 'planned' && new Date(a.activity_date) > now).sort((a,b) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime())
  const followUps = activities.filter(a => a.follow_up_date && new Date(a.follow_up_date) <= now && a.status === 'completed')
  const clientLastActivity: Record<string, Date> = {}
  activities.forEach(a => { const d = new Date(a.activity_date); if (!clientLastActivity[a.client_id] || d > clientLastActivity[a.client_id]) clientLastActivity[a.client_id] = d })
  const needsAttention = clients.filter(c => { const last = clientLastActivity[c.id]; return !last || (now.getTime() - last.getTime()) > 30*24*60*60*1000 })

  const dateLocale = lang === 'es' ? 'es-AR' : lang === 'pt' ? 'pt-BR' : 'en-AU'

  function timeAgo(date: string) {
    const diff = now.getTime() - new Date(date).getTime(); const days = Math.floor(diff/(24*60*60*1000))
    if(days===0) return t('crm.today'); if(days===1) return lang==='en'?'Yesterday':lang==='es'?'Ayer':'Ontem'
    if(days<7) return days+'d'; if(days<30) return Math.floor(days/7)+'w'; return Math.floor(days/30)+'mo'
  }

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
    const tks = tasks.filter(tk => tk.due_date && new Date(tk.due_date).toISOString().split('T')[0] === dayStr && tk.status !== 'completed')
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
    const monthTasks = tasks.filter(tk => tk.due_date && (() => { const d = new Date(tk.due_date); return d >= monthStart && d <= monthEnd })())
    const events = [
      ...monthActs.map(a => ({ title: `${getTypeInfo(a.activity_type).label}: ${a.title}`, description: a.description || '', location: a.visit_location || a.client?.location || '', start: new Date(a.activity_date), end: new Date(new Date(a.activity_date).getTime() + (a.visit_duration_min || 60)*60*1000), uid: a.id })),
      ...monthTasks.map(tk => ({ title: `${t('crm.tasks')}: ${tk.title}`, description: tk.description || '', location: '', start: new Date(tk.due_date), end: new Date(new Date(tk.due_date).getTime() + 30*60*1000), uid: tk.id })),
    ]
    if (events.length === 0) return
    const ics = generateICSMultiple(events)
    downloadICS(ics, `optia-feed-${MONTHS[calMonth].toLowerCase()}-${calYear}.ics`)
  }

  function exportAllEvents() {
    const events = [
      ...activities.map(a => ({ title: `${getTypeInfo(a.activity_type).label}: ${a.title}`, description: a.description || '', location: a.visit_location || a.client?.location || '', start: new Date(a.activity_date), end: new Date(new Date(a.activity_date).getTime() + (a.visit_duration_min || 60)*60*1000), uid: a.id })),
      ...tasks.filter(tk => tk.due_date).map(tk => ({ title: `${t('crm.tasks')}: ${tk.title}`, description: tk.description || '', location: '', start: new Date(tk.due_date!), end: new Date(new Date(tk.due_date!).getTime() + 30*60*1000), uid: tk.id })),
    ]
    if (events.length === 0) return
    downloadICS(generateICSMultiple(events), `optia-feed-all-events.ics`)
  }

  // ── ACTIONS ────────────────────────────────────────────
  async function handleAddActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true)
    const f = new FormData(e.currentTarget); const supabase = await getSupabase()
    const tagsRaw = f.get('tags') as string
    const tags = tagsRaw ? tagsRaw.split(',').map(tg => tg.trim()).filter(Boolean) : null
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
        <div><h1 className="text-2xl font-bold text-text">{t('crm.title')}</h1><p className="text-base text-text-faint mt-0.5">{t('crm.subtitle')}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddTask(true)} className="btn btn-ghost btn-sm"><Plus size={14} /> {t('crm.tasks')}</button>
          <button onClick={() => { setActivityType('visit'); setActivityDate(''); setActivityClientId(''); setShowAddActivity(true) }} className="btn btn-primary btn-sm"><Plus size={14} /> {t('crm.log_activity')}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-5">
        {[
          { key: 'dashboard' as const, label: t('crm.dashboard'), count: null },
          { key: 'calendar' as const, label: `📅 ${t('crm.calendar')}`, count: null },
          { key: 'activities' as const, label: t('crm.activities'), count: thisMonth.length },
          { key: 'tasks' as const, label: t('crm.tasks'), count: pendingTasks.length },
          { key: 'documents' as const, label: t('crm.documents'), count: documents.length },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} className={`px-4 py-2 rounded text-sm font-semibold transition-all flex items-center gap-2 ${tab === tb.key ? 'bg-brand text-white' : 'text-text-faint hover:bg-white/5'}`}>
            {tb.label}{tb.count !== null && <span className={`text-2xs font-mono px-1.5 py-0.5 rounded-full ${tab === tb.key ? 'bg-white/20' : 'bg-white/5'}`}>{tb.count}</span>}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══════════════════════════════════════ */}
      {tab === 'dashboard' && (<>
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[{l:t('crm.this_week'),v:thisWeek.length,c:'#4CAF7D'},{l:t('crm.this_month'),v:thisMonth.length,c:'#5B9BD5'},{l:t('crm.pending_tasks'),v:pendingTasks.length,c:'#D4A843'},{l:t('crm.overdue'),v:overdueTasks.length,c:overdueTasks.length>0?'#E05252':'#4CAF7D'},{l:t('crm.needs_attention'),v:needsAttention.length,c:needsAttention.length>0?'#D4A843':'#4CAF7D'}].map((s,i)=>(
            <div key={i} className="stat-card"><div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">{s.l}</div><div className="text-2xl font-bold font-mono" style={{color:s.c}}>{s.v}</div></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">{t('crm.upcoming_planned')}</span></div>{upcomingActivities.length>0?upcomingActivities.slice(0,5).map(a=>{const ti=getTypeInfo(a.activity_type);return(<div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><span className="text-lg">{ti.icon}</span><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {new Date(a.activity_date).toLocaleDateString(dateLocale,{day:'numeric',month:'short'})}</div></div></div>)}):<div className="px-4 py-6 text-center text-sm text-text-ghost">{t('crm.no_upcoming')}</div>}</div>
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">{t('crm.tasks_due')}</span></div>{pendingTasks.slice(0,5).map(tk=>(<div key={tk.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><button onClick={()=>toggleTask(tk.id,tk.status)} className="bg-transparent border-none cursor-pointer"><Circle size={16} className={`${tk.due_date&&new Date(tk.due_date)<now?'text-status-red':'text-text-ghost'}`}/></button><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{tk.title}</div><div className="text-2xs text-text-ghost">{tk.client?.name||t('crm.general')}{tk.due_date?' · '+new Date(tk.due_date).toLocaleDateString(dateLocale,{day:'numeric',month:'short'}):''}</div></div><span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${PRIORITY_BG[tk.priority]} ${PRIORITY_COLORS[tk.priority]}`}>{tk.priority}</span></div>))}{pendingTasks.length===0&&<div className="px-4 py-6 text-center text-sm text-text-ghost">{t('crm.all_caught_up')}</div>}</div>
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">{t('crm.follow_ups_due')}</span></div>{followUps.length>0?followUps.slice(0,5).map(a=>(<div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><span className="text-lg">🔄</span><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {a.follow_up_notes||t('crm.follow_up')}</div></div><span className="text-2xs text-status-amber font-mono">{timeAgo(a.follow_up_date)}</span></div>)):<div className="px-4 py-6 text-center text-sm text-text-ghost">{t('crm.no_follow_ups')}</div>}</div>
          <div className="card"><div className="card-header"><span className="text-sm font-bold text-text-dim">{t('crm.needs_attention')}</span><span className="text-2xs text-text-ghost">{t('crm.no_contact_30d')}</span></div>{needsAttention.length>0?needsAttention.slice(0,5).map(c=>(<div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/5"><AlertTriangle size={14} className="text-status-amber"/><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{c.name}</div><div className="text-2xs text-text-ghost">{c.location} &middot; {clientLastActivity[c.id]?timeAgo(clientLastActivity[c.id].toISOString()):lang==='en'?'Never':lang==='es'?'Nunca':'Nunca'}</div></div><button onClick={()=>{setActivityClientId(c.id);setActivityType('visit');setShowAddActivity(true)}} className="btn btn-ghost btn-sm text-2xs">Log</button></div>)):<div className="px-4 py-6 text-center text-sm text-text-ghost">{t('crm.all_well_attended')}</div>}</div>
        </div>
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mt-6 mb-3 flex items-center gap-2">{t('crm.recent_activity')}<span className="flex-1 h-px bg-border"/></div>
        {activities.slice(0,8).map(a=>{const ti=getTypeInfo(a.activity_type);return(<div key={a.id} onClick={()=>setShowDetail(a)} className="flex items-center gap-3 px-4 py-3 bg-surface-card rounded-lg border border-border mb-2 hover:border-brand/20 cursor-pointer transition-colors"><span className="text-xl">{ti.icon}</span><div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {ti.label} &middot; {new Date(a.activity_date).toLocaleDateString(dateLocale,{weekday:'short',day:'numeric',month:'short'})}</div></div>{a.billable&&a.amount&&<span className="text-xs font-mono text-status-amber font-bold">${a.amount}</span>}<span className="text-2xs text-text-ghost">{timeAgo(a.activity_date)}</span><ChevronRight size={14} className="text-text-ghost"/></div>)})}
      </>)}

      {/* ══ CALENDAR ═══════════════════════════════════════ */}
      {tab === 'calendar' && (<>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { if(calMonth===0){setCalMonth(11);setCalYear(calYear-1)}else setCalMonth(calMonth-1) }} className="btn btn-ghost btn-sm"><ChevronLeft size={16}/></button>
            <h2 className="text-lg font-bold text-text w-48 text-center">{MONTHS[calMonth]} {calYear}</h2>
            <button onClick={() => { if(calMonth===11){setCalMonth(0);setCalYear(calYear+1)}else setCalMonth(calMonth+1) }} className="btn btn-ghost btn-sm"><ChevronRight size={16}/></button>
            <button onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()) }} className="btn btn-ghost btn-sm text-2xs">{t('crm.today')}</button>
          </div>
          <div className="flex gap-2">
            <button onClick={exportMonthEvents} className="btn btn-ghost btn-sm"><Download size={14} /> {t('crm.export_month')}</button>
            <button onClick={exportAllEvents} className="btn btn-ghost btn-sm"><Calendar size={14} /> {t('crm.export_all')}</button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-surface-card rounded-lg border border-border text-xs text-text-ghost">
          <Calendar size={14} className="text-brand"/>
          <span>{lang==='es'?'Exportar como archivo .ics — funciona con Google Calendar, Outlook, Apple Calendar y cualquier app de calendario.':lang==='pt'?'Exportar como arquivo .ics — funciona com Google Calendar, Outlook, Apple Calendar e qualquer app de calendário.':'Export as .ics file — works with Google Calendar, Outlook, Apple Calendar, and any calendar app.'}</span>
        </div>
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
                  className={`min-h-[100px] border-b border-r border-border/5 p-1.5 cursor-pointer transition-colors ${today ? 'bg-brand/5' : selected ? 'bg-surface-card' : 'hover:bg-surface-card/50'}`}>
                  <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${today ? 'bg-brand text-white' : 'text-text-dim'}`}>{day.getDate()}</div>
                  {events.acts.slice(0, 2).map(a => {
                    const ti = getTypeInfo(a.activity_type)
                    return <div key={a.id} onClick={e => { e.stopPropagation(); setShowDetail(a) }}
                      className="text-2xs px-1.5 py-0.5 rounded mb-0.5 truncate font-semibold cursor-pointer hover:opacity-80" style={{ background: ti.color + '20', color: ti.color }}>
                      {ti.icon} {a.title}
                    </div>
                  })}
                  {events.tks.slice(0, 1).map(tk => (
                    <div key={tk.id} className="text-2xs px-1.5 py-0.5 rounded mb-0.5 truncate font-semibold bg-status-amber/10 text-status-amber">☐ {tk.title}</div>
                  ))}
                  {events.fups.slice(0, 1).map(a => (
                    <div key={a.id+'f'} className="text-2xs px-1.5 py-0.5 rounded mb-0.5 truncate font-semibold bg-status-blue/10 text-status-blue">🔄 {a.title}</div>
                  ))}
                  {events.total > 3 && <div className="text-2xs text-text-ghost font-mono text-center">+{events.total - 3}</div>}
                </div>
              )
            })}
          </div>
        </div>
        {selectedDay && (() => {
          const events = getEventsForDay(selectedDay)
          return (
            <div className="card mt-4 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-text">{selectedDay.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => { setActivityDate(selectedDay.toISOString().slice(0, 16)); setShowAddActivity(true) }} className="btn btn-primary btn-sm"><Plus size={14} /> {t('crm.add_activity')}</button>
              </div>
              {events.total === 0 ? <div className="text-sm text-text-ghost text-center py-4">{t('crm.no_events_day')}</div> : <>
                {events.acts.map(a => {
                  const ti = getTypeInfo(a.activity_type)
                  return <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/5 group">
                    <span className="text-lg">{ti.icon}</span>
                    <div className="flex-1"><div className="text-sm font-semibold text-text-dim">{a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {ti.label}{a.visit_duration_min?' &middot; '+a.visit_duration_min+'min':''}</div></div>
                    <button onClick={() => exportSingleEvent(a)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-brand bg-transparent border-none cursor-pointer transition-all" title={t('crm.export_month')}><Download size={14}/></button>
                    <button onClick={() => setShowDetail(a)} className="text-text-ghost hover:text-brand bg-transparent border-none cursor-pointer"><ChevronRight size={14}/></button>
                  </div>
                })}
                {events.tks.map(tk => (
                  <div key={tk.id} className="flex items-center gap-3 py-2 border-b border-border/5">
                    <button onClick={() => toggleTask(tk.id, tk.status)} className="bg-transparent border-none cursor-pointer"><Circle size={16} className="text-status-amber"/></button>
                    <div className="flex-1"><div className="text-sm font-semibold text-text-dim">{tk.title}</div><div className="text-2xs text-text-ghost">{tk.client?.name||t('crm.general')} &middot; {t('crm.tasks')}</div></div>
                    <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${PRIORITY_BG[tk.priority]} ${PRIORITY_COLORS[tk.priority]}`}>{tk.priority}</span>
                  </div>
                ))}
                {events.fups.map(a => (
                  <div key={a.id+'f'} className="flex items-center gap-3 py-2 border-b border-border/5">
                    <span className="text-lg">🔄</span>
                    <div className="flex-1"><div className="text-sm font-semibold text-text-dim">{t('crm.follow_up')}: {a.title}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {a.follow_up_notes||''}</div></div>
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
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('crm.search_activities')} className="input pl-9"/></div>
          <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)} className="input w-48"><option value="">{t('crm.all_clients')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="input w-40"><option value="">{t('crm.all_types')}</option>{ACTIVITY_TYPE_KEYS.map(at=><option key={at.key} value={at.key}>{t(at.tKey)}</option>)}</select>
        </div>
        {filteredActivities.map(a=>{const ti=getTypeInfo(a.activity_type);return(<div key={a.id} onClick={()=>setShowDetail(a)} className="flex items-center gap-3 px-4 py-3 bg-surface-card rounded-lg border border-border mb-2 hover:border-brand/20 cursor-pointer transition-colors"><span className="text-xl">{ti.icon}</span><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-text-dim">{a.title}</span>{a.status==='planned'&&<span className="text-2xs px-1.5 py-0.5 rounded bg-status-blue/10 text-status-blue font-mono font-bold">{t('crm.planned').toUpperCase()}</span>}</div><div className="text-2xs text-text-ghost">{a.client?.name} &middot; {ti.label} &middot; {new Date(a.activity_date).toLocaleDateString(dateLocale,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}{a.visit_duration_min?' &middot; '+a.visit_duration_min+'min':''}</div>{a.description&&<div className="text-xs text-text-muted mt-1 line-clamp-1">{a.description}</div>}</div>{a.billable&&a.amount&&<span className="text-xs font-mono text-status-amber font-bold">${a.amount}</span>}<ChevronRight size={14} className="text-text-ghost"/></div>)})}
        {filteredActivities.length===0&&<div className="card p-12 text-center text-sm text-text-ghost">{t('crm.no_activities')}</div>}
      </>)}

      {/* ══ TASKS ══════════════════════════════════════════ */}
      {tab === 'tasks' && (<>
        <div className="flex gap-2.5 mb-4 items-center">
          <div className="flex gap-1">{(['pending','completed','all'] as const).map(f=>(<button key={f} onClick={()=>setTaskFilter(f)} className={`filter-pill ${taskFilter===f?'active':''}`}>{f==='pending'?t('common.pending'):f==='completed'?t('crm.completed'):t('common.all')}</button>))}</div>
          <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)} className="input w-48"><option value="">{t('crm.all_clients')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="flex-1"/>
          <button onClick={()=>setShowAddTask(true)} className="btn btn-primary btn-sm"><Plus size={14}/> {t('crm.add_task')}</button>
        </div>
        {filteredTasks.map(tk=>(<div key={tk.id} className="flex items-center gap-3 px-4 py-3 bg-surface-card rounded-lg border border-border mb-2 group"><button onClick={()=>toggleTask(tk.id,tk.status)} className="bg-transparent border-none cursor-pointer">{tk.status==='completed'?<CheckCircle2 size={18} className="text-brand"/>:<Circle size={18} className={`${tk.due_date&&new Date(tk.due_date)<now&&tk.status!=='completed'?'text-status-red':'text-text-ghost'}`}/>}</button><div className="flex-1"><div className={`text-sm font-semibold ${tk.status==='completed'?'text-text-ghost line-through':'text-text-dim'}`}>{tk.title}</div><div className="text-2xs text-text-ghost">{tk.client?.name||t('crm.general')}{tk.due_date?' · '+new Date(tk.due_date).toLocaleDateString(dateLocale,{day:'numeric',month:'short'}):''}</div></div><span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${PRIORITY_BG[tk.priority]} ${PRIORITY_COLORS[tk.priority]}`}>{tk.priority}</span><button onClick={()=>deleteTask(tk.id)} className="opacity-0 group-hover:opacity-100 text-text-ghost hover:text-status-red bg-transparent border-none cursor-pointer transition-all"><Trash2 size={14}/></button></div>))}
        {filteredTasks.length===0&&<div className="card p-12 text-center text-sm text-text-ghost">{taskFilter==='pending'?t('crm.no_pending_tasks'):t('crm.no_tasks')}</div>}
      </>)}

      {/* ══ DOCUMENTS ══════════════════════════════════════ */}
      {tab === 'documents' && (<>
        <div className="flex gap-2.5 mb-4 items-center"><select value={clientFilter} onChange={e=>setClientFilter(e.target.value)} className="input w-48"><option value="">{t('crm.all_clients')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><div className="flex-1"/><button onClick={()=>setShowAddDoc(true)} className="btn btn-primary btn-sm"><Plus size={14}/> {t('crm.add_document')}</button></div>
        <div className="grid grid-cols-3 gap-3">{documents.filter(d=>!clientFilter||d.client_id===clientFilter).map(d=>(<div key={d.id} className="card p-4 group"><div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-brand"/><span className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-mono font-bold uppercase">{d.doc_type.replace(/_/g,' ')}</span><button onClick={()=>deleteDoc(d.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-text-ghost hover:text-status-red bg-transparent border-none cursor-pointer transition-all"><Trash2 size={12}/></button></div><div className="text-sm font-bold text-text-dim mb-1">{d.title}</div><div className="text-2xs text-text-ghost">{d.client?.name||t('crm.general')} &middot; {new Date(d.doc_date).toLocaleDateString(dateLocale,{day:'numeric',month:'short',year:'numeric'})}</div>{d.description&&<div className="text-xs text-text-muted mt-1 line-clamp-2">{d.description}</div>}{d.file_url&&<a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-2xs text-brand mt-2 inline-block hover:underline">{t('crm.open_link')} &rarr;</a>}</div>))}</div>
        {documents.filter(d=>!clientFilter||d.client_id===clientFilter).length===0&&<div className="card p-12 text-center text-sm text-text-ghost">{t('crm.no_documents')}</div>}
      </>)}

      {/* ── ACTIVITY DETAIL MODAL ─────────────────────────── */}
      {showDetail&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowDetail(null)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl max-h-[80vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2.5"><span className="text-2xl">{getTypeInfo(showDetail.activity_type).icon}</span><div><div className="text-lg font-bold text-text">{showDetail.title}</div><div className="text-xs text-text-ghost">{getTypeInfo(showDetail.activity_type).label} &middot; {showDetail.client?.name} &middot; {new Date(showDetail.activity_date).toLocaleDateString(dateLocale,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div></div><div className="flex gap-1"><button onClick={()=>exportSingleEvent(showDetail)} className="text-text-ghost hover:text-brand bg-transparent border-none cursor-pointer p-1"><Download size={14}/></button><button onClick={()=>deleteActivity(showDetail.id)} className="text-text-ghost hover:text-status-red bg-transparent border-none cursor-pointer p-1"><Trash2 size={14}/></button><button onClick={()=>setShowDetail(null)} className="text-text-ghost bg-transparent border-none cursor-pointer p-1"><X size={18}/></button></div></div>
        {showDetail.description&&<div className="text-sm text-text-dim leading-relaxed mb-3">{showDetail.description}</div>}
        <div className="flex flex-wrap gap-2 mb-3">{showDetail.visit_location&&<span className="text-2xs px-2 py-1 rounded bg-surface-bg text-text-muted flex items-center gap-1"><MapPin size={10}/> {showDetail.visit_location}</span>}{showDetail.visit_duration_min&&<span className="text-2xs px-2 py-1 rounded bg-surface-bg text-text-muted flex items-center gap-1"><Clock size={10}/> {showDetail.visit_duration_min} min</span>}{showDetail.travel_km&&<span className="text-2xs px-2 py-1 rounded bg-surface-bg text-text-muted">{showDetail.travel_km} km</span>}{showDetail.billable&&<span className="text-2xs px-2 py-1 rounded bg-status-amber/10 text-status-amber font-mono font-bold">${showDetail.amount||0} AUD</span>}{(showDetail.tags as string[]||[]).map((tag:string)=><span key={tag} className="text-2xs px-2 py-1 rounded bg-brand/10 text-brand font-mono">{tag}</span>)}</div>
        {showDetail.observations&&<><div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{t('crm.observations')}</div><div className="text-sm text-text-dim bg-surface-bg rounded-lg p-3 mb-3 leading-relaxed">{showDetail.observations}</div></>}
        {showDetail.recommendations&&<><div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{t('crm.recommendations')}</div><div className="text-sm text-text-dim bg-surface-bg rounded-lg p-3 mb-3 leading-relaxed">{showDetail.recommendations}</div></>}
        {showDetail.follow_up_date&&<><div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{t('crm.follow_up')}</div><div className="text-sm text-text-dim bg-surface-bg rounded-lg p-3 mb-3"><span className="font-mono">{new Date(showDetail.follow_up_date).toLocaleDateString(dateLocale,{day:'numeric',month:'short',year:'numeric'})}</span>{showDetail.follow_up_notes&&<span> &mdash; {showDetail.follow_up_notes}</span>}</div></>}
      </div></div>)}

      {/* ── ADD ACTIVITY MODAL ─────────────────────────── */}
      {showAddActivity&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddActivity(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">{t('crm.log_activity')}</h2><button onClick={()=>setShowAddActivity(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <form onSubmit={handleAddActivity} className="flex flex-col gap-3.5">
          <div><label className="text-xs font-semibold text-text-muted block mb-1.5">{t('crm.activity_type')}</label><div className="flex gap-1.5 flex-wrap">{ACTIVITY_TYPE_KEYS.map(at=>(<button key={at.key} type="button" onClick={()=>setActivityType(at.key)} className={`px-3 py-1.5 rounded border text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${activityType===at.key?'border-brand bg-brand/10 text-brand':'border-border text-text-faint hover:border-border-light'}`}><span>{at.icon}</span> {t(at.tKey)}</button>))}</div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('sidebar.clients')} *</label><select name="client_id" required defaultValue={activityClientId} className="input"><option value="">{t('crm.select_client')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.date')} *</label><input name="activity_date" type="datetime-local" required defaultValue={activityDate || new Date().toISOString().slice(0,16)} className="input"/></div></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.name')} *</label><input name="title" required className="input" placeholder={activityType==='visit'?'e.g. Quarterly nutrition review':''}/></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.description')}</label><textarea name="description" className="input min-h-[60px] resize-y"/></div>
          {(activityType==='visit'||activityType==='sample_collection')&&(<div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.location')}</label><input name="visit_location" className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('crm.duration_min')}</label><input name="visit_duration_min" type="number" className="input" placeholder="120"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('crm.travel_km')}</label><input name="travel_km" type="number" step="0.1" className="input" placeholder="85"/></div></div>)}
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('crm.observations')}</label><textarea name="observations" className="input min-h-[50px] resize-y"/></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('crm.recommendations')}</label><textarea name="recommendations" className="input min-h-[50px] resize-y"/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('crm.follow_up_date')}</label><input name="follow_up_date" type="date" className="input"/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('crm.follow_up_notes')}</label><input name="follow_up_notes" className="input"/></div></div>
          <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.status')}</label><select name="status" className="input"><option value="completed">{t('crm.completed')}</option><option value="planned">{t('crm.planned')}</option></select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('sidebar.formulas')}</label><select name="formula_id" className="input"><option value="">{t('common.none')}</option>{formulas.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Tags</label><input name="tags" className="input" placeholder="audit, seasonal"/></div></div>
          <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer"><input name="billable" type="checkbox" className="rounded"/> {t('crm.billable')}</label><div className="flex items-center gap-1"><label className="text-xs text-text-muted">{t('crm.amount')} $</label><input name="amount" type="number" step="0.01" className="input w-24 text-sm" placeholder="250"/></div></div>
          <div className="flex gap-2 mt-2"><button type="button" onClick={()=>setShowAddActivity(false)} className="btn btn-ghost flex-1 justify-center">{t('common.cancel')}</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?t('common.saving'):t('crm.log_activity')}</button></div>
        </form>
      </div></div>)}

      {/* ── ADD TASK MODAL ─────────────────────────────── */}
      {showAddTask&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddTask(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">{t('crm.add_task')}</h2><button onClick={()=>setShowAddTask(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <form onSubmit={handleAddTask} className="flex flex-col gap-3">
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('crm.tasks')} *</label><input name="title" required className="input"/></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.description')}</label><textarea name="description" className="input min-h-[50px] resize-y"/></div>
          <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('sidebar.clients')}</label><select name="client_id" className="input"><option value="">{t('crm.general')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">Priority</label><select name="priority" defaultValue="medium" className="input"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.date')}</label><input name="due_date" type="date" className="input"/></div></div>
          <div className="flex gap-2 mt-1"><button type="button" onClick={()=>setShowAddTask(false)} className="btn btn-ghost flex-1 justify-center">{t('common.cancel')}</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?t('common.saving'):t('crm.add_task')}</button></div>
        </form>
      </div></div>)}

      {/* ── ADD DOCUMENT MODAL ────────────────────────── */}
      {showAddDoc&&(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddDoc(false)}><div className="bg-surface-card rounded-xl border border-border w-full max-w-md p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-text">{t('crm.add_document')}</h2><button onClick={()=>setShowAddDoc(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18}/></button></div>
        <form onSubmit={handleAddDoc} className="flex flex-col gap-3">
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.name')} *</label><input name="title" required className="input"/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.type')} *</label><select name="doc_type" required className="input">{DOC_TYPES.map(dt=><option key={dt} value={dt}>{dt.replace(/_/g,' ')}</option>)}</select></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('sidebar.clients')}</label><select name="client_id" className="input"><option value="">{t('crm.general')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
          <div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.description')}</label><textarea name="description" className="input min-h-[50px] resize-y"/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-text-muted block mb-1">Link / URL</label><input name="file_url" type="url" className="input" placeholder="https://..."/></div><div><label className="text-xs font-semibold text-text-muted block mb-1">{t('common.date')}</label><input name="doc_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input"/></div></div>
          <div className="flex gap-2 mt-1"><button type="button" onClick={()=>setShowAddDoc(false)} className="btn btn-ghost flex-1 justify-center">{t('common.cancel')}</button><button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?t('common.saving'):t('crm.add_document')}</button></div>
        </form>
      </div></div>)}
    </div>
  )
}
