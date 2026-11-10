import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { rotateRefreshSession } from '../sessionService';
import { sha256 } from '../authCrypto';
import type { AuthRepository } from '../authRepository';

process.env.JWT_SECRET ??= 'test-secret-for-session-service-tests-0123456789';

function fakeRepo(refreshToken: string) {
  const sessions: any[] = [{
    id: 's1', userId: 'usr_1', familyId: 'f1', tokenHash: sha256(refreshToken), rememberMe: true,
    expiresAt: new Date(Date.now() + 60_000), consumedAt: null, revokedAt: null,
  }];
  return {
    createSession: async (record: any) => { sessions.push(record); },
    findSession: async (hash: string) => sessions.find((s) => s.tokenHash === hash) ?? null,
    consumeSession: async (id: string) => { const s = sessions.find((x) => x.id === id); if (!s || s.consumedAt) return false; s.consumedAt = new Date(); return true; },
    revokeFamily: async () => {},
  } as unknown as AuthRepository;
}

const req = (token: string) => ({ headers: { cookie: `roamjelly_refresh=${token}` } }) as unknown as Request;
const res = { cookie: () => {} } as unknown as Response;

test('refresh response carries the display name when a lookup is given', async () => {
  const session = await rotateRefreshSession(fakeRepo('rt'), req('rt'), res, async (id) => (
    id === 'usr_1' ? { displayName: '王小明', primaryEmail: 'a@example.com' } : null
  ));
  assert.equal(session?.user.id, 'usr_1');
  assert.equal(session?.user.displayName, '王小明');
  assert.equal(session?.user.display_name, '王小明');
});

test('refresh still succeeds when the profile lookup fails', async () => {
  const session = await rotateRefreshSession(fakeRepo('rt2'), req('rt2'), res, async () => { throw new Error('db down'); });
  assert.equal(session?.user.id, 'usr_1');
  assert.equal(session?.user.displayName, undefined);
});
