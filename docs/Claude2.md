# RoamJelly 果凍漫遊 - 詳細運維版 (SRE / On-call Runbook)

文件版本: v2.0 (Operations)
更新日期: 2026-04-30
適用對象: 後端工程師、DevOps、SRE、值班同仁

---

## 0. 文件目的與使用方式

本文件不是產品需求文件，而是「可直接操作」的運維手冊，用於:

- 本地與 Staging/Production 啟動與部署
- 服務健康檢查與故障排查
- 例行維護 (Migration、快取策略、資料保護)
- 值班時快速定位問題與回復服務

若本文件與程式碼衝突，以程式碼為準，優先參考:

- [server.ts](server.ts)
- [src/server/repositories/appRepository.ts](src/server/repositories/appRepository.ts)
- [src/server/db/schema.ts](src/server/db/schema.ts)
- [scripts/migrate.ts](scripts/migrate.ts)

---

## 1. 系統拓撲與責任邊界

### 1.1 單體服務拓撲

- App Runtime: Node.js 單進程
  - HTTP API (Express)
  - WebSocket (Socket.io)
  - 開發模式下 Vite middleware
- Primary Data Store: PostgreSQL
- Optional Cache/Event Store: Redis

### 1.2 關鍵流程責任

- 搜尋比價: API `/api/search`
  - 先查 Redis 快取，未命中查 DB `flights` 並回寫快取
- 行程共編: Socket + HTTP 雙路徑
  - Socket event `sync_itinerary`
  - HTTP `/api/itinerary/sync` 與 `/api/itinerary/:node_id`
- 旅遊工具: checklist/ledger/settlements/weather
- 變現追蹤: `/api/track/clickout` 非阻塞寫入 DB

---

## 2. 環境規劃與設定

### 2.1 環境分層

- Local: 開發與除錯
- Staging: 整合測試與 smoke test
- Production: 正式服務

### 2.2 必要環境變數

後端:

- `PORT` (預設 3000)
- `DATABASE_URL` (必要)
- `JWT_SECRET` (必要)
- `AUTH_REQUIRED` (production 建議 `true`)
- `ENABLE_DEV_TOKEN_ENDPOINT` (production 建議 `false`)
- `CORS_ALLOWED_ORIGINS` (production 必填白名單)

快取/代理:

- `REDIS_URL` (選填，不填走記憶體 fallback)
- `REAL_BACKEND_BASE_URL` (代理模式使用)
- `SEED_DEMO_DATA` (建議僅 local/staging 視需求啟用)

前端:

- `VITE_API_BASE_URL`
- `VITE_DEV_AUTO_LOGIN`
- `VITE_DEV_USER_ID`
- `VITE_TRIP_ID`
- `VITE_OPENROUTER_API_KEY`

### 2.3 環境安全基線

- production 必須關閉 dev token endpoint。
- production 必須啟用 `AUTH_REQUIRED=true`。
- `JWT_SECRET` 不可與 staging 共用。
- CORS 僅允許明確網域，不可放寬為 `*`。

---

## 3. 啟動、建置與部署

### 3.1 本地開發

**前置條件**

- Node.js 20+
- PostgreSQL 16（或 Docker Desktop）
- 選填: Redis 7（不啟動時自動退化為記憶體 fallback）

**步驟**

```bash
# 1. 安裝所有依賴（含 devDependencies）
npm install

# 2. 建立本地環境設定檔
cp .env.example .env   # 若無範本，手動建立（見下方欄位清單）

# 3. 執行資料庫 Migration
DATABASE_URL=postgres://user:pass@localhost:5432/roamjelly npm run db:migrate

# 4. 啟動開發伺服器（前後端合一，內含 Vite HMR）
npm run dev
# → 服務在 http://localhost:3000
# → 前端 HMR 即時更新，後端 API 同進程
```

