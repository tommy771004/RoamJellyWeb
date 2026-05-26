# RoamJelly 果凍漫遊 - AI 專案快速理解文件

文件版本: v2.0 (Architecture First)
更新日期: 2026-04-30
目標讀者: AI Coding Agent、開發者、產品/PM

---

## 0. 30 秒快速摘要

- 這是單一 repo 的全端 TypeScript 專案: Vite React 前端 + Express 後端 + Socket.io 即時同步。
- 前端採 React Native 元件語法，透過 react-native-web 在 Web 執行。
- 後端資料層使用 PostgreSQL (Drizzle ORM)；Redis 為快取與事件暫存，缺省可退回記憶體。
- 核心商業流程有三條:
  - 搜尋比價 + Clickout 導流
  - 行程共編 + 即時同步
  - 旅途工具包 (清單/分帳/提醒)
- 主要入口檔:
  - 前端: src/main.tsx, src/App.tsx
  - 後端: server.ts
  - Repository: src/server/repositories/appRepository.ts
  - Schema: src/server/db/schema.ts

---

## 1. 專案現況與技術棧

### 1.1 Runtime 與框架

- 前端: React 19 + Vite 6 + Zustand + motion
- UI: react-native + react-native-web + Tailwind className 風格
- 後端: Express 4 + Socket.io 4
- DB: PostgreSQL + Drizzle ORM
- Cache/Log: Redis (可選)
- AI: OpenRouter chat completions (在 src/lib/geminiApi.ts，檔名為歷史命名)

### 1.2 重要特性

