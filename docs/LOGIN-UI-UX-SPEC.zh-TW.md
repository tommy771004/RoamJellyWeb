# Login UI/UX 詳細規格：Apple、Google、LINE 登入

> 適用範圍：Tauri v2 桌面應用程式（React + TypeScript 前端）
> 
> 視覺參考：使用者提供的 Login 畫面。保留「玻璃擬態卡片、中央品牌標誌、三個第三方登入按鈕、OR 分隔線、Email/Password、Remember me、Forgot password、Sign in、Sign up」的資訊架構，將第三方登入調整為 **Apple / Google / LINE**。

---

## 1. 文件目的

本文件定義兩種工作情境：

1. **新增 Login**：專案目前沒有完整登入頁時，新增 Login Page、第三方登入、Email/Password 登入與必要狀態。
2. **修改 Login**：專案已有 Login Page 時，依參考圖重新整理 UI、改成 Apple / Google / LINE 三種登入、補齊錯誤、載入、授權取消、帳號衝突與帳號綁定 UX。

此文件專注於 UI/UX、元件狀態與驗收標準；OAuth/OIDC、Apple Developer、Google Cloud、LINE Developers 的工程設定請參閱 `SOCIAL-LOGIN-DEVELOPER-SETUP.zh-TW.md`。

---

## 2. UX 目標

### 2.1 核心目標

- 使用者在 1 個畫面內理解所有登入方式。
- Apple、Google、LINE 都是一級登入入口，不藏在 More/Menu。
- 第三方登入失敗時不破壞 Email/Password 登入能力。
- 不讓使用者因 OAuth 取消、瀏覽器未完成授權、網路失敗而卡死。
- 首次登入與既有帳號登入流程視覺一致，但首次登入可以自然進入補資料或條款確認。
- 同一 Email 來自不同 Provider 時，必須有「帳號綁定 / 衝突處理」，禁止靜默建立重複帳號。

### 2.2 非目標

- Login 畫面不承載大量註冊欄位。
- Login 畫面不顯示 OAuth 技術名詞，例如 authorization code、PKCE、nonce。
- 不在 Login 畫面要求使用者先選「新用戶 / 舊用戶」。系統應自動判定。

---

## 3. 視覺方向

### 3.1 版型

採用參考圖的置中玻璃卡片：

- 背景：柔焦照片、品牌漸層或低對比抽象背景。
- Login Card：半透明玻璃、20–28px 圓角、1px 低對比描邊、柔和陰影。
- 內容最大寬度：`360–420px`。
- 桌面視窗建議最小：`420 × 620px`。
- 頁面四周至少 `24px` 安全邊距。

### 3.2 Glass 規則

建議：

```css
background: rgba(255, 255, 255, 0.62);
backdrop-filter: blur(28px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.72);
border-radius: 28px;
box-shadow: 0 18px 50px rgba(0, 0, 0, 0.14);
```

Windows / Linux WebView 若 backdrop-filter 效果不一致，必須提供不透明度較高的 fallback，不可犧牲文字可讀性。

### 3.3 色彩

- 主文字：高對比深灰，不使用純黑作為大面積文字。
- 次文字：需符合 WCAG AA 對比。
- Primary Sign in Button：深色實心按鈕。
- Apple：白底/黑字或黑底/白字，依整體 Theme 選定一種一致方案。
- Google：中性底色，保留官方 G 圖示。
- LINE：使用 LINE 官方綠色識別；若設計系統要求中性按鈕，至少圖示必須保留官方識別。

不得任意重繪 Apple、Google、LINE 商標。

---

## 4. Login Page 資訊架構

由上至下：

1. App Logo / Brand Mark
2. 標題：`Welcome back`
3. 說明：`Sign in to continue.`
4. Social Login 三按鈕：Apple / Google / LINE
5. `OR` 分隔線
6. Email
7. Password + 顯示/隱藏控制
8. Remember me + Forgot password
9. Primary `Sign in`
10. Sign up 提示
11. 必要時才顯示 Legal / Privacy 文字

