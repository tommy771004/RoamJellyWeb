🪐 漫遊果凍 (Roam Jelly) 網站 SEO 深度研究與優化實戰計劃書

本計劃書針對您的旅遊規劃網站 Roam Jelly (roam-jelly-web.vercel.app) 進行實際 SEO 現況分析。由於該網站採用 Vercel 託管，且行程頁面依賴動態參數（Query Parameter），本計畫將著重於技術型 SEO 重構與使用者生成內容 (UGC) 的搜尋流量增長策略。

一、 現況診斷與三大 SEO 致命傷分析

經評估，目前的網站架構在 SEO 方面存在以下急需解決的痛點：

1. 參數化網址 (?trip_id=...) 的爬蟲收錄障礙

問題診斷：目前行程頁面使用 ?trip_id=trip_1779331889870_3qf2nil 這種查詢參數。

SEO 影響：Google 爬蟲（Googlebot）對於帶有參數的 URL 較為敏感，容易將其視為重複內容、篩選機制，或乾脆判定為與首頁相同的 canonical 頁面而不予收錄。這會導致使用者辛辛苦苦排好的公開行程，完全無法被 Google 索引並呈現在搜尋結果中。

2. Vercel 免費子網域的權重流失

問題診斷：網站目前運行在 vercel.app 網域下。

SEO 影響：vercel.app 是 Vercel 的共用網域，不論累積多少反向連結（Backlinks）或品牌知名度，搜尋權重（Domain Authority）絕大部分都會歸屬於 Vercel 官方，而非您的品牌。這對長期品牌字搜尋與 SEO 極度不利。

3. 動態渲染（CSR）導致的社群預覽與爬蟲抓取落差

問題診斷：如果網站是純前端渲染（Client-Side Rendering, CSR），在爬蟲或通訊軟體（如 LINE、Facebook、Slack）抓取網址時，JavaScript 還沒執行，頁面只是一張空白的 HTML 骨架。

SEO 影響：

社群分享失效：當使用者把行程分享給朋友時，LINE 預覽可能只顯示預設的首頁標題（如 "Roam Jelly"），而無法呈現「2026 東京賞櫻 5 天 4 夜自由行」等客製化標題與地圖預覽圖。

Google 延遲索引：Google 雖能解析 JS，但需要消耗雙倍的「爬取額度（Crawl Budget）」，導致新排好的行程要過好幾週甚至好幾個月才會出現在 Google 上。

二、 核心關鍵字策略 (Keyword Strategy)

旅遊規劃工具的關鍵字競爭非常激烈（對手包括 Notion 行程模板、Funliday、Line 旅遊等），建議採取「平台字、工具字為輔，具體行程長尾字為主」的藍海策略。

                    ┌───────────────────────────┐
                    │      搜尋金字塔底層        │ (流量最大，最容易突破)
                    │  「東京5天4夜自由行行程」 │ (UGC行程頁面)
                    └─────────────┬─────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │      搜尋金字塔中層        │ (有特定需求的使用者)
                    │   「多人協同行程排規劃」  │ (功能型長尾詞)
                    │   「免費日本行程表模板」  │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌───────────────────────────┐
                    │      搜尋金字塔頂端        │ (品牌字與核心工具字)
                    │「Roam Jelly」「行程規劃App」│ (難度最高，需品牌累積)
                    └───────────────────────────┘


關鍵字規劃表

類別

目標關鍵字舉例

搜尋意圖 (User Intent)

落地優化策略

UGC 長尾詞

「[地點] + [天數] + 自由行/行程」



例如：富士山 3 天 2 夜行程排法

正在尋找現成行程、想直接複製修改的旅客

讓使用者的公開行程被索引，提供「複製行程」按鈕。

功能/工具詞

「線上行程排點」、「多人協同行程排規劃」、「出國排行程 App」、「地圖式行程表」

尋找行程排點工具、想與旅伴共同編輯的群眾

撰寫功能介紹登陸頁 (Landing Page)，埋設結構化資料。

模板/資源詞

「Notion 旅遊模板 替代」、「日本自由行 Excel 下載」

習慣用既有模板，但尋求更直覺（如整合地圖）的替代方案

建立「推薦行程模板專區」，提供高品質官方模板供下載。

三、 技術型 SEO (Technical SEO) 優化方案

這是最核心的改革部分。要讓 Roam Jelly 擁有強大的 SEO 基因，必須進行以下架構調整：

1. 網址結構重構 (Clean & Semantic URLs)

將依賴 Query String 的網址，改為語意化路徑（Path Routing）。

❌ 當前結構：https://roam-jelly-web.vercel.app/?trip_id=trip_1779331889870_3qf2nil

⭕ 理想結構：https://roamjelly.com/trips/trip_1779331889870_3qf2nil

🔥 極致 SEO 結構（拼音/英文 Slug）：https://roamjelly.com/trips/tokyo-5-days-trip_1779331889870
(在網址中直接包含「地區」與「天數」，Google 對此類網址的權重極高。)

2. 伺服器端渲染 (SSR) 或增量靜態生成 (ISR) 策略

