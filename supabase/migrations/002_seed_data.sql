-- ══════════════════════════════════════════════════════════════════════
-- OPTIA FEED — Seed Data (run in Supabase SQL Editor AFTER migration)
-- Populates: ingredients (global), animal_requirements, safety_rules
-- ══════════════════════════════════════════════════════════════════════

-- ── INGREDIENTS ──────────────────────────────────────────────────────
INSERT INTO public.ingredients (nutritionist_id, name, category, species_suitable, dm_pct, cp_pct, me_mj, de_mj, ndf_pct, adf_pct, ee_pct, starch_pct, sugar_pct, ca_pct, p_pct, mg_pct, k_pct, na_pct, s_pct, lysine_pct, methionine_pct, threonine_pct, tryptophan_pct, max_inclusion_pct, anti_nutritional_notes, source, notes) VALUES
(null, 'Barley (rolled)', 'energy', '{"cattle","pig","sheep"}', 89.0, 11.5, 12.8, 14.2, 18.5, 6.5, 2.1, 57.0, null, 0.05, 0.35, 0.12, 0.50, 0.02, 0.15, 0.40, 0.17, 0.36, 0.13, 60, null, 'CSIRO', null),
(null, 'Wheat (ground)', 'energy', '{"cattle","pig","poultry","sheep"}', 87.5, 12.8, 13.5, 15.0, 12.0, 3.5, 1.8, 65.0, null, 0.04, 0.38, 0.14, 0.42, 0.01, 0.15, 0.38, 0.19, 0.34, 0.15, 50, null, 'CSIRO', null),
(null, 'Canola Meal', 'protein', '{"cattle","pig","poultry","sheep"}', 90.0, 38.5, 11.2, 13.0, 28.0, 20.0, 3.5, null, null, 0.68, 1.10, 0.54, 1.30, 0.08, 0.65, 2.05, 0.70, 1.50, 0.45, 20, null, 'CSIRO', null),
(null, 'Soybean Meal (46%)', 'protein', '{"cattle","pig","poultry","sheep"}', 88.0, 46.2, 13.4, 15.2, 8.5, 5.0, 1.5, null, null, 0.35, 0.65, 0.30, 2.20, 0.02, 0.42, 2.96, 0.67, 1.85, 0.65, 25, null, 'NRC', null),
(null, 'PKE (Palm Kernel Expeller)', 'byproduct', '{"cattle","sheep"}', 91.0, 16.5, 11.0, 12.5, 68.0, 40.0, 8.2, null, null, 0.31, 0.60, null, null, null, null, 0.55, 0.30, 0.55, null, 30, null, 'CSIRO', null),
(null, 'Lupins (whole)', 'protein', '{"cattle","pig","sheep"}', 90.5, 32.0, 13.0, 15.0, 25.0, 18.0, 6.5, null, null, 0.24, 0.40, null, null, null, null, 1.50, 0.23, 1.10, 0.28, 30, null, 'CSIRO', null),
(null, 'Cottonseed Meal', 'protein', '{"cattle","sheep"}', 91.0, 41.0, 10.5, 12.0, 30.0, 22.0, 2.0, null, null, 0.20, 1.05, null, null, null, null, 1.70, 0.55, 1.25, null, 15, 'Contains gossypol. Limit to 15% whole cottonseed, 12% CSM for cattle. Toxic to pigs at >5%.', 'CSIRO', null),
(null, 'Oats (whole)', 'energy', '{"cattle","pig","sheep"}', 89.0, 10.8, 11.5, 13.0, 30.0, 14.0, 4.8, 42.0, null, 0.08, 0.35, null, null, null, null, 0.42, 0.18, 0.35, null, 40, null, 'CSIRO', null),
(null, 'Maize (ground)', 'energy', '{"cattle","pig","poultry","sheep"}', 86.0, 8.5, 14.2, 15.8, 9.5, 3.0, 3.8, 72.0, null, 0.03, 0.28, null, null, null, null, 0.26, 0.18, 0.28, null, 60, null, 'NRC', null),
(null, 'Triticale', 'energy', '{"cattle","pig","sheep"}', 88.0, 13.0, 13.0, 14.5, 14.0, 4.0, 1.6, 60.0, null, 0.04, 0.36, null, null, null, null, 0.42, 0.19, 0.35, null, 50, null, 'CSIRO', null),
(null, 'Sorghum (milo)', 'energy', '{"cattle","pig","poultry","sheep"}', 87.0, 9.5, 13.5, 15.0, 10.0, 4.0, 3.0, 68.0, null, 0.03, 0.30, null, null, null, null, 0.22, 0.15, 0.30, null, 50, null, 'CSIRO', null),
(null, 'Lucerne Hay', 'forage', '{"cattle","sheep"}', 90.0, 18.5, 9.0, 10.5, 42.0, 32.0, 2.5, null, null, 1.40, 0.25, 0.30, 2.50, null, null, 0.80, 0.25, null, null, null, null, 'CSIRO', null),
(null, 'Pasture Silage', 'forage', '{"cattle","sheep"}', 35.0, 15.0, 10.2, 12.0, 50.0, 32.0, 3.5, null, null, 0.60, 0.35, 0.20, 2.80, null, null, 0.65, 0.20, null, null, null, null, 'CSIRO', null),
(null, 'Maize Silage', 'forage', '{"cattle","sheep"}', 33.0, 8.0, 10.8, 12.5, 45.0, 25.0, 3.0, 28.0, null, 0.25, 0.22, null, null, null, null, null, null, null, null, null, null, 'CSIRO', null),
(null, 'Cereal Hay (oaten)', 'forage', '{"cattle","sheep"}', 88.0, 8.0, 8.0, 9.5, 60.0, 38.0, 2.0, null, null, 0.30, 0.20, null, null, null, null, null, null, null, null, null, null, 'CSIRO', null),
(null, 'Limestone (calcium carbonate)', 'mineral', '{"cattle","pig","poultry","sheep"}', 100, 0, 0, null, 0, null, 0, null, null, 38.0, 0.02, null, null, null, null, null, null, null, null, null, null, 'NRC', null),
(null, 'Dicalcium Phosphate', 'mineral', '{"cattle","pig","poultry","sheep"}', 100, 0, 0, null, 0, null, 0, null, null, 22.0, 18.5, null, null, null, null, null, null, null, null, null, null, 'NRC', null),
(null, 'Salt (NaCl)', 'mineral', '{"cattle","pig","poultry","sheep"}', 100, 0, 0, null, 0, null, 0, null, null, 0, 0, null, null, 39.3, null, null, null, null, null, null, null, 'NRC', null),
(null, 'Magnesium Oxide', 'mineral', '{"cattle","sheep"}', 100, 0, 0, null, 0, null, 0, null, null, null, null, 54.0, null, null, null, null, null, null, null, null, null, 'NRC', null),
(null, 'Sodium Bicarbonate', 'additive', '{"cattle"}', 100, 0, 0, null, 0, null, 0, null, null, null, null, null, null, 27.4, null, null, null, null, null, null, null, 'NRC', 'Rumen buffer for high-concentrate diets'),
(null, 'Blood Meal', 'protein', '{"pig","poultry"}', 92.0, 85.0, 12.5, 14.0, 0, null, 1.5, null, null, 0.30, 0.25, null, null, null, null, 7.80, 1.10, 3.80, null, 5, null, 'NRC', null),
(null, 'Meat & Bone Meal', 'protein', '{"pig","poultry"}', 94.0, 50.0, 10.0, 12.0, 0, null, 10.0, null, null, 10.0, 5.0, null, null, null, null, 2.60, 0.75, 1.70, null, 8, 'Banned for ruminant feeding in AU. Variable quality.', 'NRC', null),
(null, 'Tallow', 'energy', '{"cattle","pig","poultry"}', 99.0, 0, 33.0, 36.0, 0, null, 99.0, null, null, 0, 0, null, null, null, null, null, null, null, null, 5, null, 'NRC', null),
(null, 'Molasses (cane)', 'energy', '{"cattle","sheep"}', 75.0, 5.0, 10.5, 12.0, 0, null, 0, null, 50.0, 0.80, 0.08, null, 3.50, null, 0.50, null, null, null, null, 15, null, 'CSIRO', null),
(null, 'Distillers Grains (dried)', 'byproduct', '{"cattle","pig","sheep"}', 90.0, 27.0, 12.5, 14.5, 38.0, 18.0, 10.0, null, null, 0.10, 0.80, null, null, null, 0.45, 0.75, 0.50, null, null, 25, 'High sulphur — monitor total S. PEM risk >0.4% S.', 'NRC', null),
(null, 'Copra Meal', 'byproduct', '{"cattle","sheep"}', 90.0, 21.0, 11.0, 13.0, 52.0, 26.0, 7.0, null, null, 0.15, 0.60, null, null, null, null, 0.58, 0.30, null, null, 20, null, 'CSIRO', null),
(null, 'Millrun (wheat)', 'byproduct', '{"cattle","pig","sheep"}', 88.0, 16.0, 11.0, 13.0, 38.0, 12.0, 4.0, 22.0, null, 0.10, 1.00, null, null, null, null, 0.60, 0.22, null, null, 30, null, 'CSIRO', null),
(null, 'Sunflower Meal', 'protein', '{"cattle","pig","sheep"}', 90.0, 34.0, 9.0, 11.0, 40.0, 28.0, 2.5, null, null, 0.40, 1.00, null, null, null, null, 1.25, 0.80, 1.20, null, 15, null, 'CSIRO', null),
(null, 'Faba Beans', 'protein', '{"cattle","pig","poultry","sheep"}', 87.0, 26.0, 12.8, 14.5, 15.0, 9.0, 1.5, 40.0, null, 0.12, 0.45, null, null, null, null, 1.60, 0.20, 0.90, null, 20, 'Contains tannins and vicine/convicine. Heat treatment improves digestibility.', 'CSIRO', null),
(null, 'Field Peas', 'protein', '{"cattle","pig","poultry","sheep"}', 88.0, 23.0, 13.0, 14.8, 14.0, 7.0, 1.2, 45.0, null, 0.08, 0.40, null, null, null, null, 1.55, 0.22, 0.82, null, 25, null, 'CSIRO', null);