### 建議中文文案

- 標題：`歡迎回來`
- 說明：`登入後繼續使用。`
- Email：`電子郵件`
- Email Placeholder：`name@example.com`
- Password：`密碼`
- Password Placeholder：`輸入密碼`
- Remember me：`記住我`
- Forgot password：`忘記密碼？`
- Sign in：`登入`
- Sign up：`還沒有帳號？註冊`
- OR：`或`

產品若主要介面是英文，可保留參考圖英文版本，不建議 Login 頁單獨中英混排。

---

## 5. Social Login 按鈕設計

## 5.1 桌面寬度 ≥ 520px

三個 Provider 可橫向排列：

`[ Apple ] [ Google ] [ LINE ]`

- 三顆等寬。
- 高度：44–48px。
- Gap：10–12px。
- 圓角：12–14px。
- Hover：背景明度變化 + 1px 邊框增強。
- Active：輕微壓下效果，不做大幅縮放。
- Focus Visible：清晰 Focus Ring。

若只有圖示，需提供 Tooltip 與 `aria-label`；但正式版建議顯示文字，以降低辨識成本。

## 5.2 窄視窗 < 520px

改為直向完整按鈕：

- `Continue with Apple`
- `Continue with Google`
- `Continue with LINE`

三顆 100% 寬度，可明顯提升小尺寸視窗與觸控裝置可用性。

## 5.3 Provider 排序

建議固定：

1. Apple
2. Google
3. LINE

理由是參考圖第一個即 Apple，且 Apple / Google 為通用登入，LINE 對台灣用戶辨識度高。若產品後續有實際登入數據，可以 A/B 調整順序，但不得因排序改動帳號綁定邏輯。

---

## 6. Email / Password UX

### 6.1 Email

狀態：

- Default
- Hover
- Focus
- Filled
- Invalid
- Disabled

驗證：

- Blur 後或送出時驗證格式。
- 不在每輸入一個字元時立刻顯示紅色錯誤。
- Email 前後空白自動 trim。
- Email 比對應由後端做 case normalization。

錯誤文案：

- `請輸入電子郵件。`
- `電子郵件格式不正確。`

### 6.2 Password

- 預設 `type=password`。
- 右側 Eye Icon 控制顯示/隱藏。
- 切換顯示狀態不得清空內容或移動 Focus。
- Caps Lock 開啟時可顯示非阻斷式提示。

登入錯誤時，基於安全性建議統一文案：

`電子郵件或密碼不正確。`

避免直接揭露「此 Email 不存在」。

---

## 7. Remember me

### 7.1 定義

`Remember me` 不等於把 Email/Password 寫入 localStorage。

正確 UX 定義：

- 未勾選：關閉 App 或 Session 到期後需要重新登入。
- 已勾選：允許建立較長效的 App Refresh Session，敏感憑證由安全儲存管理。

### 7.2 預設值

桌面 App 建議預設勾選，但若產品屬於醫療、金融、共用工作站或高度敏感環境，建議預設不勾選。

---

## 8. Forgot Password

點擊 `忘記密碼？`：

1. 導向 `/forgot-password`。
2. 若 Email 已填入，自動帶入，但仍可修改。
3. 送出後永遠使用模糊化回應：
   `如果此 Email 已註冊，我們會寄送重設密碼連結。`
4. 不揭露帳號是否存在。

第三方 Provider-only 帳號若沒有本機密碼，可在重設流程中提示改用 Apple/Google/LINE 登入。

---

## 9. 新增 Login：完整互動流程

### 9.1 頁面進入

進入 Login Page 時：

- 不自動 Focus Password。
- 若 Email 欄位沒有保存值，可 Focus Email。
- 若偵測到仍有效的 App Session，直接進入 App，不閃 Login Page。
- 若 Session 正在 refresh，顯示短暫 Session Restore Loading，而不是先顯示 Login 再跳轉。

### 9.2 Email 登入

