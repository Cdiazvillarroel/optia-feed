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

/**
 * Builds optimizer constraints from a loaded profile.
 *
 * Strategy:
 * 1. For each requirement in the profile, map nutrient name → column key
 * 2. If mappable AND has min OR max → add as enabled constraint
 * 3. Skip if no column match (e.g. obscure nutrient not in our map)
 * 4. Skip if both min and max are null (informational only)
 */
export function buildConstraintsFromProfile(
  requirements: ProfileRequirement[],
  speciesMode: SpeciesMode
): OptConstraintForUI[] {
  if (!requirements || requirements.length === 0) return []

  const constraints: OptConstraintForUI[] = []
  const seenKeys = new Set<string>()

  for (const req of requirements) {
    const columnKey = mapNutrientToColumn(req.nutrient, speciesMode)
    if (!columnKey) continue
    if (seenKeys.has(columnKey)) continue // avoid duplicate columns

    const hasMin = req.min !== null && req.min !== undefined
    const hasMax = req.max !== null && req.max !== undefined
    if (!hasMin && !hasMax) continue

    const min = hasMin ? Number(req.min) : 0
    const max = hasMax ? Number(req.max) : 9999

    constraints.push({
      key: columnKey,
      label: `${getConstraintLabel(req.nutrient)}${req.unit ? ` (${req.unit})` : ''}`,
      enabled: true, // auto-enable everything from profile
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
 *
 * @param profileConstraints from buildConstraintsFromProfile
 * @param defaultConstraints from defaultOptConstraints (existing function)
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
