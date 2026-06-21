import type { Request, Response } from 'express';
import type { AuthUser } from './jwt';

export type TripRole = 'owner' | 'editor' | 'viewer';

export type AuthedRequest = Request & { authUser?: AuthUser };

const ROLE_RANK: Record<TripRole, number> = { viewer: 1, editor: 2, owner: 3 };

export function hasRequiredRole(role: TripRole, required: TripRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export function getTokenFromRequest(req: Request): string | null {
  const value = req.headers.authorization;
  if (!value || !value.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim() || null;
}

export function getRequestUserId(req: Request): string | null {
  return (req as AuthedRequest).authUser?.userId ?? null;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0] ?? '').trim() || req.ip || 'unknown';
  }
  return req.ip || 'unknown';
}

export interface TripRoleResult {
  userId: string;
  role: TripRole;
}

export interface TripMemberRepo {
  getTripMemberRole(tripId: string, userId: string): Promise<TripRole | null>;
}

/**
 * Builds the trip-level authorization guard. Responds 401/403 and returns null
 * on failure; otherwise returns the resolved { userId, role }.
 */
export function createEnsureTripRole(repo: TripMemberRepo) {
  return async (
    req: Request,
    res: Response,
    tripId: string,
    requiredRole: TripRole,
  ): Promise<TripRoleResult | null> => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return null;
    }

    const role = await repo.getTripMemberRole(tripId, userId);
    if (!role) {
      res.status(403).json({ status: 'error', message: 'forbidden: not a trip member' });
      return null;
    }

    if (!hasRequiredRole(role, requiredRole)) {
      res.status(403).json({ status: 'error', message: 'forbidden: insufficient role' });
      return null;
    }

    return { userId, role };
  };
}

export type EnsureTripRole = ReturnType<typeof createEnsureTripRole>;
