// lib/seed-user-data.ts
// ============================================
// OPTIA FEED — Species-Aware Data Seeding
// Seeds demo data based on species selected at signup
// ============================================

import { SupabaseClient } from '@supabase/supabase-js';

type Species = 'dairy' | 'beef' | 'sheep' | 'pig' | 'poultry';

interface SeedConfig {
  demoClientName: string;
  demoGroupName: string;
  demoGroupDescription: string;
  systemProfileIds: string[];   // IDs of system requirement profiles to assign
  demoIngredients: string[];    // IDs of common AU ingredients for this species
  demoFormulaName: string;
  safetyRules: Record<string, any>[];
}

// ── Species-specific seed configurations ─────

const SEED_CONFIGS: Record<Species, SeedConfig> = {
  dairy: {
    demoClientName: 'Demo Dairy Farm',
    demoGroupName: 'Milking herd — 600kg Holsteins',
    demoGroupDescription: '30L/day, mid-lactation, pasture + TMR',
    systemProfileIds: [], // Fill with actual IDs from your system_profiles table
    demoIngredients: [],  // Fill with actual ingredient IDs
    demoFormulaName: 'Demo — Dairy TMR (30L)',
    safetyRules: [
      { rule: 'min_ndf_percent', value: 28, label: 'Min NDF %' },
      { rule: 'max_nfc_percent', value: 42, label: 'Max NFC %' },
      { rule: 'min_forage_ndf_percent', value: 18, label: 'Min forage NDF %' },
    ],
  },
  beef: {
    demoClientName: 'Demo Feedlot',
    demoGroupName: 'Finishing steers — 500kg target',
    demoGroupDescription: 'Angus x, 1.8kg ADG, 120 DOF',
    systemProfileIds: [],
    demoIngredients: [],
    demoFormulaName: 'Demo — Feedlot finisher',
    safetyRules: [
      { rule: 'max_urea_percent', value: 1.0, label: 'Max urea %' },
      { rule: 'min_roughage_ndf_percent', value: 8, label: 'Min roughage NDF %' },
      { rule: 'max_grain_percent', value: 85, label: 'Max grain %' },
    ],
  },
  sheep: {
    demoClientName: 'Demo Sheep Station',
    demoGroupName: 'Ewes — late pregnancy (twins)',
    demoGroupDescription: '70kg BW, twin-bearing, 6 weeks pre-lamb',
    systemProfileIds: [],
    demoIngredients: [],
    demoFormulaName: 'Demo — Ewe pre-lamb supplement',
    safetyRules: [
      { rule: 'max_copper_ppm', value: 15, label: 'Max copper (ppm)' },
      { rule: 'max_urea_percent', value: 1.0, label: 'Max urea %' },
    ],
  },
  pig: {
    demoClientName: 'Demo Piggery',
    demoGroupName: 'Grower pigs — 25-50kg',
    demoGroupDescription: 'Large White x Landrace, 800g ADG target',
    systemProfileIds: [],
    demoIngredients: [],
    demoFormulaName: 'Demo — Grower diet (SID Lys 0.95)',
    safetyRules: [
      { rule: 'min_sid_lys_percent', value: 0.85, label: 'Min SID Lys %' },
      { rule: 'max_salt_percent', value: 0.5, label: 'Max salt %' },
      { rule: 'lys_ne_ratio_min', value: 0.70, label: 'Min Lys:NE ratio' },
    ],
  },
  poultry: {
    demoClientName: 'Demo Poultry Farm',
    demoGroupName: 'Broilers — starter (0-10 days)',
    demoGroupDescription: 'Ross 308, floor pens, target 250g @ 10d',
    systemProfileIds: [],
    demoIngredients: [],
    demoFormulaName: 'Demo — Broiler starter',
    safetyRules: [
      { rule: 'min_dig_lys_percent', value: 1.28, label: 'Min dig Lys %' },
      { rule: 'min_linoleic_percent', value: 1.0, label: 'Min linoleic acid %' },
      { rule: 'ca_p_ratio_max', value: 2.1, label: 'Max Ca:aP ratio' },
    ],
  },
};

// ── Main seeding function ────────────────────

export async function seedUserData(
  supabase: SupabaseClient,
  userId: string,
  species: string[]
) {
  // Use the first selected species as primary for the demo
  const primarySpecies = species[0] as Species;
  const config = SEED_CONFIGS[primarySpecies];

  if (!config) {
    console.warn(`No seed config for species: ${primarySpecies}`);
    return;
  }

  // ── 1. Create demo client ──────────────────
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name: config.demoClientName,
      is_demo: true,
      notes: 'This is a demo client created during onboarding. Feel free to edit or delete it.',
    })
    .select('id')
    .single();

  if (clientError) throw clientError;

  // ── 2. Create demo animal group ────────────
  const { data: group, error: groupError } = await supabase
    .from('animal_groups')
    .insert({
      client_id: client.id,
      user_id: userId,
      name: config.demoGroupName,
      description: config.demoGroupDescription,
      species: primarySpecies,
      is_demo: true,
    })
    .select('id')
    .single();

  if (groupError) throw groupError;

  // ── 3. Assign system requirement profiles ──
  // These are read-only system profiles already in the DB
  // We just link the relevant ones to this user's group
  if (config.systemProfileIds.length > 0) {
    const profileLinks = config.systemProfileIds.map(profileId => ({
      animal_group_id: group.id,
      requirement_profile_id: profileId,
    }));

    await supabase
      .from('group_profiles')
      .insert(profileLinks);
  }

  // ── 4. Create demo formula ─────────────────
  const { data: formula, error: formulaError } = await supabase
    .from('formulas')
    .insert({
      user_id: userId,
      animal_group_id: group.id,
      name: config.demoFormulaName,
      is_demo: true,
      status: 'draft',
      notes: 'Demo formula — edit the ingredients to see real-time nutrient balancing.',
    })
    .select('id')
    .single();

  if (formulaError) throw formulaError;

  // ── 5. Add demo ingredients to formula ─────
  // (These would reference your ingredients table)
  // Skipped here — fill with actual ingredient rows

  // ── 6. Seed safety rules ───────────────────
  if (config.safetyRules.length > 0) {
    const rules = config.safetyRules.map(rule => ({
      user_id: userId,
      species: primarySpecies,
      ...rule,
    }));

    await supabase
      .from('safety_rules')
      .insert(rules);
  }

  // ── 7. Copy AU ingredient prices (if not already global) ─
  // If ingredient prices are per-user, copy default AU prices here
  // If they're global/system, skip this step

  console.log(`Seeded data for user ${userId} (${primarySpecies})`);
}
