// lib/seed-user-data.ts
// ============================================
// OPTIA FEED — Species-Aware Data Seeding
// Creates demo client + animal group + formula + ingredients + safety rules
// + reference price bank (AUD Q1 2026) for each new user.
// ============================================

import { SupabaseClient } from '@supabase/supabase-js'

type FormSpecies = 'dairy' | 'beef' | 'sheep' | 'pig' | 'poultry'

// ── species del form → species en DB ────────
// El form usa 'dairy' pero en animal_requirements está como 'cattle'
const SPECIES_DB_MAP: Record<FormSpecies, string> = {
  dairy: 'cattle',
  beef: 'beef',
  sheep: 'sheep',
  pig: 'pig',
  poultry: 'poultry',
}

interface SeedConfig {
  clientName: string
  clientContactName: string
  clientLocation: string
  animalName: string
  animalBreed: string
  animalProductionStage: string
  animalCount: number
  animalWeight: number
  animalNotes: string
  requirementProfileId: string
  formulaName: string
  formulaIngredients: Array<{
    ingredientId: string
    inclusionPct: number
    costPerTonne: number
  }>
  safetyRules: Array<{
    title: string
    description: string
    detail: string
    severity: string
  }>
}

// ── Configs por especie con IDs verificados ──

const SEED_CONFIGS: Record<FormSpecies, SeedConfig> = {
  // ───── DAIRY ─────────────────────────────
  dairy: {
    clientName: 'Demo Dairy Farm',
    clientContactName: 'John Smith',
    clientLocation: 'Bendigo, VIC',
    animalName: 'Milking Herd — Early Lactation',
    animalBreed: 'Holstein',
    animalProductionStage: 'early_lactation',
    animalCount: 120,
    animalWeight: 650,
    animalNotes: 'Demo herd — edit or delete once you add your real clients.',
    requirementProfileId: '2841dda2-68c6-4575-b2b8-7ef0cea0f1f4',
    formulaName: 'Demo — Dairy TMR (Early Lactation)',
    formulaIngredients: [
      { ingredientId: '32a16dc0-d3e8-4ed8-8943-26f9f4d08e81', inclusionPct: 35, costPerTonne: 85 },   // Maize silage
      { ingredientId: 'facd9d61-4037-4bee-bf13-f86639a8311b', inclusionPct: 20, costPerTonne: 320 },  // Lucerne hay
      { ingredientId: '3ec92489-4098-4dc1-a0a2-37149150fb6b', inclusionPct: 20, costPerTonne: 420 },  // Maize grain
      { ingredientId: 'd308ba74-a8b2-4b95-bd42-554f0f239c92', inclusionPct: 10, costPerTonne: 380 },  // Barley grain
      { ingredientId: '176e6085-c209-4e9d-97f6-ac7fa0b9d6ff', inclusionPct: 10, costPerTonne: 180 },  // Brewers grain (wet)
      { ingredientId: '3eac2894-8e49-4165-b939-a4f04dbccf40', inclusionPct: 5,  costPerTonne: 650 },  // Sodium Bicarbonate
    ],
    safetyRules: [
      { title: 'Min NDF', description: 'Minimum NDF to prevent acidosis', detail: 'Keep NDF ≥ 28% in dairy diets to maintain rumen health', severity: 'warning' },
      { title: 'Max NFC', description: 'Maximum non-fibre carbohydrates', detail: 'NFC should not exceed 42% to prevent acidosis and laminitis', severity: 'critical' },
      { title: 'Min forage NDF', description: 'Minimum forage-derived NDF', detail: 'Forage NDF ≥ 18% ensures effective fibre and rumen function', severity: 'warning' },
    ],
  },

  // ───── BEEF ──────────────────────────────
  beef: {
    clientName: 'Demo Feedlot',
    clientContactName: 'Michael Brown',
    clientLocation: 'Shepparton, VIC',
    animalName: 'Pen A — Finishing Steers',
    animalBreed: 'Angus',
    animalProductionStage: 'feedlot_finisher',
    animalCount: 200,
    animalWeight: 520,
    animalNotes: 'Demo pen — 100-day feedlot program targeting MSA.',
    requirementProfileId: '9439391b-32c9-4b9a-9ec6-838ddf6bc6e5',
    formulaName: 'Demo — Feedlot Finisher',
    formulaIngredients: [
      { ingredientId: '9998d80b-e343-4daa-adb8-6716ffd8cc52', inclusionPct: 40, costPerTonne: 380 },  // Sorghum grain
      { ingredientId: 'd308ba74-a8b2-4b95-bd42-554f0f239c92', inclusionPct: 25, costPerTonne: 380 },  // Barley grain
      { ingredientId: 'f6d5eb71-9563-4cf4-ac75-eb043487a7d0', inclusionPct: 15, costPerTonne: 280 },  // Oaten hay
      { ingredientId: 'e684454e-ec56-4092-b052-5ff26d1dc072', inclusionPct: 10, costPerTonne: 520 },  // Distillers grains - Maize
      { ingredientId: '19f3e739-2e16-4afb-a04b-e41e858d7e47', inclusionPct: 5,  costPerTonne: 260 },  // Molasses (cane)
      { ingredientId: '3eac2894-8e49-4165-b939-a4f04dbccf40', inclusionPct: 5,  costPerTonne: 650 },  // Sodium Bicarbonate
    ],
    safetyRules: [
      { title: 'Max urea', description: 'Limit urea inclusion', detail: 'Urea should not exceed 1% of total DM to prevent toxicity', severity: 'critical' },
      { title: 'Min roughage NDF', description: 'Minimum roughage for rumen health', detail: 'Keep roughage NDF ≥ 8% in finisher diets', severity: 'warning' },
      { title: 'Max grain inclusion', description: 'Limit total grain', detail: 'Total grain should not exceed 85% to prevent acidosis', severity: 'warning' },
    ],
  },

  // ───── SHEEP ─────────────────────────────
  sheep: {
    clientName: 'Demo Sheep Station',
    clientContactName: 'Robert Wilson',
    clientLocation: 'Hamilton, VIC',
    animalName: 'Ewes — Lactation',
    animalBreed: 'Merino',
    animalProductionStage: 'ewe_lactation',
    animalCount: 500,
    animalWeight: 70,
    animalNotes: 'Twin-bearing ewes, 6 weeks post-lamb.',
    requirementProfileId: 'e272ebf4-db32-4878-9e81-2d9fba854d1a',
    formulaName: 'Demo — Ewe Lactation Supplement',
    formulaIngredients: [
      { ingredientId: 'dfecc620-e2c0-48db-bcc1-0ab26464cfb6', inclusionPct: 50, costPerTonne: 180 },  // Lucerne grazed dryland
      { ingredientId: 'd308ba74-a8b2-4b95-bd42-554f0f239c92', inclusionPct: 25, costPerTonne: 380 },  // Barley grain
      { ingredientId: 'b60959a1-a362-4e33-9c5e-096e1d11ec28', inclusionPct: 15, costPerTonne: 340 },  // Oats grain
      { ingredientId: '0eb8b9eb-b02d-4c31-9d53-04affa17e047', inclusionPct: 10, costPerTonne: 250 },  // Cereal Hay (oaten)
    ],
    safetyRules: [
      { title: 'Max copper', description: 'Sheep are sensitive to copper', detail: 'Keep total copper ≤ 15 ppm — higher levels cause toxicity in sheep', severity: 'critical' },
      { title: 'Max urea', description: 'Limit urea', detail: 'Urea should not exceed 1% of DM to prevent toxicity', severity: 'critical' },
    ],
  },

  // ───── PIG ───────────────────────────────
  pig: {
    clientName: 'Demo Piggery',
    clientContactName: 'David Thompson',
    clientLocation: 'Ballarat, VIC',
    animalName: 'Growers — Barn A',
    animalBreed: 'Large White x Landrace',
    animalProductionStage: 'grower_41_59',
    animalCount: 600,
    animalWeight: 50,
    animalNotes: 'Growers 41-59 kg, target 850 g/day ADG.',
    requirementProfileId: 'bbd99ebe-a853-4f6f-ae63-43a83182fe55',
    formulaName: 'Demo — Grower Diet (PIC SID Lys 0.95)',
    formulaIngredients: [
      { ingredientId: '52150009-53ef-4308-ab40-c29a0d39e008', inclusionPct: 60, costPerTonne: 450 },  // Wheat grain
      { ingredientId: 'd308ba74-a8b2-4b95-bd42-554f0f239c92', inclusionPct: 15, costPerTonne: 380 },  // Barley grain
      { ingredientId: '67b661c4-1bb3-4417-ad9b-1e492955e68c', inclusionPct: 15, costPerTonne: 540 },  // Distillers grains - Wheat
      { ingredientId: '2fe638ca-e38e-4821-88d8-778e14e33798', inclusionPct: 8,  costPerTonne: 380 },  // Wheat bran
      { ingredientId: '1a8e48c1-a457-49f5-8a9f-3460282ec390', inclusionPct: 2,  costPerTonne: 1200 }, // Tallow
    ],
    safetyRules: [
      { title: 'Min SID Lysine', description: 'Lysine requirement', detail: 'SID Lys ≥ 0.85% for 41-59 kg growers', severity: 'critical' },
      { title: 'Max salt', description: 'Salt inclusion limit', detail: 'Keep salt ≤ 0.5% to prevent water intake issues', severity: 'warning' },
      { title: 'Min Lys:NE ratio', description: 'Amino acid to energy ratio', detail: 'Lys:NE ≥ 0.70 g/MJ for optimal protein deposition', severity: 'warning' },
    ],
  },

  // ───── POULTRY ───────────────────────────
  poultry: {
    clientName: 'Demo Poultry Farm',
    clientContactName: 'Sarah Mitchell',
    clientLocation: 'Kyabram, VIC',
    animalName: 'Broilers — Starter',
    animalBreed: 'Ross 308',
    animalProductionStage: 'broiler_starter',
    animalCount: 25000,
    animalWeight: 0.15,
    animalNotes: 'Day-old broilers, target 250g by day 10.',
    requirementProfileId: 'eba27250-6c75-49ed-b340-d5b49f03b9fe',
    formulaName: 'Demo — Broiler Starter',
    formulaIngredients: [
      { ingredientId: '3ec92489-4098-4dc1-a0a2-37149150fb6b', inclusionPct: 55, costPerTonne: 420 },  // Maize grain
      { ingredientId: '52150009-53ef-4308-ab40-c29a0d39e008', inclusionPct: 20, costPerTonne: 450 },  // Wheat grain
      { ingredientId: '6b63d820-1d80-4b4f-980a-2c90689b0b4a', inclusionPct: 15, costPerTonne: 980 },  // Corn gluten meal
      { ingredientId: '08e9523c-2f67-4fa3-85ae-ec31633232d8', inclusionPct: 5,  costPerTonne: 1800 }, // Vegetable oil
      { ingredientId: '1a8e48c1-a457-49f5-8a9f-3460282ec390', inclusionPct: 5,  costPerTonne: 1200 }, // Tallow
    ],
    safetyRules: [
      { title: 'Min digestible Lysine', description: 'Starter lysine minimum', detail: 'Digestible Lys ≥ 1.28% for optimal growth', severity: 'critical' },
      { title: 'Min linoleic acid', description: 'Essential fatty acid', detail: 'Linoleic acid ≥ 1.0% for skin and plumage', severity: 'warning' },
      { title: 'Max Ca:aP ratio', description: 'Calcium phosphorus balance', detail: 'Ca:aP ≤ 2.1:1 to avoid phosphorus deficiency', severity: 'warning' },
    ],
  },
}