-- ── ANIMAL REQUIREMENTS ──────────────────────────────────────────────

-- CATTLE
INSERT INTO public.animal_requirements (nutritionist_id, species, production_stage, stage_name, stage_description, requirements, ratios, source) VALUES
(null, 'cattle', 'lactation', 'Lactation', 'High-producing dairy cows, 20-45L/day',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":16,"max":18,"target":17,"critical_max":22},{"nutrient":"Metabolisable Energy (ME)","unit":"MJ/kg","min":11.5,"max":13.5,"target":12.5},{"nutrient":"NDF","unit":"%","min":28,"max":40,"target":33,"critical_min":25},{"nutrient":"ADF","unit":"%","min":17,"max":21,"target":19},{"nutrient":"Fat (EE)","unit":"%","min":3,"max":6,"target":5,"critical_max":7},{"nutrient":"Calcium (Ca)","unit":"%","min":0.60,"max":1.00,"target":0.80,"critical_max":1.5},{"nutrient":"Phosphorus (P)","unit":"%","min":0.30,"max":0.50,"target":0.40,"critical_max":0.80},{"nutrient":"Magnesium (Mg)","unit":"%","min":0.20,"max":0.35,"target":0.28,"critical_min":0.15},{"nutrient":"Potassium (K)","unit":"%","min":1.00,"max":1.50,"target":1.20,"critical_max":2.5},{"nutrient":"Sodium (Na)","unit":"%","min":0.18,"max":0.40,"target":0.25},{"nutrient":"Sulphur (S)","unit":"%","min":0.20,"max":0.25,"target":0.22,"critical_max":0.40},{"nutrient":"Lysine","unit":"% of CP","min":6.6,"max":7.2,"target":6.9},{"nutrient":"Methionine","unit":"% of CP","min":1.8,"max":2.4,"target":2.1}]'::jsonb,
  '[{"name":"Ca:P","min":1.5,"max":2.5,"target":2.0},{"name":"DCAD","min":200,"max":400,"target":300,"unit":"mEq/kg"}]'::jsonb,
  'CSIRO'),
