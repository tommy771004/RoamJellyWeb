# Taiwan Real Estate Price Explorer SEO 改善分析計畫

更新日期：2026-06-26

## 1. 文件盤點結論

本次分析範圍為 `SEODoc-main/*.md`，共 9 個 Markdown 檔：

| 檔案 | 主題 | 可轉為本專案的 SEO 任務 |
| --- | --- | --- |
| `SEO1.md` | SEO Starter Guide | 可索引 URL、title、meta description、內部連結、圖片 alt、避免 meta keywords 與 keyword stuffing |
| `SEO2.md` | Google Search 運作方式 | crawl、render、index、canonical、JavaScript 可見內容 |
| `SEO3.md` | Helpful content / E-E-A-T | 作者/來源透明、內容完整性、Who/How/Why、AI 使用揭露 |
| `SEO4.md` | Helpful content / E-E-A-T | 與 `SEO3.md` 內容重複，應視為重複來源文件 |
| `SEO5.md` | Generative AI content | AI 輔助內容必須有人工審核、準確性、背景說明 |
| `SEO6.md` | Technical SEO | robots.txt、sitemap、structured data、mobile、Search Console |
| `SEO7.md` | Web developer SEO | crawlable links、JavaScript SEO、語意 HTML、rich results |
| `SEOSEARCH_Main.md` | Crawling / indexing topics | URL structure、sitemaps、robots、canonical、mobile、metadata |
| `SEOSEARCH_Main2.md` | Search appearance topics | structured data、AI features、title links、snippets、images、site names |

重點觀察：

- `SEO3.md` 與 `SEO4.md` SHA256 相同，是完全重複文件；後續維護可保留一份即可。
- 文件主軸可歸納為 5 條執行線：可爬取/可索引、內容品質與 E-E-A-T、結構化資料、搜尋結果外觀、AI citation / GEO readiness。
- 本專案屬於「台灣實價登錄資料工具 + 資訊指南」，不應使用誇大投資承諾；房貸、補貼、租屋權益等 YMYL 邊緣主題必須保留官方查證與非建議聲明。

## 2. 現有實作評估

| 類別 | 現況 | 評分 | 缺口 |
| --- | --- | --- | --- |
| Crawl / Indexing | 已有語意 URL、build-time prerender、canonical、robots、sitemap build 產生 | 82/100 | `public/sitemap.xml` 是舊版基準檔，正式以 build 產物為準；需持續測試路由數量 |
| Metadata / SERP | 首頁與查詢頁已有 title、description、OG、Twitter | 80/100 | 純內容頁 runtime 先前只更新 title，description/canonical/schema 訊號不足 |
| Structured Data | 已有 WebSite、Organization、WebApplication、CollectionPage | 78/100 | 內容頁需補 BreadcrumbList；指南頁需可被辨識為 Article 類資訊內容 |
| Content Quality | 已有資料來源、方法、隱私、指南、購屋/租屋內容群 | 76/100 | 部分頁面仍偏短，缺少更新政策、作者/維護者透明度、外部官方引用密度 |
| E-E-A-T / Trust | 已聲明資料來源、限制、非政府網站、非投資建議 | 72/100 | 聯絡方式未公開，作者/維護者頁不足，金融/補貼頁需定期查核日期 |
| AI Citation / GEO | 已有 `llms.txt`、清楚定義與列表型內容 | 70/100 | 需要更多 answer-first 小節、表格化資料、官方來源連結、更新日期 |

## 3. 本次已實作改善

本次將文件中的「結構化資料、搜尋結果外觀、AI 可引用性」落到程式：

- 新增 `src/lib/seoContent.ts`：集中產生內容頁 title 與 JSON-LD。
- 內容頁 runtime 現在會同步更新 description、robots、canonical、OG、Twitter 與 JSON-LD。
- build-time prerender 內容頁改用同一套 structured data helper。
- 內容頁 JSON-LD 增加 `BreadcrumbList`。
- 指南型頁面增加 `Article` mainEntity，hub / index 頁增加 `ItemList` mainEntity。
- 測試補上內容頁 breadcrumb、hub ItemList、leaf guide Article 的驗證。

## 3.1 後續已執行改善（2026-06-26）

已完成 Phase 2 / P0-P1 的第一批內容信任補強：

- `/methodology/`：新增欄位與計算保守原則，說明不推估缺漏價格、坪數、屋齡或座標，並補上內容查核日期與更正流程。
- `/about/`：新增維護與更正原則，明確說明本站不代替政府機關、銀行、地政士、律師或估價師作成判斷。
- `/contact/`：補明本頁回饋表單是目前可用回報管道，並保留「未設定公開客服信箱前不虛構聯絡資料」原則。
- 金融/補貼頁：`/guides/mortgage-calculator/`、`/guides/first-home-loan-subsidy/`、`/guides/mortgage-approval-factors/`、`/guides/refinance-mortgage/` 已加入查核日期、官方來源入口與非報價/非核貸保證聲明。
- 租屋權益頁：`/renting-guides/deposit-and-lease/`、`/renting-guides/tenant-rights/` 已加入查核日期、法規/主管機關/稅務官方入口與個案爭議保留文件建議。
- 測試新增信任訊號檢查：build 後頁面需包含查核日期、欄位保守原則、住宅補貼線上申請系統、全國法規資料庫與財政部稅務入口網。

