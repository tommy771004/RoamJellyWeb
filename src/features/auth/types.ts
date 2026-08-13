export type AuthProvider = 'apple' | 'google' | 'line';

export type SocialProviderAvailability = Record<AuthProvider, boolean>;

export type LoginStatus =
  | 'idle'
  | 'submitting-password'
  | 'starting-oauth'
  | 'waiting-oauth'
  | 'exchanging-session'
  | 'success'
  | 'error';

export type AuthErrorCode =
  | 'AUTH_CANCELLED'
  | 'AUTH_PROVIDER_ERROR'
  | 'AUTH_STATE_MISMATCH'
  | 'AUTH_TICKET_EXPIRED'
  | 'AUTH_TICKET_USED'
  | 'AUTH_SESSION_EXCHANGE_FAILED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_LINK_REQUIRED'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED';

export interface StartAuthRequest {
  provider: AuthProvider;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  appRedirectUri: string;
  requestId: string;
  link?: boolean;
}

export interface StartAuthResponse {
  authorizationUrl: string;
  transactionId: string;
  expiresIn: number;
}

export interface PendingAuthTransaction {
  provider: AuthProvider;
  state: string;
  codeVerifier: string;
  authorizationUrl: string;
  transactionId: string;
  requestId: string;
  expiresAt: number;
}

export interface AuthSessionResponse {
  accessToken?: string;
  access_token?: string;
  expiresIn?: number;
  expires_in?: number;
  refreshSession?: boolean;
  user: {
    id: string;
    displayName?: string;
    display_name?: string;
    email?: string;
  };
}

export interface AccountLinkDetails {
  linkTicket: string;
}
