'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquarePlus, ThumbsUp, ThumbsDown, Lightbulb, Bug, HelpCircle, Rocket,
  Users, FlaskConical, Megaphone, ChevronUp, Send, X, Copy, Globe, Eye, EyeOff,
  CheckCircle, Clock, XCircle, ArrowUpRight, Sparkles, Filter
} from 'lucide-react'

type PostType = 'feature_request' | 'bug' | 'idea' | 'question'
type PostStatus = 'open' | 'planned' | 'in_progress' | 'completed' | 'declined'

const POST_TYPES: { key: PostType; label: string; icon: any; color: string }[] = [
  { key: 'feature_request', label: 'Feature Request', icon: Rocket, color: 'text-brand' },
  { key: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-status-amber' },
  { key: 'bug', label: 'Bug Report', icon: Bug, color: 'text-status-red' },
  { key: 'question', label: 'Question', icon: HelpCircle, color: 'text-status-blue' },
]

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; icon: any }> = {
  open: { label: 'Open', color: 'bg-white/10 text-text-muted', icon: Clock },
  planned: { label: 'Planned', color: 'bg-status-blue/15 text-status-blue', icon: ArrowUpRight },
  in_progress: { label: 'In Progress', color: 'bg-status-amber/15 text-status-amber', icon: Clock },
  completed: { label: 'Completed', color: 'bg-brand/15 text-brand', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-status-red/10 text-text-ghost', icon: XCircle },
}

const SPECIES_LABELS: Record<string, string> = {
  cattle: 'Dairy', dairy: 'Dairy', beef: 'Beef', sheep: 'Sheep', pig: 'Pigs', poultry: 'Poultry',
}

export default function CommunityPage() {
  const [tab, setTab] = useState<'feedback' | 'templates' | 'ai' | 'directory' | 'news'>('feedback')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [userCompany, setUserCompany] = useState('')
  const [userSpecies, setUserSpecies] = useState<string[]>([])

  // Feedback
  const [posts, setPosts] = useState<any[]>([])
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<string>('all')
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostType, setNewPostType] = useState<PostType>('feature_request')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostDesc, setNewPostDesc] = useState('')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')

  // Templates
  const [templates, setTemplates] = useState<any[]>([])
  const [showShareTemplate, setShowShareTemplate] = useState(false)
  const [myFormulas, setMyFormulas] = useState<any[]>([])
  const [selectedFormulaId, setSelectedFormulaId] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templateTags, setTemplateTags] = useState('')

  // AI Feedback
  const [aiFeedback, setAiFeedback] = useState<any[]>([])
  const [aiStats, setAiStats] = useState({ total: 0, helpful: 0, notHelpful: 0 })

  // Directory
  const [profiles, setProfiles] = useState<any[]>([])
  const [myPublicProfile, setMyPublicProfile] = useState(false)
  const [myBio, setMyBio] = useState('')
  const [myYears, setMyYears] = useState<number | null>(null)
  const [mySpecialties, setMySpecialties] = useState<string[]>([])

  // Announcements
  const [announcements, setAnnouncements] = useState<any[]>([])

  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    if (profile) {
      setUserName(profile.full_name || '')
      setUserCompany(profile.company || '')
      setUserSpecies(profile.species || [])
      setMyPublicProfile(profile.public_profile || false)
      setMyBio(profile.bio || '')
      setMyYears(profile.years_experience)
      setMySpecialties(profile.specialties || [])
    }

    // Feedback posts
    const { data: p } = await supabase.from('community_posts').select('*').order('is_pinned', { ascending: false }).order('vote_count', { ascending: false }).order('created_at', { ascending: false })
    setPosts(p || [])

    // My votes
    const { data: v } = await supabase.from('community_votes').select('post_id').eq('user_id', user.id)
    setMyVotes(new Set((v || []).map((x: any) => x.post_id)))

    // Templates
    const { data: t } = await supabase.from('formula_templates').select('*').eq('is_approved', true).order('clone_count', { ascending: false })
    setTemplates(t || [])

    // My formulas (for sharing)
    const { data: f } = await supabase.from('formulas').select('id, name, species, production_stage, breed, batch_size_kg').eq('nutritionist_id', user.id).not('status', 'eq', 'archived').order('name')
    setMyFormulas(f || [])

    // AI Feedback stats
    const { data: af } = await supabase.from('ai_feedback').select('*').order('created_at', { ascending: false }).limit(50)
    setAiFeedback(af || [])
    const helpful = (af || []).filter((x: any) => x.rating === 'helpful').length
    setAiStats({ total: (af || []).length, helpful, notHelpful: (af || []).length - helpful })

    // Public profiles
    const { data: pr } = await supabase.from('user_profiles').select('id, full_name, company, country, species, bio, years_experience, specialties, public_profile').eq('public_profile', true).order('full_name')
    setProfiles(pr || [])

    // Announcements
    const { data: a } = await supabase.from('announcements').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    setAnnouncements(a || [])
  }

  // ── FEEDBACK ACTIONS ───────────────────────

  async function submitPost() {
    if (!newPostTitle.trim() || !newPostDesc.trim()) return
    setSaving(true)
    const supabase = await getSupabase()
    await supabase.from('community_posts').insert({
      user_id: userId, type: newPostType,
      title: newPostTitle.trim(), description: newPostDesc.trim(),
    })
    setNewPostTitle(''); setNewPostDesc(''); setShowNewPost(false)
    setSaving(false)
    loadData()
  }

  async function toggleVote(postId: string) {
    const supabase = await getSupabase()
    if (myVotes.has(postId)) {
      await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', userId)
      await supabase.rpc('decrement_vote', { post_id: postId }).catch(() => {
        // Fallback if RPC doesn't exist
        supabase.from('community_posts').update({ vote_count: Math.max(0, (posts.find(p => p.id === postId)?.vote_count || 1) - 1) }).eq('id', postId)
      })
    } else {
      await supabase.from('community_votes').insert({ post_id: postId, user_id: userId })
      await supabase.rpc('increment_vote', { post_id: postId }).catch(() => {
        supabase.from('community_posts').update({ vote_count: (posts.find(p => p.id === postId)?.vote_count || 0) + 1 }).eq('id', postId)
      })
    }
    loadData()
  }

  async function loadComments(postId: string) {
    const supabase = await getSupabase()
    const { data } = await supabase.from('community_comments').select('*').eq('post_id', postId).order('created_at')
    setComments(data || [])
    setExpandedPost(postId)
  }

  async function submitComment(postId: string) {
    if (!newComment.trim()) return
    setSaving(true)
    const supabase = await getSupabase()
    await supabase.from('community_comments').insert({
      post_id: postId, user_id: userId, user_name: userName, content: newComment.trim(),
    })
    await supabase.from('community_posts').update({
      comment_count: (posts.find(p => p.id === postId)?.comment_count || 0) + 1
    }).eq('id', postId)
    setNewComment('')
    setSaving(false)
    loadComments(postId)
  }

  // ── TEMPLATE ACTIONS ───────────────────────

  async function shareTemplate() {
    if (!selectedFormulaId) return
    setSaving(true)
    const supabase = await getSupabase()
    const formula = myFormulas.find(f => f.id === selectedFormulaId)
    if (!formula) { setSaving(false); return }

    // Get formula ingredients
    const { data: ings } = await supabase.from('formula_ingredients').select('ingredient_id, inclusion_pct, cost_per_tonne, ingredient:ingredients(name, category)').eq('formula_id', selectedFormulaId)

    const ingredients = (ings || []).map((i: any) => ({
      name: i.ingredient?.name, category: i.ingredient?.category,
      ingredient_id: i.ingredient_id, inclusion_pct: i.inclusion_pct,
    }))

    await supabase.from('formula_templates').insert({
      author_id: userId, author_name: userName,
      name: formula.name, description: templateDesc.trim() || null,
      species: formula.species, production_stage: formula.production_stage,
      breed: formula.breed, batch_size_kg: formula.batch_size_kg,
      ingredients,
      tags: templateTags ? templateTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    })

    setSelectedFormulaId(''); setTemplateDesc(''); setTemplateTags(''); setShowShareTemplate(false)
    setSaving(false)
    loadData()
  }

  async function cloneTemplate(template: any) {
    setSaving(true)
    const supabase = await getSupabase()

    // Create formula from template
    const { data: formula } = await supabase.from('formulas').insert({
      nutritionist_id: userId, name: `${template.name} (community)`,
      species: template.species, production_stage: template.production_stage || 'general',
      breed: template.breed, batch_size_kg: template.batch_size_kg || 1000,
      status: 'draft', version: 1,
      notes: `Cloned from community template by ${template.author_name || 'anonymous'}.`,
    }).select('id').single()

    if (formula && template.ingredients?.length > 0) {
      const ingInserts = template.ingredients.filter((i: any) => i.ingredient_id).map((i: any) => ({
        formula_id: formula.id, ingredient_id: i.ingredient_id,
        inclusion_pct: i.inclusion_pct || 0, locked: false,
      }))
      if (ingInserts.length > 0) {
        await supabase.from('formula_ingredients').insert(ingInserts)
      }
    }

    // Increment clone count
    await supabase.from('formula_templates').update({ clone_count: (template.clone_count || 0) + 1 }).eq('id', template.id)

    setSaving(false)
    alert('Template cloned to your formulas as a draft!')
    loadData()
  }

  // ── DIRECTORY ACTIONS ──────────────────────

  async function togglePublicProfile() {
    const supabase = await getSupabase()
    const newVal = !myPublicProfile
    await supabase.from('user_profiles').update({ public_profile: newVal }).eq('id', userId)
    setMyPublicProfile(newVal)
    loadData()
  }

  async function saveProfileDetails() {
    setSaving(true)
    const supabase = await getSupabase()
    await supabase.from('user_profiles').update({
      bio: myBio.trim() || null,
      years_experience: myYears,
      specialties: mySpecialties,
    }).eq('id', userId)
    setSaving(false)
    loadData()
  }

  // ── HELPERS ────────────────────────────────

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  const filteredPosts = filterType === 'all' ? posts : posts.filter(p => p.type === filterType)

  const TABS = [
    { key: 'feedback', label: 'Feedback Board', icon: MessageSquarePlus, count: posts.length },
    { key: 'templates', label: 'Templates', icon: FlaskConical, count: templates.length },
    { key: 'ai', label: 'AI Feedback', icon: Sparkles, count: aiStats.total },
    { key: 'directory', label: 'Directory', icon: Users, count: profiles.length },
    { key: 'news', label: 'News', icon: Megaphone, count: announcements.length },
  ]

  return (
    <div className="p-7 max-w-[1100px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Community</h1>
        <p className="text-base text-text-faint mt-1">Connect with fellow nutritionists, share knowledge, and help shape the platform.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 bg-surface-card rounded-[10px] p-[3px] border border-border w-fit mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-3.5 py-2 rounded text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-brand text-white' : 'text-text-faint hover:bg-white/5'}`}>
            <t.icon size={14} />
            {t.label}
            {t.count > 0 && <span className={`text-2xs px-1.5 py-0.5 rounded-full font-mono font-bold ${tab === t.key ? 'bg-white/20 text-white' : 'bg-white/5 text-text-ghost'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── FEEDBACK BOARD ──────────────────── */}
      {tab === 'feedback' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterType === 'all' ? 'bg-brand text-white border-brand' : 'bg-surface-deep text-text-muted border-border hover:border-brand/30'}`}>All</button>
              {POST_TYPES.map(pt => (
                <button key={pt.key} onClick={() => setFilterType(pt.key)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${filterType === pt.key ? 'bg-brand text-white border-brand' : 'bg-surface-deep text-text-muted border-border hover:border-brand/30'}`}>
                  <pt.icon size={12} /> {pt.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewPost(true)} className="btn btn-primary btn-sm"><MessageSquarePlus size={14} /> New Post</button>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="card p-12 text-center">
              <MessageSquarePlus size={32} className="text-text-ghost mx-auto mb-3" />
              <p className="text-sm text-text-ghost mb-3">No posts yet. Be the first to share feedback!</p>
              <button onClick={() => setShowNewPost(true)} className="btn btn-primary btn-sm mx-auto"><MessageSquarePlus size={14} /> New Post</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredPosts.map(post => {
                const pt = POST_TYPES.find(t => t.key === post.type)
                const st = STATUS_CONFIG[post.status as PostStatus] || STATUS_CONFIG.open
                const isExpanded = expandedPost === post.id
                const voted = myVotes.has(post.id)
                return (
                  <div key={post.id} className="card overflow-hidden">
                    <div className="flex gap-3 p-4">
                      {/* Vote column */}
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <button onClick={() => toggleVote(post.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${voted ? 'bg-brand text-white' : 'bg-surface-deep text-text-ghost hover:bg-brand/15 hover:text-brand'}`}>
                          <ChevronUp size={16} />
                        </button>
                        <span className={`text-sm font-bold font-mono ${voted ? 'text-brand' : 'text-text-muted'}`}>{post.vote_count || 0}</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {pt && <span className={`${pt.color}`}><pt.icon size={14} /></span>}
                          <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${st.color}`}>{st.label}</span>
                          <span className="text-2xs text-text-ghost">{timeAgo(post.created_at)}</span>
                          {post.is_pinned && <span className="text-2xs text-brand font-bold">📌 Pinned</span>}
                        </div>
                        <h3 className="text-sm font-bold text-text-dim mb-1 cursor-pointer hover:text-brand transition-colors"
                          onClick={() => isExpanded ? setExpandedPost(null) : loadComments(post.id)}>
                          {post.title}
                        </h3>
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{post.description}</p>
                        <button onClick={() => isExpanded ? setExpandedPost(null) : loadComments(post.id)}
                          className="text-2xs text-text-ghost hover:text-brand mt-1.5 bg-transparent border-none cursor-pointer font-semibold">
                          {post.comment_count || 0} {post.comment_count === 1 ? 'comment' : 'comments'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded comments */}
                    {isExpanded && (
                      <div className="border-t border-border bg-surface-bg px-4 py-3">
                        {comments.length > 0 ? comments.map(c => (
                          <div key={c.id} className="flex gap-2 py-2 border-b border-border/5 last:border-0">
                            <div className="w-6 h-6 rounded-full bg-brand/15 flex items-center justify-center text-2xs font-bold text-brand flex-shrink-0">{(c.user_name || '?')[0]}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-text-dim">{c.user_name || 'Anonymous'}</span>
                                {c.is_admin && <span className="text-2xs px-1 py-0.5 rounded bg-brand/15 text-brand font-bold">TEAM</span>}
                                <span className="text-2xs text-text-ghost">{timeAgo(c.created_at)}</span>
                              </div>
                              <p className="text-xs text-text-muted mt-0.5">{c.content}</p>
                            </div>
                          </div>
                        )) : <p className="text-xs text-text-ghost py-2">No comments yet.</p>}
                        <div className="flex gap-2 mt-2">
                          <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." className="input flex-1 text-xs" onKeyDown={e => e.key === 'Enter' && submitComment(post.id)} />
                          <button onClick={() => submitComment(post.id)} disabled={saving || !newComment.trim()} className="btn btn-primary btn-sm"><Send size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* New Post Modal */}
          {showNewPost && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewPost(false)}>
              <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-text">New Post</h2>
                  <button onClick={() => setShowNewPost(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1.5">Type</label>
                    <div className="flex gap-1.5">
                      {POST_TYPES.map(pt => (
                        <button key={pt.key} onClick={() => setNewPostType(pt.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${newPostType === pt.key ? 'bg-brand text-white border-brand' : 'bg-surface-deep text-text-muted border-border'}`}>
                          <pt.icon size={12} /> {pt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Title *</label>
                    <input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} className="input" placeholder="Short, descriptive title" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Description *</label>
                    <textarea value={newPostDesc} onChange={e => setNewPostDesc(e.target.value)} className="input" rows={4} placeholder="Describe your idea, bug, or question in detail..." />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowNewPost(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                  <button onClick={submitPost} disabled={saving || !newPostTitle.trim() || !newPostDesc.trim()} className="btn btn-primary flex-1 justify-center disabled:opacity-50">
                    {saving ? 'Posting...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── FORMULA TEMPLATES ──────────────── */}
      {tab === 'templates' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-text-faint">Formula templates shared by the community. Clone any template to use as a starting point.</p>
            <button onClick={() => setShowShareTemplate(true)} className="btn btn-primary btn-sm"><FlaskConical size={14} /> Share Template</button>
          </div>

          {templates.length === 0 ? (
            <div className="card p-12 text-center">
              <FlaskConical size={32} className="text-text-ghost mx-auto mb-3" />
              <p className="text-sm text-text-ghost mb-3">No templates shared yet. Be the first to share a formula!</p>
              <button onClick={() => setShowShareTemplate(true)} className="btn btn-primary btn-sm mx-auto"><FlaskConical size={14} /> Share Template</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {templates.map(t => (
                <div key={t.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-text-dim">{t.name}</h3>
                      <div className="text-2xs text-text-ghost mt-0.5">{t.author_name || 'Anonymous'} · {timeAgo(t.created_at)}</div>
                    </div>
                    <span className="text-2xs px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold whitespace-nowrap">{SPECIES_LABELS[t.species] || t.species}</span>
                  </div>
                  {t.description && <p className="text-xs text-text-muted mb-2 line-clamp-2">{t.description}</p>}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {(t.tags || []).map((tag: string, i: number) => (
                      <span key={i} className="text-2xs px-2 py-0.5 rounded bg-surface-bg text-text-ghost font-mono">#{tag}</span>
                    ))}
                    <span className="text-2xs px-2 py-0.5 rounded bg-surface-bg text-text-ghost font-mono">{(t.ingredients || []).length} ingredients</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xs text-text-ghost font-mono"><Copy size={10} className="inline mr-1" />{t.clone_count || 0} cloned</span>
                    <button onClick={() => cloneTemplate(t)} disabled={saving} className="btn btn-ghost btn-sm text-brand"><Copy size={12} /> Clone to My Formulas</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Share Template Modal */}
          {showShareTemplate && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowShareTemplate(false)}>
              <div className="bg-surface-card rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-text">Share Formula as Template</h2>
                  <button onClick={() => setShowShareTemplate(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Select Formula *</label>
                    <select value={selectedFormulaId} onChange={e => setSelectedFormulaId(e.target.value)} className="input">
                      <option value="">Choose a formula...</option>
                      {myFormulas.map(f => <option key={f.id} value={f.id}>{f.name} — {SPECIES_LABELS[f.species] || f.species}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Description (optional)</label>
                    <textarea value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} className="input" rows={2} placeholder="Any notes about this formula..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Tags (optional, comma-separated)</label>
                    <input value={templateTags} onChange={e => setTemplateTags(e.target.value)} className="input" placeholder="e.g. TMR, high-production, pasture-based" />
                  </div>
                  <p className="text-2xs text-text-ghost">Your formula name, ingredients, and inclusion percentages will be visible to other users. Cost data is NOT shared.</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowShareTemplate(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                  <button onClick={shareTemplate} disabled={saving || !selectedFormulaId} className="btn btn-primary flex-1 justify-center disabled:opacity-50">
                    {saving ? 'Sharing...' : 'Share Template'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── AI FEEDBACK ────────────────────── */}
      {tab === 'ai' && (
        <>
          <div className="grid grid-cols-3 gap-3.5 mb-6">
            <div className="stat-card">
              <div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">Total Reviews Rated</div>
              <div className="text-2xl font-bold font-mono text-brand">{aiStats.total}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">Helpful</div>
              <div className="text-2xl font-bold font-mono text-status-green flex items-center gap-2"><ThumbsUp size={18} /> {aiStats.helpful}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs font-semibold text-text-faint uppercase tracking-wider mb-1">Needs Improvement</div>
              <div className="text-2xl font-bold font-mono text-status-amber flex items-center gap-2"><ThumbsDown size={18} /> {aiStats.notHelpful}</div>
            </div>
          </div>

          <div className="card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-brand" />
              <span className="text-sm font-bold text-text-dim">How AI Feedback works</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              When you view an AI review on any formula, use the 👍 / 👎 buttons to rate whether the analysis was helpful.
              Your feedback is anonymous and helps us train better recommendations for the entire community.
              Add optional comments to explain what was good or what needs improving.
            </p>
          </div>

          {aiFeedback.length > 0 ? (
            <>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                Recent Community Feedback<span className="flex-1 h-px bg-border" />
              </div>
              <div className="flex flex-col gap-2">
                {aiFeedback.map(f => (
                  <div key={f.id} className="card p-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.rating === 'helpful' ? 'bg-brand/15' : 'bg-status-amber/15'}`}>
                      {f.rating === 'helpful' ? <ThumbsUp size={14} className="text-brand" /> : <ThumbsDown size={14} className="text-status-amber" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-dim">{f.formula_name || 'Formula review'}</span>
                        <span className="text-2xs text-text-ghost">{timeAgo(f.created_at)}</span>
                      </div>
                      {f.comment && <p className="text-xs text-text-muted mt-0.5">{f.comment}</p>}
                      {f.review_snippet && <p className="text-2xs text-text-ghost mt-1 italic line-clamp-1">&ldquo;{f.review_snippet}&rdquo;</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card p-8 text-center">
              <Sparkles size={32} className="text-text-ghost mx-auto mb-3" />
              <p className="text-sm text-text-ghost">No AI feedback yet. Rate your next formula review to get started!</p>
            </div>
          )}
        </>
      )}

      {/* ── PROFESSIONAL DIRECTORY ──────────── */}
      {tab === 'directory' && (
        <>
          {/* My profile visibility */}
          <div className="card p-4 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe size={18} className={myPublicProfile ? 'text-brand' : 'text-text-ghost'} />
                <div>
                  <div className="text-sm font-bold text-text-dim">Your public profile</div>
                  <div className="text-2xs text-text-ghost">{myPublicProfile ? 'Visible to other Optia Feed users' : 'Hidden — only you can see your profile'}</div>
                </div>
              </div>
              <button onClick={togglePublicProfile} className={`relative w-12 h-6 rounded-full transition-colors ${myPublicProfile ? 'bg-brand' : 'bg-surface-deep border border-border'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${myPublicProfile ? 'left-[26px]' : 'left-0.5'}`} />
              </button>
            </div>

            {myPublicProfile && (
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Bio</label>
                  <textarea value={myBio} onChange={e => setMyBio(e.target.value)} className="input text-xs" rows={2} placeholder="Brief description of your practice..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Years of experience</label>
                    <input type="number" value={myYears ?? ''} onChange={e => setMyYears(e.target.value ? parseInt(e.target.value) : null)} className="input" placeholder="e.g. 15" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Specialties</label>
                    <input value={mySpecialties.join(', ')} onChange={e => setMySpecialties(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="input" placeholder="e.g. dairy, feedlot, TMR" />
                  </div>
                </div>
                <button onClick={saveProfileDetails} disabled={saving} className="btn btn-primary btn-sm w-fit">{saving ? 'Saving...' : 'Save Profile'}</button>
              </div>
            )}
          </div>

          {/* Directory list */}
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            {profiles.length} Professionals<span className="flex-1 h-px bg-border" />
          </div>

          {profiles.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {profiles.map(p => (
                <div key={p.id} className={`card p-4 ${p.id === userId ? 'border-brand/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-sm font-bold text-brand flex-shrink-0">
                      {(p.full_name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-text-dim">{p.full_name}{p.id === userId ? ' (you)' : ''}</div>
                      <div className="text-2xs text-text-ghost">{p.company || '—'} · {p.country || '—'}</div>
                      {p.bio && <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{p.bio}</p>}
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {(p.species || []).map((sp: string) => (
                          <span key={sp} className="text-2xs px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold">{SPECIES_LABELS[sp] || sp}</span>
                        ))}
                        {p.years_experience && <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-bg text-text-ghost font-mono">{p.years_experience}y exp</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Users size={32} className="text-text-ghost mx-auto mb-3" />
              <p className="text-sm text-text-ghost">No public profiles yet. Toggle yours on to be the first!</p>
            </div>
          )}
        </>
      )}

      {/* ── ANNOUNCEMENTS ──────────────────── */}
      {tab === 'news' && (
        <>
          {announcements.length > 0 ? (
            <div className="flex flex-col gap-3">
              {announcements.map(a => {
                const typeConfig: Record<string, { label: string; color: string }> = {
                  feature: { label: 'New Feature', color: 'bg-brand/15 text-brand' },
                  improvement: { label: 'Improvement', color: 'bg-status-blue/15 text-status-blue' },
                  fix: { label: 'Fix', color: 'bg-status-amber/15 text-status-amber' },
                  announcement: { label: 'Announcement', color: 'bg-white/10 text-text-muted' },
                }
                const tc = typeConfig[a.type] || typeConfig.announcement
                return (
                  <div key={a.id} className={`card p-5 ${a.is_pinned ? 'border-brand/25' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {a.is_pinned && <span className="text-brand text-xs">📌</span>}
                      <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${tc.color}`}>{tc.label}</span>
                      <span className="text-2xs text-text-ghost">{new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <h3 className="text-base font-bold text-text-dim mb-1.5">{a.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{a.content}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Megaphone size={32} className="text-text-ghost mx-auto mb-3" />
              <p className="text-sm text-text-ghost">No announcements yet. Stay tuned!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