## 3.2 後續已執行改善（2026-06-26，第二批）

- 六都行政區索引頁新增在地判讀：臺北市、新北市、桃園市、臺中市、臺南市、高雄市各自有生活圈、產品型態、通勤與比較提醒，不再只是行政區連結列表。
- 新增 `SEODoc-main/README.md`：整理 `SEODoc-main` 文件索引，標記 `SEO3.md` 與 `SEO4.md` 完全重複、SHA256 相同，並指定後續引用 `SEO3.md` 作為 canonical 文件。
- 新增 `SEODoc-main/MONTHLY_SEO_SMOKE_CHECKLIST.md`：建立每月本機驗證、部署後驗證、Search Console 月檢與內容品質月檢流程。
- 新增 `npm run test:seo-docs`：用測試鎖定重複文件索引與每月 checklist 的必要內容。
- 測試新增六都索引在地判讀檢查：build 後需保留臺北市「捷運生活圈與屋齡差異」與高雄市「港灣與重劃區生活圈」等城市判讀訊號。

## 4. SEO 改善 Roadmap

### Phase 1：技術基礎與可索引性（已進行）

- 保持語意 URL：`/prices/{city}/{type}/` 與 `/districts/{city}/{district}/{type}/`。
- build 產生 sitemap，並對 canonical URL 數量設測試門檻。
- 純內容頁必須在無 JS 與 JS runtime 下都有一致 title、description、canonical。
- robots.txt 保持允許公開頁、封鎖 `/api/`。
- Search Console 驗證 token 繼續使用環境變數注入，不硬編碼。

成功標準：

- `npm run build` 成功。
- `npm run test:seo-content` 與 `npm run test:seo-routes` 通過。
- build 後 sitemap 包含所有索引頁且無 query string 舊路由。

### Phase 2：內容品質與 E-E-A-T

- 為 `/about/` 補「維護者/資料處理原則/更正流程」。
- 為 `/methodology/` 補更明確的資料更新頻率、欄位清理規則與不可推論範圍。
- 為房貸、補貼、租屋權益頁新增「最後查核日期」與官方來源連結。
- 為每篇指南建立固定格式：摘要答案、適用情境、資料限制、下一步查證。

成功標準：

- YMYL 邊緣頁面都有官方來源、日期、非個別建議聲明。
- 每個指南頁至少 2 個站內相關連結與 1 個官方外部來源。

### Phase 3：內容集群與內部連結

- 擴充六都行政區頁：先做索引頁，再依資料量挑選高需求行政區撰寫深度頁。
- 建立「買賣 / 預售屋 / 租賃」三條主題 cluster。
- 每個 cluster 設 pillar page、supporting guide、查詢入口與方法頁互連。
- 補 breadcrumb UI 或輔助導覽，讓使用者與搜尋引擎理解階層。

成功標準：

- 所有內容頁在導覽、頁尾或相關頁中至少可由 2 條內部路徑抵達。
- 新增頁面需同時更新 `SEO_CONTENT_PAGES`、`NAV_GROUPS` 與測試。

### Phase 4：AI Citation / GEO

- 每篇指南開頭加入 40-80 字 answer-first 摘要。
- 對可表格化主題使用表格，例如預售屋 vs 成屋、買賣 vs 租賃、房貸條件比較。
- 在 `llms.txt` 增加主要內容群與資料限制摘要。
- 追蹤 AI citation KPI：Google AI Overviews / AI Mode、ChatGPT、Perplexity、Bing Copilot 是否引用本站。

成功標準：

- 重要指南具備明確定義句、步驟列表或比較表。
- `llms.txt` 與 sitemap 指向一致。

## 5. 後續內容優先序

| 優先級 | 任務 | 理由 |
| --- | --- | --- |
| P0 | 補官方來源與查核日期到金融/租屋權益頁 | YMYL 邊緣內容，信任風險最高 |
| P0 | 補公開聯絡方式或明確維護者通道 | Trustworthiness 關鍵缺口 |
| P1 | 強化 `/methodology/`，加入欄位與計算限制表 | 實價登錄資料工具的核心可信度 |
| P1 | 六都行政區索引增加在地判讀提醒 | 提升 long-tail 查詢與內容深度 |
| P2 | 整理 `SEODoc-main` 重複文件 | 降低內部文件噪音 |
| P2 | 建立每月 SEO smoke checklist | 避免 sitemap、canonical、schema 回歸 |

目前狀態：

- P0「補官方來源與查核日期到金融/租屋權益頁」：已完成第一批。
- P0「補公開聯絡方式或明確維護者通道」：已完成站內回饋表單說明；公開客服信箱仍待部署方提供，不虛構。
- P1「強化 `/methodology/`，加入欄位與計算限制表」：已完成文字版保守原則；後續可再升級為表格 UI。
- P1「六都行政區索引增加在地判讀提醒」：已完成第一批。
- P2「整理 `SEODoc-main` 重複文件」：已完成索引整理；未刪除原始重複檔，避免破壞來源脈絡。
- P2「建立每月 SEO smoke checklist」：已完成，並新增 `test:seo-docs` 驗證。

## 6. 驗證清單

- `npm run seo:check`
- `npm run test:seo-content`
- `npm run test:seo-routes`
- `npm run lint`
- `npm run build`
- 部署後執行 `npm run seo:verify-live`
