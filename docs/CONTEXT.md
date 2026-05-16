# CONTEXT.md — RoamJelly 果凍漫遊 領域術語表

文件版本: v1.0
更新日期: 2026-05-15
維護規則: 若與程式碼衝突，以程式碼為準，並回頭更新此文件。

---

## 1. 產品定位

RoamJelly 是一個協作式旅行規劃平台，提供三條核心服務：

| Workflow | 說明 |
|---|---|
| **搜尋與導流（Search & Clickout）** | 比價搜尋 + 追蹤點擊、將使用者導向 OTA 合作夥伴 |
| **共編行程（Collaborative Itinerary）** | 多人即時協作行程，支援 AI 規劃 |
| **旅途工具包（Travel Toolkit）** | 行李清單、多幣別分帳、天氣、分享提醒 |

---

## 2. 核心術語表（Glossary）

### 2.1 旅程（Trip）

| 術語 | 定義 |
|---|---|
| **Trip** | 一趟旅行的主體，包含 `id`、`name`、`destination`、`days`、`isPublic`、`forkCount`。每個行程最多有三種角色成員（owner / editor / viewer）。 |
| **TripRole** | `owner`（最高權限）、`editor`（可編輯行程/收藏/分帳）、`viewer`（唯讀）。透過 `ensureTripRole` + `hasRequiredRole` 在 API 層強制執行。 |
| **TripMember** | `trip_members` 表中一筆 tripId + userId + role 的記錄。加入行程時建立。 |
| **TripInfo** | 前端展示用的旅行摘要型別，包含 `destination`、`days`、`startDate`、`endDate`、`coverImage`（Unsplash 圖）。 |
| **TripSummary** | 精簡版旅行列表用型別：`tripId`、`name`、`destination`。 |

### 2.2 行程節點（ItineraryNode）

| 術語 | 定義 |
|---|---|
| **ItineraryNode** | 行程中的單一活動/景點，以 `node_id` 為主鍵，屬於某個 `trip_id` + `day`。|
| **day** | 節點屬於行程的第幾天（1-indexed 整數）。|
| **sort_order** | 同一天內節點的排列順序（整數，升序）。|
| **category** | 節點分類：`flight`、`transport`、`landmark`、`food`、`shopping`、`nature`、`hotel`、`activity`、`nightlife`、`other`。|
| **intensity** | 體力消耗指標：`chill`（輕鬆）、`moderate`（適中）、`hardcore`（高強度）。|
| **ai_note** | AI 針對使用者偏好生成的客製化提醒文字。|
| **transport_to_next** | 前往下一個節點的預估交通時間與方式（自然語言描述，如「搭乘地鐵約 25 分鐘」）。|
| **linkedFactId** | 若此節點對應到某個 TravelFact（如航班），記錄其 ID。|
| **is_visited** | 布林值，使用者標記是否已造訪。|

> **避免使用**：`location`（請用 `title`）、`icon`（請用 `emoji`）、`spot`（泛用詞，改用 `node` 或 `ItineraryNode`）。

### 2.3 旅行事實（TravelFact）

| 術語 | 定義 |
|---|---|
| **TravelFact** | 已確認的旅行錨點資訊，用於 AI 規劃的上下文。儲存在 `trip_travel_facts` 表。|
| **factType** | `flight_outbound`（去程航班）、`flight_inbound`（回程航班）、`stay`（住宿）。|
| **TravelFactSource** | `imported_search`（從搜尋匯入）、`manual`（手動輸入）、`ai_inferred`（AI 推斷）。|
| **TravelFactsSummary** | 聚合所有 TravelFact 後的摘要，包含 `hasCompleteAiAnchors`（是否同時有去程航班與住宿）。|
| **missingAnchors** | 尚未填入的錨點陣列，值為 `'flight_outbound'` 或 `'stay'`。|
| **AI Anchors** | 指 `flight_outbound` + `stay` 這兩個對 AI 行程生成最關鍵的 TravelFact。|

### 2.4 搜尋與導流（Search & Clickout）

| 術語 | 定義 |
|---|---|
| **SearchItem** | 搜尋結果中的單一票券或航班，包含 `id`、`provider`、`price`、`currency`、`affiliate_url`、`type`。|
| **affiliate_url** | 帶有合作夥伴追蹤參數的外部連結，點擊後觸發 Clickout。目前為示意 URL，尚未接入真實 OTA 簽約連結。|
| **Clickout** | 使用者在 RedirectModal 確認後，前端 `window.open(affiliate_url)` 並 POST `/api/track/clickout`（非阻塞 202）的完整流程。|
| **OTA Provider** | 外部票價供應商。搜尋時優先用 Trip.com Scraper；失敗或未設定時 fallback 至內部 `flights` 表。|
| **SearchCache** | 以 Redis key `cache:search:{from}_{to}_{date}` 暫存搜尋結果，TTL 10 分鐘。Redis 不可用時 fallback 至記憶體 Map。|
| **SearchHistory** | 以 Redis list `history:search:global` 記錄搜尋行為（最多 200 筆）。|

### 2.5 收藏與儲存（Favorites & Saved Items）

