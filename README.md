# iCrystal.OS

> iNaturalist for the mineral world — identify, collect, and map crystal specimens with AI assistance.

iCrystal.OS is a browser-native Progressive Web App (PWA) where rockhounds log finds, get AI-assisted mineral identification, and build a personal specimen collection on a shared community map.

## Features (v1)

- **AI Identification Pipeline** — Upload a photo, get top-3 mineral candidates from Claude/GPT-4V, answer 2-3 disambiguation questions, confirm your ID.
- **Personal Collection** — CRUD specimen records with photos, notes, hardness, streak, locality, and private/public toggle.
- **Community Map** — MapLibre GL JS map of public finds; location obfuscated to ~10 km by default to protect collecting spots.
- **Activity Feed** — Latest public finds, follow other collectors, comment on specimens.
- **PWA** — Installable on iOS/Android/desktop, offline shell cached via service worker.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Map | MapLibre GL JS (open-source) |
| Backend | Supabase (Postgres + RLS + Auth + Storage + Edge Functions) |
| AI | Claude Sonnet via Anthropic API / OpenAI GPT-4o (edge function abstraction) |
| PWA | vite-plugin-pwa + Workbox |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/brysonandtiff-ops/icrystal.os
cd icrystal.os
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Supabase project credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from **Supabase Dashboard → Settings → API**.

### 3. Set up Supabase

Create a new Supabase project, then run the migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually paste supabase/migrations/001_initial_schema.sql into the SQL editor
```

Deploy the identify Edge Function:

```bash
supabase functions deploy identify
supabase secrets set OPENAI_API_KEY=sk-...
# or
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 5. Build for production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel (or any static host).

## Database Schema

Eight core tables — all with Row Level Security enforced:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends `auth.users`) |
| `specimens` | Specimen records with obfuscated/precise coordinates |
| `specimen_photos` | Photo storage references |
| `ai_identifications` | Full AI identification log |
| `likes` | Specimen likes |
| `comments` | Community comments on specimens |
| `follows` | User follow graph |
| `notifications` | Activity notifications |

**Location obfuscation**: `specimens.obfuscated_lat/lng` stores a randomised point within `location_precision` km of the true location. RLS ensures only the owner can read the exact coordinates.

## Project Structure

```
src/
  pages/          # Route-level pages (Home, Identify, Collection, Map, Profile, Auth)
  components/     # Shared components (Layout, SpecimenCard, IdentifyFlow)
  hooks/          # useAuth, etc.
  lib/            # supabase.ts client
  types/          # TypeScript types
supabase/
  functions/      # Edge Functions (identify/)
  migrations/     # SQL migrations
public/
  icons/          # PWA icons
  manifest.json   # PWA manifest
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

## License

MIT