**最小本地 `.env`**

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/roamjelly
JWT_SECRET=local-dev-secret-change-me
SEED_DEMO_DATA=true
ENABLE_DEV_TOKEN_ENDPOINT=true
VITE_API_BASE_URL=http://localhost:3000
VITE_OPENROUTER_API_KEY=sk-or-...
```

---

### 3.2 前端 Build（Vite）

前端由 Vite 打包，產物輸出至 `dist/`（CSS + JS + index.html）。

```bash
# 前端單獨打包（後端 build 時會自動呼叫，通常不需單獨執行）
npx vite build
```

**重要 Vite 環境變數**（需在 build 前設定，或透過 CI 注入）

| 變數 | 說明 | 範例 |
|---|---|---|
| `VITE_API_BASE_URL` | 前端 API 請求目標 | `https://api.roamjelly.com` |
| `VITE_OPENROUTER_API_KEY` | AI 功能（packing list、行程）所需 | `sk-or-...` |
| `VITE_DEV_AUTO_LOGIN` | 開發用自動登入（`true` 僅限本地） | `true` |
| `VITE_DEV_USER_ID` | 搭配自動登入的 user id | `demo_user` |

**輸出產物**

```
dist/
  index.html          # SPA 入口，生產模式由 server.ts 靜態服務
  assets/
    index-[hash].js   # 前端 JS bundle（React + 全部組件）
    index-[hash].css  # TailwindCSS 產物
```

> Vite build 時會讀取 `.env`、`.env.production` 中 `VITE_` 開頭的變數並嵌入 bundle，其他後端變數不會洩漏到前端。

---

### 3.3 後端 Build（esbuild）

後端由 esbuild 打包成單一 CommonJS 檔案 `dist/server.cjs`。

```bash
# 後端單獨打包（不含前端）
npx esbuild server.ts --platform=node --target=node18 --bundle --format=cjs --outdir=dist
```

**完整 build（前端 + 後端一次完成）**

```bash
npm run build
# 等同於：
# vite build && esbuild server.ts --platform=node --target=node18 --bundle --format=cjs --outdir=dist
```

**輸出產物**

```
dist/
  server.cjs   # 後端 bundle，含所有 Node.js 依賴（除 pg-native 等原生模組）
  index.html   # 前端 SPA（生產模式由 server.cjs 靜態服務）
  assets/      # 前端靜態資源
```

**啟動生產產物**

```bash
# 先跑 migration，再啟動（render.yaml 的 startCommand 也是這樣）
DATABASE_URL=... JWT_SECRET=... AUTH_REQUIRED=true npm run db:migrate
node dist/server.cjs
# 或
npm run start   # 等同 node dist/server.cjs
```

> `vite` 模組僅在開發模式（`NODE_ENV !== 'production'`）以動態 `import()` 載入，不會打包進生產 bundle，節省約 10+ MB bundle 大小。

---

### 3.4 Docker Staging 完整流程

**容器定義**

- [Dockerfile](Dockerfile)：多階段 build — builder 編譯 → runner 最小映像
- [docker-compose.staging.yml](docker-compose.staging.yml)：postgres + redis + app 三服務

**步驟一：啟動依賴服務**

```bash
docker compose -f docker-compose.staging.yml up -d postgres redis
# 等候 healthcheck 通過（約 10–20 秒）
docker compose -f docker-compose.staging.yml ps
```

**步驟二：建立 `.env.staging`**

```dotenv
NODE_ENV=production
DATABASE_URL=postgres://postgres:postgres@postgres:5432/roamjelly
REDIS_URL=redis://redis:6379
JWT_SECRET=staging-secret-不可與-prod-共用
AUTH_REQUIRED=true
ENABLE_DEV_TOKEN_ENDPOINT=true   # staging 允許，prod 必須 false
SEED_DEMO_DATA=true
CORS_ALLOWED_ORIGINS=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000
VITE_OPENROUTER_API_KEY=sk-or-...
```

**步驟三：執行 Migration**

```bash
# 在 app 容器內執行（migrations/ 已複製至 runner 映像）
docker compose -f docker-compose.staging.yml run --rm \
  -e DATABASE_URL=postgres://postgres:postgres@postgres:5432/roamjelly \
  app \
  node -e "require('child_process').execFileSync('npx',['tsx','scripts/migrate.ts'],{stdio:'inherit',env:process.env})"

# 或在宿主機直接跑（需本機有 Node.js 與 DATABASE_URL 指向容器 port）
DATABASE_URL=postgres://postgres:postgres@localhost:5432/roamjelly npm run db:migrate
```

