# Developers 設定文件：Apple ID、Google、LINE Login

> 適用範圍：Tauri v2 + React + TypeScript 跨平台桌面應用程式。
>
> 目標：以同一套安全架構接入 **Sign in with Apple、Google Sign-In、LINE Login**，避免把 Provider Secret 放入桌面 App，並支援後續帳號綁定與 Session 管理。

---

## 1. 建議架構

桌面 App 屬於 public client，二進位檔可被使用者取得與反編譯，因此任何放進 Tauri bundle 的 secret 都不能視為真正秘密。

因此建議採用 **Auth Broker + System Browser + One-time Ticket + App Deep Link** 架構：

```text
Tauri App
   │
   │ 1. GET /auth/{provider}/start
   ▼
Auth Broker / API
   │
   │ 2. Redirect
   ▼
Apple / Google / LINE
   │
   │ 3. HTTPS OAuth Callback
   ▼
Auth Broker / API
   │
   │ 4. Validate + Create one-time ticket
   │ 5. Redirect myapp://auth/callback?ticket=...&state=...
   ▼
Tauri App
   │
   │ 6. POST /auth/session/exchange
   ▼
Application Session
```

### 這個架構的優點

- Apple `.p8` private key 不進桌面 App。
- LINE Channel Secret 不進桌面 App。
- Google backend client secret 不進桌面 App。
- Provider access token / refresh token 可留在 Server Side。
- App 只取得自己系統的 session。
- 三個 Provider 的 callback UX 可以統一。
- 容易實作 Account Linking、撤銷、風險控管與 Audit Log。

---

## 2. 禁止的做法

不可：

```text
src/config.ts
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GOOGLE_CLIENT_SECRET="..."
LINE_CHANNEL_SECRET="..."
```

也不可放在：

- `.env` 後被打包進 frontend bundle
- `tauri.conf.json`
- `capabilities/*.json`
- localStorage
- IndexedDB
- Git Repository
- CI build artifacts

`.env` 對桌面前端而言只是建置變數，不等於安全 Secret Store。

---

## 3. 統一 Auth Flow

### 3.1 App 產生 Transaction

點擊 Provider 後，App 產生：

- `state`: 256-bit random
- `nonce`: OIDC provider 使用
- `code_verifier`: PKCE random verifier
- `code_challenge`: SHA256 + base64url
- `transaction_id`: App 內部追蹤 ID

只保留短時間，例如 5–10 分鐘。

### 3.2 呼叫 Auth Broker

```http
POST /v1/auth/start
Content-Type: application/json

{
  "provider": "google",
  "state": "...",
  "nonce": "...",
  "codeChallenge": "...",
  "codeChallengeMethod": "S256",
  "appRedirectUri": "myproduct://auth/callback"
}
```

回傳：

```json
{
  "authorizationUrl": "https://...",
  "transactionId": "...",
  "expiresIn": 600
}
```

App 用 OS default browser 開啟 `authorizationUrl`。

### 3.3 Provider Callback

Provider 一律 callback 到 Backend 的 HTTPS URL，例如：

```text
https://api.example.com/v1/oauth/callback/apple
https://api.example.com/v1/oauth/callback/google
https://api.example.com/v1/oauth/callback/line
```

Backend 完成：

1. state 驗證
2. code exchange
3. nonce 驗證
4. ID Token signature / issuer / audience / expiry 驗證
5. Provider user identity normalization
6. Account lookup / linking rule
7. 產生一次性 App Ticket

### 3.4 Deep Link 回 App

Backend：

```http
302 Location: myproduct://auth/callback?ticket=ONE_TIME_TICKET&state=...
```

Ticket 必須：

- single use
- 高 entropy
- TTL 建議 30–120 秒
- 不包含 raw provider token
- 不包含敏感 profile JSON

### 3.5 App 換取 Session

```http
POST /v1/auth/session/exchange
Authorization: none
Content-Type: application/json

{
  "ticket": "ONE_TIME_TICKET",
  "state": "...",
  "codeVerifier": "..."
}
```

成功：