| 術語 | 定義 |
|---|---|
| **Favorite / FavoriteSpot** | 使用者在行程中標記的收藏景點，帶有 `lat`/`lng`，儲存在 `favorites` 表（trip scoped）。|
| **UserSavedItem** | 使用者跨行程的個人收藏（`user_saved_items` 表），以 `item_id` 識別。|
| **UserTrackedPrice** | 使用者追蹤降價的票券（`user_tracked_prices` 表），以 `item_id` 識別。|
| **geocodeSpot** | 後端透過 Nominatim（OpenStreetMap）API 將景點名稱轉換為 lat/lng 座標的函式。|

### 2.6 工具包（Travel Toolkit）

| 術語 | 定義 |
|---|---|
| **ChecklistItem** | 行李清單中的單一項目，帶有 `category`（documents / electronics / clothing / toiletries / other）、`completed` 布林值。Trip scoped。|
| **Expense** | 分帳記錄（`expenses` 表），欄位有 `payerId`、`amount`、`clearedAt`。|
| **Settlement** | 聚合後的還款建議，按 `(from, to, currency)` 三元組計算。`clearedAt` 不為 null 表示已結清。|
| **SettlementHistoryEntry** | 已結清的分帳歷史記錄（`clearedAt != null`），含各幣別小計。|

### 2.7 協作（Collaboration）

| 術語 | 定義 |
|---|---|
| **Collaborator** | 行程協作者的前端展示型別：`id`、`name`、`avatar`。|
| **join_room** | Socket.io 事件，前端連線後 emit 以加入行程的即時同步房間。|
| **sync_itinerary** | Socket.io 事件，行程節點新增/修改時 emit，廣播給同房間所有成員。|
| **SyncItineraryPayload** | `sync_itinerary` 的 payload 型別，包含 `trip_id`、`action`（add_node / remove_node / patch_node）、`payload`。|
| **PlanningRecord** | 記錄在 Redis 的規劃事件日誌（動作來源 socket 或 api、節點 ID、時間）。|
| **PlanningSnapshot** | Redis 快照，儲存某個時間點的完整行程節點狀態，TTL 6 小時。|

### 2.8 AI 規劃（AI Itinerary）

| 術語 | 定義 |
|---|---|
| **ItineraryPlannerForm** | 前端 AI 規劃表單的型別，包含 `destination`、`days`、`companions`、`vibes`、`interests`、`budget`、`dietary`、`transport` 等偏好。|
| **AiPreferenceProfile** | 儲存在 `user_ai_profiles` 表的使用者 AI 偏好設定。|
| **generateItinerary** | 後端 AI 服務的主要函式，呼叫 OpenRouter API 生成完整行程 JSON。|
| **regenerateSpot** | 單一節點重新生成，替換使用者不滿意的景點，不重跑整份行程。|
| **aiMode** | 行程生成的模式：`selected_day`（重規某天）、`generate_for_selected_days`（重規區間）、`overwrite_all`（全部重規）。|
| **travelFactsContext** | 傳給 AI 的旅行錨點摘要字串，包含已確認的航班與住宿資訊。|

### 2.9 認證（Auth）

| 術語 | 定義 |
|---|---|
| **AuthUser** | JWT payload 中的使用者資訊，含 `userId`。|
| **Guest User** | `userId` 以 `guest_` 前綴開頭的匿名使用者，AI 請求配額較低。|
| **AUTH_REQUIRED** | 生產環境預設開啟；關閉時允許無 token 存取多數 API。|
| **dev-token** | 僅在非生產環境可用的 `POST /api/auth/dev-token`，自動取得 JWT。|

---

## 3. 系統邊界

```
┌─────────────────────────────────────────┐
│  前端 (React + Vite)                    │
│  ├── HomeTab: 搜尋、導流確認            │
│  ├── ItineraryTab: 行程共編、AI 規劃    │
│  └── ToolsTab: 清單、分帳、天氣         │
└────────────────┬────────────────────────┘
                 │ HTTP + Socket.io
┌────────────────▼────────────────────────┐
│  後端 (Express + Node, 同一進程)        │
│  ├── REST API (/api/*)                  │
│  ├── Socket.io (join_room / sync)       │
│  ├── Redis (快取 / 事件日誌，可選)      │
│  └── PostgreSQL (Drizzle ORM)           │
└─────────────────────────────────────────┘
         │                    │
   OTA Provider          Nominatim
   (Trip.com/            (geocode)
    OTA_PROVIDER_URL)
```

---

## 4. 關鍵不變式（Invariants）

這些規則在任何情境下都必須成立：

1. **所有 trip 寫入操作必須先通過 role 檢查**（`editor` 以上）。
2. **Clickout 記錄必須是非阻塞的**（202 回應，不阻擋使用者導向外部連結）。
3. **行程同步必須同時走 HTTP + Socket 兩條路徑**（HTTP 持久化、Socket 即時廣播）。
4. **Settlement 聚合以 `(from, to, currency)` 三元組為單位**，不可混合幣別計算。
5. **Redis 是強化而非硬依賴**；Redis 不可用時所有功能必須 fallback 至記憶體，不可拋錯中斷服務。

---

## 5. 術語避免清單（Avoid）

| 避免使用 | 應改用 |
|---|---|
| `location`（作為節點名稱欄位）| `title` |
| `icon`（節點圖示）| `emoji` |
| `spot`（泛稱節點）| `ItineraryNode` 或 `node` |
| `ledger`（分帳）| `expense` / `settlement`（依語境） |
| `gemini`（AI 服務）| `OpenRouter`（實際呼叫的 API） |
| `checklist`（表名複數）| `checklistItems`（前端）/ `checklist_items`（DB 表名）|