1. 使用者輸入 Email / Password。
2. 按 `登入`。
3. Button 進入 loading：`登入中…`。
4. 欄位暫時保持可讀，但避免重複 Submit。
5. 成功：進 App。
6. 失敗：回到原狀，顯示 inline error。

不得用 modal 顯示一般帳密錯誤。

### 9.3 Apple / Google / LINE 登入

1. 使用者點 Provider。
2. 該 Provider Button 顯示 loading。
3. 系統開啟 OS 預設瀏覽器進行授權。
4. App 本身顯示：
   `請在瀏覽器完成登入`。
5. 提供：
   - `重新開啟瀏覽器`
   - `取消`
6. 授權成功後 App 收到 callback。
7. 驗證成功：登入。
8. 驗證失敗：顯示可復原錯誤。

同時間只能允許一個 Provider 授權流程，避免 state 混亂。

---

## 10. OAuth 狀態 UX

### 10.1 授權進行中

顯示：

- Provider icon
- `正在等待 Google 登入完成…`
- Spinner
- `已在瀏覽器開啟登入頁面。`
- Secondary action：`取消`

### 10.2 使用者取消 Provider 授權

不要顯示紅色 Error Banner。

使用中性提示：

`已取消登入。`

1.5–3 秒後自動消失。

### 10.3 瀏覽器關閉但未 callback

等待約 90–120 秒後顯示：

`尚未完成登入。你可以重新開啟登入頁面。`

Actions：

- `重新開啟`
- `返回登入`

### 10.4 網路錯誤

`目前無法連線，請檢查網路後再試一次。`

保留 Retry。

### 10.5 Provider 暫時不可用

`Google 登入暫時無法使用，請稍後再試，或使用其他登入方式。`

不得整頁 Crash。

---

## 11. 首次 Social Login / 新帳號 UX

Social Login 成功後，後端判定為新使用者：

### 11.1 Provider 已提供必要資料

若已取得：

- Provider Subject ID
- Email
- Display Name（若有）

則直接建立 Pending Profile，進入簡化 onboarding。

### 11.2 Apple 特殊情境

Apple 的 `name` 與部分 Email 資料可能只在第一次授權時提供，因此：

- 第一次 callback 即時保存。
- 後續登入若缺少 `name`，不得覆蓋既有姓名為空值。
- 使用 Apple Private Relay Email 時，UI 顯示該帳號可正常使用，不要求改成真實 Email。

### 11.3 補資料頁

只有產品真的需要時才補：

- Display Name
- Username
- Company / Team
- Terms consent

不得在 Login Page 增加大量欄位。

---

## 12. 帳號衝突與帳號綁定

這是修改 Login 時最容易漏掉的 UX。

### 情境 A：Email/Password 已存在，後來用 Google 登入，Email 相同

不得直接建立第二帳號。

顯示：

`這個 Email 已有帳號。為了保護帳號安全，請先用原本方式登入，再連結 Google。`

Actions：

- `使用密碼登入`
- `取消`

登入成功後才進行 Provider Linking。

### 情境 B：Google 與 Apple 都回傳同一 Email

仍以 Provider `sub` 作身份主鍵，不可只用 Email 自動合併。

若產品政策允許合併：

- 需要既有帳號重新驗證。
- 合併後 Security Settings 顯示已連結 Provider。

### 情境 C：Apple Private Relay Email

不可把 Private Relay Email 與一般 Email 猜測為同一人。

---

## 13. 修改既有 Login：改版差異

若目前專案已有 Login，建議按以下順序修改。

### Phase 1：視覺重構，不改 Auth API

- 建立新版 Login Card。
- 統一 Input、Button、SocialButton 元件。
- 補 Focus / Hover / Error / Loading。
- Password Eye Button 無障礙修正。
- 保留舊登入 API。

### Phase 2：加入三 Provider UI

新增：

- Apple Login Button
- Google Login Button
- LINE Login Button
- OAuth Waiting State
- OAuth Error State

