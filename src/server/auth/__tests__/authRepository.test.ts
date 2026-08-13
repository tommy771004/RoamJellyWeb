import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { AuthRepository } from '../authRepository';
import { decryptSecret, encryptSecret, pkceChallenge, randomToken, sha256 } from '../authCrypto';

test('OAuth transaction and login ticket can only be consumed once', async () => {
  const repo = new AuthRepository(null);
  const state = randomToken();
  const transactionId = randomUUID();
  await repo.createTransaction({
    id: transactionId, provider: 'google', stateHash: sha256(state), nonceHash: sha256(randomToken()),
    appCodeChallenge: pkceChallenge(randomToken()), providerCodeVerifierEncrypted: null,
    appRedirectUri: 'http://localhost:3000/auth/callback', linkUserId: null,
    expiresAt: new Date(Date.now() + 60_000), consumedAt: null,
  });
  assert.ok(await repo.findActiveTransaction(sha256(state)));
  assert.equal(await repo.consumeTransaction(transactionId), true);
  assert.equal(await repo.consumeTransaction(transactionId), false);

  const ticket = randomToken(48);
  const ticketId = randomUUID();
  await repo.createTicket({
    id: ticketId, transactionId, userId: 'user-1', ticketHash: sha256(ticket), kind: 'login',
    provider: 'google', providerSubject: 'subject', providerEmail: 'a@example.com',
    providerEmailVerified: true, displayName: 'A', avatarUrl: null,
    expiresAt: new Date(Date.now() + 60_000), consumedAt: null,
  });
  assert.ok(await repo.findActiveTicket(sha256(ticket)));
  assert.equal(await repo.consumeTicket(ticketId), true);
  assert.equal(await repo.consumeTicket(ticketId), false);
});

test('encrypted provider verifier round-trips and is authenticated', () => {
  const previous = process.env.AUTH_DATA_ENCRYPTION_KEY;
  process.env.AUTH_DATA_ENCRYPTION_KEY = 'test-only-encryption-key';
  try {
    const verifier = randomToken(64);
    const encrypted = encryptSecret(verifier);
    assert.notEqual(encrypted, verifier);
    assert.equal(decryptSecret(encrypted), verifier);
    const encryptedParts = encrypted.split('.');
    const tag = encryptedParts[1]!;
    encryptedParts[1] = `${tag[0] === 'A' ? 'B' : 'A'}${tag.slice(1)}`;
    assert.throws(() => decryptSecret(encryptedParts.join('.')));
  } finally {
    if (previous === undefined) delete process.env.AUTH_DATA_ENCRYPTION_KEY;
    else process.env.AUTH_DATA_ENCRYPTION_KEY = previous;
  }
});

test('refresh session reuse is observable for family revocation', async () => {
  const repo = new AuthRepository(null);
  const raw = randomToken(48);
  const id = randomUUID();
  await repo.createSession({
    id, userId: 'user-1', familyId: randomUUID(), tokenHash: sha256(raw), rememberMe: true,
    expiresAt: new Date(Date.now() + 60_000), consumedAt: null, revokedAt: null,
  });
  const stored = await repo.findSession(sha256(raw));
  assert.ok(stored);
  assert.equal(await repo.consumeSession(id), true);
  assert.equal(await repo.consumeSession(id), false);
  assert.ok((await repo.findSession(sha256(raw)))?.consumedAt);
});
