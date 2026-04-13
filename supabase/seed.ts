// ══════════════════════════════════════════════════════════════════════
// OPTIA FEED — Database Seed Script
// Run: npm run db:seed
// Populates: ingredients, animal_requirements, safety_rules
// ══════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role bypasses RLS
)

// ── INGREDIENTS (Australian common feed ingredients) ──────────────────
const INGREDIENTS = [
  { name: "Barley (rolled)", category: "energy", dm_pct: 89.0, cp_pct: 11.5, me_mj: 12.8, de_mj: 14.2, ndf_pct: 18.5, adf_pct: 6.5, ee_pct: 2.1, starch_pct: 57.0, ca_pct: 0.05, p_pct: 0.35, mg_pct: 0.12, k_pct: 0.50, na_pct: 0.02, s_pct: 0.15, lysine_pct: 0.40, methionine_pct: 0.17, threonine_pct: 0.36, tryptophan_pct: 0.13, species_suitable: ["cattle","pig","sheep"], source: "CSIRO", max_inclusion_pct: 60 },
  { name: "Wheat (ground)", category: "energy", dm_pct: 87.5, cp_pct: 12.8, me_mj: 13.5, de_mj: 15.0, ndf_pct: 12.0, adf_pct: 3.5, ee_pct: 1.8, starch_pct: 65.0, ca_pct: 0.04, p_pct: 0.38, mg_pct: 0.14, k_pct: 0.42, na_pct: 0.01, s_pct: 0.15, lysine_pct: 0.38, methionine_pct: 0.19, threonine_pct: 0.34, tryptophan_pct: 0.15, species_suitable: ["cattle","pig","poultry","sheep"], source: "CSIRO", max_inclusion_pct: 50 },
  { name: "Canola Meal", category: "protein", dm_pct: 90.0, cp_pct: 38.5, me_mj: 11.2, de_mj: 13.0, ndf_pct: 28.0, adf_pct: 20.0, ee_pct: 3.5, ca_pct: 0.68, p_pct: 1.10, mg_pct: 0.54, k_pct: 1.30, na_pct: 0.08, s_pct: 0.65, lysine_pct: 2.05, methionine_pct: 0.70, threonine_pct: 1.50, tryptophan_pct: 0.45, species_suitable: ["cattle","pig","poultry","sheep"], source: "CSIRO", max_inclusion_pct: 20 },
  { name: "Soybean Meal (46%)", category: "protein", dm_pct: 88.0, cp_pct: 46.2, me_mj: 13.4, de_mj: 15.2, ndf_pct: 8.5, adf_pct: 5.0, ee_pct: 1.5, ca_pct: 0.35, p_pct: 0.65, mg_pct: 0.30, k_pct: 2.20, na_pct: 0.02, s_pct: 0.42, lysine_pct: 2.96, methionine_pct: 0.67, threonine_pct: 1.85, tryptophan_pct: 0.65, species_suitable: ["cattle","pig","poultry","sheep"], source: "NRC", max_inclusion_pct: 25 },
  { name: "PKE (Palm Kernel Expeller)", category: "byproduct", dm_pct: 91.0, cp_pct: 16.5, me_mj: 11.0, de_mj: 12.5, ndf_pct: 68.0, adf_pct: 40.0, ee_pct: 8.2, ca_pct: 0.31, p_pct: 0.60, lysine_pct: 0.55, methionine_pct: 0.30, threonine_pct: 0.55, species_suitable: ["cattle","sheep"], source: "CSIRO", max_inclusion_pct: 30 },
  { name: "Lupins (whole)", category: "protein", dm_pct: 90.5, cp_pct: 32.0, me_mj: 13.0, de_mj: 15.0, ndf_pct: 25.0, adf_pct: 18.0, ee_pct: 6.5, ca_pct: 0.24, p_pct: 0.40, lysine_pct: 1.50, methionine_pct: 0.23, threonine_pct: 1.10, tryptophan_pct: 0.28, species_suitable: ["cattle","pig","sheep"], source: "CSIRO", max_inclusion_pct: 30 },
  { name: "Cottonseed Meal", category: "protein", dm_pct: 91.0, cp_pct: 41.0, me_mj: 10.5, de_mj: 12.0, ndf_pct: 30.0, adf_pct: 22.0, ee_pct: 2.0, ca_pct: 0.20, p_pct: 1.05, lysine_pct: 1.70, methionine_pct: 0.55, threonine_pct: 1.25, species_suitable: ["cattle","sheep"], source: "CSIRO", max_inclusion_pct: 15, anti_nutritional_notes: "Contains gossypol. Limit to 15% whole cottonseed, 12% CSM for cattle. Toxic to pigs at >5% inclusion." },
  { name: "Oats (whole)", category: "energy", dm_pct: 89.0, cp_pct: 10.8, me_mj: 11.5, de_mj: 13.0, ndf_pct: 30.0, adf_pct: 14.0, ee_pct: 4.8, starch_pct: 42.0, ca_pct: 0.08, p_pct: 0.35, lysine_pct: 0.42, methionine_pct: 0.18, threonine_pct: 0.35, species_suitable: ["cattle","pig","sheep"], source: "CSIRO", max_inclusion_pct: 40 },
  { name: "Maize (ground)", category: "energy", dm_pct: 86.0, cp_pct: 8.5, me_mj: 14.2, de_mj: 15.8, ndf_pct: 9.5, adf_pct: 3.0, ee_pct: 3.8, starch_pct: 72.0, ca_pct: 0.03, p_pct: 0.28, lysine_pct: 0.26, methionine_pct: 0.18, threonine_pct: 0.28, species_suitable: ["cattle","pig","poultry","sheep"], source: "NRC", max_inclusion_pct: 60 },
  { name: "Triticale", category: "energy", dm_pct: 88.0, cp_pct: 13.0, me_mj: 13.0, de_mj: 14.5, ndf_pct: 14.0, adf_pct: 4.0, ee_pct: 1.6, starch_pct: 60.0, ca_pct: 0.04, p_pct: 0.36, lysine_pct: 0.42, methionine_pct: 0.19, threonine_pct: 0.35, species_suitable: ["cattle","pig","sheep"], source: "CSIRO", max_inclusion_pct: 50 },
  { name: "Sorghum (milo)", category: "energy", dm_pct: 87.0, cp_pct: 9.5, me_mj: 13.5, de_mj: 15.0, ndf_pct: 10.0, adf_pct: 4.0, ee_pct: 3.0, starch_pct: 68.0, ca_pct: 0.03, p_pct: 0.30, lysine_pct: 0.22, methionine_pct: 0.15, threonine_pct: 0.30, species_suitable: ["cattle","pig","poultry","sheep"], source: "CSIRO", max_inclusion_pct: 50 },
  { name: "Lucerne Hay", category: "forage", dm_pct: 90.0, cp_pct: 18.5, me_mj: 9.0, de_mj: 10.5, ndf_pct: 42.0, adf_pct: 32.0, ee_pct: 2.5, ca_pct: 1.40, p_pct: 0.25, mg_pct: 0.30, k_pct: 2.50, lysine_pct: 0.80, methionine_pct: 0.25, species_suitable: ["cattle","sheep"], source: "CSIRO" },
  { name: "Pasture Silage", category: "forage", dm_pct: 35.0, cp_pct: 15.0, me_mj: 10.2, de_mj: 12.0, ndf_pct: 50.0, adf_pct: 32.0, ee_pct: 3.5, ca_pct: 0.60, p_pct: 0.35, mg_pct: 0.20, k_pct: 2.80, lysine_pct: 0.65, methionine_pct: 0.20, species_suitable: ["cattle","sheep"], source: "CSIRO" },
  { name: "Maize Silage", category: "forage", dm_pct: 33.0, cp_pct: 8.0, me_mj: 10.8, de_mj: 12.5, ndf_pct: 45.0, adf_pct: 25.0, ee_pct: 3.0, starch_pct: 28.0, ca_pct: 0.25, p_pct: 0.22, species_suitable: ["cattle","sheep"], source: "CSIRO" },
  { name: "Cereal Hay (oaten)", category: "forage", dm_pct: 88.0, cp_pct: 8.0, me_mj: 8.0, de_mj: 9.5, ndf_pct: 60.0, adf_pct: 38.0, ee_pct: 2.0, ca_pct: 0.30, p_pct: 0.20, species_suitable: ["cattle","sheep"], source: "CSIRO" },
  { name: "Limestone (calcium carbonate)", category: "mineral", dm_pct: 100, cp_pct: 0, me_mj: 0, ndf_pct: 0, ee_pct: 0, ca_pct: 38.0, p_pct: 0.02, species_suitable: ["cattle","pig","poultry","sheep"], source: "NRC" },
  { name: "Dicalcium Phosphate", category: "mineral", dm_pct: 100, cp_pct: 0, me_mj: 0, ndf_pct: 0, ee_pct: 0, ca_pct: 22.0, p_pct: 18.5, species_suitable: ["cattle","pig","poultry","sheep"], source: "NRC" },
  { name: "Salt (NaCl)", category: "mineral", dm_pct: 100, cp_pct: 0, me_mj: 0, ndf_pct: 0, ee_pct: 0, ca_pct: 0, p_pct: 0, na_pct: 39.3, cl_pct: 60.7, species_suitable: ["cattle","pig","poultry","sheep"], source: "NRC" },
  { name: "Magnesium Oxide", category: "mineral", dm_pct: 100, cp_pct: 0, me_mj: 0, ndf_pct: 0, ee_pct: 0, mg_pct: 54.0, species_suitable: ["cattle","sheep"], source: "NRC" },
  { name: "Sodium Bicarbonate", category: "additive", dm_pct: 100, cp_pct: 0, me_mj: 0, ndf_pct: 0, ee_pct: 0, na_pct: 27.4, species_suitable: ["cattle"], source: "NRC", notes: "Rumen buffer for high-concentrate diets" },
  { name: "Blood Meal", category: "protein", dm_pct: 92.0, cp_pct: 85.0, me_mj: 12.5, de_mj: 14.0, ndf_pct: 0, ee_pct: 1.5, ca_pct: 0.30, p_pct: 0.25, lysine_pct: 7.80, methionine_pct: 1.10, threonine_pct: 3.80, species_suitable: ["pig","poultry"], source: "NRC", max_inclusion_pct: 5 },
  { name: "Meat & Bone Meal", category: "protein", dm_pct: 94.0, cp_pct: 50.0, me_mj: 10.0, de_mj: 12.0, ndf_pct: 0, ee_pct: 10.0, ca_pct: 10.0, p_pct: 5.0, lysine_pct: 2.60, methionine_pct: 0.75, threonine_pct: 1.70, species_suitable: ["pig","poultry"], source: "NRC", max_inclusion_pct: 8, anti_nutritional_notes: "Banned for ruminant feeding in AU. Variable quality — use lab-tested batches." },
  { name: "Tallow", category: "energy", dm_pct: 99.0, cp_pct: 0, me_mj: 33.0, de_mj: 36.0, ndf_pct: 0, ee_pct: 99.0, ca_pct: 0, p_pct: 0, species_suitable: ["cattle","pig","poultry"], source: "NRC", max_inclusion_pct: 5 },
  { name: "Molasses (cane)", category: "energy", dm_pct: 75.0, cp_pct: 5.0, me_mj: 10.5, de_mj: 12.0, ndf_pct: 0, ee_pct: 0, sugar_pct: 50.0, ca_pct: 0.80, p_pct: 0.08, k_pct: 3.50, s_pct: 0.50, species_suitable: ["cattle","sheep"], source: "CSIRO", max_inclusion_pct: 15 },
  { name: "Distillers Grains (dried)", category: "byproduct", dm_pct: 90.0, cp_pct: 27.0, me_mj: 12.5, de_mj: 14.5, ndf_pct: 38.0, adf_pct: 18.0, ee_pct: 10.0, ca_pct: 0.10, p_pct: 0.80, s_pct: 0.45, lysine_pct: 0.75, methionine_pct: 0.50, species_suitable: ["cattle","pig","sheep"], source: "NRC", max_inclusion_pct: 25, anti_nutritional_notes: "High sulphur content — monitor total dietary S. Risk of PEM >0.4% S." },
  { name: "Copra Meal", category: "byproduct", dm_pct: 90.0, cp_pct: 21.0, me_mj: 11.0, de_mj: 13.0, ndf_pct: 52.0, adf_pct: 26.0, ee_pct: 7.0, ca_pct: 0.15, p_pct: 0.60, lysine_pct: 0.58, methionine_pct: 0.30, species_suitable: ["cattle","sheep"], source: "CSIRO", max_inclusion_pct: 20 },
  { name: "Millrun (wheat)", category: "byproduct", dm_pct: 88.0, cp_pct: 16.0, me_mj: 11.0, de_mj: 13.0, ndf_pct: 38.0, adf_pct: 12.0, ee_pct: 4.0, starch_pct: 22.0, ca_pct: 0.10, p_pct: 1.00, lysine_pct: 0.60, methionine_pct: 0.22, species_suitable: ["cattle","pig","sheep"], source: "CSIRO", max_inclusion_pct: 30 },
  { name: "Sunflower Meal", category: "protein", dm_pct: 90.0, cp_pct: 34.0, me_mj: 9.0, de_mj: 11.0, ndf_pct: 40.0, adf_pct: 28.0, ee_pct: 2.5, ca_pct: 0.40, p_pct: 1.00, lysine_pct: 1.25, methionine_pct: 0.80, threonine_pct: 1.20, species_suitable: ["cattle","pig","sheep"], source: "CSIRO", max_inclusion_pct: 15 },
  { name: "Faba Beans", category: "protein", dm_pct: 87.0, cp_pct: 26.0, me_mj: 12.8, de_mj: 14.5, ndf_pct: 15.0, adf_pct: 9.0, ee_pct: 1.5, starch_pct: 40.0, ca_pct: 0.12, p_pct: 0.45, lysine_pct: 1.60, methionine_pct: 0.20, threonine_pct: 0.90, species_suitable: ["cattle","pig","poultry","sheep"], source: "CSIRO", max_inclusion_pct: 20, anti_nutritional_notes: "Contains tannins and vicine/convicine. Heat treatment improves digestibility." },
  { name: "Field Peas", category: "protein", dm_pct: 88.0, cp_pct: 23.0, me_mj: 13.0, de_mj: 14.8, ndf_pct: 14.0, adf_pct: 7.0, ee_pct: 1.2, starch_pct: 45.0, ca_pct: 0.08, p_pct: 0.40, lysine_pct: 1.55, methionine_pct: 0.22, threonine_pct: 0.82, species_suitable: ["cattle","pig","poultry","sheep"], source: "CSIRO", max_inclusion_pct: 25 },
]

