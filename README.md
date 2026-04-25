# Big Berlin Hack 2026 - Video Pipeline

Canvas-first workflow for creating branded media with provider orchestration:

- **Google Vertex / Gemini**: Nano Banana image generation + Veo video generation
- **Tavily**: context search + citations
- **Gradium**: narration audio
- **Hera**: animation generation

## Local setup

```bash
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Environment variables

Set local secrets in `.env.local` (already git-ignored):

```bash
GOOGLE_API_KEY=...
GOOGLE_GENAI_API_VERSION=v1beta

TAVILY_API_KEY=...
GRADIUM_API_KEY=...
HERA_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GCS_VIDEO_BUCKET=...
GCS_SIGNED_URL_TTL_SECONDS=86400

# Optional overrides
VERTEX_IMAGE_MODEL=gemini-2.5-flash-image
VERTEX_VIDEO_MODEL=veo-3.0-fast-generate-001
VERTEX_VIDEO_DURATION_SECONDS=8
```

ADC mode is still supported for deploy/local via:

```bash
gcloud auth application-default login
GOOGLE_CLOUD_PROJECT=...
GOOGLE_CLOUD_LOCATION=europe-west4
```

## Supabase CLI migration (additive)

The project now includes an additive migration for async video jobs:

```bash
supabase link --project-ref sxgpuibtssqicomzescn
supabase db push
```

Migration adds only:

- `public.generation_jobs` table
- indexes on `status` and `created_at`
- `updated_at` trigger for `generation_jobs`

No existing `canvas_state` objects are removed or overwritten.

## Async video jobs API

- `POST /api/jobs` creates an async Veo job in `generation_jobs`
- `GET /api/jobs/:id` polls status and finalizes artifact URL
- `/api/generate` remains sync by default and supports optional `mode: \"async\"` for video

Completed async jobs attempt to persist Veo output into `GCS_VIDEO_BUCKET` and return a signed URL.
If GCS upload/signing fails but provider output exists, job is marked `completed` with a warning and provider URI fallback.

## Local smoke test (job create + poll + video URL)

With `npm run dev` running:

```bash
npm run jobs:smoke
```

Optional browser auto-open:

```bash
OPEN_VIDEO=1 npm run jobs:smoke
```

## Playwright E2E validation

Install browser runtime once:

```bash
npm run test:e2e:install
```

### 1) Deterministic regression suite (mocked)

```bash
npm run test:e2e
```

What it validates:

- generate flow node insertion
- Tavily scrape node insertion
- controlled generation error rendering
- Hera placeholder rendering stability

### 2) Full paid live matrix (all providers)

```bash
PLAYWRIGHT_LIVE=1 LIVE_DEPTH=full npm run test:e2e:live
```

Required env for live suite:

- `GOOGLE_API_KEY`
- `TAVILY_API_KEY`
- `GRADIUM_API_KEY`
- `HERA_API_KEY`

Live matrix coverage:

- Tavily context + image stack
- Vertex Nano Banana image generation
- Vertex Imagen fallback model path (request-level model override)
- Veo video generation
- Veo invalid-duration boundary -> controlled error node
- Gradium narration (wav + opus)
- Hera animation generation
- full E2E flow (brand file + Tavily context + Veo + Gradium)

## Runtime/cost profile for live tests

Expected with valid quota/keys:

- Duration: typically **12-25 minutes** total
- Credit usage: dominated by Veo and image generation calls
- Reliability: live tests run serially to reduce flake

Failure artifacts are kept automatically:

- screenshots on failure
- traces on failure/retry
- videos on failure

## Notes

- Playwright projects are configured in `playwright.config.ts` (`mock` and `live`)
- Live tests are manual-run only (not wired to CI in this branch)
- Secrets must stay in `.env.local` or Secret Manager, never committed
