import jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
}

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

const DEFAULT_EXPIRES_IN = '12h';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required for authentication.');
  }
  return secret;
}

export function signAccessToken(user: AuthUser): string {
  const payload: AccessTokenPayload = {
    sub: user.userId,
    type: 'access',
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? DEFAULT_EXPIRES_IN) as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
    if (!decoded?.sub || decoded.type !== 'access') {
      return null;
    }
    return { userId: decoded.sub };
  } catch {
    return null;
  }
}
