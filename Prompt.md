RoamJelly (果凍漫遊) - 進階功能與極致體驗提示詞庫

當您的雛型已經具備基本操作與商業邏輯後，請使用以下提示詞將 RoamJelly 提升至「次世代 Super App」的層級。

階段五：導入 AI 助理 (AI Assistant Integration)

提示詞 9：實作「Jelly AI 行程顧問」對話介面

「請幫我加入一個全新的『Jelly AI 助理』功能：


在畫面右下角新增一個懸浮按鈕 (Floating Action Button, FAB)，使用閃爍的漸層背景與 AI 圖示 (如 Sparkles)。

點擊後從下方滑出一個對話視窗 (Chat Sheet)，維持液態玻璃的毛玻璃質感。

模擬對話情境：預設顯示一條訊息『想去哪裡？我可以幫你規劃！』。使用者點擊預設按鈕『規劃東京五天四夜』後，AI 需呈現『打字機效果 (Typewriter Effect)』的回覆動畫。

AI 回覆完畢後，在對話框中直接生成一張精緻的『行程懶人包卡片』，並附帶『一鍵加入手帳』的按鈕。」

階段六：社交、探索與 UGC (Social & Community)

提示詞 10：實作「達人行程一鍵 Fork」的探索區塊

「請擴充 <TabHome> (探索首頁) 的內容：

在航班下方，新增一個『熱門達人手帳』的橫向滑動區塊 (Horizontal Scroll / Carousel)。

呈現 2-3 張達人行程卡片 (例如：『京都賞楓 3 日遊 - by @TravelBlogger』)，卡片需帶有封面圖模擬 (可用純色漸層或 placeholder 圖片)。

每張卡片上放置一個『複製行程 (Clone)』按鈕。

點擊時，請製作一個卡片縮小並飛入底部導覽列 <TabItinerary> (手帳 Icon) 的飛行軌跡動畫，完成後彈出 <JellyToast> 提示『已成功將行程複製到您的手帳！』。」

階段七：極致體驗與離線支援 (PWA & Offline Simulation)

提示詞 11：模擬離線快取狀態 (Offline Mode)

「身為一個旅遊 App，網路不穩時的體驗很重要。請幫我模擬離線狀態：

在 <App> 頂部開發環境外層，加入一個『模擬斷網』的開關 (Toggle)。

當切換為離線時：

頂部導覽列下方滑出一個紅/橘色的毛玻璃警告橫幅：『✈️ 目前處於離線狀態，已切換至本機快取模式。』

探索首頁的『即時機票比價』按鈕變成 disabled (灰色不可點)，並提示需連網。

<TabItinerary> (行程手帳) 必須正常顯示，強調我們支援離線查看行程。

<TabTools> 的天氣預報改為顯示『最後更新於 2 小時前』。」

階段八：個性化與視覺昇華 (Personalization & Dark Glass)

提示詞 12：實作「深色液態玻璃」模式 (Dark Mode)

「我們目前的液態玻璃是亮色系的。請幫我加入深色模式 (Dark Mode) 的支援，並設計一個開關：

請使用 Tailwind 的 dark: 前綴來實作。

在頂部 Header 加入一日/夜切換的按鈕 (Sun/Moon icon)。

深色液態玻璃規範：

背景：改為深邃的極光漸層 bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900。

卡片：改為 bg-black/40 backdrop-blur-xl border-white/20 shadow-black/50。

文字：確保標題改為白色或極淺的粉/紫色，保持高對比度的閱讀體驗。

確保切換時有平滑的顏色過渡動畫 (transition-colors duration-500)。」

進階除錯與優化 (Advanced Debugging)

當加入複雜動畫導致效能下降時，可以這樣問 AI：

「我加入了 AI 打字機效果和多個 Framer Motion 的動畫後，在手機瀏覽器上滾動時有點卡頓 (Lag)。請幫我檢查是否有使用到耗效能的 CSS 屬性，並將動畫改為透過 transform 和 opacity 來實作硬體加速 (Hardware Acceleration)。」