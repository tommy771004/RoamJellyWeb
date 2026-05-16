🔍 RoamJelly (果凍漫遊) UI/UX 與 Workflow 健檢報告

這份報告基於目前的程式碼庫與 Vercel 部署狀態 (https://roam-jelly-web.vercel.app/)，從「使用者跨裝置體驗」以及「核心操作動線」兩個維度進行深度剖析。

一、 UI/UX 介面體驗分析 (Desktop vs Mobile)

雖然目前全面採用了 Glassmorphism (毛玻璃) 與粉色漸層，視覺相當精緻，但在跨裝置的可用性上仍有隱患。

📱 Mobile (手機端) 需調整的痛點

輸入鍵盤遮擋問題 (AiForm.tsx)

現狀：在填寫目的地時，表單位於畫面中央，下方有「下一步」按鈕。

問題：在 iOS Safari 或 Android Chrome 中，喚起虛擬鍵盤時，會導致畫面被推擠，底部的「下一步」按鈕容易被鍵盤或瀏覽器導覽列遮擋，導致使用者無法進入下一步。

解法：Mobile 版的浮動按鈕或底部操作列應監聽 window.visualViewport 或使用 dvh (Dynamic Viewport Height) 單位，並在輸入時將按鈕改為 Sticky 吸頂或跟隨鍵盤上方。

地圖視圖缺乏真實互動 (ItineraryTab.tsx - MapView)

現狀：目前的地圖模式是一個 55vh 高度的毛玻璃卡片，裡面的座標是用 toMapPercent 轉換成 SVG 直線與絕對定位的圖示。

問題：在手機上，這只是一張「靜態圖片」，無法雙指縮放 (Pinch-to-zoom)、無法拖曳平移 (Pan)、點擊景點也沒有清晰的彈出資訊 (Popup)。這對於在當地找路的旅客來說是完全無效的。

解法：建議整合 react-leaflet 或 Google Maps API，替換掉自製的百分比定位，讓地圖具備真實的互動性與導航價值。

口袋名單 (Favorites) 的收納位置

現狀：在 Desktop 上，口袋名單在左側 Sidebar；在 Mobile 上，它被放在整個行程列表的最下方 (lg:hidden mt-20)。

問題：使用者在 Mobile 上必須滑過一整天的行程，才能到底部把口袋名單加進來，操作動線太長且不直覺。

解法：Mobile 端應將「口袋名單」設計成一個底部抽屜 (Bottom Sheet / Drawer)，點擊懸浮按鈕 (FAB) 隨時喚起，方便直接拖曳或點擊加入行程。

[新增] 底部導覽列 (Bottom Navigation) 在滾動時的干擾

問題：如果 App 有實作 Bottom Navigation，在手機瀏覽器往下滾動查看長行程時，導覽列可能會佔據寶貴的螢幕空間。

解法：實作「向下滾動時隱藏，向上滑動時顯示 (Scroll to hide)」的行為，最大化閱讀區域。

💻 Desktop (桌機端) 需調整的痛點

空間利用率不足 (太過依賴卡片堆疊)

現狀：桌機橫向空間大，但目前的 ItineraryTab 列表在桌機上依然是巨大的卡片向下堆疊。

問題：這樣的設計讓一頁只能看到 3-4 個景點，無法展現高密度資訊，浪費了 Desktop 的螢幕優勢。

解法：Desktop 模式可以考慮改成「左側清單（或表格）＋ 右側真實地圖」的雙欄固定版面 (Split-pane view)，讓使用者一邊排行程，一邊看到地圖路線變化。

缺乏拖曳排序 (Drag & Drop)

現狀：目前景點的排序是依賴 time 欄位進行比較排序。

問題：在桌機上，使用者最直覺的排行程方式是「把下午的景點用滑鼠拖到早上」。目前如果要改順序，必須點擊編輯 ✏️ -> 手動修改時間 -> 儲存，操作成本極高。

解法：強烈建議引入 @hello-pangea/dnd 或 dnd-kit，讓 Desktop (甚至 Mobile) 支援直接拖曳卡片來改變排序與時間。

[新增] 「新增行程」與「口袋名單」的拖曳整合

問題：目前從口袋名單新增景點，是透過點擊按鈕。這在桌機上不夠直覺。

解法：實作跨容器拖曳 (Cross-list drag and drop)，讓使用者可以直接把左側 Sidebar 的口袋名單，拖進右側特定天的行程時間軸中。

二、 核心工作流 (Workflow) 致命斷點分析

這部分是目前產品能否順利讓使用者「走完全程」的關鍵。以下流程存在嚴重的斷點：

🚨 1. 認證與上車流程 (Auth & Onboarding Flow) 缺失

斷點：

生產環境 (Production) 啟用了 AUTH_REQUIRED，但前端完全沒有實作註冊/登入頁面 (LoginScreen.tsx 似乎未被正確接入路由)。

ENABLE_DEV_TOKEN_ENDPOINT 在正式環境被關閉，導致非開發者進入網站時，沒有合法的 JWT Token。

影響：真實使用者打開您的 Vercel 連結後，如果沒有預設的 trip_id 或無法取得 Token，將無法建立新行程，所有 API 請求都會被 Backend 的 Auth Middleware 擋下 (401 Unauthorized)。

解法：必須盡快完成 /login 與 /register 的 UI，或者先實作「匿名登入 (Anonymous Login / Guest Mode)」，讓使用者不須註冊也能先體驗排行程，要儲存時再要求綁定 Google 或 Email。

🚨 2. AI 規劃結果的「資料遺失」 (Data Loss in AI Handoff)

斷點：使用者在 DynamicItineraryView 看到 AI 生成的 ai_note (貼心提示) 與 intensity (強度)。但點擊「儲存」進入 ItineraryTab 後，這些資料沒有寫入資料庫的 ItineraryNode Schema 中，而是顯示硬編碼的假字（如：「這是一個關於...的詳細介紹」）。

影響：使用者體驗極差，覺得「剛才 AI 給的心血全白費了」，AI 導遊的價值完全喪失。

解法：

擴充資料庫 Schema (schema.ts)，加入 description, aiNote, intensity 欄位。

在表單儲存時將這些欄位一併帶入。

ItineraryListItem 中將假字替換為動態渲染 {item.aiNote || item.description}。

🚨 3. WebSocket 斷線重連機制失效

斷點：Socket disconnect 時，沒有在重新連線後再次觸發 join_room 事件。

影響：使用者如果在手機上切換 App（例如去 Safari 查個資料），瀏覽器會暫停執行導致 Socket 斷線。切回畫面時，雖然 Socket.io 預設會重連，但因為沒有再次發送 join_room，該使用者實際上「已經不在房間內」。旅伴修改行程時，他將收不到即時更新，必須 F5 重新整理。

解法：在 Socket 邏輯中，將 join_room 綁定在 connect 事件內，確保每次斷線重連都會自動再進房。

🚨 4. 邀請旅伴的落地頁 (Landing Page) 缺失

斷點：分享按鈕產生的連結是 ${window.location.origin}/trip/${TRIP_ID}。

影響：如果一個從未用過 RoamJelly 的朋友點擊了這個連結，由於缺乏 TripLandingPage，且朋友沒有 Token，點進去可能只會看到一片空白、API 錯誤，或被無意義地強制跳轉，無法順利加入共編。

解法：需要一個邀請過渡頁面。當系統偵測到未登入使用者訪問 /trip/:id 時，應顯示：「您的朋友邀請您共編【XXX 行程】，請先輸入您的暱稱加入」。

🚨 5. [新增] 離線狀態 (Offline Mode) 的寫入衝突處理

斷點：目前程式有偵測 isOffline 並轉為唯讀或顯示提示。但如果是「網路微弱 (Flaky network)」狀態，發出的 API 請求失敗，前端狀態與後端資料庫可能會產生不一致。

影響：使用者以為自己已經儲存了某個景點，但其實 API 逾時失敗，下次重新整理後資料就消失了。

解法：需要引入樂觀更新 (Optimistic UI) 的失敗回滾機制 (Rollback)，或是將失敗的請求存入 localStorage 或 IndexedDB 等待網路恢復後重試 (Retry-Queue)。

🎯 優先修復建議 (Action Items)

針對您目前的 Vercel 部署版本，建議優先依照以下順序進行版更修復：

[Workflow] 打通 Auth 流程：先實作訪客模式 (Guest JWT) 或基本的登入頁面，否則其他人無法真正測試與儲存行程。

[Workflow] 修復 AI 資料傳遞：把 AI 產生的 Tips 與強度介紹順利寫入 DB，並於編輯頁面呈現。

[UI/UX] 實作拖曳排序 (Drag & Drop)：這是排程工具最不可或缺的基礎功能。

[Workflow] 修復 Socket.io 斷線重連：確保行動裝置切換 App 也能無縫共編。

[UI/UX] 替換真實地圖套件：引入 Leaflet 或 Google Maps，讓看地圖不再只是一張靜態圖。

[UI/UX] 手機版輸入體驗優化：處理鍵盤遮擋按鈕以及口袋名單的收納位置。