```json
{
  "accessToken": "APP_ACCESS_TOKEN",
  "expiresIn": 900,
  "refreshSession": true,
  "user": {
    "id": "usr_...",
    "displayName": "...",
    "email": "..."
  }
}
```

---

# Part A — Sign in with Apple

## 4. Apple Developer 前置需求

需要 Apple Developer Program 權限。

準備：

- Apple Developer Team ID
- App ID / Bundle ID
- Sign in with Apple capability
- Services ID（Web OAuth client identifier）
- Sign in with Apple Key
- Key ID
- `.p8` Private Key
- HTTPS Domain
- Return URL

---

## 5. Apple 設定步驟

### 5.1 App ID

Apple Developer Portal：

```text
Certificates, Identifiers & Profiles
→ Identifiers
→ App IDs
```

建立/選擇 App ID：

```text
com.company.product
```

Capabilities 開啟：

```text
Sign in with Apple
```

### 5.2 Services ID

建立 Services ID，例如：

```text
com.company.product.login
```

這通常作為 Web/OAuth `client_id`。

在 Sign in with Apple 設定：

- Primary App ID
- Domains
- Return URLs

範例：

```text
Domain:
auth.example.com

Return URL:
https://api.example.com/v1/oauth/callback/apple
```

Return URL 必須以 Apple Portal 實際允許規格為準；桌面 App 不應把 Apple OAuth 直接 callback 到不受支援的自訂 scheme，因此使用 Backend HTTPS callback 最穩定。

### 5.3 建立 Sign in with Apple Key

```text
Keys
→ Create a Key
→ Enable Sign in with Apple
```

取得：

- Key ID
- `.p8` Private Key

`.p8` 只下載一次，放入 Server Secret Manager。

不可放進 Tauri App。

---

## 6. Apple client_secret

Apple OAuth token endpoint 的 `client_secret` 不是固定字串，而是由 Developer Key 簽發的 JWT。

Backend 產生 JWT Header：

```json
{
  "alg": "ES256",
  "kid": "APPLE_KEY_ID"
}
```

Claims：

```json
{
  "iss": "APPLE_TEAM_ID",
  "iat": 1234567890,
  "exp": 1234567890,
  "aud": "https://appleid.apple.com",
  "sub": "APPLE_SERVICES_ID"
}
```

以 `.p8` ES256 private key 簽署。

建議由 Backend 動態產生並快取短時間，不要把長效 client secret 寫死。

---

## 7. Apple Authorization Request

概念：

```text
https://appleid.apple.com/auth/authorize
  ?client_id=com.company.product.login
  &redirect_uri=https%3A%2F%2Fapi.example.com%2Fv1%2Foauth%2Fcallback%2Fapple
  &response_type=code
  &response_mode=form_post
  &scope=name%20email
  &state=...
  &nonce=...
```

建議 scope：

```text
name email
```

### Apple 特別注意

- `name` 可能只在使用者第一次授權時回傳。
- 使用者可能選擇 Hide My Email，Email 會是 Apple Private Relay。
- 不能因後續 callback 沒有 name 就覆蓋 DB 既有姓名。
- 唯一身份主鍵應使用 Apple token 的 subject (`sub`)，不是 Email。

---

## 8. Apple Token Validation

Backend 驗證至少包含：

- JWT signature
- `iss == https://appleid.apple.com`
- `aud == configured client_id`
- `exp`
- `nonce`（若流程使用）
- `sub`

Provider Identity 建議正規化：

```json
{
  "provider": "apple",
  "providerSubject": "apple-sub",
  "email": "...",
  "emailVerified": true,
  "displayName": "..."
}
```

---

# Part B — Google Login

## 9. Google Cloud 前置需求

Google Cloud Console / Google Auth Platform 準備：

- Project
- OAuth consent screen / branding
- OAuth client
- Authorized redirect URI（若由 Backend callback）
- Scopes

建議統一走 Backend HTTPS callback，因此建立 Web application OAuth Client 最容易和 Apple/LINE 共用 Auth Broker 架構。

