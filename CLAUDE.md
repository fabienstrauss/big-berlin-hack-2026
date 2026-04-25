# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev           # Start dev server at http://localhost:3000
npm run build         # Production build
npm run lint          # ESLint
npm run test:e2e      # Playwright E2E (mocked, fast)
npm run test:e2e:live # Full live provider matrix (12-25 min)
npm run jobs:smoke    # Smoke test async video job API
```

Single Playwright test: `npx playwright test --project=mock -g "test name"`

## Environment Variables

Copy `.env.example` to `.env.local`. Required groups:

**Google AI (choose one auth mode):**
- API key: `GOOGLE_API_KEY`, `GOOGLE_GENAI_API_VERSION=v1beta`
- ADC: `gcloud auth application-default login` + `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`

**Other providers:** `TAVILY_API_KEY`, `GRADIUM_API_KEY`, `HERA_API_KEY`

**Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Storage:** `GCS_VIDEO_BUCKET`, `GCS_SIGNED_URL_TTL_SECONDS`

**Optional model overrides:** `VERTEX_IMAGE_MODEL`, `VERTEX_VIDEO_MODEL`, `VERTEX_VIDEO_DURATION_SECONDS`

Supabase and GCS are optional for local dev — canvas runs in `local-only` mode if unconfigured. Apply the migration in `supabase/` to add the `generation_jobs` table for async video.

## Architecture

### Canvas state machine
`useCanvasBoard` (`app/hooks/useCanvasBoard.ts`) is the central hook. It owns all ReactFlow nodes/edges, persistence lifecycle (6-state: `local-only → loading → ready → saving → saved ← error`), and every canvas action (add note, upload, generate, search, template). Components are pure renderers; all state lives here.

### Payload-driven insertion
Every action (generate, search, template) returns a `CanvasInsertionPayload` (`app/lib/canvas/contracts.ts`):
```ts
{ items: [{ key, data: CanvasNodeData, offsetX?, offsetY? }], edges?: CanvasEdge[] }
```
The hook applies payloads atomically via `applyCanvasPayload`, using grid-based collision detection to find free spawn positions.

### Node types (`app/lib/canvas/types.ts`)
Six `kind` values: `brainstorm` (editable note), `asset` (uploaded file), `generation` (AI output), `research` (Tavily), `image-stack` (collection), `template`. Each rendered by `CanvasCardNode` (`app/components/workspace/nodes/CanvasCardNode.tsx`).

### Generation pipeline (`app/api/generate/route.ts`)
Two paths:
1. **Sync** (images, animations): `buildGenerationPayload()` → Vertex/Gemini/Hera → returns `CanvasInsertionPayload`
2. **Async video**: `createVideoGenerationJob()` → 202 + jobId → frontend polls `/api/jobs/[id]` every 7s (80 attempts ≈ 9.3 min timeout)

### Provider routing (`app/lib/server/providers/`)
| Provider | Capabilities |
|---|---|
| `vertex.ts` | Image (gemini-2.5-flash-image), video (veo-3.0), brand extraction (multimodal) |
| `gemini.ts` | Image + video via `@google/genai` SDK with direct API key |
| `openai.ts` | Structured JSON output for brainstorm layouts |
| `tavily.ts` | Web search with citations and images |
| `gradium.ts` | Text-to-speech audio |
| `hera.ts` | Animation video generation |

Brand assets (images/PDFs as base64 `dataUrls`) flow in via `BrandAssetInput`, extracted by Vertex multimodal before prompt composition.

### Async video jobs
`app/lib/server/video-jobs.ts` manages the full lifecycle: creates a Supabase `generation_jobs` row → starts Vertex Veo operation → stores `operation_payload` for polling → on completion uploads to GCS via `gcs-video-storage.ts` and returns a signed URL. GCS signed URLs require `roles/iam.serviceAccountTokenCreator`; without it the code falls back to the raw provider URI.

### Persistence (`app/lib/canvas/persistence.ts`)
Supabase `canvas_state` table, upserted on 700ms debounce. `sanitizeNodeData()` strips React callbacks before storage. Falls back to `initialNodes` seed data if no DB row exists. Assets go to the `canvas-assets` bucket.

### Template system (`app/lib/templates/catalog.ts`)
`ContentTemplate` defines `imagePrompt`, `videoPrompt`, `animationPrompt` plus hooks and reference assets. Four built-in templates: Premium Product Hero, UGC Testimonial, Launch Countdown, Comparison Ad.

### Environment utilities (`app/lib/providers/env.ts`)
`getRequiredServerEnv()` / `getOptionalServerEnv()` — server-only module. All API routes use these; never read `process.env` directly in route handlers.
