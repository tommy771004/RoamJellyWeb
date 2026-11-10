import assert from 'node:assert/strict';
import test from 'node:test';
import { providerConfig, socialProviderDiagnostics } from '../providerAuth';
import { socialProviderAvailability } from '../socialAuthBroker';

const AUTH_ENV_NAMES = [
  'SOCIAL_AUTH_CALLBACK_ENABLED',
  'APPLE_CLIENT_ID',
  'APPLE_REDIRECT_URI',
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_PRIVATE_KEY',
  'APPLE_PRIVATE_KEY_REF',
  'APPLE_PRIVATE_KEY_SECRET_REF',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_REDIRECT_URI',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CLIENT_SECRET_REF',
  'GOOGLE_CLIENT_SECRET_SECRET_REF',
  'LINE_CHANNEL_ID',
  'LINE_REDIRECT_URI',
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_SECRET_REF',
  'LINE_CHANNEL_SECRET_SECRET_REF',
] as const;

function withoutSocialAuthEnvironment(run: () => void): void {
  const previous = Object.fromEntries(AUTH_ENV_NAMES.map((name) => [name, process.env[name]]));
  try {
    for (const name of AUTH_ENV_NAMES) delete process.env[name];
    run();
  } finally {
    for (const name of AUTH_ENV_NAMES) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test('missing social login parameters safely disable every provider', () => {
  withoutSocialAuthEnvironment(() => {
    process.env.SOCIAL_AUTH_CALLBACK_ENABLED = 'true';
    assert.deepEqual(socialProviderAvailability(), { apple: false, google: false, line: false });
  });
});

test('each provider is enabled only when all of its required parameters exist', () => {
  withoutSocialAuthEnvironment(() => {
    process.env.SOCIAL_AUTH_CALLBACK_ENABLED = 'true';
    process.env.GOOGLE_CLIENT_ID = 'google-client';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.GOOGLE_REDIRECT_URI = 'https://api.example.com/callback/google';
    assert.deepEqual(socialProviderAvailability(), { apple: false, google: true, line: false });

    process.env.LINE_CHANNEL_ID = 'line-channel';
    process.env.LINE_REDIRECT_URI = 'https://api.example.com/callback/line';
    assert.equal(providerConfig('line'), null);

    process.env.LINE_CHANNEL_SECRET = 'line-secret';
    assert.deepEqual(socialProviderAvailability(), { apple: false, google: true, line: true });

    process.env.APPLE_CLIENT_ID = 'apple-client';
    process.env.APPLE_REDIRECT_URI = 'https://api.example.com/callback/apple';
    process.env.APPLE_TEAM_ID = 'apple-team';
    process.env.APPLE_KEY_ID = 'apple-key-id';
    assert.equal(providerConfig('apple'), null);

    process.env.APPLE_PRIVATE_KEY = 'apple-private-key';
    assert.deepEqual(socialProviderAvailability(), { apple: true, google: true, line: true });
  });
});

test('global callback switch and unreadable secret references fail closed', () => {
  withoutSocialAuthEnvironment(() => {
    process.env.GOOGLE_CLIENT_ID = 'google-client';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    process.env.GOOGLE_REDIRECT_URI = 'https://api.example.com/callback/google';
    assert.equal(providerConfig('google'), null);

    process.env.SOCIAL_AUTH_CALLBACK_ENABLED = 'true';
    delete process.env.GOOGLE_CLIENT_SECRET;
    process.env.GOOGLE_CLIENT_SECRET_REF = 'file:///path/that/does/not/exist';
    assert.doesNotThrow(() => socialProviderAvailability());
    assert.equal(socialProviderAvailability().google, false);
  });
});

test('values pasted with quotes or whitespace from .env.example still work', () => {
  withoutSocialAuthEnvironment(() => {
    process.env.SOCIAL_AUTH_CALLBACK_ENABLED = ' "true" ';
    process.env.GOOGLE_CLIENT_ID = '"google-client"';
    process.env.GOOGLE_REDIRECT_URI = "'https://api.example.com/callback/google'";
    process.env.GOOGLE_CLIENT_SECRET_REF = '"env://GOOGLE_CLIENT_SECRET_VALUE"';
    process.env.GOOGLE_CLIENT_SECRET_VALUE = 'google-secret';
    try {
      const config = providerConfig('google');
      assert.equal(config?.clientId, 'google-client');
      assert.equal(config?.redirectUri, 'https://api.example.com/callback/google');
      assert.equal(config?.clientSecret, 'google-secret');
    } finally {
      delete process.env.GOOGLE_CLIENT_SECRET_VALUE;
    }
  });
});

test('diagnostics name the env var at fault without leaking values', () => {
  withoutSocialAuthEnvironment(() => {
    process.env.SOCIAL_AUTH_CALLBACK_ENABLED = 'true';
    process.env.GOOGLE_CLIENT_ID = 'google-client';
    process.env.GOOGLE_REDIRECT_URI = 'https://api.example.com/callback/google';
    process.env.GOOGLE_CLIENT_SECRET_REF = 'GOCSPX-raw-secret-pasted-into-ref';
    const diag = socialProviderDiagnostics();
    assert.equal(providerConfig('google'), null);
    assert.ok(diag.google?.some((p) => p.includes('GOOGLE_CLIENT_SECRET_REF must start with env://')));
    assert.ok(!JSON.stringify(diag).includes('GOCSPX'), 'secret value must not appear');
    assert.equal(diag.line, undefined, 'unconfigured providers are not reported');
    assert.equal(diag.apple, undefined);

    process.env.GOOGLE_CLIENT_SECRET_REF = 'env://MISSING_SECRET_VAR';
    assert.ok(socialProviderDiagnostics().google?.some((p) => p.includes('MISSING_SECRET_VAR')));

    process.env.SOCIAL_AUTH_CALLBACK_ENABLED = 'false';
    process.env.GOOGLE_CLIENT_SECRET = 'google-secret';
    assert.deepEqual(socialProviderDiagnostics().google, ['SOCIAL_AUTH_CALLBACK_ENABLED is not "true"']);
  });
});