若另外實作純 installed-app flow，可建立 Desktop client 並採 loopback callback + PKCE；但三 Provider 統一性會下降。

---

## 10. Google OAuth Client 設定

建立 OAuth 2.0 Client：

```text
Application type: Web application
```

Authorized redirect URI：

```text
https://api.example.com/v1/oauth/callback/google
```

Production 與 Staging 分開：

```text
https://api.example.com/v1/oauth/callback/google
https://api-staging.example.com/v1/oauth/callback/google
```

不要把 localhost production callback 留在正式 Client，除非有明確開發用途與安全政策。

---

## 11. Google Scopes

最小化：

```text
openid
email
profile
```

不要一開始要求 Drive、Calendar、Gmail 等額外權限。

如果未來要串其他 Google API，應採 incremental authorization，而不是 Login 時一次索取。

---

## 12. Google Authorization Request

概念：

```text
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=...
  &redirect_uri=https%3A%2F%2Fapi.example.com%2Fv1%2Foauth%2Fcallback%2Fgoogle
  &response_type=code
  &scope=openid%20email%20profile
  &state=...
  &nonce=...
  &code_challenge=...
  &code_challenge_method=S256
```

必要時加入：

```text
access_type=offline
```

只有 Backend 真正需要 Google refresh token 時才使用。若只把 Google 當登入身份，不應無目的保留 provider refresh token。

---

## 13. Google Token Validation

Backend 驗證 ID Token：

- signature
- issuer
- audience
- expiry
- nonce
- subject (`sub`)
- `email_verified`

Identity：

```json
{
  "provider": "google",
  "providerSubject": "google-sub",
  "email": "user@example.com",
  "emailVerified": true,
  "displayName": "User Name",
  "avatarUrl": "https://..."
}
```

主鍵仍是 `provider + providerSubject`，不可只用 Email。

---

# Part C — LINE Login

## 14. LINE Developers 前置需求

在 LINE Developers Console：

1. 建立 Provider
2. 建立 LINE Login Channel
3. 設定 Channel Name / Description / App Type
4. 設定 Callback URL
5. 取得 Channel ID
6. 取得 Channel Secret

Channel Secret 只能放 Backend Secret Manager。

---

## 15. LINE Callback URL

建議：

```text
https://api.example.com/v1/oauth/callback/line
```

Staging 使用獨立 Channel 或至少獨立 callback/config，以避免測試 redirect 與正式環境混在一起。

---

## 16. LINE Scopes

Login 基本：

```text
openid
profile
```

需要 Email：

```text
email
```

LINE Email scope 可能需要在 Console 申請或啟用相關權限；若拿不到 Email，系統仍應能使用 `providerSubject` 建立身份，再於 onboarding 補 Email（如果產品需要）。

---

## 17. LINE Authorization Request

概念：

```text
https://access.line.me/oauth2/v2.1/authorize
  ?response_type=code
  &client_id=LINE_CHANNEL_ID
  &redirect_uri=https%3A%2F%2Fapi.example.com%2Fv1%2Foauth%2Fcallback%2Fline
  &state=...
  &scope=openid%20profile%20email
  &nonce=...
```

若目前 LINE Login Channel/SDK 支援 PKCE，使用 `S256`；若 Provider flow 需要 Channel Secret 交換 authorization code，交換動作必須由 Backend 執行，絕不能把 Channel Secret 放到 Tauri App。

---

## 18. LINE Token Validation

Backend 驗證：

- ID Token signature / verification flow
- issuer
- audience / Channel ID
- expiry
- nonce
- subject (`sub`)

Identity：

```json
{
  "provider": "line",
  "providerSubject": "line-sub",
  "email": "optional@example.com",
  "emailVerified": null,
  "displayName": "LINE Display Name",
  "avatarUrl": "https://..."
}
```

---

# Part D — Tauri v2 App 設定

## 19. Frontend 目錄建議

