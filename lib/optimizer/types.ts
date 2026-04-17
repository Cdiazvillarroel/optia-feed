// =====================================================
// Optia Optimizer — Shared Types
// =====================================================

export interface OptIngredientInput {
  /** Ingredient ID (from ingredients table) */
  id: string
  /** Display name */
  name: string
  /** AF price per tonne (from ingredient_prices) */
  price_per_tonne_af: number
  /** DM percentage (from ingredients.dm_pct, 0-100) */
  dm_pct: number
  /** Currently locked flag */
  locked: boolean
  /** Current % DM in formula */
  current_pct: number
  /** Min inclusion bound (0-100, %DM) */
  min_pct: number
  /** Max inclusion bound (0-100, %DM) */
  max_pct: number
  /** Nutrient values keyed by ingredients column name */
  nutrients: Record<string, number>
}

export interface OptNutrientConstraint {
  /** Column name in ingredients table (e.g. 'cp_pct', 'me_mj') */
  key: string
  enabled: boolean
  min: number
  max: number
}

export interface OptIngBound {
  /** Index in OptimizerInput.ingredients */
  idx: number
  /** Min %DM */
  min: number
  /** Max %DM */
  max: number
}

export interface OptimizerInput {
  ingredients: OptIngredientInput[]
  constraints: OptNutrientConstraint[]
}

export type SolveMethod = 'lp' | 'heuristic_fallback'

export interface OptimizerResult {
  /** True if a solution meeting all constraints was found */
  feasible: boolean
  /** True if cost dropped vs current solution */
  improved: boolean
  /** Cost on AF basis ($/tonne AF mix) — matches UI */
  cost: number
  /** Cost on DM basis ($/tonne DM mix) */
  cost_dm: number
  /** Solution: % DM per ingredient, in same order as input */
  solution: number[]
  /** Which solver method produced this */
  method: SolveMethod
  diagnostics: {
    binding_constraints: string[]
    infeasibility_reasons: string[]
    warnings: string[]
  }
}