// ════════════════════════════════════════════════════════════════
// REFERENCE PRICE BANK (AUD Q1 2026)
// Loaded for ALL new users so the optimizer & cost calculations
// work out-of-the-box. Nutritionists adjust to their own suppliers.
// ════════════════════════════════════════════════════════════════
const REFERENCE_PRICES_AUD: Array<{ namePattern: string; price: number }> = [
  // Cereales y granos
  { namePattern: 'Wheat grain', price: 380 },
  { namePattern: 'Wheat', price: 380 },
  { namePattern: 'Barley grain', price: 360 },
  { namePattern: 'Barley', price: 360 },
  { namePattern: 'Maize grain', price: 420 },
  { namePattern: 'Corn grain', price: 420 },
  { namePattern: 'Sorghum grain', price: 380 },
  { namePattern: 'Oats grain', price: 350 },
  { namePattern: 'Triticale grain', price: 360 },
  // Proteínas vegetales
  { namePattern: 'Canola meal', price: 540 },
  { namePattern: 'Soybean meal', price: 780 },
  { namePattern: 'Soybean meal 48', price: 800 },
  { namePattern: 'Soybean meal 44', price: 760 },
  { namePattern: 'Cottonseed meal', price: 620 },
  { namePattern: 'Sunflower meal', price: 480 },
  { namePattern: 'Lupins (whole)', price: 540 },
  { namePattern: 'Lupins', price: 540 },
  { namePattern: 'Faba beans', price: 520 },
  { namePattern: 'Field peas', price: 500 },
  // Forrajes
  { namePattern: 'Lucerne hay', price: 480 },
  { namePattern: 'Alfalfa hay', price: 480 },
  { namePattern: 'Lucerne grazed dryland', price: 180 },
  { namePattern: 'Cereal Hay (oaten)', price: 320 },
  { namePattern: 'Oaten hay', price: 320 },
  { namePattern: 'Wheaten hay', price: 310 },
  { namePattern: 'Pasture hay', price: 280 },
  { namePattern: 'Vetch hay', price: 360 },
  // Silajes
  { namePattern: 'Maize silage', price: 180 },
  { namePattern: 'Corn silage', price: 180 },
  { namePattern: 'Ryegrass/clover silage - Good - Pit', price: 165 },
  { namePattern: 'Ryegrass silage', price: 160 },
  { namePattern: 'Pasture silage', price: 155 },
  { namePattern: 'Lucerne silage', price: 200 },
  // Subproductos
  { namePattern: 'Wheat bran', price: 320 },
  { namePattern: 'Wheat pollard', price: 340 },
  { namePattern: 'Rice bran', price: 380 },
  { namePattern: 'Almond hulls', price: 240 },
  { namePattern: 'Citrus pulp', price: 280 },
  { namePattern: 'Brewers grains (wet)', price: 90 },
  { namePattern: 'Brewers grain (wet)', price: 90 },
  { namePattern: 'Brewers grains (dry)', price: 380 },
  { namePattern: 'DDGS', price: 480 },
  { namePattern: 'Distillers grains - Wheat', price: 540 },
  { namePattern: 'Distillers grains - Maize', price: 520 },
  { namePattern: 'Corn gluten meal', price: 980 },
  { namePattern: 'Molasses', price: 420 },
  { namePattern: 'Molasses (cane)', price: 260 },
  { namePattern: 'Tallow', price: 1450 },
  { namePattern: 'Vegetable oil', price: 1850 },
  // Minerales
  { namePattern: 'Limestone (CaC03)', price: 180 },
  { namePattern: 'Limestone', price: 180 },
  { namePattern: 'Dicalcium phosphate', price: 1450 },
  { namePattern: 'DCP', price: 1450 },
  { namePattern: 'Monocalcium phosphate', price: 1650 },
  { namePattern: 'MCP', price: 1650 },
  { namePattern: 'Salt (NaCl)', price: 380 },
  { namePattern: 'Salt', price: 380 },
  { namePattern: 'Sodium bicarbonate', price: 950 },
  { namePattern: 'Sodium Bicarbonate', price: 950 },
  { namePattern: 'Magnesium oxide', price: 880 },
  // Aditivos
  { namePattern: 'Urea (feed grade)', price: 880 },
  { namePattern: 'Urea', price: 880 },
  { namePattern: 'Ammonium chloride', price: 1200 },
  { namePattern: 'Yeast (live)', price: 4500 },
  { namePattern: 'Mycotoxin binder', price: 3800 },
]

