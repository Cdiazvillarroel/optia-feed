import solver from 'javascript-lp-solver'
import type {
  OptimizerInput,
  OptimizerResult,
  OptIngredientInput,
  OptNutrientConstraint,
} from './types'

// ============================================================
// PRIMARY ENTRY POINT
// ============================================================
export function solveLeastCost(input: OptimizerInput): OptimizerResult {
  const lpResult = tryLP(input)
  if (lpResult.feasible) return lpResult
  return tryHeuristic(input, lpResult.diagnostics.infeasibility_reasons)
}

// ============================================================
// LP SOLVER
// ============================================================
function tryLP(input: OptimizerInput): OptimizerResult {
  const { ingredients, constraints } = input
  const n = ingredients.length

  if (n === 0) return makeError('No ingredients in formula')

  const enabled = constraints.filter(c => c.enabled)

  const variables: Record<string, Record<string, number>> = {}
  const lpConstraints: Record<string, { min?: number; max?: number; equal?: number }> = {
    __sum__: { equal: 1 },
  }

  for (let i = 0; i < n; i++) {
    const ing = ingredients[i]
    const dmFrac = ing.dm_pct > 0 ? ing.dm_pct / 100 : 0.88
    const priceDM = (ing.price_per_tonne_af || 0) / dmFrac

    const v: Record<string, number> = {
      __cost__: priceDM,
      __sum__: 1,
    }

    for (const c of enabled) {
      v[c.key] = ing.nutrients[c.key] ?? 0
    }

    if (ing.locked) {
      const lockKey = `__lock_${i}__`
      v[lockKey] = 1
      lpConstraints[lockKey] = { equal: ing.current_pct / 100 }
    } else {
      const minPct = Math.max(0, ing.min_pct)
      const maxPct = Math.min(100, ing.max_pct)
      if (minPct > 0) {
        const minKey = `__min_${i}__`
        v[minKey] = 1
        lpConstraints[minKey] = { min: minPct / 100 }
      }
      if (maxPct < 100) {
        const maxKey = `__max_${i}__`
        v[maxKey] = 1
        lpConstraints[maxKey] = { max: maxPct / 100 }
      }
    }

    variables[`x_${i}`] = v
  }

  for (const c of enabled) {
    lpConstraints[c.key] = { min: c.min, max: c.max }
  }

  const model = {
    optimize: '__cost__',
    opType: 'min' as const,
    constraints: lpConstraints,
    variables,
  }

  let result: any
  try {
    result = solver.Solve(model)
  } catch (err) {
    return makeError(`LP solver error: ${(err as Error).message}`)
  }

  if (!result || result.feasible === false) {
    return makeInfeasible(input)
  }

  const solution = ingredients.map((_, i) => {
    const frac = (result[`x_${i}`] as number) ?? 0
    return Math.round(frac * 1000) / 10
  })

  const cost_dm = (result.result as number) ?? 0
  const cost_af = computeAFCost(ingredients, solution)
  const original_cost_af = computeAFCost(
    ingredients,
    ingredients.map(i => i.current_pct)
  )

  return {
    feasible: true,
    improved: cost_af < original_cost_af - 0.5,
    cost: cost_af,
    cost_dm,
    solution,
    method: 'lp',
    diagnostics: {
      binding_constraints: findBinding(ingredients, solution, enabled),
      infeasibility_reasons: [],
      warnings: buildWarnings(ingredients, solution),
    },
  }
}