(null, 'cattle', 'dry_cow', 'Dry Cow', 'Non-lactating, late gestation 220+ days',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":12,"max":14,"target":13,"critical_max":18},{"nutrient":"Metabolisable Energy (ME)","unit":"MJ/kg","min":8.5,"max":10.5,"target":9.5},{"nutrient":"NDF","unit":"%","min":35,"max":50,"target":42,"critical_min":30},{"nutrient":"Calcium (Ca)","unit":"%","min":0.40,"max":0.60,"target":0.50,"critical_max":1.0},{"nutrient":"Phosphorus (P)","unit":"%","min":0.25,"max":0.35,"target":0.30},{"nutrient":"Magnesium (Mg)","unit":"%","min":0.35,"max":0.45,"target":0.40,"critical_min":0.25}]'::jsonb,
  '[{"name":"Ca:P","min":1.5,"max":2.0,"target":1.7},{"name":"DCAD","min":-100,"max":-50,"target":-75,"unit":"mEq/kg"}]'::jsonb,
  'CSIRO'),
(null, 'cattle', 'growing', 'Growing (Heifers)', 'Replacement heifers 6-24 months, 0.7-0.9 kg/day ADG',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":14,"max":16,"target":15,"critical_max":20},{"nutrient":"Metabolisable Energy (ME)","unit":"MJ/kg","min":10,"max":12,"target":11},{"nutrient":"NDF","unit":"%","min":30,"max":45,"target":38,"critical_min":25},{"nutrient":"Calcium (Ca)","unit":"%","min":0.40,"max":0.70,"target":0.55,"critical_max":1.2},{"nutrient":"Phosphorus (P)","unit":"%","min":0.25,"max":0.40,"target":0.32}]'::jsonb,
  '[{"name":"Ca:P","min":1.5,"max":2.5,"target":2.0}]'::jsonb,
  'CSIRO'),