```text
src/
├─ features/
│  └─ auth/
│     ├─ components/
│     │  ├─ LoginPage.tsx
│     │  ├─ LoginForm.tsx
│     │  ├─ SocialLoginGroup.tsx
│     │  ├─ SocialLoginButton.tsx
│     │  └─ OAuthProgressPanel.tsx
│     ├─ hooks/
│     │  └─ useAuth.ts
│     ├─ services/
│     │  └─ authClient.ts
│     ├─ store/
│     │  └─ authStore.ts
│     ├─ types/
│     │  └─ auth.ts
│     └─ routes.ts
└─ app/
   └─ router.tsx
```

Rust：

```text
src-tauri/
├─ src/
│  ├─ auth/
│  │  ├─ mod.rs
│  │  ├─ deep_link.rs
│  │  └─ secure_store.rs
│  ├─ commands/
│  │  └─ auth.rs
│  └─ lib.rs
└─ capabilities/
   └─ auth.json
```

---

## 20. Provider 型別

```ts
export type AuthProvider = 'apple' | 'google' | 'line';

export interface StartAuthRequest {
  provider: AuthProvider;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  appRedirectUri: string;
}

export interface StartAuthResponse {
  authorizationUrl: string;
  transactionId: string;
  expiresIn: number;
}
```

---

## 21. 開啟 System Browser

Tauri 不應把 Apple/Google/LINE OAuth Login Page 直接嵌在 App WebView 中。

使用 Tauri opener/shell 對應能力開 OS default browser。

概念：

```ts
await openUrl(authorizationUrl);
```

只允許 HTTPS authorization URL，必要時對 host 做 allowlist：

- appleid.apple.com
- accounts.google.com
- access.line.me
- 自家 auth broker domain

實務上最安全的是 App 只開啟自家 Auth Broker URL，由 Server redirect 到 Provider。

---

## 22. Deep Link

建立 App scheme，例如：

```text
myproduct://auth/callback
```

Deep Link Handler 只接受：

```text
scheme = myproduct
host = auth
path = /callback
```

其他 path 拒絕。

Callback parser：

- 只取 `ticket`
- 只取 `state`
- 可取 `error` / `error_description` 的安全分類
- 不執行 URL 中任意 JavaScript/Command

---

## 23. Deep Link 安全檢查

收到：

```text
myproduct://auth/callback?ticket=abc&state=xyz
```

App 驗證：

1. 是否目前存在 pending auth transaction。
2. callback `state` 是否 constant-time match 本地 state。
3. transaction 是否未逾時。
4. ticket 是否符合格式與長度限制。
5. 只允許 exchange 一次。

state 不符：

- 清除此次 pending transaction。
- 不呼叫 session exchange。
- 顯示登入驗證失敗。

---

## 24. Tauri Capability 原則

Auth 頁只開放最小權限：

- 開啟 HTTPS URL
- deep link receive
- 必要的 secure storage command

不要為 Login Window 給：

- 任意 filesystem
- 任意 shell execute
- unrestricted process spawning
- global HTTP allow-all

Tauri v2 Capability 要依 Window / WebView label 做細分。

---

## 25. CSP

