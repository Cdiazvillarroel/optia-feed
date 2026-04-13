# Optia Feed

**Livestock nutrition, intelligently formulated.**

AI-assisted ration formulation, diet optimization, and nutritional management for all livestock species. Built by Agrometrics.

## Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** Vercel
- **AI:** Claude (Anthropic API)
- **Automation:** Pipedream
- **Styling:** Tailwind CSS
- **State:** Zustand

## Setup (GitHub + Supabase + Vercel — no terminal needed)

### Step 1 — GitHub

1. Go to [github.com/new](https://github.com/new) → create `optia-feed` (Private)
2. Download and extract the project archive
3. In your new empty repo, click **"uploading an existing file"**
4. Drag all files and folders from the extracted project
5. Commit message: `Initial scaffold — Optia Feed`

### Step 2 — Supabase

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Name: `optia-feed`, choose region (Sydney), set DB password
3. Wait ~2 minutes for creation
4. Go to **SQL Editor** → **New Query**
5. Copy ALL contents of `supabase/migrations/001_initial_schema.sql` → paste → **Run**
6. Create another New Query
7. Copy ALL contents of `supabase/migrations/002_seed_data.sql` → paste → **Run**
8. You should see: `Ingredients: 30`, `Requirements: 15`, `Safety Rules: 25`
9. Go to **Settings → API** — copy your Project URL and anon key

### Step 3 — Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `optia-feed` GitHub repo
3. Framework: Next.js (auto-detected)
4. Open **Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ANTHROPIC_API_KEY` | Your Claude API key from console.anthropic.com |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain (add after first deploy) |

5. Click **Deploy**
6. Once deployed, your app is live at `optia-feed-xxx.vercel.app`

### Step 4 — First Login

1. Visit your deployed URL
2. Click "Sign up" with your email
3. Supabase auto-creates your nutritionist profile
4. You're in!

## Project Structure

```
optia-feed/
├── app/
│   ├── (auth)/login/          # Auth pages
│   ├── (dashboard)/           # Protected app pages
│   │   ├── workspace/         # Dashboard home
│   │   ├── clients/           # Client management
│   │   ├── animals/           # Species, requirements, safety
│   │   ├── ingredients/       # Ingredient database
│   │   ├── formulas/          # Formula builder
│   │   ├── hub/               # Farm & mill collaboration
│   │   ├── reports/           # Report generation
│   │   └── settings/          # Profile & preferences
│   └── api/ai/               # AI endpoints
├── components/
│   ├── layout/                # Sidebar, AI panel
│   ├── formulas/              # Formula builder components
│   ├── ingredients/           # Ingredient table
│   └── hub/                   # Hub view
├── lib/
│   ├── supabase/              # Client & server helpers
│   └── utils/                 # Store, helpers
├── supabase/
│   └── migrations/            # SQL schema
├── types/                     # TypeScript types
└── styles/                    # Global CSS
```

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| Auth | ✅ Ready | Supabase Auth with RLS |
| Workspace | ✅ Ready | Dashboard with stats |
| Clients | ✅ Ready | CRUD + detail view |
| Animals | 🔧 Shell | Species/stage/requirements (needs seed data) |
| Ingredients | ✅ Ready | Database with search/filter |
| Formulas | ✅ Ready | Builder with balance panel |
| Hub | ✅ Ready | Farm & mill collaboration |
| Reports | 🔧 Shell | Report generation (needs PDF engine) |
| Settings | ✅ Ready | Profile & preferences |
| AI Assistant | ✅ Ready | Chat + formula review |

## Database

Full schema with Row Level Security (RLS) for multi-tenant isolation. Each nutritionist only sees their own data. Global ingredients and requirements are readable by all.

Key tables:
- `nutritionist_profiles` — User profiles
- `nutrition_clients` — Farm clients
- `ingredients` + `ingredient_prices` — Commodities
- `formulas` + `formula_ingredients` — Rations
- `animal_requirements` + `safety_rules` — Species data
- `hub_mills` + `hub_contacts` + `shared_formulas` + `hub_messages` — Collaboration
- `ai_sessions` — AI interaction log

## Integration: FeedFlow

Optia Feed connects to FeedFlow for farm data sync:
- **Push:** Approved formulas → FeedFlow Feed Library
- **Pull:** Silo consumption, animal groups, alerts

Connection is established per-client via FeedFlow client code.

## AI Features

Powered by Claude (Anthropic):
- **Formula Review** — Analyzes formulas against requirements and safety rules
- **Ingredient Substitution** — Suggests alternatives when prices change
- **Diet Troubleshooting** — Diagnoses performance issues
- **Natural Language Formulation** — "Make me a grower pig diet..."

---

**Agrometrics** — Australian AgTech  
Part of the ecosystem: FeedFlow · SwineSense · RumenSense · FlockSense · Optia Feed