此階段若 Backend 尚未完成，可 Provider Button 顯示 feature flag 或 disabled，不可接假登入。

### Phase 3：接通 Provider Login

- 串接統一 Auth Broker。
- 加 state / nonce / PKCE。
- Deep Link callback。
- 成功後建立 App Session。

### Phase 4：補帳號 Linking / Security

- Account Settings 顯示已連結 Provider。
- 可以新增 Provider。
- 解除 Provider 前檢查是否仍有至少一個登入方式。

---

## 14. 元件規格

建議 React 元件：

```text
LoginPage
├─ LoginBrand
├─ SocialLoginGroup
│  ├─ SocialLoginButton(provider="apple")
│  ├─ SocialLoginButton(provider="google")
│  └─ SocialLoginButton(provider="line")
├─ OrDivider
├─ LoginForm
│  ├─ EmailField
│  ├─ PasswordField
│  ├─ RememberMe
│  ├─ ForgotPasswordLink
│  └─ PrimaryButton
├─ SignupPrompt
└─ OAuthProgressPanel
```

### SocialLoginButton Props

```ts
type AuthProvider = 'apple' | 'google' | 'line';

interface SocialLoginButtonProps {
  provider: AuthProvider;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick(): void;
}
```

### Login Form 狀態

```ts
type LoginStatus =
  | 'idle'
  | 'submitting-password'
  | 'starting-oauth'
  | 'waiting-oauth'
  | 'exchanging-session'
  | 'success'
  | 'error';
```

---

## 15. Loading 與防止重複操作

- Email Login Submit 時：Primary Button disabled。
- OAuth 啟動時：所有 Provider Button 暫時 disabled，只保留目前 Provider 的 loading。
- 不要同時顯示全頁 spinner 與 Button spinner。
- API 超過約 8 秒仍未完成，可顯示 `仍在處理中…`，避免使用者以為 App 死掉。
- Login API 必須具有 client-side request id，以協助 log correlation。

---

## 16. 錯誤顯示層級

### Inline Field Error

適用：

- Email 空白
- Email 格式錯誤
- Password 空白

### Form Error Banner

適用：

- 帳密錯誤
- 帳號停用
- Session exchange 失敗

### Toast

適用：

- 使用者主動取消 OAuth
- 已複製資訊
- 非阻斷狀態

### Modal

只用於：

- 帳號合併確認
- 高風險重新驗證
- 法規上需要明確 consent

一般登入錯誤不使用 Modal。

---

## 17. Accessibility

至少符合：

- 所有 Interactive Element 可鍵盤操作。
- Tab 順序符合畫面順序。
- Focus Ring 不可移除。
- Provider Button 有可讀名稱。
- Eye Button：`aria-label="顯示密碼" / "隱藏密碼"`。
- Error 使用 `aria-describedby` 關聯欄位。
- 動態 Form Error 使用 `aria-live="polite"`。
- Loading 狀態不能只靠動畫表達。
- 文字與背景對比至少 WCAG AA。
- 支援 200% zoom 不裁切主要功能。

---

## 18. Keyboard UX

- Enter：在 Email/Password 區域送出帳密登入。
- Space/Enter：操作 Checkbox/Button。
- Esc：若 OAuth Waiting Panel 為 overlay，可取消並回 Login。
- Cmd/Ctrl + L 不由 App 攔截。
- 不攔截系統級 Password Manager 快捷操作。

---

## 19. 密碼管理器與 Autofill

Email：

```html
autocomplete="username"
```

Password：

```html
autocomplete="current-password"
```

註冊頁使用：

```html
autocomplete="new-password"
```

不得因自訂 glass input 而破壞 Password Manager。

---

## 20. Responsive 規則

### Desktop

- Card width：400px 左右。
- Social providers 可橫排。

### Compact desktop / small window

- Card width：`calc(100vw - 32px)`。
- Social providers 改直排。
- Card 高度超出 viewport 時允許頁面 scroll。
- 不用固定高度造成 Sign up 被裁切。