Login 頁建議：

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.example.com;
frame-src 'none';
object-src 'none';
base-uri 'none';
form-action 'self';
```

實際內容依前端 bundler、font、image CDN 調整。

重要：OAuth 頁不在 App 內 frame，所以不需要把 Google/Apple/LINE 加到 `frame-src`。

---

# Part E — Backend Auth Broker

## 26. Endpoint 建議

```text
POST /v1/auth/start
GET|POST /v1/oauth/callback/apple
GET      /v1/oauth/callback/google
GET      /v1/oauth/callback/line
POST /v1/auth/session/exchange
POST /v1/auth/session/refresh
POST /v1/auth/logout
POST /v1/auth/link/start
POST /v1/auth/link/confirm
DELETE /v1/auth/link/{provider}
```

Apple `response_mode=form_post` 時 callback 需要接受 POST form。

---

## 27. Database Schema 建議

### users

```text
id
primary_email
email_verified
status
created_at
updated_at
```

### auth_identities

```text
id
user_id
provider            // apple | google | line | password
provider_subject    // OIDC sub
provider_email
provider_email_verified
created_at
last_login_at
```

Unique Constraint：

```text
UNIQUE(provider, provider_subject)
```

不要只做：

```text
UNIQUE(provider_email)
```

### auth_transactions

```text
id
provider
state_hash
nonce_hash
code_challenge
app_redirect_uri
expires_at
consumed_at
```

### login_tickets

```text
id
user_id
transaction_id
ticket_hash
expires_at
consumed_at
```

DB 只存 ticket hash，不必存 raw ticket。

---

## 28. Account Linking 規則

推薦優先順序：

### Rule 1

`provider + sub` 已存在：直接登入原 User。

### Rule 2

`provider + sub` 不存在，但 Provider Email 與既有 User 相同：**不要自動合併**。

回傳：

```json
{
  "error": "ACCOUNT_LINK_REQUIRED",
  "existingLoginMethods": ["password"],
  "pendingProvider": "google"
}
```

要求使用者先重新驗證既有帳號，再新增 identity。

### Rule 3

沒有任何 match：建立新 User + Identity。

### Rule 4

Apple Private Relay：不可猜測與一般 Email 合併。

---

## 29. Session 設計

App Session 與 Provider Token 分離。

建議：

- App Access Token：5–15 分鐘。
- Refresh Session：可依 Remember me 決定 TTL。
- Refresh Token Rotation：每次 refresh 發新 token，舊 token 失效。
- Server 追蹤 session family，偵測 reuse。

Provider access token 若不需要呼叫 Provider API，登入完成後即可不保存或只保存必要資訊。

---

## 30. Tauri Secure Storage

原則：

- Access token：記憶體優先。
- Refresh credential：OS credential vault / keychain 或經 Rust 安全層管理。
- 不用 localStorage 儲存 refresh token。
- 不把 password 儲存於 App。

macOS：Keychain
Windows：Credential Manager / DPAPI 封裝方案
Linux：Secret Service / keyring 可用時使用

若專案需要真正跨平台封裝，可由 Rust 層提供統一 secure-store command，前端永遠拿不到 provider secret。

---

## 31. Logout

Logout 至少：

1. 呼叫 Backend revoke App Session。
2. 清除記憶體 Access Token。
3. 刪除 Secure Store Refresh Credential。
4. 清除 User Store。
5. 回 Login Page。

一般 Logout 不一定要強制登出 Apple/Google/LINE Provider 本身，否則會造成使用者其他 App 也被影響的錯誤期待。

---

## 32. Unlink Provider

Security Settings：

```text
Connected accounts
✓ Apple
✓ Google
✓ LINE
```

解除前檢查：

- 如果這是唯一登入方式，禁止解除，除非先設定另一個登入方式。
- 高風險解除需要 re-authentication。
- Server 刪除 `auth_identities` 對應記錄。

---

# Part F — Configuration

## 33. Backend Environment Variables

範例：

```dotenv
AUTH_PUBLIC_BASE_URL=https://api.example.com
APP_DEEP_LINK_URI=myproduct://auth/callback

APPLE_TEAM_ID=XXXXXXXXXX
APPLE_KEY_ID=XXXXXXXXXX
APPLE_CLIENT_ID=com.company.product.login
APPLE_PRIVATE_KEY_SECRET_REF=secret://apple/signin-key
APPLE_REDIRECT_URI=https://api.example.com/v1/oauth/callback/apple

GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET_SECRET_REF=secret://google/oauth-client-secret
GOOGLE_REDIRECT_URI=https://api.example.com/v1/oauth/callback/google

LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET_SECRET_REF=secret://line/channel-secret
LINE_REDIRECT_URI=https://api.example.com/v1/oauth/callback/line
```

Secret 值本身放 Secret Manager，不直接寫 `.env.production`。

---

## 34. Frontend Environment Variables

前端只放非 Secret：

```dotenv
VITE_API_BASE_URL=https://api.example.com
VITE_APP_DEEP_LINK_URI=myproduct://auth/callback
```

Provider Client ID 若必須在 public flow 中出現可視為 public identifier，但仍建議由 `/auth/start` server 生成 Authorization URL，前端不需持有 provider config。

登入頁不使用前端 feature flag 猜測 Provider 是否可用。前端會讀取 `/api/auth/social/providers`，由後端分別檢查 Apple、Google、LINE 的必要環境參數；只有設定完整的 Provider 才顯示登入／註冊圖示。API 無法讀取或參數缺漏時預設全部隱藏，Email 與訪客登入仍可正常使用。

---

## 35. Dev / Staging / Production 分離

建議至少：

```text
Development
Staging
Production
```

每個環境獨立：

- Redirect URI
- OAuth Client / Channel（能分就分）
- App URL scheme（可分）
- Backend signing keys
- Session key
- Database

Production callback 絕不能指向 localhost。

---

# Part G — Security Requirements

## 36. OAuth 必要防護

所有 Provider Flow：

- state
- nonce（OIDC）
- PKCE S256（可用時）
- HTTPS backend callback
- strict redirect URI
- strict issuer/audience validation
- authorization code single-use
- login ticket single-use
- short TTL
- rate limit

---

## 37. Logging

可以記錄：

```text
request_id
transaction_id
provider
result
error_category
latency_ms
user_id (成功登入後)
```

禁止 log：

- password
- authorization code
- client secret
- `.p8`
- access token
- refresh token
- id token
- raw login ticket
- raw callback query string

如果框架預設會 log query/body，要對 OAuth callback route 做 redaction。

---

## 38. Rate Limiting

建議：

```text
/auth/start              per IP + device
/oauth/callback/*        per transaction + IP
/auth/session/exchange   per ticket + IP
/login/password          per account + IP + device
```

防止暴力登入與 ticket guessing。

---

## 39. CSRF / Login CSRF

OAuth 登入同樣需要防 Login CSRF。

`state` 必須：

- cryptographically random
- 綁定 transaction
- callback 驗證
- single-use
- expiration

不能只把 provider name 編碼進 state 當驗證。

---

## 40. Replay Protection

- Authorization code：Provider 本身 single-use，但 App 仍需處理重複 callback。
- One-time ticket：Backend `consumed_at` 原子更新。
- Refresh token：rotation + reuse detection。

---

# Part H — Error Contract

## 41. 統一錯誤碼

建議 Backend：

```text
AUTH_CANCELLED
AUTH_PROVIDER_ERROR
AUTH_STATE_MISMATCH
AUTH_NONCE_MISMATCH
AUTH_CODE_EXCHANGE_FAILED
AUTH_ID_TOKEN_INVALID
AUTH_TICKET_EXPIRED
AUTH_TICKET_USED
AUTH_SESSION_EXCHANGE_FAILED
ACCOUNT_DISABLED
ACCOUNT_LINK_REQUIRED
ACCOUNT_LINK_CONFLICT
NETWORK_ERROR
RATE_LIMITED
```

Frontend 不直接顯示 raw backend message。

映射成 UI 文案。

---

# Part I — 測試

## 42. Unit Tests

Backend：

- state generate/validate
- nonce validate
- PKCE verify
- token claim validation
- ticket single-use
- ticket expiry
- account linking rules
- refresh rotation

Frontend：

- Provider Button states
- prevent double-click
- callback parsing
- state mismatch
- timeout / cancel
- auth store reset

---

## 43. Integration Tests

每個 Provider 至少：

1. 新帳號登入成功
2. 舊帳號登入成功
3. 使用者取消
4. Provider 回錯誤
5. state mismatch
6. callback 重播
7. ticket 過期
8. Email conflict
9. Account linking
10. Logout 後 session 無效

---

## 44. Apple 專項測試

- 第一次授權可取得 name 時保存。
- 第二次登入缺 name 時不覆蓋。
- Hide My Email。
- 使用者在 Apple 管理頁撤銷授權後重新登入。

---

## 45. Google 專項測試

- 一般 Gmail。
- Workspace account。
- email_verified handling。
- consent cancel。
- scope 只含 openid/email/profile。

---

## 46. LINE 專項測試

- 有 Email permission。
- 無 Email permission。
- profile picture 不存在。
- LINE 授權取消。
- Channel callback misconfiguration。

---

# Part J — 開發執行順序

## 47. Phase 1：Auth Broker 骨架

- [ ] 建立 `/auth/start`
- [ ] 建立 transaction store
- [ ] state / nonce / PKCE
- [ ] deep link ticket model
- [ ] session exchange

## 48. Phase 2：Google

Google 最適合作為第一個完成的 Provider，用來驗證通用架構。

- [ ] Google OAuth Client
- [ ] authorize
- [ ] callback
- [ ] ID token validation
- [ ] App ticket
- [ ] Tauri callback

## 49. Phase 3：LINE

- [ ] LINE Provider / Channel
- [ ] callback URL
- [ ] openid/profile/email scope
- [ ] token validation
- [ ] user mapping

## 50. Phase 4：Apple

- [ ] App ID capability
- [ ] Services ID
- [ ] Return URL
- [ ] Sign in with Apple Key
- [ ] client_secret JWT
- [ ] form_post callback
- [ ] first-login name persistence
- [ ] Private Relay handling

## 51. Phase 5：Account Linking

- [ ] Email conflict detection
- [ ] re-authentication
- [ ] add identity
- [ ] unlink safety

## 52. Phase 6：Security Hardening

- [ ] Secure Store
- [ ] CSP
- [ ] Capability minimization
- [ ] Token redaction
- [ ] Rate limits
- [ ] Refresh rotation
- [ ] Audit events

---

# Part K — Pull Request 驗收清單

## 53. Frontend

- [ ] Apple / Google / LINE Button 皆接真實 `/auth/start`。
- [ ] 不存在 Provider secret。
- [ ] OAuth 使用 system browser。
- [ ] Waiting/Cancel/Timeout/Retry 完整。
- [ ] callback state 驗證。
- [ ] 不把 token 寫 localStorage。

## 54. Tauri

- [ ] Deep Link 僅允許既定 scheme/route。
- [ ] Opener 權限最小化。
- [ ] Auth Window 不具任意 shell/filesystem 權限。
- [ ] Secure Store 透過 Rust 層。

## 55. Backend

- [ ] Apple key / Google secret / LINE secret 只存在 Secret Manager。
- [ ] ID token issuer/audience/expiry 驗證。
- [ ] state/nonce/PKCE。
- [ ] Ticket TTL + single-use。
- [ ] Account Linking 不靠 Email 自動合併。
- [ ] OAuth callback log redaction。

## 56. Provider Consoles

- [ ] Production Redirect URI 完全一致。
- [ ] Staging 與 Production 已隔離。
- [ ] Google Consent/Branding 已完成。
- [ ] Apple Services ID / Return URL 正確。
- [ ] LINE Callback URL / scope 權限正確。

---

# 57. 最終建議設定

對此 Tauri 專案，三個登入方式應統一成：

```text
UI
  ↓
System Browser
  ↓
Auth Broker HTTPS
  ↓
Apple / Google / LINE
  ↓
Auth Broker Callback
  ↓
One-time Ticket
  ↓
Tauri Deep Link
  ↓
App Session Exchange
  ↓
Secure Local Session
```

這比在前端直接交換 Provider token 更適合跨平台桌面應用，並能把 Apple Private Key、Google Client Secret、LINE Channel Secret 全部留在 Server Side。

---

# 58. 實作完成定義

三個 Provider 全部完成時，必須達成：

1. 三個 Provider 共用同一 transaction/session framework。
2. Provider secret 不存在任何 Desktop Bundle。
3. OAuth 在 system browser 完成。
4. Provider callback 回 Backend HTTPS endpoint。
5. App 只接收短效一次性 ticket。
6. Deep Link state 驗證完整。
7. Provider ID Token 在 Server 驗證。
8. App Session 與 Provider Token 分離。
9. 支援新帳號、既有帳號與安全帳號綁定。
10. Logout、Refresh Rotation、Secure Storage、Logging Redaction 與測試全部完成。
