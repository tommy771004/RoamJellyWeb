<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1d1f53f0-fdd2-4cdb-a2f9-8fdb873e1f53

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` and set required vars (`DATABASE_URL`, `JWT_SECRET`, AI keys)
3. Run database migration:
   `npm run db:migrate`
4. Run the app:
   `npm run dev`

## Auth (development)

- Backend now uses JWT + trip-level permission checks.
- In development, frontend auto-requests `POST /api/auth/dev-token` and stores token in localStorage.
- You can disable this behavior with `VITE_DEV_AUTO_LOGIN=false`.

## Staging integration test

1. Copy `.env.staging.example` to `.env.staging`
2. Start services:
   `docker compose -f docker-compose.staging.yml up -d postgres redis`
3. Run migrations:
   `npm run db:migrate`
4. Build and run API:
   `npm run build && node dist/server.cjs`
5. Run smoke test:
   `npm run test:integration:staging`

## Production automation

- Deploy workflow: `.github/workflows/deploy-production.yml`
- Health alert workflow: `.github/workflows/production-health-alert.yml`
- Required GitHub secrets:
  - `DATABASE_URL`
  - `PRODUCTION_DEPLOY_HOOK_URL`
  - `PRODUCTION_HEALTH_URL`
  - `ALERT_WEBHOOK_URL`

## Connect to real backend/API

Use environment variables instead of built-in demo data:

- `REAL_BACKEND_BASE_URL`
   - Server-side API proxy target. Example: `https://api.yourdomain.com`
   - When set, local server forwards all `/api/*` requests to this backend.

- `VITE_API_BASE_URL`
   - Frontend API base URL. Example: `https://api.yourdomain.com`
   - If empty, frontend uses relative `/api/*` paths.

- `SEED_DEMO_DATA`
   - Default is disabled unless explicitly set to `true`.
   - Keep this unset (or `false`) to avoid injecting demo/mock records.

- `REDIS_URL`
   - Optional Redis connection string. Example: `redis://localhost:6379`.
   - Used for:
     - search cache (`cache:search:*`)
     - search history (`history:search:global`)
     - itinerary planning logs and snapshots (`planning:trip:*`)
   - If unset, server falls back to in-memory storage.

Optional:

- `VITE_TRIP_ID`
   - Default trip id used by itinerary pages when your backend expects a specific trip context.

## Redis-backed API endpoints

- `GET /api/search/history?limit=50`
   - Returns recent search records.

- `GET /api/itinerary/planning-log?trip_id=<tripId>&limit=100`
   - Returns recent itinerary planning events for the trip.

- `GET /api/itinerary/planning-snapshot?trip_id=<tripId>`
   - Returns latest cached itinerary snapshot in Redis (if available).

## Deployment & schema docs

- 詳細部署、Table schema、缺口與風險清單請見：
   - `docs/DEPLOYMENT_GUIDE_ZH_TW.md`
