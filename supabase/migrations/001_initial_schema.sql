-- ══════════════════════════════════════════════════════════════════════
-- OPTIA FEED — Initial Schema Migration
-- Stack: Supabase (PostgreSQL) + Next.js 14 + Vercel
-- ══════════════════════════════════════════════════════════════════════

-- ── Enable extensions ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════
-- NUTRITIONIST PROFILES
-- ══════════════════════════════════════════════════════════════════════
create table public.nutritionist_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text,
  full_name text,
  credentials text,                     -- "BAnimSc, PhD, RAnNutr"
  phone text,
  logo_url text,
  feeding_standard text default 'CSIRO', -- 'CSIRO' | 'NRC' | 'INRA'
  currency text default 'AUD',
  energy_unit text default 'MJ',         -- 'MJ' | 'Mcal'
  default_batch_kg numeric(10,0) default 1000,
  plan text default 'starter',           -- 'starter' | 'professional' | 'enterprise'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.nutritionist_profiles enable row level security;
create policy "Users can view own profile" on public.nutritionist_profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.nutritionist_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.nutritionist_profiles for insert with check (auth.uid() = id);

-- ══════════════════════════════════════════════════════════════════════
-- CLIENTS (Farms the nutritionist consults for)
-- ══════════════════════════════════════════════════════════════════════
create table public.nutrition_clients (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text[] not null,               -- ['cattle', 'sheep']
  contact_name text,
  contact_email text,
  contact_phone text,
  location text,
  feedflow_client_id uuid,
  feedflow_api_key text,                 -- encrypted
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.nutrition_clients enable row level security;
create policy "Users manage own clients" on public.nutrition_clients for all using (auth.uid() = nutritionist_id);

create index idx_clients_nutritionist on public.nutrition_clients(nutritionist_id);

-- ══════════════════════════════════════════════════════════════════════
-- INGREDIENTS (Global + Custom)
-- ══════════════════════════════════════════════════════════════════════
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid references auth.users(id) on delete cascade,  -- null = global
  name text not null,
  category text not null,                -- 'energy','protein','mineral','vitamin','additive','forage','byproduct'
  species_suitable text[],               -- ['cattle','pig','poultry','sheep']
  -- Proximate analysis (% DM basis)
  dm_pct numeric(5,2),
  cp_pct numeric(5,2),
  me_mj numeric(6,2),
  de_mj numeric(6,2),
  ne_mj numeric(6,2),
  cf_pct numeric(5,2),
  ee_pct numeric(5,2),
  ndf_pct numeric(5,2),
  adf_pct numeric(5,2),
  ash_pct numeric(5,2),
  starch_pct numeric(5,2),
  sugar_pct numeric(5,2),
  -- Macro minerals (%)
  ca_pct numeric(5,3),
  p_pct numeric(5,3),
  mg_pct numeric(5,3),
  k_pct numeric(5,3),
  na_pct numeric(5,3),
  cl_pct numeric(5,3),
  s_pct numeric(5,3),
  -- Trace minerals (ppm)
  fe_ppm numeric(8,2),
  zn_ppm numeric(8,2),
  mn_ppm numeric(8,2),
  cu_ppm numeric(8,2),
  se_ppm numeric(8,4),
  co_ppm numeric(8,4),
  i_ppm numeric(8,4),
  -- Vitamins
  vit_a_iu numeric(10,0),
  vit_d_iu numeric(10,0),
  vit_e_iu numeric(10,0),
  -- Amino acids (% of DM)
  lysine_pct numeric(5,3),
  methionine_pct numeric(5,3),
  threonine_pct numeric(5,3),
  tryptophan_pct numeric(5,3),
  -- Constraints
  max_inclusion_pct numeric(5,2),
  min_inclusion_pct numeric(5,2),
  anti_nutritional_notes text,
  -- Metadata
  source text,                           -- 'NRC 2012','CSIRO','Lab test','Custom'
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ingredients enable row level security;
create policy "Anyone can read global ingredients" on public.ingredients for select using (nutritionist_id is null or auth.uid() = nutritionist_id);
create policy "Users manage own ingredients" on public.ingredients for all using (auth.uid() = nutritionist_id);

create index idx_ingredients_category on public.ingredients(category);
create index idx_ingredients_nutritionist on public.ingredients(nutritionist_id);

-- ══════════════════════════════════════════════════════════════════════
-- INGREDIENT PRICES (Time series)
-- ══════════════════════════════════════════════════════════════════════
create table public.ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  supplier text,
  price_per_tonne numeric(10,2) not null,
  currency text default 'AUD',
  effective_date date not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.ingredient_prices enable row level security;
create policy "Users manage own prices" on public.ingredient_prices for all using (auth.uid() = nutritionist_id);

create index idx_prices_ingredient on public.ingredient_prices(ingredient_id, effective_date desc);

-- ══════════════════════════════════════════════════════════════════════
-- FORMULAS (Rations)
-- ══════════════════════════════════════════════════════════════════════
create table public.formulas (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.nutrition_clients(id) on delete set null,
  name text not null,
  species text not null,
  production_stage text not null,
  version integer default 1,
  status text default 'draft',           -- 'draft','review','approved','active','archived'
  batch_size_kg numeric(10,0) default 1000,
  -- Denormalized totals
  total_cost_per_tonne numeric(10,2),
  total_cp_pct numeric(5,2),
  total_me_mj numeric(6,2),
  -- Nutrient targets as JSON
  nutrient_targets jsonb,
  notes text,
  ai_review text,
  ai_reviewed_at timestamptz,
  feedflow_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.formulas enable row level security;
create policy "Users manage own formulas" on public.formulas for all using (auth.uid() = nutritionist_id);

create index idx_formulas_nutritionist on public.formulas(nutritionist_id);
create index idx_formulas_client on public.formulas(client_id);
create index idx_formulas_status on public.formulas(status);

-- ══════════════════════════════════════════════════════════════════════
-- FORMULA INGREDIENTS (What's in each formula)
-- ══════════════════════════════════════════════════════════════════════
create table public.formula_ingredients (
  id uuid primary key default gen_random_uuid(),
  formula_id uuid not null references public.formulas(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  inclusion_pct numeric(6,3) not null,
  inclusion_kg numeric(10,3),
  cost_per_tonne numeric(10,2),
  locked boolean default false,
  notes text,
  unique(formula_id, ingredient_id)
);

alter table public.formula_ingredients enable row level security;
create policy "Users manage via formula ownership" on public.formula_ingredients for all
  using (exists (select 1 from public.formulas where id = formula_id and nutritionist_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- FORMULA VERSIONS (History snapshots)
-- ══════════════════════════════════════════════════════════════════════
create table public.formula_versions (
  id uuid primary key default gen_random_uuid(),
  formula_id uuid not null references public.formulas(id) on delete cascade,
  version integer not null,
  ingredients jsonb not null,
  nutrient_totals jsonb not null,
  cost_per_tonne numeric(10,2),
  changed_by uuid references auth.users(id),
  change_notes text,
  created_at timestamptz default now()
);

alter table public.formula_versions enable row level security;
create policy "Users view via formula ownership" on public.formula_versions for all
  using (exists (select 1 from public.formulas where id = formula_id and nutritionist_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- CLIENT ANIMALS (Animal groups per client)
-- ══════════════════════════════════════════════════════════════════════
create table public.client_animals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.nutrition_clients(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  production_stage text not null,
  count integer not null,
  avg_weight_kg numeric(8,1),
  target_adg_kg numeric(5,3),
  target_milk_yield_l numeric(6,1),
  target_fcr numeric(5,2),
  dmi_kg numeric(6,2),
  formula_id uuid references public.formulas(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.client_animals enable row level security;
create policy "Users manage via client ownership" on public.client_animals for all
  using (exists (select 1 from public.nutrition_clients where id = client_id and nutritionist_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- ANIMAL REQUIREMENTS (Species + Stage nutritional requirements)
-- ══════════════════════════════════════════════════════════════════════
create table public.animal_requirements (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid references auth.users(id) on delete cascade,  -- null = global defaults
  species text not null,
  production_stage text not null,
  stage_name text not null,              -- display name
  stage_description text,
  requirements jsonb not null,           -- array of {nutrient, unit, min, max, target, critical_max, critical_min}
  ratios jsonb,                          -- array of {name, min, max, target, unit}
  source text default 'CSIRO',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(nutritionist_id, species, production_stage)
);

alter table public.animal_requirements enable row level security;
create policy "Anyone can read global requirements" on public.animal_requirements for select using (nutritionist_id is null or auth.uid() = nutritionist_id);
create policy "Users manage own requirements" on public.animal_requirements for all using (auth.uid() = nutritionist_id);

-- ══════════════════════════════════════════════════════════════════════
-- SAFETY RULES (Per species)
-- ══════════════════════════════════════════════════════════════════════
create table public.safety_rules (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid references auth.users(id) on delete cascade,  -- null = global
  species text not null,
  severity text not null,                -- 'danger','warning','info'
  title text not null,
  description text not null,
  detail text not null,
  ingredient_name text,                  -- linked ingredient name (nullable)
  source text default 'CSIRO',
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.safety_rules enable row level security;
create policy "Anyone can read global rules" on public.safety_rules for select using (nutritionist_id is null or auth.uid() = nutritionist_id);
create policy "Users manage own rules" on public.safety_rules for all using (auth.uid() = nutritionist_id);

-- ══════════════════════════════════════════════════════════════════════
-- HUB — Mills & Contacts
-- ══════════════════════════════════════════════════════════════════════
create table public.hub_mills (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text,
  capacity text,
  status text default 'pending',         -- 'active','pending','inactive'
  connected boolean default false,
  notes text,
  created_at timestamptz default now()
);

alter table public.hub_mills enable row level security;
create policy "Users manage own mills" on public.hub_mills for all using (auth.uid() = nutritionist_id);

create table public.hub_contacts (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,             -- 'mill' | 'farm'
  entity_id uuid not null,              -- hub_mills.id or nutrition_clients.id
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz default now()
);

alter table public.hub_contacts enable row level security;
create policy "Users manage own contacts" on public.hub_contacts for all using (auth.uid() = nutritionist_id);

-- ══════════════════════════════════════════════════════════════════════
-- HUB — Shared Formulas
-- ══════════════════════════════════════════════════════════════════════
create table public.shared_formulas (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  formula_id uuid not null references public.formulas(id) on delete cascade,
  shared_with_type text not null,        -- 'farm' | 'mill'
  shared_with_entity_id uuid not null,
  shared_with_contact text,              -- contact name
  formula_version integer not null,
  status text default 'new',             -- 'new' | 'viewed'
  notes text,
  shared_at timestamptz default now()
);

alter table public.shared_formulas enable row level security;
create policy "Users manage own shares" on public.shared_formulas for all using (auth.uid() = nutritionist_id);

-- ══════════════════════════════════════════════════════════════════════
-- HUB — Messages
-- ══════════════════════════════════════════════════════════════════════
create table public.hub_messages (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  thread_type text not null,             -- 'farm' | 'mill'
  thread_entity_id uuid not null,
  sender_name text not null,
  sender_role text,
  message text not null,
  is_from_nutritionist boolean default true,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.hub_messages enable row level security;
create policy "Users manage own messages" on public.hub_messages for all using (auth.uid() = nutritionist_id);

create index idx_messages_thread on public.hub_messages(thread_type, thread_entity_id, created_at desc);

-- ══════════════════════════════════════════════════════════════════════
-- AI SESSIONS (Interaction history)
-- ══════════════════════════════════════════════════════════════════════
create table public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  context_type text not null,            -- 'formula_review','substitution','troubleshoot','formulate','report','chat'
  context_id uuid,
  prompt text not null,
  response text not null,
  model text default 'claude-sonnet-4-20250514',
  tokens_used integer,
  created_at timestamptz default now()
);

alter table public.ai_sessions enable row level security;
create policy "Users manage own sessions" on public.ai_sessions for all using (auth.uid() = nutritionist_id);

-- ══════════════════════════════════════════════════════════════════════
-- FEEDFLOW SYNC LOG
-- ══════════════════════════════════════════════════════════════════════
create table public.feedflow_sync_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.nutrition_clients(id) on delete cascade,
  direction text not null,               -- 'push' | 'pull'
  entity_type text not null,
  entity_id uuid,
  status text not null,                  -- 'success' | 'failed' | 'pending'
  details jsonb,
  created_at timestamptz default now()
);

alter table public.feedflow_sync_log enable row level security;
create policy "Users view via client ownership" on public.feedflow_sync_log for all
  using (exists (select 1 from public.nutrition_clients where id = client_id and nutritionist_id = auth.uid()));

-- ══════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.nutritionist_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update timestamps
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_clients_timestamp before update on public.nutrition_clients for each row execute procedure public.update_updated_at();
create trigger update_formulas_timestamp before update on public.formulas for each row execute procedure public.update_updated_at();
create trigger update_ingredients_timestamp before update on public.ingredients for each row execute procedure public.update_updated_at();
create trigger update_animals_timestamp before update on public.client_animals for each row execute procedure public.update_updated_at();
create trigger update_profiles_timestamp before update on public.nutritionist_profiles for each row execute procedure public.update_updated_at();
