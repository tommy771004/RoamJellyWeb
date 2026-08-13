import { randomUUID } from 'node:crypto';
import type { Express, RequestHandler } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import { signAccessToken } from '../auth/jwt';
import { hashPassword, verifyPassword } from '../auth/password';
import { registerSocialAuthBrokerRoutes } from '../auth/socialAuthBroker';
import type { AuthRepository } from '../auth/authRepository';
import { issueAppSession } from '../auth/sessionService';
import { randomToken, sha256 } from '../auth/authCrypto';

export interface AuthRoutesDeps {
  repo: AppRepository;
  authRepo: AuthRepository;
  guestAuthLimiter: RequestHandler;
  loginLimiter: RequestHandler;
  registerLimiter: RequestHandler;
  enableDevToken: boolean;
  enableGuest: boolean;
}

const expiresIn = () => process.env.JWT_EXPIRES_IN ?? '12h';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registers /api/auth/* routes. Must be mounted AFTER the global auth middleware
 * (which exempts these paths) so the request pipeline order is preserved.
 */
export function registerAuthRoutes(app: Express, deps: AuthRoutesDeps): void {
  const { repo, authRepo, guestAuthLimiter, loginLimiter, registerLimiter, enableDevToken, enableGuest } = deps;

  registerSocialAuthBrokerRoutes(app, loginLimiter, { repo, authRepo });

  app.post('/api/auth/password/forgot', loginLimiter, async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const user = EMAIL_RE.test(email) ? await repo.getUserByEmail(email) : null;
    let devResetUrl: string | undefined;
    if (user?.passwordHash && user.status !== 'disabled') {
      const token = randomToken(48);
      await authRepo.createPasswordReset({
        id: randomUUID(), userId: user.userId, tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), consumedAt: null,
      });
      const webBase = process.env.AUTH_WEB_BASE_URL?.replace(/\/+$/, '') || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${webBase}/reset-password?token=${encodeURIComponent(token)}`;
      if (process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM) {
        const mail = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.AUTH_EMAIL_FROM, to: [email], subject: '重設你的 RoamJelly 密碼',
            html: `<p>你要求重設 RoamJelly 密碼。此連結 30 分鐘後失效：</p><p><a href="${resetUrl}">重設密碼</a></p><p>若非你本人操作，請忽略此信。</p>`,
          }),
        });
        if (!mail.ok) console.error('password reset email delivery failed', mail.status);
      } else if (process.env.NODE_ENV !== 'production' && process.env.AUTH_EXPOSE_DEV_RESET_URL === 'true') {
        devResetUrl = resetUrl;
      }
    }
    res.status(202).json({
      status: 'success', message: '如果此 Email 已註冊，我們會寄送重設密碼連結。',
      ...(devResetUrl ? { dev_reset_url: devResetUrl } : {}),
    });
  });

  app.post('/api/auth/password/reset', loginLimiter, async (req, res) => {
    const token = String(req.body?.token ?? '');
    const password = String(req.body?.password ?? '');
    if (!/^[A-Za-z0-9_-]{40,256}$/.test(token) || password.length < 8 || password.length > 128) {
      res.status(400).json({ status: 'error', message: '重設連結或新密碼格式不正確。' }); return;
    }
    const reset = await authRepo.consumePasswordReset(sha256(token));
    if (!reset) { res.status(410).json({ status: 'error', message: '重設連結已失效，請重新申請。' }); return; }
    await repo.updateUserPassword(reset.userId, await hashPassword(password));
    await authRepo.revokeUserSessions(reset.userId);
    res.json({ status: 'success', message: '密碼已更新，請重新登入。' });
  });

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
      try {
        const rawDisplayName = String(req.body?.display_name ?? '').trim();
        const displayName = (rawDisplayName || '訪客旅人').slice(0, 32);
        const suffix = Math.random().toString(36).slice(2, 8);
        const userId = `guest_${Date.now().toString(36)}_${suffix}`;
        const username = userId;
        const token = signAccessToken({ userId });

        await repo.ensureUser(userId, username, displayName);

        res.status(201).json({
          status: 'success',
          token,
          user_id: userId,
          user: { id: userId, display_name: displayName },
          expires_in: expiresIn(),
        });
      } catch (error) {
        console.error(
          '[Auth] guest session creation failed',
          error instanceof Error ? error.message : String(error),
        );
        res.status(503).json({
          status: 'error',
          code: 'AUTH_GUEST_UNAVAILABLE',
          message: '訪客登入暫時無法使用，請稍後再試。',
        });
      }
    });
  }

  // ── Auth: Register ──────────────────────────────────────────────────────────
  app.post('/api/auth/register', registerLimiter, async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const legacyUsername = String(req.body?.username ?? '').trim();
    const username = email ? `email_${randomUUID()}` : legacyUsername;
    const password = String(req.body?.password ?? '');
    const emailDisplayName = email ? email.split('@')[0] : username;
    const displayName = String(req.body?.display_name ?? emailDisplayName).trim() || emailDisplayName;
    const avatar = req.body?.avatar ? String(req.body.avatar).trim() : undefined;

    if ((!email && !username) || !password) {
      res.status(400).json({ status: 'error', message: '請提供電子郵件和密碼' });
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      res.status(400).json({ status: 'error', message: '電子郵件格式不正確。' });
      return;
    }
    if (!email && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      res.status(400).json({ status: 'error', message: '使用者名稱需為 3–30 個英數字或底線' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ status: 'error', message: '密碼長度需在 8–128 個字元之間' });
      return;
    }

    const existing = email ? await repo.getUserByEmail(email) : await repo.getUserByUsername(username);
    if (existing) {
      res.status(409).json({ status: 'error', message: '此電子郵件已被使用。' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const userId = email ? `usr_${randomUUID()}` : username;
    await repo.createUserWithPassword(username, displayName, passwordHash, avatar, email || undefined, userId);

    const session = await issueAppSession(authRepo, req, res, {
      userId, displayName, email: email || undefined,
    }, true);
    res.status(201).json({ ...session, token: session.accessToken, user_id: userId, expires_in: session.expiresIn });
  });

  // ── Auth: Login ─────────────────────────────────────────────────────────────
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const username = String(req.body?.username ?? '').trim();
    const identity = email || username;
    const password = String(req.body?.password ?? '');

    if (!identity || !password) {
      res.status(400).json({ status: 'error', message: '請提供電子郵件和密碼。' });
      return;
    }

    const user = email ? await repo.getUserByEmail(email) : await repo.getUserByUsername(username);
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ status: 'error', message: '電子郵件或密碼不正確。' });
      return;
    }
    if (user.status === 'disabled') {
      res.status(403).json({ status: 'error', error: 'ACCOUNT_DISABLED', message: '此帳號目前無法登入。' });
      return;
    }

    const session = await issueAppSession(authRepo, req, res, {
      userId: user.userId, displayName: user.displayName, email: user.primaryEmail,
    }, Boolean(req.body?.remember_me));
    res.json({ ...session, token: session.accessToken, user_id: user.userId, expires_in: session.expiresIn });
  });
}