// ── ANIMAL REQUIREMENTS ──────────────────────────────────────────────
const REQUIREMENTS = [
  // CATTLE
  { species: "cattle", production_stage: "lactation", stage_name: "Lactation", stage_description: "High-producing dairy cows, 20-45L/day",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 16, max: 18, target: 17, critical_max: 22 },
      { nutrient: "Metabolisable Energy (ME)", unit: "MJ/kg", min: 11.5, max: 13.5, target: 12.5 },
      { nutrient: "NDF", unit: "%", min: 28, max: 40, target: 33, critical_min: 25 },
      { nutrient: "ADF", unit: "%", min: 17, max: 21, target: 19 },
      { nutrient: "Fat (EE)", unit: "%", min: 3, max: 6, target: 5, critical_max: 7 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.60, max: 1.00, target: 0.80, critical_max: 1.5 },
      { nutrient: "Phosphorus (P)", unit: "%", min: 0.30, max: 0.50, target: 0.40, critical_max: 0.80 },
      { nutrient: "Magnesium (Mg)", unit: "%", min: 0.20, max: 0.35, target: 0.28, critical_min: 0.15 },
      { nutrient: "Potassium (K)", unit: "%", min: 1.00, max: 1.50, target: 1.20, critical_max: 2.5 },
      { nutrient: "Sodium (Na)", unit: "%", min: 0.18, max: 0.40, target: 0.25 },
      { nutrient: "Sulphur (S)", unit: "%", min: 0.20, max: 0.25, target: 0.22, critical_max: 0.40 },
      { nutrient: "Lysine", unit: "% of CP", min: 6.6, max: 7.2, target: 6.9 },
      { nutrient: "Methionine", unit: "% of CP", min: 1.8, max: 2.4, target: 2.1 },
    ],
    ratios: [{ name: "Ca:P", min: 1.5, max: 2.5, target: 2.0 }, { name: "DCAD", min: 200, max: 400, target: 300, unit: "mEq/kg" }] },
  { species: "cattle", production_stage: "dry_cow", stage_name: "Dry Cow", stage_description: "Non-lactating, late gestation 220+ days",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 12, max: 14, target: 13, critical_max: 18 },
      { nutrient: "Metabolisable Energy (ME)", unit: "MJ/kg", min: 8.5, max: 10.5, target: 9.5 },
      { nutrient: "NDF", unit: "%", min: 35, max: 50, target: 42, critical_min: 30 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.40, max: 0.60, target: 0.50, critical_max: 1.0 },
      { nutrient: "Phosphorus (P)", unit: "%", min: 0.25, max: 0.35, target: 0.30 },
      { nutrient: "Magnesium (Mg)", unit: "%", min: 0.35, max: 0.45, target: 0.40, critical_min: 0.25 },
    ],
    ratios: [{ name: "Ca:P", min: 1.5, max: 2.0, target: 1.7 }, { name: "DCAD", min: -100, max: -50, target: -75, unit: "mEq/kg" }] },
  { species: "cattle", production_stage: "growing", stage_name: "Growing (Heifers)", stage_description: "Replacement heifers 6-24 months, 0.7-0.9 kg/day ADG",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 14, max: 16, target: 15, critical_max: 20 },
      { nutrient: "Metabolisable Energy (ME)", unit: "MJ/kg", min: 10, max: 12, target: 11 },
      { nutrient: "NDF", unit: "%", min: 30, max: 45, target: 38, critical_min: 25 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.40, max: 0.70, target: 0.55, critical_max: 1.2 },
      { nutrient: "Phosphorus (P)", unit: "%", min: 0.25, max: 0.40, target: 0.32 },
    ],
    ratios: [{ name: "Ca:P", min: 1.5, max: 2.5, target: 2.0 }] },
  { species: "cattle", production_stage: "finishing", stage_name: "Finishing (Feedlot)", stage_description: "Feedlot cattle 300-600kg, 1.2-2.0 kg/day ADG",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 12, max: 14.5, target: 13, critical_max: 18 },
      { nutrient: "Metabolisable Energy (ME)", unit: "MJ/kg", min: 12, max: 13.5, target: 12.8 },
      { nutrient: "NDF", unit: "%", min: 15, max: 25, target: 20, critical_min: 12 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.50, max: 0.80, target: 0.65 },
      { nutrient: "Phosphorus (P)", unit: "%", min: 0.30, max: 0.45, target: 0.35 },
    ],
    ratios: [{ name: "Ca:P", min: 1.5, max: 2.5, target: 2.0 }] },

  // PIGS
  { species: "pig", production_stage: "grower", stage_name: "Grower (25-60 kg)", stage_description: "Growing pigs 25-60 kg, rapid lean gain phase",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 17, max: 19, target: 18, critical_max: 23 },
      { nutrient: "Digestible Energy (DE)", unit: "MJ/kg", min: 13.5, max: 14.5, target: 14 },
      { nutrient: "Lysine (SID)", unit: "%", min: 0.95, max: 1.10, target: 1.02 },
      { nutrient: "Meth+Cyst (SID)", unit: "%", min: 0.56, max: 0.66, target: 0.61 },
      { nutrient: "Threonine (SID)", unit: "%", min: 0.62, max: 0.72, target: 0.67 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.60, max: 0.75, target: 0.68, critical_max: 1.0 },
      { nutrient: "Available P", unit: "%", min: 0.28, max: 0.38, target: 0.33 },
    ],
    ratios: [{ name: "Lys:ME", min: 0.68, max: 0.80, target: 0.73, unit: "g/MJ" }] },
  { species: "pig", production_stage: "finisher", stage_name: "Finisher (60-110 kg)", stage_description: "Finishing pigs to market weight",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 14.5, max: 16.5, target: 15.5, critical_max: 20 },
      { nutrient: "Digestible Energy (DE)", unit: "MJ/kg", min: 13.5, max: 14.5, target: 14 },
      { nutrient: "Lysine (SID)", unit: "%", min: 0.72, max: 0.85, target: 0.78 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.50, max: 0.65, target: 0.58, critical_max: 0.90 },
      { nutrient: "Available P", unit: "%", min: 0.22, max: 0.32, target: 0.27 },
    ],
    ratios: [{ name: "Lys:ME", min: 0.52, max: 0.62, target: 0.56, unit: "g/MJ" }] },
  { species: "pig", production_stage: "lactation", stage_name: "Lactation Sow", stage_description: "Sows nursing piglets, high nutrient demand",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 17, max: 19, target: 18, critical_max: 22 },
      { nutrient: "Digestible Energy (DE)", unit: "MJ/kg", min: 13.5, max: 14.5, target: 14 },
      { nutrient: "Lysine (SID)", unit: "%", min: 0.95, max: 1.10, target: 1.02 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.75, max: 0.90, target: 0.85, critical_max: 1.2 },
      { nutrient: "Available P", unit: "%", min: 0.35, max: 0.45, target: 0.40 },
      { nutrient: "Crude Fibre (CF)", unit: "%", min: null, max: 7, target: 5, critical_max: 10 },
    ],
    ratios: [{ name: "Ca:P", min: 1.2, max: 1.5, target: 1.3 }] },
  { species: "pig", production_stage: "gestation", stage_name: "Gestation Sow", stage_description: "Pregnant sows, controlled energy intake",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 13, max: 15, target: 14, critical_max: 20 },
      { nutrient: "Digestible Energy (DE)", unit: "MJ/kg", min: 12.5, max: 13.5, target: 13 },
      { nutrient: "Lysine (SID)", unit: "%", min: 0.55, max: 0.65, target: 0.60 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.70, max: 0.85, target: 0.75 },
      { nutrient: "Crude Fibre (CF)", unit: "%", min: 5, max: 12, target: 8, critical_max: 15 },
    ],
    ratios: [{ name: "Ca:P", min: 1.2, max: 1.5, target: 1.3 }] },

  // POULTRY
  { species: "poultry", production_stage: "starter", stage_name: "Starter (0-10 days)", stage_description: "Broiler chicks, rapid early growth phase",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 22, max: 24, target: 23, critical_max: 27 },
      { nutrient: "ME (Poultry)", unit: "MJ/kg", min: 12.5, max: 13.0, target: 12.8 },
      { nutrient: "Lysine (dig)", unit: "%", min: 1.25, max: 1.35, target: 1.30 },
      { nutrient: "Meth+Cyst (dig)", unit: "%", min: 0.94, max: 1.02, target: 0.98 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.90, max: 1.05, target: 0.96, critical_max: 1.3 },
      { nutrient: "Available P", unit: "%", min: 0.45, max: 0.50, target: 0.48 },
    ],
    ratios: [{ name: "Ca:avP", min: 1.8, max: 2.2, target: 2.0 }] },
  { species: "poultry", production_stage: "grower", stage_name: "Grower (11-24 days)", stage_description: "Broilers rapid growth, feed efficiency focus",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 20, max: 22, target: 21, critical_max: 25 },
      { nutrient: "ME (Poultry)", unit: "MJ/kg", min: 12.8, max: 13.2, target: 13.0 },
      { nutrient: "Lysine (dig)", unit: "%", min: 1.10, max: 1.20, target: 1.15 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.80, max: 0.95, target: 0.87, critical_max: 1.2 },
      { nutrient: "Available P", unit: "%", min: 0.40, max: 0.48, target: 0.44 },
    ],
    ratios: [{ name: "Ca:avP", min: 1.8, max: 2.2, target: 2.0 }] },
  { species: "poultry", production_stage: "layer", stage_name: "Layer", stage_description: "Laying hens >18 weeks, egg production focus",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 16, max: 18, target: 17, critical_max: 22 },
      { nutrient: "ME (Poultry)", unit: "MJ/kg", min: 11.0, max: 11.8, target: 11.5 },
      { nutrient: "Lysine (dig)", unit: "%", min: 0.73, max: 0.82, target: 0.77 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 3.50, max: 4.20, target: 3.80, critical_max: 4.8 },
      { nutrient: "Available P", unit: "%", min: 0.30, max: 0.40, target: 0.35 },
    ],
    ratios: [{ name: "Ca:avP", min: 8, max: 12, target: 10 }] },

  // SHEEP
  { species: "sheep", production_stage: "maintenance", stage_name: "Maintenance", stage_description: "Dry ewes and wethers, maintenance requirements",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 8, max: 12, target: 10 },
      { nutrient: "Metabolisable Energy (ME)", unit: "MJ/kg", min: 7.5, max: 9.5, target: 8.5 },
      { nutrient: "NDF", unit: "%", min: 35, max: 60, target: 45, critical_min: 25 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.25, max: 0.50, target: 0.35, critical_max: 1.0 },
      { nutrient: "Phosphorus (P)", unit: "%", min: 0.18, max: 0.30, target: 0.22 },
    ],
    ratios: [{ name: "Ca:P", min: 1.5, max: 2.5, target: 2.0 }] },
  { species: "sheep", production_stage: "lactation", stage_name: "Lactation (Ewes)", stage_description: "Lactating ewes, twins or singles, peak milk",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 14, max: 18, target: 16, critical_max: 22 },
      { nutrient: "Metabolisable Energy (ME)", unit: "MJ/kg", min: 10, max: 12, target: 11 },
      { nutrient: "NDF", unit: "%", min: 28, max: 40, target: 35, critical_min: 22 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.40, max: 0.80, target: 0.60 },
      { nutrient: "Phosphorus (P)", unit: "%", min: 0.25, max: 0.40, target: 0.30 },
      { nutrient: "Magnesium (Mg)", unit: "%", min: 0.18, max: 0.25, target: 0.20, critical_min: 0.12 },
    ],
    ratios: [{ name: "Ca:P", min: 1.5, max: 2.5, target: 2.0 }] },
  { species: "sheep", production_stage: "finishing", stage_name: "Finishing (Lambs)", stage_description: "Lambs 25-55 kg, feedlot finishing 200-350g/day ADG",
    requirements: [
      { nutrient: "Crude Protein (CP)", unit: "%", min: 14, max: 17, target: 15.5, critical_max: 20 },
      { nutrient: "Metabolisable Energy (ME)", unit: "MJ/kg", min: 11, max: 13, target: 12 },
      { nutrient: "NDF", unit: "%", min: 18, max: 30, target: 25, critical_min: 15 },
      { nutrient: "Calcium (Ca)", unit: "%", min: 0.45, max: 0.70, target: 0.55 },
      { nutrient: "Phosphorus (P)", unit: "%", min: 0.25, max: 0.40, target: 0.30 },
    ],
    ratios: [{ name: "Ca:P", min: 1.5, max: 2.5, target: 2.0 }] },
]

