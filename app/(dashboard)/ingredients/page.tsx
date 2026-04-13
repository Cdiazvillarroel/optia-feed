'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, X, Edit2, Trash2, DollarSign } from 'lucide-react'

const CATEGORIES = ['all','energy','protein','forage','mineral','byproduct','additive','vitamin']
const SPECIES_LIST = ['cattle','beef','pig','poultry','sheep']
const CAT_COLORS: Record<string,string> = {
  energy:'bg-status-amber/10 text-status-amber',protein:'bg-status-coral/10 text-status-coral',
  forage:'bg-brand/10 text-brand',mineral:'bg-status-blue/10 text-status-blue',
  byproduct:'bg-status-purple/10 text-status-purple',additive:'bg-white/5 text-text-muted',vitamin:'bg-brand/10 text-brand'
}
const SP_COLORS: Record<string,string> = {
  cattle:'bg-species-cattle/10 text-species-cattle',beef:'bg-status-amber/10 text-status-amber',
  pig:'bg-species-pig/10 text-species-pig',poultry:'bg-species-poultry/10 text-species-poultry',
  sheep:'bg-species-sheep/10 text-species-sheep'
}
const SP_LABELS: Record<string,string> = {cattle:'C',beef:'B',pig:'P',poultry:'Pk',sheep:'S'}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<any[]>([])
  const [prices, setPrices] = useState<Record<string,number>>({})
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [speciesFilter, setSpeciesFilter] = useState<string|null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showPrice, setShowPrice] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [addSpecies, setAddSpecies] = useState<string[]>([])
  const [editSpecies, setEditSpecies] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string|null>(null)

  useEffect(() => { loadData() }, [])

  async function getSupabase() {
    const { createClient } = await import('@/lib/supabase/client')
    return createClient()
  }

  async function loadData() {
    const supabase = await getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)
    const { data: ings } = await supabase
      .from('ingredients')
      .select('*')
      .or(`nutritionist_id.is.null${user ? ',nutritionist_id.eq.' + user.id : ''}`)
      .order('name')
    setIngredients(ings || [])
    // Load latest prices
    if (user) {
      const { data: priceData } = await supabase
        .from('ingredient_prices')
        .select('ingredient_id, price_per_tonne')
        .eq('nutritionist_id', user.id)
        .order('effective_date', { ascending: false })
      const priceMap: Record<string,number> = {}
      priceData?.forEach((p: any) => { if (!priceMap[p.ingredient_id]) priceMap[p.ingredient_id] = p.price_per_tonne })
      setPrices(priceMap)
    }
  }

  const filtered = ingredients.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || i.category === category
    const matchSpecies = !speciesFilter || (i.species_suitable as string[])?.includes(speciesFilter)
    return matchSearch && matchCat && matchSpecies
  })

  function openDetail(ing: any) { setSelected(ing); setShowDetail(true) }
  function openPrice(ing: any) { setSelected(ing); setShowPrice(true) }
  function openEdit(ing: any) { setSelected(ing); setEditSpecies(ing.species_suitable || []); setShowEdit(true) }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const f = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    const { error } = await supabase.from('ingredients').insert({
      nutritionist_id: userId,
      name: f.get('name') as string,
      category: f.get('category') as string,
      species_suitable: addSpecies,
      dm_pct: parseFloat(f.get('dm_pct') as string) || null,
      cp_pct: parseFloat(f.get('cp_pct') as string) || null,
      me_mj: parseFloat(f.get('me_mj') as string) || null,
      de_mj: parseFloat(f.get('de_mj') as string) || null,
      ndf_pct: parseFloat(f.get('ndf_pct') as string) || null,
      adf_pct: parseFloat(f.get('adf_pct') as string) || null,
      ee_pct: parseFloat(f.get('ee_pct') as string) || null,
      starch_pct: parseFloat(f.get('starch_pct') as string) || null,
      ca_pct: parseFloat(f.get('ca_pct') as string) || null,
      p_pct: parseFloat(f.get('p_pct') as string) || null,
      mg_pct: parseFloat(f.get('mg_pct') as string) || null,
      na_pct: parseFloat(f.get('na_pct') as string) || null,
      k_pct: parseFloat(f.get('k_pct') as string) || null,
      s_pct: parseFloat(f.get('s_pct') as string) || null,
      lysine_pct: parseFloat(f.get('lysine_pct') as string) || null,
      methionine_pct: parseFloat(f.get('methionine_pct') as string) || null,
      threonine_pct: parseFloat(f.get('threonine_pct') as string) || null,
      max_inclusion_pct: parseFloat(f.get('max_inclusion_pct') as string) || null,
      anti_nutritional_notes: f.get('anti_nutritional_notes') as string || null,
      source: 'Custom',
    })
    setLoading(false)
    if (!error) { setShowAdd(false); setAddSpecies([]); loadData() }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    const f = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    await supabase.from('ingredients').update({
      name: f.get('name') as string,
      category: f.get('category') as string,
      species_suitable: editSpecies,
      dm_pct: parseFloat(f.get('dm_pct') as string) || null,
      cp_pct: parseFloat(f.get('cp_pct') as string) || null,
      me_mj: parseFloat(f.get('me_mj') as string) || null,
      de_mj: parseFloat(f.get('de_mj') as string) || null,
      ndf_pct: parseFloat(f.get('ndf_pct') as string) || null,
      adf_pct: parseFloat(f.get('adf_pct') as string) || null,
      ee_pct: parseFloat(f.get('ee_pct') as string) || null,
      ca_pct: parseFloat(f.get('ca_pct') as string) || null,
      p_pct: parseFloat(f.get('p_pct') as string) || null,
      lysine_pct: parseFloat(f.get('lysine_pct') as string) || null,
      methionine_pct: parseFloat(f.get('methionine_pct') as string) || null,
      threonine_pct: parseFloat(f.get('threonine_pct') as string) || null,
      max_inclusion_pct: parseFloat(f.get('max_inclusion_pct') as string) || null,
      anti_nutritional_notes: f.get('anti_nutritional_notes') as string || null,
    }).eq('id', selected.id)
    setLoading(false)
    setShowEdit(false)
    loadData()
  }

  async function handleAddPrice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected || !userId) return
    setLoading(true)
    const f = new FormData(e.currentTarget)
    const supabase = await getSupabase()
    await supabase.from('ingredient_prices').insert({
      ingredient_id: selected.id,
      nutritionist_id: userId,
      price_per_tonne: parseFloat(f.get('price') as string),
      supplier: f.get('supplier') as string || null,
      effective_date: f.get('date') as string || new Date().toISOString().split('T')[0],
      currency: 'AUD',
    })
    setLoading(false)
    setShowPrice(false)
    loadData()
  }

  async function handleDelete(id: string) {
    const supabase = await getSupabase()
    await supabase.from('ingredients').delete().eq('id', id)
    setShowDetail(false)
    loadData()
  }

  const n = (v: number|null, d: number = 1) => v != null ? v.toFixed(d) : '\u2014'

  return (
    <div className="p-7 max-w-[1400px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text">Ingredient Database</h1>
          <p className="text-base text-text-faint mt-0.5">{ingredients.length} ingredients \u00B7 {Object.keys(prices).length} priced</p>
        </div>
        <button onClick={() => { setAddSpecies([]); setShowAdd(true) }} className="btn btn-primary"><Plus size={14} /> Add Ingredient</button>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2.5 mb-2 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ingredients..." className="input pl-9" />
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`filter-pill ${category===c?'active':''}`}>{c}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-1 mb-4">
        <span className="text-2xs text-text-ghost font-semibold uppercase tracking-wider mr-2 self-center">Species:</span>
        <button onClick={() => setSpeciesFilter(null)} className={`filter-pill ${!speciesFilter?'active':''}`}>All</button>
        {SPECIES_LIST.map((sp) => (
          <button key={sp} onClick={() => setSpeciesFilter(speciesFilter===sp?null:sp)} className={`filter-pill ${speciesFilter===sp?'active':''}`}>{sp}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {['Ingredient','Cat','DM%','CP%','ME','NDF%','EE%','Ca%','P%','Lys%','$/t','Species',''].map((h,i) => (
                <th key={h+i} className={`px-2.5 py-2.5 text-2xs font-bold text-text-ghost uppercase tracking-wider whitespace-nowrap ${i===0?'text-left':'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ing) => {
              const price = prices[ing.id]
              const isCustom = ing.nutritionist_id !== null
              return (
                <tr key={ing.id} className="border-b border-border/5 hover:bg-[#253442] transition-colors cursor-pointer" onClick={() => openDetail(ing)}>
                  <td className="px-2.5 py-2 text-sm font-semibold text-text-dim">
                    <div className="flex items-center gap-2">
                      {ing.name}
                      {isCustom && <span className="text-2xs px-1 py-0 rounded bg-status-purple/15 text-status-purple font-mono">CUSTOM</span>}
                    </div>
                  </td>
                  <td className="px-2.5 py-2 text-right"><span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${CAT_COLORS[ing.category]||'bg-white/5 text-text-ghost'}`}>{(ing.category||'').slice(0,3)}</span></td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.dm_pct)}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.cp_pct)}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.me_mj)}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.ndf_pct)}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.ee_pct)}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.ca_pct,2)}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.p_pct,2)}</td>
                  <td className="px-2.5 py-2 text-sm text-text-muted text-right font-mono">{n(ing.lysine_pct,2)}</td>
                  <td className="px-2.5 py-2 text-sm text-right font-mono font-semibold text-status-amber">{price ? '$'+price.toFixed(0) : '\u2014'}</td>
                  <td className="px-2.5 py-2 text-right">
                    <div className="flex gap-0.5 justify-end">
                      {(ing.species_suitable as string[]||[]).map((s) => (
                        <span key={s} className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded text-2xs font-bold font-mono ${SP_COLORS[s]||''}`}>{SP_LABELS[s]||s[0]}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    <button onClick={(e) => { e.stopPropagation(); openPrice(ing) }} className="text-text-ghost hover:text-status-amber transition-colors bg-transparent border-none cursor-pointer" title="Set price">
                      <DollarSign size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="px-4 py-12 text-center text-sm text-text-ghost">No ingredients match your filters.</div>}
      </div>
      <div className="mt-2 text-xs text-text-ghost">{filtered.length} ingredient{filtered.length!==1?'s':''}</div>

      {/* ── DETAIL MODAL ─────────────────────────────────── */}
      {showDetail && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-text">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xs px-1.5 py-0.5 rounded font-bold font-mono uppercase ${CAT_COLORS[selected.category]||''}`}>{selected.category}</span>
                  {selected.source && <span className="text-2xs text-text-ghost">Source: {selected.source}</span>}
                  {selected.nutritionist_id && <span className="text-2xs px-1 py-0 rounded bg-status-purple/15 text-status-purple font-mono">CUSTOM</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {selected.nutritionist_id && <>
                  <button onClick={() => { setShowDetail(false); openEdit(selected) }} className="btn btn-ghost btn-sm"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(selected.id)} className="btn btn-ghost btn-sm text-status-red"><Trash2 size={14} /></button>
                </>}
                <button onClick={() => setShowDetail(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
              </div>
            </div>
            {/* Species */}
            <div className="flex gap-1.5 mb-4">
              {(selected.species_suitable as string[]||[]).map((s) => (
                <span key={s} className={`text-xs px-2.5 py-1 rounded font-semibold capitalize ${SP_COLORS[s]||''}`}>{s}</span>
              ))}
            </div>
            {/* Price */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-surface-bg">
              <span className="text-xs font-semibold text-text-ghost uppercase">Current Price:</span>
              <span className="text-lg font-bold font-mono text-status-amber">{prices[selected.id] ? '$'+prices[selected.id].toFixed(0)+'/t' : 'Not set'}</span>
              <button onClick={() => { setShowDetail(false); openPrice(selected) }} className="btn btn-ghost btn-sm ml-auto"><DollarSign size={14} /> Update Price</button>
            </div>
            {/* Nutrient profile */}
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Proximate Analysis</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[['DM',selected.dm_pct,'%'],['CP',selected.cp_pct,'%'],['ME',selected.me_mj,'MJ/kg'],['DE',selected.de_mj,'MJ/kg'],['NDF',selected.ndf_pct,'%'],['ADF',selected.adf_pct,'%'],['EE (Fat)',selected.ee_pct,'%'],['CF',selected.cf_pct,'%'],['Starch',selected.starch_pct,'%'],['Sugar',selected.sugar_pct,'%'],['Ash',selected.ash_pct,'%']].map(([l,v,u]) => (
                <div key={l as string} className="bg-surface-bg rounded-md p-2"><div className="text-2xs text-text-ghost">{l}</div><div className="text-sm font-mono font-semibold text-text-dim">{v!=null?(v as number).toFixed(1)+' '+u:'\u2014'}</div></div>
              ))}
            </div>
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Minerals</div>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[['Ca',selected.ca_pct],['P',selected.p_pct],['Mg',selected.mg_pct],['K',selected.k_pct],['Na',selected.na_pct],['S',selected.s_pct],['Cl',selected.cl_pct]].map(([l,v]) => (
                <div key={l as string} className="bg-surface-bg rounded-md p-2"><div className="text-2xs text-text-ghost">{l} %</div><div className="text-sm font-mono font-semibold text-text-dim">{v!=null?(v as number).toFixed(3):'\u2014'}</div></div>
              ))}
            </div>
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Amino Acids</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[['Lysine',selected.lysine_pct],['Methionine',selected.methionine_pct],['Threonine',selected.threonine_pct],['Tryptophan',selected.tryptophan_pct]].map(([l,v]) => (
                <div key={l as string} className="bg-surface-bg rounded-md p-2"><div className="text-2xs text-text-ghost">{l} %</div><div className="text-sm font-mono font-semibold text-text-dim">{v!=null?(v as number).toFixed(3):'\u2014'}</div></div>
              ))}
            </div>
            {(selected.max_inclusion_pct || selected.anti_nutritional_notes) && <>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Constraints</div>
              <div className="bg-surface-bg rounded-md p-3">
                {selected.max_inclusion_pct && <div className="text-sm text-text-dim mb-1"><strong>Max inclusion:</strong> {selected.max_inclusion_pct}%</div>}
                {selected.anti_nutritional_notes && <div className="text-sm text-status-amber">{selected.anti_nutritional_notes}</div>}
              </div>
            </>}
          </div>
        </div>
      )}

      {/* ── PRICE MODAL ──────────────────────────────────── */}
      {showPrice && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPrice(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text">Set Price</h2>
              <button onClick={() => setShowPrice(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <p className="text-sm text-text-muted mb-4">{selected.name}</p>
            <form onSubmit={handleAddPrice} className="flex flex-col gap-3">
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Price (AUD/tonne) *</label><input name="price" type="number" step="0.01" required className="input" placeholder="385.00" defaultValue={prices[selected.id]||''} /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Supplier</label><input name="supplier" className="input" placeholder="e.g. Ridley AgriProducts" /></div>
              <div><label className="text-xs font-semibold text-text-muted block mb-1">Effective Date</label><input name="date" type="date" className="input" defaultValue={new Date().toISOString().split('T')[0]} /></div>
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={() => setShowPrice(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Saving...':'Save Price'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD INGREDIENT MODAL ─────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text">Add Custom Ingredient</h2>
              <button onClick={() => setShowAdd(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Name *</label><input name="name" required className="input" placeholder="e.g. Local Sorghum" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Category *</label>
                  <select name="category" required className="input">
                    {CATEGORIES.filter(c=>c!=='all').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1.5">Species Suitable</label>
                <div className="flex gap-2">{SPECIES_LIST.map(sp => (
                  <button key={sp} type="button" onClick={() => setAddSpecies(prev => prev.includes(sp)?prev.filter(s=>s!==sp):[...prev,sp])}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold capitalize cursor-pointer ${addSpecies.includes(sp)?'border-brand bg-brand/10 text-brand':'border-border text-text-faint'}`}>{sp}</button>
                ))}</div>
              </div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Proximate Analysis (% DM basis)</div>
              <div className="grid grid-cols-4 gap-2">
                {[['DM %','dm_pct'],['CP %','cp_pct'],['ME MJ/kg','me_mj'],['DE MJ/kg','de_mj'],['NDF %','ndf_pct'],['ADF %','adf_pct'],['EE (Fat) %','ee_pct'],['Starch %','starch_pct']].map(([l,k]) => (
                  <div key={k}><label className="text-2xs text-text-ghost block mb-0.5">{l}</label><input name={k} type="number" step="0.01" className="input text-sm" /></div>
                ))}
              </div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Minerals (%)</div>
              <div className="grid grid-cols-5 gap-2">
                {[['Ca','ca_pct'],['P','p_pct'],['Mg','mg_pct'],['Na','na_pct'],['K','k_pct'],['S','s_pct']].map(([l,k]) => (
                  <div key={k}><label className="text-2xs text-text-ghost block mb-0.5">{l}</label><input name={k} type="number" step="0.001" className="input text-sm" /></div>
                ))}
              </div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Amino Acids (%)</div>
              <div className="grid grid-cols-4 gap-2">
                {[['Lysine','lysine_pct'],['Methionine','methionine_pct'],['Threonine','threonine_pct']].map(([l,k]) => (
                  <div key={k}><label className="text-2xs text-text-ghost block mb-0.5">{l}</label><input name={k} type="number" step="0.001" className="input text-sm" /></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Max Inclusion %</label><input name="max_inclusion_pct" type="number" step="0.1" className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Anti-nutritional Notes</label><input name="anti_nutritional_notes" className="input" /></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Adding...':'Add Ingredient'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT INGREDIENT MODAL ────────────────────────── */}
      {showEdit && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text">Edit Ingredient</h2>
              <button onClick={() => setShowEdit(false)} className="text-text-ghost bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Name *</label><input name="name" required defaultValue={selected.name} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Category *</label>
                  <select name="category" required defaultValue={selected.category} className="input">
                    {CATEGORIES.filter(c=>c!=='all').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1.5">Species</label>
                <div className="flex gap-2">{SPECIES_LIST.map(sp => (
                  <button key={sp} type="button" onClick={() => setEditSpecies(prev => prev.includes(sp)?prev.filter(s=>s!==sp):[...prev,sp])}
                    className={`px-3 py-1.5 rounded border text-xs font-semibold capitalize cursor-pointer ${editSpecies.includes(sp)?'border-brand bg-brand/10 text-brand':'border-border text-text-faint'}`}>{sp}</button>
                ))}</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[['DM %','dm_pct'],['CP %','cp_pct'],['ME','me_mj'],['DE','de_mj'],['NDF %','ndf_pct'],['ADF %','adf_pct'],['EE %','ee_pct']].map(([l,k]) => (
                  <div key={k}><label className="text-2xs text-text-ghost block mb-0.5">{l}</label><input name={k} type="number" step="0.01" defaultValue={selected[k]||''} className="input text-sm" /></div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[['Ca','ca_pct'],['P','p_pct'],['Mg','mg_pct'],['Na','na_pct'],['K','k_pct']].map(([l,k]) => (
                  <div key={k}><label className="text-2xs text-text-ghost block mb-0.5">{l}</label><input name={k} type="number" step="0.001" defaultValue={selected[k]||''} className="input text-sm" /></div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['Lysine','lysine_pct'],['Methionine','methionine_pct'],['Threonine','threonine_pct']].map(([l,k]) => (
                  <div key={k}><label className="text-2xs text-text-ghost block mb-0.5">{l}</label><input name={k} type="number" step="0.001" defaultValue={selected[k]||''} className="input text-sm" /></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Max Inclusion %</label><input name="max_inclusion_pct" type="number" step="0.1" defaultValue={selected.max_inclusion_pct||''} className="input" /></div>
                <div><label className="text-xs font-semibold text-text-muted block mb-1">Anti-nutritional</label><input name="anti_nutritional_notes" defaultValue={selected.anti_nutritional_notes||''} className="input" /></div>
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="btn btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">{loading?'Saving...':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