- 同一個 Node 進程同時提供 API、Socket 與開發時 Vite middleware。
- AUTH_REQUIRED 在 production 預設啟用；開發可用 /api/auth/dev-token 自動拿 JWT。
- 提供 REAL_BACKEND_BASE_URL 代理模式，可把 /api/* 轉發到真實後端。

---

## 2. 目錄導覽 (AI 優先)

### 2.1 前端

- src/App.tsx
  - 三分頁切換 (home/itinerary/tools)
  - 導流確認彈窗 RedirectModal
  - clickout 追蹤後開外部連結

- src/components/HomeTab.tsx
  - 搜尋表單與結果卡
  - 搜尋錯誤降級顯示
  - 點卡片觸發導流確認

- src/components/ItineraryTab.tsx
  - 行程載入、收藏景點、AI 規劃
  - Socket join_room / sync_itinerary
  - 離線唯讀提示與 localStorage 快取

- src/components/ToolsTab.tsx
  - 天氣、行李清單、分帳、提醒分享
  - 分帳表單驗證與錯誤呈現

### 2.2 前端狀態管理 (Zustand)

- src/store/useAppStore.ts: tab、toast、redirect modal、userId
- src/store/useSearchStore.ts: 搜尋表單/結果/追蹤/收藏
- src/store/useItineraryStore.ts: 行程節點、協作者、離線狀態
- src/store/useToolsStore.ts: 清單、分帳、成員

### 2.3 前後端 API 邊界

- src/lib/workflowApi.ts
  - 前端所有 HTTP 請求集中點
  - token bootstrap 與 Authorization 注入
  - timeout、status error、payload parse

### 2.4 後端

- server.ts
  - Express routes
  - Socket.io events
  - JWT middleware
  - Redis 快取與 fallback
  - production 靜態檔託管

- src/server/repositories/appRepository.ts
  - 所有 DB 存取抽象
  - seed/demo data
  - 分帳聚合查詢

- src/server/db/schema.ts
  - Drizzle schema 定義

---

## 3. 三條核心 Workflow (以程式實作為準)

### Workflow A: 搜尋與導流變現

1. HomeTab 送出搜尋 -> GET /api/search
2. server.ts 先查 Redis key cache:search:{from}_{to}_{date}
3. 命中快取直接回傳；未命中由 flights table 組裝資料並寫回快取
4. 前端點卡片 -> 開 RedirectModal
5. 確認後:
   - POST /api/track/clickout (202 accepted, 非阻塞寫入)
   - window.open(affiliate_url)

對應資料:

- clickout_logs
- flights
- Redis keys: cache:search:*, history:search:global

### Workflow B: 邀請與共編行程

1. ItineraryTab 初始載入:
   - GET /api/trips/:trip_id
   - GET /api/favorites
   - GET /api/collaborators
   - GET /api/itinerary
2. 連上 Socket 後 emit join_room
3. 新增/修改節點:
   - HTTP: POST /api/itinerary/sync
   - Socket: emit sync_itinerary
4. 刪除節點:
   - HTTP: DELETE /api/itinerary/:node_id
   - 廣播 remove_node 給房間
5. 規劃記錄與快照:
   - GET /api/itinerary/planning-log
   - GET /api/itinerary/planning-snapshot

對應資料:

- trips, trip_members, itinerary_nodes, favorites
- Redis keys: planning:trip:{tripId}:events, planning:trip:{tripId}:snapshot

### Workflow C: 旅途工具與分帳

1. 載入清單/分帳/天氣:
   - GET /api/checklist
   - GET /api/settlements
   - GET /api/weather
2. 清單勾選:
   - POST /api/checklist/:id
3. 新增分帳:
   - POST /api/ledger/expense
   - server 計算 share 並更新 settlements 聚合
4. 前端可分享提醒文字 (Web Share 或 clipboard)

對應資料:

- checklist, ledger_expenses, settlements

---

## 4. API 索引 (高頻)

### 4.1 Auth / Health

- GET /health
- POST /api/auth/dev-token (僅非 production)

### 4.2 Search / Monetization

- GET /api/search
- GET /api/search/history
- POST /api/track/clickout

### 4.3 Itinerary / Collaboration

- GET /api/trips/:trip_id
- GET /api/trips/:trip_id/preview
- POST /api/trips/:trip_id/join
- GET /api/itinerary
- POST /api/itinerary/sync
- DELETE /api/itinerary/:node_id
- GET /api/itinerary/planning-log
- GET /api/itinerary/planning-snapshot
- GET /api/favorites
- POST /api/favorites
- DELETE /api/favorites/:id
- GET /api/collaborators?trip_id=

### 4.4 Tools

- GET /api/checklist?trip_id=
- POST /api/checklist/:id
- POST /api/ledger/expense
- GET /api/settlements?trip_id=
- POST /api/settlements/clear
- GET /api/weather

### 4.5 User

- GET /api/user/preferences
- POST /api/user/saves
- DELETE /api/user/saves/:item_id
- POST /api/user/tracks
- DELETE /api/user/tracks/:item_id
- GET /api/user/trips

---

## 5. 權限模型與安全邏輯

### 5.1 驗證

- Bearer JWT from Authorization header
- production 預設要求 token (AUTH_REQUIRED)

### 5.2 授權 (Trip Role)

- viewer: 可讀
- editor: 可編輯行程/收藏/分帳
- owner: 最高

伺服器透過 ensureTripRole + hasRequiredRole 在各端點做授權檢查。

---

## 6. 資料層重點

### 6.1 主要資料表

- users
- trips
- trip_members
- itinerary_nodes
- favorites
- flights
- clickout_logs
- checklist
- ledger_expenses
- settlements

### 6.2 Migration 與 Seed

- migration script: scripts/migrate.ts
- SQL migration: migrations/0001_init_postgres.sql
- demo seed: AppRepository.ensureDemoSeed()

---

## 7. 環境變數速查

### 7.1 後端

- PORT
- DATABASE_URL
- REDIS_URL
- REAL_BACKEND_BASE_URL
- SEED_DEMO_DATA
- JWT_SECRET
- JWT_EXPIRES_IN
- AUTH_REQUIRED
- ENABLE_DEV_TOKEN_ENDPOINT
- CORS_ALLOWED_ORIGINS
- OTA_PROVIDER_URL (OTA 提供商 API 地址，空白則 fallback 至 flights 表)

### 7.2 前端

- VITE_API_BASE_URL
- VITE_DEV_AUTO_LOGIN
- VITE_DEV_USER_ID
- VITE_TRIP_ID
- VITE_OPENROUTER_API_KEY

---

## 8. 本地開發與測試

### 8.1 本地啟動

1. npm install
2. 設定 .env (至少 DATABASE_URL, JWT_SECRET)
3. npm run db:migrate
4. npm run dev

### 8.2 Staging smoke test

1. docker compose -f docker-compose.staging.yml up -d postgres redis
2. npm run db:migrate
3. npm run build && node dist/server.cjs
4. npm run test:integration:staging

---

## 9. AI 修改程式時的操作準則

1. 優先遵守 workflowApi.ts 與 server.ts 現有 contract，不要在前端硬寫新 API。
2. 新增資料欄位時，必須同步更新:
   - schema.ts
   - migration SQL
   - repository
   - types/workflow.ts
   - workflowApi.ts 映射
3. 行程同步功能變更需同時處理 HTTP 與 Socket 兩條路徑。
4. 任何 trip 相關寫入都必須保留 role 檢查。
5. 錯誤體驗維持產品語氣: 對使用者顯示溫和文案，不回傳內部細節。

---

## 10. 目前已知架構現象 (給 AI 避坑)

1. 檔名 geminiApi.ts 但實際呼叫 OpenRouter，調整 AI 功能時先看實作內容。
2. 專案表面定位為 RN 跨平台，但當前主要交付路徑是 Web + Node 單體。
3. Redis 是強化而非硬依賴，無 Redis 時仍可運作 (fallback memory)。
4. /api/search 先嘗試 OTA_PROVIDER_URL 外部 API；空白或失敗時 fallback 至 flights 表。
5. VITE_DEV_AUTO_LOGIN 同時控制 App.tsx 登入間跳過與 workflowApi token 自動取得。

---

## 11. 快速定位問題指南

- 搜尋沒有資料: 先檢查 flights seed 與 /api/search 回傳 503 條件。
- 共編不同步: 檢查 socket token、join_room、trip_members 權限、sync_itinerary payload。
- 分帳異常: 檢查 split_with 是否包含 payer，與 settlements 聚合查詢。
- 收藏定位失敗: 檢查 /api/favorites POST 內 geocodeSpot upstream。
- 前端 401: 檢查 dev token 自動登入是否被關閉與 Authorization header。

---

## 12. Workflow 完整度審核 (MVP)

### 12.1 Workflow A 搜尋與導流

- 完整度: 高 (約 90%)
- 已完成:
  - /api/search 快取流程 (Redis + fallback memory)
  - OTA provider adapter：先呼叫 OTA_PROVIDER_URL，失敗則 fallback 至 flights 表
  - clickout 非阻塞記錄
  - 導流確認彈窗與外部開啟
- 缺口:
  - affiliate_url 為網址組裝，非供應商真實簽約連結（需接入真實 OTA API 後取代）

### 12.2 Workflow B 邀請與共編

- 完整度: 高 (約 90%)
- 已完成:
  - trip role 授權
  - HTTP + Socket 雙路徑同步
  - 規劃事件流與快照 API
  - deep-link landing flow (TripLandingPage + App.tsx URL 偵測)
  - /api/collaborators trip scoped (?trip_id= 參數)
  - itinerary_nodes lat/lng 完整領域映射
- 缺口:
  - 分享連結 deep-link 尚未對應 native app 路徑 (Universal Link)

### 12.3 Workflow C 旅途工具與分帳

- 完整度: 高 (約 90%)
- 已完成:
  - checklist 讀寫 (trip scoped)
  - 多幣別分帳：ledger expense + settlements 按 (from, to, currency) 聚合
  - 餘數分配修正：第一批非代墊人吸收 +1 誤差，確保總金額精確
  - weather 查詢與提醒分享
  - 幣別小計顯示（取代混合加總）
- 最新 iOS 轉換:
  - iOS Tools 已展示 settlement history 與 cleared ledger expenses，並支援提醒分享。

---

## 13. 未實作按鈕 / 假資料 / 建議新增功能

### 13.1 功能頁面按鈕狀態

- 已補齊:
  - Itinerary 協作者區「+」按鈕，現已接到邀請分享流程
  - Home 的「追蹤降價」「收藏」已同步後端 (user_saved_items / user_tracked_prices 表)

### 13.2 假資料與暫代實作

- Demo seed 依賴:
  - trip_999 / demo_user / flights / collaborators / checklist / favorites
- 暫代型行為:
  - /api/search 先嘗試 OTA_PROVIDER_URL，未設定時使用 DB 航班資料
  - affiliate_url 目前為示意 partner.example.com 組裝

### 13.3 待辦 (Remaining)

1. affiliate_url 接入真實 OTA 簽約連結（需外部合作）。
2. Universal Link / App Link 需完成 Apple Team ID、Associated Domains 與 AASA 托管後才能正式上線。

---

本文件定位為 AI 上下文入口。若與程式碼衝突，以程式碼為準，並回頭更新本文件版本。

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues for this repo (`tommy771004/RoamJellyWeb`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