**步驟四：Build 並啟動 App**

```bash
# 方案 A：用 docker-compose（自動 build image）
docker compose -f docker-compose.staging.yml up -d app

# 方案 B：手動 build image 再啟動
docker build -t roamjelly:staging .
docker run --rm -p 3000:3000 --env-file .env.staging roamjelly:staging
```

**步驟五：驗收**

```bash
curl http://localhost:3000/health
# {"status":"ok","checks":{"database":"ok","redis":"ok"}}

STAGING_API_BASE_URL=http://localhost:3000 npm run test:integration:staging
```

---

### 3.5 Render.com 生產部署

設定檔：[render.yaml](render.yaml)

**部署流程（Render 自動執行）**

| 步驟 | 指令 | 說明 |
|---|---|---|
| Build | `npm ci && npm run build` | 安裝所有依賴並編譯前後端 |
| Start | `npm run db:migrate && npm run start` | migration 後啟動 server.cjs |
| Health | `GET /health` | Render 健康檢查 |

**必填 Render 環境變數（Dashboard → Environment）**

| Key | 說明 |
|---|---|
| `DATABASE_URL` | Render PostgreSQL 連線字串 |
| `JWT_SECRET` | 隨機強密碼（min 32 char） |
| `REDIS_URL` | Render Redis 連線字串（可選） |
| `CORS_ALLOWED_ORIGINS` | 前端網域，如 `https://roamjelly.onrender.com` |
| `VITE_API_BASE_URL` | 同上，注入前端 bundle |
| `VITE_OPENROUTER_API_KEY` | OpenRouter AI key |

> `AUTH_REQUIRED=true` 與 `ENABLE_DEV_TOKEN_ENDPOINT=false` 已在 [render.yaml](render.yaml) 硬設，不需手動覆蓋。

---


## 4. Migration 與資料庫維運

### 4.1 Migration 機制

- Migration SQL: [migrations/0001_init_postgres.sql](migrations/0001_init_postgres.sql)
- Runner: [scripts/migrate.ts](scripts/migrate.ts)
- 追蹤表: `schema_migrations`

`scripts/migrate.ts` 行為:

- 掃描 `migrations/*.sql` 並依檔名排序套用
- 單檔以 transaction 執行
- 成功才寫入 `schema_migrations`

### 4.2 資料表重點

- 使用者與旅程: `users`, `trips`, `trip_members`
- 行程與收藏: `itinerary_nodes`, `favorites`
- 搜尋與導流: `flights`, `clickout_logs`
- 工具包: `checklist`, `ledger_expenses`, `settlements`

### 4.3 資料異常基本檢查

- 行程刪不掉: 先查 `itinerary_nodes.node_id` 是否存在
- 分帳不正確: 檢查 `ledger_expenses.split_with_json` 是否含 `payer`
- 收藏異常: 檢查 `favorites.trip_id` 與 role 授權

---

## 5. Redis 與快取策略

### 5.1 Key 佈局

- 搜尋快取: `cache:search:{from}_{to}_{date}`
- 搜尋歷史: `history:search:global`
- 規劃事件流: `planning:trip:{tripId}:events`
- 規劃快照: `planning:trip:{tripId}:snapshot`

### 5.2 TTL 與容量

- 搜尋快取 TTL: 10 分鐘
- 規劃快照 TTL: 6 小時
- 搜尋歷史與規劃事件用 list + trim 控制上限

### 5.3 無 Redis 時退化行為

- 自動 fallback 到記憶體 map/list
- 功能可用，但重啟後快取與歷史會遺失

---

## 6. 驗證、授權與連線安全

### 6.1 HTTP 驗證

- `Authorization: Bearer <token>`
- middleware 解析 token 後寫入 `authUser`

### 6.2 Trip Role 授權

- `ensureTripRole` + `hasRequiredRole`
- `viewer`: 讀取
- `editor`: 行程/收藏/分帳寫入
- `owner`: 最高權限

### 6.3 Socket 驗證

- `io.use` 驗證 handshake token
- `join_room` 時檢查 trip member 身分
- `sync_itinerary` 要求 `editor` 以上

---

## 7. 健康檢查與觀測