(null, 'cattle', 'finishing', 'Finishing (Feedlot)', 'Feedlot cattle 300-600kg, 1.2-2.0 kg/day ADG',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":12,"max":14.5,"target":13,"critical_max":18},{"nutrient":"Metabolisable Energy (ME)","unit":"MJ/kg","min":12,"max":13.5,"target":12.8},{"nutrient":"NDF","unit":"%","min":15,"max":25,"target":20,"critical_min":12},{"nutrient":"Calcium (Ca)","unit":"%","min":0.50,"max":0.80,"target":0.65},{"nutrient":"Phosphorus (P)","unit":"%","min":0.30,"max":0.45,"target":0.35}]'::jsonb,
  '[{"name":"Ca:P","min":1.5,"max":2.5,"target":2.0}]'::jsonb,
  'CSIRO'),

-- PIGS
(null, 'pig', 'grower', 'Grower (25-60 kg)', 'Growing pigs 25-60 kg, rapid lean gain phase',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":17,"max":19,"target":18,"critical_max":23},{"nutrient":"Digestible Energy (DE)","unit":"MJ/kg","min":13.5,"max":14.5,"target":14},{"nutrient":"Lysine (SID)","unit":"%","min":0.95,"max":1.10,"target":1.02},{"nutrient":"Meth+Cyst (SID)","unit":"%","min":0.56,"max":0.66,"target":0.61},{"nutrient":"Threonine (SID)","unit":"%","min":0.62,"max":0.72,"target":0.67},{"nutrient":"Calcium (Ca)","unit":"%","min":0.60,"max":0.75,"target":0.68,"critical_max":1.0},{"nutrient":"Available P","unit":"%","min":0.28,"max":0.38,"target":0.33}]'::jsonb,
  '[{"name":"Lys:ME","min":0.68,"max":0.80,"target":0.73,"unit":"g/MJ"}]'::jsonb,
  'CSIRO'),
