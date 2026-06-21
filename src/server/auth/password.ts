import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [hashedPassword, salt] = hash.split('.');
  // Guard against malformed/legacy hashes: timingSafeEqual throws RangeError on
  // length mismatch, which would surface as a 500 instead of a clean auth failure.
  if (!hashedPassword || !salt) {
    return false;
  }
  const bufferToVerify = Buffer.from(hashedPassword, 'hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  if (buf.length !== bufferToVerify.length) {
    return false;
  }
  return timingSafeEqual(buf, bufferToVerify);
}
