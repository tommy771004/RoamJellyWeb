// src/server/seo/utils.ts

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
