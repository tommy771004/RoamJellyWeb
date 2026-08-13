import assert from 'node:assert/strict';
import test from 'node:test';
import { registerAuthRoutes } from '../../routes/authRoutes';

test('guest auth fails safely instead of rejecting the route when JWT is unavailable', async () => {
  const previousJwtSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  const handlers = new Map<string, Array<(...args: any[]) => any>>();
  const app = {
    get: (path: string, ...registered: Array<(...args: any[]) => any>) => {
      handlers.set(`GET ${path}`, registered);
    },
    post: (path: string, ...registered: Array<(...args: any[]) => any>) => {
      handlers.set(`POST ${path}`, registered);
    },
    delete: (path: string, ...registered: Array<(...args: any[]) => any>) => {
      handlers.set(`DELETE ${path}`, registered);
    },
  };

  try {
    registerAuthRoutes(app as any, {
      repo: {
        ensureUser: async () => undefined,
      } as any,
      authRepo: {} as any,
      guestAuthLimiter: ((_req: any, _res: any, next: () => void) => next()) as any,
      loginLimiter: ((_req: any, _res: any, next: () => void) => next()) as any,
      registerLimiter: ((_req: any, _res: any, next: () => void) => next()) as any,
      enableDevToken: false,
      enableGuest: true,
    });

    const routeHandlers = handlers.get('POST /api/auth/guest');
    assert.ok(routeHandlers);
    const guestHandler = routeHandlers.at(-1)!;
    let statusCode = 200;
    let payload: any;
    const response = {
      status(code: number) { statusCode = code; return this; },
      json(value: any) { payload = value; return this; },
    };

    await guestHandler({ body: {} }, response);

    assert.equal(statusCode, 503);
    assert.equal(payload.code, 'AUTH_GUEST_UNAVAILABLE');
    assert.equal(payload.message, '訪客登入暫時無法使用，請稍後再試。');
  } finally {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
  }
});