(null, 'pig', 'finisher', 'Finisher (60-110 kg)', 'Finishing pigs to market weight',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":14.5,"max":16.5,"target":15.5,"critical_max":20},{"nutrient":"Digestible Energy (DE)","unit":"MJ/kg","min":13.5,"max":14.5,"target":14},{"nutrient":"Lysine (SID)","unit":"%","min":0.72,"max":0.85,"target":0.78},{"nutrient":"Calcium (Ca)","unit":"%","min":0.50,"max":0.65,"target":0.58,"critical_max":0.90},{"nutrient":"Available P","unit":"%","min":0.22,"max":0.32,"target":0.27}]'::jsonb,
  '[{"name":"Lys:ME","min":0.52,"max":0.62,"target":0.56,"unit":"g/MJ"}]'::jsonb,
  'CSIRO'),
(null, 'pig', 'lactation', 'Lactation Sow', 'Sows nursing piglets, high nutrient demand',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":17,"max":19,"target":18,"critical_max":22},{"nutrient":"Digestible Energy (DE)","unit":"MJ/kg","min":13.5,"max":14.5,"target":14},{"nutrient":"Lysine (SID)","unit":"%","min":0.95,"max":1.10,"target":1.02},{"nutrient":"Calcium (Ca)","unit":"%","min":0.75,"max":0.90,"target":0.85,"critical_max":1.2},{"nutrient":"Available P","unit":"%","min":0.35,"max":0.45,"target":0.40},{"nutrient":"Crude Fibre (CF)","unit":"%","min":null,"max":7,"target":5,"critical_max":10}]'::jsonb,
  '[{"name":"Ca:P","min":1.2,"max":1.5,"target":1.3}]'::jsonb,
  'CSIRO'),
(null, 'pig', 'gestation', 'Gestation Sow', 'Pregnant sows, controlled energy intake',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":13,"max":15,"target":14,"critical_max":20},{"nutrient":"Digestible Energy (DE)","unit":"MJ/kg","min":12.5,"max":13.5,"target":13},{"nutrient":"Lysine (SID)","unit":"%","min":0.55,"max":0.65,"target":0.60},{"nutrient":"Calcium (Ca)","unit":"%","min":0.70,"max":0.85,"target":0.75},{"nutrient":"Crude Fibre (CF)","unit":"%","min":5,"max":12,"target":8,"critical_max":15}]'::jsonb,
  '[{"name":"Ca:P","min":1.2,"max":1.5,"target":1.3}]'::jsonb,
  'CSIRO'),

-- POULTRY
(null, 'poultry', 'starter', 'Starter (0-10 days)', 'Broiler chicks, rapid early growth phase',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":22,"max":24,"target":23,"critical_max":27},{"nutrient":"ME (Poultry)","unit":"MJ/kg","min":12.5,"max":13.0,"target":12.8},{"nutrient":"Lysine (dig)","unit":"%","min":1.25,"max":1.35,"target":1.30},{"nutrient":"Meth+Cyst (dig)","unit":"%","min":0.94,"max":1.02,"target":0.98},{"nutrient":"Calcium (Ca)","unit":"%","min":0.90,"max":1.05,"target":0.96,"critical_max":1.3},{"nutrient":"Available P","unit":"%","min":0.45,"max":0.50,"target":0.48}]'::jsonb,
  '[{"name":"Ca:avP","min":1.8,"max":2.2,"target":2.0}]'::jsonb,
  'CSIRO'),