// ============================================================
// HEURISTIC FALLBACK
// ============================================================
function tryHeuristic(
  input: OptimizerInput,
  lpReasons: string[]
): OptimizerResult {
  const { ingredients, constraints } = input
  const n = ingredients.length

  if (n === 0) return makeError('No ingredients')

  const enabled = constraints.filter(c => c.enabled)

  const calcNut = (sol: number[], key: string): number =>
    sol.reduce((s, pct, i) => s + (ingredients[i].nutrients[key] ?? 0) * pct / 100, 0)

  const calcCostAF = (sol: number[]): number => computeAFCost(ingredients, sol)

  const isFeasible = (sol: number[]): boolean => {
    const total = sol.reduce((s, v) => s + v, 0)
    if (total < 99.5 || total > 100.5) return false
    for (const c of enabled) {
      const v = calcNut(sol, c.key)
      if (v < c.min || v > c.max) return false
    }
    for (let i = 0; i < n; i++) {
      const ing = ingredients[i]
      if (ing.locked) {
        if (Math.abs(sol[i] - ing.current_pct) > 0.1) return false
      } else if (sol[i] < ing.min_pct || sol[i] > ing.max_pct) {
        return false
      }
    }
    return true
  }

  let current = ingredients.map(ing => ing.current_pct)
  const total = current.reduce((s, v) => s + v, 0)

  if (total < 1) {
    const unlocked = ingredients.map((ing, i) => (ing.locked ? -1 : i)).filter(i => i >= 0)
    if (unlocked.length === 0) {
      return makeError('All ingredients locked and total inclusion is zero')
    }
    current = ingredients.map(ing => (ing.locked ? ing.current_pct : 100 / unlocked.length))
  } else if (total < 95 || total > 105) {
    const lockedSum = ingredients.reduce((s, ing) => s + (ing.locked ? ing.current_pct : 0), 0)
    const unlockedTarget = 100 - lockedSum
    const unlockedCurrent = total - lockedSum
    const scale = unlockedCurrent > 0 ? unlockedTarget / unlockedCurrent : 0
    current = ingredients.map((ing, i) => (ing.locked ? ing.current_pct : current[i] * scale))
  }

  let best = [...current]
  let bestCost = isFeasible(best) ? calcCostAF(best) : Infinity

  for (let pass = 0; pass < 5; pass++) {
    let improved = false
    for (let i = 0; i < n; i++) {
      if (ingredients[i].locked) continue
      for (let j = 0; j < n; j++) {
        if (i === j || ingredients[j].locked) continue
        let lo = 0
        let hi = Math.min(best[i], 60)
        for (let bs = 0; bs < 20; bs++) {
          const mid = (lo + hi) / 2
          const cand = [...best]
          cand[i] = Math.max(0, best[i] - mid)
          cand[j] = Math.min(100, best[j] + mid)
          if (isFeasible(cand) && calcCostAF(cand) < bestCost) lo = mid
          else hi = mid
        }
        if (lo > 0.05) {
          const final = [...best]
          final[i] = Math.max(0, best[i] - lo)
          final[j] = Math.min(100, best[j] + lo)
          if (isFeasible(final)) {
            const nc = calcCostAF(final)
            if (nc < bestCost - 0.01) {
              best = final
              bestCost = nc
              improved = true
            }
          }
        }
      }
    }
    if (!improved) break
  }

  for (let iter = 0; iter < 8000; iter++) {
    const cand = [...best]
    const step = 0.1 + Math.random() * 0.5
    const i = Math.floor(Math.random() * n)
    const j = Math.floor(Math.random() * n)
    if (i === j || ingredients[i].locked || ingredients[j].locked) continue
    cand[i] = Math.max(0, cand[i] - step)
    cand[j] = Math.max(0, cand[j] + step)
    if (isFeasible(cand)) {
      const cost = calcCostAF(cand)
      if (cost < bestCost) {
        best = cand
        bestCost = cost
      }
    }
  }

  const solution = best.map(v => Math.round(v * 10) / 10)
  const original_cost = calcCostAF(ingredients.map(i => i.current_pct))
  const cost_af = bestCost === Infinity ? original_cost : bestCost

  return {
    feasible: bestCost < Infinity,
    improved: bestCost < original_cost - 0.5,
    cost: cost_af,
    cost_dm: cost_af,
    solution,
    method: 'heuristic_fallback',
    diagnostics: {
      binding_constraints: [],
      infeasibility_reasons:
        bestCost === Infinity
          ? lpReasons.length > 0
            ? lpReasons
            : ['Could not find a feasible solution. Try relaxing constraints.']
          : [],
      warnings:
        bestCost < Infinity
          ? ['LP infeasible — used heuristic fallback. Result may not be globally optimal.']
          : [],
    },
  }
}

