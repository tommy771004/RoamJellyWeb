import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return sha256(verifier);
}

export function readSecret(directName: string, referenceName?: string): string {
  const direct = process.env[directName]?.trim();
  if (direct) return direct.replace(/\\n/g, '\n');
  const reference = referenceName ? process.env[referenceName]?.trim() : '';
  if (!reference) return '';
  if (reference.startsWith('env://')) return (process.env[reference.slice(6)] ?? '').replace(/\\n/g, '\n');
  if (reference.startsWith('file://')) return readFileSync(reference.slice(7), 'utf8').trim();
  throw new Error(`${referenceName} must use env:// or file://.`);
}

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_DATA_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error('AUTH_DATA_ENCRYPTION_KEY or JWT_SECRET is required.');
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(value: string): string {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !encrypted) throw new Error('Encrypted secret is malformed.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
