🏰 RoamJelly (果凍漫遊) 產品架構與商業邏輯健檢報告 (Phase 3)

本報告為第三階段的系統級別健檢。當解決了前兩期的 UI/UX 問題後，若要讓 RoamJelly 具備長期營運的潛力並建立競爭壁壘（護城河），必須檢視以下系統架構與商業邏輯的潛在問題。

一、 商業化與變現的斷點 (Monetization Gaps)

根據 Plan.md 的描述，RoamJelly 的核心之一是「Search/Monetization (搜尋與變現)」，但目前的實作與這個目標脫節。

🚨 1. 航班/住宿資料無法轉化為實際訂單 (No Conversion Funnel)

現狀：在 AiForm 填寫完成後，雖然前端有 handleAutoFetchFlights 的功能（呼叫 searchOffers），但這僅僅是把航班資訊當成純文字 (Segments) 塞進行程表裡。

問題：這些純文字航班沒有夾帶 Deeplink（深度連結）或 Affiliate URL（聯盟行銷連結）。使用者看到航班後，必須自己去 Skyscanner 或航空公司重查一次才能買票。

修改建議：

Affiliate 整合：searchOffers 的回傳資料 (SearchItem) 必須包含 bookingUrl。

UI 調整：在行程表中，若卡片類別為 flight 或 hotel，應顯示一個醒目的「前往預訂 / 查看價格」按鈕（並帶上聯盟代碼），這將是 RoamJelly 未來主要的營收來源。

🚨 2. 行程模板化與社群裂變機制不足 (Lack of Viral Loop)

現狀：使用者可以產生專屬行程，也能透過「分享」複製網址給旅伴共編。

問題：這個分享是「封閉式」的。如果使用者排了一個超棒的「東京 5 日特種兵行程」，他無法將這個行程發布為「公開模板」，讓其他不認識的網友「一鍵複製（Fork）」並套用到自己的帳號。這限制了產品的自然增長 (Organic Growth)。

修改建議：

行程狀態欄位：在 DB 的 Trip table 加入 isPublic 與 forkCount 欄位。

發掘頁面 (Explore/Discover)：建立一個公開的行程大廳，展示高質量的使用者行程，並提供「複製此行程為我的草稿」的功能。

二、 系統架構與效能隱患 (System & Performance Risks)

目前的架構在初期驗證 (MVP) 階段沒問題，但如果使用者量體增加或行程變得很長，將面臨效能瓶頸。

🚨 1. Socket.io 同步粒度過粗 (Coarse-grained Synchronization)

現狀：當使用者編輯單一節點（例如修改標題）並儲存時，目前的邏輯是發送整個 ItineraryNode 物件進行覆蓋 (payload: normalized)。

問題：

如果未來 ItineraryNode 變得很肥（例如加入了長篇圖文日記、多張照片的 URL），每次打字儲存都發送整個物件會非常浪費頻寬。

若兩人同時編輯同一個節點的不同欄位（A 改時間、B 改標題），後存檔的人會把前一個人的修改徹底覆蓋（Last-write-wins）。

修改建議：

實作差異同步 (Delta Sync) 或 CRDT (Conflict-free Replicated Data Type)。

在 Socket 事件中加入 action: 'update_field'，僅發送 { node_id, field: 'title', value: '新標題' }，降低覆蓋衝突的機率。

🚨 2. 缺乏前端資料分頁與延遲載入 (Missing Pagination/Lazy Loading)

現狀：目前切換 Day 1 到 Day X 是透過前端 filter 陣列來切換顯示，且所有天數的資料在初始時一口氣載入 (fetchItinerary)。

問題：對於一趟為期 30 天的歐洲長途旅行，若每 天有 10 個景點，初始載入將包含 300 個節點。這會導致初次渲染極慢，且若未來加入圖片縮圖，將瞬間吃光行動裝置的記憶體。

修改建議：

API 分頁：後端 fetchItinerary 應支援按天數 ?day=1 請求。

前端快取：使用 React Query 或 SWR 來管理各天數的資料快取，只有當使用者點擊「Day 2」時，才去 Fetch 或從 Cache 取出渲染。

三、 長期資料壁壘與 AI 成長性 (Data Moat & AI Evolution)

RoamJelly 作為一款 AI 原生應用，目前的 AI 只是「消耗品」，尚未形成「資料飛輪 (Data Flywheel)」。

🚨 1. AI 缺乏「使用者偏好記憶」 (No Long-term AI Memory)

現狀：每次生成行程，使用者都要在 AiForm 重新勾選「不吃海鮮」、「喜歡睡到自然醒」。

問題：AI 其實不認識這個使用者。如果這是一個經常使用的會員，他會覺得每次都要重新設定很煩，AI 並不「貼心」。

修改建議：

建立 User Profile 表格：在資料庫記錄使用者的長期偏好（飲食禁忌、常搭的航空公司、平均預算）。

Prompt Context 注入：在呼叫 OpenRouter 時，自動將使用者的長期 Profile 注入 System Prompt，讓 AI 的建議越來越精準。

🚨 2. 未建立「地點」的主資料庫 (Missing POI Master Database)

現狀：目前的景點資料似乎是直接由 AI 憑空生成文字與座標（或是依賴簡單的 Nominatim Geocoding）。這表示同一個「清水寺」，在不同使用者的行程中，可能是完全獨立且缺乏關聯的純文字記錄。

問題：這會讓 RoamJelly 錯失建立「地點評價與熱度庫」的機會。未來如果想做「大家去京都最常把清水寺跟哪裡排在一起？」的數據分析將非常困難。

修改建議：

引入標準化的 POI (Point of Interest) ID（例如 Google Place ID 或 Foursquare ID）。

當 AI 推薦景點或使用者新增景點時，盡可能解析並綁定一個全球唯一的 Place ID。這樣未來就能針對特定 Place ID 進行關聯分析，甚至自動抓取營業時間與最新照片。