// =====================================================
// Nutrient Mapper — Profile names → ingredients columns
// =====================================================
// animal_requirements uses human-readable names ("Crude Protein (CP)")
// ingredients table uses column codes (cp_pct)
// This file bridges them, with species-aware overrides.
// =====================================================

export type SpeciesMode = 'ruminant' | 'pig' | 'poultry'

interface NutrientMapping {
  /** Default column key used across all species (if no override) */
  default?: string
  /** Species-specific overrides */
  ruminant?: string
  pig?: string
  poultry?: string
}

/**
 * Maps human-readable nutrient names (from animal_requirements.requirements[].nutrient)
 * to ingredient table column keys.
 *
 * Match is case-insensitive and uses substring matching for flexibility.
 * Order matters — first match wins.
 */
const NUTRIENT_MAP: Array<{ pattern: string; columns: NutrientMapping }> = [
  // ── Energy ──────────────────────────────────────────────
  { pattern: 'me (poultry)', columns: { default: 'me_poultry_mj' } },
  { pattern: 'ame (poultry)', columns: { default: 'me_poultry_mj' } },
  { pattern: 'amen', columns: { default: 'amen_poultry_mj' } },
  { pattern: 'ame', columns: { poultry: 'me_poultry_mj' } },
  { pattern: 'me (pigs)', columns: { default: 'me_pig_mj' } },
  { pattern: 'ne (pigs)', columns: { default: 'ne_pig_mj' } },
  { pattern: 'de (pigs)', columns: { default: 'de_pig_mj' } },
  { pattern: 'net energy', columns: { pig: 'ne_pig_mj' } },
  { pattern: 'metabolisable energy', columns: { ruminant: 'me_mj', pig: 'me_pig_mj', poultry: 'me_poultry_mj' } },
  { pattern: 'metabolizable energy', columns: { ruminant: 'me_mj', pig: 'me_pig_mj', poultry: 'me_poultry_mj' } },
  { pattern: 'digestible energy', columns: { pig: 'de_pig_mj', ruminant: 'de_mj' } },
  { pattern: ' me ', columns: { ruminant: 'me_mj', pig: 'me_pig_mj', poultry: 'me_poultry_mj' } },
  { pattern: 'energy', columns: { ruminant: 'me_mj', pig: 'ne_pig_mj', poultry: 'me_poultry_mj' } },

  // ── Protein ─────────────────────────────────────────────
  { pattern: 'crude protein', columns: { default: 'cp_pct' } },
  { pattern: ' cp ', columns: { default: 'cp_pct' } },
  { pattern: '(cp)', columns: { default: 'cp_pct' } },

  // ── Amino acids (SID for monogastrics, total for ruminants) ──
  { pattern: 'sid lys', columns: { default: 'sid_lys_pct' } },
  { pattern: 'lysine (dig)', columns: { pig: 'sid_lys_pct', poultry: 'sid_lys_pct', ruminant: 'lysine_pct' } },
  { pattern: 'dig lys', columns: { pig: 'sid_lys_pct', poultry: 'sid_lys_pct', ruminant: 'lysine_pct' } },
  { pattern: 'lysine', columns: { pig: 'sid_lys_pct', poultry: 'sid_lys_pct', ruminant: 'lysine_pct' } },
  { pattern: 'sid met+cys', columns: { default: 'sid_met_cys_pct' } },
  { pattern: 'meth+cyst (dig)', columns: { default: 'sid_met_cys_pct' } },
  { pattern: 'met+cys', columns: { default: 'sid_met_cys_pct' } },
  { pattern: 'sid met', columns: { default: 'sid_met_pct' } },
  { pattern: 'methionine', columns: { pig: 'sid_met_pct', poultry: 'sid_met_pct', ruminant: 'methionine_pct' } },
  { pattern: 'sid thr', columns: { default: 'sid_thr_pct' } },
  { pattern: 'threonine', columns: { pig: 'sid_thr_pct', poultry: 'sid_thr_pct', ruminant: 'threonine_pct' } },
  { pattern: 'sid trp', columns: { default: 'sid_trp_pct' } },
  { pattern: 'tryptophan', columns: { pig: 'sid_trp_pct', poultry: 'sid_trp_pct', ruminant: 'tryptophan_pct' } },
  { pattern: 'sid ile', columns: { default: 'sid_ile_pct' } },
  { pattern: 'sid leu', columns: { default: 'sid_leu_pct' } },
  { pattern: 'sid val', columns: { default: 'sid_val_pct' } },
  { pattern: 'sid his', columns: { default: 'sid_his_pct' } },
  { pattern: 'sid arg', columns: { default: 'sid_arg_pct' } },

  // ── Minerals ────────────────────────────────────────────
  { pattern: 'calcium', columns: { default: 'ca_pct' } },
  { pattern: '(ca)', columns: { default: 'ca_pct' } },
  { pattern: 'sttd p', columns: { default: 'sttd_p_pct' } },
  { pattern: 'available p', columns: { default: 'p_pct' } }, // ⚠️ no avail_p column, use total
  { pattern: 'avail p', columns: { default: 'p_pct' } },
  { pattern: 'phosphorus', columns: { pig: 'sttd_p_pct', poultry: 'p_pct', ruminant: 'p_pct' } },
  { pattern: '(p)', columns: { pig: 'sttd_p_pct', poultry: 'p_pct', ruminant: 'p_pct' } },
  { pattern: 'magnesium', columns: { default: 'mg_pct' } },
  { pattern: 'potassium', columns: { default: 'k_pct' } },
  { pattern: 'sodium', columns: { default: 'na_pct' } },
  { pattern: 'chloride', columns: { default: 'cl_pct' } },
  { pattern: 'sulphur', columns: { default: 's_pct' } },
  { pattern: 'sulfur', columns: { default: 's_pct' } },

  // ── Fibre & carbs ───────────────────────────────────────
  { pattern: 'ndf', columns: { default: 'ndf_pct' } },
  { pattern: 'adf', columns: { default: 'adf_pct' } },
  { pattern: 'crude fibre', columns: { default: 'crude_fibre_pct' } },
  { pattern: 'crude fiber', columns: { default: 'crude_fibre_pct' } },
  { pattern: 'starch', columns: { default: 'starch_pct' } },
  { pattern: 'sugar', columns: { default: 'sugar_pct' } },

  // ── Fat ─────────────────────────────────────────────────
  { pattern: 'ether extract', columns: { default: 'ee_pct' } },
  { pattern: 'fat', columns: { default: 'ee_pct' } },
  { pattern: 'linoleic', columns: { default: 'linoleic_pct' } },

  // ── Other ───────────────────────────────────────────────
  { pattern: 'dry matter', columns: { default: 'dm_pct' } },
  { pattern: 'ash', columns: { default: 'ash_pct' } },
  { pattern: 'tdn', columns: { default: 'tdn_pct' } },
]

/**
 * Resolves a profile nutrient name to an ingredients table column key.
 * @param nutrientName e.g. "Crude Protein (CP)" or "Lysine (dig)"
 * @param speciesMode 'ruminant' | 'pig' | 'poultry'
 * @returns column key (e.g. 'cp_pct') or null if no match
 */
export function mapNutrientToColumn(
  nutrientName: string,
  speciesMode: SpeciesMode
): string | null {
  if (!nutrientName) return null
  const normalized = nutrientName.toLowerCase()

  for (const entry of NUTRIENT_MAP) {
    if (normalized.includes(entry.pattern)) {
      // Try species-specific first, then default
      const specific = entry.columns[speciesMode]
      if (specific) return specific
      if (entry.columns.default) return entry.columns.default
    }
  }
  return null
}

/**
 * Friendly display name for a constraint based on the nutrient.
 * Falls back to the original profile name if no specific label.
 */
export function getConstraintLabel(nutrientName: string): string {
  // Just clean up the profile name for display
  return nutrientName.trim()
}