// ============================================================
// HELPERS
// ============================================================
function computeAFCost(ingredients: OptIngredientInput[], solution: number[]): number {
  const totalAF = solution.reduce((s, pct, i) => {
    const dmFrac = ingredients[i].dm_pct > 0 ? ingredients[i].dm_pct / 100 : 0.88
    return s + (pct / 100) * 1000 / dmFrac
  }, 0)
  if (totalAF <= 0) return 0
  return solution.reduce((s, pct, i) => {
    const dmFrac = ingredients[i].dm_pct > 0 ? ingredients[i].dm_pct / 100 : 0.88
    const afKg = (pct / 100) * 1000 / dmFrac
    return s + (ingredients[i].price_per_tonne_af || 0) * (afKg / totalAF)
  }, 0)
}

function findBinding(
  ingredients: OptIngredientInput[],
  solution: number[],
  constraints: OptNutrientConstraint[]
): string[] {
  const binding: string[] = []
  const eps = 0.05
  for (const c of constraints) {
    const v = solution.reduce(
      (s, pct, i) => s + (ingredients[i].nutrients[c.key] ?? 0) * pct / 100,
      0
    )
    if (Math.abs(v - c.min) < eps || Math.abs(v - c.max) < eps) {
      binding.push(c.key)
    }
  }
  return binding
}

function buildWarnings(ingredients: OptIngredientInput[], solution: number[]): string[] {
  const w: string[] = []
  for (let i = 0; i < ingredients.length; i++) {
    if (!ingredients[i].locked && solution[i] > 60) {
      w.push(`${ingredients[i].name} dominates at ${solution[i].toFixed(1)}% — consider a max bound`)
    }
    const delta = Math.abs(solution[i] - ingredients[i].current_pct)
    if (delta > 30) {
      w.push(`${ingredients[i].name} shifted by ${delta.toFixed(1)}% — review before applying`)
    }
  }
  return w
}

function makeError(message: string): OptimizerResult {
  return {
    feasible: false,
    improved: false,
    cost: 0,
    cost_dm: 0,
    solution: [],
    method: 'lp',
    diagnostics: { binding_constraints: [], infeasibility_reasons: [message], warnings: [] },
  }
}

function makeInfeasible(input: OptimizerInput): OptimizerResult {
  const reasons: string[] = []
  const enabled = input.constraints.filter(c => c.enabled)

  for (const c of enabled) {
    const values = input.ingredients
      .map(i => i.nutrients[c.key])
      .filter((v): v is number => typeof v === 'number')

    if (values.length === 0) {
      reasons.push(`${c.key}: no ingredients have data for this nutrient`)
      continue
    }
    const maxAch = Math.max(...values)
    const minAch = Math.min(...values)
    if (c.min > maxAch) {
      reasons.push(
        `${c.key}: required min ${c.min} exceeds best ingredient (${maxAch.toFixed(2)})`
      )
    }
    if (c.max < minAch) {
      reasons.push(
        `${c.key}: required max ${c.max} below worst ingredient (${minAch.toFixed(2)})`
      )
    }
  }

  const totalMin = input.ingredients.reduce(
    (s, i) => s + (i.locked ? i.current_pct : i.min_pct),
    0
  )
  const totalMax = input.ingredients.reduce(
    (s, i) => s + (i.locked ? i.current_pct : i.max_pct),
    0
  )
  if (totalMin > 100) reasons.push(`Sum of min inclusions (${totalMin.toFixed(1)}%) exceeds 100%`)
  if (totalMax < 100) reasons.push(`Sum of max inclusions (${totalMax.toFixed(1)}%) is below 100%`)

  return {
    feasible: false,
    improved: false,
    cost: 0,
    cost_dm: 0,
    solution: [],
    method: 'lp',
    diagnostics: {
      binding_constraints: [],
      infeasibility_reasons: reasons.length > 0 ? reasons : ['No feasible solution found'],
      warnings: [],
    },
  }
}