(null, 'poultry', 'grower', 'Grower (11-24 days)', 'Broilers rapid growth, feed efficiency focus',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":20,"max":22,"target":21,"critical_max":25},{"nutrient":"ME (Poultry)","unit":"MJ/kg","min":12.8,"max":13.2,"target":13.0},{"nutrient":"Lysine (dig)","unit":"%","min":1.10,"max":1.20,"target":1.15},{"nutrient":"Calcium (Ca)","unit":"%","min":0.80,"max":0.95,"target":0.87,"critical_max":1.2},{"nutrient":"Available P","unit":"%","min":0.40,"max":0.48,"target":0.44}]'::jsonb,
  '[{"name":"Ca:avP","min":1.8,"max":2.2,"target":2.0}]'::jsonb,
  'CSIRO'),
(null, 'poultry', 'layer', 'Layer', 'Laying hens >18 weeks, egg production focus',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":16,"max":18,"target":17,"critical_max":22},{"nutrient":"ME (Poultry)","unit":"MJ/kg","min":11.0,"max":11.8,"target":11.5},{"nutrient":"Lysine (dig)","unit":"%","min":0.73,"max":0.82,"target":0.77},{"nutrient":"Calcium (Ca)","unit":"%","min":3.50,"max":4.20,"target":3.80,"critical_max":4.8},{"nutrient":"Available P","unit":"%","min":0.30,"max":0.40,"target":0.35}]'::jsonb,
  '[{"name":"Ca:avP","min":8,"max":12,"target":10}]'::jsonb,
  'CSIRO'),

-- SHEEP
(null, 'sheep', 'maintenance', 'Maintenance', 'Dry ewes and wethers, maintenance requirements',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":8,"max":12,"target":10},{"nutrient":"Metabolisable Energy (ME)","unit":"MJ/kg","min":7.5,"max":9.5,"target":8.5},{"nutrient":"NDF","unit":"%","min":35,"max":60,"target":45,"critical_min":25},{"nutrient":"Calcium (Ca)","unit":"%","min":0.25,"max":0.50,"target":0.35,"critical_max":1.0},{"nutrient":"Phosphorus (P)","unit":"%","min":0.18,"max":0.30,"target":0.22}]'::jsonb,
  '[{"name":"Ca:P","min":1.5,"max":2.5,"target":2.0}]'::jsonb,
  'CSIRO'),
(null, 'sheep', 'lactation', 'Lactation (Ewes)', 'Lactating ewes, twins or singles, peak milk',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":14,"max":18,"target":16,"critical_max":22},{"nutrient":"Metabolisable Energy (ME)","unit":"MJ/kg","min":10,"max":12,"target":11},{"nutrient":"NDF","unit":"%","min":28,"max":40,"target":35,"critical_min":22},{"nutrient":"Calcium (Ca)","unit":"%","min":0.40,"max":0.80,"target":0.60},{"nutrient":"Phosphorus (P)","unit":"%","min":0.25,"max":0.40,"target":0.30},{"nutrient":"Magnesium (Mg)","unit":"%","min":0.18,"max":0.25,"target":0.20,"critical_min":0.12}]'::jsonb,
  '[{"name":"Ca:P","min":1.5,"max":2.5,"target":2.0}]'::jsonb,
  'CSIRO'),
(null, 'sheep', 'finishing', 'Finishing (Lambs)', 'Lambs 25-55 kg, feedlot finishing 200-350g/day ADG',
  '[{"nutrient":"Crude Protein (CP)","unit":"%","min":14,"max":17,"target":15.5,"critical_max":20},{"nutrient":"Metabolisable Energy (ME)","unit":"MJ/kg","min":11,"max":13,"target":12},{"nutrient":"NDF","unit":"%","min":18,"max":30,"target":25,"critical_min":15},{"nutrient":"Calcium (Ca)","unit":"%","min":0.45,"max":0.70,"target":0.55},{"nutrient":"Phosphorus (P)","unit":"%","min":0.25,"max":0.40,"target":0.30}]'::jsonb,
  '[{"name":"Ca:P","min":1.5,"max":2.5,"target":2.0}]'::jsonb,
  'CSIRO');

-- ── SAFETY RULES ─────────────────────────────────────────────────────

