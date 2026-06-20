# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> A much deeper, authoritative architecture doc (zh-TW) lives at [docs/CLAUDE.md](docs/CLAUDE.md) — it covers every workflow, API endpoint, table, and known gotcha. Read it when you need detail beyond the big picture below. If the two ever conflict, trust the code, then update both.

RoamJelly (果凍漫遊) is a single-repo full-stack TypeScript app: AI trip planning, multi-user real-time itinerary co-editing, flight search/price comparison + clickout monetization, and a travel toolkit (checklist / expense-splitting / weather). UI strings and product docs are zh-TW.

## Commands

```bash
npm run dev            # tsx server.ts — runs API + Socket.io + Vite middleware in ONE process (dev)
npm run build          # vite build (client) + esbuild bundle server.ts -> dist/server.cjs
npm run start          # node dist/server.cjs (production, serves built client)
npm run lint           # tsc --noEmit — this is the ONLY "lint"; there is no ESLint
npm run db:generate    # drizzle-kit generate — create migration from schema.ts changes
npm run db:migrate     # tsx scripts/migrate.ts — apply migrations (needs DATABASE_URL)
npm run sync:travel-guide          # refresh src/data/travelGuideDestinations.ts from upstream repo
npm run test:integration:staging   # smoke test against docker-compose.staging.yml stack
```

### Tests

There is no test runner config — tests use the **Node built-in test runner via tsx**. `package.json` only scripts the SEO suite:

```bash
npm run test:seo                                   # src/server/seo/__tests__/*.test.ts
tsx --test src/lib/itineraryUtils.test.ts          # run a single test file
tsx --test 'src/**/*.test.ts'                       # run all *.test.ts (lib, seo, security, services)
```

CI ([.github/workflows/roamjelly-ci.yml](.github/workflows/roamjelly-ci.yml)) runs only `lint` + `build` for web/backend (no test step), plus an unsigned iOS Xcode build.

## Architecture

### One monolithic Node process
[server.ts](server.ts) (~3600 lines) is the whole backend in one file: Express REST routes, Socket.io event handlers, JWT auth middleware, Redis caching with in-memory fallback, the SEO SSR router (`app.use(createSeoRouter(repo))`), Vite middleware in dev, and static-file hosting in prod. There is no per-route file structure — search within `server.ts` by route path or socket event name.

### Frontend (React 19 + Vite + Zustand)
- Entry: [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx). App is a 3-tab shell (home / itinerary / tools).
- **All HTTP goes through [src/lib/workflowApi.ts](src/lib/workflowApi.ts)** — the single chokepoint that does token bootstrap, injects the `Authorization` header, and handles timeout/status/parse errors. Do **not** add raw `fetch` calls to `/api/*` in components.
- Shared request/response shapes live in [src/types/workflow.ts](src/types/workflow.ts).
- State is split across Zustand stores in [src/store/](src/store/) (`useAppStore`, `useSearchStore`, `useItineraryStore`, `useToolsStore`, `useTripFactsStore`).
- Imports inside `src/` are relative. The `@` path alias maps to the **repo root** (not `src/`), e.g. `@/src/components/...`.

### Backend data layer
- All DB access is abstracted behind [src/server/repositories/appRepository.ts](src/server/repositories/appRepository.ts) (including demo seed + settlement aggregation). Routes call the repository, not Drizzle directly.
- Schema: [src/server/db/schema.ts](src/server/db/schema.ts) (Drizzle ORM, PostgreSQL). Migrations in [migrations/](migrations/) — generate with `db:generate`, apply with `db:migrate`.
- Redis is optional: caches search results, search history, and itinerary planning logs/snapshots; falls back to memory when `REDIS_URL` is unset.

### AI services
- [src/server/services/](src/server/services/) holds the real AI itinerary/parsing services. **Naming trap:** `src/lib/geminiApi.ts` / `geminiApi` actually call **OpenRouter** (`OPENROUTER_API_KEY`), not Gemini — historical naming. Check the implementation before assuming a provider.

### Programmatic SEO
[src/server/seo/](src/server/seo/) generates server-rendered destination/route/hub pages + sitemap from `seoDataService` and `cities`, mounted via `createSeoRouter`. Templates in `seo/templates/`.

### Real-time co-editing (dual path)
Itinerary changes travel over **two paths that must stay in sync**: HTTP (`POST /api/itinerary/sync`, `DELETE /api/itinerary/:node_id`) and Socket.io (`emit sync_itinerary`, broadcast `remove_node` to the trip room after `join_room`). Any change to sync behavior must handle both.

### Auth & authorization
Bearer JWT from the `Authorization` header; `AUTH_REQUIRED` is on by default in production. Dev gets a token automatically via `POST /api/auth/dev-token` (gated by `ENABLE_DEV_TOKEN_ENDPOINT` / `VITE_DEV_AUTO_LOGIN`). Trip-level roles `viewer < editor < owner` are enforced server-side via `ensureTripRole` / `hasRequiredRole` — **every trip-scoped write must keep its role check.**

## Cross-cutting conventions

- **Adding a persisted field** requires touching all of: `schema.ts` → a new migration (`db:generate`) → `appRepository.ts` → `src/types/workflow.ts` → the mapping in `workflowApi.ts`. Skipping any layer breaks the contract.
- **User-facing errors** stay gentle/product-toned (zh-TW); never surface internal error detail to the client.
- Deployment targets: Render ([render.yaml](render.yaml)) runs `db:migrate && start`; Vercel ([vercel.json](vercel.json)) uses `vercel-build` to bundle the server into `api/_server.cjs`. There is also an iOS app (built in CI) — the web + Node monolith is the primary delivery path.
- Env vars: copy [.env.example](.env.example). Minimum to run: `DATABASE_URL`, `JWT_SECRET`.
