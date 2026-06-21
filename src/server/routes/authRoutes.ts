import type { Express, RequestHandler } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import { signAccessToken } from '../auth/jwt';
import { hashPassword, verifyPassword } from '../auth/password';

export interface AuthRoutesDeps {
  repo: AppRepository;
  guestAuthLimiter: RequestHandler;
  loginLimiter: RequestHandler;
  registerLimiter: RequestHandler;
  enableDevToken: boolean;
  enableGuest: boolean;
}

const expiresIn = () => process.env.JWT_EXPIRES_IN ?? '12h';

/**
 * Registers /api/auth/* routes. Must be mounted AFTER the global auth middleware
 * (which exempts these paths) so the request pipeline order is preserved.
 */
export function registerAuthRoutes(app: Express, deps: AuthRoutesDeps): void {
  const { repo, guestAuthLimiter, loginLimiter, registerLimiter, enableDevToken, enableGuest } = deps;

  if (enableDevToken) {
    app.post('/api/auth/dev-token', async (req, res) => {
      if (process.env.NODE_ENV === 'production') {
        res.status(404).json({ status: 'error', message: 'endpoint disabled in production' });
        return;
      }

      const userId = String(req.body?.user_id ?? 'demo_user').trim() || 'demo_user';
      await repo.ensureUser(userId, userId);

      const token = signAccessToken({ userId });
      res.json({ status: 'success', token, user_id: userId, expires_in: expiresIn() });
    });
  }

  if (enableGuest) {
    app.post('/api/auth/guest', guestAuthLimiter, async (req, res) => {
      const rawDisplayName = String(req.body?.display_name ?? '').trim();
      const displayName = (rawDisplayName || '訪客旅人').slice(0, 32);
      const suffix = Math.random().toString(36).slice(2, 8);
      const userId = `guest_${Date.now().toString(36)}_${suffix}`;
      const username = userId;

      await repo.ensureUser(userId, username, displayName);

      const token = signAccessToken({ userId });
      res.status(201).json({
        status: 'success',
        token,
        user_id: userId,
        user: { id: userId, display_name: displayName },
        expires_in: expiresIn(),
      });
    });
  }

  // ── Auth: Register ──────────────────────────────────────────────────────────
  app.post('/api/auth/register', registerLimiter, async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const displayName = String(req.body?.display_name ?? username).trim() || username;
    const avatar = req.body?.avatar ? String(req.body.avatar).trim() : undefined;

    if (!username || !password) {
      res.status(400).json({ status: 'error', message: '請提供使用者名稱和密碼' });
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      res.status(400).json({ status: 'error', message: '使用者名稱需為 3–30 個英數字或底線' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ status: 'error', message: '密碼長度需在 8–128 個字元之間' });
      return;
    }

    const existing = await repo.getUserByUsername(username);
    if (existing) {
      res.status(409).json({ status: 'error', message: '此使用者名稱已被使用' });
      return;
    }

    const passwordHash = await hashPassword(password);
    await repo.createUserWithPassword(username, displayName, passwordHash, avatar);

    const token = signAccessToken({ userId: username });
    res.status(201).json({ status: 'success', token, user_id: username, expires_in: expiresIn() });
  });

  // ── Auth: Login ─────────────────────────────────────────────────────────────
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!username || !password) {
      res.status(400).json({ status: 'error', message: '請提供使用者名稱和密碼' });
      return;
    }

    const user = await repo.getUserByUsername(username);
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ status: 'error', message: '使用者名稱或密碼不正確' });
      return;
    }

    const token = signAccessToken({ userId: user.userId });
    res.json({ status: 'success', token, user_id: user.userId, expires_in: expiresIn() });
  });
}
