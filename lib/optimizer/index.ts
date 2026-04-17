// =====================================================
// Optia Optimizer — Drop-in replacement for legacy runOptimizer
// =====================================================
// Same signature as the previous heuristic runOptimizer in page.tsx.
// Uses LP solver internally with heuristic fallback.

import { solveLeastCost } from './solver'
import type { OptIngredientInput } from './types'

interface OptConstraint {
  key: string
  label: string
  enabled: boolean
  min: number
  max: number
}

interface OptIngBound {
  idx: number
  min: number
  max: number
}

export interface RunOptimizerResult {
  solution: number[]
  cost: number
  feasible: boolean
  improved: boolean
  method: 'lp' | 'heuristic_fallback'
  diagnostics: {
    binding_constraints: string[]
    infeasibility_reasons: string[]
    warnings: string[]
  }
}

/**
 * Drop-in replacement for the legacy heuristic runOptimizer.
 * Same signature; uses LP solver with heuristic fallback under the hood.
 */
export function runOptimizer(
  ings: any[],
  prices: Record<string, number>,
  constraints: OptConstraint[],
  ingConstraints: OptIngBound[],
  _iterations: number = 10000 // ignored — kept for signature compat
): RunOptimizerResult {
  const ingredients: OptIngredientInput[] = ings.map((fi, idx) => {
    const bound = ingConstraints.find(c => c.idx === idx)
    return {
      id: fi.ingredient_id,
      name: fi.ingredient?.name ?? 'Unknown',
      price_per_tonne_af: prices[fi.ingredient_id] ?? 0,
      dm_pct: typeof fi.ingredient?.dm_pct === 'number' ? fi.ingredient.dm_pct : 88,
      locked: !!fi.locked,
      current_pct: fi.inclusion_pct ?? 0,
      min_pct: bound?.min ?? 0,
      max_pct: bound?.max ?? 100,
      nutrients: extractNutrients(fi.ingredient),
    }
  })

  const result = solveLeastCost({ ingredients, constraints })

  return {
    solution: result.solution,
    cost: result.cost,
    feasible: result.feasible,
    improved: result.improved,
    method: result.method,
    diagnostics: result.diagnostics,
  }
}

/** Whitelist of nutrient columns from the ingredients table */
const NUTRIENT_COLS = [
  'dm_pct', 'cp_pct', 'me_mj', 'de_mj', 'ne_mj', 'cf_pct', 'ee_pct',
  'ndf_pct', 'adf_pct', 'ash_pct', 'starch_pct', 'sugar_pct',
  'ca_pct', 'p_pct', 'mg_pct', 'k_pct', 'na_pct', 'cl_pct', 's_pct',
  'fe_ppm', 'zn_ppm', 'mn_ppm', 'cu_ppm', 'se_ppm', 'co_ppm', 'i_ppm',
  'lysine_pct', 'methionine_pct', 'threonine_pct', 'tryptophan_pct',
  'nem_mj', 'nel_mj', 'neg_mj', 'tdn_pct', 'rumen_deg_pct',
  'de_pig_mj', 'me_pig_mj', 'ne_pig_mj',
  'sid_lys_pct', 'sid_met_pct', 'sid_met_cys_pct', 'sid_thr_pct', 'sid_trp_pct',
  'sid_ile_pct', 'sid_leu_pct', 'sid_val_pct', 'sid_his_pct',
  'sid_phe_tyr_pct', 'sid_arg_pct',
  'sttd_p_pct', 'crude_fibre_pct', 'linoleic_pct',
  'pendf_factor', 'dcad', 'an_frac', 'bn_frac', 'cn_rate',
]

function extractNutrients(ing: any): Record<string, number> {
  if (!ing) return {}
  const out: Record<string, number> = {}
  for (const col of NUTRIENT_COLS) {
    const v = ing[col]
    if (typeof v === 'number' && Number.isFinite(v)) out[col] = v
  }
  return out
}

export { solveLeastCost }
export type { OptimizerInput, OptimizerResult } from './types'