// ── SAFETY RULES ─────────────────────────────────────────────────────
const SAFETY_RULES = [
  // CATTLE
  { species: "cattle", severity: "danger", title: "Urea toxicity", description: "Urea inclusion must never exceed 1% of total diet DM. Lethal dose is approximately 0.44 g/kg body weight. Animals must be adapted gradually over 2-3 weeks.", detail: "Max inclusion: 1.0% DM | Lethal: 0.44 g/kg BW | Adaptation: 14-21 days", ingredient_name: "Urea" },
  { species: "cattle", severity: "danger", title: "Grain acidosis (lactic acidosis)", description: "Rapid introduction of high-starch concentrates can cause acute ruminal acidosis. Grain should not exceed 65% of diet without proper adaptation. NDF must remain above minimum thresholds.", detail: "Max grain: 60-65% DM | Min effective NDF: 25% | Adaptation: 14-21 days" },
  { species: "cattle", severity: "danger", title: "Nitrate poisoning", description: "High-nitrate forages (>0.5% NO₃ as fed) can be lethal. Total dietary nitrate must be monitored, especially with drought-stressed crops.", detail: "Safe: <0.5% NO₃ | Caution: 0.5-1.0% | Dangerous: >1.0%" },
  { species: "cattle", severity: "warning", title: "Gossypol toxicity — Cottonseed", description: "Free gossypol from cottonseed can cause cardiac and reproductive issues. Limit whole cottonseed to 15% of diet DM.", detail: "Whole cottonseed max: 15% DM | CSM max: 12% DM | Free gossypol limit: <500 ppm", ingredient_name: "Cottonseed Meal" },
  { species: "cattle", severity: "warning", title: "Sulphur toxicity — PEM risk", description: "Excess dietary sulphur (>0.4% DM) can cause polioencephalomalacia. Monitor total S from all sources including water.", detail: "Max S: 0.40% DM | Water S: <500 ppm | Risk increases with high-concentrate diets" },
  { species: "cattle", severity: "warning", title: "Ionophore safety", description: "Monensin and lasalocid have narrow safety margins. Never combine with tiamulin. Lethal to horses at any dose.", detail: "Monensin: 11-33 ppm (cattle) | LD50 cattle: ~50 ppm | LETHAL to horses at any level" },
  { species: "cattle", severity: "info", title: "Ca:P ratio maintenance", description: "Calcium to phosphorus ratio should remain between 1.5:1 and 2.5:1. Inverted ratios can cause urinary calculi.", detail: "Target Ca:P: 2:1 | Never allow P > Ca for extended periods" },
  { species: "cattle", severity: "info", title: "Vitamin A supplementation", description: "Cattle on dry feed for >60 days require vitamin A supplementation.", detail: "Requirement: 40,000-75,000 IU/day (adult)" },

  // PIGS
  { species: "pig", severity: "danger", title: "Salt poisoning (water deprivation)", description: "Pigs are highly susceptible to salt toxicity, especially if water access is restricted.", detail: "Max NaCl: 0.50% diet | ALWAYS ensure ad-lib water | Acute lethal: 2.5 g/kg BW", ingredient_name: "Salt (NaCl)" },
  { species: "pig", severity: "danger", title: "Selenium toxicity", description: "Selenium has a very narrow safety margin in pigs. Total dietary Se must not exceed 5 ppm.", detail: "Requirement: 0.15-0.30 ppm | Max safe: 5 ppm | Acute lethal: >10 ppm" },
  { species: "pig", severity: "danger", title: "Gossypol toxicity — Cottonseed", description: "Pigs are highly sensitive to gossypol. Cottonseed meal must be limited or avoided entirely.", detail: "Max free gossypol: 100 ppm | Avoid whole cottonseed | CSM max: 5% of diet", ingredient_name: "Cottonseed Meal" },
  { species: "pig", severity: "warning", title: "Trypsin inhibitors — Raw soybeans", description: "Raw soybeans contain trypsin inhibitors. Only use properly heat-treated soybean meal.", detail: "Use heat-treated SBM only (urease activity <0.2 pH units)", ingredient_name: "Soybean Meal (46%)" },
  { species: "pig", severity: "warning", title: "Excess calcium — Growth impairment", description: "Excess dietary Ca reduces Zn and P absorption and impairs growth rate.", detail: "Max Ca: 1.0% grower/finisher | 1.2% sows | Maintain Ca:P 1.2-1.5:1" },
  { species: "pig", severity: "info", title: "Ideal protein concept", description: "Amino acids should be balanced relative to lysine.", detail: "Ideal ratios to Lys: Met+Cys 60% | Thr 65% | Trp 19% | Val 68%" },

  // POULTRY
  { species: "poultry", severity: "danger", title: "Ionophore + Tiamulin interaction", description: "Combining ionophore coccidiostats with tiamulin causes acute toxicity and death within 24-48 hours.", detail: "NEVER combine ionophores with tiamulin | 7-day withdrawal required" },
  { species: "poultry", severity: "danger", title: "Excess Calcium — Broilers", description: "Excess Ca (>1.2%) in broiler diets causes severe growth depression and kidney damage.", detail: "Broiler max Ca: 1.0-1.2% | Layer Ca: 3.5-4.2% | Never use layer feed for broilers" },
  { species: "poultry", severity: "danger", title: "Mycotoxin contamination", description: "Aflatoxin B1, DON, fumonisin in feed grains cause liver damage and immunosuppression.", detail: "Aflatoxin B1 max: 20 ppb | DON max: 5 ppm | Fumonisins max: 20 ppm" },
  { species: "poultry", severity: "warning", title: "NSP factors — Barley/Wheat", description: "High NSP levels in barley/wheat increase digesta viscosity. Use NSP enzymes.", detail: "Add xylanase + β-glucanase for barley/wheat diets", ingredient_name: "Barley (rolled)" },
  { species: "poultry", severity: "info", title: "Amino acid balance", description: "Diet must meet digestible amino acid requirements precisely.", detail: "Balance to dig Lys: Met+Cys 75% | Thr 67% | Trp 16% | Val 77%" },

  // SHEEP
  { species: "sheep", severity: "danger", title: "Copper toxicity — CRITICAL", description: "Sheep are extremely sensitive to copper. NEVER use cattle or pig mineral mixes for sheep.", detail: "Max Cu: 10 ppm total diet | Merinos most susceptible | NEVER feed cattle minerals to sheep" },
  { species: "sheep", severity: "danger", title: "Grain poisoning (acidosis)", description: "Sheep are highly susceptible to grain overload. Sudden access to grain is often fatal.", detail: "Max grain introduction: 50g/head/day increase | Full adaptation: 21-28 days | Max grain: 60% DM" },
  { species: "sheep", severity: "danger", title: "Enterotoxaemia (Pulpy kidney)", description: "High-grain diets promote Clostridium perfringens type D. Vaccination essential before feedlot.", detail: "Vaccinate 2 weeks before grain introduction | Booster at 4 weeks" },
  { species: "sheep", severity: "warning", title: "Urinary calculi — Wethers", description: "Wethers on high-grain diets are susceptible to urolithiasis. Maintain Ca:P >2:1.", detail: "Ca:P must be >2:1 | Add NH₄Cl at 0.5-1.0% diet" },
  { species: "sheep", severity: "warning", title: "Calcium deficiency — Lactation", description: "Ewes with twins are highly susceptible to hypocalcaemia in late pregnancy.", detail: "Min Ca lactation: 0.40% | Supplement limestone" },
  { species: "sheep", severity: "info", title: "Selenium + Vitamin E", description: "Lambs in Se-deficient regions require supplementation to prevent white muscle disease.", detail: "Se requirement: 0.1-0.3 ppm | Vit E: 20-30 IU/kg" },
]

