// src/server/seo/spaRoutes.ts
// Paths the client app actually handles. Anything else that reaches the SPA
// fallback gets the shell with HTTP 404, so crawlers don't index unknown URLs
// as copies of the homepage (soft 404).
//
// Keep in sync with the SPA routes in vercel.json (enforced by spaRoutes.test.ts)
// and with the pathname checks in src/App.tsx / LoginScreen.tsx.
export const SPA_ROUTE_PATTERN =
  /^\/(?:index\.html|trip\/[^/]+|trips\/trip_[^/]+|auth\/callback|forgot-password|reset-password|pricing)?\/?$/;

export function isSpaRoute(pathname: string): boolean {
  return SPA_ROUTE_PATTERN.test(pathname);
}