如果您使用的是 Next.js / Nuxt.js，建議對行程頁面採用 ISR (Incremental Static Regeneration)：

機制：當使用者建立並「公開」行程時，伺服器在背景生成該行程的靜態 HTML。

好處：

網頁載入時間（LCP）降到毫秒級，Core Web Vitals 指標拿滿分。

爬蟲一進來就能讀到完整的景點名稱、天數與行程介紹，直接秒收錄。

3. 動態 Open Graph (OG) 與 Metadata 產生器

在伺服器端（SSR）根據 trip_id 從資料庫拉取行程資料，動態塞入 HTML Header 中：

<!-- 範例：當這條行程被分享到 LINE 時 -->
<title>傑克的東京 5 天 4 夜追櫻之旅 - Roam Jelly 漫遊果凍</title>
<meta name="description" content="包含新宿御苑、淺草寺、澀谷 Sky 等人氣景點的完整地圖路線規劃。快來複製這份行程，和旅伴一起出發！" />

<!-- Open Graph 標籤 -->
<meta property="og:title" content="傑克的東京 5 天 4 夜追櫻之旅 - Roam Jelly" />
<meta property="og:description" content="用 Roam Jelly 輕鬆排行程，一鍵搞定地圖與時間線！" />
<meta property="og:image" content="[https://roamjelly.com/api/og?trip_id=trip_1779331889870](https://roamjelly.com/api/og?trip_id=trip_1779331889870)" /> <!-- 動態生成地圖或第一個景點的縮圖 -->
<meta property="og:type" content="website" />


4. 結構化資料 (Schema Markup) 導入

在行程頁面嵌入 JSON-LD Schema，讓 Google 搜尋結果出現「特殊樣式（Rich Snippets）」，大幅提升點擊率。
針對行程表，最適合使用 ItemList 或 Event（若為特定日期活動）或者自訂的 Trip Schema。

<script type="application/ld+json">
{
  "@context": "[https://schema.org](https://schema.org)",
  "@type": "ItemList",
  "name": "傑克的東京 5 天 4 夜追櫻之旅",
  "description": "漫遊果凍精選東京賞櫻路線",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Day 1: 新宿御苑賞櫻"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Day 2: 淺草寺與隅田公園"
    }
  ]
}
</script>


四、 UGC 流量增長引擎：打造「行程廣場」

要讓網站不花一毛錢就能擁有源源不絕的 SEO 流量，關鍵在於將使用者的行程轉化為您的「關鍵字登陸頁」。

 ┌────────────────┐      ┌─────────────────┐      ┌─────────────────┐
 │ 使用者排完行程 │ ───> │ 設定為「公開」  │ ───> │ 自動產生 SEO 頁 │
 └────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                                           ▼
 ┌────────────────┐      ┌─────────────────┐      ┌─────────────────┐
 │ 獲得關鍵字流量 │ <─── │ Google 爬蟲索引 │ <─── │ 加入 Sitemap    │
 └────────────────┘      └─────────────────┘      └─────────────────┘


1. 「行程公開」與「複製行程」功能 (必備)

預設行程為「私密」（不建立 SEO 頁面，避免重複內容與垃圾頁面充斥）。

提供「公開分享並上架廣場」開關。一旦啟用，該網址即對外開放，且開放其他使用者「複製/建立副本」。這能帶來極強的社群回流與反向連結。

2. 行程地圖與 Sitemap 自動化

建立一個專門供爬蟲抓取的 sitemap.xml。

當使用者將行程設為公開時，API 自動將該 URL 新增至 sitemap.xml，主動通知 Google 進行抓取。

五、 具體執行時程與里程碑 (Roadmap)

這個計劃分為三個階段，您可以配合開發進度逐步實施：

🛠️ 第一階段：基礎建設 (1-2 週) — 著重技術

購買並設定客製化網域：將網站遷移至如 roamjelly.com（或 .app, .travel 等有旅遊感的新網域）。

重構路由 (Routing)：將前端路由從 ?trip_id=... 改為 /trips/[trip_id] 的乾淨網址。

串接 SSR/ISR：確保行程頁面的 HTML 能夠在伺服器端預先渲染，並動態生成標題與描述。

🚀 第二階段：社群與分享優化 (3-4 週) — 著重傳播與點擊率

動態 OG 圖產生器：實作一個簡單的 API（例如利用 @vercel/og），自動將行程名稱與地圖縮圖結合成分享圖片。

加入 Schema 標籤：手動或自動在 HTML 中嵌入 JSON-LD。

社群分享一鍵複製：提供美觀的 LINE/FB 分享按鈕，在剪貼簿中附帶吸引人的 SEO 文案。

📈 第三階段：內容行銷與流量擴張 (第 5 週起) — 著重自然增長

首頁「熱門行程廣場」：將優秀的公開行程展示在首頁，增加內部連結（Internal Links）權重，讓爬蟲可以從首頁順利爬到各個行程頁。

部落格/指南專區 (SEO Content Blog)：

撰寫如「如何用 Roam Jelly 在 10 分鐘內排好東京行程」等教學文。

鎖定「協同旅遊規劃推薦」、「多人排行程工具」等核心競品詞進行攔截。

eof