### 7.1 健康端點

- `GET /health`
- 回傳包含:
  - `database`: `ok` 或錯誤
  - `redis`: `ok` 或 `fallback`

### 7.2 最低監控指標

- API 成功率與 p95 latency
- 401/403 比率 (授權異常)
- 5xx 比率 (上游/內部錯誤)
- Socket 連線數與中斷率
- DB 連線可用性
- Redis 連線狀態

### 7.3 推薦告警門檻

- 5xx 比率連續 5 分鐘 > 3%
- `/health` 連續 3 次失敗
- Socket disconnect rate 明顯飆升
- DB 連線建立失敗或逾時

---

## 8. Staging 驗證流程

### 8.1 自動 smoke test

腳本: [scripts/staging-integration-test.ts](scripts/staging-integration-test.ts)

覆蓋:

1. 取得 dev token
2. `GET /health`
3. `GET /api/trips/trip_999`
4. `GET /api/itinerary?trip_id=trip_999`
5. `GET /api/favorites?trip_id=trip_999`
6. `GET /api/collaborators?trip_id=trip_999`（trip 維度驗證）
7. `GET /api/checklist?trip_id=trip_999`（trip 維度驗證）
8. `GET /api/search?from=TPE&to=NRT&date={today}`（cache miss → hit 雙次驗證）
9. `GET /api/user/preferences`（saved/tracked 欄位格式驗證）
10. `POST /api/ledger/expense` + `GET /api/settlements`（分帳全循環）

執行:

```bash
# 對本地 staging
npm run test:integration:staging

# 對遠端 staging
STAGING_API_BASE_URL=https://staging.roamjelly.com \
STAGING_TEST_USER_ID=demo_user \
npm run test:integration:staging
```

### 8.2 發版前檢查清單

- migration 已在 staging 套用
- smoke test 全綠
- `AUTH_REQUIRED` 與 `ENABLE_DEV_TOKEN_ENDPOINT` 設定正確
- CORS 白名單正確
- Redis 不可用時服務仍可正常回應

---

## 9. 故障排查 Runbook

### 9.1 搜尋回 503

可能原因:

- `flights` 無資料
- DB 不可用

檢查順序:

1. 打 `GET /health` 看 DB 狀態
2. 檢查 seed 是否啟用或 flights 是否有資料
3. 檢查 `DATABASE_URL` 與連線權限

### 9.2 行程共編不同步

可能原因:

- token 缺失或失效
- `join_room` 未通過 role 檢查
- Socket 已斷線

檢查順序:

1. 確認前端是否帶 Bearer token
2. 檢查 trip member 與 role
3. 檢查 socket connect/disconnect 記錄
4. 驗證 HTTP `/api/itinerary/sync` 是否可寫入

### 9.3 分帳結果錯誤

可能原因:

- `split_with` 不完整
- amount 非正值
- 聚合結果未更新

檢查順序:

1. 檢查 `/api/ledger/expense` request payload
2. 確認 payer 是否在 split_with
3. 檢查 `ledger_expenses` 與 `settlements` 寫入

### 9.4 收藏新增失敗

可能原因:

- geocode upstream 失敗
- trip role 不足

檢查順序:

1. 檢查 `/api/favorites` response code
2. 驗證 trip member role 是否為 editor+
3. 確認 geocode failure 時是否有正確 fallback/null

---

## 10. 日常維護作業

### 10.1 每日檢查

- `/health` 狀態
- 5xx 與 timeout 趨勢
- clickout 記錄是否持續進帳

### 10.2 每週檢查

- `clickout_logs`、`ledger_expenses`、`itinerary_nodes` 成長量
- Redis 記憶體壓力與 key 成長
- migration 與 schema 一致性

### 10.3 每月檢查

- JWT 金鑰與敏感變數輪替計畫
- 備份還原演練
- 事故回顧與 runbook 更新

---

## 11. 備份與復原策略

### 11.1 資料分級

- 必備份: PostgreSQL 主資料
- 可重建: Redis 快取與規劃暫存

### 11.2 建議備份策略

- 每日全量備份 PostgreSQL
- 關鍵表可加上更高頻率增量/快照
- 至少保留 7~30 天，依法規與營運需求調整

