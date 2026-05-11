From Claude.md and Claude2.md, I understand this is RoamJelly (果凍漫遊) - a full-stack TypeScript travel app with:

Vite React frontend + Express backend + Socket.io
React Native components via react-native-web
PostgreSQL (Drizzle ORM) + Redis cache
Three core workflows: Search/Monetization, Itinerary Collaboration, Travel Tools

WorkFlow Completeness (Register/Login/Use)
Auth Flow Issues:

No real registration/login UI exists - only dev auto-login via POST /api/auth/dev-token
AUTH_REQUIRED in production but no frontend login page
ENABLE_DEV_TOKEN_ENDPOINT disabled in production - users have no way to authenticate
JWT auth works server-side but there's no user-facing auth UI at all
The VITE_DEV_AUTO_LOGIN auto-bootstraps tokens but this is development-only
toggleSave and toggleTrack are frontend-only store state (not persisted to DB) ❌
Socket disconnect doesn't re-emit join_room on reconnect ❌
Deep-link is ${window.location.origin}/trip/${TRIP_ID} - no landing page ❌