// ── Core Types ─────────────────────────────────────────────────────

export type Species = 'cattle' | 'pig' | 'poultry' | 'sheep'
export type ProductionStage = string
export type FormulaStatus = 'draft' | 'review' | 'approved' | 'active' | 'archived'
export type IngredientCategory = 'energy' | 'protein' | 'mineral' | 'vitamin' | 'additive' | 'forage' | 'byproduct'

// ── Database Types ─────────────────────────────────────────────────

export interface NutritionClient {
  id: string
  nutritionist_id: string
  name: string
  species: Species[]
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  location: string | null
  feedflow_client_id: string | null
  feedflow_api_key: string | null
  notes: string | null
  active: boolean
  created_at: string
}

export interface Ingredient {
  id: string
  nutritionist_id: string | null // null = global
  name: string
  category: IngredientCategory
  species_suitable: Species[]
  // Nutrient profile (per kg DM basis)
  dm_pct: number | null
  cp_pct: number | null
  me_mj: number | null
  de_mj: number | null
  ne_mj: number | null
  cf_pct: number | null
  ee_pct: number | null
  ndf_pct: number | null
  adf_pct: number | null
  ash_pct: number | null
  starch_pct: number | null
  sugar_pct: number | null
  ca_pct: number | null
  p_pct: number | null
  mg_pct: number | null
  k_pct: number | null
  na_pct: number | null
  cl_pct: number | null
  s_pct: number | null
  // Trace minerals (ppm)
  fe_ppm: number | null
  zn_ppm: number | null
  mn_ppm: number | null
  cu_ppm: number | null
  se_ppm: number | null
  // Vitamins
  vit_a_iu: number | null
  vit_d_iu: number | null
  vit_e_iu: number | null
  // Amino acids (% of DM)
  lysine_pct: number | null
  methionine_pct: number | null
  threonine_pct: number | null
  tryptophan_pct: number | null
  // Constraints
  max_inclusion_pct: number | null
  min_inclusion_pct: number | null
  anti_nutritional_notes: string | null
  // Metadata
  source: string | null
  notes: string | null
  created_at: string
}

export interface IngredientPrice {
  id: string
  ingredient_id: string
  nutritionist_id: string
  supplier: string | null
  price_per_tonne: number
  currency: string
  effective_date: string
  notes: string | null
  created_at: string
}

export interface Formula {
  id: string
  nutritionist_id: string
  client_id: string | null
  name: string
  species: Species
  production_stage: string
  version: number
  status: FormulaStatus
  batch_size_kg: number
  // Calculated totals
  total_cost_per_tonne: number | null
  total_cp_pct: number | null
  total_me_mj: number | null
  // Nutrient targets
  nutrient_targets: Record<string, { min?: number; max?: number; target?: number }> | null
  notes: string | null
  ai_review: string | null
  ai_reviewed_at: string | null
  feedflow_synced_at: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: NutritionClient
  ingredients?: FormulaIngredient[]
}

export interface FormulaIngredient {
  id: string
  formula_id: string
  ingredient_id: string
  inclusion_pct: number
  inclusion_kg: number | null
  cost_per_tonne: number | null
  locked: boolean
  notes: string | null
  // Joined
  ingredient?: Ingredient
}

export interface FormulaVersion {
  id: string
  formula_id: string
  version: number
  ingredients: any // JSON snapshot
  nutrient_totals: any // JSON snapshot
  cost_per_tonne: number | null
  changed_by: string | null
  change_notes: string | null
  created_at: string
}

export interface ClientAnimal {
  id: string
  client_id: string
  name: string
  species: Species
  breed: string | null
  production_stage: string
  count: number
  avg_weight_kg: number | null
  target_adg_kg: number | null
  target_milk_yield_l: number | null
  target_fcr: number | null
  dmi_kg: number | null
  formula_id: string | null
  notes: string | null
  created_at: string
  // Joined
  formula?: Formula
}

export interface AiSession {
  id: string
  nutritionist_id: string
  context_type: 'formula_review' | 'substitution' | 'troubleshoot' | 'formulate' | 'report' | 'chat'
  context_id: string | null
  prompt: string
  response: string
  model: string
  tokens_used: number | null
  created_at: string
}

// ── Animal Requirements Types ──────────────────────────────────────

export interface NutrientRequirement {
  nutrient: string
  unit: string
  min: number | null
  max: number | null
  target: number
  critical_max?: number | null
  critical_min?: number | null
}

export interface RatioRequirement {
  name: string
  min: number
  max: number
  target: number
  unit?: string
}

export interface SafetyRule {
  severity: 'danger' | 'warning' | 'info'
  title: string
  desc: string
  detail: string
  ingredient: string | null
}

export interface ProductionStageProfile {
  name: string
  desc: string
  requirements: NutrientRequirement[]
  ratios: RatioRequirement[]
}

export interface SpeciesProfile {
  name: string
  emoji: string
  color: string
  stages: Record<string, ProductionStageProfile>
  safety_rules: SafetyRule[]
}

// ── Hub Types ──────────────────────────────────────────────────────

export interface MillContact {
  name: string
  role: string
  phone: string
  email: string
}

export interface Mill {
  id: string
  name: string
  location: string
  capacity: string
  contacts: MillContact[]
  status: 'active' | 'pending' | 'inactive'
  connected: boolean
}

export interface SharedFormula {
  id: string
  formula_id: string
  shared_with_type: 'farm' | 'mill'
  shared_with_entity: string
  shared_with_contact: string
  version: string
  status: 'new' | 'viewed'
  shared_at: string
}

export interface HubMessage {
  id: string
  from: string
  role: string
  text: string
  created_at: string
}

// ── UI State Types ─────────────────────────────────────────────────

export interface FormulaBuilderState {
  species: Species
  stage: string
  rightTab: 'balance' | 'nutrients' | 'cost'
  ingredients: {
    ingredient_id: string
    pct: number
    locked: boolean
  }[]
}
