'use client'

import { useState } from 'react'
import { Sparkles, FileText, Save } from 'lucide-react'
import { useAiStore } from '@/lib/utils/store'

interface Props {
  formula: any
  requirements: any[]
  safetyRules: any[]
}

export function FormulaBuilder({ formula, requirements, safetyRules }: Props) {
  const [rightTab, setRightTab] = useState<'balance' | 'nutrients' | 'cost'>('balance')
  const [ingredients, setIngredients] = useState(formula.ingredients || [])
  const toggleAi = useAiStore((s) => s.toggle)

  // Calculate nutrient totals from formula ingredients
  const totalPct = ingredients.reduce((s: number, fi: any) => s + (fi.inclusion_pct || 0), 0)

  function calcNutrient(key: string): number {
    return ingredients.reduce((s: number, fi: any) => {
      const val = fi.ingredient?.[key] || 0
      return s + val * (fi.inclusion_pct || 0) / 100
    }, 0)
  }

  const costPerTonne = ingredients.reduce((s: number, fi: any) => {
    return s + (fi.cost_per_tonne || 0) * (fi.inclusion_pct || 0) / 100
  }, 0)

  return (
    <div className="p-7 max-w-[1400px] h-[calc(100vh-56px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text">{formula.name}</h1>
            <span className={`text-2xs px-2 py-0.5 rounded font-bold font-mono uppercase
              ${formula.status === 'draft' ? 'bg-status-amber/15 text-status-amber' :
                'bg-brand/15 text-brand'}`}>
              {formula.status}
            </span>
            <span className="text-xs text-text-ghost font-mono">v{formula.version}</span>
          </div>
          <p className="text-sm text-text-ghost mt-0.5">
            {formula.client?.name || 'Unassigned'} · {formula.species} · {formula.production_stage}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleAi} className="btn btn-ai btn-sm"><Sparkles size={14} /> AI Review</button>
          <button className="btn btn-ghost btn-sm"><FileText size={14} /> Export</button>
          <button className="btn btn-primary btn-sm"><Save size={14} /> Save</button>
        </div>
      </div>

      {/* Species/Stage selector for balance */}
      <div className="flex items-center gap-3 mb-3.5 px-3.5 py-2.5 bg-surface-card rounded-[10px] border border-border">
        <span className="text-xs font-bold text-text-ghost uppercase tracking-wider whitespace-nowrap">Balance against:</span>
        <span className="text-sm font-semibold text-text-dim capitalize">{formula.species} — {formula.production_stage}</span>
        <div className="flex-1" />
        <span className="text-sm font-mono text-text-ghost">
          {totalPct.toFixed(1)}% total
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-[1fr_340px] gap-4 flex-1 min-h-0">
        {/* Ingredients Panel */}
        <div className="card flex flex-col">
          <div className="card-header">
            <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Ingredients</span>
          </div>
          <div className="flex-1 overflow-auto">
            {ingredients.length > 0 ? ingredients.map((fi: any, idx: number) => (
              <div key={fi.id || idx} className="grid grid-cols-[1fr_80px_70px_60px] px-4 py-2.5 border-b border-border/5 items-center gap-2">
                <div>
                  <div className="text-base font-semibold text-text-dim">{fi.ingredient?.name || 'Unknown'}</div>
                  <div className="text-2xs text-text-ghost font-mono">{fi.ingredient?.category}</div>
                </div>
                <input
                  type="range" min="0" max="60" step="0.5"
                  value={fi.inclusion_pct}
                  onChange={(e) => {
                    const updated = [...ingredients]
                    updated[idx] = { ...updated[idx], inclusion_pct: parseFloat(e.target.value) }
                    setIngredients(updated)
                  }}
                />
                <input
                  type="number"
                  value={fi.inclusion_pct}
                  step="0.5"
                  onChange={(e) => {
                    const updated = [...ingredients]
                    updated[idx] = { ...updated[idx], inclusion_pct: parseFloat(e.target.value) || 0 }
                    setIngredients(updated)
                  }}
                  className="w-full px-1.5 py-1 rounded border border-border bg-surface-deep text-text-dim text-base font-mono text-right outline-none focus:border-border-focus"
                />
                <span className="text-xs text-text-ghost font-mono text-right">
                  {(fi.inclusion_pct / 100 * (formula.batch_size_kg || 1000)).toFixed(0)}kg
                </span>
              </div>
            )) : (
              <div className="px-4 py-12 text-center text-sm text-text-ghost">
                No ingredients added yet. Click &quot;Add&quot; to start building.
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-px bg-border rounded overflow-hidden mb-3">
            {(['balance', 'nutrients', 'cost'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 py-1.5 text-2xs font-bold uppercase tracking-wide text-center transition-all
                  ${rightTab === t ? 'bg-brand text-white' : 'bg-surface-card text-text-ghost hover:text-text-muted'}`}
              >
                {t === 'balance' ? '⚖ Balance' : t === 'nutrients' ? '◉ Nutrients' : '$ Cost'}
              </button>
            ))}
          </div>

          <div className="card p-4 flex-1 overflow-auto">
            {rightTab === 'balance' && (
              <div className="text-sm text-text-ghost text-center py-8">
                <p className="text-text-dim font-semibold mb-2">Balance panel</p>
                <p>Compares formula nutrients against {formula.species} {formula.production_stage} requirements in real-time.</p>
                <p className="mt-2 text-2xs">Requirements loaded from <code className="text-brand font-mono">animal_requirements</code> table.</p>
              </div>
            )}
            {rightTab === 'nutrients' && (
              <div>
                <div className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Nutrient Profile</div>
                {['cp_pct', 'me_mj', 'ndf_pct', 'ee_pct', 'ca_pct', 'p_pct', 'lysine_pct'].map((key) => {
                  const val = calcNutrient(key)
                  const label = key.replace('_pct', '').replace('_mj', '').replace('_', ' ').toUpperCase()
                  return (
                    <div key={key} className="flex items-center gap-2 py-1">
                      <span className="w-12 text-xs font-semibold text-text-muted font-mono text-right">{label}</span>
                      <div className="flex-1 h-1.5 bg-surface-deep rounded-sm overflow-hidden">
                        <div className="h-full bg-brand rounded-sm transition-all" style={{ width: `${Math.min(val * 5, 100)}%` }} />
                      </div>
                      <span className="w-14 text-sm font-semibold text-text font-mono text-right">{val.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )}
            {rightTab === 'cost' && (
              <div>
                <div className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Cost Analysis</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Per Tonne', value: `$${costPerTonne.toFixed(0)}` },
                    { label: 'Per kg', value: `$${(costPerTonne / 1000).toFixed(3)}` },
                    { label: 'Per Head/Day', value: `$${(costPerTonne / 1000 * 22).toFixed(2)}` },
                    { label: 'Per L Milk', value: `$${(costPerTonne / 1000 * 22 / 28).toFixed(3)}` },
                  ].map((c) => (
                    <div key={c.label} className="bg-surface-deep rounded-md p-2.5">
                      <div className="text-2xs text-text-ghost font-semibold uppercase tracking-wide">{c.label}</div>
                      <div className="text-xl font-bold text-status-amber font-mono mt-0.5">{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
