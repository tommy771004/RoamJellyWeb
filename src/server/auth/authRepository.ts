import { and, eq, gt, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as schema from '../db/schema';

export type AuthProvider = 'apple' | 'google' | 'line';
export interface AuthTransactionRecord {
  id: string; provider: AuthProvider; stateHash: string; nonceHash: string;
  appCodeChallenge: string; providerCodeVerifierEncrypted: string | null;
  appRedirectUri: string; linkUserId: string | null; expiresAt: Date; consumedAt?: Date | null;
}
export interface ProviderIdentity {
  provider: AuthProvider; providerSubject: string; providerEmail: string | null;
  providerEmailVerified: boolean; displayName: string | null; avatarUrl: string | null;
}
export interface LoginTicketRecord extends ProviderIdentity {
  id: string; transactionId: string; userId: string; ticketHash: string;
  kind: 'login' | 'link'; expiresAt: Date; consumedAt?: Date | null;
}
export interface RefreshSessionRecord {
  id: string; userId: string; familyId: string; tokenHash: string; rememberMe: boolean;
  expiresAt: Date; consumedAt?: Date | null; revokedAt?: Date | null; lastUsedAt?: Date | null;
}

export class AuthRepository {
  private transactions = new Map<string, AuthTransactionRecord>();
  private tickets = new Map<string, LoginTicketRecord>();
  private identities = new Map<string, ProviderIdentity & { id: string; userId: string; lastLoginAt: Date }>();
  private sessions = new Map<string, RefreshSessionRecord>();
  private passwordResets = new Map<string, { id: string; userId: string; tokenHash: string; expiresAt: Date; consumedAt?: Date | null }>();

  constructor(private readonly db: any) {}

  async createTransaction(record: AuthTransactionRecord) {
    if (!this.db) { this.transactions.set(record.stateHash, record); return; }
    await this.db.insert(schema.authTransactions).values(record);
  }

  async findActiveTransaction(stateHash: string): Promise<AuthTransactionRecord | null> {
    if (!this.db) {
      const item = this.transactions.get(stateHash);
      return item && !item.consumedAt && item.expiresAt > new Date() ? item : null;
    }
    const [row] = await this.db.select().from(schema.authTransactions).where(and(
      eq(schema.authTransactions.stateHash, stateHash), isNull(schema.authTransactions.consumedAt),
      gt(schema.authTransactions.expiresAt, new Date()),
    )).limit(1);
    return row ?? null;
  }

  async findTransactionById(id: string): Promise<AuthTransactionRecord | null> {
    if (!this.db) return [...this.transactions.values()].find((row) => row.id === id) ?? null;
    const [row] = await this.db.select().from(schema.authTransactions).where(eq(schema.authTransactions.id, id)).limit(1);
    return row ?? null;
  }

  async consumeTransaction(id: string): Promise<boolean> {
    if (!this.db) {
      const item = [...this.transactions.values()].find((row) => row.id === id);
      if (!item || item.consumedAt || item.expiresAt <= new Date()) return false;
      item.consumedAt = new Date(); return true;
    }
    const rows = await this.db.update(schema.authTransactions).set({ consumedAt: new Date() }).where(and(
      eq(schema.authTransactions.id, id), isNull(schema.authTransactions.consumedAt),
      gt(schema.authTransactions.expiresAt, new Date()),
    )).returning({ id: schema.authTransactions.id });
    return rows.length === 1;
  }

  async createTicket(record: LoginTicketRecord) {
    if (!this.db) { this.tickets.set(record.ticketHash, record); return; }
    await this.db.insert(schema.authLoginTickets).values(record);
  }

  async findActiveTicket(ticketHash: string): Promise<LoginTicketRecord | null> {
    if (!this.db) {
      const item = this.tickets.get(ticketHash);
      return item && !item.consumedAt && item.expiresAt > new Date() ? item : null;
    }
    const [row] = await this.db.select().from(schema.authLoginTickets).where(and(
      eq(schema.authLoginTickets.ticketHash, ticketHash), isNull(schema.authLoginTickets.consumedAt),
      gt(schema.authLoginTickets.expiresAt, new Date()),
    )).limit(1);
    return row ?? null;
  }

  async consumeTicket(id: string): Promise<boolean> {
    if (!this.db) {
      const item = [...this.tickets.values()].find((row) => row.id === id);
      if (!item || item.consumedAt || item.expiresAt <= new Date()) return false;
      item.consumedAt = new Date(); return true;
    }
    const rows = await this.db.update(schema.authLoginTickets).set({ consumedAt: new Date() }).where(and(
      eq(schema.authLoginTickets.id, id), isNull(schema.authLoginTickets.consumedAt),
      gt(schema.authLoginTickets.expiresAt, new Date()),
    )).returning({ id: schema.authLoginTickets.id });
    return rows.length === 1;
  }

  private identityKey(provider: AuthProvider, subject: string) { return `${provider}:${subject}`; }

  async findIdentity(provider: AuthProvider, subject: string) {
    if (!this.db) return this.identities.get(this.identityKey(provider, subject)) ?? null;
    const [row] = await this.db.select().from(schema.authIdentities).where(and(
      eq(schema.authIdentities.provider, provider), eq(schema.authIdentities.providerSubject, subject),
    )).limit(1);
    return row ?? null;
  }

  async listIdentities(userId: string) {
    if (!this.db) return [...this.identities.values()].filter((item) => item.userId === userId);
    return this.db.select().from(schema.authIdentities).where(eq(schema.authIdentities.userId, userId));
  }

  async createIdentity(userId: string, identity: ProviderIdentity) {
    const values = { ...identity, userId, lastLoginAt: new Date() };
    if (!this.db) {
      const key = this.identityKey(identity.provider, identity.providerSubject);
      const previous = this.identities.get(key);
      if (previous && previous.userId !== userId) throw new Error('Identity already belongs to another user.');
      this.identities.set(key, { id: previous?.id ?? randomUUID(), ...values }); return;
    }
    await this.db.insert(schema.authIdentities).values(values).onConflictDoUpdate({
      target: [schema.authIdentities.provider, schema.authIdentities.providerSubject],
      set: {
        providerEmail: identity.providerEmail,
        providerEmailVerified: identity.providerEmailVerified,
        ...(identity.displayName ? { displayName: identity.displayName } : {}),
        ...(identity.avatarUrl ? { avatarUrl: identity.avatarUrl } : {}),
        lastLoginAt: new Date(),
      },
    });
  }

  async deleteIdentity(userId: string, provider: AuthProvider): Promise<boolean> {
    if (!this.db) {
      const item = [...this.identities.entries()].find(([, row]) => row.userId === userId && row.provider === provider);
      if (!item) return false; this.identities.delete(item[0]); return true;
    }
    const rows = await this.db.delete(schema.authIdentities).where(and(
      eq(schema.authIdentities.userId, userId), eq(schema.authIdentities.provider, provider),
    )).returning({ id: schema.authIdentities.id });
    return rows.length > 0;
  }

  async createSession(record: RefreshSessionRecord) {
    if (!this.db) { this.sessions.set(record.tokenHash, record); return; }
    await this.db.insert(schema.authSessions).values(record);
  }

  async findSession(tokenHash: string): Promise<RefreshSessionRecord | null> {
    if (!this.db) return this.sessions.get(tokenHash) ?? null;
    const [row] = await this.db.select().from(schema.authSessions).where(eq(schema.authSessions.tokenHash, tokenHash)).limit(1);
    return row ?? null;
  }

  async consumeSession(id: string): Promise<boolean> {
    if (!this.db) {
      const item = [...this.sessions.values()].find((row) => row.id === id);
      if (!item || item.consumedAt || item.revokedAt || item.expiresAt <= new Date()) return false;
      item.consumedAt = new Date(); item.lastUsedAt = new Date(); return true;
    }
    const rows = await this.db.update(schema.authSessions).set({ consumedAt: new Date(), lastUsedAt: new Date() }).where(and(
      eq(schema.authSessions.id, id), isNull(schema.authSessions.consumedAt), isNull(schema.authSessions.revokedAt),
      gt(schema.authSessions.expiresAt, new Date()),
    )).returning({ id: schema.authSessions.id });
    return rows.length === 1;
  }

  async revokeFamily(familyId: string) {
    if (!this.db) {
      for (const item of this.sessions.values()) if (item.familyId === familyId) item.revokedAt = new Date();
      return;
    }
    await this.db.update(schema.authSessions).set({ revokedAt: new Date() }).where(eq(schema.authSessions.familyId, familyId));
  }

  async revokeUserSessions(userId: string) {
    if (!this.db) {
      for (const item of this.sessions.values()) if (item.userId === userId) item.revokedAt = new Date();
      return;
    }
    await this.db.update(schema.authSessions).set({ revokedAt: new Date() }).where(eq(schema.authSessions.userId, userId));
  }

  async createPasswordReset(record: { id: string; userId: string; tokenHash: string; expiresAt: Date; consumedAt?: Date | null }) {
    if (!this.db) { this.passwordResets.set(record.tokenHash, record); return; }
    await this.db.insert(schema.authPasswordResetTokens).values(record);
  }

  async consumePasswordReset(tokenHash: string) {
    if (!this.db) {
      const item = this.passwordResets.get(tokenHash);
      if (!item || item.consumedAt || item.expiresAt <= new Date()) return null;
      item.consumedAt = new Date(); return item;
    }
    const [row] = await this.db.update(schema.authPasswordResetTokens).set({ consumedAt: new Date() }).where(and(
      eq(schema.authPasswordResetTokens.tokenHash, tokenHash), isNull(schema.authPasswordResetTokens.consumedAt),
      gt(schema.authPasswordResetTokens.expiresAt, new Date()),
    )).returning();
    return row ?? null;
  }
}
