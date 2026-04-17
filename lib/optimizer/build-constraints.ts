// =====================================================
// Build OptConstraints from animal_requirements profile
// =====================================================
// Bridges the gap between profile JSONB (human-readable nutrients)
// and the optimizer's OptConstraint[] format (column keys).
// =====================================================

import { mapNutrientToColumn, getConstraintLabel } from './nutrient-map'
import type { SpeciesMode } from './nutrient-map'

export interface ProfileRequirement {
  nutrient: string
  unit?: string
  min?: number | null
  max?: number | null
  target?: number
  critical_max?: number | null
  critical_min?: number | null
}

export interface OptConstraintForUI {
  key: string
  label: string
  enabled: boolean
  min: number
  max: number
  source: 'profile' | 'default'
  profileNutrient?: string
}

// ── Units that the optimizer can handle (concentration-based) ──
// Everything else (g/d, kg/d, Mcal/d, etc.) is absolute — can't constrain
// a per-kg feed ration on a daily total.
const VALID_UNITS = new Set([
  '%', 'pct', 'percent',
  'mj/kg', 'mj', 'mcal/kg', 'kcal/kg',
  'g/kg', 'mg/kg', 'ppm',
  '', // some profiles omit unit for % fields
])

function isConcentrationUnit(unit: string | undefined): boolean {
  if (!unit) return true // empty unit — assume % (common in practice)
  return VALID_UNITS.has(unit.toLowerCase().trim())
}

// ── Sentinel for "no upper/lower bound" ──────────────
// We use Infinity in the internal representation and render it as an empty
// input. The solver will skip the constraint on that side.
const NO_UPPER = Infinity
const NO_LOWER = 0

/**
 * Builds optimizer constraints from a loaded profile.
 *
 * Strategy:
 * 1. For each requirement: skip if unit is absolute (g/d, kg/d, etc.)
 * 2. Map nutrient name → column key; skip if unmappable
 * 3. Need at least one bound (min or max); skip if both null
 * 4. Missing bounds map to "no bound" (NO_LOWER / NO_UPPER), not arbitrary numbers
 * 5. Dedupe on column key (first wins)
 */
export function buildConstraintsFromProfile(
  requirements: ProfileRequirement[],
  speciesMode: SpeciesMode
): OptConstraintForUI[] {
  if (!requirements || requirements.length === 0) return []

  const constraints: OptConstraintForUI[] = []
  const seenKeys = new Set<string>()

  for (const req of requirements) {
    // 1. Unit check — must be concentration-based
    if (!isConcentrationUnit(req.unit)) continue

    // 2. Map to column
    const columnKey = mapNutrientToColumn(req.nutrient, speciesMode)
    if (!columnKey) continue
    if (seenKeys.has(columnKey)) continue

    // 3. Must have at least one bound
    const hasMin = req.min !== null && req.min !== undefined
    const hasMax = req.max !== null && req.max !== undefined
    if (!hasMin && !hasMax) continue

    // 4. Fill missing bounds with sentinels (not arbitrary numbers)
    const min = hasMin ? Number(req.min) : NO_LOWER
    const max = hasMax ? Number(req.max) : NO_UPPER

    constraints.push({
      key: columnKey,
      label: `${getConstraintLabel(req.nutrient)}${req.unit ? ` (${req.unit})` : ''}`,
      enabled: true,
      min,
      max,
      source: 'profile',
      profileNutrient: req.nutrient,
    })
    seenKeys.add(columnKey)
  }

  return constraints
}

/**
 * Merges profile-derived constraints with system defaults.
 * Profile constraints take priority; defaults fill gaps.
 */
export function mergeWithDefaults(
  profileConstraints: OptConstraintForUI[],
  defaultConstraints: OptConstraintForUI[]
): OptConstraintForUI[] {
  const profileKeys = new Set(profileConstraints.map(c => c.key))
  const filteredDefaults = defaultConstraints
    .filter(c => !profileKeys.has(c.key))
    .map(c => ({ ...c, source: 'default' as const }))

  return [...profileConstraints, ...filteredDefaults]
}

// Export sentinels for UI rendering
export { NO_UPPER, NO_LOWER }