// ── Seed reference prices (idempotent, non-blocking) ──
async function seedReferencePrices(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    // 1. Skip if user already has prices loaded (idempotency)
    const { count, error: countError } = await supabase
      .from('ingredient_prices')
      .select('*', { count: 'exact', head: true })
      .eq('nutritionist_id', userId)

    if (countError) {
      console.warn('Price count check failed (non-fatal):', countError)
    }

    if (count && count > 0) {
      console.log(`✓ User ${userId} already has ${count} prices — skipping reference seed`)
      return
    }

    // 2. Get all ingredients matching our reference price patterns
    // We fetch them once and match in JS to avoid N queries
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('id, name')

    if (ingError || !ingredients) {
      console.warn('Could not fetch ingredients for price seed (non-fatal):', ingError)
      return
    }

    // 3. Match patterns to ingredient IDs (case-insensitive exact match on name)
    const priceRows: Array<{
      ingredient_id: string
      nutritionist_id: string
      price_per_tonne: number
      currency: string
      effective_date: string
      supplier: string
      notes: string
    }> = []

    const seenIngredients = new Set<string>()

    for (const ref of REFERENCE_PRICES_AUD) {
      const match = ingredients.find(
        i => i.name.toLowerCase() === ref.namePattern.toLowerCase()
      )
      if (match && !seenIngredients.has(match.id)) {
        priceRows.push({
          ingredient_id: match.id,
          nutritionist_id: userId,
          price_per_tonne: ref.price,
          currency: 'AUD',
          effective_date: new Date().toISOString().slice(0, 10),
          supplier: 'Market reference Q1 2026',
          notes: 'Auto-loaded reference price — adjust to your suppliers',
        })
        seenIngredients.add(match.id)
      }
    }

    if (priceRows.length === 0) {
      console.warn('No ingredients matched reference price patterns')
      return
    }

    // 4. Bulk insert
    const { error: insertError } = await supabase
      .from('ingredient_prices')
      .insert(priceRows)

    if (insertError) {
      console.warn('Reference price seed failed (non-fatal):', insertError)
      return
    }

    console.log(`✓ Seeded ${priceRows.length} reference prices (AUD) for user ${userId}`)
  } catch (err) {
    // Never block signup on price seed failure
    console.warn('Reference price seed exception (non-fatal):', err)
  }
}