### High DPI

- Icon 使用 SVG。
- 不使用低解析 PNG 商標。

---

## 21. Dark Mode

若 App 支援 Dark Mode：

- Glass Card 背景改深色半透明。
- Provider Logo 依官方品牌規範使用對應版本。
- Input Background、Placeholder、Border 對比重新檢查。
- Apple Button 在暗色介面仍需維持清楚邊界。

不要只做 CSS filter/invert 反轉商標。

---

## 22. 安全相關 UX

- OAuth 一律在 OS 預設瀏覽器，不在 WebView 內嵌 Provider Login Page。
- Callback 成功後顯示 App 自己的成功狀態，不顯示 Provider Token。
- 不將 access token / refresh token 顯示在 URL、Toast、Error Message。
- 若 deep link 收到非法 callback，顯示：`登入驗證失敗，請重新登入。`
- 不向使用者顯示 stack trace、client secret、code、state、nonce。

---

## 23. Analytics 事件

只記錄非敏感事件：

```text
login_viewed
login_email_submitted
login_social_clicked { provider }
login_oauth_opened { provider }
login_oauth_cancelled { provider }
login_succeeded { method }
login_failed { method, error_category }
login_account_link_required { provider }
```

禁止上報：

- Password
- Authorization code
- Access token
- Refresh token
- ID token
- 完整 OAuth callback URL

---

## 24. UI 驗收標準

### Layout

- [ ] Apple / Google / LINE 三個入口可見。
- [ ] 小視窗不裁切 Sign in / Sign up。
- [ ] Card 與背景對比足夠。
- [ ] 玻璃效果失效時仍可讀。

### Interaction

- [ ] 每個 Provider 都有 hover / focus / loading / disabled。
- [ ] OAuth 進行中可取消。
- [ ] OAuth 逾時可重新開啟。
- [ ] Password Eye 不改變輸入內容。
- [ ] Enter 可送出 Email 登入。

### Error

- [ ] Email 格式錯誤為 inline。
- [ ] Login 錯誤不揭露帳號存在性。
- [ ] Provider Cancel 不顯示嚴重錯誤。
- [ ] Network error 可 Retry。
- [ ] Account conflict 有安全的 Linking 流程。

### Accessibility

- [ ] 全部可鍵盤操作。
- [ ] Focus Visible。
- [ ] Screen Reader 可辨識 Provider。
- [ ] Error 可被 Screen Reader 宣告。

---

## 25. 建議最終畫面

```text
┌────────────────────────────────────┐
│               LOGO                 │
│                                    │
│            歡迎回來                │
│          登入後繼續使用             │
│                                    │
│ [ Apple ] [ Google ] [ LINE ]      │
│                                    │
│ ────────────  或  ─────────────     │
│                                    │
│ 電子郵件                           │
│ [ name@example.com              ]  │
│                                    │
│ 密碼                               │
│ [ •••••••••••                 👁 ] │
│                                    │
│ [✓] 記住我             忘記密碼？  │
│                                    │
│ [              登入              ] │
│                                    │
│       還沒有帳號？ 註冊             │
└────────────────────────────────────┘
```

OAuth 啟動後，Login Card 不消失，改成等待狀態，讓使用者知道 App 正在等瀏覽器完成授權。

---

## 26. 完成定義 Definition of Done

Login 改版可視為完成，必須同時達成：

1. Apple / Google / LINE 三個 Provider 可從 Login Page 啟動。
2. Email/Password 不因新增 Social Login 而退化。
3. OAuth 有 loading、cancel、timeout、retry、error。
4. 新使用者、既有使用者、Email 衝突、Provider linking 都有明確 UX。
5. Session Restore 不閃 Login Page。
6. Responsive / Keyboard / Screen Reader 基礎驗收通過。
7. UI 不存 Provider Secret 或 Password。
8. Analytics 不包含 Token/Password 等敏感資訊。
9. 與 Developer Auth Broker、deep link、session exchange 規格一致。
