// src/server/seo/utils.ts

// Canonical site origin. Keep in sync with index.html / robots.txt / llms.txt.
// On Vercel the production host is injected; otherwise fall back to the known prod domain.
export const SITE_ORIGIN = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'https://roam-jelly-web.vercel.app';

export function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// JSON.stringify does not escape </ sequences.
// A value like "</script>" breaks out of an inline <script> block.
// This replaces </ with <\/ which is valid JSON and safe for HTML tokenizers.
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/<\//g, '<\\/');
}
