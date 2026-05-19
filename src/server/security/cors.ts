const DEFAULT_PUBLIC_ORIGINS = ['https://roam-jelly-web.vercel.app'];
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '');
  return `https://${trimmed.replace(/\/+$/, '')}`;
}

export function parseAllowedCorsOrigins(rawValue: string | undefined): string[] {
  return (rawValue ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

export function buildAllowedCorsOrigins(options: {
  configuredOrigins?: string | undefined;
  nodeEnv?: string | undefined;
  vercelUrl?: string | undefined;
  vercelBranchUrl?: string | undefined;
  vercelProjectProductionUrl?: string | undefined;
}): string[] {
  const configured = parseAllowedCorsOrigins(options.configuredOrigins);
  const inferredOrigins = [
    ...DEFAULT_PUBLIC_ORIGINS,
    options.vercelProjectProductionUrl,
    options.vercelBranchUrl,
    options.vercelUrl,
  ]
    .map((value) => (typeof value === 'string' ? normalizeOrigin(value) : ''))
    .filter(Boolean);

  const devOrigins = options.nodeEnv === 'production' ? [] : DEFAULT_DEV_ORIGINS;

  return Array.from(new Set([...configured, ...inferredOrigins, ...devOrigins]));
}

export function isCorsOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(normalizeOrigin(origin));
}