INSERT INTO public.safety_rules (nutritionist_id, species, severity, title, description, detail, ingredient_name, source, active) VALUES
-- Cattle
(null, 'cattle', 'danger', 'Urea toxicity', 'Urea inclusion must never exceed 1% of total diet DM. Lethal dose is approximately 0.44 g/kg body weight. Animals must be adapted gradually over 2-3 weeks.', 'Max inclusion: 1.0% DM | Lethal: 0.44 g/kg BW | Adaptation: 14-21 days', 'Urea', 'CSIRO', true),
(null, 'cattle', 'danger', 'Grain acidosis (lactic acidosis)', 'Rapid introduction of high-starch concentrates can cause acute ruminal acidosis. Grain should not exceed 65% of diet without proper adaptation.', 'Max grain: 60-65% DM | Min effective NDF: 25% | Adaptation: 14-21 days', null, 'CSIRO', true),
(null, 'cattle', 'danger', 'Nitrate poisoning', 'High-nitrate forages (>0.5% NO₃ as fed) can be lethal. Monitor drought-stressed crops and fertilised pastures.', 'Safe: <0.5% NO₃ | Caution: 0.5-1.0% | Dangerous: >1.0%', null, 'CSIRO', true),
(null, 'cattle', 'warning', 'Gossypol toxicity — Cottonseed', 'Free gossypol from cottonseed can cause cardiac and reproductive issues.', 'Whole cottonseed max: 15% DM | CSM max: 12% DM | Free gossypol: <500 ppm', 'Cottonseed Meal', 'CSIRO', true),
(null, 'cattle', 'warning', 'Sulphur toxicity — PEM risk', 'Excess dietary sulphur (>0.4% DM) can cause polioencephalomalacia.', 'Max S: 0.40% DM | Water S: <500 ppm', null, 'CSIRO', true),
(null, 'cattle', 'warning', 'Ionophore safety', 'Monensin and lasalocid have narrow safety margins. Never combine with tiamulin. Lethal to horses.', 'Monensin: 11-33 ppm | LD50 cattle: ~50 ppm | LETHAL to horses at any level', null, 'NRC', true),
(null, 'cattle', 'info', 'Ca:P ratio maintenance', 'Calcium to phosphorus ratio should remain between 1.5:1 and 2.5:1.', 'Target Ca:P: 2:1 | Never allow P > Ca for extended periods', null, 'CSIRO', true),
(null, 'cattle', 'info', 'Vitamin A supplementation', 'Cattle on dry feed for >60 days require vitamin A supplementation.', 'Requirement: 40,000-75,000 IU/day (adult)', null, 'CSIRO', true),

-- Pigs
(null, 'pig', 'danger', 'Salt poisoning (water deprivation)', 'Pigs are highly susceptible to salt toxicity, especially if water access is restricted.', 'Max NaCl: 0.50% diet | ALWAYS ensure ad-lib water | Acute lethal: 2.5 g/kg BW', 'Salt (NaCl)', 'NRC', true),
(null, 'pig', 'danger', 'Selenium toxicity', 'Selenium has a very narrow safety margin in pigs. Total dietary Se must not exceed 5 ppm.', 'Requirement: 0.15-0.30 ppm | Max safe: 5 ppm | Acute lethal: >10 ppm', null, 'NRC', true),
(null, 'pig', 'danger', 'Gossypol toxicity — Cottonseed', 'Pigs are highly sensitive to gossypol. Cottonseed meal must be limited or avoided.', 'Max free gossypol: 100 ppm | Avoid whole cottonseed | CSM max: 5%', 'Cottonseed Meal', 'NRC', true),
(null, 'pig', 'warning', 'Trypsin inhibitors — Raw soybeans', 'Raw soybeans contain trypsin inhibitors. Only use heat-treated soybean meal.', 'Use heat-treated SBM only (urease activity <0.2 pH units)', 'Soybean Meal (46%)', 'NRC', true),
(null, 'pig', 'warning', 'Excess calcium — Growth impairment', 'Excess dietary Ca reduces Zn and P absorption and impairs growth.', 'Max Ca: 1.0% grower/finisher | 1.2% sows | Maintain Ca:P 1.2-1.5:1', null, 'NRC', true),
(null, 'pig', 'info', 'Ideal protein concept', 'Amino acids should be balanced relative to lysine.', 'Ideal ratios to Lys: Met+Cys 60% | Thr 65% | Trp 19% | Val 68%', null, 'NRC', true),