// ── SEED FUNCTION ────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding Optia Feed database...\n')

  // 1. Seed ingredients (global — no nutritionist_id)
  console.log('📦 Seeding ingredients...')
  const { data: ingData, error: ingError } = await supabase
    .from('ingredients')
    .upsert(
      INGREDIENTS.map((i) => ({ ...i, nutritionist_id: null })),
      { onConflict: 'id', ignoreDuplicates: false }
    )
    .select()

  if (ingError) {
    console.error('  ❌ Ingredient error:', ingError.message)
  } else {
    console.log(`  ✅ ${INGREDIENTS.length} ingredients seeded`)
  }

  // 2. Seed animal requirements (global)
  console.log('🐄 Seeding animal requirements...')
  for (const req of REQUIREMENTS) {
    const { error } = await supabase
      .from('animal_requirements')
      .upsert({
        nutritionist_id: null,
        species: req.species,
        production_stage: req.production_stage,
        stage_name: req.stage_name,
        stage_description: req.stage_description,
        requirements: req.requirements,
        ratios: req.ratios,
        source: 'CSIRO',
      }, { onConflict: 'nutritionist_id,species,production_stage' })

    if (error) {
      console.error(`  ❌ ${req.species}/${req.production_stage}:`, error.message)
    }
  }
  console.log(`  ✅ ${REQUIREMENTS.length} requirement profiles seeded`)

  // 3. Seed safety rules (global)
  console.log('🛡️  Seeding safety rules...')
  const { error: safetyError } = await supabase
    .from('safety_rules')
    .insert(
      SAFETY_RULES.map((r) => ({
        nutritionist_id: null,
        species: r.species,
        severity: r.severity,
        title: r.title,
        description: r.description,
        detail: r.detail,
        ingredient_name: r.ingredient_name || null,
        source: 'CSIRO',
        active: true,
      }))
    )

  if (safetyError) {
    console.error('  ❌ Safety rules error:', safetyError.message)
  } else {
    console.log(`  ✅ ${SAFETY_RULES.length} safety rules seeded`)
  }

  console.log('\n✨ Seed complete!')
}

seed().catch(console.error)
