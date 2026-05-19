🚀 RoamJelly (果凍漫遊) 增長體驗與部署後優化報告 (Phase 5)

本報告為第五階段的產品體驗健檢。針對您最新部署於 Vercel 的線上版本，本報告將重點放在：「如何讓這個 Web App 玩起來像原生的 iOS/Android App？」、「如何透過社交分享帶來流量？」以及「極端旅遊情境下的細節體驗」。

一、 部署後的「原生感」升級 (Native-like Mobile UX)

目前網站採用了 RWD (響應式設計)，但在手機瀏覽器上仍有明顯的「網頁感」。若要讓使用者在旅途中頻繁使用，必須提升沉浸感。

🚨 1. 缺乏 PWA (Progressive Web App) 支援

現狀：目前使用者只能透過 Safari 或 Chrome 的網址列訪問。

問題：瀏覽器的網址列與底部導覽列會佔據約 15% 的寶貴螢幕空間。且在沒有網路的飛機上，雖然程式裡有寫 isOffline 邏輯，但瀏覽器若未快取資源，可能根本打不開網頁。

修改建議：

加入 manifest.json 與 Service Worker (可使用 vite-plugin-pwa)。

實作「加入主畫面 (Add to Home Screen)」提示。讓 RoamJelly 能以全螢幕 (Standalone) 模式運行，看起來就跟真的 App 一模一樣。

🚨 2. 缺乏觸覺回饋 (Haptic Feedback)

現狀：加入拖曳排序 (Drag & Drop) 或點擊按鈕時，只有視覺變化。

問題：對於旅遊排程這種需要大量互動、整理卡片的工具，缺乏實體回饋會讓操作顯得「輕飄飄的」。

修改建議：

在觸發拖曳開始、卡片放下、或是點擊「刪除」等關鍵行為時，加入 navigator.vibrate([50])。極輕微的震動能讓操作手感瞬間提升到原生 App 等級。

二、 流量獲取與社交裂變 (Acquisition & Viral Loop)

旅遊工具是非常依賴「口碑推薦」與「行程分享」的產品。目前的分享機制過於陽春。

🚨 1. 靜態且缺乏吸引力的分享連結 (Link Preview / OG Tags)

現狀：現在複製網址貼到 LINE 或 IG，只會抓到 index.html 裡面寫死的 <title> 與 <meta description>，所有行程分享出去長得都一樣。

問題：「欸你看我排的行程 [連結]」——如果只有乾巴巴的連結，點擊率會非常低。

修改建議：

動態 Open Graph 圖片：利用 Vercel Edge Functions (如 @vercel/og)，當分享 /trip/123 時，動態生成一張預覽圖。

預覽圖設計：圖上動態印上該行程的「大標題（如：東京五日遊）」、「旅伴大頭貼」、「總景點數」以及背景放上目的地的地圖或照片。

🚨 2. 新手「冷啟動」的流失率 (Cold Start Drop-off)

現狀：首次進入網站的新使用者，看到的是空白介面，必須自己想辦法填寫目的地並等待 AI 生成。

問題：在使用者體驗到「AI 排行程有多讚」之前，就要求他們做一堆輸入，很容易導致跳出 (Bounce)。

修改建議：

一鍵 Demo 預覽：在首頁直接提供 3 個精選模板（例如：「🌸 點我預覽：京都 3 日賞櫻」、「🍜 點我預覽：曼谷吃貨之旅」）。點擊後不需登入、不需等待，直接載入快取的完美行程，瞬間觸發使用者的 Aha Moment！

三、 行中與極端情境的細節 (In-Trip & Edge Scenarios)

🚨 1. 缺乏深色模式 (Dark Mode)

現狀：目前 UI 全面採用了白色毛玻璃 (bg-white/40) 與亮色調。

問題：旅遊時，使用者常在清晨的紅眼航班、或是晚上的長途夜車上查看行程。此時純白的介面會非常刺眼。

修改建議：

在 Tailwind CSS 中全面引入 dark: variants。

深色模式下，將毛玻璃的背景改為 bg-slate-900/60，文字改為 text-slate-200，提供更舒適的夜間閱讀體驗。

🚨 2. 一鍵導航與交通銜接 (Direct Navigation Handoff)

現狀：行程表上的景點只是純文字，使用者要找路必須複製文字，再自己切換到 Google Maps 貼上。

問題：拿著大包小包行李在國外找路時，這段操作流程極度煩躁。

修改建議：

實作 Deep Linking：在每張景點卡片上加入醒目的「🧭 導航」按鈕。點擊後透過 URI Scheme (如 https://www.google.com/maps/dir/?api=1&destination={lat},{lng}) 直接喚醒手機上的 Google Maps 或 Apple Maps 並開始導航。

🚨 3. 首屏載入效能 (Initial Load & Code Splitting)

現狀：SPA 架構容易把所有的 Component (包含龐大的 Map 套件、拖曳套件) 打包進同一個 JS 檔案中。

問題：如果使用者在網路訊號較弱的景點打開網頁，可能會看著白畫面 (Blank Screen) 發呆好幾秒。

修改建議：

使用 React lazy 與 Suspense 進行 Route-level 的 Code Splitting。例如：/login 就不需要載入地圖套件與拖曳套件，大幅縮小首屏所需的 JavaScript 體積。