// ════════════════════════════════════════════════════════════════
// Main seeding function
// ════════════════════════════════════════════════════════════════
export async function seedUserData(
  supabase: SupabaseClient,
  userId: string,
  species: string[]
) {
  // Usamos la primera especie que el usuario eligió como base del demo
  const primarySpecies = species[0] as FormSpecies
  const config = SEED_CONFIGS[primarySpecies]

  if (!config) {
    console.warn(`No seed config for species: ${primarySpecies}`)
    return
  }

  const dbSpecies = SPECIES_DB_MAP[primarySpecies]

  // ── 0. Reference price bank (FIRST — so demo formula has working costs) ──
  await seedReferencePrices(supabase, userId)

  // ── 1. Cliente demo ────────────────────────
  const { data: client, error: clientError } = await supabase
    .from('nutrition_clients')
    .insert({
      nutritionist_id: userId,
      name: config.clientName,
      species: [dbSpecies],
      contact_name: config.clientContactName,
      location: config.clientLocation,
      active: true,
      notes: 'Demo client created during onboarding. Feel free to edit or delete.',
    })
    .select('id')
    .single()

  if (clientError) {
    console.error('Client creation failed:', clientError)
    throw clientError
  }

  // ── 2. Grupo de animales ───────────────────
  const { data: animal, error: animalError } = await supabase
    .from('client_animals')
    .insert({
      client_id: client.id,
      name: config.animalName,
      species: dbSpecies,
      breed: config.animalBreed,
      production_stage: config.animalProductionStage,
      count: config.animalCount,
      avg_weight_kg: config.animalWeight,
      notes: config.animalNotes,
      requirement_profile_id: config.requirementProfileId,
    })
    .select('id')
    .single()

  if (animalError) {
    console.error('Animal group creation failed:', animalError)
    throw animalError
  }

  // ── 3. Fórmula demo ────────────────────────
  const { data: formula, error: formulaError } = await supabase
    .from('formulas')
    .insert({
      nutritionist_id: userId,
      client_id: client.id,
      animal_group_id: animal.id,
      name: config.formulaName,
      species: dbSpecies,
      production_stage: config.animalProductionStage,
      breed: config.animalBreed,
      status: 'draft',
      batch_size_kg: 1000,
      notes: 'Demo formula. Edit ingredient inclusion to see real-time nutrient balancing.',
    })
    .select('id')
    .single()

  if (formulaError) {
    console.error('Formula creation failed:', formulaError)
    throw formulaError
  }

  // ── 4. Ingredientes de la fórmula ──────────
  const formulaIngredients = config.formulaIngredients.map(ing => ({
    formula_id: formula.id,
    ingredient_id: ing.ingredientId,
    inclusion_pct: ing.inclusionPct,
    cost_per_tonne: ing.costPerTonne,
    locked: false,
  }))

  const { error: ingError } = await supabase
    .from('formula_ingredients')
    .insert(formulaIngredients)

  if (ingError) {
    console.error('Formula ingredients failed (non-fatal):', ingError)
  }

  // ── 5. Safety rules del usuario ────────────
  const rulesToInsert = config.safetyRules.map(rule => ({
    nutritionist_id: userId,
    species: dbSpecies,
    severity: rule.severity,
    title: rule.title,
    description: rule.description,
    detail: rule.detail,
    active: true,
    source: 'system',
  }))

  const { error: rulesError } = await supabase
    .from('safety_rules')
    .insert(rulesToInsert)

  if (rulesError) {
    console.error('Safety rules failed (non-fatal):', rulesError)
  }

  console.log(`✓ Seeded demo data for user ${userId} (${primarySpecies})`)
}
