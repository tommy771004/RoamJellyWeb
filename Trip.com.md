Trip.com 機票爬蟲 (Flight Parser) 實作提示詞

【系統指令】
你是一位精通 Web Scraping 與反爬蟲繞過技術的資深 Node.js 工程師。
我們的任務是為 RoamJelly 旅遊 App 實作一個概念驗證 (POC) 級別的 Trip.com 機票解析器。

【技術選型嚴格要求】

核心框架: 必須使用 Playwright (Node.js 版本)。因為 Trip.com 是高度動態渲染的網站，且防護嚴密，Playwright 的行為最接近真實使用者。

反偵測套件: 必須整合 playwright-extra 與 puppeteer-extra-plugin-stealth。這是繞過基礎無頭瀏覽器偵測（如 webdriver 標記）的絕對必要條件。

回傳格式: 解析完畢後，必須回傳符合 RoamJelly 規格的標準化 JSON 陣列。

【實作邏輯與步驟指示】

請撰寫一個名為 tripParser.js 的模組，包含一個非同步函式 scrapeTripFlights(origin, destination, date)。

步驟 1：建構動態 URL

觀察 Trip.com 的 URL 結構（例如：https://hk.trip.com/flights/{origin}-to-{destination}/tickets-{origin}-{destination}/?dcity={origin}&acity={destination}&ddate={date}，請根據最新網址結構組合）。

步驟 2：模擬真實行為與等待

啟動帶有 stealth plugin 的 browser context。

設置隨機的 User-Agent 與 viewport 尺寸。

page.goto(url, { waitUntil: 'domcontentloaded' })。

關鍵點：Trip.com 的搜尋結果需要幾秒鐘的非同步載入（會有進度條或骨架屏）。請使用 page.waitForSelector 等待「機票卡片列表的父元素」出現（例如包含 flight-list 或類似 class 的容器），並加入隨機的滑鼠滾動 (mouse.wheel) 模擬人類行為。

步驟 3：DOM 解析與資料提取

在頁面環境內使用 page.$$eval 遍歷所有的航班卡片。

提取以下欄位（需使用 try-catch 包覆單個欄位，因為 DOM 可能缺失）：

provider: 固定填入 "Trip.com"

airline: 航空公司名稱（通常帶有 logo 的 img alt 或旁邊的 span）

route: 出發機場與抵達機場代碼

time: 出發與抵達時間 (例如 "09:00 - 13:10")

price: 提取數字並轉為整數（需過濾掉 "NT$" 等貨幣符號與逗號）

步驟 4：錯誤處理與超時機制

如果遇到滑塊驗證碼 (CAPTCHA) 擋住畫面，請 catch 該錯誤並 console.log 提示「觸發防爬蟲機制」。

設定全局 Timeout (例如 30 秒)，若超時則回傳空陣列或快取資料。

【程式碼產出要求】
請提供完整的 tripParser.js 程式碼，包含必要的 npm install 指令註解，並在檔案底部寫一個簡單的執行範例（例如搜尋 TPE 到 NRT 的機票）。