-- Poultry
(null, 'poultry', 'danger', 'Ionophore + Tiamulin interaction', 'Combining ionophore coccidiostats with tiamulin causes acute toxicity and death.', 'NEVER combine ionophores with tiamulin | 7-day withdrawal required', null, 'NRC', true),
(null, 'poultry', 'danger', 'Excess Calcium — Broilers', 'Excess Ca (>1.2%) in broiler diets causes growth depression and kidney damage.', 'Broiler max Ca: 1.0-1.2% | Layer Ca: 3.5-4.2% | Never use layer feed for broilers', null, 'NRC', true),
(null, 'poultry', 'danger', 'Mycotoxin contamination', 'Aflatoxin, DON, fumonisin in feed grains cause liver damage and immunosuppression.', 'Aflatoxin B1 max: 20 ppb | DON max: 5 ppm | Fumonisins max: 20 ppm', null, 'NRC', true),
(null, 'poultry', 'warning', 'NSP factors — Barley/Wheat', 'High NSP levels increase digesta viscosity. Use NSP enzymes.', 'Add xylanase + β-glucanase for barley/wheat diets', 'Barley (rolled)', 'CSIRO', true),
(null, 'poultry', 'info', 'Amino acid balance', 'Diet must meet digestible amino acid requirements precisely.', 'Balance to dig Lys: Met+Cys 75% | Thr 67% | Trp 16% | Val 77%', null, 'NRC', true),

-- Sheep
(null, 'sheep', 'danger', 'Copper toxicity — CRITICAL', 'Sheep are extremely sensitive to copper. NEVER use cattle or pig mineral mixes.', 'Max Cu: 10 ppm total diet | Merinos most susceptible | NEVER feed cattle minerals to sheep', null, 'CSIRO', true),
(null, 'sheep', 'danger', 'Grain poisoning (acidosis)', 'Sheep are highly susceptible to grain overload. Sudden access is often fatal.', 'Max grain intro: 50g/head/day increase | Full adaptation: 21-28 days | Max grain: 60% DM', null, 'CSIRO', true),
(null, 'sheep', 'danger', 'Enterotoxaemia (Pulpy kidney)', 'High-grain diets promote Clostridium perfringens type D. Vaccination essential.', 'Vaccinate 2 weeks before grain introduction | Booster at 4 weeks', null, 'CSIRO', true),
(null, 'sheep', 'warning', 'Urinary calculi — Wethers', 'Wethers on high-grain diets are susceptible to urolithiasis.', 'Ca:P must be >2:1 | Add NH₄Cl at 0.5-1.0% diet', null, 'CSIRO', true),
(null, 'sheep', 'warning', 'Calcium deficiency — Lactation', 'Ewes with twins are susceptible to hypocalcaemia in late pregnancy.', 'Min Ca lactation: 0.40% | Supplement limestone', null, 'CSIRO', true),
(null, 'sheep', 'info', 'Selenium + Vitamin E', 'Lambs in Se-deficient regions require supplementation.', 'Se requirement: 0.1-0.3 ppm | Vit E: 20-30 IU/kg', null, 'CSIRO', true);

-- ── VERIFY ───────────────────────────────────────────────────────────
SELECT 'Ingredients: ' || count(*) FROM public.ingredients WHERE nutritionist_id IS NULL
UNION ALL
SELECT 'Requirements: ' || count(*) FROM public.animal_requirements WHERE nutritionist_id IS NULL
UNION ALL
SELECT 'Safety Rules: ' || count(*) FROM public.safety_rules WHERE nutritionist_id IS NULL;