### 11.3 復原流程 (高層)

1. 停止寫入或進入維護模式
2. 復原 PostgreSQL 到指定時間點
3. 重新部署 app 並跑健康檢查
4. 驗證 trip/favorites/itinerary/settlements 核心讀寫
5. 服務恢復後補跑 smoke test

---

## 12. 變更管理準則 (給 AI / 工程師)

1. 任何 API contract 變更，先改 [src/types/workflow.ts](src/types/workflow.ts) 與 [src/lib/workflowApi.ts](src/lib/workflowApi.ts)。
2. 任何 DB 欄位調整，必須同步修改:
   - [src/server/db/schema.ts](src/server/db/schema.ts)
   - [migrations/0001_init_postgres.sql](migrations/0001_init_postgres.sql) 或新增 migration
   - [src/server/repositories/appRepository.ts](src/server/repositories/appRepository.ts)
3. 行程同步邏輯變更，必須同時驗證 HTTP 與 Socket 兩條路徑。
4. trip 相關寫入不可繞過 role 檢查。
5. 對使用者錯誤訊息維持溫和文案，避免洩漏內部實作細節。

---

## 13. 快速指令索引

- 開發: `npm run dev`
- 建置: `npm run build`
- 啟動產物: `npm run start`
- migration: `npm run db:migrate`
- staging smoke test: `npm run test:integration:staging`

---

## 14. 產品完整度與實作缺口 (維運視角)

### 14.1 Workflow 覆蓋度

- Search/Monetization: 核心可運作，但資料來源仍是 flights table，非真實 OTA。
- Itinerary Collaboration: 共編主鏈路可運作，deep-link trip landing flow 已完整實作（`TripLandingPage`）。
- Tools/Ledger: checklist / collaborators 已 trip scoped，分帳已支援多幣別分組結算。

### 14.2 已落地（2026-05）

| 功能 | 狀態 | 說明 |
|---|---|---|
| 收藏/追蹤後端持久化 | ✅ 完成 | `user_saved_items`/`user_tracked_prices` 表 + API + store 全鏈路 |
| collaborators trip 維度 | ✅ 完成 | `?trip_id=` 走 `getCollaboratorsByTrip` |
| checklist trip 維度 | ✅ 完成 | `?trip_id=` 走 `getChecklistByTrip` |
| itinerary_nodes lat/lng | ✅ 完成 | schema + migration 0002 + upsert 全程傳遞 |
| trip deep-link landing | ✅ 完成 | `TripLandingPage` + `App.tsx` URL 偵測 |
| 多幣別分帳結算 | ✅ 完成 | `settlements.currency` 欄位、按 (from, to, currency) 分組、migration 0004 |
| AI 打包清單動態季節 | ✅ 完成 | `getCurrentSeason()` 依當月自動推算 |
| ToolsTab activeTripId | ✅ 完成 | 從 `useAppStore.activeTripId` 讀取，不再硬寫死 URL 常數 |
| server.ts vite 動態 import | ✅ 完成 | 生產 bundle 不含 vite，減少打包體積 |
| Dockerfile migrations 複製 | ✅ 完成 | runner 階段包含 `migrations/` + `scripts/` |
| staging smoke test 覆蓋 | ✅ 完成 | 新增 10 項涵蓋 search、checklist、ledger 等 |

### 14.3 待補齊（優先序）

1. **search OTA provider adapter**：目前 `/api/search` 查 `flights` 靜態表，`affiliate_url` 為佔位 URL。建議逐步接入真實 OTA API（如 Skyscanner / Kiwi），同時保留 flights 表作 fallback cache。
2. **ToolsTab activeTripId 切換 UI**：目前 `activeTripId` 預設 `trip_999`，使用者無法在前端切換旅程。建議在 header 或底部加入旅程選擇器，呼叫 `setActiveTripId`。
3. **settlements 金額顯示優化**：`totalExpense` 目前混合不同幣別加總，視覺上會誤導。建議改為按幣別分別顯示小計。

---

本文件定位為 RoamJelly 的運維與值班操作基準。若有新增架構能力 (例如 queue、多服務拆分、CDN、多區部署)，請在每次發版後同步更新此文件。